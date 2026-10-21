import { readServerConfig } from '#/lib/config.server'
import { queryRows } from '#/lib/db.server'

import {
  DirectionsUnavailableError,
  isRoutingTimeout,
  ROUTING_TIMEOUT_MS,
  type DirectionsQuery,
} from './directions.domain'
import { createOsrmDirectionsProvider } from './directions.osrm.server'
import {
  directionsResponseSchema,
  type DirectionsResponse,
} from './directions.schema'
import { createResultsRepository } from './results.repository.server'

const repository = createResultsRepository(queryRows)
const provider = createOsrmDirectionsProvider(readServerConfig().routingBaseUrl)

/** A directions failure the route renders as the shared API envelope. */
export type DirectionsFailure = {
  status: 404 | 503 | 504
  code:
    | 'UNKNOWN_PHARMACY'
    | 'DATABASE_UNAVAILABLE'
    | 'ROUTING_UNAVAILABLE'
    | 'ROUTING_TIMEOUT'
  message: string
}

/** The outcome of calculating one route. */
export type DirectionsOutcome =
  | { ok: true; response: DirectionsResponse }
  | { ok: false; error: DirectionsFailure }

/** Calculate a road route from the device origin to one pharmacy. */
export async function handleDirections(
  query: DirectionsQuery,
): Promise<DirectionsOutcome> {
  let pharmacy
  try {
    pharmacy = await repository.readPharmacy(query.pharmacyId)
  } catch {
    return {
      ok: false,
      error: {
        status: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Directions are temporarily unavailable.',
      },
    }
  }

  if (pharmacy === null) {
    return {
      ok: false,
      error: {
        status: 404,
        code: 'UNKNOWN_PHARMACY',
        message: 'That pharmacy is not in the seeded directory.',
      },
    }
  }

  try {
    const route = await provider.route(
      {
        origin: query.origin,
        destination: {
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
        },
      },
      AbortSignal.timeout(ROUTING_TIMEOUT_MS),
    )

    return {
      ok: true,
      response: directionsResponseSchema.parse({
        pharmacy_id: pharmacy.pharmacy_id,
        origin: query.origin,
        route: route.geometry,
        distance_m: route.distanceM,
        duration_s: route.durationS,
        provider: route.provider,
        generated_at: new Date().toISOString(),
      }),
    }
  } catch (error) {
    if (isRoutingTimeout(error)) {
      return {
        ok: false,
        error: {
          status: 504,
          code: 'ROUTING_TIMEOUT',
          message: 'The route took too long to calculate. Try again.',
        },
      }
    }
    if (error instanceof DirectionsUnavailableError) {
      return {
        ok: false,
        error: {
          status: 503,
          code: 'ROUTING_UNAVAILABLE',
          message: 'A route is unavailable right now. Try again.',
        },
      }
    }
    return {
      ok: false,
      error: {
        status: 503,
        code: 'ROUTING_UNAVAILABLE',
        message: 'A route is unavailable right now. Try again.',
      },
    }
  }
}
