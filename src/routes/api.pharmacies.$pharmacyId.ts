import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { parsePharmacyDetailQuery } from '#/features/results/pharmacy-detail.domain'
import { handlePharmacyDetail } from '#/features/results/pharmacy-detail.server'
import { apiError, apiJson, apiMethodNotAllowed } from '#/lib/api-response'

export const Route = createFileRoute('/api/pharmacies/$pharmacyId')({
  server: {
    handlers: {
      GET: async ({ params, request }): Promise<Response> => {
        const url = new URL(request.url)
        const query = parsePharmacyDetailQuery(url.searchParams)
        if (!query.ok) {
          return apiError(query.status, query.code, query.message)
        }

        try {
          const outcome = await handlePharmacyDetail(
            params.pharmacyId,
            query.value,
          )
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
            'Pharmacy details are temporarily unavailable.',
          )
        }
      },
      ANY: (): Response => apiMethodNotAllowed(['GET']),
    },
  },
})
