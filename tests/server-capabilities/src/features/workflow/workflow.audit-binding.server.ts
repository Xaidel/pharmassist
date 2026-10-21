import { audit } from '../audit/audit.surface.server'
import type { ExecutionContext } from '#/lib/session.server'
import { createAuditRecorder } from './workflow.audit-adapter.server'

export function bindAuditRecorder(context: ExecutionContext) {
  return createAuditRecorder(audit, context)
}
