import { readServerConfig } from '#/lib/config.server'
import { queryRows } from '#/lib/db.server'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  BASKET_MAX_ITEMS,
  buildRankedResults,
  manilaClock,
  STALE_AFTER_DAYS,
  type BasketLine,
  type Origin,
} from './results.domain'
import { createResultsRepository } from './results.repository.server'
import {
  basketResponseSchema,
  resultsResponseSchema,
  type Basket,
  type BasketRequest,
  type BasketResponse,
  type ResultsRequest,
  type ResultsResponse,
} from './results.schema'

const repository = createResultsRepository(queryRows)

/** A validated basket error the route renders as the shared API envelope. */
export type BasketFailure = {
  status: 400 | 422
  code:
    | 'INVALID_REQUEST'
    | 'UNKNOWN_MEDICINE'
    | 'DUPLICATE_MEDICINE'
    | 'BASKET_TOO_LARGE'
  message: string
  details?: unknown
}

/** The outcome of resolving a basket. */
export type BasketOutcome =
  { ok: true; response: BasketResponse } | { ok: false; error: BasketFailure }

/** The outcome of ranking pharmacies for a basket. */
export type ResultsOutcome =
  { ok: true; response: ResultsResponse } | { ok: false; error: BasketFailure }

function duplicateMedicineIds(lines: readonly BasketLine[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const line of lines) {
    if (seen.has(line.medicine_id)) {
      duplicates.add(line.medicine_id)
    }
    seen.add(line.medicine_id)
  }
  return [...duplicates]
}

function fail(
  status: BasketFailure['status'],
  code: BasketFailure['code'],
  message: string,
  details?: unknown,
): { ok: false; error: BasketFailure } {
  const error: BasketFailure = { status, code, message }
  if (details !== undefined) {
    error.details = details
  }
  return { ok: false, error }
}

async function readBasketMedicines(
  lines: readonly BasketLine[],
): Promise<
  | { ok: true; medicines: MedicineSummary[] }
  | { ok: false; error: BasketFailure }
> {
  const duplicates = duplicateMedicineIds(lines)
  if (duplicates.length > 0) {
    return fail(
      422,
      'DUPLICATE_MEDICINE',
      'A basket cannot contain the same medicine twice.',
      { medicine_ids: duplicates },
    )
  }

  const ids = lines.map((line) => line.medicine_id)
  const medicines = await repository.readMedicines(ids)
  const found = new Set(medicines.map((medicine) => medicine.medicine_id))
  const unknown = ids.filter((id) => !found.has(id))
  if (unknown.length > 0) {
    return fail(
      422,
      'UNKNOWN_MEDICINE',
      'One or more medicines do not exist or are inactive.',
      { medicine_ids: [...new Set(unknown)] },
    )
  }

  return { ok: true, medicines }
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
      packs: line.packs,
      medicine,
    }
  })

  return {
    items,
    item_count: items.length,
    pack_count: items.reduce((sum, item) => sum + item.packs, 0),
    currency: 'PHP',
  }
}

/** Resolve validated basket lines into canonical medicine summaries. */
export async function handleBasket(
  input: BasketRequest,
): Promise<BasketOutcome> {
  if (input.items.length > BASKET_MAX_ITEMS) {
    return fail(
      400,
      'INVALID_REQUEST',
      `A basket cannot contain more than ${String(BASKET_MAX_ITEMS)} items.`,
    )
  }

  const medicines = await readBasketMedicines(input.items)
  if (!medicines.ok) {
    return medicines
  }

  return {
    ok: true,
    response: basketResponseSchema.parse({
      basket: buildBasket(input.items, medicines.medicines),
    }),
  }
}

/** Rank every pharmacy for a validated basket against the supplied origin. */
export async function handleResults(
  input: ResultsRequest,
): Promise<ResultsOutcome> {
  if (input.items.length > BASKET_MAX_ITEMS) {
    return fail(
      422,
      'BASKET_TOO_LARGE',
      `A basket cannot contain more than ${String(BASKET_MAX_ITEMS)} items.`,
    )
  }

  const medicines = await readBasketMedicines(input.items)
  if (!medicines.ok) {
    return medicines
  }

  const config = readServerConfig()
  const origin: Origin = input.origin ?? config.nagaCenter
  const originSource =
    input.origin === null || input.origin === undefined
      ? 'naga_center'
      : 'device'
  const now = new Date()
  const medicineIds = input.items.map((line) => line.medicine_id)

  const [pharmacies, prices, alternatives] = await Promise.all([
    repository.readPharmacies(),
    repository.readPrices(medicineIds),
    repository.readAlternatives(medicineIds),
  ])
  const resultKeys = pharmacies.map((pharmacy) => {
    const keyMedicineIds = [...medicineIds].sort()
    return `${pharmacy.pharmacy_id}|${keyMedicineIds.join(',')}`
  })
  const reports = await repository.readReports(resultKeys)

  const ranked = buildRankedResults({
    basket: input.items,
    medicines: medicines.medicines.map((medicine) => ({
      medicine_id: medicine.medicine_id,
      brand_name: medicine.brand_name,
      generic_name: medicine.generic_name,
      strength: medicine.strength,
      dosage_form: medicine.dosage_form,
    })),
    pharmacies,
    prices,
    alternatives,
    reports,
    origin,
    sort: input.sort,
    clock: manilaClock(now),
  })

  const response = resultsResponseSchema.parse({
    basket: buildBasket(input.items, medicines.medicines),
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
