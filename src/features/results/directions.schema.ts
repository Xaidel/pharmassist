import { z } from 'zod'

import { MAX_ROUTE_POINTS } from './directions.domain'
import { originSchema } from './results.schema'

/** A GeoJSON line string in travel order, as `[longitude, latitude]` pairs. */
export const routeGeometrySchema = z.strictObject({
  type: z.literal('LineString'),
  coordinates: z
    .array(
      z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    )
    .min(2)
    .max(MAX_ROUTE_POINTS),
})

/** The route geometry a directions response carries. */
export type RouteGeometry = z.infer<typeof routeGeometrySchema>

/** The response contract for `GET /api/directions`. */
export const directionsResponseSchema = z.strictObject({
  pharmacy_id: z.string().min(1),
  origin: originSchema,
  route: routeGeometrySchema,
  distance_m: z.number().int().min(0),
  duration_s: z.number().int().min(0),
  provider: z.string().min(1),
  generated_at: z.string(),
})

/** The response contract for `GET /api/directions`. */
export type DirectionsResponse = z.infer<typeof directionsResponseSchema>
