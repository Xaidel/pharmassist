import { assertAccess } from '#/lib/session.server'
import type { ExecutionContext } from '#/lib/session.server'
import { createDraftRepository } from './authoring.repository.server'
import { evaluateAcceptance, writeDraft } from './authoring.use-cases'
import type { ReadInput, WriteInput } from './authoring.schema'

// One per server module instance. Acyclic construction; no request identity is retained.
const repository = createDraftRepository()

/** Both inbound contracts delegate to this policy and application implementation. */
export const application = {
  write: (input: WriteInput, context: ExecutionContext) => {
    assertAccess(context, input.tenant, 'authoring:write')
    return writeDraft(repository, input)
  },
  evaluate: (input: ReadInput, context: ExecutionContext) => {
    assertAccess(context, input.tenant, 'authoring:read')
    return evaluateAcceptance(repository, input)
  },
}
