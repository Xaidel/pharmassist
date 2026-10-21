import { readServerConfig } from '#/lib/config.server'
import { queryRows } from '#/lib/db.server'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  buildDetailBasket,
  directionsUrl,
  type PharmacyDetailQuery,
} from './pharmacy-detail.domain'
import {
  pharmacyDetailResponseSchema,
  type PharmacyDetailResponse,
} from './pharmacy-detail.schema'
import { createResultsRepository } from './results.repository.server'
import { manilaClock, toPharmacySummary, toPriceLine } from './results.domain'

const repository = createResultsRepository(queryRows)

/** A pharmacy-detail failure the route renders as the shared API envelope. */
export type DetailFailure = {
  status: 400 | 404 | 422
  code:
    | 'INVALID_REQUEST'
    | 'INVALID_ORIGIN'
    | 'UNKNOWN_PHARMACY'
    | 'UNKNOWN_MEDICINE'
  message: string
  details?: unknown
}

/** The outcome of reading one pharmacy's detail. */
export type DetailOutcome =
  | { ok: true; response: PharmacyDetailResponse }
  | { ok: false; error: DetailFailure }

/** Read one pharmacy, its full price list, and the optional basket view. */
export async function handlePharmacyDetail(
  pharmacyId: string,
  query: PharmacyDetailQuery,
): Promise<DetailOutcome> {
  const pharmacy = await repository.readPharmacy(pharmacyId)
  if (pharmacy === null) {
    return {
      ok: false,
      error: {
        status: 404,
        code: 'UNKNOWN_PHARMACY',
        message: 'That pharmacy is not in the seeded directory.',
      },
    }
  }

  let requestedMedicines: MedicineSummary[] = []
  if (query.medicineIds !== null) {
    requestedMedicines = await repository.readMedicines(query.medicineIds)
    const found = new Set(
      requestedMedicines.map((medicine) => medicine.medicine_id),
    )
    const unknown = query.medicineIds.filter(
      (medicineId) => !found.has(medicineId),
    )
    if (unknown.length > 0) {
      return {
        ok: false,
        error: {
          status: 422,
          code: 'UNKNOWN_MEDICINE',
          message: 'One or more medicines do not exist or are inactive.',
          details: { medicine_ids: [...new Set(unknown)] },
        },
      }
    }
  }

  const prices = await repository.readPharmacyPrices(pharmacyId)
  const pricedMedicineIds = [
    ...new Set(prices.map((price) => price.medicine_id)),
  ]
  const pricedMedicines =
    pricedMedicineIds.length === 0
      ? []
      : await repository.readMedicines(pricedMedicineIds)

  const origin = query.origin ?? readServerConfig().nagaCenter
  const pharmacySummary = toPharmacySummary(
    pharmacy,
    origin,
    manilaClock(new Date()),
  )
  const basket =
    query.medicineIds === null
      ? undefined
      : buildDetailBasket({
          medicineIds: query.medicineIds,
          medicines: requestedMedicines,
          prices,
        })

  const payload = {
    pharmacy: {
      ...pharmacySummary,
      directions_url: directionsUrl(pharmacy.latitude, pharmacy.longitude),
    },
    medicines: pricedMedicines,
    prices: prices.map((price) => toPriceLine(price)),
    ...(basket === undefined ? {} : { basket }),
  }

  return {
    ok: true,
    response: pharmacyDetailResponseSchema.parse(payload),
  }
}
