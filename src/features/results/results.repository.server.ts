import type { QueryResultRow } from 'pg'

import type { QueryRunner } from '#/lib/db.server'
import {
  medicineSummarySchema,
  type MedicineSummary,
} from '#/shared/domain/medicine-summary'

import { STALE_AFTER_DAYS, type PriceFacts } from './results.domain'
import {
  alternativeRowSchema,
  pharmacyRowSchema,
  priceRowSchema,
  reportRowSchema,
  toPriceFacts,
  type AlternativeRow,
  type PharmacyRow,
  type ReportRow,
} from './results.schema'

type MedicineRowResult = QueryResultRow & {
  medicine_id: string
  category: string
  brand_name: string | null
  generic_name: string
  strength: string
  dosage_form: string
  pack_size: string | null
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
  pack_size,
  manufacturer,
  rx_otc,
  pnf_listed,
  konsulta_listed
from medicine
where id = any($1::text[]) and active
order by id
`

const PHARMACIES_SQL = `
select
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
from pharmacy
order by id
`

const PRICES_SQL = `
select
  pr.medicine_id,
  pr.pharmacy_id,
  pr.shelf_price_php::float8 as shelf_price_php,
  pr.pack_size,
  pr.pack_quantity::float8 as pack_quantity,
  pr.pack_unit,
  pr.unit_price_php::float8 as unit_price_php,
  pr.stock_status,
  to_char(
    pr.verified_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS"Z"'
  ) as verified_at,
  (pr.verified_at < now() - ($2::int * interval '1 day')) as stale,
  pr.mdrp_entry_id,
  pr.mdrp_order,
  pr.mdrp_annex_row,
  pr.mdrp_ceiling_php::float8 as mdrp_ceiling_php,
  pr.mdrp_ceiling_basis,
  pr.mdrp_ceiling_unit,
  pr.mdrp_vat_exclusive,
  pr.mdrp_source_url,
  to_char(pr.mdrp_checked_at, 'YYYY-MM-DD') as mdrp_checked_at,
  pr.above_mdrp_flag
from price_record_with_mdrp pr
where pr.medicine_id = any($1::text[])
order by pr.pharmacy_id, pr.medicine_id
`

const ALTERNATIVES_SQL = `
select
  medicine_id,
  brand_name,
  manufacturer,
  pack_size,
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

/** Reads the seeded catalog and pharmacy rows the results decision needs. */
export type ResultsRepository = {
  readMedicines(medicineIds: readonly string[]): Promise<MedicineSummary[]>
  readPharmacies(): Promise<PharmacyRow[]>
  readPrices(medicineIds: readonly string[]): Promise<PriceFacts[]>
  readAlternatives(medicineIds: readonly string[]): Promise<AlternativeRow[]>
  readReports(resultKeys: readonly string[]): Promise<ReportRow[]>
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

    async readPrices(medicineIds: readonly string[]): Promise<PriceFacts[]> {
      const rows = await query<QueryResultRow>(PRICES_SQL, [
        [...medicineIds],
        STALE_AFTER_DAYS,
      ])
      return rows
        .map((row) => priceRowSchema.parse(row))
        .map((row) => toPriceFacts(row))
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
  }
}
