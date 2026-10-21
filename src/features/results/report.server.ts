import { queryRows } from '#/lib/db.server'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  createReportRateLimiter,
  hashClientKey,
} from './report.rate-limit.server'
import {
  reportResponseSchema,
  reportSummaryResponseSchema,
  type ReportRequest,
  type ReportResponse,
  type ReportSummaryResponse,
} from './report.schema'
import { createResultsRepository } from './results.repository.server'
import { basketResultKey } from './results.domain'

const repository = createResultsRepository(queryRows)
const rateLimiter = createReportRateLimiter()

/** A report failure the route renders as the shared API envelope. */
export type ReportFailure = {
  status: 404 | 422 | 429
  code: 'UNKNOWN_PHARMACY' | 'UNKNOWN_MEDICINE' | 'REPORT_RATE_LIMITED'
  message: string
  details?: unknown
}

/** The outcome of creating one report. */
export type CreateReportOutcome =
  { ok: true; response: ReportResponse } | { ok: false; error: ReportFailure }

function reportLabel(medicine: MedicineSummary): string {
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

/** Store one immutable report snapshot for a priced result. */
export async function handleCreateReport(
  input: ReportRequest,
  clientKey: string,
): Promise<CreateReportOutcome> {
  if (!rateLimiter.allow(hashClientKey(clientKey))) {
    return {
      ok: false,
      error: {
        status: 429,
        code: 'REPORT_RATE_LIMITED',
        message: 'Too many reports from this connection. Try again later.',
      },
    }
  }

  const pharmacy = await repository.readPharmacy(input.pharmacy_id)
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

  const medicines = await repository.readMedicines(input.medicine_ids)
  const medicineById = new Map(
    medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const unknown = input.medicine_ids.filter(
    (medicineId) => !medicineById.has(medicineId),
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

  const sorted = input.medicine_ids
    .map((medicineId) => {
      const medicine = medicineById.get(medicineId)
      if (medicine === undefined) {
        throw new Error(`Missing medicine ${medicineId} after validation`)
      }
      return { medicineId, label: reportLabel(medicine) }
    })
    .sort((left, right) => compareIds(left.medicineId, right.medicineId))

  const note = input.note?.trim()
  const created = await repository.createReport({
    resultKey: basketResultKey(input.pharmacy_id, input.medicine_ids),
    pharmacyId: pharmacy.pharmacy_id,
    pharmacyName: pharmacy.name,
    medicineIds: sorted.map((entry) => entry.medicineId),
    medicineLabels: sorted.map((entry) => entry.label),
    reason: input.reason,
    note: note === undefined || note === '' ? null : note,
  })

  return {
    ok: true,
    response: reportResponseSchema.parse({
      report_id: created.report_id,
      result_key: basketResultKey(input.pharmacy_id, input.medicine_ids),
      status: created.status,
      created_at: created.created_at,
      reported: true,
    }),
  }
}

/** Read the public report summary for one result key. */
export async function handleReportSummary(
  resultKey: string,
): Promise<ReportSummaryResponse> {
  const summary = await repository.readReportSummary(resultKey)
  return reportSummaryResponseSchema.parse({
    result_key: resultKey,
    count: summary.count,
    reported: summary.count > 0,
    latest: summary.latest,
  })
}
