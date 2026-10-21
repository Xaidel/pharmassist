import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '#/features/search/pages/home-page'

export const Route = createFileRoute('/')({
  component: HomePage,
})
