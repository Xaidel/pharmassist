import { z } from 'zod'

/** Longest search query the API accepts. */
export const SEARCH_QUERY_MAX_LENGTH = 80

/** Smallest autocomplete limit the API accepts. */
export const SEARCH_LIMIT_MIN = 1

/** Largest autocomplete limit the API accepts. */
export const SEARCH_LIMIT_MAX = 10

/** Default number of search results when the client omits a limit. */
export const SEARCH_LIMIT_DEFAULT = 8

/** Shortest query that may use trigram matching instead of prefixes. */
export const SEARCH_TRIGRAM_MIN_QUERY_LENGTH = 4

/** Minimum trigram similarity the search query uses. */
export const SEARCH_TRIGRAM_THRESHOLD = 0.3

/** Queries at or below this length need a stronger trigram match. */
export const SEARCH_TRIGRAM_SHORT_QUERY_LENGTH = 5

/** Extra similarity required for a short query. */
export const SEARCH_TRIGRAM_SHORT_QUERY_BOOST = 0.15

/** A normalized search request. */
export const searchInputSchema = z.strictObject({
  q: z.string().max(SEARCH_QUERY_MAX_LENGTH),
  limit: z
    .number()
    .int()
    .min(SEARCH_LIMIT_MIN)
    .max(SEARCH_LIMIT_MAX)
    .default(SEARCH_LIMIT_DEFAULT),
})

/** A normalized search request. */
export type SearchInput = z.infer<typeof searchInputSchema>

/** Which medicine field the query matched. */
export type SearchMatchField = 'brand' | 'generic' | 'both'

/** How closely the query matched the field. */
export type SearchMatchType = 'exact' | 'prefix' | 'trigram'

/** The match explanation the client displays. */
export type SearchMatch = {
  field: SearchMatchField
  type: SearchMatchType
  score: number
}

/** Raw per-field similarity signals read from Postgres. */
export type SearchMatchSignals = {
  brandMatched: boolean
  genericMatched: boolean
  brandExact: boolean
  genericExact: boolean
  brandPrefix: boolean
  genericPrefix: boolean
  brandScore: number
  genericScore: number
}

/** Normalize whitespace without changing the user's words. */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** Classify a match once, from the signals the database produced. */
export function classifySearchMatch(signals: SearchMatchSignals): SearchMatch {
  const { brandMatched, genericMatched } = signals

  const field: SearchMatchField =
    brandMatched && genericMatched ? 'both' : brandMatched ? 'brand' : 'generic'
  const exact =
    (brandMatched && signals.brandExact) ||
    (genericMatched && signals.genericExact)
  const prefix =
    (brandMatched && signals.brandPrefix) ||
    (genericMatched && signals.genericPrefix)
  const type: SearchMatchType = exact ? 'exact' : prefix ? 'prefix' : 'trigram'
  const score = Math.max(
    exact ? 1 : 0,
    brandMatched ? signals.brandScore : 0,
    genericMatched ? signals.genericScore : 0,
  )

  return {
    field,
    type,
    score: Math.round(Math.min(1, score) * 10_000) / 10_000,
  }
}
