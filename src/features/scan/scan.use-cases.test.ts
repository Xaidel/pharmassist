import { describe, expect, it } from 'vitest'

import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import type { MedicineMatcher, ScanProvider } from './scan.port'
import { recognizePrescription } from './scan.use-cases'

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

describe('recognizePrescription', () => {
  it('resolves each line and flags low confidence', async () => {
    const provider: ScanProvider = {
      name: 'fake',
      recognize: () =>
        Promise.resolve({
          lines: [
            { text: 'POC-001', confidence: 0.96 },
            { text: 'POC-025', confidence: 0.41 },
          ],
          warnings: [],
        }),
    }
    const matcher: MedicineMatcher = {
      match: (text) =>
        Promise.resolve({ suggested: medicine(text), other: [] }),
    }

    const result = await recognizePrescription(
      { provider, matcher },
      { image: new Uint8Array(), mimeType: 'image/png' },
    )

    expect(result.candidates).toHaveLength(2)
    expect(result.candidates[0]).toMatchObject({
      line_no: 1,
      low_confidence: false,
      suggested_medicine: { medicine_id: 'POC-001' },
    })
    expect(result.candidates[1]).toMatchObject({
      line_no: 2,
      low_confidence: true,
      suggested_medicine: { medicine_id: 'POC-025' },
    })
    expect(result.warnings).toEqual(['LOW_CONFIDENCE_ITEM'])
  })

  it('flags NO_MATCH when a line cannot be resolved', async () => {
    const provider: ScanProvider = {
      name: 'fake',
      recognize: () =>
        Promise.resolve({
          lines: [{ text: 'UNKNOWN', confidence: 0.9 }],
          warnings: [],
        }),
    }
    const matcher: MedicineMatcher = {
      match: () => Promise.resolve({ suggested: null, other: [] }),
    }

    const result = await recognizePrescription(
      { provider, matcher },
      { image: new Uint8Array(), mimeType: 'image/png' },
    )

    expect(result.candidates[0]?.suggested_medicine).toBeNull()
    expect(result.warnings).toEqual(['NO_MATCH'])
  })

  it('deduplicates warnings and carries the provider script id through', async () => {
    const provider: ScanProvider = {
      name: 'fake',
      recognize: () =>
        Promise.resolve({
          lines: [
            { text: 'POC-001', confidence: 0.5 },
            { text: 'POC-002', confidence: 0.5 },
          ],
          warnings: ['DEFAULT_SCRIPT'],
          scriptId: 'default',
        }),
    }
    const matcher: MedicineMatcher = {
      match: (text) =>
        Promise.resolve({ suggested: medicine(text), other: [] }),
    }

    const result = await recognizePrescription(
      { provider, matcher },
      { image: new Uint8Array(), mimeType: 'image/png' },
    )

    expect(result.scriptId).toBe('default')
    expect(result.warnings).toEqual(['DEFAULT_SCRIPT', 'LOW_CONFIDENCE_ITEM'])
  })
})
