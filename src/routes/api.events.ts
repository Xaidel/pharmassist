import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { apiError, apiJson, apiMethodNotAllowed } from '#/lib/api-response'
import { eventBatchSchema } from '#/lib/events.schema'
import { recordEventBatch } from '#/lib/events.server'

const MAX_BODY_BYTES = 32 * 1024

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        const declaredLength = request.headers.get('content-length')
        if (
          declaredLength !== null &&
          Number(declaredLength) > MAX_BODY_BYTES
        ) {
          return apiError(
            400,
            'INVALID_REQUEST',
            'The event batch is malformed or too large.',
          )
        }

        const body = await request.text()
        if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
          return apiError(
            400,
            'INVALID_REQUEST',
            'The event batch is malformed or too large.',
          )
        }

        let payload: unknown
        try {
          payload = JSON.parse(body)
        } catch {
          return apiError(
            400,
            'INVALID_REQUEST',
            'The event batch is malformed or too large.',
          )
        }

        const parsed = eventBatchSchema.safeParse(payload)
        if (!parsed.success) {
          const envelopeInvalid = parsed.error.issues.some(
            (issue) => issue.path.length <= 1,
          )
          return apiError(
            envelopeInvalid ? 400 : 422,
            envelopeInvalid ? 'INVALID_REQUEST' : 'INVALID_EVENT',
            envelopeInvalid
              ? 'The event batch is malformed or too large.'
              : 'The event batch contains an unknown event name, property, or value type.',
            {
              issues: parsed.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
              })),
            },
          )
        }

        try {
          const result = await recordEventBatch(parsed.data)
          if (result.rateLimited) {
            return apiError(
              429,
              'EVENT_RATE_LIMITED',
              'Too many anonymous events in one minute.',
            )
          }
          return apiJson({ accepted: result.accepted }, { status: 202 })
        } catch (error) {
          if (error instanceof ZodError) {
            return apiError(500, 'INTERNAL', 'Internal error.')
          }
          return apiError(
            503,
            'DATABASE_UNAVAILABLE',
            'Event intake is temporarily unavailable.',
          )
        }
      },
      ANY: (): Response => apiMethodNotAllowed(['POST']),
    },
  },
})
