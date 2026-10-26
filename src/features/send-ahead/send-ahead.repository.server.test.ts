import type { QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'

import type { QueryRunner } from '#/lib/db.server'

import { createSendAheadRepository } from './send-ahead.repository.server'

const medicineRow = {
  medicine_id: 'POC-001',
  category: 'Cardiovascular',
  brand_name: 'Norvasc',
  generic_name: 'Amlodipine',
  strength: '5 mg',
  dosage_form: 'Tablet',
  base_unit: 'tablet',
  manufacturer: 'Viatris',
  rx_otc: 'Rx',
  pnf_listed: true,
  konsulta_listed: true,
}

function recordingQuery(
  calls: { text: string; values: readonly unknown[] }[],
  resolve: (text: string) => readonly QueryResultRow[],
): QueryRunner {
  return <Row extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<Row[]> => {
    calls.push({ text, values })
    return Promise.resolve(resolve(text) as unknown as Row[])
  }
}

describe('createSendAheadRepository', () => {
  it('reads the pharmacy snapshot and returns null when it is unknown', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createSendAheadRepository(
      recordingQuery(calls, () => [
        {
          pharmacy_id: 'mercury-naga-penafrancia',
          name: 'Mercury Drug - Naga City Penafrancia',
          mobile: '+639688787678',
        },
      ]),
    )

    await expect(
      repository.readPharmacy('mercury-naga-penafrancia'),
    ).resolves.toEqual({
      pharmacy_id: 'mercury-naga-penafrancia',
      name: 'Mercury Drug - Naga City Penafrancia',
      mobile: '+639688787678',
    })
    expect(calls[0]?.text).toContain('from pharmacy')
    expect(calls[0]?.values).toEqual(['mercury-naga-penafrancia'])

    const empty = createSendAheadRepository(recordingQuery([], () => []))
    await expect(empty.readPharmacy('missing')).resolves.toBeNull()
  })

  it('reads active medicines for the list snapshot', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createSendAheadRepository(
      recordingQuery(calls, () => [medicineRow]),
    )

    await expect(repository.readMedicines(['POC-001'])).resolves.toEqual([
      medicineRow,
    ])
    expect(calls[0]?.text).toContain('from medicine')
    expect(calls[0]?.text).toContain('active')
    expect(calls[0]?.values).toEqual([['POC-001']])
  })

  it('inserts the reservation snapshot and returns the stored lifecycle fields', async () => {
    const calls: { text: string; values: readonly unknown[] }[] = []
    const repository = createSendAheadRepository(
      recordingQuery(calls, () => [
        {
          reference_code: 'SA-ABC123',
          status: 'created',
          created_at: '2026-10-27T08:30:00Z',
          expires_at: '2026-10-28T08:30:00Z',
        },
      ]),
    )

    const createdAt = new Date('2026-10-27T08:30:00.000Z')
    const expiresAt = new Date('2026-10-28T08:30:00.000Z')
    const stored = await repository.createReservation({
      pharmacyId: 'mercury-naga-penafrancia',
      pharmacyName: 'Mercury Drug - Naga City Penafrancia',
      medicineIds: ['POC-001'],
      medicineLabels: ['Norvasc 5 mg Tablet'],
      quantities: [5],
      referenceCode: 'SA-ABC123',
      createdAt,
      expiresAt,
    })

    expect(stored).toEqual({
      reference_code: 'SA-ABC123',
      status: 'created',
      created_at: '2026-10-27T08:30:00Z',
      expires_at: '2026-10-28T08:30:00Z',
    })
    expect(calls[0]?.text).toContain('insert into send_ahead')
    expect(calls[0]?.values).toEqual([
      'SA-ABC123',
      'mercury-naga-penafrancia',
      'Mercury Drug - Naga City Penafrancia',
      ['POC-001'],
      ['Norvasc 5 mg Tablet'],
      ['5.000'],
      createdAt,
      expiresAt,
    ])
  })

  it('rejects an inserted row that does not match the schema', async () => {
    const repository = createSendAheadRepository(
      recordingQuery([], () => [
        {
          reference_code: 'SA-ABC123',
          status: 'unknown',
          created_at: '2026-10-27T08:30:00Z',
          expires_at: '2026-10-28T08:30:00Z',
        },
      ]),
    )

    await expect(
      repository.createReservation({
        pharmacyId: 'mercury-naga-penafrancia',
        pharmacyName: 'Mercury Drug',
        medicineIds: ['POC-001'],
        medicineLabels: ['Norvasc 5 mg Tablet'],
        quantities: [5],
        referenceCode: 'SA-ABC123',
        createdAt: new Date(),
        expiresAt: new Date(),
      }),
    ).rejects.toThrow()
  })
})
