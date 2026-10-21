import { describe, expect, it } from 'vitest'

import {
  BASKET_MAX_ITEMS,
  basketResultKey,
  buildRankedResults,
  cheapestCompleteResultKey,
  distanceMetres,
  priceToCents,
  resolveOpenNow,
  type AlternativeFacts,
  type BasketLine,
  type BuildRankingInput,
  type PharmacyRecord,
  type PriceFacts,
  type ReportFacts,
} from './results.domain'

const ORIGIN = { latitude: 0, longitude: 0 }
const CLOCK = { isoWeekday: 1, minutesSinceMidnight: 10 * 60 }

function pharmacy(
  id: string,
  name: string,
  latitude: number,
  overrides: Partial<PharmacyRecord> = {},
): PharmacyRecord {
  return {
    pharmacy_id: id,
    name,
    brand: null,
    type: 'independent',
    address: `${name} address`,
    barangay: null,
    latitude,
    longitude: 0,
    phone: null,
    hours_text: null,
    opening_hours: null,
    open_24h: false,
    verification_status: 'verified',
    ...overrides,
  }
}

function price(
  medicineId: string,
  pharmacyId: string,
  shelfPrice: number,
  overrides: Partial<PriceFacts> = {},
): PriceFacts {
  return {
    medicine_id: medicineId,
    pharmacy_id: pharmacyId,
    shelf_price_php: shelfPrice,
    pack_size: 'Box of 10 tablets',
    pack_quantity: 10,
    pack_unit: 'tablet',
    unit_price_php: shelfPrice / 10,
    stock_status: 'in_stock',
    verified_at: '2026-10-20T00:00:00Z',
    stale: false,
    mdrp: null,
    ...overrides,
  }
}

const basket: BasketLine[] = [
  { medicine_id: 'P1', packs: 1 },
  { medicine_id: 'P2', packs: 1 },
]

const medicines = [
  {
    medicine_id: 'P1',
    brand_name: 'Alpha',
    generic_name: 'alpha',
    strength: '5 mg',
    dosage_form: 'Tablet',
  },
  {
    medicine_id: 'P2',
    brand_name: 'Beta',
    generic_name: 'beta',
    strength: '10 mg',
    dosage_form: 'Tablet',
  },
]

function rankingInput(
  overrides: Partial<BuildRankingInput> = {},
): BuildRankingInput {
  return {
    basket,
    medicines,
    pharmacies: [],
    prices: [],
    alternatives: [],
    reports: [],
    origin: ORIGIN,
    sort: 'price',
    clock: CLOCK,
    ...overrides,
  }
}

describe('distanceMetres', () => {
  it('returns zero for the same point', () => {
    expect(distanceMetres(ORIGIN, ORIGIN)).toBe(0)
  })

  it('approximates one degree of latitude in metres', () => {
    expect(
      Math.round(distanceMetres(ORIGIN, { latitude: 0, longitude: 1 })),
    ).toBe(111_195)
  })
})

describe('resolveOpenNow', () => {
  it('uses structured hours instead of free text', () => {
    expect(
      resolveOpenNow(
        false,
        { mon: [{ open: '08:00', close: '18:00' }] },
        CLOCK,
      ),
    ).toBe(true)
    expect(
      resolveOpenNow(
        false,
        { mon: [{ open: '08:00', close: '18:00' }] },
        { isoWeekday: 1, minutesSinceMidnight: 19 * 60 },
      ),
    ).toBe(false)
  })

  it('returns null when the day or hours are unknown', () => {
    expect(resolveOpenNow(false, null, CLOCK)).toBeNull()
    expect(resolveOpenNow(false, { tue: [] }, CLOCK)).toBeNull()
  })

  it('handles an overnight range', () => {
    const hours = { mon: [{ open: '22:00', close: '02:00' }] }
    expect(
      resolveOpenNow(false, hours, {
        isoWeekday: 1,
        minutesSinceMidnight: 23 * 60,
      }),
    ).toBe(true)
    expect(
      resolveOpenNow(false, hours, { isoWeekday: 1, minutesSinceMidnight: 60 }),
    ).toBe(true)
    expect(
      resolveOpenNow(false, hours, {
        isoWeekday: 1,
        minutesSinceMidnight: 3 * 60,
      }),
    ).toBe(false)
  })

  it('treats a 24-hour pharmacy as open without structured hours', () => {
    expect(resolveOpenNow(true, null, CLOCK)).toBe(true)
  })
})

describe('basketResultKey', () => {
  it('sorts the medicine ids so the key is stable', () => {
    expect(basketResultKey('pharmacy-a', ['P2', 'P1'])).toBe('pharmacy-a|P1,P2')
  })
})

describe('buildRankedResults', () => {
  const mdrp = {
    entry_id: 'EO104-044',
    order: 'EO 104 s. 2020',
    annex_row: 44,
    ceiling_php: 30.31,
    ceiling_basis: 'per_unit' as const,
    ceiling_unit: 'tablet',
    vat_exclusive: true,
    observed_pack_price_php: 350,
    observed_unit_price_php: 35,
    above: true,
    source_url: 'https://example.test',
    checked_at: '2026-10-21',
  }

  const alternatives: AlternativeFacts[] = [
    {
      medicine_id: 'P1',
      brand_name: 'Zeta Generic',
      manufacturer: 'Zeta Labs',
      pack_size: 'Box of 10',
      rx_otc: 'Rx',
      fda_registration_no: null,
      note: null,
      display_order: 2,
    },
    {
      medicine_id: 'P1',
      brand_name: 'Alpha Generic',
      manufacturer: 'Alpha Labs',
      pack_size: 'Box of 10',
      rx_otc: 'Rx',
      fda_registration_no: 'DR-1',
      note: 'Candidate alternative.',
      display_order: 1,
    },
  ]

  const reports: ReportFacts[] = [
    { result_key: 'A|P1,P2', reported_at: '2026-10-21T09:00:00Z' },
  ]

  const input = rankingInput({
    origin: { latitude: 0, longitude: 0 },
    pharmacies: [
      pharmacy('A', 'Alpha Pharmacy', 0.02, {
        opening_hours: { mon: [{ open: '08:00', close: '18:00' }] },
        hours_text: '8:00 AM-6:00 PM',
      }),
      pharmacy('B', 'Beta Pharmacy', 0.01, { open_24h: true }),
      pharmacy('C', 'Gamma Pharmacy', 0.005),
      pharmacy('D', 'Delta Pharmacy', 0.001),
      pharmacy('E', 'Epsilon Pharmacy', 0.003),
      pharmacy('F', 'Zeta Pharmacy', 0.004),
      pharmacy('G', 'Eta Pharmacy', 0.006),
    ],
    prices: [
      price('P1', 'A', 100),
      price('P2', 'A', 50, { mdrp }),
      price('P1', 'B', 120),
      price('P2', 'B', 60),
      price('P1', 'C', 90),
      price('P1', 'E', 95, { stock_status: 'out_of_stock' }),
      price('P1', 'F', 100),
      price('P2', 'F', 55, { stock_status: 'unknown' }),
      price('P1', 'G', 110),
      price('P2', 'G', 60, { stock_status: 'out_of_stock' }),
    ],
    alternatives,
    reports,
  })

  const result = buildRankedResults(input)

  it('ranks complete baskets by total shelf price, not by MDRP flags', () => {
    expect(result.complete.map((entry) => entry.result_key)).toEqual([
      'A|P1,P2',
      'B|P1,P2',
    ])
    expect(result.complete[0]?.total_shelf_price_php).toBe(150)
    expect(result.complete[0]?.prices.some((line) => line.mdrp?.above)).toBe(
      true,
    )
    expect(result.complete[0]?.reported).toBe(true)
    expect(result.complete[0]?.reported_at).toBe('2026-10-21T09:00:00Z')
  })

  it('marks the cheapest complete result independently of the sort', () => {
    const distanceSorted = buildRankedResults({ ...input, sort: 'distance' })
    expect(distanceSorted.complete.map((entry) => entry.result_key)).toEqual([
      'B|P1,P2',
      'A|P1,P2',
    ])
    expect(cheapestCompleteResultKey(distanceSorted.complete)).toBe('A|P1,P2')
  })

  it('sorts incomplete baskets by missing count, known total, and distance', () => {
    expect(
      result.incomplete.map((entry) => ({
        key: entry.result_key,
        missing: entry.missing_items.map((item) => item.reason),
      })),
    ).toEqual([
      { key: 'C|P1,P2', missing: ['no_price'] },
      { key: 'F|P1,P2', missing: ['stock_unknown'] },
      { key: 'G|P1,P2', missing: ['out_of_stock'] },
    ])
    const incomplete = result.incomplete[0]
    expect(incomplete?.total_shelf_price_php).toBeNull()
    expect(incomplete?.known_total_php).toBe(90)
    expect(incomplete?.missing_items[0]?.brand_name).toBe('Beta')
  })

  it('keeps pharmacies without any available price out of the ranking', () => {
    expect(
      result.no_price_data.map((entry) => entry.pharmacy.pharmacy_id),
    ).toEqual(['D', 'E'])
  })

  it('resolves open-now only from verified structured hours', () => {
    const byId = new Map(
      [...result.complete, ...result.incomplete].map((entry) => [
        entry.pharmacy.pharmacy_id,
        entry.pharmacy,
      ]),
    )
    expect(byId.get('A')?.open_now).toBe(true)
    expect(byId.get('B')?.open_now).toBe(true)
    expect(byId.get('C')?.open_now).toBeNull()
  })

  it('groups candidate generics separately and in display order', () => {
    expect(result.candidate_generics).toEqual([
      {
        for_medicine_id: 'P1',
        items: [
          {
            brand_name: 'Alpha Generic',
            manufacturer: 'Alpha Labs',
            pack_size: 'Box of 10',
            rx_otc: 'Rx',
            fda_registration_no: 'DR-1',
            note: 'Candidate alternative.',
          },
          {
            brand_name: 'Zeta Generic',
            manufacturer: 'Zeta Labs',
            pack_size: 'Box of 10',
            rx_otc: 'Rx',
            fda_registration_no: null,
            note: 'Candidate generic alternative; not a therapeutic-equivalence claim.',
          },
        ],
      },
    ])
  })

  it('includes every price record in a result, including unavailable stock', () => {
    const resultF = result.incomplete.find(
      (entry) => entry.result_key === 'F|P1,P2',
    )
    expect(resultF?.prices.map((line) => line.stock_status)).toEqual([
      'in_stock',
      'unknown',
    ])
  })

  it('exposes basket limits', () => {
    expect(BASKET_MAX_ITEMS).toBe(10)
    expect(priceToCents(30.31)).toBe(3031)
  })
})
