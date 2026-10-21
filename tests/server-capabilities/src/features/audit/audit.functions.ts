import { createServerFn } from '@tanstack/react-start'
import { authorizationMiddleware } from '#/lib/authorization.middleware'
import { AuditInputSchema } from './audit.schema'
import { record } from './audit.composition.server'

/** RPC and server-only audit operations share the private sink. */
export const recordAudit = createServerFn({ method: 'POST' })
  .middleware([authorizationMiddleware('audit:write')])
  .validator(AuditInputSchema)
  .handler(({ data, context }) => record(data, context.session))
