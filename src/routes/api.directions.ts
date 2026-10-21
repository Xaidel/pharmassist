import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { parseDirectionsQuery } from '#/features/results/directions.domain'
import { handleDirections } from '#/features/results/directions.server'
import { apiError, apiJson, apiMethodNotAllowed } from '#/lib/api-response'

export const Route = createFileRoute('/api/directions')({
  server: {
    handlers: {
      GET: async ({ request }): Promise<Response> => {
        const url = new URL(request.url)
        const query = parseDirectionsQuery(url.searchParams)
        if (!query.ok) {
          return apiError(400, query.code, query.message)
        }

        try {
          const outcome = await handleDirections(query.value)
          if (!outcome.ok) {
            return apiError(
              outcome.error.status,
              outcome.error.code,
              outcome.error.message,
            )
          }
          return apiJson(outcome.response)
        } catch (error) {
          if (error instanceof ZodError) {
            return apiError(500, 'INTERNAL', 'Internal error.')
          }
          return apiError(
            503,
            'ROUTING_UNAVAILABLE',
            'A route is unavailable right now. Try again.',
          )
        }
      },
      ANY: (): Response => apiMethodNotAllowed(['GET']),
    },
  },
})
