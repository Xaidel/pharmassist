import { z } from 'zod'

export const TenantSchema = z.string().pipe(z.enum(['alpha', 'beta']))
export const TextSchema = z.string().trim().min(1).max(100)
export const DraftSchema = z.object({
  tenant: TenantSchema,
  text: TextSchema,
  revision: z.number().int().nonnegative(),
})
export type Draft = z.infer<typeof DraftSchema>

/** Acceptance is provider-owned domain behavior, not an exported cross-feature predicate. */
export function acceptanceSatisfied(draft: Draft): boolean {
  return draft.text.length >= 5
}
