import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  buildPharmacyBasket,
  BASKET_MAX_ITEMS,
  type BasketLine,
  type BasketMedicine,
  type PharmacyBasketOutcome,
  type StoredFormOffer,
} from './results.domain'

/** Most basket medicine IDs one pharmacy-detail request may carry. */
export const DETAIL_MAX_MEDICINES = BASKET_MAX_ITEMS

/** The stable character rule for a medicine ID. */
const MEDICINE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

/** Inputs the detail basket decision needs, with all I/O already performed. */
export type BuildDetailBasketInput = {
  medicineIds: readonly string[]
  medicines: readonly MedicineSummary[]
  forms: readonly StoredFormOffer[]
}

/** Failures the pharmacy-detail query parser can report. */
export type DetailQueryFailureCode = 'INVALID_REQUEST' | 'INVALID_ORIGIN'

/** The validated query values the pharmacy-detail endpoint accepts. */
export type PharmacyDetailQuery = {
  medicineIds: string[] | null
  origin: { latitude: number; longitude: number } | null
}

/** The outcome of parsing a pharmacy-detail query string. */
export type PharmacyDetailQueryOutcome =
  | { ok: true; value: PharmacyDetailQuery }
  | { ok: false; code: DetailQueryFailureCode; message: string }

/**
 * Build the detail basket for one pharmacy.
 *
 * The detail endpoint carries medicine IDs only, so each requested medicine is
 * evaluated at one base unit. Results and the basket flow carry full quantities.
 */
export function buildDetailBasket(
  input: BuildDetailBasketInput,
): PharmacyBasketOutcome {
  const medicineById = new Map(
    input.medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const requested = new Set(input.medicineIds)
  const lines: BasketLine[] = input.medicineIds.map((medicineId) => {
    const medicine = medicineById.get(medicineId)
    if (medicine === undefined) {
      throw new Error(`Missing medicine ${medicineId} after validation`)
    }
    return {
      medicine_id: medicineId,
      quantity: 1,
      unit: medicine.base_unit,
    }
  })
  const medicines: BasketMedicine[] = input.medicines.map((medicine) => ({
    medicine_id: medicine.medicine_id,
    brand_name: medicine.brand_name,
    generic_name: medicine.generic_name,
    strength: medicine.strength,
    dosage_form: medicine.dosage_form,
  }))

  return buildPharmacyBasket({
    basket: lines,
    medicines,
    forms: input.forms.filter((form) => requested.has(form.medicine_id)),
  })
}

/**
 * Parse the pharmacy-detail query string into the values the server uses.
 *
 * The origin is all-or-nothing and bounded, and the medicine list is a
 * de-duplicated, bounded list of contract-valid IDs.
 */
export function parsePharmacyDetailQuery(
  params: URLSearchParams,
): PharmacyDetailQueryOutcome {
  const rawLatitude = params.get('origin_latitude')
  const rawLongitude = params.get('origin_longitude')
  if ((rawLatitude === null) !== (rawLongitude === null)) {
    return {
      ok: false,
      code: 'INVALID_ORIGIN',
      message: 'Latitude and longitude must be supplied together.',
    }
  }

  let origin: PharmacyDetailQuery['origin'] = null
  if (rawLatitude !== null && rawLongitude !== null) {
    const latitude = Number(rawLatitude)
    const longitude = Number(rawLongitude)
    if (
      rawLatitude.trim() === '' ||
      rawLongitude.trim() === '' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return {
        ok: false,
        code: 'INVALID_ORIGIN',
        message: 'The origin coordinates are outside the allowed range.',
      }
    }
    origin = { latitude, longitude }
  }

  const rawMedicineIds = params.get('medicine_ids')
  if (rawMedicineIds === null) {
    return { ok: true, value: { medicineIds: null, origin } }
  }

  const medicineIds = rawMedicineIds.split(',').map((value) => value.trim())
  if (
    medicineIds.length === 0 ||
    medicineIds.some((value) => !MEDICINE_ID_PATTERN.test(value))
  ) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'The medicine list is malformed.',
    }
  }
  if (medicineIds.length > DETAIL_MAX_MEDICINES) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: `A pharmacy-detail request cannot contain more than ${String(
        DETAIL_MAX_MEDICINES,
      )} medicines.`,
    }
  }
  if (new Set(medicineIds).size !== medicineIds.length) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'The medicine list contains a duplicate.',
    }
  }

  return { ok: true, value: { medicineIds, origin } }
}
