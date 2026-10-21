import type { AcceptanceReader } from './workflow.port'
import type { AuditRecorder } from './workflow.port'

export function inspectAcceptance(reader: AcceptanceReader, tenant: string) {
  return reader.find(tenant)
}

export function updateTitle(
  reader: AcceptanceReader,
  tenant: string,
  title: string,
) {
  return reader.update(tenant, title)
}

export function auditInspection(
  recorder: AuditRecorder,
  tenant: string,
): { reference: number } {
  return recorder.recordInspection(tenant)
}
