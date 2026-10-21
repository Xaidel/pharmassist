import { expect, it } from 'vitest'
import { authoring } from './authoring.surface.server'

it('supports a request-independent service identity while preserving provider policy and validation', () => {
  const service = {
    actor: 'job',
    tenant: 'alpha',
    permissions: ['authoring:read', 'authoring:write'],
  }
  expect(
    authoring.write({ tenant: 'alpha', text: 'Job title' }, service),
  ).toEqual({ text: 'Job title', revision: 1 })
  expect(authoring.evaluate({ tenant: 'alpha' }, service)).toEqual({
    accepted: true,
    text: 'Job title',
    revision: 1,
  })
  expect(() =>
    authoring.write({ tenant: 'beta', text: 'Other tenant' }, service),
  ).toThrow('FORBIDDEN')
  expect(() =>
    authoring.write({ tenant: 'alpha', text: '' }, service),
  ).toThrow()
  expect(authoring.evaluate({ tenant: 'alpha' }, service)?.revision).toBe(1)
  expect(() =>
    authoring.write(
      { tenant: 'alpha', text: 'No permission' },
      { ...service, permissions: ['authoring:read'] },
    ),
  ).toThrow('FORBIDDEN')
})
