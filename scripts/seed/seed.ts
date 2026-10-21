import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'

import type { Client } from 'pg'

import { assertSeedAllowed, readConfig, type ToolingConfig } from '../db/config'
import { connect, inTransaction, ToolingError } from '../db/database'

import { assertDemoCases } from './demo-cases'
import { loadFixture, type SeedBundle } from './fixture'
import { expectedMdrpAttachments } from './mdrp-match'

export const POC_SEED_BATCH_ID = 'poc-seed'

export type SeedOptions = {
  config: ToolingConfig
  fixtureDirectory?: string
  bundle?: SeedBundle
}

export type SeedReport = {
  batchId: string
  sourceManifestSha256: string
  counts: Record<string, number>
}

type CountRow = { count: number }
type PriceOwnershipRow = { medicine_id: string; pharmacy_id: string }
type PriceMdrpRow = {
  medicine_id: string
  pharmacy_id: string
  mdrp_entry_id: string | null
}

type ProtectedTable =
  | 'medicine'
  | 'medicine_alternative'
  | 'mdrp_ceiling'
  | 'pharmacy'
  | 'price_record'

async function countRows(
  client: Client,
  sql: string,
  values: readonly unknown[] = [],
): Promise<number> {
  const result = await client.query<CountRow>(sql, [...values])
  return result.rows[0]?.count ?? 0
}

async function assertNoForeignOwnership(
  client: Client,
  table: ProtectedTable,
  ids: readonly string[],
  batchId: string,
): Promise<void> {
  if (ids.length === 0) {
    return
  }
  const result = await client.query<{ id: string }>(
    `select id from ${table} where id = any($1::text[]) and seed_batch_id is distinct from $2`,
    [ids, batchId],
  )
  if (result.rowCount !== 0) {
    throw new ToolingError(
      'SEED_CONFLICT',
      `Refusing to overwrite non-seed rows in ${table}: ${result.rows.map((row) => row.id).join(', ')}`,
    )
  }
}

async function assertPriceOwnership(
  client: Client,
  prices: readonly { medicine_id: string; pharmacy_id: string }[],
  batchId: string,
): Promise<void> {
  if (prices.length === 0) {
    return
  }
  const result = await client.query<PriceOwnershipRow>(
    `select pr.medicine_id, pr.pharmacy_id
       from price_record pr
       join unnest($1::text[], $2::text[]) as key(medicine_id, pharmacy_id)
         on key.medicine_id = pr.medicine_id and key.pharmacy_id = pr.pharmacy_id
      where pr.seed_batch_id is distinct from $3`,
    [
      prices.map((price) => price.medicine_id),
      prices.map((price) => price.pharmacy_id),
      batchId,
    ],
  )
  if (result.rowCount !== 0) {
    throw new ToolingError(
      'SEED_CONFLICT',
      `Refusing to overwrite non-seed price records: ${result.rows
        .map((row) => `${row.medicine_id}/${row.pharmacy_id}`)
        .join(', ')}`,
    )
  }
}

async function upsertSeedBatch(
  client: Client,
  config: ToolingConfig,
  bundle: SeedBundle,
): Promise<void> {
  const existingKind = await client.query<{ kind: string }>(
    'select kind from seed_batch where id = $1',
    [POC_SEED_BATCH_ID],
  )
  const kind = existingKind.rows[0]?.kind
  if (kind !== undefined && kind !== 'poc-seed') {
    throw new ToolingError(
      'SEED_CONFLICT',
      `seed_batch ${POC_SEED_BATCH_ID} already exists with kind ${kind}`,
    )
  }

  const otherPocBatch = await client.query<{ id: string }>(
    `select id from seed_batch where kind = 'poc-seed' and id <> $1`,
    [POC_SEED_BATCH_ID],
  )
  if (otherPocBatch.rowCount !== 0) {
    throw new ToolingError(
      'SEED_CONFLICT',
      `Another POC seed batch already exists: ${otherPocBatch.rows.map((row) => row.id).join(', ')}`,
    )
  }

  await client.query(
    `insert into seed_batch (id, kind, app_env, source_manifest_sha256, notes, applied_at)
     values ($1, 'poc-seed', $2, $3, $4, now())
     on conflict (id) do update set
       kind = excluded.kind,
       app_env = excluded.app_env,
       source_manifest_sha256 = excluded.source_manifest_sha256,
       notes = excluded.notes,
       applied_at = excluded.applied_at`,
    [
      POC_SEED_BATCH_ID,
      config.appEnv,
      bundle.sourceManifestSha256,
      `Seed fixture ${bundle.manifest.batch_id}`,
    ],
  )
}

async function upsertMedicines(
  client: Client,
  bundle: SeedBundle,
): Promise<void> {
  await assertNoForeignOwnership(
    client,
    'medicine',
    bundle.medicines.map((row) => row.id),
    POC_SEED_BATCH_ID,
  )

  for (const row of bundle.medicines) {
    await client.query(
      `insert into medicine (
         id, category, brand_name, generic_name, strength, dosage_form, pack_size, manufacturer,
         rx_otc, fda_registration_no, fda_registration_expiry, pnf_listed, pnf_entry, pnf_page,
         konsulta_listed, konsulta_entry, konsulta_as_of, generic_group_id, active, data_source,
         seed_batch_id
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
         $19, $20, $21
       )
       on conflict (id) do update set
         category = excluded.category,
         brand_name = excluded.brand_name,
         generic_name = excluded.generic_name,
         strength = excluded.strength,
         dosage_form = excluded.dosage_form,
         pack_size = excluded.pack_size,
         manufacturer = excluded.manufacturer,
         rx_otc = excluded.rx_otc,
         fda_registration_no = excluded.fda_registration_no,
         fda_registration_expiry = excluded.fda_registration_expiry,
         pnf_listed = excluded.pnf_listed,
         pnf_entry = excluded.pnf_entry,
         pnf_page = excluded.pnf_page,
         konsulta_listed = excluded.konsulta_listed,
         konsulta_entry = excluded.konsulta_entry,
         konsulta_as_of = excluded.konsulta_as_of,
         generic_group_id = excluded.generic_group_id,
         active = excluded.active,
         data_source = excluded.data_source,
         seed_batch_id = excluded.seed_batch_id`,
      [
        row.id,
        row.category,
        row.brand_name,
        row.generic_name,
        row.strength,
        row.dosage_form,
        row.pack_size,
        row.manufacturer,
        row.rx_otc,
        row.fda_registration_no,
        row.fda_registration_expiry,
        row.pnf_listed,
        row.pnf_entry,
        row.pnf_page,
        row.konsulta_listed,
        row.konsulta_entry,
        row.konsulta_as_of,
        row.generic_group_id,
        row.active,
        row.data_source,
        POC_SEED_BATCH_ID,
      ],
    )
  }
}

async function upsertPharmacies(
  client: Client,
  bundle: SeedBundle,
): Promise<void> {
  await assertNoForeignOwnership(
    client,
    'pharmacy',
    bundle.pharmacies.map((row) => row.id),
    POC_SEED_BATCH_ID,
  )

  for (const row of bundle.pharmacies) {
    await client.query(
      `insert into pharmacy (
         id, name, brand, type, address, barangay, latitude, longitude, phone, hours_text,
         open_24h, opening_hours, verification_status, data_source, source_url,
         coordinate_confidence, notes, seed_batch_id
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
       )
       on conflict (id) do update set
         name = excluded.name,
         brand = excluded.brand,
         type = excluded.type,
         address = excluded.address,
         barangay = excluded.barangay,
         latitude = excluded.latitude,
         longitude = excluded.longitude,
         phone = excluded.phone,
         hours_text = excluded.hours_text,
         open_24h = excluded.open_24h,
         opening_hours = excluded.opening_hours,
         verification_status = excluded.verification_status,
         data_source = excluded.data_source,
         source_url = excluded.source_url,
         coordinate_confidence = excluded.coordinate_confidence,
         notes = excluded.notes,
         seed_batch_id = excluded.seed_batch_id`,
      [
        row.id,
        row.name,
        row.brand,
        row.type,
        row.address,
        row.barangay,
        row.latitude,
        row.longitude,
        row.phone,
        row.hours_text,
        row.open_24h,
        row.opening_hours,
        row.verification_status,
        row.data_source,
        row.source_url,
        row.coordinate_confidence,
        row.notes,
        POC_SEED_BATCH_ID,
      ],
    )
  }
}

async function upsertMdrpCeilings(
  client: Client,
  bundle: SeedBundle,
): Promise<void> {
  await assertNoForeignOwnership(
    client,
    'mdrp_ceiling',
    bundle.mdrpCeilings.map((row) => row.id),
    POC_SEED_BATCH_ID,
  )

  for (const row of bundle.mdrpCeilings) {
    await client.query(
      `insert into mdrp_ceiling (
         id, order_id, order_signed, annex_row, category, molecule, molecules, strength,
         dosage_form, pack_size, strength_and_form_raw, mwp_php, mrp_php, price_basis,
         price_unit, vat_exclusive_mrp, voluntary_price_reduction, source_url, source_pdf_page,
         checked_at, notes, seed_batch_id
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
         $19, $20, $21, $22
       )
       on conflict (id) do update set
         order_id = excluded.order_id,
         order_signed = excluded.order_signed,
         annex_row = excluded.annex_row,
         category = excluded.category,
         molecule = excluded.molecule,
         molecules = excluded.molecules,
         strength = excluded.strength,
         dosage_form = excluded.dosage_form,
         pack_size = excluded.pack_size,
         strength_and_form_raw = excluded.strength_and_form_raw,
         mwp_php = excluded.mwp_php,
         mrp_php = excluded.mrp_php,
         price_basis = excluded.price_basis,
         price_unit = excluded.price_unit,
         vat_exclusive_mrp = excluded.vat_exclusive_mrp,
         voluntary_price_reduction = excluded.voluntary_price_reduction,
         source_url = excluded.source_url,
         source_pdf_page = excluded.source_pdf_page,
         checked_at = excluded.checked_at,
         notes = excluded.notes,
         seed_batch_id = excluded.seed_batch_id`,
      [
        row.id,
        row.order_id,
        row.order_signed,
        row.annex_row,
        row.category,
        row.molecule,
        row.molecules,
        row.strength,
        row.dosage_form,
        row.pack_size,
        row.strength_and_form_raw,
        row.mwp_php,
        row.mrp_php,
        row.price_basis,
        row.price_unit,
        row.vat_exclusive_mrp,
        row.voluntary_price_reduction,
        row.source_url,
        row.source_pdf_page,
        row.checked_at,
        row.notes,
        POC_SEED_BATCH_ID,
      ],
    )
  }
}

async function upsertAlternatives(
  client: Client,
  bundle: SeedBundle,
): Promise<void> {
  await assertNoForeignOwnership(
    client,
    'medicine_alternative',
    bundle.alternatives.map((row) => row.id),
    POC_SEED_BATCH_ID,
  )

  for (const row of bundle.alternatives) {
    await client.query(
      `insert into medicine_alternative (
         id, medicine_id, brand_name, manufacturer, pack_size, rx_otc, fda_registration_no,
         registration_expiry, note, display_order, seed_batch_id
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
       )
       on conflict (id) do update set
         medicine_id = excluded.medicine_id,
         brand_name = excluded.brand_name,
         manufacturer = excluded.manufacturer,
         pack_size = excluded.pack_size,
         rx_otc = excluded.rx_otc,
         fda_registration_no = excluded.fda_registration_no,
         registration_expiry = excluded.registration_expiry,
         note = excluded.note,
         display_order = excluded.display_order,
         seed_batch_id = excluded.seed_batch_id`,
      [
        row.id,
        row.medicine_id,
        row.brand_name,
        row.manufacturer,
        row.pack_size,
        row.rx_otc,
        row.fda_registration_no,
        row.registration_expiry,
        row.note,
        row.display_order,
        POC_SEED_BATCH_ID,
      ],
    )
  }
}

async function upsertPrices(client: Client, bundle: SeedBundle): Promise<void> {
  await assertPriceOwnership(client, bundle.prices, POC_SEED_BATCH_ID)
  const attachments = expectedMdrpAttachments(
    bundle.medicines,
    bundle.mdrpCeilings,
  )

  for (const row of bundle.prices) {
    const mdrpEntryId = attachments.get(row.medicine_id) ?? null
    await client.query(
      `insert into price_record (
         medicine_id, pharmacy_id, shelf_price_php, pack_size, pack_quantity, pack_unit,
         stock_status, verified_at, verified_by, source, notes, mdrp_entry_id, seed_batch_id
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
       )
       on conflict (medicine_id, pharmacy_id) do update set
         shelf_price_php = excluded.shelf_price_php,
         pack_size = excluded.pack_size,
         pack_quantity = excluded.pack_quantity,
         pack_unit = excluded.pack_unit,
         stock_status = excluded.stock_status,
         verified_at = excluded.verified_at,
         verified_by = excluded.verified_by,
         source = excluded.source,
         notes = excluded.notes,
         mdrp_entry_id = excluded.mdrp_entry_id,
         seed_batch_id = excluded.seed_batch_id`,
      [
        row.medicine_id,
        row.pharmacy_id,
        row.shelf_price_php,
        row.pack_size,
        row.pack_quantity,
        row.pack_unit,
        row.stock_status,
        row.verified_at,
        row.verified_by,
        row.source,
        row.notes,
        mdrpEntryId,
        POC_SEED_BATCH_ID,
      ],
    )
  }
}

function attachmentKey(medicineId: string, entryId: string): string {
  return `${medicineId}=${entryId}`
}

function assertFixtureExpectations(bundle: SeedBundle): void {
  const inactive = bundle.medicines
    .filter((medicine) => !medicine.active)
    .map((medicine) => medicine.id)
    .sort()
  const declaredInactive = [
    ...bundle.manifest.expect.inactive_medicine_ids,
  ].sort()
  if (JSON.stringify(inactive) !== JSON.stringify(declaredInactive)) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `Inactive medicines ${inactive.join(', ') || '(none)'} do not match the manifest declaration ${declaredInactive.join(', ') || '(none)'}`,
    )
  }

  const ceilingIds = new Set(bundle.mdrpCeilings.map((ceiling) => ceiling.id))
  for (const entry of bundle.manifest.expect.mdrp_attachments) {
    if (!ceilingIds.has(entry.entry_id)) {
      throw new ToolingError(
        'SEED_VALIDATION',
        `Declared MDRP attachment ${entry.entry_id} is not in the fixture`,
      )
    }
  }

  const derivedAttachments = [
    ...expectedMdrpAttachments(bundle.medicines, bundle.mdrpCeilings),
  ]
    .flatMap(([medicineId, entryId]) =>
      entryId === null ? [] : [attachmentKey(medicineId, entryId)],
    )
    .sort()
  const declaredAttachments = bundle.manifest.expect.mdrp_attachments
    .map((entry) => attachmentKey(entry.medicine_id, entry.entry_id))
    .sort()
  if (
    JSON.stringify(derivedAttachments) !== JSON.stringify(declaredAttachments)
  ) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `Derived MDRP attachments ${derivedAttachments.join(', ') || '(none)'} do not match the manifest declaration ${declaredAttachments.join(', ') || '(none)'}`,
    )
  }
}

async function validateSeed(
  client: Client,
  bundle: SeedBundle,
): Promise<Record<string, number>> {
  const counts = {
    medicine: bundle.medicines.length,
    medicine_alternative: bundle.alternatives.length,
    pharmacy: bundle.pharmacies.length,
    mdrp_ceiling: bundle.mdrpCeilings.length,
    price_record: bundle.prices.length,
  }

  for (const [table, expected] of Object.entries(counts)) {
    const actual = await countRows(
      client,
      `select count(*)::int as count from ${table} where seed_batch_id = $1`,
      [POC_SEED_BATCH_ID],
    )
    if (actual !== expected) {
      throw new ToolingError(
        'SEED_VALIDATION',
        `${table}: expected ${String(expected)} seeded rows, found ${String(actual)}`,
      )
    }
    const manifestCount =
      bundle.manifest.expect.counts[table as keyof typeof counts]
    if (manifestCount !== expected) {
      throw new ToolingError(
        'SEED_VALIDATION',
        `${table}: fixture has ${String(expected)} rows but the manifest expects ${String(manifestCount)}`,
      )
    }
  }

  const foreignTagged = await countRows(
    client,
    `select count(*)::int as count from medicine
      where id = any($1::text[]) and seed_batch_id is distinct from $2`,
    [bundle.medicines.map((row) => row.id), POC_SEED_BATCH_ID],
  )
  if (foreignTagged !== 0) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `${String(foreignTagged)} medicine rows are not seed-tagged`,
    )
  }

  const badPrices = await countRows(
    client,
    `select count(*)::int as count
       from price_record pr
       join medicine m on m.id = pr.medicine_id
       join pharmacy p on p.id = pr.pharmacy_id
      where pr.seed_batch_id = $1
        and (m.seed_batch_id is distinct from $1 or not m.active or p.seed_batch_id is distinct from $1)`,
    [POC_SEED_BATCH_ID],
  )
  if (badPrices !== 0) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `${String(badPrices)} price rows reference an inactive medicine or a non-seed pharmacy`,
    )
  }

  const missingPackMetadata = await countRows(
    client,
    `select count(*)::int as count from price_record
      where seed_batch_id = $1 and (pack_quantity is null or pack_unit is null)`,
    [POC_SEED_BATCH_ID],
  )
  if (missingPackMetadata !== 0) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `${String(missingPackMetadata)} price rows are missing pack quantity/unit`,
    )
  }

  const badAlternatives = await countRows(
    client,
    `select count(*)::int as count
       from medicine_alternative a
       join medicine m on m.id = a.medicine_id
      where a.seed_batch_id = $1 and m.seed_batch_id is distinct from $1`,
    [POC_SEED_BATCH_ID],
  )
  if (badAlternatives !== 0) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `${String(badAlternatives)} alternative rows reference a non-seed medicine`,
    )
  }

  const inactiveRows = await client.query<{ id: string }>(
    `select id from medicine where seed_batch_id = $1 and active = false order by id`,
    [POC_SEED_BATCH_ID],
  )
  const databaseInactive = inactiveRows.rows.map((row) => row.id)
  const declaredInactive = [
    ...bundle.manifest.expect.inactive_medicine_ids,
  ].sort()
  if (JSON.stringify(databaseInactive) !== JSON.stringify(declaredInactive)) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `Inactive medicines ${databaseInactive.join(', ') || '(none)'} do not match the manifest declaration ${declaredInactive.join(', ') || '(none)'}`,
    )
  }

  const uncoveredMedicines = await countRows(
    client,
    `select count(*)::int as count
       from medicine m
      where m.seed_batch_id = $1
        and m.active
        and m.pack_size is not null
        and not exists (
          select 1 from price_record pr
           where pr.medicine_id = m.id and pr.seed_batch_id = $1
        )`,
    [POC_SEED_BATCH_ID],
  )
  if (uncoveredMedicines !== 0) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `${String(uncoveredMedicines)} active medicines with a known pack have no price record`,
    )
  }

  const attachments = expectedMdrpAttachments(
    bundle.medicines,
    bundle.mdrpCeilings,
  )
  const priceRows = await client.query<PriceMdrpRow>(
    `select medicine_id, pharmacy_id, mdrp_entry_id
       from price_record where seed_batch_id = $1`,
    [POC_SEED_BATCH_ID],
  )
  for (const price of priceRows.rows) {
    const expected = attachments.get(price.medicine_id) ?? null
    if (price.mdrp_entry_id !== expected) {
      throw new ToolingError(
        'SEED_VALIDATION',
        `Price ${price.medicine_id}/${price.pharmacy_id} has MDRP ${price.mdrp_entry_id ?? 'null'}, expected ${expected ?? 'null'}`,
      )
    }
  }

  const foreignMdrp = await countRows(
    client,
    `select count(*)::int as count from price_record pr
       join mdrp_ceiling mc on mc.id = pr.mdrp_entry_id
      where pr.seed_batch_id = $1 and mc.seed_batch_id is distinct from $1`,
    [POC_SEED_BATCH_ID],
  )
  if (foreignMdrp !== 0) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `${String(foreignMdrp)} price rows reference a non-seed MDRP ceiling`,
    )
  }

  const batchCount = await countRows(
    client,
    `select count(*)::int as count from seed_batch where id = $1 and kind = 'poc-seed'`,
    [POC_SEED_BATCH_ID],
  )
  if (batchCount !== 1) {
    throw new ToolingError(
      'SEED_VALIDATION',
      `expected one POC seed batch, found ${String(batchCount)}`,
    )
  }

  return counts
}

/** Load a fixture into Postgres in one transaction, validating before commit. */
export async function runSeed(options: SeedOptions): Promise<SeedReport> {
  assertSeedAllowed(options.config)
  const bundle =
    options.bundle ??
    (await loadFixture(
      options.fixtureDirectory ??
        join(import.meta.dirname, 'fixtures', 'poc-seed'),
    ))

  assertFixtureExpectations(bundle)

  const client = await connect(options.config.databaseUrl)
  try {
    const counts = await inTransaction(client, async () => {
      await upsertSeedBatch(client, options.config, bundle)
      await upsertMedicines(client, bundle)
      await upsertPharmacies(client, bundle)
      await upsertMdrpCeilings(client, bundle)
      await upsertAlternatives(client, bundle)
      await upsertPrices(client, bundle)
      const counts = await validateSeed(client, bundle)
      await assertDemoCases(client, POC_SEED_BATCH_ID)
      return counts
    })

    return {
      batchId: POC_SEED_BATCH_ID,
      sourceManifestSha256: bundle.sourceManifestSha256,
      counts,
    }
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

function fixtureDirectoryFromArgs(argv: readonly string[]): string {
  const index = argv.indexOf('--fixture')
  if (index === -1) {
    return join(import.meta.dirname, 'fixtures', 'poc-seed')
  }
  const value = argv[index + 1]
  if (value === undefined) {
    throw new ToolingError(
      'INVALID_ARGUMENTS',
      '--fixture requires a directory',
    )
  }
  return resolve(value)
}

if (isMainModule()) {
  try {
    const report = await runSeed({
      config: readConfig(),
      fixtureDirectory: fixtureDirectoryFromArgs(process.argv),
    })
    console.log(
      `Seeded ${report.batchId} (${Object.entries(report.counts)
        .map(([table, count]) => `${table}=${String(count)}`)
        .join(', ')}).`,
    )
    console.log(`Manifest sha256: ${report.sourceManifestSha256}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
