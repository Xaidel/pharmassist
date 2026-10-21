import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  loadFixture,
  mdrpCeilingSeedSchema,
  priceSeedSchema,
  seedManifestSchema,
} from '../../scripts/seed/fixture'

const fixtureDirectory = join(
  import.meta.dirname,
  '..',
  '..',
  'scripts',
  'seed',
  'fixtures',
  'poc-seed',
)

describe('loadFixture', () => {
  it('loads the tooling fixture with its declared counts', async () => {
    const bundle = await loadFixture(fixtureDirectory)
    expect(bundle.manifest.expect.counts).toEqual({
      medicine: 4,
      medicine_alternative: 1,
      pharmacy: 2,
      mdrp_ceiling: 1,
      price_record: 4,
    })
    expect(bundle.medicines).toHaveLength(4)
    expect(bundle.alternatives).toHaveLength(1)
    expect(bundle.pharmacies).toHaveLength(2)
    expect(bundle.mdrpCeilings).toHaveLength(1)
    expect(bundle.prices).toHaveLength(4)
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
