import { application } from './authoring.composition.server'
import { ReadInputSchema, WriteInputSchema } from './authoring.schema'
import type { ExecutionContext } from '#/lib/session.server'

export type AuthoringApi = {
  write: (
    input: { tenant: string; text: string },
    context: ExecutionContext,
  ) => { text: string; revision: number }
  evaluate: (
    input: { tenant: string },
    context: ExecutionContext,
  ) => { accepted: boolean; text: string; revision: number } | null
}

/** Bound operations, not storage. Parse once at this provider boundary. */
export const authoring: AuthoringApi = {
  write: (input, context) =>
    application.write(WriteInputSchema.parse(input), context),
  evaluate: (input, context) =>
    application.evaluate(ReadInputSchema.parse(input), context),
}
