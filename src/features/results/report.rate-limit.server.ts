import { createHash } from 'node:crypto'

/** Most reports one caller may create inside the rolling window. */
export const REPORT_RATE_LIMIT = 5

/** The rolling window for the report rate limit. */
export const REPORT_RATE_WINDOW_MS = 60 * 60 * 1000

/** Decides whether one caller may create another report. */
export type ReportRateLimiter = {
  allow(key: string, now?: number): boolean
}

/**
 * Build an in-memory rolling-window limiter.
 *
 * The POC has no accounts and stores no IP address, so the caller supplies an
 * opaque key. Entries older than the window are dropped on each decision.
 */
export function createReportRateLimiter(
  limit: number = REPORT_RATE_LIMIT,
  windowMs: number = REPORT_RATE_WINDOW_MS,
): ReportRateLimiter {
  const attempts = new Map<string, number[]>()

  return {
    allow(key: string, now: number = Date.now()): boolean {
      const cutoff = now - windowMs
      const recent = (attempts.get(key) ?? []).filter(
        (timestamp) => timestamp > cutoff,
      )
      if (recent.length >= limit) {
        attempts.set(key, recent)
        return false
      }
      recent.push(now)
      attempts.set(key, recent)
      return true
    },
  }
}

/** Hash an opaque caller key so the process never retains the raw value. */
export function hashClientKey(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
