import { z } from 'zod'

/** Most characters a report note may contain. */
export const REPORT_NOTE_MAX = 500

/** Most medicine IDs a report may cover. */
export const REPORT_MAX_MEDICINES = 10

/** The reasons a patient can report a result. */
export const reportReasonSchema = z.enum([
  'wrong_price',
  'wrong_stock',
  'wrong_details',
  'other',
])

/** The reasons a patient can report a result. */
export type ReportReason = z.infer<typeof reportReasonSchema>

/** The lifecycle states a stored report may carry. */
export const reportStatusSchema = z.enum([
  'open',
  'triaged',
  'resolved',
  'dismissed',
])

/** The lifecycle states a stored report may carry. */
export type ReportStatus = z.infer<typeof reportStatusSchema>

/** The body accepted by `POST /api/reports`. */
export const reportRequestSchema = z.strictObject({
  pharmacy_id: z.string().min(1).max(64),
  medicine_ids: z
    .array(z.string().min(1).max(64))
    .min(1)
    .max(REPORT_MAX_MEDICINES)
    .refine(
      (values) => new Set(values).size === values.length,
      'A report cannot list the same medicine twice.',
    ),
  reason: reportReasonSchema,
  note: z.string().max(REPORT_NOTE_MAX).nullish(),
  result_key: z.string().max(512).optional(),
})

/** The body accepted by `POST /api/reports`. */
export type ReportRequest = z.infer<typeof reportRequestSchema>

/** The report summary query accepted by `GET /api/reports`. */
export const reportSummaryQuerySchema = z.strictObject({
  result_key: z.string().min(1).max(512),
})

/** The response contract for `POST /api/reports`. */
export const reportResponseSchema = z.strictObject({
  report_id: z.string(),
  result_key: z.string(),
  status: reportStatusSchema,
  created_at: z.string(),
  reported: z.literal(true),
})

/** The response contract for `POST /api/reports`. */
export type ReportResponse = z.infer<typeof reportResponseSchema>

/** The latest public view of one report, without its note. */
export const reportSummaryLatestSchema = z.strictObject({
  report_id: z.string(),
  reason: reportReasonSchema,
  status: reportStatusSchema,
  created_at: z.string(),
})

/** The response contract for `GET /api/reports`. */
export const reportSummaryResponseSchema = z.strictObject({
  result_key: z.string(),
  count: z.number().int().min(0),
  reported: z.boolean(),
  latest: reportSummaryLatestSchema.nullable(),
})

/** The response contract for `GET /api/reports`. */
export type ReportSummaryResponse = z.infer<typeof reportSummaryResponseSchema>

/** One stored report summary row with its total count. */
export const reportSummaryRowSchema = z.strictObject({
  count: z.number().int().min(0),
  report_id: z.string(),
  reason: reportReasonSchema,
  status: reportStatusSchema,
  created_at: z.string(),
})

/** One stored report summary row with its total count. */
export type ReportSummaryRow = z.infer<typeof reportSummaryRowSchema>

/** One inserted report row. */
export const reportInsertRowSchema = z.strictObject({
  report_id: z.string(),
  status: reportStatusSchema,
  created_at: z.string(),
})

/** One inserted report row. */
export type ReportInsertRow = z.infer<typeof reportInsertRowSchema>
