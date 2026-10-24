import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { resultsRequestSchema } from '#/features/results/results.schema'
import { handleResults } from '#/features/results/results.server'
import { readJsonBody } from '#/lib/api-request'
import { apiError, apiJson, apiMethodNotAllowed } from '#/lib/api-response'

export const Route = createFileRoute('/api/results')({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        const body = await readJsonBody(request)
        if (!body.ok) {
          return apiError(
            400,
            'INVALID_REQUEST',
            'The list is malformed or too large.',
          )
        }

        const parsed = resultsRequestSchema.safeParse(body.value)
        if (!parsed.success) {
          return apiError(
            400,
            'INVALID_REQUEST',
            'The list or origin is malformed.',
            {
              issues: parsed.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
              })),
            },
          )
        }

        try {
          const outcome = await handleResults(parsed.data)
          if (!outcome.ok) {
            return apiError(
              outcome.error.status,
              outcome.error.code,
              outcome.error.message,
              outcome.error.details,
            )
          }
          return apiJson(outcome.response)
        } catch (error) {
          if (error instanceof ZodError) {
            return apiError(500, 'INTERNAL', 'Internal error.')
          }
          return apiError(
            503,
            'DATABASE_UNAVAILABLE',
            'Prices are temporarily unavailable.',
          )
        }
      },
      ANY: (): Response => apiMethodNotAllowed(['POST']),
    },
  },
})
