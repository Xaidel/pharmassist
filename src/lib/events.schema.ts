import { z } from 'zod'

const countSchema = z.number().int().min(0)
const sortSchema = z.enum(['price', 'distance'])
const scanSourceSchema = z.enum(['camera', 'upload'])
const reportReasonSchema = z.enum([
  'wrong_price',
  'wrong_stock',
  'wrong_details',
  'other',
])

const eventSchema = z.discriminatedUnion('name', [
  z.strictObject({
    name: z.literal('app_open'),
    properties: z.strictObject({
      install_mode: z.enum(['browser', 'standalone']),
    }),
  }),
  z.strictObject({
    name: z.literal('search_submitted'),
    properties: z.strictObject({
      query_length: z.number().int().min(0).max(80),
      result_count: countSchema,
    }),
  }),
  z.strictObject({
    name: z.literal('search_result_selected'),
    properties: z.strictObject({
      rank: countSchema,
      result_count: countSchema,
    }),
  }),
  z.strictObject({
    name: z.literal('results_viewed'),
    properties: z.strictObject({
      item_count: countSchema,
      complete_count: countSchema,
      incomplete_count: countSchema,
      no_price_count: countSchema,
      sort: sortSchema,
    }),
  }),
  z.strictObject({
    name: z.literal('results_sorted'),
    properties: z.strictObject({ sort: sortSchema }),
  }),
  z.strictObject({
    name: z.literal('pharmacy_detail_viewed'),
    properties: z.strictObject({
      pharmacy_id: z.string().min(1).max(64),
    }),
  }),
  z.strictObject({
    name: z.literal('directions_tapped'),
    properties: z.strictObject({
      pharmacy_id: z.string().min(1).max(64),
    }),
  }),
  z.strictObject({
    name: z.literal('scan_started'),
    properties: z.strictObject({ source: scanSourceSchema }),
  }),
  z.strictObject({
    name: z.literal('scan_completed'),
    properties: z.strictObject({
      source: scanSourceSchema,
      item_count: countSchema,
      low_confidence_count: countSchema,
    }),
  }),
  z.strictObject({
    name: z.literal('scan_failed'),
    properties: z.strictObject({
      source: scanSourceSchema,
      reason: z.enum(['provider_error', 'timeout', 'invalid_image']),
    }),
  }),
  z.strictObject({
    name: z.literal('basket_item_added'),
    properties: z.strictObject({
      source: z.enum(['search', 'scan']),
      item_count: countSchema,
    }),
  }),
  z.strictObject({
    name: z.literal('basket_item_removed'),
    properties: z.strictObject({ item_count: countSchema }),
  }),
  z.strictObject({
    name: z.literal('report_submitted'),
    properties: z.strictObject({ reason: reportReasonSchema }),
  }),
])

const sessionIdSchema = z
  .uuid()
  .refine((value) => value.charAt(14) === '4', 'session_id must be a UUID v4')

/** Every anonymous event the POC accepts, with its allowlisted properties. */
export const appEventSchema = eventSchema

/** One validated anonymous event with allowlisted properties. */
export type AppEvent = z.infer<typeof appEventSchema>

/** A validated anonymous event batch sent by one client session. */
export const eventBatchSchema = z.strictObject({
  session_id: sessionIdSchema,
  events: z.array(appEventSchema).min(1).max(20),
})

/** A validated anonymous event batch. */
export type EventBatch = z.infer<typeof eventBatchSchema>
