import { z } from 'zod'

import {
  baseUnitSchema,
  medicineSummarySchema,
} from '#/shared/domain/medicine-summary'

import {
  BASKET_MAX_ITEMS,
  type MdrpInfo,
  type SaleFormOffer,
  type StoredFormOffer,
} from './results.domain'

/** One requested basket line before the server resolves its medicine. */
export const basketItemInputSchema = z.strictObject({
  medicine_id: z.string().min(1).max(64),
  quantity: z.number(),
  unit: z.string().optional(),
})

/** One requested basket line before the server resolves its medicine. */
export type BasketItemInput = z.infer<typeof basketItemInputSchema>

/** The requested basket lines from a client. */
export const basketItemsInputSchema = z.array(basketItemInputSchema).min(1)

/** One validated basket line stored in the session basket. */
export const basketLineSchema = z.strictObject({
  medicine_id: z.string().min(1).max(64),
  quantity: z.number().positive(),
  unit: baseUnitSchema,
})

/** The validated session basket lines. */
export const basketLinesSchema = z
  .array(basketLineSchema)
  .min(1)
  .max(BASKET_MAX_ITEMS)

/** A validated distance origin. */
export const originSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

/** Ranking orders the results endpoint accepts. */
export const resultSortSchema = z.enum(['price', 'distance'])

/** The body accepted by `POST /api/basket`. */
export const basketRequestSchema = z.strictObject({
  items: basketItemsInputSchema,
})

/** The body accepted by `POST /api/basket`. */
export type BasketRequest = z.infer<typeof basketRequestSchema>

/** The body accepted by `POST /api/results`. */
export const resultsRequestSchema = z.strictObject({
  items: basketItemsInputSchema,
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

/** The MDRP comparison exposed alongside an observed form price. */
export const mdrpInfoSchema = z.strictObject({
  entry_id: z.string(),
  order: z.string(),
  annex_row: z.number().int(),
  ceiling_php: z.number(),
  ceiling_basis: z.enum(['per_unit', 'per_pack']),
  ceiling_unit: z.string().nullable(),
  vat_exclusive: z.boolean(),
  observed_rate_php: z.number(),
  rate_basis: z.enum(['loose_price', 'strip_rate', 'box_rate', 'pack_price']),
  above: z.boolean(),
  source_url: z.string(),
  checked_at: z.string(),
})

/** One form offer as read from the per-form price view. */
export const formOfferRowSchema = z.strictObject({
  medicine_id: z.string(),
  pharmacy_id: z.string(),
  sale_form: z.enum(['pack', 'strip', 'loose']),
  sale_state: z.enum([
    'available',
    'pack_only',
    'not_applicable',
    'not_stocked',
    'unknown',
  ]),
  form_label: z.string().nullable(),
  shelf_price_php: z.number().min(0).nullable(),
  pack_quantity: z.number().positive().nullable(),
  pack_unit: baseUnitSchema.nullable(),
  stock_status: z
    .enum(['in_stock', 'low_stock', 'out_of_stock', 'unknown'])
    .nullable(),
  verified_at: z.string().nullable(),
  stale: z.boolean().nullable(),
  mdrp_entry_id: z.string().nullable(),
  mdrp_order: z.string().nullable(),
  mdrp_annex_row: z.number().int().nullable(),
  mdrp_ceiling_php: z.number().nullable(),
  mdrp_ceiling_basis: z.enum(['per_unit', 'per_pack']).nullable(),
  mdrp_ceiling_unit: z.string().nullable(),
  mdrp_vat_exclusive: z.boolean().nullable(),
  mdrp_source_url: z.string().nullable(),
  mdrp_checked_at: z.string().nullable(),
  mdrp_observed_rate_php: z.number().nullable(),
  mdrp_rate_basis: z
    .enum(['loose_price', 'strip_rate', 'box_rate', 'pack_price'])
    .nullable(),
  above_mdrp_flag: z.boolean().nullable(),
})

/** One form offer as read from the per-form price view. */
export type FormOfferRow = z.infer<typeof formOfferRowSchema>

/** One stored candidate generic alternative row. */
export const alternativeRowSchema = z.strictObject({
  medicine_id: z.string(),
  brand_name: z.string(),
  manufacturer: z.string().nullable(),
  reference_pack_size: z.string().nullable(),
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

/** Project a stored form row into the form offer the ranking reads. */
export function toStoredFormOffer(row: FormOfferRow): StoredFormOffer {
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
          observed_rate_php: row.mdrp_observed_rate_php,
          rate_basis: row.mdrp_rate_basis,
          above: row.above_mdrp_flag,
          source_url: row.mdrp_source_url,
          checked_at: row.mdrp_checked_at,
        })

  const available = row.sale_state === 'available'
  return {
    medicine_id: row.medicine_id,
    pharmacy_id: row.pharmacy_id,
    sale_form: row.sale_form,
    sale_state: row.sale_state,
    form_label: row.form_label,
    pack_quantity: row.pack_quantity,
    pack_unit: row.pack_unit,
    shelf_price_php: row.shelf_price_php,
    stock_status: row.stock_status,
    verified_at: available ? row.verified_at : null,
    stale: available ? row.stale : null,
    mdrp,
  }
}

/** The public shape of one sale form offer. */
export const saleFormOfferSchema = z.strictObject({
  sale_form: z.enum(['pack', 'strip', 'loose']),
  sale_state: z.enum([
    'available',
    'pack_only',
    'not_applicable',
    'not_stocked',
    'unknown',
  ]),
  form_label: z.string().nullable(),
  pack_quantity: z.number().positive().nullable(),
  pack_unit: baseUnitSchema.nullable(),
  shelf_price_php: z.number().min(0).nullable(),
  stock_status: z
    .enum(['in_stock', 'low_stock', 'out_of_stock', 'unknown'])
    .nullable(),
  verified_at: z.string().nullable(),
  stale: z.boolean().nullable(),
  mdrp: mdrpInfoSchema.nullable(),
})

/** One chosen sale form in an exact fulfillment. */
export const fulfillmentComponentSchema = z.strictObject({
  sale_form: z.enum(['pack', 'strip', 'loose']),
  form_label: z.string(),
  pack_quantity: z.number().positive(),
  pack_unit: baseUnitSchema,
  count: z.number().int().positive(),
  shelf_price_php: z.number(),
  line_total_php: z.number(),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'unknown']),
  verified_at: z.string(),
  stale: z.boolean(),
  mdrp: mdrpInfoSchema.nullable(),
})

/** The cheapest covering purchase for an item with no exact combination. */
export const packOnlyLineSchema = z.strictObject({
  medicine_id: z.string(),
  quantity: z.number(),
  unit: baseUnitSchema,
  sale_form: z.enum(['pack', 'strip']),
  form_label: z.string(),
  pack_quantity: z.number().positive(),
  pack_unit: baseUnitSchema,
  shelf_price_php: z.number(),
  buy_quantity: z.number().int().positive(),
  covers_quantity: z.number(),
  covering_total_php: z.number(),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'unknown']),
  stale: z.boolean(),
  copy: z.enum(['sold_per_pack_only', 'sold_by_the_pack', 'sold_by_the_strip']),
})

const itemOutcomeSchema = z.enum([
  'exact',
  'sold_per_pack_only',
  'not_stocked',
  'out_of_stock',
  'stock_unknown',
  'no_price',
])

/** One basket item at one pharmacy with its fulfillment outcome. */
export const resultBasketItemSchema = z
  .strictObject({
    medicine_id: z.string(),
    quantity: z.number(),
    unit: baseUnitSchema,
    outcome: itemOutcomeSchema,
    components: z.array(fulfillmentComponentSchema),
    pack_only: packOnlyLineSchema.optional(),
    total_shelf_price_php: z.number().nullable(),
    forms: z.array(saleFormOfferSchema),
  })
  .superRefine((item, context) => {
    if (item.outcome === 'exact') {
      if (item.components.length === 0) {
        context.addIssue({
          code: 'custom',
          message: 'An exact item needs at least one component.',
        })
      }
      if (item.total_shelf_price_php === null) {
        context.addIssue({
          code: 'custom',
          message: 'An exact item needs a total.',
        })
      }
      if (item.pack_only !== undefined) {
        context.addIssue({
          code: 'custom',
          message: 'An exact item cannot carry a covering purchase.',
        })
      }
      return
    }
    if (item.outcome === 'sold_per_pack_only') {
      if (item.pack_only === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'A pack-only item needs a covering purchase.',
        })
      }
      if (item.components.length > 0) {
        context.addIssue({
          code: 'custom',
          message: 'A pack-only item cannot carry exact components.',
        })
      }
      if (item.total_shelf_price_php !== null) {
        context.addIssue({
          code: 'custom',
          message: 'A pack-only item cannot carry an exact total.',
        })
      }
      return
    }
    if (item.components.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'A missing item cannot carry exact components.',
      })
    }
    if (item.pack_only !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'A missing item cannot carry a covering purchase.',
      })
    }
    if (item.total_shelf_price_php !== null) {
      context.addIssue({
        code: 'custom',
        message: 'A missing item cannot carry a total.',
      })
    }
  })

/** One basket item a pharmacy cannot supply. */
export const missingItemSchema = z.strictObject({
  medicine_id: z.string(),
  brand_name: z.string().nullable(),
  generic_name: z.string(),
  strength: z.string(),
  dosage_form: z.string(),
  reason: z.enum(['not_stocked', 'out_of_stock', 'stock_unknown', 'no_price']),
})

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
  quantity: z.number(),
  unit: baseUnitSchema,
  medicine: medicineSummarySchema,
})

/** The resolved basket envelope. */
export const basketSchema = z.strictObject({
  items: z.array(basketItemSchema),
  item_count: z.number().int().min(0),
  currency: z.literal('PHP'),
})

/** The resolved basket envelope. */
export type Basket = z.infer<typeof basketSchema>

const completeResultSchema = z.strictObject({
  result_key: z.string(),
  pharmacy: pharmacySummarySchema,
  status: z.literal('complete'),
  complete: z.literal(true),
  items: z.array(resultBasketItemSchema),
  total_shelf_price_php: z.number(),
  known_total_php: z.number(),
  covering_total_php: z.null(),
  missing_items: z.array(missingItemSchema).max(0),
  reported: z.boolean(),
  reported_at: z.string().nullable(),
})

const soldPerPackOnlyResultSchema = z.strictObject({
  result_key: z.string(),
  pharmacy: pharmacySummarySchema,
  status: z.literal('sold_per_pack_only'),
  complete: z.literal(false),
  items: z.array(resultBasketItemSchema),
  total_shelf_price_php: z.null(),
  known_total_php: z.number(),
  covering_total_php: z.number(),
  missing_items: z.array(missingItemSchema).max(0),
  reported: z.boolean(),
  reported_at: z.string().nullable(),
})

const incompleteResultSchema = z.strictObject({
  result_key: z.string(),
  pharmacy: pharmacySummarySchema,
  status: z.literal('incomplete'),
  complete: z.literal(false),
  items: z.array(resultBasketItemSchema),
  total_shelf_price_php: z.null(),
  known_total_php: z.number(),
  covering_total_php: z.number().nullable(),
  missing_items: z.array(missingItemSchema).min(1),
  reported: z.boolean(),
  reported_at: z.string().nullable(),
})

const noPriceResultSchema = z.strictObject({
  pharmacy: pharmacySummarySchema,
})

const candidateGenericSchema = z.strictObject({
  brand_name: z.string(),
  manufacturer: z.string().nullable(),
  reference_pack_size: z.string().nullable(),
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
  sold_per_pack_only: z.array(soldPerPackOnlyResultSchema),
  incomplete: z.array(incompleteResultSchema),
  no_price_data: z.array(noPriceResultSchema),
  candidate_generics: z.array(candidateGenericGroupSchema),
  meta: z.strictObject({
    generated_at: z.string(),
    sort: resultSortSchema,
    currency: z.literal('PHP'),
    stale_after_days: z.number().int(),
  }),
})

/** The response contract for `POST /api/results`. */
export type ResultsResponse = z.infer<typeof resultsResponseSchema>

/** The sale form offer shape the results decision reads. */
export type { SaleFormOffer }
