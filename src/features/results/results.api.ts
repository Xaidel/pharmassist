import { z } from 'zod'

import type { BasketLine, Origin, ResultSort } from './results.domain'
import {
  basketResponseSchema,
  resultsResponseSchema,
  type BasketResponse,
  type ResultsResponse,
} from './results.schema'

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

/** Raised when the basket or results endpoint rejects a request. */
export class ResultsRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ResultsRequestError'
  }
}

/** True when a rejected fetch was cancelled by its caller. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

async function postJson(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const init: RequestInit = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }
  if (signal !== undefined) {
    init.signal = signal
  }

  const response = await fetch(path, init)
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined)
    const parsed = errorEnvelopeSchema.safeParse(payload)
    throw new ResultsRequestError(
      response.status,
      parsed.success ? parsed.data.error.code : 'REQUEST_FAILED',
      parsed.success
        ? parsed.data.error.message
        : 'The price service is not available right now.',
    )
  }

  return response.json()
}

/** Resolve basket IDs into canonical medicine summaries. */
export async function postBasket(
  items: readonly BasketLine[],
  signal?: AbortSignal,
): Promise<BasketResponse> {
  return basketResponseSchema.parse(
    await postJson('/api/basket', { items }, signal),
  )
}

/** Rank pharmacies for a basket from an optional device origin. */
export async function postResults(
  input: {
    items: readonly BasketLine[]
    origin: Origin | null
    sort: ResultSort
  },
  signal?: AbortSignal,
): Promise<ResultsResponse> {
  return resultsResponseSchema.parse(
    await postJson(
      '/api/results',
      {
        items: input.items,
        origin: input.origin,
        sort: input.sort,
      },
      signal,
    ),
  )
}
