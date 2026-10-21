import type { AuditSink } from './audit.port'
import type { AuditEntry } from './audit.domain'

/** Storage is private; callers receive a receipt rather than this array. */
export function createAuditSink(): AuditSink {
  const entries: AuditEntry[] = []
  return {
    append: (entry) => {
      entries.push({ ...entry })
      return entries.length
    },
  }
}
