import { z } from 'zod'
import { TenantReferenceSchema, TitleSchema } from './workflow.domain'

export const InputSchema = z.object({ tenant: TenantReferenceSchema })
export const ChangeTitleInputSchema = InputSchema.extend({ title: TitleSchema })
