import type { QueryResultRow } from 'pg'
import { z } from 'zod'

import type { QueryRunner } from '#/lib/db.server'
import {
  medicineSummarySchema,
  type MedicineSummary,
} from '#/shared/domain/medicine-summary'

import type {
  CreateReservationInput,
  ReservationPharmacy,
  SendAheadStore,
  StoredReservation,
} from './send-ahead.port'
import { storedReservationSchema } from './send-ahead.schema'

const PHARMACY_SQL = `
select
  id as pharmacy_id,
  name,
  mobile
from pharmacy
where id = $1
`

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

const INSERT_SQL = `
insert into send_ahead (
  reference_code,
  pharmacy_id,
  pharmacy_name_snapshot,
  medicine_ids,
  medicine_labels,
  quantities,
  created_at,
  expires_at
)
values ($1, $2, $3, $4::text[], $5::text[], $6::numeric[], $7, $8)
returning
  reference_code,
  status,
  to_char(
    created_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS"Z"'
  ) as created_at,
  to_char(
    expires_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS"Z"'
  ) as expires_at
`

const pharmacyRowSchema = z.strictObject({
  pharmacy_id: z.string(),
  name: z.string(),
  mobile: z.string().nullable(),
})

/** Build the send-ahead persistence adapter over a narrow query runner. */
export function createSendAheadRepository(query: QueryRunner): SendAheadStore {
  return {
    async readPharmacy(
      pharmacyId: string,
    ): Promise<ReservationPharmacy | null> {
      const rows = await query<QueryResultRow>(PHARMACY_SQL, [pharmacyId])
      const row = rows[0]
      if (row === undefined) {
        return null
      }
      const parsed = pharmacyRowSchema.parse(row)
      return {
        pharmacy_id: parsed.pharmacy_id,
        name: parsed.name,
        mobile: parsed.mobile,
      }
    },

    async readMedicines(
      medicineIds: readonly string[],
    ): Promise<MedicineSummary[]> {
      const rows = await query<QueryResultRow>(MEDICINES_SQL, [
        [...medicineIds],
      ])
      return rows.map((row) => medicineSummarySchema.parse(row))
    },

    async createReservation(
      input: CreateReservationInput,
    ): Promise<StoredReservation> {
      const rows = await query<QueryResultRow>(INSERT_SQL, [
        input.referenceCode,
        input.pharmacyId,
        input.pharmacyName,
        [...input.medicineIds],
        [...input.medicineLabels],
        input.quantities.map((quantity) => quantity.toFixed(3)),
        input.createdAt,
        input.expiresAt,
      ])
      const row = rows[0]
      if (row === undefined) {
        throw new Error('The send-ahead insert returned no row')
      }
      return storedReservationSchema.parse(row)
    },
  }
}
