import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { readImageDimensions } from '#/features/scan/scan.image'
import { handleScan, validateScanRequest } from '#/features/scan/scan.server'
import { apiError, apiJson, apiMethodNotAllowed } from '#/lib/api-response'

export const Route = createFileRoute('/api/scan')({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        let form: FormData
        try {
          form = await request.formData()
        } catch {
          return apiError(
            400,
            'INVALID_REQUEST',
            'The scan request is malformed.',
          )
        }

        const imagePart = form.get('image')
        const consent = form.get('consent')
        const consentVersion = form.get('consent_version')

        let imageBytes: Uint8Array | null = null
        let mimeType: string | null = null
        let byteLength = 0

        if (imagePart instanceof Blob) {
          imageBytes = new Uint8Array(await imagePart.arrayBuffer())
          mimeType = imagePart.type === '' ? null : imagePart.type
          byteLength = imagePart.size
        } else if (typeof imagePart === 'string' && imagePart.length > 0) {
          imageBytes = new TextEncoder().encode(imagePart)
          byteLength = imageBytes.byteLength
        }

        const dimensions =
          imageBytes === null ? null : readImageDimensions(imageBytes)

        const validation = validateScanRequest({
          hasImage: imageBytes !== null,
          mimeType,
          byteLength,
          dimensions,
          consent: typeof consent === 'string' ? consent : null,
          consentVersion:
            typeof consentVersion === 'string' ? consentVersion : null,
        })

        if (!validation.ok) {
          return apiError(
            validation.status,
            validation.code,
            validation.message,
          )
        }

        // Validation above guarantees both are present; narrow for the compiler.
        if (imageBytes === null || mimeType === null) {
          return apiError(400, 'MISSING_IMAGE', 'No image was provided.')
        }

        try {
          const outcome = await handleScan(imageBytes, mimeType)
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
            'SCAN_UNAVAILABLE',
            'Prescription scanning is unavailable right now. Search for medicines manually instead.',
          )
        }
      },
      ANY: (): Response => apiMethodNotAllowed(['POST']),
    },
  },
})
