import { z } from 'zod'

import { medicineSummarySchema } from '#/shared/domain/medicine-summary'

import { SCAN_OTHER_MATCHES_MAX } from './scan.domain'

/** One alternative medicine a matcher considers for a line of text. */
export const medicineMatchSchema = z.strictObject({
  medicine: medicineSummarySchema,
  confidence: z.number().min(0).max(1),
})

/** One recognized-and-matched line the confirm screen reviews. */
export const scanCandidateSchema = z.strictObject({
  line_no: z.number().int().positive(),
  suggested_medicine: medicineSummarySchema.nullable(),
  confidence: z.number().min(0).max(1),
  low_confidence: z.boolean(),
  other_matches: z.array(medicineMatchSchema).max(SCAN_OTHER_MATCHES_MAX),
})

/** One recognized-and-matched line the confirm screen reviews. */
export type ScanCandidate = z.infer<typeof scanCandidateSchema>

/** The response contract for `POST /api/scan`. */
export const scanResponseSchema = z.strictObject({
  scan_id: z.uuid(),
  provider: z.string(),
  mock_script_id: z.string().optional(),
  items: z.array(scanCandidateSchema),
  warnings: z.array(z.string()),
  image_retained: z.literal(false),
  processed_at: z.string(),
})

/** The response contract for `POST /api/scan`. */
export type ScanResponse = z.infer<typeof scanResponseSchema>
