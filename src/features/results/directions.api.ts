import { z } from 'zod'

import type { Origin } from './results.domain'
import {
  directionsResponseSchema,
  type DirectionsResponse,
} from './directions.schema'

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

/** Raised when the directions endpoint rejects a request. */
export class DirectionsRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'DirectionsRequestError'
  }
}

/** Read a native road route from the device origin to one pharmacy. */
export async function fetchDirections(
  input: { pharmacyId: string; origin: Origin },
  signal?: AbortSignal,
): Promise<DirectionsResponse> {
  const params = new URLSearchParams({
    pharmacy_id: input.pharmacyId,
    origin_latitude: String(input.origin.latitude),
    origin_longitude: String(input.origin.longitude),
  })
  const init: RequestInit = {
    headers: { accept: 'application/json' },
  }
  if (signal !== undefined) {
    init.signal = signal
  }

  const response = await fetch(`/api/directions?${params.toString()}`, init)
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined)
    const parsed = errorEnvelopeSchema.safeParse(payload)
    throw new DirectionsRequestError(
      response.status,
      parsed.success ? parsed.data.error.code : 'REQUEST_FAILED',
      parsed.success
        ? parsed.data.error.message
        : 'A route is unavailable right now.',
    )
  }

  return directionsResponseSchema.parse(await response.json())
}
