import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import type { MedicineMatcher, ScanProvider } from './scan.port'
import { handleScan, validateScanRequest } from './scan.server'

function medicine(medicineId: string): MedicineSummary {
  return {
    medicine_id: medicineId,
    category: 'Test',
    brand_name: null,
    generic_name: medicineId,
    strength: '1 mg',
    dosage_form: 'Tablet',
    base_unit: 'tablet',
    manufacturer: null,
    rx_otc: 'Rx',
    pnf_listed: null,
    konsulta_listed: null,
  }
}

function validFields() {
  return {
    hasImage: true,
    mimeType: 'image/png',
    byteLength: 1024,
    dimensions: { width: 512, height: 512 },
    consent: 'true',
    consentVersion: 'poc-2026-10',
  }
}

describe('validateScanRequest', () => {
  it('accepts a valid request', () => {
    expect(validateScanRequest(validFields())).toEqual({ ok: true })
  })

  it('rejects a missing image', () => {
    const result = validateScanRequest({ ...validFields(), hasImage: false })
    expect(result).toMatchObject({ ok: false, code: 'MISSING_IMAGE' })
  })

  it('rejects a request without consent', () => {
    const result = validateScanRequest({ ...validFields(), consent: null })
    expect(result).toMatchObject({ ok: false, code: 'CONSENT_REQUIRED' })
  })

  it('rejects an unknown consent version', () => {
    const result = validateScanRequest({
      ...validFields(),
      consentVersion: 'poc-2020-01',
    })
    expect(result).toMatchObject({
      ok: false,
      code: 'CONSENT_VERSION_MISMATCH',
    })
  })

  it('rejects an unsupported image type', () => {
    const result = validateScanRequest({
      ...validFields(),
      mimeType: 'image/gif',
    })
    expect(result).toMatchObject({ ok: false, code: 'UNSUPPORTED_IMAGE_TYPE' })
  })

  it('rejects an oversized image', () => {
    const result = validateScanRequest({
      ...validFields(),
      byteLength: 9 * 1024 * 1024,
    })
    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' })
  })

  it('rejects an unreadable image', () => {
    const result = validateScanRequest({ ...validFields(), dimensions: null })
    expect(result).toMatchObject({ ok: false, code: 'INVALID_IMAGE' })
  })
})

describe('handleScan', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalScanProvider = process.env.SCAN_PROVIDER

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:5432/test'
    process.env.SCAN_PROVIDER = 'mock'
  })

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
    if (originalScanProvider === undefined) {
      delete process.env.SCAN_PROVIDER
    } else {
      process.env.SCAN_PROVIDER = originalScanProvider
    }
  })

  it('returns candidates with image_retained false and no vendor import', async () => {
    const provider: ScanProvider = {
      name: 'mock',
      recognize: () =>
        Promise.resolve({
          lines: [{ text: 'POC-001', confidence: 0.96 }],
          warnings: [],
          scriptId: 'sample-rx-a',
        }),
    }
    const matcher: MedicineMatcher = {
      match: (text) =>
        Promise.resolve({ suggested: medicine(text), other: [] }),
    }

    const outcome = await handleScan(new Uint8Array([1]), 'image/png', {
      provider,
      matcher,
    })

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) {
      return
    }
    expect(outcome.response.image_retained).toBe(false)
    expect(outcome.response.provider).toBe('mock')
    expect(outcome.response.mock_script_id).toBe('sample-rx-a')
    expect(outcome.response.items).toHaveLength(1)
    expect(outcome.response.items[0]?.suggested_medicine?.medicine_id).toBe(
      'POC-001',
    )
  })

  it('fails closed when cloud-vision is selected without the legal enablement', async () => {
    const previousProvider = process.env.SCAN_PROVIDER
    const previousEnabled = process.env.SCAN_CLOUD_VISION_ENABLED
    process.env.SCAN_PROVIDER = 'cloud-vision'
    delete process.env.SCAN_CLOUD_VISION_ENABLED

    try {
      const outcome = await handleScan(new Uint8Array([1]), 'image/png')
      expect(outcome.ok).toBe(false)
      if (outcome.ok) {
        return
      }
      expect(outcome.error.code).toBe('SCAN_UNAVAILABLE')
    } finally {
      if (previousProvider === undefined) {
        delete process.env.SCAN_PROVIDER
      } else {
        process.env.SCAN_PROVIDER = previousProvider
      }
      if (previousEnabled === undefined) {
        delete process.env.SCAN_CLOUD_VISION_ENABLED
      } else {
        process.env.SCAN_CLOUD_VISION_ENABLED = previousEnabled
      }
    }
  })
})
