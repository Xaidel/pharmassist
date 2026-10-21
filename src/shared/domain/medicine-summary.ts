import { z } from 'zod'

/** The exact-product view shared by search and price results. */
export const medicineSummarySchema = z.strictObject({
  medicine_id: z.string(),
  category: z.string(),
  brand_name: z.string().nullable(),
  generic_name: z.string(),
  strength: z.string(),
  dosage_form: z.string(),
  pack_size: z.string().nullable(),
  manufacturer: z.string().nullable(),
  rx_otc: z.enum(['Rx', 'OTC']),
  pnf_listed: z.boolean().nullable(),
  konsulta_listed: z.boolean().nullable(),
})

/** The exact-product view shared by search and price results. */
export type MedicineSummary = z.infer<typeof medicineSummarySchema>
