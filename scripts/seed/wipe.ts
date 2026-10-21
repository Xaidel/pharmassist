import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import type { Client } from 'pg'

import { assertWipeAllowed, readConfig, type ToolingConfig } from '../db/config'
import { connect, inTransaction, ToolingError } from '../db/database'

import { POC_SEED_BATCH_ID } from './seed'

export type WipeOptions = {
  config: ToolingConfig
}

export type WipeReport = {
  batchId: string
  wiped: boolean
  deleted: Record<string, number>
  preserved: {
    price_report: number
    app_event: number
    non_seed_rows: Record<string, number>
  }
}

type CountRow = { count: number }
type DependencyRow = { dependency: string; dependent_key: string }

const seededTables = [
  'price_observation',
  'medicine_alternative',
  'medicine',
  'pharmacy',
  'mdrp_ceiling',
] as const

async function countRows(
  client: Client,
  sql: string,
  values: readonly unknown[] = [],
): Promise<number> {
  const result = await client.query<CountRow>(sql, [...values])
  return result.rows[0]?.count ?? 0
}

async function snapshotNonSeed(
  client: Client,
): Promise<WipeReport['preserved']> {
  const nonSeedRows: Record<string, number> = {}
  for (const table of seededTables) {
    nonSeedRows[table] = await countRows(
      client,
      `select count(*)::int as count from ${table} where seed_batch_id is distinct from $1`,
      [POC_SEED_BATCH_ID],
    )
  }

  return {
    price_report: await countRows(
      client,
      'select count(*)::int as count from price_report',
    ),
    app_event: await countRows(
      client,
      'select count(*)::int as count from app_event',
    ),
    non_seed_rows: nonSeedRows,
  }
}

async function findNonSeedDependencies(
  client: Client,
): Promise<DependencyRow[]> {
  const result = await client.query<DependencyRow>(
    `select 'price_observation -> seeded medicine' as dependency,
            pr.medicine_id || '/' || pr.pharmacy_id as dependent_key
       from price_observation pr
       join medicine m on m.id = pr.medicine_id
      where pr.seed_batch_id is distinct from $1 and m.seed_batch_id = $1
     union all
     select 'price_observation -> seeded pharmacy' as dependency,
            pr.medicine_id || '/' || pr.pharmacy_id as dependent_key
       from price_observation pr
       join pharmacy p on p.id = pr.pharmacy_id
      where pr.seed_batch_id is distinct from $1 and p.seed_batch_id = $1
     union all
     select 'price_observation -> seeded mdrp_ceiling' as dependency,
            pr.medicine_id || '/' || pr.pharmacy_id as dependent_key
       from price_observation pr
       join mdrp_ceiling mc on mc.id = pr.mdrp_entry_id
      where pr.seed_batch_id is distinct from $1 and mc.seed_batch_id = $1
     union all
     select 'medicine_alternative -> seeded medicine' as dependency,
            a.id as dependent_key
       from medicine_alternative a
       join medicine m on m.id = a.medicine_id
      where a.seed_batch_id is distinct from $1 and m.seed_batch_id = $1`,
    [POC_SEED_BATCH_ID],
  )
  return result.rows
}

async function deleteSeededRows(
  client: Client,
): Promise<Record<string, number>> {
  const deleted: Record<string, number> = {}

  deleted.price_observation =
    (
      await client.query(
        'delete from price_observation where seed_batch_id = $1',
        [POC_SEED_BATCH_ID],
      )
    ).rowCount ?? 0
  deleted.medicine_alternative =
    (
      await client.query(
        'delete from medicine_alternative where seed_batch_id = $1',
        [POC_SEED_BATCH_ID],
      )
    ).rowCount ?? 0
  deleted.medicine =
    (
      await client.query('delete from medicine where seed_batch_id = $1', [
        POC_SEED_BATCH_ID,
      ])
    ).rowCount ?? 0
  deleted.pharmacy =
    (
      await client.query('delete from pharmacy where seed_batch_id = $1', [
        POC_SEED_BATCH_ID,
      ])
    ).rowCount ?? 0
  deleted.mdrp_ceiling =
    (
      await client.query('delete from mdrp_ceiling where seed_batch_id = $1', [
        POC_SEED_BATCH_ID,
      ])
    ).rowCount ?? 0
  deleted.seed_batch =
    (
      await client.query(
        `delete from seed_batch where id = $1 and kind = 'poc-seed'`,
        [POC_SEED_BATCH_ID],
      )
    ).rowCount ?? 0

  return deleted
}

async function verifyWipe(
  client: Client,
  before: WipeReport['preserved'],
): Promise<void> {
  for (const table of seededTables) {
    const remaining = await countRows(
      client,
      `select count(*)::int as count from ${table} where seed_batch_id = $1`,
      [POC_SEED_BATCH_ID],
    )
    if (remaining !== 0) {
      throw new ToolingError(
        'WIPE_VALIDATION',
        `${String(remaining)} seeded rows remain in ${table}`,
      )
    }
  }

  const batchCount = await countRows(
    client,
    `select count(*)::int as count from seed_batch where id = $1`,
    [POC_SEED_BATCH_ID],
  )
  if (batchCount !== 0) {
    throw new ToolingError(
      'WIPE_VALIDATION',
      'The POC seed batch row remains after the wipe',
    )
  }

  const after = await snapshotNonSeed(client)
  if (after.price_report !== before.price_report) {
    throw new ToolingError(
      'WIPE_VALIDATION',
      'The wipe changed price_report row counts',
    )
  }
  if (after.app_event !== before.app_event) {
    throw new ToolingError(
      'WIPE_VALIDATION',
      'The wipe changed app_event row counts',
    )
  }
  for (const table of seededTables) {
    if (after.non_seed_rows[table] !== before.non_seed_rows[table]) {
      throw new ToolingError(
        'WIPE_VALIDATION',
        `The wipe changed non-seed rows in ${table}`,
      )
    }
  }
}

/** Remove exactly the `poc-seed` rows, refusing when a non-seed row depends on them. */
export async function runWipe(options: WipeOptions): Promise<WipeReport> {
  assertWipeAllowed(options.config)
  const client = await connect(options.config.databaseUrl)
  try {
    return await inTransaction(client, async () => {
      const batchCount = await countRows(
        client,
        `select count(*)::int as count from seed_batch where kind = 'poc-seed'`,
      )
      if (batchCount > 1) {
        throw new ToolingError(
          'WIPE_BLOCKED',
          `Expected at most one POC seed batch, found ${String(batchCount)}`,
        )
      }

      if (batchCount === 0) {
        return {
          batchId: POC_SEED_BATCH_ID,
          wiped: false,
          deleted: {},
          preserved: await snapshotNonSeed(client),
        }
      }

      const dependencies = await findNonSeedDependencies(client)
      if (dependencies.length > 0) {
        throw new ToolingError(
          'WIPE_BLOCKED',
          `Refusing to wipe: non-seed rows depend on seeded data. ${dependencies
            .map((row) => `${row.dependency} (${row.dependent_key})`)
            .join('; ')}`,
        )
      }

      const preserved = await snapshotNonSeed(client)
      const deleted = await deleteSeededRows(client)
      await verifyWipe(client, preserved)

      return {
        batchId: POC_SEED_BATCH_ID,
        wiped: true,
        deleted,
        preserved,
      }
    })
  } finally {
    await client.end()
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1]
  return (
    entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url)
  )
}

if (isMainModule()) {
  try {
    const report = await runWipe({ config: readConfig() })
    if (!report.wiped) {
      console.log('No poc-seed batch found; nothing to wipe.')
    } else {
      console.log(
        `Wiped ${report.batchId}: ${Object.entries(report.deleted)
          .map(([table, count]) => `${table}=${String(count)}`)
          .join(', ')}.`,
      )
      console.log(
        `Preserved price_report=${String(report.preserved.price_report)}, app_event=${String(report.preserved.app_event)}.`,
      )
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
