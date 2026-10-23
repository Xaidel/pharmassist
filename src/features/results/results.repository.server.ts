import type { QueryResultRow } from 'pg'

import type { QueryRunner } from '#/lib/db.server'
import {
  medicineSummarySchema,
  type MedicineSummary,
} from '#/shared/domain/medicine-summary'

import type { PharmacyUnitRate } from './pharmacy-directory.domain'
import { STALE_AFTER_DAYS, type StoredFormOffer } from './results.domain'
import {
  alternativeRowSchema,
  formOfferRowSchema,
  pharmacyRowSchema,
  reportRowSchema,
  toStoredFormOffer,
  unitRateRowSchema,
  type AlternativeRow,
  type PharmacyRow,
  type ReportRow,
} from './results.schema'
import {
  reportInsertRowSchema,
  reportSummaryRowSchema,
  type ReportInsertRow,
  type ReportReason,
  type ReportSummaryRow,
} from './report.schema'

type MedicineRowResult = QueryResultRow & {
  medicine_id: string
  category: string
  brand_name: string | null
  generic_name: string
  strength: string
  dosage_form: string
  base_unit: string
  manufacturer: string | null
  rx_otc: 'Rx' | 'OTC'
  pnf_listed: boolean | null
  konsulta_listed: boolean | null
}

const MEDICINES_SQL = `
select
  id as medicine_id,
  category,
  brand_name,
  generic_name,
  strength,
  dosage_form,
  base_unit,
  manufacturer,
  rx_otc,
  pnf_listed,
  konsulta_listed
from medicine
where id = any($1::text[]) and active
order by id
`

const PHARMACY_COLUMNS = `
  id as pharmacy_id,
  name,
  brand,
  type,
  address,
  barangay,
  latitude::float8 as latitude,
  longitude::float8 as longitude,
  phone,
  hours_text,
  opening_hours,
  open_24h,
  verification_status
`

const PHARMACIES_SQL = `
select ${PHARMACY_COLUMNS}
from pharmacy
order by id
`

const UNIT_RATES_SQL = `
select
  po.pharmacy_id,
  po.medicine_id,
  min(po.unit_rate_php)::float8 as unit_rate_php
from price_observation po
join medicine m on m.id = po.medicine_id
where m.active
  and po.sale_state = 'available'
  and po.unit_rate_php is not null
  and po.verified_at >= now() - ($1::int * interval '1 day')
group by po.pharmacy_id, po.medicine_id
order by po.pharmacy_id, po.medicine_id
`

const PHARMACY_BY_ID_SQL = `
select ${PHARMACY_COLUMNS}
from pharmacy
where id = $1
`

const FORM_COLUMNS = `
  pr.medicine_id,
  pr.pharmacy_id,
  pr.sale_form,
  pr.sale_state,
  pr.form_label,
  pr.shelf_price_php::float8 as shelf_price_php,
  pr.pack_quantity::float8 as pack_quantity,
  pr.pack_unit,
  pr.stock_status,
  to_char(
    pr.verified_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS"Z"'
  ) as verified_at,
  case
    when pr.verified_at is null then null
    else pr.verified_at < now() - ($2::int * interval '1 day')
  end as stale,
  pr.mdrp_entry_id,
  pr.mdrp_order,
  pr.mdrp_annex_row,
  pr.mdrp_ceiling_php::float8 as mdrp_ceiling_php,
  pr.mdrp_ceiling_basis,
  pr.mdrp_ceiling_unit,
  pr.mdrp_vat_exclusive,
  pr.mdrp_vat_exempt,
  pr.mdrp_effective_ceiling_php::float8 as mdrp_effective_ceiling_php,
  pr.mdrp_source_url,
  to_char(pr.mdrp_checked_at, 'YYYY-MM-DD') as mdrp_checked_at,
  pr.mdrp_observed_rate_php::float8 as mdrp_observed_rate_php,
  pr.mdrp_rate_basis,
  pr.above_mdrp_flag
`

const FORM_ORDER = `
  case pr.sale_form
    when 'pack' then 0
    when 'strip' then 1
    else 2
  end
`

const PRICES_SQL = `
select ${FORM_COLUMNS}
from price_observation_with_mdrp pr
where pr.medicine_id = any($1::text[])
order by pr.pharmacy_id, pr.medicine_id, ${FORM_ORDER}
`

const PHARMACY_PRICES_SQL = `
select ${FORM_COLUMNS}
from price_observation_with_mdrp pr
join medicine m on m.id = pr.medicine_id
where pr.pharmacy_id = $1 and m.active
order by coalesce(m.brand_name, m.generic_name), m.brand_name, pr.medicine_id, ${FORM_ORDER}
`

const ALTERNATIVES_SQL = `
select
  medicine_id,
  brand_name,
  manufacturer,
  reference_pack_size,
  rx_otc,
  fda_registration_no,
  note,
  display_order
from medicine_alternative
where medicine_id = any($1::text[])
order by medicine_id, display_order, brand_name
`

const REPORTS_SQL = `
select
  result_key,
  to_char(
    max(created_at) at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS"Z"'
  ) as reported_at
from price_report
where result_key = any($1::text[])
group by result_key
order by result_key
`

const REPORT_INSERT_SQL = `
insert into price_report (
  result_key,
  pharmacy_id,
  pharmacy_name_snapshot,
  medicine_ids,
  medicine_labels,
  reason,
  note
)
values ($1, $2, $3, $4::text[], $5::text[], $6::report_reason, $7)
returning
  id as report_id,
  status,
  to_char(
    created_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS"Z"'
  ) as created_at
`

const REPORT_SUMMARY_SQL = `
select
  count(*) over()::int as count,
  id as report_id,
  reason,
  status,
  to_char(
    created_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS"Z"'
  ) as created_at
from price_report
where result_key = $1
order by created_at desc, id desc
limit 1
`

/** One report the server is about to store as an immutable snapshot. */
export type CreateReportInput = {
  resultKey: string
  pharmacyId: string
  pharmacyName: string
  medicineIds: readonly string[]
  medicineLabels: readonly string[]
  reason: ReportReason
  note: string | null
}

/** The latest public report summary for one result key. */
export type ReportSummary = {
  count: number
  latest: {
    report_id: string
    reason: ReportReason
    status: ReportSummaryRow['status']
    created_at: string
  } | null
}

/** Reads the seeded catalog and pharmacy rows the results decision needs. */
export type ResultsRepository = {
  readMedicines(medicineIds: readonly string[]): Promise<MedicineSummary[]>
  readPharmacies(): Promise<PharmacyRow[]>
  readPharmacy(pharmacyId: string): Promise<PharmacyRow | null>
  readUnitRates(): Promise<PharmacyUnitRate[]>
  readPrices(medicineIds: readonly string[]): Promise<StoredFormOffer[]>
  readPharmacyPrices(pharmacyId: string): Promise<StoredFormOffer[]>
  readAlternatives(medicineIds: readonly string[]): Promise<AlternativeRow[]>
  readReports(resultKeys: readonly string[]): Promise<ReportRow[]>
  createReport(input: CreateReportInput): Promise<ReportInsertRow>
  readReportSummary(resultKey: string): Promise<ReportSummary>
}

/** Build the results repository over a narrow query runner. */
export function createResultsRepository(query: QueryRunner): ResultsRepository {
  return {
    async readMedicines(
      medicineIds: readonly string[],
    ): Promise<MedicineSummary[]> {
      const rows = await query<MedicineRowResult>(MEDICINES_SQL, [
        [...medicineIds],
      ])
      return rows.map((row) => medicineSummarySchema.parse(row))
    },

    async readPharmacies(): Promise<PharmacyRow[]> {
      const rows = await query<QueryResultRow>(PHARMACIES_SQL)
      return rows.map((row) => pharmacyRowSchema.parse(row))
    },

    async readUnitRates(): Promise<PharmacyUnitRate[]> {
      const rows = await query<QueryResultRow>(UNIT_RATES_SQL, [
        STALE_AFTER_DAYS,
      ])
      return rows.map((row) => unitRateRowSchema.parse(row))
    },

    async readPharmacy(pharmacyId: string): Promise<PharmacyRow | null> {
      const rows = await query<QueryResultRow>(PHARMACY_BY_ID_SQL, [pharmacyId])
      const row = rows[0]
      return row === undefined ? null : pharmacyRowSchema.parse(row)
    },

    async readPrices(
      medicineIds: readonly string[],
    ): Promise<StoredFormOffer[]> {
      const rows = await query<QueryResultRow>(PRICES_SQL, [
        [...medicineIds],
        STALE_AFTER_DAYS,
      ])
      return rows
        .map((row) => formOfferRowSchema.parse(row))
        .map((row) => toStoredFormOffer(row))
    },

    async readPharmacyPrices(pharmacyId: string): Promise<StoredFormOffer[]> {
      const rows = await query<QueryResultRow>(PHARMACY_PRICES_SQL, [
        pharmacyId,
        STALE_AFTER_DAYS,
      ])
      return rows
        .map((row) => formOfferRowSchema.parse(row))
        .map((row) => toStoredFormOffer(row))
    },

    async readAlternatives(
      medicineIds: readonly string[],
    ): Promise<AlternativeRow[]> {
      const rows = await query<QueryResultRow>(ALTERNATIVES_SQL, [
        [...medicineIds],
      ])
      return rows.map((row) => alternativeRowSchema.parse(row))
    },

    async readReports(resultKeys: readonly string[]): Promise<ReportRow[]> {
      if (resultKeys.length === 0) {
        return []
      }
      const rows = await query<QueryResultRow>(REPORTS_SQL, [[...resultKeys]])
      return rows.map((row) => reportRowSchema.parse(row))
    },

    async createReport(input: CreateReportInput): Promise<ReportInsertRow> {
      const rows = await query<QueryResultRow>(REPORT_INSERT_SQL, [
        input.resultKey,
        input.pharmacyId,
        input.pharmacyName,
        [...input.medicineIds],
        [...input.medicineLabels],
        input.reason,
        input.note,
      ])
      const row = rows[0]
      if (row === undefined) {
        throw new Error('The report insert returned no row')
      }
      return reportInsertRowSchema.parse(row)
    },

    async readReportSummary(resultKey: string): Promise<ReportSummary> {
      const rows = await query<QueryResultRow>(REPORT_SUMMARY_SQL, [resultKey])
      const row = rows[0]
      if (row === undefined) {
        return { count: 0, latest: null }
      }
      const parsed: ReportSummaryRow = reportSummaryRowSchema.parse(row)
      return {
        count: parsed.count,
        latest: {
          report_id: parsed.report_id,
          reason: parsed.reason,
          status: parsed.status,
          created_at: parsed.created_at,
        },
      }
    },
  }
}
