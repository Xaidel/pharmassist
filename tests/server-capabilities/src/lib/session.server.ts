import { getRequestHeader } from '@tanstack/react-start/server'

/** Synthetic identities for this executable fixture, not a production identity provider. */
export type ExecutionContext = {
  actor: string
  tenant: string
  permissions: readonly string[]
}

/** Resolves fixture identity from the incoming request, never from function data/context. */
export function resolveSession(): ExecutionContext {
  const credential = getRequestHeader('authorization')
  const fullPermissions = [
    'authoring:read',
    'authoring:write',
    'audit:write',
    'workflow:write',
  ]
  if (credential === 'Bearer alpha')
    return { actor: 'alice', tenant: 'alpha', permissions: fullPermissions }
  if (credential === 'Bearer beta')
    return { actor: 'bob', tenant: 'beta', permissions: fullPermissions }
  if (credential === 'Bearer reader')
    return {
      actor: 'reader',
      tenant: 'alpha',
      permissions: ['authoring:read', 'workflow:write'],
    }
  throw new Error('UNAUTHENTICATED')
}

/** Provider access policy shared by RPC middleware and the server-only entrypoint. */
export function assertAccess(
  context: ExecutionContext,
  tenant: string,
  permission: string,
): void {
  if (
    !context.actor ||
    !context.tenant ||
    context.tenant !== tenant ||
    !context.permissions.includes(permission)
  )
    throw new Error('FORBIDDEN')
}
