import { describe, expect, it } from 'vitest'

import {
  createReportRateLimiter,
  hashClientKey,
  REPORT_RATE_LIMIT,
  REPORT_RATE_WINDOW_MS,
} from './report.rate-limit.server'

describe('createReportRateLimiter', () => {
  it('allows five reports and rejects the sixth inside the window', () => {
    const limiter = createReportRateLimiter()
    const now = 1_000_000

    for (let attempt = 0; attempt < REPORT_RATE_LIMIT; attempt += 1) {
      expect(limiter.allow('caller-a', now + attempt)).toBe(true)
    }
    expect(limiter.allow('caller-a', now + REPORT_RATE_LIMIT)).toBe(false)
  })

  it('tracks callers separately and slides the window', () => {
    const limiter = createReportRateLimiter(2, 1_000)

    expect(limiter.allow('caller-a', 0)).toBe(true)
    expect(limiter.allow('caller-a', 1)).toBe(true)
    expect(limiter.allow('caller-a', 2)).toBe(false)
    expect(limiter.allow('caller-b', 2)).toBe(true)
    expect(limiter.allow('caller-a', 1_001)).toBe(true)
  })

  it('hashes a caller key without retaining the raw value', () => {
    const hash = hashClientKey('203.0.113.9')
    expect(hash).toHaveLength(64)
    expect(hash).not.toContain('203.0.113.9')
    expect(hashClientKey('203.0.113.9')).toBe(hash)
  })

  it('exposes the contract defaults', () => {
    expect(REPORT_RATE_LIMIT).toBe(5)
    expect(REPORT_RATE_WINDOW_MS).toBe(3_600_000)
  })
})
