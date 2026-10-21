import { queryRows } from '#/lib/db.server'

import type { SearchInput } from './search.domain'
import { createSearchRepository } from './search.repository.server'
import { searchResponseSchema, type SearchResponse } from './search.schema'

const repository = createSearchRepository(queryRows)

/** Execute a search against the seeded catalog. */
export async function handleSearch(
  input: SearchInput,
): Promise<SearchResponse> {
  const items = await repository.search(input)
  return searchResponseSchema.parse({
    query: input.q,
    items,
    total: items.length,
  })
}
