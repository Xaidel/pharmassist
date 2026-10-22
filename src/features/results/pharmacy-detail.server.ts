import { readServerConfig } from '#/lib/config.server'
import { queryRows } from '#/lib/db.server'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  buildDetailBasket,
  type PharmacyDetailQuery,
} from './pharmacy-detail.domain'
import {
  pharmacyDetailResponseSchema,
  type PharmacyDetailResponse,
} from './pharmacy-detail.schema'
import { createResultsRepository } from './results.repository.server'
import {
  manilaClock,
  SALE_FORM_ORDER,
  toPharmacySummary,
  toSaleFormOffer,
  type StoredFormOffer,
} from './results.domain'

const repository = createResultsRepository(queryRows)

/** A pharmacy-detail failure the route renders as the shared API envelope. */
export type DetailFailure = {
  status: 400 | 404 | 422
  code:
    | 'INVALID_REQUEST'
    | 'INVALID_ORIGIN'
    | 'INVALID_UNIT'
    | 'UNKNOWN_PHARMACY'
    | 'UNKNOWN_MEDICINE'
  message: string
  details?: unknown
}

/** The outcome of reading one pharmacy's detail. */
export type DetailOutcome =
  | { ok: true; response: PharmacyDetailResponse }
  | { ok: false; error: DetailFailure }

function sortForms(forms: readonly StoredFormOffer[]): StoredFormOffer[] {
  return [...forms].sort(
    (left, right) =>
      SALE_FORM_ORDER[left.sale_form] - SALE_FORM_ORDER[right.sale_form],
  )
}

function displayName(medicine: MedicineSummary): string {
  return medicine.brand_name ?? medicine.generic_name
}

/** Read one pharmacy, its per-form stock list, and the optional basket view. */
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
  if (query.basket !== null) {
    const medicineIds = query.basket.map((line) => line.medicine_id)
    requestedMedicines = await repository.readMedicines(medicineIds)
    const found = new Set(
      requestedMedicines.map((medicine) => medicine.medicine_id),
    )
    const unknown = medicineIds.filter((medicineId) => !found.has(medicineId))
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

    const baseUnits = new Map(
      requestedMedicines.map((medicine) => [
        medicine.medicine_id,
        medicine.base_unit,
      ]),
    )
    const wrongUnit = query.basket.find(
      (line) => baseUnits.get(line.medicine_id) !== line.unit,
    )
    if (wrongUnit !== undefined) {
      return {
        ok: false,
        error: {
          status: 422,
          code: 'INVALID_UNIT',
          message: `The unit must match the medicine's base unit (${String(
            baseUnits.get(wrongUnit.medicine_id),
          )}).`,
          details: {
            medicine_id: wrongUnit.medicine_id,
            expected_unit: baseUnits.get(wrongUnit.medicine_id),
          },
        },
      }
    }
  }

  const pharmacyForms = await repository.readPharmacyPrices(pharmacyId)
  let selectedMedicines: MedicineSummary[]
  if (query.basket !== null) {
    selectedMedicines = requestedMedicines
  } else {
    const availableIds = new Set(
      pharmacyForms
        .filter((form) => form.sale_state === 'available')
        .map((form) => form.medicine_id),
    )
    selectedMedicines =
      availableIds.size === 0
        ? []
        : await repository.readMedicines([...availableIds])
    selectedMedicines.sort(
      (left, right) =>
        displayName(left).localeCompare(displayName(right)) ||
        left.medicine_id.localeCompare(right.medicine_id),
    )
  }

  const selectedIds = new Set(
    selectedMedicines.map((medicine) => medicine.medicine_id),
  )
  const selectedForms = pharmacyForms.filter((form) =>
    selectedIds.has(form.medicine_id),
  )
  const byMedicine = new Map<string, StoredFormOffer[]>()
  for (const form of selectedForms) {
    const list = byMedicine.get(form.medicine_id)
    if (list === undefined) {
      byMedicine.set(form.medicine_id, [form])
    } else {
      list.push(form)
    }
  }

  const origin = query.origin ?? readServerConfig().nagaCenter
  const pharmacySummary = toPharmacySummary(
    pharmacy,
    origin,
    manilaClock(new Date()),
  )
  const basketOutcome =
    query.basket === null
      ? undefined
      : buildDetailBasket({
          lines: query.basket,
          medicines: requestedMedicines,
          forms: pharmacyForms,
        })
  const basket =
    basketOutcome === undefined
      ? undefined
      : {
          items: basketOutcome.items,
          status: basketOutcome.status,
          complete: basketOutcome.complete,
          total_shelf_price_php: basketOutcome.total_shelf_price_php,
          known_total_php: basketOutcome.known_total_php,
          covering_total_php: basketOutcome.covering_total_php,
          missing_items: basketOutcome.missing_items,
        }

  const payload = {
    pharmacy: pharmacySummary,
    medicines: selectedMedicines,
    forms: selectedMedicines.map((medicine) => ({
      medicine_id: medicine.medicine_id,
      forms: sortForms(byMedicine.get(medicine.medicine_id) ?? []).map(
        toSaleFormOffer,
      ),
    })),
    ...(basket === undefined ? {} : { basket }),
  }

  return {
    ok: true,
    response: pharmacyDetailResponseSchema.parse(payload),
  }
}
