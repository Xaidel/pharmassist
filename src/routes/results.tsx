import { createFileRoute } from '@tanstack/react-router'

import { ResultsPage } from '#/features/results/pages/results-page'
import { baseUnitSchema, type BaseUnit } from '#/shared/domain/medicine-summary'

type ResultsSearch = {
  add?: string
  unit?: BaseUnit
}

function validateResultsSearch(search: Record<string, unknown>): ResultsSearch {
  const add = search.add
  if (typeof add !== 'string' || add.length === 0) {
    return {}
  }
  const unit = baseUnitSchema.safeParse(search.unit)
  return unit.success ? { add, unit: unit.data } : { add }
}

export const Route = createFileRoute('/results')({
  validateSearch: validateResultsSearch,
  component: ResultsPage,
})
