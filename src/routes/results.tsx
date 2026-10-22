import { createFileRoute } from '@tanstack/react-router'

import { ResultsPage } from '#/features/results/pages/results-page'
import { MedicinePicker } from '#/features/search/components/medicine-picker'
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
  component: ResultsRoute,
})

// Results owns the basket; search owns finding a medicine to add to it.
function ResultsRoute(): React.JSX.Element {
  return (
    <ResultsPage
      renderAddMedicine={(onPick, excludeIds) => (
        <MedicinePicker excludeIds={excludeIds} onPick={onPick} />
      )}
    />
  )
}
