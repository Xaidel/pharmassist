import type { QueryResultRow } from 'pg'

import type { QueryRunner } from '#/lib/db.server'

import {
  SEARCH_TRIGRAM_MIN_QUERY_LENGTH,
  SEARCH_TRIGRAM_SHORT_QUERY_BOOST,
  SEARCH_TRIGRAM_SHORT_QUERY_LENGTH,
  SEARCH_TRIGRAM_THRESHOLD,
  type SearchInput,
} from './search.domain'
import {
  searchRowSchema,
  toSearchItem,
  type SearchItem,
  type SearchRow,
} from './search.schema'

type SearchRowResult = SearchRow & QueryResultRow

const SEARCH_SQL = `
with term as (
  select
    lower($1::text) as q,
    $2::real as threshold,
    $2::real + case
      when length(lower($1::text)) <= $5::int then $6::real
      else 0
    end as effective_threshold
),
scored as (
  select
    m.id as medicine_id,
    m.category,
    m.brand_name,
    m.generic_name,
    m.strength,
    m.dosage_form,
    m.base_unit,
    m.manufacturer,
    m.rx_otc,
    m.pnf_listed,
    m.konsulta_listed,
    m.active,
    coalesce(
      (
        select array_agg(forms.sale_form order by forms.form_order)
        from (
          select distinct
            po.sale_form,
            case po.sale_form
              when 'pack' then 0
              when 'strip' then 1
              else 2
            end as form_order
          from price_observation po
          where po.medicine_id = m.id
            and po.sale_state = 'available'
            and po.stock_status in ('in_stock', 'low_stock')
        ) forms
      ),
      '{}'::sale_form[]
    )::text[] as available_forms,
    (
      select count(*)::int
        from medicine_alternative alternative
       where alternative.medicine_id = m.id
    ) as candidate_generic_count,
    (
      coalesce(m.brand_name, '') <> ''
      and lower(m.brand_name) = term.q
    ) as brand_exact,
    lower(m.generic_name) = term.q as generic_exact,
    (
      coalesce(m.brand_name, '') <> ''
      and lower(m.brand_name) like term.q || '%'
    ) as brand_prefix,
    lower(m.generic_name) like term.q || '%' as generic_prefix,
    word_similarity(term.q, lower(coalesce(m.brand_name, ''))) as brand_score,
    word_similarity(term.q, lower(m.generic_name)) as generic_score,
    (
      (
        coalesce(m.brand_name, '') <> ''
        and lower(m.brand_name) = term.q
      )
      or (
        coalesce(m.brand_name, '') <> ''
        and lower(m.brand_name) like term.q || '%'
      )
      or (
        length(term.q) >= $4::int
        and word_similarity(
          term.q,
          lower(coalesce(m.brand_name, ''))
        ) >= term.effective_threshold
      )
    ) as brand_matched,
    (
      lower(m.generic_name) = term.q
      or lower(m.generic_name) like term.q || '%'
      or (
        length(term.q) >= $4::int
        and word_similarity(
          term.q,
          lower(m.generic_name)
        ) >= term.effective_threshold
      )
    ) as generic_matched
  from medicine m
  cross join term
)
select
  medicine_id,
  category,
  brand_name,
  generic_name,
  strength,
  dosage_form,
  base_unit,
  manufacturer,
  rx_otc,
  pnf_listed,
  konsulta_listed,
  available_forms,
  candidate_generic_count,
  brand_matched,
  generic_matched,
  brand_exact,
  generic_exact,
  brand_prefix,
  generic_prefix,
  brand_score,
  generic_score
from scored
where active and (brand_matched or generic_matched)
order by
  case when brand_prefix or generic_prefix then 0 else 1 end,
  greatest(brand_score, generic_score) desc,
  coalesce(brand_name, generic_name) asc,
  medicine_id asc
limit $3::int
`

/** Reads exact-product search results from Postgres. */
export type SearchRepository = {
  search(input: SearchInput): Promise<SearchItem[]>
}

/** Build the search repository over a narrow query runner. */
export function createSearchRepository(query: QueryRunner): SearchRepository {
  return {
    async search(input: SearchInput): Promise<SearchItem[]> {
      if (input.q === '') {
        return []
      }

      const rows = await query<SearchRowResult>(SEARCH_SQL, [
        input.q,
        SEARCH_TRIGRAM_THRESHOLD,
        input.limit,
        SEARCH_TRIGRAM_MIN_QUERY_LENGTH,
        SEARCH_TRIGRAM_SHORT_QUERY_LENGTH,
        SEARCH_TRIGRAM_SHORT_QUERY_BOOST,
      ])

      return rows.map((row) => toSearchItem(searchRowSchema.parse(row)))
    },
  }
}
