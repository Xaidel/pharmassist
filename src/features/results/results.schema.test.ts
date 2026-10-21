import { describe, expect, it } from 'vitest'

import { STALE_AFTER_DAYS } from './results.domain'
import {
  priceRowSchema,
  resultsRequestSchema,
  resultsResponseSchema,
  toPriceFacts,
  type PriceRow,
} from './results.schema'

const medicine = {
  medicine_id: 'POC-016',
  category: 'Diabetes',
  brand_name: 'Janumet',
  generic_name: 'Metformin + sitagliptin',
  strength: '500 mg + 50 mg',
  dosage_form: 'Film-coated tablet',
  pack_size: 'Box of 28 tablets',
  manufacturer: 'Patheon Puerto Rico, Inc.',
  rx_otc: 'Rx',
  pnf_listed: false,
  konsulta_listed: false,
}

const priceRow: PriceRow = {
  medicine_id: 'POC-016',
  pharmacy_id: 'mercury-naga-penafrancia',
  shelf_price_php: 980,
  pack_size: 'Box of 28 tablets',
  pack_quantity: 28,
  pack_unit: 'tablet',
  unit_price_php: 35,
  stock_status: 'in_stock',
  verified_at: '2026-10-20T00:00:00Z',
  stale: false,
  mdrp_entry_id: 'EO104-044',
  mdrp_order: 'EO 104 s. 2020',
  mdrp_annex_row: 44,
  mdrp_ceiling_php: 30.31,
  mdrp_ceiling_basis: 'per_unit',
  mdrp_ceiling_unit: 'tablet',
  mdrp_vat_exclusive: true,
  mdrp_source_url: 'https://example.test',
  mdrp_checked_at: '2026-10-21',
  above_mdrp_flag: true,
}

describe('resultsRequestSchema', () => {
  it('defaults the sort and accepts a missing or null origin', () => {
    const parsed = resultsRequestSchema.parse({
      items: [{ medicine_id: 'POC-001', packs: 1 }],
    })
    expect(parsed.sort).toBe('price')
    expect(parsed.origin).toBeUndefined()

    expect(
      resultsRequestSchema.parse({
        items: [{ medicine_id: 'POC-001', packs: 1 }],
        origin: null,
      }).origin,
    ).toBeNull()
  })

  it('rejects invalid pack counts and unknown fields', () => {
    expect(
      resultsRequestSchema.safeParse({
        items: [{ medicine_id: 'POC-001', packs: 0 }],
      }).success,
    ).toBe(false)
    expect(
      resultsRequestSchema.safeParse({
        items: [{ medicine_id: 'POC-001', packs: 11 }],
      }).success,
    ).toBe(false)
    expect(
      resultsRequestSchema.safeParse({
        items: [{ medicine_id: 'POC-001', packs: 1, extra: true }],
      }).success,
    ).toBe(false)
    expect(
      resultsRequestSchema.safeParse({
        items: [{ medicine_id: 'POC-001', packs: 1 }],
        origin: { latitude: 91, longitude: 0 },
      }).success,
    ).toBe(false)
  })
})

describe('toPriceFacts', () => {
  it('builds the MDRP comparison from an exact joined ceiling', () => {
    expect(toPriceFacts(priceRow)).toMatchObject({
      shelf_price_php: 980,
      unit_price_php: 35,
      stale: false,
      mdrp: {
        entry_id: 'EO104-044',
        ceiling_php: 30.31,
        observed_pack_price_php: 980,
        observed_unit_price_php: 35,
        above: true,
      },
    })
  })

  it('leaves prices without a ceiling unflagged', () => {
    expect(
      toPriceFacts({
        ...priceRow,
        mdrp_entry_id: null,
        mdrp_order: null,
        mdrp_annex_row: null,
        mdrp_ceiling_php: null,
        mdrp_ceiling_basis: null,
        mdrp_ceiling_unit: null,
        mdrp_vat_exclusive: null,
        mdrp_source_url: null,
        mdrp_checked_at: null,
        above_mdrp_flag: null,
      }).mdrp,
    ).toBeNull()
  })

  it('refuses a malformed joined ceiling', () => {
    expect(() => toPriceFacts({ ...priceRow, mdrp_annex_row: null })).toThrow()
  })
})

describe('resultsResponseSchema', () => {
  it('accepts the contract envelope', () => {
    const response = {
      basket: {
        items: [{ medicine_id: 'POC-016', packs: 1, medicine }],
        item_count: 1,
        pack_count: 1,
        currency: 'PHP' as const,
      },
      origin: { latitude: 13.6215, longitude: 123.1945, source: 'naga_center' },
      complete: [],
      incomplete: [],
      no_price_data: [],
      candidate_generics: [],
      meta: {
        generated_at: '2026-10-21T10:00:00Z',
        sort: 'price' as const,
        currency: 'PHP' as const,
        stale_after_days: STALE_AFTER_DAYS,
      },
    }

    expect(resultsResponseSchema.parse(response)).toEqual(response)
  })

  it('rejects a result group with the wrong status', () => {
    expect(
      resultsResponseSchema.safeParse({
        basket: {
          items: [],
          item_count: 0,
          pack_count: 0,
          currency: 'PHP',
        },
        origin: { latitude: 0, longitude: 0, source: 'device' },
        complete: [
          {
            result_key: 'x|POC-001',
            pharmacy: {},
            status: 'incomplete',
          },
        ],
        incomplete: [],
        no_price_data: [],
        candidate_generics: [],
        meta: {
          generated_at: '2026-10-21T10:00:00Z',
          sort: 'price',
          currency: 'PHP',
          stale_after_days: 14,
        },
      }).success,
    ).toBe(false)
  })
})

describe('priceRowSchema', () => {
  it('rejects an unknown stock status', () => {
    expect(
      priceRowSchema.safeParse({ ...priceRow, stock_status: 'maybe' }).success,
    ).toBe(false)
  })
})
