import { createFileRoute } from '@tanstack/react-router'
import { CapabilityPage } from '../features/workflow/pages/CapabilityPage'
import { nestedRead } from '../features/workflow/workflow.functions'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    tenant: search.tenant === 'beta' ? 'beta' : 'alpha',
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    initial: await nestedRead({ data: { tenant: deps.tenant } }),
  }),
  component: CapabilityPage,
})
