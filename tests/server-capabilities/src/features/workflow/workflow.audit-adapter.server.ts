import type { AuditApi } from '../audit/audit.surface.server'
import type { ExecutionContext } from '#/lib/session.server'
import type { AuditRecorder } from './workflow.port'
import { mapProviderError } from './workflow.provider-errors.server'

export function createAuditRecorder(
  api: AuditApi,
  context: ExecutionContext,
): AuditRecorder {
  return {
    recordInspection: (tenant) => {
      try {
        return {
          reference: api.record(
            { tenant, action: 'acceptance-inspected' },
            context,
          ).receipt,
        }
      } catch (error) {
        return mapProviderError(error)
      }
    },
  }
}
