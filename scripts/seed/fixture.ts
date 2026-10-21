import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { z } from 'zod'

import { ToolingError } from '../db/database'

const idSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'invalid identifier')
const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, 'invalid slug')
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
const isoDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
    'expected an ISO 8601 UTC instant',
  )
const moneySchema = z
  .number()
  .nonnegative()
  .refine(
    (value) => Number(value.toFixed(2)) === value,
    'expected at most two decimal places',
  )
const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'expected HH:MM')
const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const openingHoursSchema = z.record(
  z.enum(dayKeys),
  z.array(z.object({ open: timeSchema, close: timeSchema }).strict()),
)

export const medicineSeedSchema = z
  .object({
    id: idSchema,
    category: z.string().min(1),
    brand_name: z.string().min(1).nullable(),
    generic_name: z.string().min(1),
    strength: z.string().min(1),
    dosage_form: z.string().min(1),
    pack_size: z.string().min(1).nullable(),
    manufacturer: z.string().min(1).nullable(),
    rx_otc: z.enum(['Rx', 'OTC']),
    fda_registration_no: z.string().min(1).nullable(),
    fda_registration_expiry: isoDate.nullable(),
    pnf_listed: z.boolean().nullable(),
    pnf_entry: z.string().min(1).nullable(),
    pnf_page: z.number().int().positive().nullable(),
    konsulta_listed: z.boolean().nullable(),
    konsulta_entry: z.string().min(1).nullable(),
    konsulta_as_of: isoDate.nullable(),
    generic_group_id: z.string().min(1).nullable(),
    active: z.boolean(),
    data_source: z.string().min(1),
  })
  .strict()

export const alternativeSeedSchema = z
  .object({
    id: idSchema,
    medicine_id: idSchema,
    brand_name: z.string().min(1),
    manufacturer: z.string().min(1).nullable(),
    pack_size: z.string().min(1).nullable(),
    rx_otc: z.enum(['Rx', 'OTC']),
    fda_registration_no: z.string().min(1).nullable(),
    registration_expiry: isoDate.nullable(),
    note: z.string().min(1).nullable(),
    display_order: z.number().int().nonnegative(),
  })
  .strict()

export const pharmacySeedSchema = z
  .object({
    id: slugSchema,
    name: z.string().min(1),
    brand: z.string().min(1).nullable(),
    type: z.enum(['chain', 'independent', 'public_health_center']),
    address: z.string().min(1),
    barangay: z.string().min(1).nullable(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    phone: z.string().min(1).nullable(),
    hours_text: z.string().min(1).nullable(),
    open_24h: z.boolean(),
    opening_hours: openingHoursSchema.nullable(),
    verification_status: z.enum(['verified', 'unverified']),
    data_source: z.string().min(1),
    source_url: z.string().min(1).nullable(),
    coordinate_confidence: z.enum(['high', 'medium', 'low']).nullable(),
    notes: z.string().min(1).nullable(),
  })
  .strict()

export const mdrpCeilingSeedSchema = z
  .object({
    id: idSchema,
    order_id: z.string().min(1),
    order_signed: isoDate,
    annex_row: z.number().int().positive(),
    category: z.string().min(1).nullable(),
    molecule: z.string().min(1),
    molecules: z.array(z.string().min(1)).min(1),
    strength: z.string().min(1),
    dosage_form: z.string().min(1).nullable(),
    pack_size: z.string().min(1).nullable(),
    strength_and_form_raw: z.string().min(1).nullable(),
    mwp_php: moneySchema.nullable(),
    mrp_php: moneySchema.refine(
      (value) => value > 0,
      'mrp_php must be positive',
    ),
    price_basis: z.enum(['per_unit', 'per_pack']),
    price_unit: z.string().min(1).nullable(),
    vat_exclusive_mrp: z.boolean(),
    voluntary_price_reduction: z.boolean(),
    source_url: z.string().min(1),
    source_pdf_page: z.number().int().positive().nullable(),
    checked_at: isoDate,
    notes: z.string().min(1).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.price_basis === 'per_pack' &&
      (value.pack_size === null || value.price_unit !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'per_pack ceilings require pack_size and no price_unit',
      })
    }
    if (value.price_basis === 'per_unit' && value.pack_size !== null) {
      context.addIssue({
        code: 'custom',
        message: 'per_unit ceilings cannot state a pack_size',
      })
    }
  })

export const priceSeedSchema = z
  .object({
    medicine_id: idSchema,
    pharmacy_id: slugSchema,
    shelf_price_php: moneySchema,
    pack_size: z.string().min(1),
    pack_quantity: z.number().positive().nullable(),
    pack_unit: z.string().min(1).nullable(),
    stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'unknown']),
    verified_at: isoDateTime,
    verified_by: z.string().min(1),
    source: z.string().min(1),
    notes: z.string().min(1).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.pack_quantity === null) !== (value.pack_unit === null)) {
      context.addIssue({
        code: 'custom',
        message: 'pack_quantity and pack_unit are set together or both null',
      })
    }
  })

export const seedManifestSchema = z
  .object({
    batch_id: z.literal('poc-seed'),
    kind: z.literal('poc-seed'),
    expect: z
      .object({
        counts: z
          .object({
            medicine: z.number().int().nonnegative(),
            medicine_alternative: z.number().int().nonnegative(),
            pharmacy: z.number().int().nonnegative(),
            mdrp_ceiling: z.number().int().nonnegative(),
            price_record: z.number().int().nonnegative(),
          })
          .strict(),
        inactive_medicine_ids: z.array(idSchema),
        mdrp_attachments: z.array(
          z.object({ medicine_id: idSchema, entry_id: idSchema }).strict(),
        ),
      })
      .strict(),
  })
  .strict()

export type MedicineSeed = z.infer<typeof medicineSeedSchema>
export type AlternativeSeed = z.infer<typeof alternativeSeedSchema>
export type PharmacySeed = z.infer<typeof pharmacySeedSchema>
export type MdrpCeilingSeed = z.infer<typeof mdrpCeilingSeedSchema>
export type PriceSeed = z.infer<typeof priceSeedSchema>
export type SeedManifest = z.infer<typeof seedManifestSchema>

export type SeedBundle = {
  manifest: SeedManifest
  medicines: MedicineSeed[]
  alternatives: AlternativeSeed[]
  pharmacies: PharmacySeed[]
  mdrpCeilings: MdrpCeilingSeed[]
  prices: PriceSeed[]
  sourceManifestSha256: string
}

const fixtureFiles = [
  'manifest.json',
  'medicines.json',
  'alternatives.json',
  'pharmacies.json',
  'mdrp-ceilings.json',
  'prices.json',
] as const

function hashBundle(contents: ReadonlyMap<string, string>): string {
  const hash = createHash('sha256')
  for (const name of [...contents.keys()].sort()) {
    hash.update(name)
    hash.update('\u0000')
    hash.update(contents.get(name) ?? '')
    hash.update('\u0000')
  }
  return hash.digest('hex')
}

function assertUnique<T>(
  values: readonly T[],
  key: (value: T) => string,
  label: string,
): void {
  const seen = new Set<string>()
  for (const value of values) {
    const id = key(value)
    if (seen.has(id)) {
      throw new ToolingError(
        'DUPLICATE_FIXTURE_ROW',
        `Duplicate ${label}: ${id}`,
      )
    }
    seen.add(id)
  }
}

function assertReferences(
  bundle: Omit<SeedBundle, 'sourceManifestSha256'>,
): void {
  const medicineIds = new Set(bundle.medicines.map((row) => row.id))
  const pharmacyIds = new Set(bundle.pharmacies.map((row) => row.id))

  for (const row of bundle.medicines) {
    if (row.active && row.fda_registration_no === null) {
      throw new ToolingError(
        'FIXTURE_INVARIANT',
        `Active medicine ${row.id} has no FDA registration number`,
      )
    }
  }

  for (const row of bundle.alternatives) {
    if (!medicineIds.has(row.medicine_id)) {
      throw new ToolingError(
        'FIXTURE_INVARIANT',
        `Alternative ${row.id} references unknown medicine ${row.medicine_id}`,
      )
    }
  }

  for (const row of bundle.prices) {
    if (!medicineIds.has(row.medicine_id)) {
      throw new ToolingError(
        'FIXTURE_INVARIANT',
        `Price references unknown medicine ${row.medicine_id}`,
      )
    }
    if (!pharmacyIds.has(row.pharmacy_id)) {
      throw new ToolingError(
        'FIXTURE_INVARIANT',
        `Price references unknown pharmacy ${row.pharmacy_id}`,
      )
    }
  }
}

/** Read, validate, and hash a seed fixture directory. */
export async function loadFixture(directory: string): Promise<SeedBundle> {
  const contents = new Map<string, string>()
  for (const name of fixtureFiles) {
    contents.set(name, await readFile(join(directory, name), 'utf8'))
  }

  const manifest = seedManifestSchema.parse(
    JSON.parse(contents.get('manifest.json') ?? '{}'),
  )
  const medicines = z
    .array(medicineSeedSchema)
    .parse(JSON.parse(contents.get('medicines.json') ?? '[]'))
  const alternatives = z
    .array(alternativeSeedSchema)
    .parse(JSON.parse(contents.get('alternatives.json') ?? '[]'))
  const pharmacies = z
    .array(pharmacySeedSchema)
    .parse(JSON.parse(contents.get('pharmacies.json') ?? '[]'))
  const mdrpCeilings = z
    .array(mdrpCeilingSeedSchema)
    .parse(JSON.parse(contents.get('mdrp-ceilings.json') ?? '[]'))
  const prices = z
    .array(priceSeedSchema)
    .parse(JSON.parse(contents.get('prices.json') ?? '[]'))

  const bundle = {
    manifest,
    medicines,
    alternatives,
    pharmacies,
    mdrpCeilings,
    prices,
  }

  assertUnique(medicines, (row) => row.id, 'medicine id')
  assertUnique(pharmacies, (row) => row.id, 'pharmacy id')
  assertUnique(alternatives, (row) => row.id, 'alternative id')
  assertUnique(mdrpCeilings, (row) => row.id, 'MDRP ceiling id')
  assertUnique(
    alternatives,
    (row) =>
      `${row.medicine_id}\u0000${row.brand_name}\u0000${row.fda_registration_no ?? ''}`,
    'alternative natural key',
  )
  assertUnique(
    prices,
    (row) => `${row.medicine_id}\u0000${row.pharmacy_id}`,
    'price natural key',
  )
  assertReferences(bundle)

  return { ...bundle, sourceManifestSha256: hashBundle(contents) }
}
