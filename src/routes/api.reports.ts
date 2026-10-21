import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { readJsonBody } from '#/lib/api-request'
import { apiError, apiJson, apiMethodNotAllowed } from '#/lib/api-response'
import {
  handleCreateReport,
  handleReportSummary,
} from '#/features/results/report.server'
import {
  reportRequestSchema,
  reportSummaryQuerySchema,
} from '#/features/results/report.schema'

function readClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const firstForwarded = forwarded?.split(',')[0]?.trim()
  if (firstForwarded !== undefined && firstForwarded !== '') {
    return firstForwarded
  }
  const realIp = request.headers.get('x-real-ip')
  return realIp === null || realIp === '' ? 'local' : realIp
}

export const Route = createFileRoute('/api/reports')({
  server: {
    handlers: {
      GET: async ({ request }): Promise<Response> => {
        const url = new URL(request.url)
        const parsed = reportSummaryQuerySchema.safeParse({
          result_key: url.searchParams.get('result_key'),
        })
        if (!parsed.success) {
          return apiError(
            400,
            'INVALID_REQUEST',
            'The report query is malformed.',
          )
        }

        try {
          return apiJson(await handleReportSummary(parsed.data.result_key))
        } catch (error) {
          if (error instanceof ZodError) {
            return apiError(500, 'INTERNAL', 'Internal error.')
          }
          return apiError(
            503,
            'DATABASE_UNAVAILABLE',
            'Report summaries are temporarily unavailable.',
          )
        }
      },

      POST: async ({ request }): Promise<Response> => {
        const body = await readJsonBody(request)
        if (!body.ok) {
          return apiError(
            400,
            'INVALID_REQUEST',
            'The report is malformed or too large.',
          )
        }

        const parsed = reportRequestSchema.safeParse(body.value)
        if (!parsed.success) {
          return apiError(400, 'INVALID_REQUEST', 'The report is malformed.', {
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path,
              message: issue.message,
            })),
          })
        }

        try {
          const outcome = await handleCreateReport(
            parsed.data,
            readClientKey(request),
          )
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
            'Report intake is temporarily unavailable.',
          )
        }
      },

      ANY: (): Response => apiMethodNotAllowed(['GET', 'POST']),
    },
  },
})
