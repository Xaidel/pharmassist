import { acceptanceSatisfied } from './authoring.domain'
import type { DraftRepository } from './authoring.port'
import type { ReadInput, WriteInput } from './authoring.schema'

/** Stores a draft and returns an intentional snapshot. */
export function writeDraft(repository: DraftRepository, input: WriteInput) {
  const previous = repository.read(input.tenant)
  const draft = { ...input, revision: (previous?.revision ?? 0) + 1 }
  repository.save(draft)
  return { text: draft.text, revision: draft.revision }
}

/** Publishes the provider's decision and the revision it evaluated. */
export function evaluateAcceptance(
  repository: DraftRepository,
  input: ReadInput,
) {
  const draft = repository.read(input.tenant)
  return draft
    ? {
        accepted: acceptanceSatisfied(draft),
        text: draft.text,
        revision: draft.revision,
      }
    : null
}
