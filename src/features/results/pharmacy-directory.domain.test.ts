import { describe, expect, it } from 'vitest'

import {
  cheapestOverallPharmacyId,
  type PharmacyUnitRate,
} from './pharmacy-directory.domain'

function rate(
  pharmacyId: string,
  medicineId: string,
  unitRate: number,
): PharmacyUnitRate {
  return {
    pharmacy_id: pharmacyId,
    medicine_id: medicineId,
    unit_rate_php: unitRate,
  }
}

const ALL = new Set(['a', 'b', 'c'])

describe('cheapestOverallPharmacyId', () => {
  it('picks the pharmacy with the lowest median price ratio', () => {
    const rates = [
      rate('a', 'm1', 10),
      rate('b', 'm1', 8),
      rate('c', 'm1', 12),
      rate('a', 'm2', 20),
      rate('b', 'm2', 18),
      rate('c', 'm2', 25),
    ]

    expect(cheapestOverallPharmacyId(rates, ALL)).toBe('b')
  })

  it('compares medicines by ratio, so expensive items do not dominate', () => {
    const rates = [
      rate('a', 'cheap', 1),
      rate('b', 'cheap', 2),
      rate('a', 'pricey', 1010),
      rate('b', 'pricey', 1000),
      rate('a', 'other', 5),
      rate('b', 'other', 6),
    ]

    expect(cheapestOverallPharmacyId(rates, new Set(['a', 'b']))).toBe('a')
  })

  it('ignores pharmacies that price too few medicines', () => {
    const rates = [
      rate('a', 'm1', 10),
      rate('b', 'm1', 11),
      rate('a', 'm2', 10),
      rate('b', 'm2', 11),
      rate('a', 'm3', 10),
      rate('b', 'm3', 11),
      rate('c', 'm1', 1),
    ]

    expect(cheapestOverallPharmacyId(rates, ALL)).toBe('a')
  })

  it('skips ineligible pharmacies', () => {
    const rates = [rate('a', 'm1', 10), rate('b', 'm1', 5), rate('c', 'm1', 9)]

    expect(cheapestOverallPharmacyId(rates, new Set(['a', 'c']))).toBe('c')
  })

  it('breaks ties by pharmacy id', () => {
    const rates = [rate('b', 'm1', 10), rate('a', 'm1', 10)]

    expect(cheapestOverallPharmacyId(rates, ALL)).toBe('a')
  })

  it('returns null when no medicine is priced at two pharmacies', () => {
    expect(cheapestOverallPharmacyId([rate('a', 'm1', 10)], ALL)).toBeNull()
    expect(cheapestOverallPharmacyId([], ALL)).toBeNull()
  })
})
