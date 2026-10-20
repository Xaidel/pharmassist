import type { ExecutionContext } from '#/lib/session.server'
import { authoring } from '../authoring/authoring.surface.server'
import { createAcceptanceReader } from './workflow.authoring-adapter.server'

/** Production binding. Request-specific identity is supplied by the consumer entrypoint. */
export function bindAcceptanceReader(context: ExecutionContext) {
  return createAcceptanceReader(authoring, context)
}
