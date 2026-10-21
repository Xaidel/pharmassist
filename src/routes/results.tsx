import { createFileRoute } from '@tanstack/react-router'

import { ResultsPage } from '#/features/results/pages/results-page'

type ResultsSearch = {
  add?: string
}

function validateResultsSearch(search: Record<string, unknown>): ResultsSearch {
  const add = search.add
  return typeof add === 'string' && add.length > 0 ? { add } : {}
}

export const Route = createFileRoute('/results')({
  validateSearch: validateResultsSearch,
  component: ResultsPage,
})
