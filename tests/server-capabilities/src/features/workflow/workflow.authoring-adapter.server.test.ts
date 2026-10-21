import { expect, it, vi } from 'vitest'
import { createAcceptanceReader } from './workflow.authoring-adapter.server'

it('maps through a fake without loading the provider production binding', () => {
  const evaluate = vi.fn(() => ({ accepted: true, text: 'Title', revision: 7 }))
  const reader = createAcceptanceReader(
    { evaluate, write: () => ({ text: 'New', revision: 8 }) },
    { actor: 'test', tenant: 'alpha', permissions: [] },
  )
  expect(reader.find('alpha')).toEqual({
    ready: true,
    title: 'Title',
    version: 7,
  })
  expect(evaluate).toHaveBeenCalledWith(
    { tenant: 'alpha' },
    { actor: 'test', tenant: 'alpha', permissions: [] },
  )
  expect(reader.update('alpha', 'New')).toEqual({ version: 8 })
})

it('keeps absence, denial and provider failure distinct', () => {
  const context = { actor: 'test', tenant: 'alpha', permissions: [] }
  const write = () => ({ text: 'New', revision: 1 })
  expect(
    createAcceptanceReader({ write, evaluate: () => null }, context).find(
      'alpha',
    ),
  ).toBeNull()
  const denied = createAcceptanceReader(
    {
      write,
      evaluate: () => {
        throw new Error('FORBIDDEN')
      },
    },
    context,
  )
  expect(() => denied.find('beta')).toThrow('WORKFLOW_ACCESS_DENIED')
  const broken = createAcceptanceReader(
    {
      write,
      evaluate: () => {
        throw new Error('database credentials')
      },
    },
    context,
  )
  expect(() => broken.find('alpha')).toThrow('WORKFLOW_DEPENDENCY_FAILED')
})
