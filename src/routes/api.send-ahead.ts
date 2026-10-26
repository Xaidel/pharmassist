import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { createSendAheadReservation } from '#/features/send-ahead/send-ahead.surface.server'
import { readJsonBody } from '#/lib/api-request'
import { apiError, apiJson, apiMethodNotAllowed } from '#/lib/api-response'

export const Route = createFileRoute('/api/send-ahead')({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        const body = await readJsonBody(request)
        if (!body.ok) {
          return apiError(
            400,
            'INVALID_REQUEST',
            'The send-ahead request is malformed or too large.',
          )
        }

        try {
          const outcome = await createSendAheadReservation(body.value)
          if (!outcome.ok) {
            return apiError(
              outcome.error.status,
              outcome.error.code,
              outcome.error.message,
              outcome.error.details,
            )
          }
          return apiJson(outcome.response, { status: 201 })
        } catch (error) {
          if (error instanceof ZodError) {
            return apiError(500, 'INTERNAL', 'Internal error.')
          }
          return apiError(
            503,
            'DATABASE_UNAVAILABLE',
            'Send-ahead reservations are temporarily unavailable.',
          )
        }
      },
      ANY: (): Response => apiMethodNotAllowed(['POST']),
    },
  },
})
