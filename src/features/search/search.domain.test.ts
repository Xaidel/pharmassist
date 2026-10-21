import { describe, expect, it } from 'vitest'

import {
  classifySearchMatch,
  normalizeSearchQuery,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_QUERY_MAX_LENGTH,
  searchInputSchema,
} from './search.domain'

describe('normalizeSearchQuery', () => {
  it('trims and collapses whitespace without changing the words', () => {
    expect(normalizeSearchQuery('  amlo   dipine  ')).toBe('amlo dipine')
    expect(normalizeSearchQuery('')).toBe('')
  })
})

describe('classifySearchMatch', () => {
  it('classifies an exact brand match as brand and exact', () => {
    expect(
      classifySearchMatch({
        brandMatched: true,
        genericMatched: false,
        brandExact: true,
        genericExact: false,
        brandPrefix: true,
        genericPrefix: false,
        brandScore: 1,
        genericScore: 0.1,
      }),
    ).toEqual({ field: 'brand', type: 'exact', score: 1 })
  })

  it('classifies a generic prefix and reports both when both fields match', () => {
    expect(
      classifySearchMatch({
        brandMatched: true,
        genericMatched: true,
        brandExact: false,
        genericExact: false,
        brandPrefix: true,
        genericPrefix: true,
        brandScore: 0.6,
        genericScore: 0.8,
      }),
    ).toEqual({ field: 'both', type: 'prefix', score: 0.8 })
  })

  it('falls back to a trigram match for a close spelling', () => {
    expect(
      classifySearchMatch({
        brandMatched: false,
        genericMatched: true,
        brandExact: false,
        genericExact: false,
        brandPrefix: false,
        genericPrefix: false,
        brandScore: 0,
        genericScore: 0.74,
      }),
    ).toEqual({ field: 'generic', type: 'trigram', score: 0.74 })
  })

  it('treats a generic-only product as a generic match', () => {
    expect(
      classifySearchMatch({
        brandMatched: false,
        genericMatched: true,
        brandExact: false,
        genericExact: true,
        brandPrefix: false,
        genericPrefix: true,
        brandScore: 0,
        genericScore: 1,
      }),
    ).toEqual({ field: 'generic', type: 'exact', score: 1 })
  })

  it('rounds the score and caps it at one', () => {
    expect(
      classifySearchMatch({
        brandMatched: true,
        genericMatched: false,
        brandExact: false,
        genericExact: false,
        brandPrefix: false,
        genericPrefix: false,
        brandScore: 1.2,
        genericScore: 0,
      }).score,
    ).toBe(1)
  })
})

describe('searchInputSchema', () => {
  it('defaults the limit and accepts the maximum query length', () => {
    const parsed = searchInputSchema.parse({
      q: 'a'.repeat(SEARCH_QUERY_MAX_LENGTH),
    })

    expect(parsed.limit).toBe(SEARCH_LIMIT_DEFAULT)
  })

  it('rejects an overlong query and an out-of-range limit', () => {
    expect(
      searchInputSchema.safeParse({
        q: 'a'.repeat(SEARCH_QUERY_MAX_LENGTH + 1),
      }).success,
    ).toBe(false)
    expect(searchInputSchema.safeParse({ q: 'a', limit: 0 }).success).toBe(
      false,
    )
    expect(searchInputSchema.safeParse({ q: 'a', limit: 11 }).success).toBe(
      false,
    )
  })
})
