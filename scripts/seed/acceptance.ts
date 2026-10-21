import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'

import type { ToolingConfig } from '../db/config'
import { connect, ToolingError, withDatabaseName } from '../db/database'
import { runMigrations } from '../db/migrate'

import { runSeed } from './seed'
import { runWipe } from './wipe'

const fixtureDirectory = join(import.meta.dirname, 'fixtures', 'poc-seed')
const seededTables = [
  'medicine',
  'medicine_alternative',
  'mdrp_ceiling',
  'pharmacy',
  'price_record',
] as const

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ToolingError('ACCEPTANCE_FAILED', message)
  }
}

function scratchDatabaseName(): string {
  return `pharmassist_tooling_${String(Date.now())}_${String(Math.floor(Math.random() * 1_000_000))}`
}

async function createScratchDatabase(
  baseUrl: string,
): Promise<{ name: string; url: string }> {
  const name = scratchDatabaseName()
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new ToolingError('ACCEPTANCE_FAILED', 'Unsafe scratch database name')
  }
  const admin = new Client({
    connectionString: withDatabaseName(baseUrl, 'postgres'),
  })
  await admin.connect()
  try {
    await admin.query(`create database ${name}`)
  } finally {
    await admin.end()
  }
  return { name, url: withDatabaseName(baseUrl, name) }
}

async function dropScratchDatabase(
  baseUrl: string,
  name: string,
): Promise<void> {
  const admin = new Client({
    connectionString: withDatabaseName(baseUrl, 'postgres'),
  })
  await admin.connect()
  try {
    await admin.query(`drop database if exists ${name} with (force)`)
  } finally {
    await admin.end()
  }
}

async function verifySchema(databaseUrl: string): Promise<void> {
  const client = await connect(databaseUrl)
  try {
    const tables = new Set(
      (
        await client.query<{ tablename: string }>(
          `select tablename from pg_tables where schemaname = 'public'`,
        )
      ).rows.map((row) => row.tablename),
    )
    for (const table of [
      ...seededTables,
      'seed_batch',
      'price_report',
      'app_event',
      'schema_migrations',
    ]) {
      assert(tables.has(table), `Missing table ${table}`)
    }

    const views = new Set(
      (
        await client.query<{ viewname: string }>(
          `select viewname from pg_views where schemaname = 'public'`,
        )
      ).rows.map((row) => row.viewname),
    )
    assert(
      views.has('price_record_with_mdrp'),
      'Missing view price_record_with_mdrp',
    )

    const enums = new Set(
      (
        await client.query<{ typname: string }>(
          `select typname from pg_type where typtype = 'e' and typnamespace = 'public'::regnamespace`,
        )
      ).rows.map((row) => row.typname),
    )
    for (const enumName of [
      'rx_otc',
      'pharmacy_type',
      'stock_status',
      'verification_status',
      'mdrp_basis',
      'report_reason',
      'report_status',
    ]) {
      assert(enums.has(enumName), `Missing enum ${enumName}`)
    }

    const indexes = new Set(
      (
        await client.query<{ indexname: string }>(
          `select indexname from pg_indexes where schemaname = 'public'`,
        )
      ).rows.map((row) => row.indexname),
    )
    for (const indexName of [
      'seed_batch_one_poc',
      'medicine_search_trgm_idx',
      'medicine_brand_trgm_idx',
      'medicine_generic_trgm_idx',
      'medicine_active_idx',
      'medicine_alternative_medicine_idx',
      'mdrp_ceiling_match_idx',
      'pharmacy_type_idx',
      'price_record_pharmacy_idx',
      'price_record_medicine_idx',
      'price_record_verified_idx',
      'price_record_mdrp_idx',
      'price_report_result_key_idx',
      'price_report_status_idx',
      'app_event_name_occurred_idx',
      'app_event_session_occurred_idx',
    ]) {
      assert(indexes.has(indexName), `Missing index ${indexName}`)
    }

    const triggers = new Set(
      (
        await client.query<{ tgname: string }>(
          `select tgname from pg_trigger where not tgisinternal`,
        )
      ).rows.map((row) => row.tgname),
    )
    for (const triggerName of [
      'medicine_set_updated_at',
      'medicine_alternative_set_updated_at',
      'pharmacy_set_updated_at',
      'price_record_set_updated_at',
      'price_report_set_updated_at',
    ]) {
      assert(triggers.has(triggerName), `Missing trigger ${triggerName}`)
    }
  } finally {
    await client.end()
  }
}

async function seedCounts(
  databaseUrl: string,
): Promise<Record<string, number>> {
  const client = await connect(databaseUrl)
  try {
    const counts: Record<string, number> = {}
    for (const table of seededTables) {
      const result = await client.query<{ count: number }>(
        `select count(*)::int as count from ${table} where seed_batch_id = 'poc-seed'`,
      )
      counts[table] = result.rows[0]?.count ?? 0
    }
    return counts
  } finally {
    await client.end()
  }
}

async function insertSyntheticNonSeedRows(databaseUrl: string): Promise<void> {
  const client = await connect(databaseUrl)
  try {
    await client.query(
      `insert into pharmacy (id, name, type, address, latitude, longitude, data_source)
       values ('pilot-test-pharmacy', 'Pilot Test Pharmacy', 'independent',
               'Test-only address', 13.62, 123.19, 'acceptance-test')`,
    )
    await client.query(
      `insert into price_report (
         result_key, pharmacy_id, pharmacy_name_snapshot, medicine_ids, medicine_labels, reason
       ) values (
         'mercury-naga-penafrancia|POC-001', 'mercury-naga-penafrancia',
         'Mercury Drug – Naga City Peñafrancia', array['POC-001'], array['Norvasc'], 'wrong_price'
       )`,
    )
    await client.query(
      `insert into app_event (name, session_id, app_env)
       values ('app_open', gen_random_uuid(), 'test')`,
    )
  } finally {
    await client.end()
  }
}

async function insertBlockingPrice(databaseUrl: string): Promise<void> {
  const client = await connect(databaseUrl)
  try {
    await client.query(
      `insert into price_record (
         medicine_id, pharmacy_id, shelf_price_php, pack_size, pack_quantity, pack_unit,
         stock_status, verified_at, verified_by, source
       ) values (
         'POC-001', 'pilot-test-pharmacy', 1.00, 'Box of 1 tablet', 1, 'tablet',
         'in_stock', now(), 'pilot', 'acceptance-test'
       )`,
    )
  } finally {
    await client.end()
  }
}

async function deleteBlockingPrice(databaseUrl: string): Promise<void> {
  const client = await connect(databaseUrl)
  try {
    await client.query(
      `delete from price_record where medicine_id = 'POC-001' and pharmacy_id = 'pilot-test-pharmacy'`,
    )
  } finally {
    await client.end()
  }
}

async function verifySurvivors(databaseUrl: string): Promise<void> {
  const client = await connect(databaseUrl)
  try {
    const pharmacy = await client.query<{ count: number }>(
      `select count(*)::int as count from pharmacy where id = 'pilot-test-pharmacy'`,
    )
    assert(
      (pharmacy.rows[0]?.count ?? 0) === 1,
      'The non-seed pharmacy did not survive the wipe',
    )
    const report = await client.query<{ count: number }>(
      `select count(*)::int as count from price_report`,
    )
    assert(
      (report.rows[0]?.count ?? 0) === 1,
      'The report did not survive the wipe',
    )
    const event = await client.query<{ count: number }>(
      `select count(*)::int as count from app_event`,
    )
    assert(
      (event.rows[0]?.count ?? 0) === 1,
      'The anonymous event did not survive the wipe',
    )
  } finally {
    await client.end()
  }
}

async function verifyMdrp(databaseUrl: string): Promise<void> {
  const client = await connect(databaseUrl)
  try {
    const rows = await client.query<{
      medicine_id: string
      pharmacy_id: string
      mdrp_entry_id: string | null
      above_mdrp_flag: boolean | null
      mdrp_observed_price_php: string | null
    }>(
      `select medicine_id, pharmacy_id, mdrp_entry_id, above_mdrp_flag,
              mdrp_observed_price_php
         from price_record_with_mdrp
        where seed_batch_id = 'poc-seed'`,
    )
    const janumet = rows.rows.find(
      (row) =>
        row.medicine_id === 'POC-016' &&
        row.pharmacy_id === 'mercury-naga-penafrancia',
    )
    assert(
      janumet?.mdrp_entry_id === 'EO104-044',
      'POC-016 must carry EO104-044',
    )
    assert(
      janumet.above_mdrp_flag === true,
      'POC-016 must be above the MDRP ceiling',
    )
    assert(
      Number(janumet.mdrp_observed_price_php) === 35,
      'POC-016 observed unit price must be 35.00',
    )
    const component = rows.rows.find((row) => row.medicine_id === 'POC-015')
    assert(
      component?.mdrp_entry_id === null,
      'A combination ceiling must not attach to its metformin component',
    )
  } finally {
    await client.end()
  }
}

async function expectToolingError(
  work: () => Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await work()
  } catch (error) {
    if (error instanceof ToolingError && error.code === code) {
      return
    }
    throw error
  }
  throw new ToolingError(
    'ACCEPTANCE_FAILED',
    `Expected ${code}, but the command succeeded`,
  )
}

async function expectErrorMessage(
  work: () => Promise<unknown>,
  fragment: string,
): Promise<void> {
  try {
    await work()
  } catch (error) {
    if (error instanceof Error && error.message.includes(fragment)) {
      return
    }
    throw error
  }
  throw new ToolingError(
    'ACCEPTANCE_FAILED',
    `Expected an error containing "${fragment}"`,
  )
}

/** Exercise every acceptance condition in data-contract section 10.1. */
export async function runAcceptance(baseDatabaseUrl: string): Promise<void> {
  const scratch = await createScratchDatabase(baseDatabaseUrl)
  const config: ToolingConfig = {
    databaseUrl: scratch.url,
    appEnv: 'test',
    allowPocSeed: false,
    allowPocWipe: false,
  }

  try {
    const firstMigration = await runMigrations({ databaseUrl: scratch.url })
    assert(
      firstMigration.applied.length === 1,
      'The clean database should apply one migration',
    )
    const secondMigration = await runMigrations({ databaseUrl: scratch.url })
    assert(
      secondMigration.applied.length === 0,
      'Migrations must be idempotent',
    )
    await verifySchema(scratch.url)

    await expectErrorMessage(
      () =>
        runSeed({
          config: { ...config, appEnv: 'pilot' },
          fixtureDirectory,
        }),
      'Refusing to seed POC data',
    )
    await expectErrorMessage(
      () => runWipe({ config: { ...config, appEnv: 'pilot' } }),
      'Refusing to wipe POC data',
    )

    const firstSeed = await runSeed({ config, fixtureDirectory })
    const countsAfterFirst = await seedCounts(scratch.url)
    const secondSeed = await runSeed({ config, fixtureDirectory })
    const countsAfterSecond = await seedCounts(scratch.url)

    assert(
      firstSeed.sourceManifestSha256 === secondSeed.sourceManifestSha256,
      'The manifest hash must be stable',
    )
    assert(
      JSON.stringify(countsAfterFirst) === JSON.stringify(countsAfterSecond),
      'Seeding twice must not create duplicates',
    )
    for (const [table, expected] of Object.entries(secondSeed.counts)) {
      assert(
        countsAfterSecond[table] === expected,
        `Unexpected row count in ${table}`,
      )
    }
    await verifyMdrp(scratch.url)

    await insertSyntheticNonSeedRows(scratch.url)
    await insertBlockingPrice(scratch.url)

    await expectToolingError(() => runWipe({ config }), 'WIPE_BLOCKED')
    const countsAfterBlockedWipe = await seedCounts(scratch.url)
    assert(
      JSON.stringify(countsAfterFirst) ===
        JSON.stringify(countsAfterBlockedWipe),
      'A blocked wipe must not delete seeded rows',
    )

    await deleteBlockingPrice(scratch.url)
    const wipe = await runWipe({ config })
    assert(wipe.wiped, 'The wipe should report that it removed the POC batch')
    assert(wipe.preserved.price_report === 1, 'The wipe must preserve reports')
    assert(
      wipe.preserved.app_event === 1,
      'The wipe must preserve anonymous events',
    )
    assert(
      wipe.preserved.non_seed_rows.pharmacy === 1,
      'The wipe must preserve the non-seed pharmacy',
    )
    for (const table of seededTables) {
      const count = (await seedCounts(scratch.url))[table]
      assert(count === 0, `${table} still has seeded rows after the wipe`)
    }
    await verifySurvivors(scratch.url)

    const emptyWipe = await runWipe({ config })
    assert(!emptyWipe.wiped, 'A wipe on an empty database should be a no-op')

    const client = await connect(scratch.url)
    try {
      await client.query(
        `insert into pharmacy (id, name, type, address, latitude, longitude, data_source)
         values ('mercury-naga-penafrancia', 'Non-seed Mercury row', 'chain',
                 'Test-only address', 13.62, 123.19, 'acceptance-test')`,
      )
    } finally {
      await client.end()
    }
    await expectToolingError(
      () => runSeed({ config, fixtureDirectory }),
      'SEED_CONFLICT',
    )

    const conflictClient = await connect(scratch.url)
    try {
      const row = await conflictClient.query<{ seed_batch_id: string | null }>(
        `select seed_batch_id from pharmacy where id = 'mercury-naga-penafrancia'`,
      )
      assert(
        row.rows[0]?.seed_batch_id === null,
        'A failed seed must not tag a non-seed row',
      )
      await conflictClient.query(
        `delete from pharmacy where id = 'mercury-naga-penafrancia'`,
      )
    } finally {
      await conflictClient.end()
    }

    const reseed = await runSeed({ config, fixtureDirectory })
    assert(
      reseed.counts.medicine === 50,
      'Reseeding after a wipe should restore the full fixture',
    )
    await runWipe({ config })
    const finalCounts = await seedCounts(scratch.url)
    for (const table of seededTables) {
      assert(
        finalCounts[table] === 0,
        `${table} still has seeded rows after the final wipe`,
      )
    }

    console.log(
      'Acceptance passed: migrations, idempotent seed, guarded wipe, survivors.',
    )
  } finally {
    await dropScratchDatabase(baseDatabaseUrl, scratch.name)
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
    const databaseUrl = process.env.DATABASE_URL
    if (databaseUrl === undefined || databaseUrl === '') {
      throw new ToolingError('INVALID_CONFIG', 'DATABASE_URL is required')
    }
    await runAcceptance(databaseUrl)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
