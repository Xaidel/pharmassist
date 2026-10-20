import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { authorizationMiddleware } from '#/lib/authorization.middleware'
import { bindAcceptanceReader } from './workflow.authoring-binding.server'
import { inspectAcceptance, updateTitle } from './workflow.use-cases'
import { evaluateAcceptance } from '../authoring/authoring.functions'
import { inspectContext } from '../authoring/authoring.functions'
import { redirectProbe, missingProbe } from '../authoring/authoring.functions'
import { bindAuditRecorder } from './workflow.audit-binding.server'
import { auditInspection } from './workflow.use-cases'
import { InputSchema, ChangeTitleInputSchema } from './workflow.schema'

// Consumer vocabulary is independent; the provider validates at its own boundary.
export const inspectDraft = createServerFn({ method: 'GET' })
  .middleware([authorizationMiddleware('authoring:read')])
  .validator(InputSchema)
  .handler(({ data, context }) =>
    inspectAcceptance(bindAcceptanceReader(context.session), data.tenant),
  )

export const changeTitle = createServerFn({ method: 'POST' })
  .middleware([authorizationMiddleware('workflow:write')])
  .validator(ChangeTitleInputSchema)
  .handler(({ data, context }) =>
    updateTitle(bindAcceptanceReader(context.session), data.tenant, data.title),
  )

/** D1 probe: provider middleware resolves identity independently of the outer context. */
export const nestedRead = createServerFn({ method: 'GET' })
  .validator(InputSchema)
  .handler(async ({ data }) =>
    evaluateAcceptance({ data: { tenant: data.tenant } }),
  )

const outerContext = createMiddleware({ type: 'function' }).server(({ next }) =>
  next({ context: { outerMarker: true } }),
)
export const nestedContext = createServerFn({ method: 'GET' })
  .middleware([outerContext])
  .handler(async () => inspectContext())

export const nestedRedirect = createServerFn({ method: 'GET' }).handler(
  async () => redirectProbe(),
)
export const nestedMissing = createServerFn({ method: 'GET' }).handler(
  async () => missingProbe(),
)

export const recordInspection = createServerFn({ method: 'POST' })
  .middleware([authorizationMiddleware('authoring:read')])
  .validator(InputSchema)
  .handler(({ data, context }) =>
    auditInspection(bindAuditRecorder(context.session), data.tenant),
  )
