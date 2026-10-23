import { z } from 'zod'

import { SCAN_CONSENT_VERSION } from './scan.domain'
import { scanResponseSchema, type ScanResponse } from './scan.schema'

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

/** Raised when the scan endpoint rejects a request. */
export class ScanRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ScanRequestError'
  }
}

/** True when a rejected fetch was cancelled by its caller. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/** Call the scan endpoint with an image and validate its response. */
export async function postScan(
  image: Blob,
  signal?: AbortSignal,
): Promise<ScanResponse> {
  const form = new FormData()
  form.append('image', image, 'prescription')
  form.append('consent', 'true')
  form.append('consent_version', SCAN_CONSENT_VERSION)

  const init: RequestInit = {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: form,
  }
  if (signal !== undefined) {
    init.signal = signal
  }

  const response = await fetch('/api/scan', init)

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined)
    const parsed = errorEnvelopeSchema.safeParse(payload)
    throw new ScanRequestError(
      parsed.success ? parsed.data.error.code : 'SCAN_FAILED',
      parsed.success
        ? parsed.data.error.message
        : 'Prescription scanning is unavailable right now.',
    )
  }

  return scanResponseSchema.parse(await response.json())
}
