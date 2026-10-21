import { assertAccess } from '#/lib/session.server'
import type { ExecutionContext } from '#/lib/session.server'
import { createAuditSink } from './audit.store.server'
import { recordAudit } from './audit.use-cases'
import type { AuditInput } from './audit.domain'

const sink = createAuditSink()
export function record(
  input: AuditInput,
  context: ExecutionContext,
): { receipt: number } {
  assertAccess(context, input.tenant, 'audit:write')
  return recordAudit(sink, input, context.actor)
}
