import { describe, expect, it } from 'vitest'

import { quantityPresets, quantityWarning } from './results.quantity'
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
