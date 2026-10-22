import { z } from 'zod'

const pharmacyPinsResponseSchema = z.object({
  pharmacies: z.array(
    z.object({
      pharmacy_id: z.string(),
      name: z.string(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      verification_status: z.enum(['verified', 'unverified']),
    }),
  ),
  cheapest_pharmacy_id: z.string().nullable(),
})

/** The pharmacy directory the home map pins. */
export type PharmacyPins = z.infer<typeof pharmacyPinsResponseSchema>

/** Read the public pharmacy directory and validate its response. */
export async function fetchPharmacyPins(
  signal?: AbortSignal,
): Promise<PharmacyPins> {
  const init: RequestInit = { headers: { accept: 'application/json' } }
  if (signal !== undefined) {
    init.signal = signal
  }

  const response = await fetch('/api/pharmacies', init)
  if (!response.ok) {
    throw new Error('The pharmacy directory is not available right now.')
  }
  return pharmacyPinsResponseSchema.parse(await response.json())
}
