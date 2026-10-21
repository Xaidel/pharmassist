import { z } from 'zod'

// Opaque foreign inputs; the provider owns their construction rules.
export const TenantReferenceSchema = z.string()
export const TitleSchema = z.string()

export type WorkflowErrorCode =
  'WORKFLOW_ACCESS_DENIED' | 'WORKFLOW_DEPENDENCY_FAILED'

/** Consumer-owned failure contract; provider messages never become workflow terminology. */
export class WorkflowError extends Error {
  constructor(readonly code: WorkflowErrorCode) {
    super(code)
  }
}
