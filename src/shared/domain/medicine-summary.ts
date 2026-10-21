import { z } from 'zod'

/** The base dispensing unit a medicine's quantity is counted in. */
export const baseUnitSchema = z.enum([
  'tablet',
  'capsule',
  'mL',
  'g',
  'actuation',
  'sachet',
  'unit-dose',
])

/** The base dispensing unit a medicine's quantity is counted in. */
export type BaseUnit = z.infer<typeof baseUnitSchema>

/** The exact-product view shared by search and price results. */
export const medicineSummarySchema = z.strictObject({
  medicine_id: z.string(),
  category: z.string(),
  brand_name: z.string().nullable(),
  generic_name: z.string(),
  strength: z.string(),
  dosage_form: z.string(),
  base_unit: baseUnitSchema,
  manufacturer: z.string().nullable(),
  rx_otc: z.enum(['Rx', 'OTC']),
  pnf_listed: z.boolean().nullable(),
  konsulta_listed: z.boolean().nullable(),
})

/** The exact-product view shared by search and price results. */
export type MedicineSummary = z.infer<typeof medicineSummarySchema>
