import { describe, expect, it } from 'vitest'

import {
  sendAheadRequestSchema,
  sendAheadResponseSchema,
  storedReservationSchema,
} from './send-ahead.schema'

describe('sendAheadRequestSchema', () => {
  it('accepts a valid pharmacy and list', () => {
    expect(
      sendAheadRequestSchema.parse({
        pharmacy_id: 'mercury-naga-penafrancia',
        items: [
          { medicine_id: 'POC-001', quantity: 5, unit: 'tablet' },
          { medicine_id: 'POC-036', quantity: 2.5, unit: 'mL' },
        ],
      }),
    ).toMatchObject({ pharmacy_id: 'mercury-naga-penafrancia' })
  })

  it('rejects empty lists, unknown fields, and patient details', () => {
    expect(
      sendAheadRequestSchema.safeParse({
        pharmacy_id: 'mercury-naga-penafrancia',
        items: [],
      }).success,
    ).toBe(false)
    expect(
      sendAheadRequestSchema.safeParse({
        pharmacy_id: 'mercury-naga-penafrancia',
        items: [{ medicine_id: 'POC-001', quantity: 1, unit: 'tablet' }],
        patient_name: 'Ada',
      }).success,
    ).toBe(false)
    expect(
      sendAheadRequestSchema.safeParse({
        pharmacy_id: 'mercury-naga-penafrancia',
        items: [
          {
            medicine_id: 'POC-001',
            quantity: 1,
            unit: 'tablet',
            phone: '09170000000',
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('accepts more than ten items so the use case can return its list error', () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      medicine_id: `POC-${String(index + 1).padStart(3, '0')}`,
      quantity: 1,
      unit: 'tablet',
    }))
    expect(
      sendAheadRequestSchema.safeParse({
        pharmacy_id: 'mercury-naga-penafrancia',
        items,
      }).success,
    ).toBe(true)
  })
})

describe('sendAheadResponseSchema', () => {
  it('accepts the contract response with and without a mobile number', () => {
    const base = {
      reference_code: 'SA-ABC123',
      pharmacy_name: 'Mercury Drug',
      pharmacy_mobile: '+639688787678',
      items: [
        {
          medicine_id: 'POC-001',
          label: 'Norvasc 5 mg Tablet',
          quantity: 5,
          unit: 'tablet' as const,
        },
      ],
      expires_at: '2026-10-28T08:30:00Z',
      status: 'created' as const,
    }

    expect(sendAheadResponseSchema.parse(base)).toEqual(base)
    expect(
      sendAheadResponseSchema.parse({ ...base, pharmacy_mobile: null })
        .pharmacy_mobile,
    ).toBeNull()
  })
})

describe('storedReservationSchema', () => {
  it('accepts the stored lifecycle fields only', () => {
    expect(
      storedReservationSchema.parse({
        reference_code: 'SA-ABC123',
        status: 'created',
        created_at: '2026-10-27T08:30:00Z',
        expires_at: '2026-10-28T08:30:00Z',
      }),
    ).toMatchObject({ status: 'created' })
  })
})
