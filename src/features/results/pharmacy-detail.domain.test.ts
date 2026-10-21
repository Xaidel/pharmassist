import { describe, expect, it } from 'vitest'

import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  buildDetailBasket,
  DETAIL_MAX_MEDICINES,
  parsePharmacyDetailQuery,
} from './pharmacy-detail.domain'
import type { PriceFacts } from './results.domain'

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
    pack_size: 'Box of 10 tablets',
    manufacturer: 'Test Labs',
    rx_otc: 'Rx',
    pnf_listed: true,
    konsulta_listed: true,
    ...overrides,
  }
}

function price(
  medicineId: string,
  shelfPrice: number,
  overrides: Partial<PriceFacts> = {},
): PriceFacts {
  return {
    medicine_id: medicineId,
    pharmacy_id: 'pharmacy-a',
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

  it('sums an available complete basket from shelf prices', () => {
    const basket = buildDetailBasket({
      medicineIds: ['POC-001', 'POC-036'],
      medicines,
      prices: [price('POC-001', 120), price('POC-036', 125)],
    })

    expect(basket.complete).toBe(true)
    expect(basket.total_shelf_price_php).toBe(245)
    expect(basket.known_total_php).toBe(245)
    expect(basket.missing_items).toEqual([])
    expect(basket.items.map((item) => item.packs)).toEqual([1, 1])
    expect(basket.items[0]?.price).toEqual({
      shelf_price_php: 120,
      stock_status: 'in_stock',
      stale: false,
    })
  })

  it('explains no-price, out-of-stock, and unknown-stock items', () => {
    const basket = buildDetailBasket({
      medicineIds: ['POC-001', 'POC-036', 'POC-016'],
      medicines,
      prices: [
        price('POC-036', 125, { stock_status: 'out_of_stock' }),
        price('POC-016', 980, { stock_status: 'unknown' }),
      ],
    })

    expect(basket.complete).toBe(false)
    expect(basket.total_shelf_price_php).toBeNull()
    expect(basket.known_total_php).toBe(0)
    expect(basket.missing_items.map((item) => item.reason)).toEqual([
      'no_price',
      'out_of_stock',
      'stock_unknown',
    ])
    expect(basket.items[0]?.price).toBeNull()
    expect(basket.items[1]?.price?.stock_status).toBe('out_of_stock')
  })

  it('keeps the available subtotal when one item is missing', () => {
    const basket = buildDetailBasket({
      medicineIds: ['POC-001', 'POC-036'],
      medicines,
      prices: [price('POC-001', 120)],
    })

    expect(basket.complete).toBe(false)
    expect(basket.known_total_php).toBe(120)
    expect(basket.missing_items).toEqual([
      expect.objectContaining({ medicine_id: 'POC-036', reason: 'no_price' }),
    ])
  })
})
