import { z } from 'zod'

import { baseUnitSchema } from '#/shared/domain/medicine-summary'

/** The lifecycle states a stored reservation may carry. */
export const sendAheadStatusSchema = z.enum(['created', 'expired'])

/** The lifecycle states a stored reservation may carry. */
export type SendAheadStatus = z.infer<typeof sendAheadStatusSchema>

/** One requested reservation line before the server resolves its medicine. */
export const sendAheadItemInputSchema = z.strictObject({
  medicine_id: z.string().min(1).max(64),
  quantity: z.number(),
  unit: z.string().optional(),
})

/** One requested reservation line before the server resolves its medicine. */
export type SendAheadItemInput = z.infer<typeof sendAheadItemInputSchema>

/** The body accepted by `POST /api/send-ahead`. */
export const sendAheadRequestSchema = z.strictObject({
  pharmacy_id: z.string().min(1).max(64),
  items: z.array(sendAheadItemInputSchema).min(1),
})

/** The body accepted by `POST /api/send-ahead`. */
export type SendAheadRequest = z.infer<typeof sendAheadRequestSchema>

/** One snapshotted reservation line the response returns. */
export const sendAheadItemSchema = z.strictObject({
  medicine_id: z.string(),
  label: z.string(),
  quantity: z.number(),
  unit: baseUnitSchema,
})

/** The response contract for `POST /api/send-ahead`. */
export const sendAheadResponseSchema = z.strictObject({
  reference_code: z.string(),
  pharmacy_name: z.string(),
  pharmacy_mobile: z.string().nullable(),
  items: z.array(sendAheadItemSchema),
  expires_at: z.string(),
  status: z.literal('created'),
})

/** The response contract for `POST /api/send-ahead`. */
export type SendAheadResponse = z.infer<typeof sendAheadResponseSchema>

/** One inserted reservation row, as the repository returns it. */
export const storedReservationSchema = z.strictObject({
  reference_code: z.string(),
  status: sendAheadStatusSchema,
  created_at: z.string(),
  expires_at: z.string(),
})

/** One inserted reservation row, as the repository returns it. */
export type StoredReservationRow = z.infer<typeof storedReservationSchema>
