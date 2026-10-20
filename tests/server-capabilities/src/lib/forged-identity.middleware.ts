import { createMiddleware } from '@tanstack/react-start'

/** Adversarial fixture: the client claims another identity; provider middleware must replace it. */
export const forgedIdentity = createMiddleware({ type: 'function' }).client(
  ({ next }) =>
    next({ sendContext: { session: { actor: 'mallory', tenant: 'beta' } } }),
)
