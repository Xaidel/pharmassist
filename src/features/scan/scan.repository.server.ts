import type { QueryResultRow } from 'pg'
import { z } from 'zod'

import type { QueryRunner } from '#/lib/db.server'
import {
  baseUnitSchema,
  medicineSummarySchema,
  type MedicineSummary,
} from '#/shared/domain/medicine-summary'

import { SCAN_MATCH_MIN_SIMILARITY } from './scan.domain'

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

const SEARCH_NAMES_SQL = `
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
  konsulta_listed,
  greatest(
    word_similarity($1::text, lower(coalesce(brand_name, ''))),
    word_similarity($1::text, lower(generic_name))
  ) as score
from medicine
where active
  and (
    word_similarity($1::text, lower(coalesce(brand_name, ''))) > $3::real
    or word_similarity($1::text, lower(generic_name)) > $3::real
  )
order by score desc, coalesce(brand_name, generic_name) asc, id asc
limit $2::int
`

const searchNameRowSchema = z.strictObject({
  medicine_id: z.string(),
  category: z.string(),
  brand_name: z.string().nullable(),
  generic_name: z.string(),
  strength: z.string(),
  dosage_form: z.string(),
  base_unit: baseUnitSchema,
  manufacturer: z.string().nullable(),
  rx_otc: z.enum(['Rx', 'OTC']),
  pnf_listed: z.boolean().nullable(),
  konsulta_listed: z.boolean().nullable(),
  score: z.number(),
})

/** One name match for a recognized line, with its similarity score. */
export type MedicineNameMatch = {
  medicine: MedicineSummary
  score: number
}

/** Reads the active medicines the scan matcher resolves recognized text against. */
export type ScanRepository = {
  readMedicines(medicineIds: readonly string[]): Promise<MedicineSummary[]>
  searchNames(query: string, limit: number): Promise<MedicineNameMatch[]>
}

/** Build the scan repository over a narrow query runner. */
export function createScanRepository(query: QueryRunner): ScanRepository {
  return {
    async readMedicines(
      medicineIds: readonly string[],
    ): Promise<MedicineSummary[]> {
      const rows = await query<QueryResultRow>(MEDICINES_SQL, [
        [...medicineIds],
      ])
      return rows.map((row) => medicineSummarySchema.parse(row))
    },

    async searchNames(
      queryText: string,
      limit: number,
    ): Promise<MedicineNameMatch[]> {
      const rows = await query<QueryResultRow>(SEARCH_NAMES_SQL, [
        queryText,
        limit,
        SCAN_MATCH_MIN_SIMILARITY,
      ])
      return rows.map((row) => {
        const parsed = searchNameRowSchema.parse(row)
        return {
          medicine: medicineSummarySchema.parse({
            medicine_id: parsed.medicine_id,
            category: parsed.category,
            brand_name: parsed.brand_name,
            generic_name: parsed.generic_name,
            strength: parsed.strength,
            dosage_form: parsed.dosage_form,
            base_unit: parsed.base_unit,
            manufacturer: parsed.manufacturer,
            rx_otc: parsed.rx_otc,
            pnf_listed: parsed.pnf_listed,
            konsulta_listed: parsed.konsulta_listed,
          }),
          score: parsed.score,
        }
      })
    },
  }
}
