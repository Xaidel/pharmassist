import { z } from 'zod'

import type { BasketLine, Origin } from './results.domain'
import {
  pharmacyDetailResponseSchema,
  type PharmacyDetailResponse,
} from './pharmacy-detail.schema'

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

/** Raised when the pharmacy-detail endpoint rejects a request. */
export class PharmacyDetailRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'PharmacyDetailRequestError'
  }
}

/** Read one pharmacy's detail, stock list, and optional basket view. */
export async function fetchPharmacyDetail(
  input: {
    pharmacyId: string
    basket: readonly BasketLine[]
    origin: Origin | null
  },
  signal?: AbortSignal,
): Promise<PharmacyDetailResponse> {
  const params = new URLSearchParams()
  for (const line of input.basket) {
    params.append(
      'items',
      `${line.medicine_id}:${String(line.quantity)}:${line.unit}`,
    )
  }
  if (input.origin !== null) {
    params.set('origin_latitude', String(input.origin.latitude))
    params.set('origin_longitude', String(input.origin.longitude))
  }

  const init: RequestInit = {
    headers: { accept: 'application/json' },
  }
  if (signal !== undefined) {
    init.signal = signal
  }

  const suffix = params.toString()
  const response = await fetch(
    `/api/pharmacies/${encodeURIComponent(input.pharmacyId)}${
      suffix === '' ? '' : `?${suffix}`
    }`,
    init,
  )

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined)
    const parsed = errorEnvelopeSchema.safeParse(payload)
    throw new PharmacyDetailRequestError(
      response.status,
      parsed.success ? parsed.data.error.code : 'REQUEST_FAILED',
      parsed.success
        ? parsed.data.error.message
        : 'Pharmacy details are not available right now.',
    )
  }

  return pharmacyDetailResponseSchema.parse(await response.json())
}
