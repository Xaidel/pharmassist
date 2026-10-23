import { describe, expect, it } from 'vitest'

import {
  defaultQuantity,
  fitToPacks,
  quantityPresets,
  quantityWarning,
} from './results.quantity'
import type { SaleFormOffer } from './results.schema'

function form(
  saleForm: SaleFormOffer['sale_form'],
  overrides: Partial<SaleFormOffer> = {},
): SaleFormOffer {
  return {
    sale_form: saleForm,
    sale_state: 'available',
    form_label: null,
    pack_quantity: null,
    pack_unit: null,
    shelf_price_php: null,
    stock_status: null,
    verified_at: null,
    stale: null,
    mdrp: null,
    ...overrides,
  }
}

describe('quantityPresets', () => {
  it('offers observed pack labels once per bottle, inhaler, or tube size', () => {
    expect(
      quantityPresets('mL', [
        form('pack', {
          form_label: 'Bottle of 60 mL',
          pack_quantity: 60,
          pack_unit: 'mL',
        }),
        form('pack', {
          form_label: 'Bottle of 60 mL',
          pack_quantity: 60,
          pack_unit: 'mL',
        }),
        form('strip'),
      ]),
    ).toEqual([{ quantity: 60, label: 'Bottle of 60 mL' }])
  })

  it('offers an observed tube and inhaler label', () => {
    expect(
      quantityPresets('g', [
        form('pack', {
          form_label: 'Tube of 15 g',
          pack_quantity: 15,
          pack_unit: 'g',
        }),
      ]),
    ).toEqual([{ quantity: 15, label: 'Tube of 15 g' }])
    expect(
      quantityPresets('actuation', [
        form('pack', {
          form_label: '1 Diskus (60 doses)',
          pack_quantity: 60,
          pack_unit: 'actuation',
        }),
      ]),
    ).toEqual([{ quantity: 60, label: '1 Diskus (60 doses)' }])
  })

  it('falls back to the usual pack when no observation is available', () => {
    expect(quantityPresets('g', [])).toEqual([
      { quantity: 5, label: '1 tube (5 g)' },
    ])
    expect(quantityPresets('actuation', [])).toEqual([
      { quantity: 200, label: '1 inhaler (200 actuations)' },
    ])
  })

  it('does not offer pack presets for countable medicines', () => {
    expect(
      quantityPresets('tablet', [
        form('pack', {
          form_label: 'Box of 100 tablets',
          pack_quantity: 100,
          pack_unit: 'tablet',
        }),
      ]),
    ).toEqual([])
  })
})

describe('quantityWarning', () => {
  it('warns only above the countable 30-day estimate', () => {
    expect(quantityWarning(90, 'tablet')).toBeNull()
    expect(quantityWarning(91, 'tablet')).toContain('30-day supply')
  })

  it('uses a measured 30-day estimate for liquids, creams, and inhalers', () => {
    expect(quantityWarning(450, 'mL')).toBeNull()
    expect(quantityWarning(450.5, 'mL')).toContain('30-day supply')
    expect(quantityWarning(30, 'g')).toBeNull()
    expect(quantityWarning(30.5, 'g')).toContain('30-day supply')
    expect(quantityWarning(200, 'actuation')).toBeNull()
    expect(quantityWarning(201, 'actuation')).toContain('30-day supply')
  })
})

describe('defaultQuantity', () => {
  it('starts bottles, tubes, and inhalers at one usual pack', () => {
    expect(defaultQuantity('mL')).toBe(60)
    expect(defaultQuantity('g')).toBe(5)
    expect(defaultQuantity('actuation')).toBe(200)
  })

  it('starts single-unit medicines at one', () => {
    expect(defaultQuantity('tablet')).toBe(1)
    expect(defaultQuantity('capsule')).toBe(1)
    expect(defaultQuantity('sachet')).toBe(1)
  })
})

describe('fitToPacks', () => {
  const bottle = [{ quantity: 60, label: 'Bottle of 60 mL' }]
  const inhaler = [{ quantity: 60, label: '1 inhaler (60 actuations)' }]

  it('moves a usual-pack guess to the real pack once', () => {
    const presets = new Map([['SERETIDE', inhaler]])
    const lines = [
      { medicine_id: 'SERETIDE', quantity: 200, unit: 'actuation' as const },
    ]

    expect(fitToPacks(lines, presets, new Set()).lines[0]?.quantity).toBe(60)
    // Once checked, 200 is a real choice: four inhalers' worth, rounded up.
    expect(fitToPacks(lines, presets, new Set(['SERETIDE']))).toEqual({
      lines: [{ medicine_id: 'SERETIDE', quantity: 240, unit: 'actuation' }],
      roundedIds: ['SERETIDE'],
    })
  })

  it('rounds an odd amount up to whole packs', () => {
    const presets = new Map([['CALPOL', bottle]])
    const lines = [{ medicine_id: 'CALPOL', quantity: 21, unit: 'mL' as const }]

    expect(fitToPacks(lines, presets, new Set())).toEqual({
      lines: [{ medicine_id: 'CALPOL', quantity: 60, unit: 'mL' }],
      roundedIds: ['CALPOL'],
    })
  })

  it('keeps whole packs and single-unit medicines as they are', () => {
    const presets = new Map([['CALPOL', bottle]])
    const lines = [
      { medicine_id: 'CALPOL', quantity: 120, unit: 'mL' as const },
      { medicine_id: 'NORVASC', quantity: 7, unit: 'tablet' as const },
    ]

    expect(fitToPacks(lines, presets, new Set())).toEqual({
      lines,
      roundedIds: [],
    })
  })
})
