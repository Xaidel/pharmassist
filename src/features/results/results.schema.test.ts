import { describe, expect, it } from 'vitest'

import { STALE_AFTER_DAYS } from './results.domain'
import {
  formOfferRowSchema,
  resultsRequestSchema,
  resultsResponseSchema,
  resultBasketItemSchema,
  toStoredFormOffer,
  type FormOfferRow,
} from './results.schema'

const formRow: FormOfferRow = {
  medicine_id: 'POC-016',
  pharmacy_id: 'mercury-naga-penafrancia',
  sale_form: 'pack',
  sale_state: 'available',
  form_label: 'Box of 28 tablets',
  shelf_price_php: 980,
  pack_quantity: 28,
  pack_unit: 'tablet',
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
  mdrp_vat_exempt: true,
  mdrp_effective_ceiling_php: 30.31,
  mdrp_source_url: 'https://example.test',
  mdrp_checked_at: '2026-10-21',
  mdrp_observed_rate_php: 35,
  mdrp_rate_basis: 'box_rate',
  above_mdrp_flag: true,
}

const pharmacy = {
  pharmacy_id: 'mercury-naga-penafrancia',
  name: 'Mercury Drug',
  brand: 'Mercury Drug',
  type: 'chain' as const,
  address: 'Panganiban St., Naga City',
  barangay: 'Dinaga',
  latitude: 13.623234,
  longitude: 123.185995,
  phone: null,
  mobile: '+639688787678',
  hours_text: '24 hours',
  opening_hours: null,
  open_24h: true,
  open_now: true,
  distance_m: 850,
  verification_status: 'verified' as const,
}

const exactItem = {
  medicine_id: 'POC-016',
  quantity: 5,
  unit: 'tablet',
  outcome: 'exact' as const,
  components: [
    {
      sale_form: 'loose' as const,
      form_label: 'Loose tablet',
      pack_quantity: 1,
      pack_unit: 'tablet' as const,
      count: 5,
      shelf_price_php: 38,
      line_total_php: 190,
      stock_status: 'in_stock' as const,
      verified_at: '2026-10-20T00:00:00Z',
      stale: false,
      mdrp: null,
    },
  ],
  total_shelf_price_php: 190,
  forms: [],
}

describe('resultsRequestSchema', () => {
  it('defaults the sort and accepts a missing or null origin', () => {
    const parsed = resultsRequestSchema.parse({
      items: [{ medicine_id: 'POC-001', quantity: 5, unit: 'tablet' }],
    })
    expect(parsed.sort).toBe('price')
    expect(parsed.origin).toBeUndefined()

    expect(
      resultsRequestSchema.parse({
        items: [{ medicine_id: 'POC-001', quantity: 5, unit: 'tablet' }],
        origin: null,
      }).origin,
    ).toBeNull()
  })

  it('rejects malformed and unknown fields', () => {
    expect(
      resultsRequestSchema.safeParse({
        items: [{ medicine_id: 'POC-001', quantity: 'five', unit: 'tablet' }],
      }).success,
    ).toBe(false)
    expect(
      resultsRequestSchema.safeParse({
        items: [
          { medicine_id: 'POC-001', quantity: 5, unit: 'tablet', packs: 1 },
        ],
      }).success,
    ).toBe(false)
    expect(
      resultsRequestSchema.safeParse({
        items: [{ medicine_id: 'POC-001', quantity: 5, unit: 'tablet' }],
        origin: { latitude: 91, longitude: 0 },
      }).success,
    ).toBe(false)
  })
})

describe('toStoredFormOffer', () => {
  it('builds the per-form MDRP comparison from an exact joined ceiling', () => {
    expect(toStoredFormOffer(formRow)).toMatchObject({
      shelf_price_php: 980,
      stale: false,
      mdrp: {
        entry_id: 'EO104-044',
        ceiling_php: 30.31,
        effective_ceiling_php: 30.31,
        vat_exempt: true,
        observed_rate_php: 35,
        rate_basis: 'box_rate',
        above: true,
      },
    })
  })

  it('leaves prices without a ceiling unflagged', () => {
    expect(
      toStoredFormOffer({
        ...formRow,
        mdrp_entry_id: null,
        mdrp_order: null,
        mdrp_annex_row: null,
        mdrp_ceiling_php: null,
        mdrp_ceiling_basis: null,
        mdrp_ceiling_unit: null,
        mdrp_vat_exclusive: null,
        mdrp_vat_exempt: null,
        mdrp_effective_ceiling_php: null,
        mdrp_source_url: null,
        mdrp_checked_at: null,
        mdrp_observed_rate_php: null,
        mdrp_rate_basis: null,
        above_mdrp_flag: null,
      }).mdrp,
    ).toBeNull()
  })

  it('refuses a malformed joined ceiling', () => {
    expect(() =>
      toStoredFormOffer({ ...formRow, mdrp_annex_row: null }),
    ).toThrow()
  })
})

describe('resultsResponseSchema', () => {
  it('accepts the contract envelope', () => {
    const response = {
      basket: {
        items: [
          {
            medicine_id: 'POC-016',
            quantity: 5,
            unit: 'tablet' as const,
            medicine: {
              medicine_id: 'POC-016',
              category: 'Diabetes',
              brand_name: 'Janumet',
              generic_name: 'Metformin + sitagliptin',
              strength: '500 mg + 50 mg',
              dosage_form: 'Film-coated tablet',
              base_unit: 'tablet' as const,
              manufacturer: 'Patheon Puerto Rico, Inc.',
              rx_otc: 'Rx' as const,
              pnf_listed: false,
              konsulta_listed: false,
            },
          },
        ],
        item_count: 1,
        currency: 'PHP' as const,
      },
      origin: { latitude: 13.6215, longitude: 123.1945, source: 'naga_center' },
      complete: [
        {
          result_key: 'mercury-naga-penafrancia|POC-016',
          pharmacy,
          status: 'complete' as const,
          complete: true as const,
          items: [exactItem],
          total_shelf_price_php: 190,
          known_total_php: 190,
          covering_total_php: null,
          missing_items: [],
          above_mdrp_ceiling: false,
          reported: false,
          reported_at: null,
        },
      ],
      sold_per_pack_only: [],
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
        sold_per_pack_only: [],
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

  it('rejects a pack-only item without a covering purchase', () => {
    expect(
      resultBasketItemSchema.safeParse({
        medicine_id: 'POC-001',
        quantity: 5,
        unit: 'tablet',
        outcome: 'sold_per_pack_only',
        components: [],
        total_shelf_price_php: null,
        forms: [],
      }).success,
    ).toBe(false)
  })
})

describe('formOfferRowSchema', () => {
  it('rejects an unknown stock status', () => {
    expect(
      formOfferRowSchema.safeParse({ ...formRow, stock_status: 'maybe' })
        .success,
    ).toBe(false)
  })

  it('rejects an unknown sale state', () => {
    expect(
      formOfferRowSchema.safeParse({ ...formRow, sale_state: 'gone' }).success,
    ).toBe(false)
  })
})
