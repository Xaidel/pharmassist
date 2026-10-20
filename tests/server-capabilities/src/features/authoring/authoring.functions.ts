import { createServerFn } from '@tanstack/react-start'
import { notFound, redirect } from '@tanstack/react-router'
import { authorizationMiddleware } from '#/lib/authorization.middleware'
import { forgedIdentity } from '#/lib/forged-identity.middleware'
import { application } from './authoring.composition.server'
import { ReadInputSchema, WriteInputSchema } from './authoring.schema'

export const writeDraft = createServerFn({ method: 'POST' })
  .middleware([authorizationMiddleware('authoring:write')])
  .validator(WriteInputSchema)
  .handler(({ data, context }) => application.write(data, context.session))

export const evaluateAcceptance = createServerFn({ method: 'GET' })
  .middleware([authorizationMiddleware('authoring:read')])
  .validator(ReadInputSchema)
  .handler(({ data, context }) => application.evaluate(data, context.session))

/** Probe outer function context separately from request-derived identity. */
export const inspectContext = createServerFn({ method: 'GET' })
  .middleware([forgedIdentity, authorizationMiddleware('authoring:read')])
  .handler(({ context }) => ({
    actor: context.session.actor,
    outerMarker: Object.hasOwn(context, 'outerMarker'),
  }))

export const redirectProbe = createServerFn({ method: 'GET' }).handler(() => {
  throw redirect({ href: '/target' })
})
export const missingProbe = createServerFn({ method: 'GET' }).handler(() => {
  throw notFound()
})
