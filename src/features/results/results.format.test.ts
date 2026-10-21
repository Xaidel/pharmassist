import { describe, expect, it } from 'vitest'

import { formatDuration } from './results.format'

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
