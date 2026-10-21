import type { AuditInput } from './audit.domain'
import type { AuditSink } from './audit.port'

/** Emits an event and returns a public receipt. */
export function recordAudit(
  sink: AuditSink,
  input: AuditInput,
  actor: string,
): { receipt: number } {
  return { receipt: sink.append({ ...input, actor }) }
}
