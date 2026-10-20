import type { Draft } from './authoring.domain'
import type { DraftRepository } from './authoring.port'

/** Each factory call is isolated; composition holds the one production instance. */
export function createDraftRepository(): DraftRepository {
  const drafts = new Map<string, Draft>()
  return {
    read: (tenant) => {
      const draft = drafts.get(tenant)
      return draft ? { ...draft } : null
    },
    save: (draft) => {
      drafts.set(draft.tenant, { ...draft })
    },
  }
}
