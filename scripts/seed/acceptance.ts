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
  'price_observation',
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
      views.has('price_observation_with_mdrp'),
      'Missing view price_observation_with_mdrp',
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
      'base_unit',
      'sale_form',
      'sale_state',
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
      'price_observation_pharmacy_idx',
      'price_observation_medicine_idx',
      'price_observation_verified_idx',
      'price_observation_state_idx',
      'price_observation_mdrp_idx',
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
      'price_observation_set_updated_at',
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
         'Mercury Drug - Naga City Penafrancia', array['POC-001'], array['Norvasc'], 'wrong_price'
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
      `insert into price_observation (
         medicine_id, pharmacy_id, sale_form, sale_state, form_label, shelf_price_php,
         pack_quantity, pack_unit, stock_status, verified_at, verified_by, source
       ) values (
         'POC-001', 'pilot-test-pharmacy', 'pack', 'available', 'Box of 1 tablet', 1.00,
         1, 'tablet', 'in_stock', now(), 'pilot', 'acceptance-test'
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
      `delete from price_observation where medicine_id = 'POC-001' and pharmacy_id = 'pilot-test-pharmacy'`,
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
      sale_form: string
      mdrp_entry_id: string | null
      mdrp_rate_basis: string | null
      above_mdrp_flag: boolean | null
      mdrp_observed_rate_php: string | null
    }>(
      `select medicine_id, pharmacy_id, sale_form, mdrp_entry_id,
              mdrp_rate_basis, above_mdrp_flag, mdrp_observed_rate_php
         from price_observation_with_mdrp
        where seed_batch_id = 'poc-seed'
          and medicine_id = 'POC-016'
          and pharmacy_id = 'mercury-naga-penafrancia'`,
    )
    const expected = new Map([
      ['pack', { basis: 'box_rate', rate: 35 }],
      ['strip', { basis: 'strip_rate', rate: 36 }],
      ['loose', { basis: 'loose_price', rate: 38 }],
    ])
    for (const row of rows.rows) {
      const form = expected.get(row.sale_form)
      assert(form !== undefined, `Unexpected POC-016 form ${row.sale_form}`)
      assert(
        row.mdrp_entry_id === 'EO104-044',
        'POC-016 must carry EO104-044 on every form',
      )
      assert(
        row.above_mdrp_flag === true,
        'POC-016 must be above the MDRP ceiling',
      )
      assert(
        row.mdrp_rate_basis === form.basis,
        `POC-016 ${row.sale_form} must use ${form.basis}`,
      )
      assert(
        Number(row.mdrp_observed_rate_php) === form.rate,
        `POC-016 ${row.sale_form} observed rate must be ${String(form.rate)}`,
      )
    }
    assert(rows.rows.length === 3, 'POC-016 must expose all three forms')

    const component = await client.query<{ count: number }>(
      `select count(*)::int as count
         from price_observation
        where seed_batch_id = 'poc-seed'
          and medicine_id = 'POC-015'
          and mdrp_entry_id is not null`,
    )
    assert(
      (component.rows[0]?.count ?? 0) === 0,
      'A combination ceiling must not attach to its metformin component',
    )
  } finally {
    await client.end()
  }
}

async function verifyVatNormalization(databaseUrl: string): Promise<void> {
  const client = await connect(databaseUrl)
  try {
    await client.query(
      `insert into medicine (
         id, category, brand_name, generic_name, strength, dosage_form, base_unit,
         manufacturer, rx_otc, fda_registration_no, active, vat_exempt, data_source
       ) values (
         'FIX-VAT-001', 'Fixture', 'Fixture Brand', 'Fixturemolecule', '500 mg',
         'Tablet', 'tablet', 'Fixture Labs', 'Rx', 'DR-FIXTURE-001', true, false,
         'acceptance-test'
       )`,
    )
    await client.query(
      `insert into mdrp_ceiling (
         id, order_id, order_signed, annex_row, category, molecule, molecules,
         strength, dosage_form, pack_size, strength_and_form_raw, mwp_php,
         mrp_php, price_basis, price_unit, vat_exclusive_mrp,
         voluntary_price_reduction, source_url, source_pdf_page, checked_at,
         notes
       ) values (
         'FIX-VAT-900', 'Fixture order', '2026-10-22', 900, 'Fixture',
         'Fixturemolecule', array['Fixturemolecule'], '500 mg', 'Tablet', null,
         null, null, 10.00, 'per_unit', 'tablet', true, false,
         'https://example.test', null, '2026-10-22', 'Acceptance fixture'
       )`,
    )
    await client.query(
      `insert into price_observation (
         medicine_id, pharmacy_id, sale_form, sale_state, form_label,
         shelf_price_php, pack_quantity, pack_unit, stock_status, verified_at,
         verified_by, source, mdrp_entry_id
       ) values
         ('FIX-VAT-001', 'mercury-naga-penafrancia', 'pack', 'available',
          'Box of 10 tablets', 120.00, 10, 'tablet', 'in_stock', now(),
          'acceptance-test', 'acceptance-test', 'FIX-VAT-900'),
         ('FIX-VAT-001', 'mercury-naga-penafrancia', 'loose', 'available',
          'Loose tablet', 11.00, 1, 'tablet', 'in_stock', now(),
          'acceptance-test', 'acceptance-test', 'FIX-VAT-900')`,
    )

    async function readComparison(): Promise<{
      effective: number
      vatExempt: boolean | null
      packAbove: boolean | null
      looseAbove: boolean | null
    }> {
      const result = await client.query<{
        sale_form: string
        mdrp_vat_exempt: boolean | null
        mdrp_effective_ceiling_php: string | null
        above_mdrp_flag: boolean | null
      }>(
        `select sale_form, mdrp_vat_exempt, mdrp_effective_ceiling_php,
                above_mdrp_flag
           from price_observation_with_mdrp
          where medicine_id = 'FIX-VAT-001'`,
      )
      const pack = result.rows.find((row) => row.sale_form === 'pack')
      const loose = result.rows.find((row) => row.sale_form === 'loose')
      assert(pack !== undefined && loose !== undefined, 'Missing fixture forms')
      return {
        effective: Number(pack.mdrp_effective_ceiling_php),
        vatExempt: pack.mdrp_vat_exempt,
        packAbove: pack.above_mdrp_flag,
        looseAbove: loose.above_mdrp_flag,
      }
    }

    const vatable = await readComparison()
    assert(
      vatable.effective === 11.2,
      'A VATable product must gross up 10.00 to 11.20',
    )
    assert(vatable.vatExempt === false, 'The fixture must be VATable')
    assert(
      vatable.packAbove === true,
      '120.00/10 must be above the 11.20 ceiling',
    )
    assert(
      vatable.looseAbove === false,
      '11.00 must be at or below the 11.20 ceiling',
    )

    await client.query(
      `update medicine set vat_exempt = true where id = 'FIX-VAT-001'`,
    )
    const exempt = await readComparison()
    assert(
      exempt.effective === 10,
      'A VAT-exempt product must use 10.00 directly',
    )
    assert(exempt.looseAbove === true, '11.00 must be above the 10.00 ceiling')

    await client.query(
      `update medicine set vat_exempt = null where id = 'FIX-VAT-001'`,
    )
    const unknown = await readComparison()
    assert(
      unknown.effective === 10,
      'An unknown VAT status must use the published ceiling',
    )
    assert(
      unknown.vatExempt === null,
      'An unknown VAT status must be exposed as null',
    )
    assert(unknown.looseAbove === true, '11.00 must be above the 10.00 ceiling')
  } finally {
    await client.query(
      `delete from price_observation where medicine_id = 'FIX-VAT-001'`,
    )
    await client.query(`delete from medicine where id = 'FIX-VAT-001'`)
    await client.query(`delete from mdrp_ceiling where id = 'FIX-VAT-900'`)
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
      firstMigration.applied.length === 3,
      'The clean database should apply three migrations',
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
    await verifyVatNormalization(scratch.url)

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
      reseed.counts.medicine === 50 && reseed.counts.price_observation === 1500,
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
