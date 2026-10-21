import { describe, expect, it } from 'vitest'

import {
  CurrencyCodeSchema,
  MoneySchema,
  formatMoney,
  multiplyMoney,
  sumMoney,
  zeroMoney,
} from './money'

const usd = (amountMinor: number) => ({ amountMinor, currency: 'USD' as const })
const eur = (amountMinor: number) => ({ amountMinor, currency: 'EUR' as const })

describe('CurrencyCodeSchema', () => {
  it('accepts every supported two-decimal currency', () => {
    for (const code of CurrencyCodeSchema.options) {
      expect(CurrencyCodeSchema.parse(code)).toBe(code)
    }
  })

  it('rejects an unsupported and a zero-decimal currency', () => {
    expect(() => CurrencyCodeSchema.parse('AUD')).not.toThrow()
    expect(() => CurrencyCodeSchema.parse('XYZ')).toThrow()
    expect(() => CurrencyCodeSchema.parse('JPY')).toThrow()
    expect(() => CurrencyCodeSchema.parse('usd')).toThrow()
  })
})

describe('MoneySchema', () => {
  it('accepts whole non-negative amounts of a supported currency', () => {
    expect(MoneySchema.parse({ amountMinor: 1_200, currency: 'USD' })).toEqual({
      amountMinor: 1_200,
      currency: 'USD',
    })
    expect(MoneySchema.parse({ amountMinor: 1_200, currency: 'EUR' })).toEqual({
      amountMinor: 1_200,
      currency: 'EUR',
    })
  })

  it('rejects negative, fractional, and unsupported amounts', () => {
    expect(() =>
      MoneySchema.parse({ amountMinor: -1, currency: 'USD' }),
    ).toThrow()
    expect(() =>
      MoneySchema.parse({ amountMinor: 10.5, currency: 'USD' }),
    ).toThrow()
    expect(() =>
      MoneySchema.parse({ amountMinor: 100, currency: 'XYZ' }),
    ).toThrow()
  })
})

describe('zeroMoney', () => {
  it('builds the zero amount in the currency it is given', () => {
    expect(zeroMoney('USD')).toEqual({ amountMinor: 0, currency: 'USD' })
    expect(zeroMoney('EUR')).toEqual({ amountMinor: 0, currency: 'EUR' })
  })
})

describe('money arithmetic', () => {
  it('sums amounts of one currency', () => {
    expect(sumMoney([usd(1_200), usd(650)])).toEqual(usd(1_850))
  })

  it('sums to the single amount when given one', () => {
    expect(sumMoney([usd(1_200)])).toEqual(usd(1_200))
  })

  it('sums a zero amount in the currency given, not a default', () => {
    expect(sumMoney([zeroMoney('EUR'), eur(0), eur(450)])).toEqual(eur(450))
  })

  it('refuses to add different currencies', () => {
    expect(() => sumMoney([usd(1_200), eur(650)])).toThrow(/mixed currencies/)
  })

  it('refuses to sum an empty list rather than invent a currency', () => {
    expect(() => sumMoney([])).toThrow(/empty list/)
  })

  it('multiplies by a whole quantity', () => {
    expect(multiplyMoney(usd(1_200), 3)).toEqual(usd(3_600))
  })

  it('multiplies without changing currency', () => {
    expect(multiplyMoney(eur(650), 2)).toEqual(eur(1_300))
  })
})

describe('formatMoney', () => {
  it('formats minor units for display in their own currency', () => {
    expect(formatMoney(usd(1_200))).toBe('$12.00')
    expect(formatMoney(usd(0))).toBe('$0.00')
    expect(formatMoney(eur(1_200))).toBe('€12.00')
  })
})
