import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  BASKET_MAX_ITEMS,
  centsToPrice,
  isStockAvailable,
  priceToCents,
  type MissingItem,
  type MissingReason,
  type PriceFacts,
  type StockStatus,
} from './results.domain'

/** Most basket medicine IDs one pharmacy-detail request may carry. */
export const DETAIL_MAX_MEDICINES = BASKET_MAX_ITEMS

/** The stable character rule for a medicine ID. */
const MEDICINE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

/** The price context one detail basket line carries when a record exists. */
export type DetailBasketPrice = {
  shelf_price_php: number
  stock_status: StockStatus
  stale: boolean
}

/** One basket medicine as it appears in the pharmacy detail sheet. */
export type DetailBasketItem = {
  medicine_id: string
  packs: number
  medicine: MedicineSummary
  price: DetailBasketPrice | null
}

/** The basket completeness block the pharmacy detail endpoint returns. */
export type DetailBasket = {
  items: DetailBasketItem[]
  complete: boolean
  total_shelf_price_php: number | null
  known_total_php: number
  missing_items: MissingItem[]
}

/** Inputs the detail basket decision needs, with all I/O already performed. */
export type BuildDetailBasketInput = {
  medicineIds: readonly string[]
  medicines: readonly MedicineSummary[]
  prices: readonly PriceFacts[]
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

/** The Google Maps directions deep link for a pharmacy's coordinates. */
export function directionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude.toFixed(
    6,
  )},${longitude.toFixed(6)}`
}

function missingItem(
  medicine: MedicineSummary,
  reason: MissingReason,
): MissingItem {
  return {
    medicine_id: medicine.medicine_id,
    brand_name: medicine.brand_name,
    generic_name: medicine.generic_name,
    strength: medicine.strength,
    dosage_form: medicine.dosage_form,
    reason,
  }
}

function missingReason(price: PriceFacts): MissingReason {
  return price.stock_status === 'out_of_stock'
    ? 'out_of_stock'
    : 'stock_unknown'
}

/**
 * Build the basket completeness block for one pharmacy.
 *
 * It mirrors the results ranking rules: available means a price record with
 * `in_stock` or `low_stock`; the total is the sum of shelf prices; malformed
 * input is a programming error, not a user-facing outcome.
 */
export function buildDetailBasket(input: BuildDetailBasketInput): DetailBasket {
  const medicineById = new Map(
    input.medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const priceByMedicine = new Map(
    input.prices.map((price) => [price.medicine_id, price]),
  )

  const items: DetailBasketItem[] = []
  const missing: MissingItem[] = []
  let knownCents = 0

  for (const medicineId of input.medicineIds) {
    const medicine = medicineById.get(medicineId)
    if (medicine === undefined) {
      throw new Error(`Missing medicine ${medicineId} after validation`)
    }
    const price = priceByMedicine.get(medicineId)
    items.push({
      medicine_id: medicineId,
      packs: 1,
      medicine,
      price:
        price === undefined
          ? null
          : {
              shelf_price_php: price.shelf_price_php,
              stock_status: price.stock_status,
              stale: price.stale,
            },
    })

    if (price === undefined) {
      missing.push(missingItem(medicine, 'no_price'))
      continue
    }
    if (!isStockAvailable(price.stock_status)) {
      missing.push(missingItem(medicine, missingReason(price)))
      continue
    }
    knownCents += priceToCents(price.shelf_price_php)
  }

  const knownTotal = centsToPrice(knownCents)
  const complete = missing.length === 0

  return {
    items,
    complete,
    total_shelf_price_php: complete ? knownTotal : null,
    known_total_php: knownTotal,
    missing_items: missing,
  }
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
