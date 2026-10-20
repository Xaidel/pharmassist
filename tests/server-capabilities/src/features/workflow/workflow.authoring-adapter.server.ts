import type { ExecutionContext } from '#/lib/session.server'
import type { AuthoringApi } from '../authoring/authoring.surface.server'
import type { AcceptanceReader } from './workflow.port'
import { mapProviderError } from './workflow.provider-errors.server'

/** Testable anti-corruption mapping. There is no runtime provider import. */
export function createAcceptanceReader(
  api: AuthoringApi,
  context: ExecutionContext,
): AcceptanceReader {
  return {
    find: (tenant) => {
      try {
        const result = api.evaluate({ tenant }, context)
        return result
          ? {
              ready: result.accepted,
              version: result.revision,
              title: result.text,
            }
          : null
      } catch (error) {
        return mapProviderError(error)
      }
    },
    update: (tenant, title) => {
      try {
        return {
          version: api.write({ tenant, text: title }, context).revision,
        }
      } catch (error) {
        return mapProviderError(error)
      }
    },
  }
}
