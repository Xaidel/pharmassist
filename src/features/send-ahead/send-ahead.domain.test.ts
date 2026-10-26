import { describe, expect, it } from 'vitest'

import {
  composeReservationMessage,
  computeExpiresAtMs,
  generateReferenceCode,
  isCountableUnit,
  isValidQuantity,
  SEND_AHEAD_REFERENCE_PREFIX,
  SEND_AHEAD_TTL_MS,
} from './send-ahead.domain'

describe('generateReferenceCode', () => {
  it('builds a prefixed, fixed-length code from the included alphabet', () => {
    const values = [0, 1, 2, 3, 4, 5]
    const code = generateReferenceCode((maxExclusive) => {
      expect(maxExclusive).toBe(31)
      const value = values.shift()
      if (value === undefined) {
        throw new Error('The random source ran out of values')
      }
      return value
    })

    expect(code).toBe(`${SEND_AHEAD_REFERENCE_PREFIX}ABCDEF`)
    expect(code.startsWith(SEND_AHEAD_REFERENCE_PREFIX)).toBe(true)
    expect(code).toHaveLength(9)
    expect(code.slice(3)).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/)
  })
})

describe('computeExpiresAtMs', () => {
  it('expires exactly 24 hours after creation', () => {
    const nowMs = Date.parse('2026-10-27T08:30:00.000Z')
    expect(computeExpiresAtMs(nowMs)).toBe(nowMs + SEND_AHEAD_TTL_MS)
    expect(new Date(computeExpiresAtMs(nowMs)).toISOString()).toBe(
      '2026-10-28T08:30:00.000Z',
    )
  })
})

describe('isValidQuantity', () => {
  it('accepts positive whole counted units and measured quantities to three decimals', () => {
    expect(isCountableUnit('tablet')).toBe(true)
    expect(isCountableUnit('mL')).toBe(false)
    expect(isValidQuantity(1, 'tablet')).toBe(true)
    expect(isValidQuantity(10, 'capsule')).toBe(true)
    expect(isValidQuantity(2.5, 'mL')).toBe(true)
    expect(isValidQuantity(0.125, 'g')).toBe(true)
  })

  it('rejects zero, negatives, fractions of counted units, and values above the ceiling', () => {
    expect(isValidQuantity(0, 'tablet')).toBe(false)
    expect(isValidQuantity(-1, 'tablet')).toBe(false)
    expect(isValidQuantity(1.5, 'tablet')).toBe(false)
    expect(isValidQuantity(0.0001, 'mL')).toBe(false)
    expect(isValidQuantity(100_001, 'tablet')).toBe(false)
  })
})

describe('composeReservationMessage', () => {
  it('composes the plain-text reservation message', () => {
    const message = composeReservationMessage({
      referenceCode: 'SA-ABC123',
      pharmacyName: 'Mercury Drug',
      itemLines: ['Janumet 500 mg Tablet — 5 tablets'],
      expiresAtLabel: 'Oct 28, 2026, 4:30 PM',
    })

    expect(message).toContain('Send-ahead request SA-ABC123')
    expect(message).toContain('Mercury Drug')
    expect(message).toContain('- Janumet 500 mg Tablet — 5 tablets')
    expect(message).toContain('Reserve until Oct 28, 2026, 4:30 PM')
    expect(message).toContain('not hold or guarantee stock')
  })
})
