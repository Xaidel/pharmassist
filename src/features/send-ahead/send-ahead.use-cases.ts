import type { BaseUnit } from '#/shared/domain/medicine-summary'

import {
  isCountableUnit,
  isValidQuantity,
  SEND_AHEAD_MAX_ITEMS,
  SEND_AHEAD_MAX_QUANTITY,
} from './send-ahead.domain'
import type { SendAheadStore } from './send-ahead.port'
import type { SendAheadResponse } from './send-ahead.schema'

/** The failure codes the send-ahead endpoint can report. */
export type SendAheadFailureCode =
  | 'INVALID_REQUEST'
  | 'UNKNOWN_PHARMACY'
  | 'UNKNOWN_MEDICINE'
  | 'DUPLICATE_MEDICINE'
  | 'BASKET_TOO_LARGE'
  | 'INVALID_UNIT'
  | 'INVALID_QUANTITY'

/** A send-ahead failure the route renders as the shared API envelope. */
export type SendAheadFailure = {
  status: 400 | 404 | 422
  code: SendAheadFailureCode
  message: string
  details?: unknown
}

/** The outcome of creating one send-ahead reservation. */
export type CreateSendAheadOutcome =
  | { ok: true; response: SendAheadResponse }
  | { ok: false; error: SendAheadFailure }

/** The collaborators the create use case receives from the composition root. */
export type CreateSendAheadDeps = {
  store: SendAheadStore
  generateReferenceCode: () => string
  now: () => Date
  expiresAt: (createdAt: Date) => Date
}

/** The request values the create use case receives. */
export type CreateSendAheadInput = {
  pharmacyId: string
  items: readonly {
    medicine_id: string
    quantity: number
    unit?: string | undefined
  }[]
}

function fail(
  status: SendAheadFailure['status'],
  code: SendAheadFailureCode,
  message: string,
  details?: unknown,
): { ok: false; error: SendAheadFailure } {
  const error: SendAheadFailure = { status, code, message }
  if (details !== undefined) {
    error.details = details
  }
  return { ok: false, error }
}

function labelFor(medicine: {
  brand_name: string | null
  generic_name: string
  strength: string
  dosage_form: string
}): string {
  const primaryName = medicine.brand_name ?? medicine.generic_name
  return `${primaryName} ${medicine.strength} ${medicine.dosage_form}`
}

function compareIds(left: string, right: string): number {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

/**
 * Validate a list, snapshot the pharmacy and list, and store a reservation.
 *
 * The list is validated exactly as the basket is: at most 10 unique, active
 * medicines at base-unit quantities within the sanity ceiling. The pharmacy and
 * list are snapshotted with no foreign keys, so a seed wipe cannot orphan the
 * reservation. The reference code and expiry are generated here, not in the
 * store, so the use case is deterministic under an injected clock and random
 * source.
 */
export async function createSendAhead(
  deps: CreateSendAheadDeps,
  input: CreateSendAheadInput,
): Promise<CreateSendAheadOutcome> {
  if (input.items.length === 0) {
    return fail(
      400,
      'INVALID_REQUEST',
      'A send-ahead request needs at least one medicine.',
    )
  }
  if (input.items.length > SEND_AHEAD_MAX_ITEMS) {
    return fail(
      422,
      'BASKET_TOO_LARGE',
      `A list cannot contain more than ${String(SEND_AHEAD_MAX_ITEMS)} items.`,
    )
  }

  const ids = input.items.map((item) => item.medicine_id)
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicates.length > 0) {
    return fail(
      422,
      'DUPLICATE_MEDICINE',
      'A list cannot contain the same medicine twice.',
      { medicine_ids: [...new Set(duplicates)] },
    )
  }

  const pharmacy = await deps.store.readPharmacy(input.pharmacyId)
  if (pharmacy === null) {
    return fail(
      404,
      'UNKNOWN_PHARMACY',
      'That pharmacy is not in the seeded directory.',
    )
  }

  const medicines = await deps.store.readMedicines(ids)
  const medicineById = new Map(
    medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const unknown = ids.filter((id) => !medicineById.has(id))
  if (unknown.length > 0) {
    return fail(
      422,
      'UNKNOWN_MEDICINE',
      'One or more medicines do not exist or are inactive.',
      { medicine_ids: [...new Set(unknown)] },
    )
  }

  const lines: {
    medicine_id: string
    label: string
    quantity: number
    unit: BaseUnit
  }[] = []
  for (const item of input.items) {
    const medicine = medicineById.get(item.medicine_id)
    if (medicine === undefined) {
      throw new Error(`Missing medicine ${item.medicine_id} after validation`)
    }
    if (item.unit === undefined || item.unit !== medicine.base_unit) {
      return fail(
        422,
        'INVALID_UNIT',
        `The unit must match the medicine's base unit (${medicine.base_unit}).`,
        {
          medicine_id: item.medicine_id,
          expected_unit: medicine.base_unit,
        },
      )
    }
    if (!isValidQuantity(item.quantity, medicine.base_unit)) {
      return fail(
        422,
        'INVALID_QUANTITY',
        isCountableUnit(medicine.base_unit)
          ? `The quantity must be a positive whole number of ${medicine.base_unit}s up to ${String(SEND_AHEAD_MAX_QUANTITY)}.`
          : `The quantity must be positive, have at most three decimal places, and not exceed ${String(SEND_AHEAD_MAX_QUANTITY)}.`,
        { medicine_id: item.medicine_id, unit: medicine.base_unit },
      )
    }
    lines.push({
      medicine_id: item.medicine_id,
      label: labelFor(medicine),
      quantity: item.quantity,
      unit: medicine.base_unit,
    })
  }

  lines.sort((left, right) => compareIds(left.medicine_id, right.medicine_id))

  const referenceCode = deps.generateReferenceCode()
  const createdAt = deps.now()
  const expiresAt = deps.expiresAt(createdAt)

  const stored = await deps.store.createReservation({
    pharmacyId: pharmacy.pharmacy_id,
    pharmacyName: pharmacy.name,
    medicineIds: lines.map((line) => line.medicine_id),
    medicineLabels: lines.map((line) => line.label),
    quantities: lines.map((line) => line.quantity),
    referenceCode,
    createdAt,
    expiresAt,
  })

  return {
    ok: true,
    response: {
      reference_code: stored.reference_code,
      pharmacy_name: pharmacy.name,
      pharmacy_mobile: pharmacy.mobile,
      items: lines.map((line) => ({
        medicine_id: line.medicine_id,
        label: line.label,
        quantity: line.quantity,
        unit: line.unit,
      })),
      expires_at: stored.expires_at,
      status: 'created',
    },
  }
}
