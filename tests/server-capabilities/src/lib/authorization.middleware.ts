import { createMiddleware } from '@tanstack/react-start'
import { resolveSession, assertAccess } from './session.server'

/** Transform-compatible declaration; private session access is used only in the server callback. */
export function authorizationMiddleware(permission: string) {
  return createMiddleware({ type: 'function' }).server(({ next }) => {
    const session = resolveSession()
    assertAccess(session, session.tenant, permission)
    return next({ context: { session, permission } })
  })
}
