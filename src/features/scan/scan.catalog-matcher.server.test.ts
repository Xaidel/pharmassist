import { describe, expect, it } from 'vitest'

import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import { createCatalogMatcher } from './scan.catalog-matcher.server'
import type { ScanRepository } from './scan.repository.server'

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

describe('createCatalogMatcher', () => {
  it('resolves a known active medicine id', async () => {
    const repository: ScanRepository = {
      readMedicines: () => Promise.resolve([medicine('POC-001')]),
      searchNames: () => Promise.resolve([]),
    }
    const matcher = createCatalogMatcher(repository)

    const result = await matcher.match('POC-001')

    expect(result.suggested?.medicine_id).toBe('POC-001')
    expect(result.other).toEqual([])
  })

  it('falls back to name search and offers alternatives', async () => {
    const repository: ScanRepository = {
      readMedicines: () => Promise.resolve([]),
      searchNames: () =>
        Promise.resolve([
          { medicine: medicine('POC-001'), score: 0.9 },
          { medicine: medicine('POC-036'), score: 0.6 },
        ]),
    }
    const matcher = createCatalogMatcher(repository)

    const result = await matcher.match('Amlodipine')

    expect(result.suggested?.medicine_id).toBe('POC-001')
    expect(result.other).toHaveLength(1)
    expect(result.other[0]?.medicine.medicine_id).toBe('POC-036')
    expect(result.other[0]?.confidence).toBe(0.6)
  })

  it('returns no suggestion when nothing matches', async () => {
    const repository: ScanRepository = {
      readMedicines: () => Promise.resolve([]),
      searchNames: () => Promise.resolve([]),
    }
    const matcher = createCatalogMatcher(repository)

    const result = await matcher.match('zzzz')

    expect(result.suggested).toBeNull()
    expect(result.other).toEqual([])
  })

  it('returns no suggestion for blank text', async () => {
    const repository: ScanRepository = {
      readMedicines: () => Promise.resolve([medicine('POC-001')]),
      searchNames: () => Promise.resolve([]),
    }
    const matcher = createCatalogMatcher(repository)

    expect(await matcher.match('   ')).toEqual({ suggested: null, other: [] })
  })
})
