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

function availablePrices(bundle: SeedBundle, medicineId: string): string[] {
  return bundle.prices
    .filter(
      (price) =>
        price.medicine_id === medicineId &&
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
      price_record: 431,
    })
    expect(bundle.medicines).toHaveLength(50)
    expect(bundle.alternatives).toHaveLength(49)
    expect(bundle.pharmacies).toHaveLength(10)
    expect(bundle.mdrpCeilings).toHaveLength(204)
    expect(bundle.prices).toHaveLength(431)
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
    expect(omeprazole?.pack_size).toBeNull()
    expect(bundle.prices.some((price) => price.medicine_id === 'POC-041')).toBe(
      false,
    )
  })

  it('attaches the MDRP ceiling to POC-016 only', async () => {
    const bundle = await loadFixture(fixtureDirectory)
    const attachments = [
      ...expectedMdrpAttachments(bundle.medicines, bundle.mdrpCeilings),
    ].filter(([, entryId]) => entryId !== null)
    expect(attachments).toEqual([['POC-016', 'EO104-044']])
  })

  it('ships the demo basket and trust states', async () => {
    const bundle = await loadFixture(fixtureDirectory)
    const bundleAvailable = new Set(availablePrices(bundle, 'POC-001'))
    const paracetamolAvailable = new Set(availablePrices(bundle, 'POC-036'))
    const complete = bundle.pharmacies.filter(
      (pharmacy) =>
        bundleAvailable.has(pharmacy.id) &&
        paracetamolAvailable.has(pharmacy.id),
    )
    const incomplete = bundle.pharmacies.filter(
      (pharmacy) =>
        bundleAvailable.has(pharmacy.id) &&
        !paracetamolAvailable.has(pharmacy.id),
    )
    const withNoPriceData = bundle.pharmacies.filter(
      (pharmacy) =>
        !bundleAvailable.has(pharmacy.id) &&
        !paracetamolAvailable.has(pharmacy.id),
    )

    expect(complete.length).toBeGreaterThanOrEqual(3)
    expect(
      new Set(
        complete.map((pharmacy) => {
          const total = bundle.prices
            .filter(
              (price) =>
                price.pharmacy_id === pharmacy.id &&
                (price.medicine_id === 'POC-001' ||
                  price.medicine_id === 'POC-036'),
            )
            .reduce((sum, price) => sum + price.shelf_price_php, 0)
          return total.toFixed(2)
        }),
      ).size,
    ).toBeGreaterThanOrEqual(2)
    expect(incomplete.length).toBeGreaterThanOrEqual(1)
    expect(withNoPriceData.length).toBeGreaterThanOrEqual(1)

    const janumet = bundle.prices.filter(
      (price) => price.medicine_id === 'POC-016',
    )
    expect(janumet.length).toBeGreaterThanOrEqual(1)
    expect(
      janumet.every(
        (price) => price.shelf_price_php / (price.pack_quantity ?? 1) > 30.31,
      ),
    ).toBe(true)

    expect(
      bundle.prices.some(
        (price) =>
          price.medicine_id === 'POC-016' &&
          Date.parse(price.verified_at) < Date.parse('2026-10-07T00:00:00Z'),
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

  it('requires pack quantity and unit together', () => {
    const base = {
      medicine_id: 'POC-001',
      pharmacy_id: 'mercury-naga-penafrancia',
      shelf_price_php: 10,
      pack_size: 'Box of 10 tablets',
      stock_status: 'in_stock',
      verified_at: '2026-10-20T00:00:00Z',
      verified_by: 'poc-seed',
      source: 'poc-seed',
      notes: null,
    }
    expect(
      priceSeedSchema.safeParse({ ...base, pack_quantity: 10, pack_unit: null })
        .success,
    ).toBe(false)
    expect(
      priceSeedSchema.safeParse({
        ...base,
        pack_quantity: null,
        pack_unit: null,
      }).success,
    ).toBe(true)
  })
})
