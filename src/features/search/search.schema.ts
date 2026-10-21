import { z } from 'zod'

import {
  classifySearchMatch,
  normalizeSearchQuery,
  SEARCH_LIMIT_DEFAULT,
  searchInputSchema,
  type SearchInput,
  type SearchMatch,
} from './search.domain'

/** The exact-product view the search endpoint exposes. */
export const medicineSummarySchema = z.strictObject({
  medicine_id: z.string(),
  category: z.string(),
  brand_name: z.string().nullable(),
  generic_name: z.string(),
  strength: z.string(),
  dosage_form: z.string(),
  pack_size: z.string().nullable(),
  manufacturer: z.string().nullable(),
  rx_otc: z.enum(['Rx', 'OTC']),
  pnf_listed: z.boolean().nullable(),
  konsulta_listed: z.boolean().nullable(),
})

/** The exact-product view the search endpoint exposes. */
export type MedicineSummary = z.infer<typeof medicineSummarySchema>

const searchMatchSchema = z.strictObject({
  field: z.enum(['brand', 'generic', 'both']),
  type: z.enum(['exact', 'prefix', 'trigram']),
  score: z.number().min(0).max(1),
})

/** One exact-product search result. */
export const searchItemSchema = z.strictObject({
  medicine: medicineSummarySchema,
  match: searchMatchSchema,
  candidate_generic_count: z.number().int().min(0),
})

/** One exact-product search result. */
export type SearchItem = z.infer<typeof searchItemSchema>

/** The search endpoint's response contract. */
export const searchResponseSchema = z.strictObject({
  query: z.string(),
  items: z.array(searchItemSchema),
  total: z.number().int().min(0),
})

/** The search endpoint's response contract. */
export type SearchResponse = z.infer<typeof searchResponseSchema>

/** The database row before it is projected into a search result. */
export const searchRowSchema = z.strictObject({
  medicine_id: z.string(),
  category: z.string(),
  brand_name: z.string().nullable(),
  generic_name: z.string(),
  strength: z.string(),
  dosage_form: z.string(),
  pack_size: z.string().nullable(),
  manufacturer: z.string().nullable(),
  rx_otc: z.enum(['Rx', 'OTC']),
  pnf_listed: z.boolean().nullable(),
  konsulta_listed: z.boolean().nullable(),
  candidate_generic_count: z.number().int().min(0),
  brand_matched: z.boolean(),
  generic_matched: z.boolean(),
  brand_exact: z.boolean(),
  generic_exact: z.boolean(),
  brand_prefix: z.boolean(),
  generic_prefix: z.boolean(),
  brand_score: z.number(),
  generic_score: z.number(),
})

/** The database row before it is projected into a search result. */
export type SearchRow = z.infer<typeof searchRowSchema>

/** Read and validate `GET /api/search` query parameters. */
export const searchQueryParamsSchema = z
  .object({
    q: z.string().nullish(),
    limit: z.string().nullish(),
  })
  .transform(({ q, limit }): SearchInput => {
    const normalizedQuery = normalizeSearchQuery(q ?? '')
    return searchInputSchema.parse({
      q: normalizedQuery,
      limit:
        limit === null || limit === undefined
          ? SEARCH_LIMIT_DEFAULT
          : Number(limit),
    })
  })

/** Project a database row into the public search result. */
export function toSearchItem(row: SearchRow): SearchItem {
  const match: SearchMatch = classifySearchMatch({
    brandMatched: row.brand_matched,
    genericMatched: row.generic_matched,
    brandExact: row.brand_exact,
    genericExact: row.generic_exact,
    brandPrefix: row.brand_prefix,
    genericPrefix: row.generic_prefix,
    brandScore: row.brand_score,
    genericScore: row.generic_score,
  })

  return {
    medicine: {
      medicine_id: row.medicine_id,
      category: row.category,
      brand_name: row.brand_name,
      generic_name: row.generic_name,
      strength: row.strength,
      dosage_form: row.dosage_form,
      pack_size: row.pack_size,
      manufacturer: row.manufacturer,
      rx_otc: row.rx_otc,
      pnf_listed: row.pnf_listed,
      konsulta_listed: row.konsulta_listed,
    },
    match,
    candidate_generic_count: row.candidate_generic_count,
  }
}
