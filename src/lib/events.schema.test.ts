import { describe, expect, it } from 'vitest'

import { eventBatchSchema, type AppEvent } from './events.schema'

const SESSION_ID = '5f0c2b7e-3e1a-4c2d-8b9f-0a1b2c3d4e5f'

const APP_OPEN: AppEvent = {
  name: 'app_open',
  properties: { install_mode: 'browser' },
}

const VALID_EVENTS: AppEvent[] = [
  APP_OPEN,
  {
    name: 'search_submitted',
    properties: { query_length: 5, result_count: 3 },
  },
  {
    name: 'search_result_selected',
    properties: { rank: 1, result_count: 3 },
  },
  {
    name: 'results_viewed',
    properties: {
      item_count: 2,
      complete_count: 3,
      sold_per_pack_only_count: 2,
      incomplete_count: 2,
      no_price_count: 1,
      sort: 'price',
    },
  },
  { name: 'results_sorted', properties: { sort: 'distance' } },
  {
    name: 'pharmacy_detail_viewed',
    properties: { pharmacy_id: 'mercury-naga-penafrancia' },
  },
  {
    name: 'directions_tapped',
    properties: { pharmacy_id: 'mercury-naga-penafrancia' },
  },
  { name: 'scan_started', properties: { source: 'camera' } },
  {
    name: 'scan_completed',
    properties: { source: 'upload', item_count: 2, low_confidence_count: 1 },
  },
  {
    name: 'scan_failed',
    properties: { source: 'camera', reason: 'provider_error' },
  },
  {
    name: 'basket_item_added',
    properties: { source: 'search', item_count: 1 },
  },
  { name: 'basket_item_removed', properties: { item_count: 0 } },
  { name: 'report_submitted', properties: { reason: 'wrong_price' } },
  {
    name: 'send_ahead_created',
    properties: { pharmacy_id: 'mercury-naga-penafrancia' },
  },
]

describe('eventBatchSchema', () => {
  it('accepts every allowlisted event', () => {
    const parsed = eventBatchSchema.parse({
      session_id: SESSION_ID,
      events: VALID_EVENTS,
    })

    expect(parsed.events).toHaveLength(VALID_EVENTS.length)
  })

  it('rejects an unknown property key instead of dropping it', () => {
    const parsed = eventBatchSchema.safeParse({
      session_id: SESSION_ID,
      events: [
        {
          name: 'search_submitted',
          properties: { query_length: 5, result_count: 3, query: 'amlo' },
        },
      ],
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects an unknown event name and a free-text property', () => {
    expect(
      eventBatchSchema.safeParse({
        session_id: SESSION_ID,
        events: [{ name: 'search_typed', properties: {} }],
      }).success,
    ).toBe(false)
    expect(
      eventBatchSchema.safeParse({
        session_id: SESSION_ID,
        events: [
          {
            name: 'pharmacy_detail_viewed',
            properties: { pharmacy_id: { note: 'free text' } },
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('rejects an overlong query length and an empty or oversized batch', () => {
    expect(
      eventBatchSchema.safeParse({
        session_id: SESSION_ID,
        events: [
          {
            name: 'search_submitted',
            properties: { query_length: 81, result_count: 0 },
          },
        ],
      }).success,
    ).toBe(false)
    expect(
      eventBatchSchema.safeParse({ session_id: SESSION_ID, events: [] })
        .success,
    ).toBe(false)
    expect(
      eventBatchSchema.safeParse({
        session_id: SESSION_ID,
        events: Array.from({ length: 21 }, () => APP_OPEN),
      }).success,
    ).toBe(false)
  })

  it('requires a session UUID v4', () => {
    expect(
      eventBatchSchema.safeParse({
        session_id: 'not-a-uuid',
        events: VALID_EVENTS,
      }).success,
    ).toBe(false)
    expect(
      eventBatchSchema.safeParse({
        session_id: '5f0c2b7e-3e1a-1c2d-8b9f-0a1b2c3d4e5f',
        events: VALID_EVENTS,
      }).success,
    ).toBe(false)
  })
})
