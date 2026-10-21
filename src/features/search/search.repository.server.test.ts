import type { QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'

import type { QueryRunner } from '#/lib/db.server'

import {
  SEARCH_TRIGRAM_MIN_QUERY_LENGTH,
  SEARCH_TRIGRAM_SHORT_QUERY_BOOST,
  SEARCH_TRIGRAM_SHORT_QUERY_LENGTH,
  SEARCH_TRIGRAM_THRESHOLD,
} from './search.domain'
import { createSearchRepository } from './search.repository.server'
import type { SearchRow } from './search.schema'

const row: SearchRow = {
  medicine_id: 'POC-025',
  category: 'Anti-infective',
  brand_name: 'Amoxil',
  generic_name: 'Amoxicillin (as trihydrate)',
  strength: '500 mg',
  dosage_form: 'Capsule',
  pack_size: 'Box of 100 capsules',
  manufacturer: 'Glaxo Wellcome Production',
  rx_otc: 'Rx',
  pnf_listed: true,
  konsulta_listed: true,
  candidate_generic_count: 0,
  brand_matched: false,
  generic_matched: true,
  brand_exact: false,
  generic_exact: false,
  brand_prefix: false,
  generic_prefix: false,
  brand_score: 0.2,
  generic_score: 0.72,
}

function recordingQuery(
  calls: { text: string; values: readonly unknown[] }[],
  rows: readonly SearchRow[],
): QueryRunner {
  return <Row extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<Row[]> => {
    calls.push({ text, values })
    return Promise.resolve(rows as unknown as Row[])
  }
}

describe('createSearchRepository', () => {
  it('passes the normalized search and thresholds to Postgres', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createSearchRepository(recordingQuery(calls, [row]))

    const items = await repository.search({ q: 'amoxicilin', limit: 4 })

    expect(items).toHaveLength(1)
    expect(items[0]?.medicine.medicine_id).toBe('POC-025')
    expect(items[0]?.match).toEqual({
      field: 'generic',
      type: 'trigram',
      score: 0.72,
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.values).toEqual([
      'amoxicilin',
      SEARCH_TRIGRAM_THRESHOLD,
      4,
      SEARCH_TRIGRAM_MIN_QUERY_LENGTH,
      SEARCH_TRIGRAM_SHORT_QUERY_LENGTH,
      SEARCH_TRIGRAM_SHORT_QUERY_BOOST,
    ])
    expect(calls[0]?.text).toContain('word_similarity')
    expect(calls[0]?.text).toContain('where active')
    expect(calls[0]?.text).toContain('candidate_generic_count')
  })

  it('returns an empty list without a database call for an empty query', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createSearchRepository(recordingQuery(calls, [row]))

    await expect(repository.search({ q: '', limit: 8 })).resolves.toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('rejects a row that does not match the search contract', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createSearchRepository(
      recordingQuery(calls, [{ ...row, brand_score: 'not-a-number' } as never]),
    )

    await expect(
      repository.search({ q: 'amoxicilin', limit: 8 }),
    ).rejects.toThrow()
  })
})
