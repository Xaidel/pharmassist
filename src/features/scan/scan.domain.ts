/** The consent version the client sends and the server accepts. */
export const SCAN_CONSENT_VERSION = 'poc-2026-10'

/** Largest scan image the endpoint accepts, in bytes (8 MB). */
export const SCAN_IMAGE_MAX_BYTES = 8 * 1024 * 1024

/** Largest scan image dimension the endpoint accepts, in pixels. */
export const SCAN_IMAGE_MAX_DIMENSION = 4096

/** Smallest scan image dimension the endpoint accepts, in pixels. */
export const SCAN_IMAGE_MIN_DIMENSION = 320

/** Confidence at or below which a recognized line is flagged low-confidence. */
export const SCAN_CONFIDENCE_THRESHOLD = 0.6

/** Most alternative matches a single candidate may carry. */
export const SCAN_OTHER_MATCHES_MAX = 3

/** How many medicines the matcher returns: one suggestion plus alternatives. */
export const SCAN_MATCH_LIMIT = 4

/** Minimum name similarity before a recognized line is matched to a medicine. */
export const SCAN_MATCH_MIN_SIMILARITY = 0.2

/** MIME types the scan endpoint accepts. */
export const SCAN_ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

/** Warnings the scan response may carry. */
export type ScanWarning = 'LOW_CONFIDENCE_ITEM' | 'NO_MATCH' | 'DEFAULT_SCRIPT'

/** True when a recognized line's confidence needs human confirmation. */
export function isLowConfidence(confidence: number): boolean {
  return confidence < SCAN_CONFIDENCE_THRESHOLD
}
