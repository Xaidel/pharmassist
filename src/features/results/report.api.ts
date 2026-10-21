import { z } from 'zod'

import {
  reportResponseSchema,
  reportSummaryResponseSchema,
  type ReportReason,
  type ReportResponse,
  type ReportSummaryResponse,
} from './report.schema'

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

/** Raised when the reports endpoint rejects a request. */
export class ReportRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ReportRequestError'
  }
}

async function readError(response: Response): Promise<ReportRequestError> {
  const payload: unknown = await response.json().catch(() => undefined)
  const parsed = errorEnvelopeSchema.safeParse(payload)
  return new ReportRequestError(
    response.status,
    parsed.success ? parsed.data.error.code : 'REQUEST_FAILED',
    parsed.success
      ? parsed.data.error.message
      : 'Reports are not available right now.',
  )
}

/** Store one wrong-price or wrong-stock report. */
export async function postReport(
  input: {
    pharmacyId: string
    medicineIds: readonly string[]
    reason: ReportReason
    note: string | null
  },
  signal?: AbortSignal,
): Promise<ReportResponse> {
  const init: RequestInit = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      pharmacy_id: input.pharmacyId,
      medicine_ids: [...input.medicineIds],
      reason: input.reason,
      note: input.note,
    }),
  }
  if (signal !== undefined) {
    init.signal = signal
  }

  const response = await fetch('/api/reports', init)
  if (!response.ok) {
    throw await readError(response)
  }

  return reportResponseSchema.parse(await response.json())
}

/** Read the public reported state for one result key. */
export async function fetchReportSummary(
  resultKey: string,
  signal?: AbortSignal,
): Promise<ReportSummaryResponse> {
  const params = new URLSearchParams({ result_key: resultKey })
  const init: RequestInit = {
    headers: { accept: 'application/json' },
  }
  if (signal !== undefined) {
    init.signal = signal
  }

  const response = await fetch(`/api/reports?${params.toString()}`, init)
  if (!response.ok) {
    throw await readError(response)
  }

  return reportSummaryResponseSchema.parse(await response.json())
}
