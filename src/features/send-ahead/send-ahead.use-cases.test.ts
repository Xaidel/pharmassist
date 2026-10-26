import { describe, expect, it } from 'vitest'

import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import type {
  CreateReservationInput,
  ReservationPharmacy,
  SendAheadStore,
  StoredReservation,
} from './send-ahead.port'
import {
  createSendAhead,
  type CreateSendAheadInput,
} from './send-ahead.use-cases'

const PHARMACY: ReservationPharmacy = {
  pharmacy_id: 'mercury-naga-penafrancia',
  name: 'Mercury Drug - Naga City Penafrancia',
  mobile: '+639688787678',
}

function medicine(
  medicineId: string,
  overrides: Partial<MedicineSummary> = {},
): MedicineSummary {
  return {
    medicine_id: medicineId,
    category: 'Test',
    brand_name: `Brand ${medicineId}`,
    generic_name: `${medicineId} generic`,
    strength: '5 mg',
    dosage_form: 'Tablet',
    base_unit: 'tablet',
    manufacturer: 'Test Labs',
    rx_otc: 'Rx',
    pnf_listed: true,
    konsulta_listed: true,
    ...overrides,
  }
}

type Recorded = {
  pharmacyReads: string[]
  medicineReads: (readonly string[])[]
  created: CreateReservationInput[]
}

function fakeStore(
  options: {
    pharmacy?: ReservationPharmacy | null
    medicines?: readonly MedicineSummary[]
    stored?: StoredReservation
  } = {},
): { store: SendAheadStore; recorded: Recorded } {
  const recorded: Recorded = {
    pharmacyReads: [],
    medicineReads: [],
    created: [],
  }
  const store: SendAheadStore = {
    readPharmacy: (pharmacyId) => {
      recorded.pharmacyReads.push(pharmacyId)
      return Promise.resolve(
        options.pharmacy === undefined ? PHARMACY : options.pharmacy,
      )
    },
    readMedicines: (medicineIds) => {
      recorded.medicineReads.push(medicineIds)
      return Promise.resolve([...(options.medicines ?? [])])
    },
    createReservation: (input) => {
      recorded.created.push(input)
      return Promise.resolve(
        options.stored ?? {
          reference_code: input.referenceCode,
          status: 'created',
          created_at: input.createdAt.toISOString(),
          expires_at: input.expiresAt.toISOString(),
        },
      )
    },
  }
  return { store, recorded }
}

const NOW = new Date('2026-10-27T08:30:00.000Z')

function deps(store: SendAheadStore) {
  return {
    store,
    generateReferenceCode: () => 'SA-ABC123',
    now: () => NOW,
    expiresAt: (createdAt: Date) =>
      new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
  }
}

function validInput(
  items: CreateSendAheadInput['items'] = [
    { medicine_id: 'POC-001', quantity: 5, unit: 'tablet' },
  ],
): CreateSendAheadInput {
  return { pharmacyId: PHARMACY.pharmacy_id, items }
}

describe('createSendAhead', () => {
  it('snapshots the pharmacy and sorted list and returns the stored slip', async () => {
    const { store, recorded } = fakeStore({
      medicines: [
        medicine('POC-036', {
          brand_name: 'Biogesic',
          strength: '500 mg',
          dosage_form: 'Tablet',
        }),
        medicine('POC-001', {
          brand_name: 'Norvasc',
          strength: '5 mg',
          dosage_form: 'Tablet',
        }),
      ],
    })

    const outcome = await createSendAhead(
      deps(store),
      validInput([
        { medicine_id: 'POC-036', quantity: 10, unit: 'tablet' },
        { medicine_id: 'POC-001', quantity: 5, unit: 'tablet' },
      ]),
    )

    expect(outcome).toEqual({
      ok: true,
      response: {
        reference_code: 'SA-ABC123',
        pharmacy_name: PHARMACY.name,
        pharmacy_mobile: PHARMACY.mobile,
        items: [
          {
            medicine_id: 'POC-001',
            label: 'Norvasc 5 mg Tablet',
            quantity: 5,
            unit: 'tablet',
          },
          {
            medicine_id: 'POC-036',
            label: 'Biogesic 500 mg Tablet',
            quantity: 10,
            unit: 'tablet',
          },
        ],
        expires_at: '2026-10-28T08:30:00.000Z',
        status: 'created',
      },
    })
    expect(recorded.created).toHaveLength(1)
    expect(recorded.created[0]).toMatchObject({
      pharmacyId: PHARMACY.pharmacy_id,
      pharmacyName: PHARMACY.name,
      medicineIds: ['POC-001', 'POC-036'],
      medicineLabels: ['Norvasc 5 mg Tablet', 'Biogesic 500 mg Tablet'],
      quantities: [5, 10],
      referenceCode: 'SA-ABC123',
      createdAt: NOW,
      expiresAt: new Date('2026-10-28T08:30:00.000Z'),
    })
  })

  it('rejects an empty list', async () => {
    const { store } = fakeStore()
    await expect(
      createSendAhead(deps(store), validInput([])),
    ).resolves.toMatchObject({
      ok: false,
      error: { status: 400, code: 'INVALID_REQUEST' },
    })
  })

  it('rejects more than ten items and duplicate medicines', async () => {
    const { store } = fakeStore()
    const tooMany = Array.from({ length: 11 }, (_, index) => ({
      medicine_id: `POC-${String(index + 1).padStart(3, '0')}`,
      quantity: 1,
      unit: 'tablet',
    }))

    await expect(
      createSendAhead(deps(store), validInput(tooMany)),
    ).resolves.toMatchObject({
      ok: false,
      error: { status: 422, code: 'BASKET_TOO_LARGE' },
    })
    await expect(
      createSendAhead(
        deps(store),
        validInput([
          { medicine_id: 'POC-001', quantity: 1, unit: 'tablet' },
          { medicine_id: 'POC-001', quantity: 2, unit: 'tablet' },
        ]),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { status: 422, code: 'DUPLICATE_MEDICINE' },
    })
  })

  it('rejects an unknown pharmacy', async () => {
    const { store } = fakeStore({ pharmacy: null })
    await expect(
      createSendAhead(deps(store), validInput()),
    ).resolves.toMatchObject({
      ok: false,
      error: { status: 404, code: 'UNKNOWN_PHARMACY' },
    })
  })

  it('rejects unknown medicines, a mismatched unit, and an invalid quantity', async () => {
    const medicineStore = fakeStore({
      medicines: [medicine('POC-001')],
    })
    await expect(
      createSendAhead(
        deps(medicineStore.store),
        validInput([{ medicine_id: 'POC-999', quantity: 1, unit: 'tablet' }]),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { status: 422, code: 'UNKNOWN_MEDICINE' },
    })

    await expect(
      createSendAhead(
        deps(medicineStore.store),
        validInput([{ medicine_id: 'POC-001', quantity: 1, unit: 'capsule' }]),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { status: 422, code: 'INVALID_UNIT' },
    })

    await expect(
      createSendAhead(
        deps(medicineStore.store),
        validInput([{ medicine_id: 'POC-001', quantity: 1.5, unit: 'tablet' }]),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { status: 422, code: 'INVALID_QUANTITY' },
    })
  })
})
