import type { Origin } from './results.domain'
import type { RouteGeometry } from './directions.schema'

/** The two points a route connects. */
export type RouteRequest = {
  origin: Origin
  destination: Origin
}

/** The validated road route a provider returns. */
export type RouteResult = {
  geometry: RouteGeometry
  distanceM: number
  durationS: number
  provider: string
}

/** The outbound routing capability the directions feature depends on. */
export type DirectionsProvider = {
  readonly name: string
  route(input: RouteRequest, signal: AbortSignal): Promise<RouteResult>
}
