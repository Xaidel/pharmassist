import { z } from 'zod'

import { medicineSummarySchema } from '#/shared/domain/medicine-summary'

import {
  missingItemSchema,
  pharmacySummarySchema,
  priceLineSchema,
} from './results.schema'

const detailBasketPriceSchema = z.strictObject({
  shelf_price_php: z.number(),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'unknown']),
  stale: z.boolean(),
})

const detailBasketItemSchema = z.strictObject({
  medicine_id: z.string(),
  packs: z.number().int().min(1),
  medicine: medicineSummarySchema,
  price: detailBasketPriceSchema.nullable(),
})

/** The basket completeness block in a pharmacy-detail response. */
export const detailBasketSchema = z.strictObject({
  items: z.array(detailBasketItemSchema),
  complete: z.boolean(),
  total_shelf_price_php: z.number().nullable(),
  known_total_php: z.number(),
  missing_items: z.array(missingItemSchema),
})

/** The pharmacy detail and its full price list. */
export const pharmacyDetailResponseSchema = z.strictObject({
  pharmacy: pharmacySummarySchema,
  medicines: z.array(medicineSummarySchema),
  prices: z.array(priceLineSchema),
  basket: detailBasketSchema.optional(),
})

/** The pharmacy detail and its full price list. */
export type PharmacyDetailResponse = z.infer<
  typeof pharmacyDetailResponseSchema
>
