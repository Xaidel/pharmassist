import { AuditInputSchema } from './audit.schema'
import { record } from './audit.composition.server'
import type { ExecutionContext } from '#/lib/session.server'

export type AuditApi = {
  record: (
    input: { tenant: string; action: 'acceptance-inspected' },
    context: ExecutionContext,
  ) => { receipt: number }
}
export const audit: AuditApi = {
  record: (input, context) => record(AuditInputSchema.parse(input), context),
}
