import { describe, expect, it } from 'vitest'

import {
  reportRequestSchema,
  reportResponseSchema,
  reportSummaryQuerySchema,
} from './report.schema'

describe('reportRequestSchema', () => {
  it('accepts a report with and without a note', () => {
    expect(
      reportRequestSchema.parse({
        pharmacy_id: 'mercury-naga-penafrancia',
        medicine_ids: ['POC-001', 'POC-036'],
        reason: 'wrong_price',
        note: 'Shelf price is 120, not 100.',
      }),
    ).toMatchObject({ reason: 'wrong_price' })

    expect(
      reportRequestSchema.parse({
        pharmacy_id: 'mercury-naga-penafrancia',
        medicine_ids: ['POC-001'],
        reason: 'other',
      }).note,
    ).toBeUndefined()
  })

  it('accepts a client-supplied result_key so the server can ignore it', () => {
    expect(
      reportRequestSchema.parse({
        pharmacy_id: 'mercury-naga-penafrancia',
        medicine_ids: ['POC-001'],
        reason: 'wrong_details',
        result_key: 'client-supplied',
      }).result_key,
    ).toBe('client-supplied')
  })

  it('rejects duplicate medicines, too many items, a long note, and an unknown reason', () => {
    expect(
      reportRequestSchema.safeParse({
        pharmacy_id: 'mercury-naga-penafrancia',
        medicine_ids: ['POC-001', 'POC-001'],
        reason: 'wrong_price',
      }).success,
    ).toBe(false)
    expect(
      reportRequestSchema.safeParse({
        pharmacy_id: 'mercury-naga-penafrancia',
        medicine_ids: Array.from(
          { length: 11 },
          (_, index) => `POC-${String(index + 1).padStart(3, '0')}`,
        ),
        reason: 'wrong_price',
      }).success,
    ).toBe(false)
    expect(
      reportRequestSchema.safeParse({
        pharmacy_id: 'mercury-naga-penafrancia',
        medicine_ids: ['POC-001'],
        reason: 'wrong_price',
        note: 'x'.repeat(501),
      }).success,
    ).toBe(false)
    expect(
      reportRequestSchema.safeParse({
        pharmacy_id: 'mercury-naga-penafrancia',
        medicine_ids: ['POC-001'],
        reason: 'too_expensive',
      }).success,
    ).toBe(false)
  })
})

describe('reportResponseSchema', () => {
  it('accepts the contract response', () => {
    const response = {
      report_id: '9b2f',
      result_key: 'mercury-naga-penafrancia|POC-001,POC-036',
      status: 'open' as const,
      created_at: '2026-10-21T10:05:00Z',
      reported: true as const,
    }

    expect(reportResponseSchema.parse(response)).toEqual(response)
  })
})

describe('reportSummaryQuerySchema', () => {
  it('requires a result key within the stored length', () => {
    expect(
      reportSummaryQuerySchema.safeParse({
        result_key: 'mercury-naga-penafrancia|POC-001',
      }).success,
    ).toBe(true)
    expect(
      reportSummaryQuerySchema.safeParse({ result_key: null }).success,
    ).toBe(false)
    expect(
      reportSummaryQuerySchema.safeParse({ result_key: 'x'.repeat(513) })
        .success,
    ).toBe(false)
  })
})
