import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { searchQueryParamsSchema } from '#/features/search/search.schema'
import { handleSearch } from '#/features/search/search.server'
import { apiError, apiJson, apiMethodNotAllowed } from '#/lib/api-response'

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async ({ request }): Promise<Response> => {
        const url = new URL(request.url)
        const parsed = searchQueryParamsSchema.safeParse({
          q: url.searchParams.get('q'),
          limit: url.searchParams.get('limit'),
        })

        if (!parsed.success) {
          return apiError(
            400,
            'INVALID_QUERY',
            'The search query or limit is outside the allowed range.',
            {
              issues: parsed.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
              })),
            },
          )
        }

        try {
          const response = await handleSearch(parsed.data)
          return apiJson(response)
        } catch (error) {
          if (error instanceof ZodError) {
            return apiError(500, 'INTERNAL', 'Internal error.')
          }
          return apiError(
            503,
            'DATABASE_UNAVAILABLE',
            'Search is temporarily unavailable.',
          )
        }
      },
      ANY: (): Response => apiMethodNotAllowed(['GET']),
    },
  },
})
