import { readServerConfig } from '#/lib/config.server'
import { queryRows } from '#/lib/db.server'
import type {
  BaseUnit,
  MedicineSummary,
} from '#/shared/domain/medicine-summary'

import {
  BASKET_MAX_ITEMS,
  BASKET_MAX_QUANTITY,
  buildRankedResults,
  manilaClock,
  STALE_AFTER_DAYS,
  type BasketLine,
  type BasketMedicine,
  type Origin,
} from './results.domain'
import { createResultsRepository } from './results.repository.server'
import {
  basketResponseSchema,
  resultsResponseSchema,
  type Basket,
  type BasketItemInput,
  type BasketRequest,
  type BasketResponse,
  type ResultsRequest,
  type ResultsResponse,
} from './results.schema'

const repository = createResultsRepository(queryRows)

type BasketFailureCode =
  | 'INVALID_REQUEST'
  | 'UNKNOWN_MEDICINE'
  | 'DUPLICATE_MEDICINE'
  | 'BASKET_TOO_LARGE'
  | 'INVALID_UNIT'
  | 'INVALID_QUANTITY'

/** A validated basket error the route renders as the shared API envelope. */
export type BasketFailure = {
  status: 400 | 422
  code: BasketFailureCode
  message: string
  details?: unknown
}

/** The outcome of resolving a basket. */
export type BasketOutcome =
  { ok: true; response: BasketResponse } | { ok: false; error: BasketFailure }

/** The outcome of ranking pharmacies for a basket. */
export type ResultsOutcome =
  { ok: true; response: ResultsResponse } | { ok: false; error: BasketFailure }

type ResolvedBasket = {
  lines: BasketLine[]
  medicines: MedicineSummary[]
}

function duplicateMedicineIds(items: readonly BasketItemInput[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const item of items) {
    if (seen.has(item.medicine_id)) {
      duplicates.add(item.medicine_id)
    }
    seen.add(item.medicine_id)
  }
  return [...duplicates]
}

function fail(
  status: BasketFailure['status'],
  code: BasketFailureCode,
  message: string,
  details?: unknown,
): { ok: false; error: BasketFailure } {
  const error: BasketFailure = { status, code, message }
  if (details !== undefined) {
    error.details = details
  }
  return { ok: false, error }
}

function isCountableUnit(unit: BaseUnit): boolean {
  return unit !== 'mL' && unit !== 'g'
}

function hasAtMostThreeDecimals(value: number): boolean {
  return Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6
}

function isValidQuantity(value: number, unit: BaseUnit): boolean {
  if (!Number.isFinite(value) || value <= 0) {
    return false
  }
  if (value > BASKET_MAX_QUANTITY) {
    return false
  }
  return isCountableUnit(unit)
    ? Number.isInteger(value)
    : hasAtMostThreeDecimals(value)
}

async function resolveBasket(
  items: readonly BasketItemInput[],
): Promise<
  { ok: true; basket: ResolvedBasket } | { ok: false; error: BasketFailure }
> {
  if (items.length > BASKET_MAX_ITEMS) {
    return fail(
      422,
      'BASKET_TOO_LARGE',
      `A basket cannot contain more than ${String(BASKET_MAX_ITEMS)} items.`,
    )
  }

  const duplicates = duplicateMedicineIds(items)
  if (duplicates.length > 0) {
    return fail(
      422,
      'DUPLICATE_MEDICINE',
      'A basket cannot contain the same medicine twice.',
      { medicine_ids: duplicates },
    )
  }

  const ids = items.map((item) => item.medicine_id)
  const medicines = await repository.readMedicines(ids)
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

  const lines: BasketLine[] = []
  for (const item of items) {
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
          ? `The quantity must be a positive whole number of ${medicine.base_unit}s up to ${String(BASKET_MAX_QUANTITY)}.`
          : `The quantity must be positive, have at most three decimal places, and not exceed ${String(BASKET_MAX_QUANTITY)}.`,
        {
          medicine_id: item.medicine_id,
          unit: medicine.base_unit,
        },
      )
    }
    lines.push({
      medicine_id: item.medicine_id,
      quantity: item.quantity,
      unit: medicine.base_unit,
    })
  }

  return { ok: true, basket: { lines, medicines } }
}

function buildBasket(
  lines: readonly BasketLine[],
  medicines: readonly MedicineSummary[],
): Basket {
  const medicineById = new Map(
    medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const items = lines.map((line) => {
    const medicine = medicineById.get(line.medicine_id)
    if (medicine === undefined) {
      throw new Error(`Missing medicine ${line.medicine_id} after validation`)
    }
    return {
      medicine_id: line.medicine_id,
      quantity: line.quantity,
      unit: line.unit,
      medicine,
    }
  })

  return {
    items,
    item_count: items.length,
    currency: 'PHP',
  }
}

/** Resolve validated basket lines into canonical medicine summaries. */
export async function handleBasket(
  input: BasketRequest,
): Promise<BasketOutcome> {
  const resolved = await resolveBasket(input.items)
  if (!resolved.ok) {
    return resolved
  }

  return {
    ok: true,
    response: basketResponseSchema.parse({
      basket: buildBasket(resolved.basket.lines, resolved.basket.medicines),
    }),
  }
}

/** Rank every pharmacy for a validated basket against the supplied origin. */
export async function handleResults(
  input: ResultsRequest,
): Promise<ResultsOutcome> {
  const resolved = await resolveBasket(input.items)
  if (!resolved.ok) {
    return resolved
  }

  const config = readServerConfig()
  const origin: Origin = input.origin ?? config.nagaCenter
  const originSource =
    input.origin === null || input.origin === undefined
      ? 'naga_center'
      : 'device'
  const now = new Date()
  const medicineIds = resolved.basket.lines.map((line) => line.medicine_id)

  const [pharmacies, forms, alternatives] = await Promise.all([
    repository.readPharmacies(),
    repository.readPrices(medicineIds),
    repository.readAlternatives(medicineIds),
  ])
  const resultKeys = pharmacies.map((pharmacy) => {
    const keyMedicineIds = [...medicineIds].sort()
    return `${pharmacy.pharmacy_id}|${keyMedicineIds.join(',')}`
  })
  const reports = await repository.readReports(resultKeys)

  const medicines: BasketMedicine[] = resolved.basket.medicines.map(
    (medicine) => ({
      medicine_id: medicine.medicine_id,
      brand_name: medicine.brand_name,
      generic_name: medicine.generic_name,
      strength: medicine.strength,
      dosage_form: medicine.dosage_form,
    }),
  )
  const ranked = buildRankedResults({
    basket: resolved.basket.lines,
    medicines,
    pharmacies,
    forms,
    alternatives,
    reports,
    origin,
    sort: input.sort,
    clock: manilaClock(now),
  })

  const response = resultsResponseSchema.parse({
    basket: buildBasket(resolved.basket.lines, resolved.basket.medicines),
    origin: {
      latitude: origin.latitude,
      longitude: origin.longitude,
      source: originSource,
    },
    ...ranked,
    meta: {
      generated_at: now.toISOString(),
      sort: input.sort,
      currency: 'PHP',
      stale_after_days: STALE_AFTER_DAYS,
    },
  })

  return { ok: true, response }
}
