import { z } from 'zod'

import { medicineSummarySchema } from '#/shared/domain/medicine-summary'

import {
  missingItemSchema,
  pharmacySummarySchema,
  resultBasketItemSchema,
  saleFormOfferSchema,
} from './results.schema'

/** The basket completeness block in a pharmacy-detail response. */
export const detailBasketSchema = z.strictObject({
  items: z.array(resultBasketItemSchema),
  status: z.enum(['complete', 'sold_per_pack_only', 'incomplete']),
  complete: z.boolean(),
  total_shelf_price_php: z.number().nullable(),
  known_total_php: z.number(),
  covering_total_php: z.number().nullable(),
  missing_items: z.array(missingItemSchema),
})

/** One medicine's per-form offers in a pharmacy-detail response. */
export const detailFormsSchema = z.strictObject({
  medicine_id: z.string(),
  forms: z.array(saleFormOfferSchema),
})

/** The pharmacy detail and its per-form stock list. */
export const pharmacyDetailResponseSchema = z.strictObject({
  pharmacy: pharmacySummarySchema,
  medicines: z.array(medicineSummarySchema),
  forms: z.array(detailFormsSchema),
  basket: detailBasketSchema.optional(),
})

/** The pharmacy detail and its per-form stock list. */
export type PharmacyDetailResponse = z.infer<
  typeof pharmacyDetailResponseSchema
>
