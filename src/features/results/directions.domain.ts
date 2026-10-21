import type { Origin } from './results.domain'

/** The provider timeout the directions endpoint enforces. */
export const ROUTING_TIMEOUT_MS = 8_000

/** Most route points the API accepts from a routing provider. */
export const MAX_ROUTE_POINTS = 5_000

/** The pharmacy ID character rule, matching the seeded identifiers. */
const PHARMACY_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/

/** The validated direction query values. */
export type DirectionsQuery = {
  pharmacyId: string
  origin: Origin
}

/** The outcome of parsing a directions query string. */
export type DirectionsQueryOutcome =
  | { ok: true; value: DirectionsQuery }
  | {
      ok: false
      code: 'INVALID_REQUEST' | 'INVALID_ORIGIN'
      message: string
    }

/** Raised when the routing provider cannot return a usable route. */
export class DirectionsUnavailableError extends Error {
  constructor(message = 'The routing provider is unavailable.') {
    super(message)
    this.name = 'DirectionsUnavailableError'
  }
}

/** True when an aborted request was caused by the routing timeout. */
export function isRoutingTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  )
}

/**
 * Parse the directions query string.
 *
 * A route needs a real device origin: unlike result distances, there is no
 * Naga-center fallback because a route from a placeholder would be false.
 */
export function parseDirectionsQuery(
  params: URLSearchParams,
): DirectionsQueryOutcome {
  const pharmacyId = params.get('pharmacy_id')
  if (pharmacyId === null || !PHARMACY_ID_PATTERN.test(pharmacyId)) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'The pharmacy ID is malformed.',
    }
  }

  const rawLatitude = params.get('origin_latitude')
  const rawLongitude = params.get('origin_longitude')
  if (rawLatitude === null || rawLongitude === null) {
    return {
      ok: false,
      code: 'INVALID_ORIGIN',
      message: 'A device origin is required to calculate a route.',
    }
  }

  const latitude = Number(rawLatitude)
  const longitude = Number(rawLongitude)
  if (
    rawLatitude.trim() === '' ||
    rawLongitude.trim() === '' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      ok: false,
      code: 'INVALID_ORIGIN',
      message: 'The origin coordinates are outside the allowed range.',
    }
  }

  return {
    ok: true,
    value: { pharmacyId, origin: { latitude, longitude } },
  }
}
