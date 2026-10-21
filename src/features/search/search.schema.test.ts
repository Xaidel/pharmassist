import { describe, expect, it } from 'vitest'

import { SEARCH_LIMIT_DEFAULT, SEARCH_QUERY_MAX_LENGTH } from './search.domain'
import {
  searchQueryParamsSchema,
  searchResponseSchema,
  toSearchItem,
  type SearchRow,
} from './search.schema'

const row: SearchRow = {
  medicine_id: 'POC-001',
  category: 'Cardiovascular',
  brand_name: 'Norvasc',
  generic_name: 'Amlodipine (as besilate/camsylate)',
  strength: '5 mg',
  dosage_form: 'Tablet',
  pack_size: 'Box of 100 tablets',
  manufacturer: 'Viatris Pharmaceuticals LLC',
  rx_otc: 'Rx',
  pnf_listed: true,
  konsulta_listed: true,
  candidate_generic_count: 1,
  brand_matched: true,
  generic_matched: true,
  brand_exact: false,
  generic_exact: false,
  brand_prefix: false,
  generic_prefix: true,
  brand_score: 0.42,
  generic_score: 0.8,
}

describe('searchQueryParamsSchema', () => {
  it('normalizes the query and limit from URL parameters', () => {
    expect(
      searchQueryParamsSchema.parse({ q: '  amlo   dipine ', limit: '4' }),
    ).toEqual({ q: 'amlo dipine', limit: 4 })
  })

  it('defaults an empty query and the standard limit', () => {
    expect(searchQueryParamsSchema.parse({ q: null, limit: null })).toEqual({
      q: '',
      limit: SEARCH_LIMIT_DEFAULT,
    })
  })

  it('rejects an overlong query and an invalid limit', () => {
    expect(() =>
      searchQueryParamsSchema.parse({
        q: 'a'.repeat(SEARCH_QUERY_MAX_LENGTH + 1),
      }),
    ).toThrow()
    expect(() =>
      searchQueryParamsSchema.parse({ q: 'amlo', limit: 'abc' }),
    ).toThrow()
    expect(() =>
      searchQueryParamsSchema.parse({ q: 'amlo', limit: '11' }),
    ).toThrow()
  })
})

describe('toSearchItem', () => {
  it('projects the medicine and the match once', () => {
    expect(toSearchItem(row)).toEqual({
      medicine: {
        medicine_id: 'POC-001',
        category: 'Cardiovascular',
        brand_name: 'Norvasc',
        generic_name: 'Amlodipine (as besilate/camsylate)',
        strength: '5 mg',
        dosage_form: 'Tablet',
        pack_size: 'Box of 100 tablets',
        manufacturer: 'Viatris Pharmaceuticals LLC',
        rx_otc: 'Rx',
        pnf_listed: true,
        konsulta_listed: true,
      },
      match: { field: 'both', type: 'prefix', score: 0.8 },
      candidate_generic_count: 1,
    })
  })

  it('builds a response the contract accepts', () => {
    expect(
      searchResponseSchema.parse({
        query: 'amlo',
        items: [toSearchItem(row)],
        total: 1,
      }).total,
    ).toBe(1)
  })
})
