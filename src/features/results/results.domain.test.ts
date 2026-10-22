import { describe, expect, it } from 'vitest'

import {
  BASKET_MAX_ITEMS,
  basketResultKey,
  buildPharmacyBasket,
  buildRankedResults,
  cheapestCompleteResultKey,
  chooseCoveringPurchase,
  distanceMetres,
  findCheapestExactCombination,
  missingReasonFor,
  priceToCents,
  resolveOpenNow,
  type AlternativeFacts,
  type BasketLine,
  type BuildRankingInput,
  type MdrpInfo,
  type PharmacyRecord,
  type ReportFacts,
  type SaleForm,
  type SaleState,
  type StockStatus,
  type StoredFormOffer,
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

function formLabel(saleForm: SaleForm, quantity: number | null): string {
  switch (saleForm) {
    case 'pack':
      return `Box of ${String(quantity ?? 0)} tablets`
    case 'strip':
      return `Strip of ${String(quantity ?? 0)} tablets`
    case 'loose':
      return 'Loose tablet'
  }
}

function offer(
  medicineId: string,
  pharmacyId: string,
  saleForm: SaleForm,
  saleState: SaleState,
  price: number | null,
  packQuantity: number | null,
  stock: StockStatus | null = null,
  overrides: Partial<StoredFormOffer> = {},
): StoredFormOffer {
  const available = saleState === 'available'
  return {
    medicine_id: medicineId,
    pharmacy_id: pharmacyId,
    sale_form: saleForm,
    sale_state: saleState,
    form_label: available ? formLabel(saleForm, packQuantity) : null,
    shelf_price_php: available ? price : null,
    pack_quantity: available ? packQuantity : null,
    pack_unit: available ? 'tablet' : null,
    stock_status: available ? (stock ?? 'in_stock') : null,
    verified_at: available ? '2026-10-20T00:00:00Z' : null,
    stale: available ? false : null,
    mdrp: null,
    ...overrides,
  }
}

const basket: BasketLine[] = [
  { medicine_id: 'P1', quantity: 5, unit: 'tablet' },
  { medicine_id: 'P2', quantity: 10, unit: 'tablet' },
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
    forms: [],
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

describe('findCheapestExactCombination', () => {
  it('uses loose units when a strip would overshoot', () => {
    const forms = [
      offer('P1', 'A', 'pack', 'available', 120, 100),
      offer('P1', 'A', 'strip', 'available', 12, 10),
      offer('P1', 'A', 'loose', 'available', 1.5, 1),
    ]
    const combination = findCheapestExactCombination(5, forms)
    expect(
      combination?.map((choice) => [choice.form.sale_form, choice.count]),
    ).toEqual([['loose', 5]])
  })

  it('finds the mixed strip and loose combination', () => {
    const forms = [
      offer('P1', 'A', 'pack', 'available', 120, 100),
      offer('P1', 'A', 'strip', 'available', 12, 10),
      offer('P1', 'A', 'loose', 'available', 1.5, 1),
    ]
    const combination = findCheapestExactCombination(12, forms)
    expect(
      combination?.map((choice) => [choice.form.sale_form, choice.count]),
    ).toEqual([
      ['strip', 1],
      ['loose', 2],
    ])
  })

  it('returns null when no combination is exact', () => {
    const forms = [offer('P3', 'A', 'pack', 'available', 300, 30)]
    expect(findCheapestExactCombination(10, forms)).toBeNull()
  })

  it('combines two forms without a loose offer', () => {
    const forms = [
      offer('P4', 'A', 'pack', 'available', 50, 30),
      offer('P4', 'A', 'strip', 'available', 10, 5),
    ]
    const combination = findCheapestExactCombination(30, forms)
    expect(
      combination?.map((choice) => [choice.form.sale_form, choice.count]),
    ).toEqual([['pack', 1]])
  })

  it('does not treat an overshoot as exact', () => {
    const forms = [
      offer('P5', 'A', 'pack', 'available', 450, 200),
      offer('P5', 'A', 'strip', 'not_applicable', null, null),
      offer('P5', 'A', 'loose', 'not_applicable', null, null),
    ]
    expect(findCheapestExactCombination(30, forms)).toBeNull()
  })
})

describe('chooseCoveringPurchase', () => {
  it('covers a pack-only medicine with one pack', () => {
    const forms = [
      offer('P3', 'A', 'pack', 'available', 300, 30),
      offer('P3', 'A', 'strip', 'pack_only', null, null),
      offer('P3', 'A', 'loose', 'pack_only', null, null),
    ]
    expect(chooseCoveringPurchase(10, forms)).toMatchObject({
      buyQuantity: 1,
      coversQuantity: 30,
      coveringTotalPhp: 300,
      copy: 'sold_per_pack_only',
    })
  })

  it('labels a pack-only inhaler as sold by the pack', () => {
    const forms = [
      offer('P5', 'A', 'pack', 'available', 450, 200),
      offer('P5', 'A', 'strip', 'not_applicable', null, null),
      offer('P5', 'A', 'loose', 'not_applicable', null, null),
    ]
    expect(chooseCoveringPurchase(30, forms)).toMatchObject({
      buyQuantity: 1,
      coversQuantity: 200,
      copy: 'sold_by_the_pack',
    })
  })

  it('labels a strip covering purchase', () => {
    const forms = [
      offer('P6', 'A', 'pack', 'available', 120, 100, 'out_of_stock'),
      offer('P6', 'A', 'strip', 'available', 12, 10),
      offer('P6', 'A', 'loose', 'pack_only', null, null),
    ]
    expect(chooseCoveringPurchase(5, forms)).toMatchObject({
      buyQuantity: 1,
      coversQuantity: 10,
      copy: 'sold_by_the_strip',
    })
  })
})

describe('missingReasonFor', () => {
  it('reports not stocked only when every form is not stocked', () => {
    expect(
      missingReasonFor([
        offer('P1', 'A', 'pack', 'not_stocked', null, null),
        offer('P1', 'A', 'strip', 'not_stocked', null, null),
        offer('P1', 'A', 'loose', 'not_stocked', null, null),
      ]),
    ).toBe('not_stocked')
  })

  it('reports out of stock before stock unknown', () => {
    expect(
      missingReasonFor([
        offer('P1', 'A', 'pack', 'available', 120, 100, 'out_of_stock'),
        offer('P1', 'A', 'strip', 'available', 12, 10, 'unknown'),
        offer('P1', 'A', 'loose', 'unknown', null, null),
      ]),
    ).toBe('out_of_stock')
    expect(
      missingReasonFor([
        offer('P1', 'A', 'pack', 'available', 120, 100, 'unknown'),
        offer('P1', 'A', 'strip', 'unknown', null, null),
        offer('P1', 'A', 'loose', 'unknown', null, null),
      ]),
    ).toBe('stock_unknown')
  })

  it('reports no price for unknown-only forms', () => {
    expect(
      missingReasonFor([
        offer('P1', 'A', 'pack', 'unknown', null, null),
        offer('P1', 'A', 'strip', 'unknown', null, null),
        offer('P1', 'A', 'loose', 'unknown', null, null),
      ]),
    ).toBe('no_price')
  })

  it('treats pack-only and not-applicable forms as stocked', () => {
    expect(
      missingReasonFor([
        offer('P1', 'A', 'pack', 'available', 120, 100),
        offer('P1', 'A', 'strip', 'pack_only', null, null),
        offer('P1', 'A', 'loose', 'not_applicable', null, null),
      ]),
    ).toBeNull()
  })
})

describe('buildPharmacyBasket', () => {
  it('shows pack-only as a covering purchase, not as an incomplete item', () => {
    const outcome = buildPharmacyBasket({
      basket: [{ medicine_id: 'P1', quantity: 5, unit: 'tablet' }],
      medicines,
      forms: [
        offer('P1', 'A', 'pack', 'available', 300, 30),
        offer('P1', 'A', 'strip', 'pack_only', null, null),
        offer('P1', 'A', 'loose', 'pack_only', null, null),
      ],
    })

    expect(outcome.status).toBe('sold_per_pack_only')
    expect(outcome.no_price_data).toBe(false)
    expect(outcome.missing_items).toEqual([])
    expect(outcome.total_shelf_price_php).toBeNull()
    expect(outcome.covering_total_php).toBe(300)
    expect(outcome.items[0]?.pack_only?.copy).toBe('sold_per_pack_only')
  })

  it('shows a not-applicable inhaler as sold by the pack', () => {
    const outcome = buildPharmacyBasket({
      basket: [{ medicine_id: 'P1', quantity: 30, unit: 'actuation' }],
      medicines,
      forms: [
        offer('P1', 'A', 'pack', 'available', 450, 200),
        offer('P1', 'A', 'strip', 'not_applicable', null, null),
        offer('P1', 'A', 'loose', 'not_applicable', null, null),
      ],
    })

    expect(outcome.status).toBe('sold_per_pack_only')
    expect(outcome.items[0]?.pack_only).toMatchObject({
      copy: 'sold_by_the_pack',
      covers_quantity: 200,
    })
  })

  it('builds an exact mixed-form basket total', () => {
    const outcome = buildPharmacyBasket({
      basket: [{ medicine_id: 'P1', quantity: 12, unit: 'tablet' }],
      medicines,
      forms: [
        offer('P1', 'A', 'pack', 'available', 120, 100),
        offer('P1', 'A', 'strip', 'available', 12, 10),
        offer('P1', 'A', 'loose', 'available', 1.5, 1),
      ],
    })

    expect(outcome.status).toBe('complete')
    expect(outcome.total_shelf_price_php).toBe(15)
    expect(
      outcome.items[0]?.components.map((component) => [
        component.sale_form,
        component.count,
      ]),
    ).toEqual([
      ['strip', 1],
      ['loose', 2],
    ])
  })

  it('marks a missing item with its reason and keeps the exact subtotal', () => {
    const outcome = buildPharmacyBasket({
      basket: [
        { medicine_id: 'P1', quantity: 5, unit: 'tablet' },
        { medicine_id: 'P2', quantity: 10, unit: 'tablet' },
      ],
      medicines,
      forms: [
        offer('P1', 'A', 'pack', 'not_stocked', null, null),
        offer('P1', 'A', 'strip', 'not_stocked', null, null),
        offer('P1', 'A', 'loose', 'not_stocked', null, null),
        offer('P2', 'A', 'pack', 'available', 50, 100),
        offer('P2', 'A', 'strip', 'available', 6, 10),
        offer('P2', 'A', 'loose', 'available', 0.7, 1),
      ],
    })

    expect(outcome.status).toBe('incomplete')
    expect(outcome.missing_items).toEqual([
      expect.objectContaining({ medicine_id: 'P1', reason: 'not_stocked' }),
    ])
    expect(outcome.known_total_php).toBe(6)
  })
})

describe('buildRankedResults', () => {
  const mdrp: MdrpInfo = {
    entry_id: 'EO104-044',
    order: 'EO 104 s. 2020',
    annex_row: 44,
    ceiling_php: 30.31,
    effective_ceiling_php: 30.31,
    ceiling_basis: 'per_unit',
    ceiling_unit: 'tablet',
    vat_exclusive: true,
    vat_exempt: true,
    observed_rate_php: 1,
    rate_basis: 'loose_price',
    above: true,
    source_url: 'https://example.test',
    checked_at: '2026-10-21',
  }

  const alternatives: AlternativeFacts[] = [
    {
      medicine_id: 'P1',
      brand_name: 'Zeta Generic',
      manufacturer: 'Zeta Labs',
      reference_pack_size: 'Box of 10',
      rx_otc: 'Rx',
      fda_registration_no: null,
      note: null,
      display_order: 2,
    },
    {
      medicine_id: 'P1',
      brand_name: 'Alpha Generic',
      manufacturer: 'Alpha Labs',
      reference_pack_size: 'Box of 10',
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
    pharmacies: [
      pharmacy('A', 'Alpha Pharmacy', 0.02, {
        opening_hours: { mon: [{ open: '08:00', close: '18:00' }] },
        hours_text: '8:00 AM-6:00 PM',
      }),
      pharmacy('B', 'Beta Pharmacy', 0.01, { open_24h: true }),
      pharmacy('C', 'Gamma Pharmacy', 0.005),
      pharmacy('D', 'Delta Pharmacy', 0.001),
      pharmacy('E', 'Epsilon Pharmacy', 0.003),
    ],
    forms: [
      offer('P1', 'A', 'pack', 'available', 100, 100),
      offer('P1', 'A', 'strip', 'available', 10, 10),
      offer('P1', 'A', 'loose', 'available', 1, 1, 'in_stock', { mdrp }),
      offer('P2', 'A', 'pack', 'available', 50, 100),
      offer('P2', 'A', 'strip', 'available', 7, 10),
      offer('P2', 'A', 'loose', 'available', 0.5, 1),
      offer('P1', 'B', 'pack', 'available', 120, 100),
      offer('P1', 'B', 'strip', 'available', 12, 10),
      offer('P1', 'B', 'loose', 'available', 1.2, 1),
      offer('P2', 'B', 'pack', 'available', 60, 100),
      offer('P2', 'B', 'strip', 'available', 6, 10),
      offer('P2', 'B', 'loose', 'available', 0.7, 1),
      offer('P1', 'C', 'pack', 'available', 300, 30),
      offer('P1', 'C', 'strip', 'pack_only', null, null),
      offer('P1', 'C', 'loose', 'pack_only', null, null),
      offer('P2', 'C', 'pack', 'available', 50, 100),
      offer('P2', 'C', 'strip', 'available', 6, 10),
      offer('P2', 'C', 'loose', 'available', 0.5, 1),
      offer('P1', 'D', 'pack', 'not_stocked', null, null),
      offer('P1', 'D', 'strip', 'not_stocked', null, null),
      offer('P1', 'D', 'loose', 'not_stocked', null, null),
      offer('P2', 'D', 'pack', 'available', 50, 100),
      offer('P2', 'D', 'strip', 'available', 6, 10),
      offer('P2', 'D', 'loose', 'available', 0.5, 1),
    ],
    alternatives,
    reports,
  })

  const result = buildRankedResults(input)

  it('ranks a compliant complete basket before a cheaper above-ceiling basket', () => {
    expect(result.complete.map((entry) => entry.result_key)).toEqual([
      'B|P1,P2',
      'A|P1,P2',
    ])
    const above = result.complete.find(
      (entry) => entry.result_key === 'A|P1,P2',
    )
    const compliant = result.complete.find(
      (entry) => entry.result_key === 'B|P1,P2',
    )
    expect(above?.total_shelf_price_php).toBe(10)
    expect(above?.above_mdrp_ceiling).toBe(true)
    expect(compliant?.total_shelf_price_php).toBe(12)
    expect(compliant?.above_mdrp_ceiling).toBe(false)
    expect(above?.items[0]?.components[0]?.mdrp?.above).toBe(true)
    expect(above?.reported).toBe(true)
    expect(above?.reported_at).toBe('2026-10-21T09:00:00Z')
  })

  it('marks only a compliant complete result as cheapest', () => {
    expect(cheapestCompleteResultKey(result.complete)).toBe('B|P1,P2')
  })

  it('returns no cheapest key when every complete result is above the ceiling', () => {
    const allAbove = buildRankedResults({
      ...input,
      forms: input.forms.map((form) =>
        form.medicine_id === 'P1' &&
        form.pharmacy_id === 'B' &&
        form.sale_form === 'loose'
          ? { ...form, mdrp }
          : form,
      ),
    })
    expect(allAbove.complete.every((entry) => entry.above_mdrp_ceiling)).toBe(
      true,
    )
    expect(cheapestCompleteResultKey(allAbove.complete)).toBeNull()
  })

  it('uses the MDRP tier for both VAT outcomes', () => {
    const vatExemptAbove: MdrpInfo = {
      ...mdrp,
      effective_ceiling_php: 10,
      vat_exempt: true,
      observed_rate_php: 11,
      above: true,
    }
    const vatVableCompliant: MdrpInfo = {
      ...mdrp,
      effective_ceiling_php: 11.2,
      vat_exempt: false,
      observed_rate_php: 11,
      above: false,
    }
    const firstMedicine = medicines[0]
    if (firstMedicine === undefined) {
      throw new Error('The test needs a first medicine')
    }
    const vatInput = rankingInput({
      basket: [{ medicine_id: 'P1', quantity: 1, unit: 'tablet' }],
      medicines: [firstMedicine],
      pharmacies: [
        pharmacy('A', 'Compliant Pharmacy', 0.02),
        pharmacy('B', 'Above Pharmacy', 0.01),
      ],
      forms: [
        offer('P1', 'A', 'loose', 'available', 11, 1, 'in_stock', {
          mdrp: vatVableCompliant,
        }),
        offer('P1', 'B', 'loose', 'available', 11, 1, 'in_stock', {
          mdrp: vatExemptAbove,
        }),
      ],
    })
    const vatResult = buildRankedResults(vatInput)
    expect(vatResult.complete.map((entry) => entry.result_key)).toEqual([
      'A|P1',
      'B|P1',
    ])
    expect(vatResult.complete[0]?.above_mdrp_ceiling).toBe(false)
    expect(vatResult.complete[1]?.above_mdrp_ceiling).toBe(true)
    expect(cheapestCompleteResultKey(vatResult.complete)).toBe('A|P1')
  })

  it('keeps the sold-per-pack-only bucket separate from exact results', () => {
    expect(result.sold_per_pack_only.map((entry) => entry.result_key)).toEqual([
      'C|P1,P2',
    ])
    expect(result.sold_per_pack_only[0]?.covering_total_php).toBe(305)
    expect(result.sold_per_pack_only[0]?.known_total_php).toBe(5)
    expect(result.sold_per_pack_only[0]?.items[0]?.outcome).toBe(
      'sold_per_pack_only',
    )
  })

  it('lists incomplete and no-price pharmacies separately', () => {
    expect(result.incomplete.map((entry) => entry.result_key)).toEqual([
      'D|P1,P2',
    ])
    expect(result.incomplete[0]?.missing_items).toEqual([
      expect.objectContaining({ medicine_id: 'P1', reason: 'not_stocked' }),
    ])
    expect(result.incomplete[0]?.known_total_php).toBe(5)
    expect(
      result.no_price_data.map((entry) => entry.pharmacy.pharmacy_id),
    ).toEqual(['E'])
  })

  it('keeps the MDRP tier when sorting by distance', () => {
    const distanceSorted = buildRankedResults({ ...input, sort: 'distance' })
    expect(distanceSorted.complete.map((entry) => entry.result_key)).toEqual([
      'B|P1,P2',
      'A|P1,P2',
    ])
    expect(
      distanceSorted.sold_per_pack_only.map((entry) => entry.result_key),
    ).toEqual(['C|P1,P2'])
    expect(cheapestCompleteResultKey(distanceSorted.complete)).toBe('B|P1,P2')
  })

  it('resolves open-now only from verified structured hours', () => {
    const byId = new Map(
      [
        ...result.complete,
        ...result.sold_per_pack_only,
        ...result.incomplete,
      ].map((entry) => [entry.pharmacy.pharmacy_id, entry.pharmacy]),
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
            reference_pack_size: 'Box of 10',
            rx_otc: 'Rx',
            fda_registration_no: 'DR-1',
            note: 'Candidate alternative.',
          },
          {
            brand_name: 'Zeta Generic',
            manufacturer: 'Zeta Labs',
            reference_pack_size: 'Box of 10',
            rx_otc: 'Rx',
            fda_registration_no: null,
            note: 'Candidate generic alternative; not a therapeutic-equivalence claim.',
          },
        ],
      },
    ])
  })

  it('exposes basket limits and centavo rounding', () => {
    expect(BASKET_MAX_ITEMS).toBe(10)
    expect(priceToCents(30.31)).toBe(3031)
  })
})
