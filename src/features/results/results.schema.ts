import { z } from 'zod'

import { medicineSummarySchema } from '#/shared/domain/medicine-summary'

import {
  basketLinesSchema,
  originSchema,
  resultSortSchema,
  type MdrpInfo,
  type PriceFacts,
} from './results.domain'

/** The body accepted by `POST /api/basket`. */
export const basketRequestSchema = z.strictObject({
  items: basketLinesSchema,
})

/** The body accepted by `POST /api/basket`. */
export type BasketRequest = z.infer<typeof basketRequestSchema>

/** The body accepted by `POST /api/results`. */
export const resultsRequestSchema = z.strictObject({
  items: basketLinesSchema,
  origin: originSchema.nullish(),
  sort: resultSortSchema.default('price'),
})

/** The body accepted by `POST /api/results`. */
export type ResultsRequest = z.infer<typeof resultsRequestSchema>

const openingRangeSchema = z.strictObject({
  open: z.string(),
  close: z.string(),
})

/** One pharmacy row before distance and open-now are resolved. */
export const pharmacyRowSchema = z.strictObject({
  pharmacy_id: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  type: z.enum(['chain', 'independent', 'public_health_center']),
  address: z.string(),
  barangay: z.string().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().nullable(),
  hours_text: z.string().nullable(),
  opening_hours: z.record(z.string(), z.array(openingRangeSchema)).nullable(),
  open_24h: z.boolean(),
  verification_status: z.enum(['verified', 'unverified']),
})

/** One pharmacy row before distance and open-now are resolved. */
export type PharmacyRow = z.infer<typeof pharmacyRowSchema>

/** The MDRP comparison exposed alongside an observed price. */
export const mdrpInfoSchema = z.strictObject({
  entry_id: z.string(),
  order: z.string(),
  annex_row: z.number().int(),
  ceiling_php: z.number(),
  ceiling_basis: z.enum(['per_unit', 'per_pack']),
  ceiling_unit: z.string().nullable(),
  vat_exclusive: z.boolean(),
  observed_pack_price_php: z.number(),
  observed_unit_price_php: z.number().nullable(),
  above: z.boolean(),
  source_url: z.string(),
  checked_at: z.string(),
})

/** One price row as stored, with its optional MDRP ceiling joined in. */
export const priceRowSchema = z.strictObject({
  medicine_id: z.string(),
  pharmacy_id: z.string(),
  shelf_price_php: z.number().min(0),
  pack_size: z.string(),
  pack_quantity: z.number().positive().nullable(),
  pack_unit: z.string().nullable(),
  unit_price_php: z.number().min(0).nullable(),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'unknown']),
  verified_at: z.string(),
  stale: z.boolean(),
  mdrp_entry_id: z.string().nullable(),
  mdrp_order: z.string().nullable(),
  mdrp_annex_row: z.number().int().nullable(),
  mdrp_ceiling_php: z.number().nullable(),
  mdrp_ceiling_basis: z.enum(['per_unit', 'per_pack']).nullable(),
  mdrp_ceiling_unit: z.string().nullable(),
  mdrp_vat_exclusive: z.boolean().nullable(),
  mdrp_source_url: z.string().nullable(),
  mdrp_checked_at: z.string().nullable(),
  above_mdrp_flag: z.boolean().nullable(),
})

/** One price row as stored, with its optional MDRP ceiling joined in. */
export type PriceRow = z.infer<typeof priceRowSchema>

/** One stored candidate generic alternative row. */
export const alternativeRowSchema = z.strictObject({
  medicine_id: z.string(),
  brand_name: z.string(),
  manufacturer: z.string().nullable(),
  pack_size: z.string().nullable(),
  rx_otc: z.enum(['Rx', 'OTC']),
  fda_registration_no: z.string().nullable(),
  note: z.string().nullable(),
  display_order: z.number().int(),
})

/** One stored candidate generic alternative row. */
export type AlternativeRow = z.infer<typeof alternativeRowSchema>

/** The latest report recorded for one result key. */
export const reportRowSchema = z.strictObject({
  result_key: z.string(),
  reported_at: z.string(),
})

/** The latest report recorded for one result key. */
export type ReportRow = z.infer<typeof reportRowSchema>

/** Project a stored price row into the ranking's price facts. */
export function toPriceFacts(row: PriceRow): PriceFacts {
  const mdrp: MdrpInfo | null =
    row.mdrp_entry_id === null
      ? null
      : mdrpInfoSchema.parse({
          entry_id: row.mdrp_entry_id,
          order: row.mdrp_order,
          annex_row: row.mdrp_annex_row,
          ceiling_php: row.mdrp_ceiling_php,
          ceiling_basis: row.mdrp_ceiling_basis,
          ceiling_unit: row.mdrp_ceiling_unit,
          vat_exclusive: row.mdrp_vat_exclusive,
          observed_pack_price_php: row.shelf_price_php,
          observed_unit_price_php: row.unit_price_php,
          above: row.above_mdrp_flag ?? false,
          source_url: row.mdrp_source_url,
          checked_at: row.mdrp_checked_at,
        })

  return {
    medicine_id: row.medicine_id,
    pharmacy_id: row.pharmacy_id,
    shelf_price_php: row.shelf_price_php,
    pack_size: row.pack_size,
    pack_quantity: row.pack_quantity,
    pack_unit: row.pack_unit,
    unit_price_php: row.unit_price_php,
    stock_status: row.stock_status,
    verified_at: row.verified_at,
    stale: row.stale,
    mdrp,
  }
}

/** The pharmacy view every result group carries. */
export const pharmacySummarySchema = z.strictObject({
  pharmacy_id: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  type: z.enum(['chain', 'independent', 'public_health_center']),
  address: z.string(),
  barangay: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  phone: z.string().nullable(),
  hours_text: z.string().nullable(),
  opening_hours: z.record(z.string(), z.array(openingRangeSchema)).nullable(),
  open_24h: z.boolean(),
  open_now: z.boolean().nullable(),
  distance_m: z.number().min(0),
  verification_status: z.enum(['verified', 'unverified']),
})

/** One basket line with the canonical medicine summary. */
export const basketItemSchema = z.strictObject({
  medicine_id: z.string(),
  packs: z.number().int(),
  medicine: medicineSummarySchema,
})

/** The resolved basket envelope. */
export const basketSchema = z.strictObject({
  items: z.array(basketItemSchema),
  item_count: z.number().int().min(0),
  pack_count: z.number().int().min(0),
  currency: z.literal('PHP'),
})

/** The resolved basket envelope. */
export type Basket = z.infer<typeof basketSchema>

/** One price line exposed by the results and pharmacy-detail contracts. */
export const priceLineSchema = z.strictObject({
  medicine_id: z.string(),
  shelf_price_php: z.number(),
  pack_size: z.string(),
  pack_quantity: z.number().nullable(),
  pack_unit: z.string().nullable(),
  unit_price_php: z.number().nullable(),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'unknown']),
  verified_at: z.string(),
  stale: z.boolean(),
  mdrp: mdrpInfoSchema.nullable(),
})

/** One price line exposed by the results and pharmacy-detail contracts. */
export type PriceLine = z.infer<typeof priceLineSchema>

/** One basket item a pharmacy cannot supply. */
export const missingItemSchema = z.strictObject({
  medicine_id: z.string(),
  brand_name: z.string().nullable(),
  generic_name: z.string(),
  strength: z.string(),
  dosage_form: z.string(),
  reason: z.enum(['no_price', 'out_of_stock', 'stock_unknown']),
})

const completeResultSchema = z.strictObject({
  result_key: z.string(),
  pharmacy: pharmacySummarySchema,
  status: z.literal('complete'),
  complete: z.literal(true),
  total_shelf_price_php: z.number(),
  known_total_php: z.number(),
  missing_items: z.array(missingItemSchema).max(0),
  prices: z.array(priceLineSchema),
  reported: z.boolean(),
  reported_at: z.string().nullable(),
})

const incompleteResultSchema = z.strictObject({
  result_key: z.string(),
  pharmacy: pharmacySummarySchema,
  status: z.literal('incomplete'),
  complete: z.literal(false),
  total_shelf_price_php: z.null(),
  known_total_php: z.number(),
  missing_items: z.array(missingItemSchema).min(1),
  prices: z.array(priceLineSchema),
  reported: z.boolean(),
  reported_at: z.string().nullable(),
})

const noPriceResultSchema = z.strictObject({
  pharmacy: pharmacySummarySchema,
})

const candidateGenericSchema = z.strictObject({
  brand_name: z.string(),
  manufacturer: z.string().nullable(),
  pack_size: z.string().nullable(),
  rx_otc: z.enum(['Rx', 'OTC']),
  fda_registration_no: z.string().nullable(),
  note: z.string(),
})

const candidateGenericGroupSchema = z.strictObject({
  for_medicine_id: z.string(),
  items: z.array(candidateGenericSchema),
})

/** The response contract for `POST /api/basket`. */
export const basketResponseSchema = z.strictObject({
  basket: basketSchema,
})

/** The response contract for `POST /api/basket`. */
export type BasketResponse = z.infer<typeof basketResponseSchema>

/** The response contract for `POST /api/results`. */
export const resultsResponseSchema = z.strictObject({
  basket: basketSchema,
  origin: z.strictObject({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    source: z.enum(['device', 'naga_center']),
  }),
  complete: z.array(completeResultSchema),
  incomplete: z.array(incompleteResultSchema),
  no_price_data: z.array(noPriceResultSchema),
  candidate_generics: z.array(candidateGenericGroupSchema),
  meta: z.strictObject({
    generated_at: z.string(),
    sort: resultSortSchema,
    currency: z.literal('PHP'),
    stale_after_days: z.number().int().positive(),
  }),
})

/** The response contract for `POST /api/results`. */
export type ResultsResponse = z.infer<typeof resultsResponseSchema>
