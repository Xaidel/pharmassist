import { describe, expect, it } from 'vitest'

import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  buildDetailBasket,
  DETAIL_MAX_MEDICINES,
  parsePharmacyDetailQuery,
} from './pharmacy-detail.domain'
import {
  buildPharmacyBasket,
  type BasketLine,
  type SaleForm,
  type SaleState,
  type StockStatus,
  type StoredFormOffer,
} from './results.domain'

function medicine(
  medicineId: string,
  overrides: Partial<MedicineSummary> = {},
): MedicineSummary {
  return {
    medicine_id: medicineId,
    category: 'Test',
    brand_name: `Brand ${medicineId}`,
    generic_name: `${medicineId} generic`,
    strength: '5 mg',
    dosage_form: 'Tablet',
    base_unit: 'tablet',
    manufacturer: 'Test Labs',
    rx_otc: 'Rx',
    pnf_listed: true,
    konsulta_listed: true,
    ...overrides,
  }
}

function form(
  medicineId: string,
  saleForm: SaleForm,
  saleState: SaleState,
  price: number | null,
  packQuantity: number | null,
  stock: StockStatus | null = null,
): StoredFormOffer {
  const available = saleState === 'available'
  return {
    medicine_id: medicineId,
    pharmacy_id: 'pharmacy-a',
    sale_form: saleForm,
    sale_state: saleState,
    form_label: available
      ? `${saleForm} of ${String(packQuantity ?? 0)}`
      : null,
    shelf_price_php: available ? price : null,
    pack_quantity: available ? packQuantity : null,
    pack_unit: available ? 'tablet' : null,
    stock_status: available ? (stock ?? 'in_stock') : null,
    verified_at: available ? '2026-10-20T00:00:00Z' : null,
    stale: available ? false : null,
    mdrp: null,
  }
}

function itemsQuery(items: readonly string[]): URLSearchParams {
  const params = new URLSearchParams()
  for (const item of items) {
    params.append('items', item)
  }
  return params
}

describe('parsePharmacyDetailQuery', () => {
  it('accepts an empty query and a query with basket lines', () => {
    expect(parsePharmacyDetailQuery(new URLSearchParams())).toEqual({
      ok: true,
      value: { basket: null, origin: null },
    })

    const params = itemsQuery(['POC-001:5:tablet', ' POC-036:2:tablet '])
    params.set('origin_latitude', '13.6215')
    params.set('origin_longitude', '123.1945')
    expect(parsePharmacyDetailQuery(params)).toEqual({
      ok: true,
      value: {
        basket: [
          { medicine_id: 'POC-001', quantity: 5, unit: 'tablet' },
          { medicine_id: 'POC-036', quantity: 2, unit: 'tablet' },
        ],
        origin: { latitude: 13.6215, longitude: 123.1945 },
      },
    })
  })

  it('accepts measured quantities for mL and g', () => {
    expect(parsePharmacyDetailQuery(itemsQuery(['POC-020:2.5:mL']))).toEqual({
      ok: true,
      value: {
        basket: [{ medicine_id: 'POC-020', quantity: 2.5, unit: 'mL' }],
        origin: null,
      },
    })
  })

  it('rejects a partial or out-of-range origin', () => {
    expect(
      parsePharmacyDetailQuery(
        new URLSearchParams({ origin_latitude: '13.6215' }),
      ),
    ).toMatchObject({ ok: false, status: 400, code: 'INVALID_ORIGIN' })
    expect(
      parsePharmacyDetailQuery(
        new URLSearchParams({
          origin_latitude: '91',
          origin_longitude: '123',
        }),
      ),
    ).toMatchObject({ ok: false, status: 400, code: 'INVALID_ORIGIN' })
  })

  it('rejects malformed items, bad units, and bad quantities', () => {
    expect(parsePharmacyDetailQuery(itemsQuery(['POC-001']))).toMatchObject({
      ok: false,
      status: 400,
      code: 'INVALID_REQUEST',
    })
    expect(
      parsePharmacyDetailQuery(itemsQuery(['POC-001:1:tablet:extra'])),
    ).toMatchObject({ ok: false, status: 400, code: 'INVALID_REQUEST' })
    expect(
      parsePharmacyDetailQuery(itemsQuery(['POC-001:1:capsules'])),
    ).toMatchObject({ ok: false, status: 422, code: 'INVALID_UNIT' })
    expect(
      parsePharmacyDetailQuery(itemsQuery(['POC-001:0:tablet'])),
    ).toMatchObject({ ok: false, status: 422, code: 'INVALID_QUANTITY' })
    expect(
      parsePharmacyDetailQuery(itemsQuery(['POC-001:1.5:tablet'])),
    ).toMatchObject({ ok: false, status: 422, code: 'INVALID_QUANTITY' })
  })

  it('rejects duplicate and oversized baskets', () => {
    expect(
      parsePharmacyDetailQuery(
        itemsQuery(['POC-001:1:tablet', 'POC-001:2:tablet']),
      ),
    ).toMatchObject({ ok: false, status: 422, code: 'DUPLICATE_MEDICINE' })

    const tooMany = Array.from(
      { length: DETAIL_MAX_MEDICINES + 1 },
      (_, index) => `POC-${String(index + 1).padStart(3, '0')}:1:tablet`,
    )
    expect(parsePharmacyDetailQuery(itemsQuery(tooMany))).toMatchObject({
      ok: false,
      status: 422,
      code: 'BASKET_TOO_LARGE',
    })
  })
})

describe('buildDetailBasket', () => {
  const medicines = [
    medicine('POC-001'),
    medicine('POC-036'),
    medicine('POC-016'),
  ]

  it('fulfills the requested quantities and sums an exact basket', () => {
    const lines: BasketLine[] = [
      { medicine_id: 'POC-001', quantity: 5, unit: 'tablet' },
      { medicine_id: 'POC-036', quantity: 10, unit: 'tablet' },
    ]
    const basket = buildDetailBasket({
      lines,
      medicines,
      forms: [
        form('POC-001', 'pack', 'available', 120, 100),
        form('POC-001', 'strip', 'available', 14, 10),
        form('POC-001', 'loose', 'available', 1.5, 1),
        form('POC-036', 'pack', 'available', 125, 500),
        form('POC-036', 'strip', 'available', 3, 10),
        form('POC-036', 'loose', 'available', 0.35, 1),
      ],
    })

    expect(basket.status).toBe('complete')
    expect(basket.complete).toBe(true)
    expect(basket.total_shelf_price_php).toBe(10.5)
    expect(basket.known_total_php).toBe(10.5)
    expect(basket.missing_items).toEqual([])
    expect(basket.items).toHaveLength(2)
    expect(basket.items[0]?.quantity).toBe(5)
    expect(basket.items[0]?.unit).toBe('tablet')
    expect(basket.items[0]?.components[0]).toMatchObject({
      sale_form: 'loose',
      count: 5,
      line_total_php: 7.5,
    })
    expect(basket.items[1]?.components[0]).toMatchObject({
      sale_form: 'strip',
      count: 1,
      line_total_php: 3,
    })
  })

  it('matches the results basket for the same quantities and units', () => {
    const lines: BasketLine[] = [
      { medicine_id: 'POC-001', quantity: 5, unit: 'tablet' },
      { medicine_id: 'POC-036', quantity: 10, unit: 'tablet' },
    ]
    const forms = [
      form('POC-001', 'pack', 'available', 120, 100),
      form('POC-001', 'strip', 'available', 14, 10),
      form('POC-001', 'loose', 'available', 1.5, 1),
      form('POC-036', 'pack', 'available', 125, 500),
      form('POC-036', 'strip', 'available', 3, 10),
      form('POC-036', 'loose', 'available', 0.35, 1),
    ]
    const basketMedicines = medicines.map((entry) => ({
      medicine_id: entry.medicine_id,
      brand_name: entry.brand_name,
      generic_name: entry.generic_name,
      strength: entry.strength,
      dosage_form: entry.dosage_form,
    }))

    const detail = buildDetailBasket({ lines, medicines, forms })
    const results = buildPharmacyBasket({
      basket: lines,
      medicines: basketMedicines,
      forms,
    })

    expect(detail).toEqual(results)
  })

  it('explains no-price, out-of-stock, and unknown-stock items', () => {
    const basket = buildDetailBasket({
      lines: [
        { medicine_id: 'POC-001', quantity: 1, unit: 'tablet' },
        { medicine_id: 'POC-036', quantity: 1, unit: 'tablet' },
        { medicine_id: 'POC-016', quantity: 1, unit: 'tablet' },
      ],
      medicines,
      forms: [
        form('POC-001', 'pack', 'unknown', null, null),
        form('POC-001', 'strip', 'unknown', null, null),
        form('POC-001', 'loose', 'unknown', null, null),
        form('POC-036', 'pack', 'available', 125, 500, 'out_of_stock'),
        form('POC-036', 'strip', 'pack_only', null, null),
        form('POC-036', 'loose', 'pack_only', null, null),
        form('POC-016', 'pack', 'available', 980, 28, 'unknown'),
        form('POC-016', 'strip', 'pack_only', null, null),
        form('POC-016', 'loose', 'pack_only', null, null),
      ],
    })

    expect(basket.status).toBe('incomplete')
    expect(basket.complete).toBe(false)
    expect(basket.total_shelf_price_php).toBeNull()
    expect(basket.known_total_php).toBe(0)
    expect(basket.missing_items.map((item) => item.reason)).toEqual([
      'no_price',
      'out_of_stock',
      'stock_unknown',
    ])
  })

  it('keeps pack-only out of the missing list', () => {
    const basket = buildDetailBasket({
      lines: [{ medicine_id: 'POC-001', quantity: 1, unit: 'tablet' }],
      medicines,
      forms: [
        form('POC-001', 'pack', 'available', 300, 30),
        form('POC-001', 'strip', 'pack_only', null, null),
        form('POC-001', 'loose', 'pack_only', null, null),
      ],
    })

    expect(basket.status).toBe('sold_per_pack_only')
    expect(basket.missing_items).toEqual([])
    expect(basket.covering_total_php).toBe(300)
    expect(basket.items[0]?.pack_only).toMatchObject({
      copy: 'sold_per_pack_only',
      buy_quantity: 1,
    })
  })

  it('keeps the available subtotal when one item is missing', () => {
    const basket = buildDetailBasket({
      lines: [
        { medicine_id: 'POC-001', quantity: 1, unit: 'tablet' },
        { medicine_id: 'POC-036', quantity: 1, unit: 'tablet' },
      ],
      medicines,
      forms: [
        form('POC-001', 'pack', 'available', 120, 100),
        form('POC-001', 'strip', 'available', 14, 10),
        form('POC-001', 'loose', 'available', 1.5, 1),
      ],
    })

    expect(basket.status).toBe('incomplete')
    expect(basket.known_total_php).toBe(1.5)
    expect(basket.missing_items).toEqual([
      expect.objectContaining({ medicine_id: 'POC-036', reason: 'no_price' }),
    ])
  })
})
