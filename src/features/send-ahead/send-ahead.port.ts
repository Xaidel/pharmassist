import type { MedicineSummary } from '#/shared/domain/medicine-summary'

/** The pharmacy facts a send-ahead reservation snapshots. */
export type ReservationPharmacy = {
  pharmacy_id: string
  name: string
  mobile: string | null
}

/** The aligned facts a send-ahead reservation persists. */
export type CreateReservationInput = {
  pharmacyId: string
  pharmacyName: string
  medicineIds: readonly string[]
  medicineLabels: readonly string[]
  quantities: readonly number[]
  referenceCode: string
  createdAt: Date
  expiresAt: Date
}

/** The stored reservation the use case returns to the client. */
export type StoredReservation = {
  reference_code: string
  status: 'created' | 'expired'
  created_at: string
  expires_at: string
}

/** Persistence the send-ahead use case depends on. */
export type SendAheadStore = {
  readPharmacy(pharmacyId: string): Promise<ReservationPharmacy | null>
  readMedicines(medicineIds: readonly string[]): Promise<MedicineSummary[]>
  createReservation(input: CreateReservationInput): Promise<StoredReservation>
}
