import { readServerConfig, type AppEnv } from './config.server'
import { queryRows, type QueryRunner } from './db.server'
import type { EventBatch } from './events.schema'

const EVENTS_PER_MINUTE_LIMIT = 120

/** Raised when a session sends more events than the POC accepts per minute. */
export class EventRateLimitError extends Error {
  constructor() {
    super('Too many anonymous events in one minute.')
    this.name = 'EventRateLimitError'
  }
}

/** The outcome of accepting one anonymous event batch. */
export type SubmitEventsOutcome =
  { accepted: number; rateLimited: false } | { accepted: 0; rateLimited: true }

/** Persists allowlisted anonymous events for one batch. */
export type EventStore = {
  record(batch: EventBatch): Promise<number>
}

/** Build an event store over a narrow query runner. */
export function createEventStore(
  query: QueryRunner,
  appEnv: AppEnv,
): EventStore {
  return {
    async record(batch: EventBatch): Promise<number> {
      const recent = await query<{ count: number }>(
        `select count(*)::int as count
           from app_event
          where session_id = $1
            and occurred_at > now() - interval '1 minute'`,
        [batch.session_id],
      )

      if (
        (recent[0]?.count ?? 0) + batch.events.length >
        EVENTS_PER_MINUTE_LIMIT
      ) {
        throw new EventRateLimitError()
      }

      await query(
        `insert into app_event (name, session_id, app_env, properties)
         select event.name, $1::uuid, $2::text, event.properties
           from unnest($3::text[], $4::jsonb[]) as event(name, properties)`,
        [
          batch.session_id,
          appEnv,
          batch.events.map((event) => event.name),
          batch.events.map((event) => JSON.stringify(event.properties)),
        ],
      )

      return batch.events.length
    },
  }
}

/** Persist an anonymous event batch for the running application environment. */
export async function recordEventBatch(
  batch: EventBatch,
): Promise<SubmitEventsOutcome> {
  const store = createEventStore(queryRows, readServerConfig().appEnv)

  try {
    const accepted = await store.record(batch)
    return { accepted, rateLimited: false }
  } catch (error) {
    if (error instanceof EventRateLimitError) {
      return { accepted: 0, rateLimited: true }
    }
    throw error
  }
}
