import { z } from 'zod'

import { DirectionsUnavailableError } from './directions.domain'
import type { DirectionsProvider, RouteRequest } from './directions.port'
import { routeGeometrySchema } from './directions.schema'

const osrmResponseSchema = z.object({
  code: z.string(),
  routes: z
    .array(
      z.object({
        distance: z.number().min(0),
        duration: z.number().min(0),
        geometry: z.object({
          type: z.literal('LineString'),
          coordinates: z.array(z.tuple([z.number(), z.number()])),
        }),
      }),
    )
    .min(1),
})

/** Build the OSRM-compatible driving provider the POC uses. */
export function createOsrmDirectionsProvider(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): DirectionsProvider {
  const base = baseUrl.replace(/\/+$/, '')

  return {
    name: 'osrm',
    async route(input: RouteRequest, signal: AbortSignal) {
      const coordinates = [
        `${String(input.origin.longitude)},${String(input.origin.latitude)}`,
        `${String(input.destination.longitude)},${String(
          input.destination.latitude,
        )}`,
      ].join(';')
      const url = `${base}/route/v1/driving/${coordinates}?overview=simplified&geometries=geojson&steps=false&alternatives=false`

      const response = await fetchImpl(url, {
        headers: { accept: 'application/json' },
        signal,
      })
      if (!response.ok) {
        throw new DirectionsUnavailableError()
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new DirectionsUnavailableError()
      }

      const parsed = osrmResponseSchema.safeParse(payload)
      if (!parsed.success || parsed.data.code !== 'Ok') {
        throw new DirectionsUnavailableError()
      }
      const first = parsed.data.routes[0]
      if (first === undefined) {
        throw new DirectionsUnavailableError()
      }

      let geometry
      try {
        geometry = routeGeometrySchema.parse(first.geometry)
      } catch {
        throw new DirectionsUnavailableError()
      }

      return {
        geometry,
        distanceM: Math.round(first.distance),
        durationS: Math.round(first.duration),
        provider: 'osrm',
      }
    },
  }
}
