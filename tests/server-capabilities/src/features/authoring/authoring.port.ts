import type { Draft } from './authoring.domain'

export type DraftRepository = {
  read: (tenant: Draft['tenant']) => Draft | null
  save: (draft: Draft) => void
}
