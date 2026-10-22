import { z } from 'zod'

import { pharmacyRowSchema } from './results.schema'

/** One pharmacy pin in the home-map directory. */
export const directoryPharmacySchema = pharmacyRowSchema.pick({
  pharmacy_id: true,
  name: true,
  latitude: true,
  longitude: true,
  verification_status: true,
})

/** The body returned by `GET /api/pharmacies`. */
export const pharmacyDirectoryResponseSchema = z.strictObject({
  pharmacies: z.array(directoryPharmacySchema),
  cheapest_pharmacy_id: z.string().nullable(),
})

/** The body returned by `GET /api/pharmacies`. */
export type PharmacyDirectoryResponse = z.infer<
  typeof pharmacyDirectoryResponseSchema
>
