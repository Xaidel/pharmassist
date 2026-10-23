import { randomUUID } from 'node:crypto'

import { readServerConfig } from '#/lib/config.server'
import { queryRows } from '#/lib/db.server'

import { createCatalogMatcher } from './scan.catalog-matcher.server'
import { createCloudVisionScanProvider } from './scan.cloud-vision.server'
import {
  SCAN_ACCEPTED_MIME_TYPES,
  SCAN_CONSENT_VERSION,
  SCAN_IMAGE_MAX_BYTES,
  SCAN_IMAGE_MAX_DIMENSION,
  SCAN_IMAGE_MIN_DIMENSION,
} from './scan.domain'
import type { ImageDimensions } from './scan.image'
import { createMockScanProvider } from './scan.mock.server'
import type { MedicineMatcher, ScanProvider } from './scan.port'
import { createScanRepository } from './scan.repository.server'
import { scanResponseSchema, type ScanResponse } from './scan.schema'
import { recognizePrescription } from './scan.use-cases'

const repository = createScanRepository(queryRows)

/** A scan failure the route renders as the shared API envelope. */
export type ScanFailure = {
  status: number
  code: string
  message: string
}

/** The outcome of recognizing one prescription image. */
export type ScanOutcome =
  { ok: true; response: ScanResponse } | { ok: false; error: ScanFailure }

/** The raw multipart fields the route extracted, before validation. */
export type ScanRequestFields = {
  hasImage: boolean
  mimeType: string | null
  byteLength: number
  dimensions: ImageDimensions | null
  consent: string | null
  consentVersion: string | null
}

/** The validation result the route renders as an API envelope. */
export type ScanRequestValidation =
  { ok: true } | { ok: false; status: number; code: string; message: string }

/**
 * Validate the consent and image fields the route read from the multipart body.
 *
 * The check order mirrors the data contract's error catalogue: missing image,
 * consent, consent version, then image type, size, and dimensions. No image or
 * extracted text is read beyond this boundary; nothing is retained.
 */
export function validateScanRequest(
  fields: ScanRequestFields,
): ScanRequestValidation {
  if (!fields.hasImage) {
    return {
      ok: false,
      status: 400,
      code: 'MISSING_IMAGE',
      message: 'No image was provided.',
    }
  }
  if (fields.consent !== 'true') {
    return {
      ok: false,
      status: 422,
      code: 'CONSENT_REQUIRED',
      message: 'Scanning a prescription needs your consent.',
    }
  }
  if (fields.consentVersion !== SCAN_CONSENT_VERSION) {
    return {
      ok: false,
      status: 422,
      code: 'CONSENT_VERSION_MISMATCH',
      message: 'The consent notice changed. Review it and try again.',
    }
  }
  if (
    fields.mimeType === null ||
    !(SCAN_ACCEPTED_MIME_TYPES as readonly string[]).includes(fields.mimeType)
  ) {
    return {
      ok: false,
      status: 415,
      code: 'UNSUPPORTED_IMAGE_TYPE',
      message: 'Use a JPEG, PNG, or WebP image.',
    }
  }
  if (fields.byteLength > SCAN_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      status: 413,
      code: 'IMAGE_TOO_LARGE',
      message: 'The image is larger than 8 MB.',
    }
  }
  if (fields.dimensions === null) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_IMAGE',
      message: 'The image could not be read. Use a clear JPEG, PNG, or WebP.',
    }
  }
  if (
    fields.dimensions.width > SCAN_IMAGE_MAX_DIMENSION ||
    fields.dimensions.height > SCAN_IMAGE_MAX_DIMENSION
  ) {
    return {
      ok: false,
      status: 413,
      code: 'IMAGE_TOO_LARGE',
      message: 'The image is larger than 4096 × 4096 pixels.',
    }
  }
  if (
    fields.dimensions.width < SCAN_IMAGE_MIN_DIMENSION ||
    fields.dimensions.height < SCAN_IMAGE_MIN_DIMENSION
  ) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_IMAGE',
      message: 'The image is too small to read (at least 320 × 320 pixels).',
    }
  }
  return { ok: true }
}

/** Optional collaborators injected by tests; production uses the composition root. */
export type ScanDeps = {
  provider?: ScanProvider
  matcher?: MedicineMatcher
}

/**
 * Recognize a prescription image behind the provider port.
 *
 * The composition root selects the adapter from validated configuration. The
 * POC stays on the mock. Cloud Vision is selected only when `SCAN_PROVIDER` is
 * `cloud-vision` and the reviewed enablement flag is true; any other state
 * fails closed, so a real prescription image cannot reach the vendor without
 * the legal gate clearing. The route owns validation; this owns the recognition.
 */
export async function handleScan(
  image: Uint8Array,
  mimeType: string,
  deps: ScanDeps = {},
): Promise<ScanOutcome> {
  const config = readServerConfig()

  let provider = deps.provider
  if (provider === undefined) {
    if (config.scanProvider === 'mock') {
      provider = createMockScanProvider()
    } else if (config.scanCloudVisionEnabled) {
      // `scanProvider` is the `cloud-vision` member of the union here.
      provider = createCloudVisionScanProvider()
    }
  }

  if (provider === undefined) {
    return {
      ok: false,
      error: {
        status: 503,
        code: 'SCAN_UNAVAILABLE',
        message:
          'Prescription scanning is unavailable right now. Search for medicines manually instead.',
      },
    }
  }

  const matcher = deps.matcher ?? createCatalogMatcher(repository)

  try {
    const result = await recognizePrescription(
      { provider, matcher },
      { image, mimeType },
    )
    const response = scanResponseSchema.parse({
      scan_id: randomUUID(),
      provider: provider.name,
      ...(result.scriptId === undefined
        ? {}
        : { mock_script_id: result.scriptId }),
      items: result.candidates,
      warnings: result.warnings,
      image_retained: false,
      processed_at: new Date().toISOString(),
    })
    return { ok: true, response }
  } catch {
    return {
      ok: false,
      error: {
        status: 503,
        code: 'SCAN_UNAVAILABLE',
        message:
          'Prescription scanning is unavailable right now. Search for medicines manually instead.',
      },
    }
  }
}
