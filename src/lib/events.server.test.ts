import type { QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'

import type { QueryRunner } from './db.server'
import type { EventBatch } from './events.schema'
import { createEventStore, EventRateLimitError } from './events.server'

const SESSION_ID = '5f0c2b7e-3e1a-4c2d-8b9f-0a1b2c3d4e5f'

const batch: EventBatch = {
  session_id: SESSION_ID,
  events: [
    {
      name: 'search_submitted',
      properties: { query_length: 5, result_count: 3 },
    },
  ],
}

function storeWith(
  calls: { text: string; values: readonly unknown[] }[],
  recentCount: number,
) {
  const query: QueryRunner = <Row extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<Row[]> => {
    calls.push({ text, values })
    if (text.includes('count(*)')) {
      return Promise.resolve([{ count: recentCount }] as unknown as Row[])
    }
    return Promise.resolve([] as Row[])
  }

  return createEventStore(query, 'test')
}

describe('createEventStore', () => {
  it('checks the session rate limit before inserting the batch', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const store = storeWith(calls, 0)

    await expect(store.record(batch)).resolves.toBe(1)

    expect(calls).toHaveLength(2)
    expect(calls[0]?.text).toContain('app_event')
    expect(calls[0]?.values).toEqual([SESSION_ID])
    expect(calls[1]?.values).toEqual([
      SESSION_ID,
      'test',
      ['search_submitted'],
      [JSON.stringify({ query_length: 5, result_count: 3 })],
    ])
  })

  it('refuses a batch that would exceed the per-minute limit', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const store = storeWith(calls, 120)

    await expect(store.record(batch)).rejects.toBeInstanceOf(
      EventRateLimitError,
    )
    expect(calls).toHaveLength(1)
  })

  it('allows a batch that exactly reaches the limit', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const store = storeWith(calls, 119)

    await expect(store.record(batch)).resolves.toBe(1)
    expect(calls).toHaveLength(2)
  })
})
