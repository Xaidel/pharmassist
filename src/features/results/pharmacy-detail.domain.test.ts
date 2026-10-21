import { describe, expect, it } from 'vitest'

import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  buildDetailBasket,
  DETAIL_MAX_MEDICINES,
  parsePharmacyDetailQuery,
} from './pharmacy-detail.domain'
import type {
  SaleForm,
  SaleState,
  StockStatus,
  StoredFormOffer,
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

describe('parsePharmacyDetailQuery', () => {
  it('accepts an empty query and a full query', () => {
    expect(parsePharmacyDetailQuery(new URLSearchParams())).toEqual({
      ok: true,
      value: { medicineIds: null, origin: null },
    })

    expect(
      parsePharmacyDetailQuery(
        new URLSearchParams({
          medicine_ids: 'POC-001, POC-036',
          origin_latitude: '13.6215',
          origin_longitude: '123.1945',
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        medicineIds: ['POC-001', 'POC-036'],
        origin: { latitude: 13.6215, longitude: 123.1945 },
      },
    })
  })

  it('rejects a partial or out-of-range origin', () => {
    expect(
      parsePharmacyDetailQuery(
        new URLSearchParams({ origin_latitude: '13.6215' }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_ORIGIN' })
    expect(
      parsePharmacyDetailQuery(
        new URLSearchParams({
          origin_latitude: '91',
          origin_longitude: '123',
        }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_ORIGIN' })
  })

  it('rejects malformed, duplicate, and oversized medicine lists', () => {
    expect(
      parsePharmacyDetailQuery(new URLSearchParams({ medicine_ids: '' })),
    ).toMatchObject({ ok: false, code: 'INVALID_REQUEST' })
    expect(
      parsePharmacyDetailQuery(
        new URLSearchParams({ medicine_ids: 'POC-001,,POC-002' }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_REQUEST' })
    expect(
      parsePharmacyDetailQuery(
        new URLSearchParams({ medicine_ids: 'POC-001,POC-001' }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_REQUEST' })

    const tooMany = Array.from(
      { length: DETAIL_MAX_MEDICINES + 1 },
      (_, index) => `POC-${String(index + 1).padStart(3, '0')}`,
    ).join(',')
    expect(
      parsePharmacyDetailQuery(new URLSearchParams({ medicine_ids: tooMany })),
    ).toMatchObject({ ok: false, code: 'INVALID_REQUEST' })
  })
})

describe('buildDetailBasket', () => {
  const medicines = [
    medicine('POC-001'),
    medicine('POC-036'),
    medicine('POC-016'),
  ]

  it('builds one unit per medicine and sums an exact basket', () => {
    const basket = buildDetailBasket({
      medicineIds: ['POC-001', 'POC-036'],
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
    expect(basket.total_shelf_price_php).toBe(1.85)
    expect(basket.known_total_php).toBe(1.85)
    expect(basket.missing_items).toEqual([])
    expect(basket.items).toHaveLength(2)
    expect(basket.items[0]?.quantity).toBe(1)
    expect(basket.items[0]?.unit).toBe('tablet')
    expect(basket.items[0]?.components[0]).toMatchObject({
      sale_form: 'loose',
      count: 1,
    })
  })

  it('explains no-price, out-of-stock, and unknown-stock items', () => {
    const basket = buildDetailBasket({
      medicineIds: ['POC-001', 'POC-036', 'POC-016'],
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
      medicineIds: ['POC-001'],
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
      medicineIds: ['POC-001', 'POC-036'],
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
