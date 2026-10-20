import { WorkflowError } from './workflow.domain'

/** Translates published provider failures; internal implementation details are discarded. */
export function mapProviderError(error: unknown): never {
  if (
    error instanceof Error &&
    (error.message === 'FORBIDDEN' || error.message === 'UNAUTHENTICATED')
  )
    throw new WorkflowError('WORKFLOW_ACCESS_DENIED')
  throw new WorkflowError('WORKFLOW_DEPENDENCY_FAILED')
}
