import { z } from 'zod'
import { TenantSchema, TextSchema } from './authoring.domain'

export const ReadInputSchema = z.object({ tenant: TenantSchema })
export const WriteInputSchema = ReadInputSchema.extend({ text: TextSchema })
export type ReadInput = z.infer<typeof ReadInputSchema>
export type WriteInput = z.infer<typeof WriteInputSchema>
