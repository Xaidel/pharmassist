import type { QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'

import type { QueryRunner } from '#/lib/db.server'

import { STALE_AFTER_DAYS } from './results.domain'
import { createResultsRepository } from './results.repository.server'

const priceRow = {
  medicine_id: 'POC-016',
  pharmacy_id: 'mercury-naga-penafrancia',
  sale_form: 'pack',
  sale_state: 'available',
  form_label: 'Box of 28 tablets',
  shelf_price_php: 980,
  pack_quantity: 28,
  pack_unit: 'tablet',
  stock_status: 'in_stock',
  verified_at: '2026-10-20T00:00:00Z',
  stale: false,
  mdrp_entry_id: 'EO104-044',
  mdrp_order: 'EO 104 s. 2020',
  mdrp_annex_row: 44,
  mdrp_ceiling_php: 30.31,
  mdrp_ceiling_basis: 'per_unit',
  mdrp_ceiling_unit: 'tablet',
  mdrp_vat_exclusive: true,
  mdrp_vat_exempt: true,
  mdrp_effective_ceiling_php: 30.31,
  mdrp_source_url: 'https://example.test',
  mdrp_checked_at: '2026-10-21',
  mdrp_observed_rate_php: 35,
  mdrp_rate_basis: 'box_rate',
  above_mdrp_flag: true,
}

const pharmacyRow = {
  pharmacy_id: 'mercury-naga-penafrancia',
  name: 'Mercury Drug - Naga City Penafrancia',
  brand: 'Mercury Drug',
  type: 'chain',
  address: 'Panganiban St., Naga City',
  barangay: 'Dinaga',
  latitude: 13.623234,
  longitude: 123.185995,
  phone: null,
  hours_text: '24 hours',
  opening_hours: null,
  open_24h: true,
  verification_status: 'verified',
}

function recordingQuery(
  calls: { text: string; values: readonly unknown[] }[],
  rows: readonly QueryResultRow[],
): QueryRunner {
  return <Row extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<Row[]> => {
    calls.push({ text, values })
    return Promise.resolve(rows as unknown as Row[])
  }
}

describe('createResultsRepository', () => {
  it('reads prices through the MDRP view and passes the stale window', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createResultsRepository(
      recordingQuery(calls, [priceRow]),
    )

    const prices = await repository.readPrices(['POC-016'])

    expect(prices).toHaveLength(1)
    expect(prices[0]?.mdrp).toMatchObject({
      entry_id: 'EO104-044',
      ceiling_php: 30.31,
      above: true,
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.text).toContain('price_observation_with_mdrp')
    expect(calls[0]?.values).toEqual([['POC-016'], STALE_AFTER_DAYS])
  })

  it('reads pharmacy identity and structured hours', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createResultsRepository(
      recordingQuery(calls, [pharmacyRow]),
    )

    const pharmacies = await repository.readPharmacies()

    expect(pharmacies[0]).toMatchObject({
      pharmacy_id: 'mercury-naga-penafrancia',
      open_24h: true,
      latitude: 13.623234,
    })
    expect(calls[0]?.text).toContain('from pharmacy')
  })

  it('skips the report query when there are no result keys', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createResultsRepository(recordingQuery(calls, []))

    await expect(repository.readReports([])).resolves.toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('rejects a price row that does not match the contract', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createResultsRepository(
      recordingQuery(calls, [{ ...priceRow, shelf_price_php: '980' }]),
    )

    await expect(repository.readPrices(['POC-016'])).rejects.toThrow()
  })

  it('reads one pharmacy by id and returns null when it is unknown', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createResultsRepository(
      recordingQuery(calls, [pharmacyRow]),
    )

    await expect(
      repository.readPharmacy('mercury-naga-penafrancia'),
    ).resolves.toMatchObject({
      pharmacy_id: 'mercury-naga-penafrancia',
      open_24h: true,
    })
    expect(calls[0]?.text).toContain('where id = $1')

    const empty = createResultsRepository(recordingQuery([], []))
    await expect(empty.readPharmacy('missing')).resolves.toBeNull()
  })

  it('reads the full price list for one pharmacy through the MDRP view', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createResultsRepository(
      recordingQuery(calls, [priceRow]),
    )

    const prices = await repository.readPharmacyPrices(
      'mercury-naga-penafrancia',
    )

    expect(prices[0]?.mdrp?.entry_id).toBe('EO104-044')
    expect(calls[0]?.text).toContain('price_observation_with_mdrp')
    expect(calls[0]?.text).toContain('join medicine')
    expect(calls[0]?.values).toEqual([
      'mercury-naga-penafrancia',
      STALE_AFTER_DAYS,
    ])
  })

  it('inserts an immutable report snapshot and returns its public fields', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createResultsRepository(
      recordingQuery(calls, [
        {
          report_id: '9b2f',
          status: 'open',
          created_at: '2026-10-21T10:05:00Z',
        },
      ]),
    )

    const created = await repository.createReport({
      resultKey: 'mercury-naga-penafrancia|POC-001',
      pharmacyId: 'mercury-naga-penafrancia',
      pharmacyName: 'Mercury Drug',
      medicineIds: ['POC-001'],
      medicineLabels: ['Norvasc 5 mg Tablet'],
      reason: 'wrong_price',
      note: 'Shelf price differs.',
    })

    expect(created).toEqual({
      report_id: '9b2f',
      status: 'open',
      created_at: '2026-10-21T10:05:00Z',
    })
    expect(calls[0]?.text).toContain('insert into price_report')
    expect(calls[0]?.values).toEqual([
      'mercury-naga-penafrancia|POC-001',
      'mercury-naga-penafrancia',
      'Mercury Drug',
      ['POC-001'],
      ['Norvasc 5 mg Tablet'],
      'wrong_price',
      'Shelf price differs.',
    ])
  })

  it('returns a zero report summary when a result has no reports', async () => {
    const repository = createResultsRepository(recordingQuery([], []))
    await expect(
      repository.readReportSummary('mercury-naga-penafrancia|POC-001'),
    ).resolves.toEqual({ count: 0, latest: null })
  })

  it('returns the latest public report summary without its note', async () => {
    const repository = createResultsRepository(
      recordingQuery(
        [],
        [
          {
            count: 2,
            report_id: '9b2f',
            reason: 'wrong_stock',
            status: 'open',
            created_at: '2026-10-21T10:05:00Z',
          },
        ],
      ),
    )

    await expect(
      repository.readReportSummary('mercury-naga-penafrancia|POC-001'),
    ).resolves.toEqual({
      count: 2,
      latest: {
        report_id: '9b2f',
        reason: 'wrong_stock',
        status: 'open',
        created_at: '2026-10-21T10:05:00Z',
      },
    })
  })
})
