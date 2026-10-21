import { z } from 'zod'

import type { SearchInput } from './search.domain'
import { searchResponseSchema, type SearchResponse } from './search.schema'

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

/** Raised when the search endpoint rejects a request. */
export class SearchRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'SearchRequestError'
  }
}

/** True when a rejected fetch was cancelled by its caller. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/** Call the search endpoint and validate its response. */
export async function fetchSearch(
  input: SearchInput,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: input.q,
    limit: String(input.limit),
  })
  const init: RequestInit = { headers: { accept: 'application/json' } }
  if (signal !== undefined) {
    init.signal = signal
  }

  const response = await fetch(`/api/search?${params.toString()}`, init)

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined)
    const parsed = errorEnvelopeSchema.safeParse(payload)
    throw new SearchRequestError(
      parsed.success ? parsed.data.error.code : 'SEARCH_FAILED',
      parsed.success
        ? parsed.data.error.message
        : 'Search is not available right now.',
    )
  }

  return searchResponseSchema.parse(await response.json())
}
