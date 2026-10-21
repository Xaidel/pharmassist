import { eventBatchSchema, type AppEvent } from './events.schema'

const SESSION_ID_KEY = 'pharmassist.session_id'

let fallbackSessionId: string | undefined

function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY)
    if (existing !== null) {
      return existing
    }
    const created = crypto.randomUUID()
    window.sessionStorage.setItem(SESSION_ID_KEY, created)
    return created
  } catch {
    fallbackSessionId ??= crypto.randomUUID()
    return fallbackSessionId
  }
}

/** Send anonymous events best-effort; a failure never blocks a user action. */
export async function sendEvents(events: readonly AppEvent[]): Promise<void> {
  const batch = eventBatchSchema.parse({
    session_id: getSessionId(),
    events: [...events],
  })

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(batch),
      keepalive: true,
    })
  } catch {
    return
  }
}
