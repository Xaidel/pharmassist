import { describe, expect, it } from 'vitest'

import { formatDuration, formatSaleState, formatUnit } from './results.format'

describe('formatDuration', () => {
  it('rounds short routes to minutes with a one-minute floor', () => {
    expect(formatDuration(30)).toBe('1 min')
    expect(formatDuration(456)).toBe('8 min')
  })

  it('formats an hour and an hour with minutes', () => {
    expect(formatDuration(3600)).toBe('1 hr')
    expect(formatDuration(5400)).toBe('1 hr 30 min')
  })
})

describe('formatSaleState', () => {
  it('describes a non-applicable form as sold by the pack', () => {
    expect(formatSaleState('not_applicable')).toBe('Sold by the pack')
  })

  it('never describes an unknown form as unavailable', () => {
    expect(formatSaleState('unknown')).toBe('Not confirmed')
    expect(formatSaleState('pack_only')).toBe('Sold per pack only')
  })
})

describe('formatUnit', () => {
  it('pluralises countable units above one', () => {
    expect(formatUnit(1, 'tablet')).toBe('tablet')
    expect(formatUnit(30, 'tablet')).toBe('tablets')
    expect(formatUnit(200, 'actuation')).toBe('actuations')
  })

  it('keeps mL and g as symbols', () => {
    expect(formatUnit(60, 'mL')).toBe('mL')
    expect(formatUnit(5, 'g')).toBe('g')
  })
})
