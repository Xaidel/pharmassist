import { z } from 'zod'

export const AuditInputSchema = z.object({
  tenant: z.string().min(1),
  action: z.enum(['acceptance-inspected']),
})
export type AuditInput = z.infer<typeof AuditInputSchema>
export type AuditEntry = AuditInput & { actor: string }
