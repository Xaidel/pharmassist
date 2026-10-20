import { expect, it } from 'vitest'
import { createDraftRepository } from './authoring.repository.server'

it('isolates factories and copies reads and writes', () => {
  const repository = createDraftRepository()
  const draft = { tenant: 'alpha' as const, text: 'Title', revision: 1 }
  repository.save(draft)
  draft.text = 'Changed'
  const read = repository.read('alpha')
  if (read) read.text = 'Changed again'
  expect(repository.read('alpha')?.text).toBe('Title')
  expect(createDraftRepository().read('alpha')).toBeNull()
})
