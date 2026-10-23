import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { handlePharmacyDirectory } from '#/features/results/pharmacy-directory.server'
import { apiError, apiJson, apiMethodNotAllowed } from '#/lib/api-response'

export const Route = createFileRoute('/api/pharmacies/')({
  server: {
    handlers: {
      GET: async (): Promise<Response> => {
        try {
          return apiJson(await handlePharmacyDirectory())
        } catch (error) {
          if (error instanceof ZodError) {
            return apiError(500, 'INTERNAL', 'Internal error.')
          }
          return apiError(
            503,
            'DATABASE_UNAVAILABLE',
            'The pharmacy directory is temporarily unavailable.',
          )
        }
      },
      ANY: (): Response => apiMethodNotAllowed(['GET']),
    },
  },
})
