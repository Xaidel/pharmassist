import { SCAN_MATCH_LIMIT, SCAN_OTHER_MATCHES_MAX } from './scan.domain'
import type { MedicineMatcher } from './scan.port'
import type { ScanRepository } from './scan.repository.server'

function roundScore(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000
}

/**
 * Resolve recognized text against the seeded catalog.
 *
 * The mock recognizes a stable medicine id per line, so an exact-id lookup is
 * tried first. The pilot OCR produces free-text medicine names, which fall
 * through to a trigram name search; the best match is the suggestion and the
 * next few are offered as alternatives.
 */
export function createCatalogMatcher(
  repository: ScanRepository,
): MedicineMatcher {
  return {
    async match(text) {
      const trimmed = text.trim()
      if (trimmed === '') {
        return { suggested: null, other: [] }
      }

      const byId = await repository.readMedicines([trimmed])
      const exact = byId[0]
      if (exact !== undefined) {
        return { suggested: exact, other: [] }
      }

      const matches = await repository.searchNames(trimmed, SCAN_MATCH_LIMIT)
      const suggested = matches[0]?.medicine ?? null
      const other = matches
        .slice(1, 1 + SCAN_OTHER_MATCHES_MAX)
        .map((match) => ({
          medicine: match.medicine,
          confidence: roundScore(match.score),
        }))

      return { suggested, other }
    },
  }
}
