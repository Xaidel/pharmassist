import {
  baseUnitSchema,
  type MedicineSummary,
} from '#/shared/domain/medicine-summary'

import {
  buildPharmacyBasket,
  BASKET_MAX_ITEMS,
  BASKET_MAX_QUANTITY,
  isCountableUnit,
  isValidBasketQuantity,
  type BasketLine,
  type BasketMedicine,
  type PharmacyBasketOutcome,
  type StoredFormOffer,
} from './results.domain'

/** Most basket lines one pharmacy-detail request may carry. */
export const DETAIL_MAX_MEDICINES = BASKET_MAX_ITEMS

/** The stable character rule for a medicine ID. */
const MEDICINE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

/** Inputs the detail basket decision needs, with all I/O already performed. */
export type BuildDetailBasketInput = {
  lines: readonly BasketLine[]
  medicines: readonly MedicineSummary[]
  forms: readonly StoredFormOffer[]
}

/** Failures the pharmacy-detail query parser can report. */
export type DetailQueryFailureCode =
  | 'INVALID_REQUEST'
  | 'INVALID_ORIGIN'
  | 'INVALID_UNIT'
  | 'INVALID_QUANTITY'
  | 'DUPLICATE_MEDICINE'
  | 'BASKET_TOO_LARGE'

/** The validated query values the pharmacy-detail endpoint accepts. */
export type PharmacyDetailQuery = {
  basket: BasketLine[] | null
  origin: { latitude: number; longitude: number } | null
}

/** The outcome of parsing a pharmacy-detail query string. */
export type PharmacyDetailQueryOutcome =
  | { ok: true; value: PharmacyDetailQuery }
  | {
      ok: false
      status: 400 | 422
      code: DetailQueryFailureCode
      message: string
    }

/**
 * Build the detail basket for one pharmacy.
 *
 * The detail request carries the same validated lines as the results request,
 * so both views fulfill the identical quantities and units.
 */
export function buildDetailBasket(
  input: BuildDetailBasketInput,
): PharmacyBasketOutcome {
  const medicineById = new Map(
    input.medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const requested = new Set(input.lines.map((line) => line.medicine_id))
  for (const line of input.lines) {
    if (!medicineById.has(line.medicine_id)) {
      throw new Error(`Missing medicine ${line.medicine_id} after validation`)
    }
  }
  const medicines: BasketMedicine[] = input.medicines.map((medicine) => ({
    medicine_id: medicine.medicine_id,
    brand_name: medicine.brand_name,
    generic_name: medicine.generic_name,
    strength: medicine.strength,
    dosage_form: medicine.dosage_form,
  }))

  return buildPharmacyBasket({
    basket: input.lines,
    medicines,
    forms: input.forms.filter((form) => requested.has(form.medicine_id)),
  })
}

type DetailQueryFailure = {
  ok: false
  status: 400 | 422
  code: DetailQueryFailureCode
  message: string
}

function queryFailure(
  status: DetailQueryFailure['status'],
  code: DetailQueryFailureCode,
  message: string,
): DetailQueryFailure {
  return { ok: false, status, code, message }
}

type DetailItemOutcome = { ok: true; line: BasketLine } | DetailQueryFailure

/**
 * Parse one `medicine_id:quantity:unit` item value.
 *
 * A malformed token is a request-shape failure; a bad unit or quantity is the
 * same contract failure the basket and results endpoints report.
 */
function parseDetailItem(raw: string): DetailItemOutcome {
  const match = /^([^:]+):([^:]+):([^:]+)$/.exec(raw)
  if (match === null) {
    return queryFailure(
      400,
      'INVALID_REQUEST',
      'Each items value must be medicine_id:quantity:unit.',
    )
  }
  const rawId = match[1]?.trim() ?? ''
  const rawQuantity = match[2]?.trim() ?? ''
  const rawUnit = match[3]?.trim() ?? ''
  if (!MEDICINE_ID_PATTERN.test(rawId)) {
    return queryFailure(
      400,
      'INVALID_REQUEST',
      'The medicine list is malformed.',
    )
  }

  const unit = baseUnitSchema.safeParse(rawUnit)
  if (!unit.success) {
    return queryFailure(
      422,
      'INVALID_UNIT',
      'The unit is not a recognized base dispensing unit.',
    )
  }

  const quantity = rawQuantity === '' ? Number.NaN : Number(rawQuantity)
  if (!isValidBasketQuantity(quantity, unit.data)) {
    return queryFailure(
      422,
      'INVALID_QUANTITY',
      isCountableUnit(unit.data)
        ? `The quantity must be a positive whole number of ${unit.data}s up to ${String(BASKET_MAX_QUANTITY)}.`
        : `The quantity must be positive, have at most three decimal places, and not exceed ${String(BASKET_MAX_QUANTITY)}.`,
    )
  }

  return {
    ok: true,
    line: { medicine_id: rawId, quantity, unit: unit.data },
  }
}

/**
 * Parse the pharmacy-detail query string into the values the server uses.
 *
 * The origin is all-or-nothing and bounded, and the basket is a bounded list of
 * de-duplicated, contract-valid lines carrying the caller's quantities.
 */
export function parsePharmacyDetailQuery(
  params: URLSearchParams,
): PharmacyDetailQueryOutcome {
  const rawLatitude = params.get('origin_latitude')
  const rawLongitude = params.get('origin_longitude')
  if ((rawLatitude === null) !== (rawLongitude === null)) {
    return queryFailure(
      400,
      'INVALID_ORIGIN',
      'Latitude and longitude must be supplied together.',
    )
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
      return queryFailure(
        400,
        'INVALID_ORIGIN',
        'The origin coordinates are outside the allowed range.',
      )
    }
    origin = { latitude, longitude }
  }

  const rawItems = params.getAll('items')
  if (rawItems.length === 0) {
    return { ok: true, value: { basket: null, origin } }
  }
  if (rawItems.length > DETAIL_MAX_MEDICINES) {
    return queryFailure(
      422,
      'BASKET_TOO_LARGE',
      `A pharmacy-detail request cannot contain more than ${String(
        DETAIL_MAX_MEDICINES,
      )} medicines.`,
    )
  }

  const lines: BasketLine[] = []
  for (const rawItem of rawItems) {
    const parsed = parseDetailItem(rawItem)
    if (!parsed.ok) {
      return parsed
    }
    lines.push(parsed.line)
  }

  const medicineIds = lines.map((line) => line.medicine_id)
  if (new Set(medicineIds).size !== medicineIds.length) {
    return queryFailure(
      422,
      'DUPLICATE_MEDICINE',
      'A list cannot contain the same medicine twice.',
    )
  }

  return { ok: true, value: { basket: lines, origin } }
}
