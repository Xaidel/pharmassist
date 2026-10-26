import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  loadFixture,
  mdrpCeilingSeedSchema,
  priceSeedSchema,
  seedManifestSchema,
  type SeedBundle,
} from '../../scripts/seed/fixture'
import { expectedMdrpAttachments } from '../../scripts/seed/mdrp-match'

const fixtureDirectory = join(
  import.meta.dirname,
  '..',
  '..',
  'scripts',
  'seed',
  'fixtures',
  'poc-seed',
)

function availablePharmacies(
  bundle: SeedBundle,
  medicineId: string,
  saleForm: 'pack' | 'strip' | 'loose',
): string[] {
  return bundle.prices
    .filter(
      (price) =>
        price.medicine_id === medicineId &&
        price.sale_form === saleForm &&
        price.sale_state === 'available' &&
        (price.stock_status === 'in_stock' ||
          price.stock_status === 'low_stock'),
    )
    .map((price) => price.pharmacy_id)
}

describe('loadFixture', () => {
  it('loads the full POC seed with its declared counts', async () => {
    const bundle = await loadFixture(fixtureDirectory)
    expect(bundle.manifest.expect.counts).toEqual({
      medicine: 50,
      medicine_alternative: 49,
      pharmacy: 10,
      mdrp_ceiling: 204,
      price_observation: 1500,
    })
    expect(bundle.medicines).toHaveLength(50)
    expect(bundle.alternatives).toHaveLength(49)
    expect(bundle.pharmacies).toHaveLength(10)
    expect(bundle.mdrpCeilings).toHaveLength(204)
    expect(bundle.prices).toHaveLength(1500)
  })

  it('backfills only the pharmacies with an SMS-able mobile number', async () => {
    const bundle = await loadFixture(fixtureDirectory)
    const mobileById = new Map(
      bundle.pharmacies.map((pharmacy) => [pharmacy.id, pharmacy.mobile]),
    )

    expect(mobileById.get('mercury-naga-penafrancia')).toBe('+639688787678')
    expect(mobileById.get('generika-san-felipe')).toBeNull()
    expect(mobileById.get('watsons-sm-city-naga')).toBeNull()
    expect(
      bundle.pharmacies.filter((pharmacy) => pharmacy.mobile !== null),
    ).toHaveLength(5)
  })

  it('keeps exactly the intended catalog gaps', async () => {
    const bundle = await loadFixture(fixtureDirectory)
    const inactive = bundle.medicines.filter((medicine) => !medicine.active)
    expect(inactive.map((medicine) => medicine.id)).toEqual(['POC-028'])
    expect(inactive[0]?.fda_registration_no).toBeNull()

    const omeprazole = bundle.medicines.find(
      (medicine) => medicine.id === 'POC-041',
    )
    expect(omeprazole?.active).toBe(true)
    expect(omeprazole?.base_unit).toBe('capsule')
    expect(
      bundle.prices
        .filter((price) => price.medicine_id === 'POC-041')
        .every((price) => price.sale_state === 'unknown'),
    ).toBe(true)
  })

  it('attaches the MDRP ceiling to POC-016 on every available form', async () => {
    const bundle = await loadFixture(fixtureDirectory)
    const attachments = expectedMdrpAttachments(
      bundle.medicines,
      bundle.mdrpCeilings,
      bundle.prices,
    )
    const attached = bundle.prices.filter(
      (price) =>
        attachments.get(
          `${price.medicine_id}\u0000${price.pharmacy_id}\u0000${price.sale_form}`,
        ) !== null,
    )
    expect(new Set(attached.map((price) => price.medicine_id))).toEqual(
      new Set(['POC-016']),
    )
    expect(attached.every((price) => price.sale_state === 'available')).toBe(
      true,
    )
    expect(
      bundle.prices
        .filter(
          (price) =>
            price.medicine_id === 'POC-016' && price.sale_state === 'available',
        )
        .every(
          (price) =>
            attachments.get(
              `${price.medicine_id}\u0000${price.pharmacy_id}\u0000${price.sale_form}`,
            ) === 'EO104-044',
        ),
    ).toBe(true)
  })

  it('ships the demo basket and trust states', async () => {
    const bundle = await loadFixture(fixtureDirectory)
    const amlodipineLoose = new Set(
      availablePharmacies(bundle, 'POC-001', 'loose'),
    )
    const paracetamolLoose = new Set(
      availablePharmacies(bundle, 'POC-036', 'loose'),
    )
    const complete = bundle.pharmacies.filter(
      (pharmacy) =>
        amlodipineLoose.has(pharmacy.id) && paracetamolLoose.has(pharmacy.id),
    )
    const incomplete = bundle.pharmacies.filter(
      (pharmacy) =>
        amlodipineLoose.has(pharmacy.id) && !paracetamolLoose.has(pharmacy.id),
    )
    const withNoPriceData = bundle.pharmacies.filter(
      (pharmacy) =>
        !amlodipineLoose.has(pharmacy.id) && !paracetamolLoose.has(pharmacy.id),
    )

    expect(complete.length).toBeGreaterThanOrEqual(3)
    expect(
      new Set(
        complete.map((pharmacy) => {
          const first = bundle.prices.find(
            (price) =>
              price.medicine_id === 'POC-001' &&
              price.pharmacy_id === pharmacy.id &&
              price.sale_form === 'loose',
          )
          const second = bundle.prices.find(
            (price) =>
              price.medicine_id === 'POC-036' &&
              price.pharmacy_id === pharmacy.id &&
              price.sale_form === 'strip',
          )
          return (
            (first?.shelf_price_php ?? 0) * 5 +
            (second?.shelf_price_php ?? 0)
          ).toFixed(2)
        }),
      ).size,
    ).toBeGreaterThanOrEqual(2)
    expect(incomplete.length).toBeGreaterThanOrEqual(1)
    expect(withNoPriceData.length).toBeGreaterThanOrEqual(1)

    const exactMix = bundle.prices.find(
      (price) =>
        price.medicine_id === 'POC-036' &&
        price.sale_form === 'strip' &&
        price.pack_quantity === 10 &&
        price.sale_state === 'available',
    )
    expect(exactMix).toBeDefined()

    const packOnly = bundle.prices.filter(
      (price) =>
        price.medicine_id === 'POC-003' && price.sale_state === 'pack_only',
    )
    expect(packOnly).toHaveLength(2)

    const inhaler = bundle.prices.filter(
      (price) =>
        price.medicine_id === 'POC-019' &&
        price.pharmacy_id === 'mercury-naga-penafrancia',
    )
    expect(
      inhaler.filter((price) => price.sale_state === 'not_applicable'),
    ).toHaveLength(2)
    expect(
      inhaler.find(
        (price) =>
          price.sale_form === 'pack' &&
          price.pack_quantity === 200 &&
          price.pack_unit === 'actuation',
      ),
    ).toBeDefined()

    const janumet = bundle.prices.filter(
      (price) =>
        price.medicine_id === 'POC-016' && price.sale_state === 'available',
    )
    expect(janumet.length).toBeGreaterThanOrEqual(1)
    expect(
      janumet.every(
        (price) =>
          (price.shelf_price_php ?? 0) / (price.pack_quantity ?? 1) > 30.31,
      ),
    ).toBe(true)

    expect(
      bundle.prices.some(
        (price) =>
          price.medicine_id === 'POC-036' &&
          price.sale_form === 'loose' &&
          price.sale_state === 'available' &&
          Date.parse(price.verified_at ?? '') <
            Date.parse('2026-10-07T00:00:00Z'),
      ),
    ).toBe(true)

    const rx = bundle.medicines.find((medicine) => medicine.id === 'POC-001')
    const otc = bundle.medicines.find((medicine) => medicine.id === 'POC-036')
    expect(rx?.rx_otc).toBe('Rx')
    expect(otc?.rx_otc).toBe('OTC')
  })

  it('hashes the same bundle consistently', async () => {
    const first = await loadFixture(fixtureDirectory)
    const second = await loadFixture(fixtureDirectory)
    expect(first.sourceManifestSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(second.sourceManifestSha256).toBe(first.sourceManifestSha256)
  })
})

describe('fixture schemas', () => {
  it('rejects a manifest without every expected count', () => {
    const result = seedManifestSchema.safeParse({
      batch_id: 'poc-seed',
      kind: 'poc-seed',
      expect: { counts: { medicine: 1 } },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a per_pack ceiling without a pack', () => {
    const result = mdrpCeilingSeedSchema.safeParse({
      id: 'EO104-001',
      order_id: 'EO 104 s. 2020',
      order_signed: '2020-02-17',
      annex_row: 1,
      category: null,
      molecule: 'Amoxicillin',
      molecules: ['Amoxicillin'],
      strength: '500 mg',
      dosage_form: 'Capsule',
      pack_size: null,
      strength_and_form_raw: null,
      mwp_php: null,
      mrp_php: 10,
      price_basis: 'per_pack',
      price_unit: null,
      vat_exclusive_mrp: false,
      voluntary_price_reduction: false,
      source_url: 'https://example.test',
      source_pdf_page: null,
      checked_at: '2026-10-21',
      notes: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a per_unit ceiling that states a pack', () => {
    const result = mdrpCeilingSeedSchema.safeParse({
      id: 'EO104-001',
      order_id: 'EO 104 s. 2020',
      order_signed: '2020-02-17',
      annex_row: 1,
      category: null,
      molecule: 'Amoxicillin',
      molecules: ['Amoxicillin'],
      strength: '500 mg',
      dosage_form: 'Capsule',
      pack_size: 'Box of 100 capsules',
      strength_and_form_raw: null,
      mwp_php: null,
      mrp_php: 10,
      price_basis: 'per_unit',
      price_unit: 'capsule',
      vat_exclusive_mrp: false,
      voluntary_price_reduction: false,
      source_url: 'https://example.test',
      source_pdf_page: null,
      checked_at: '2026-10-21',
      notes: null,
    })
    expect(result.success).toBe(false)
  })

  it('requires price fields only for available forms', () => {
    const base = {
      medicine_id: 'POC-001',
      pharmacy_id: 'mercury-naga-penafrancia',
      sale_form: 'loose' as const,
      sale_state: 'available' as const,
      form_label: 'Loose tablet',
      shelf_price_php: 1.5,
      pack_quantity: 1,
      pack_unit: 'tablet' as const,
      stock_status: 'in_stock' as const,
      verified_at: '2026-10-20T00:00:00Z',
      verified_by: 'poc-seed',
      source: 'poc-seed',
      notes: null,
    }
    expect(priceSeedSchema.safeParse(base).success).toBe(true)
    expect(
      priceSeedSchema.safeParse({ ...base, shelf_price_php: null }).success,
    ).toBe(false)
    expect(
      priceSeedSchema.safeParse({
        ...base,
        sale_state: 'pack_only',
        form_label: null,
        shelf_price_php: null,
        pack_quantity: null,
        pack_unit: null,
        stock_status: null,
      }).success,
    ).toBe(true)
  })

  it('enforces form quantities and non-sale states', () => {
    const base = {
      medicine_id: 'POC-001',
      pharmacy_id: 'mercury-naga-penafrancia',
      sale_form: 'strip' as const,
      sale_state: 'available' as const,
      form_label: 'Strip of 10 tablets',
      shelf_price_php: 10,
      pack_quantity: 10,
      pack_unit: 'tablet' as const,
      stock_status: 'in_stock' as const,
      verified_at: '2026-10-20T00:00:00Z',
      verified_by: 'poc-seed',
      source: 'poc-seed',
      notes: null,
    }
    expect(priceSeedSchema.safeParse(base).success).toBe(true)
    expect(
      priceSeedSchema.safeParse({ ...base, pack_quantity: 1 }).success,
    ).toBe(false)
    expect(
      priceSeedSchema.safeParse({
        ...base,
        sale_form: 'pack',
        sale_state: 'pack_only',
      }).success,
    ).toBe(false)
  })
})
