import { getRouteApi } from '@tanstack/react-router'
import { useCallback } from 'react'

import { baseUnitSchema, type BaseUnit } from '#/shared/domain/medicine-summary'

import {
  ResultsExperience,
  type RenderAddMedicine,
} from '../components/results-experience'

const routeApi = getRouteApi('/results')

function readAddParam(search: unknown): string | undefined {
  if (typeof search !== 'object' || search === null) {
    return undefined
  }
  const value: unknown = Reflect.get(search, 'add')
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readUnitParam(search: unknown): BaseUnit | undefined {
  if (typeof search !== 'object' || search === null) {
    return undefined
  }
  const parsed = baseUnitSchema.safeParse(Reflect.get(search, 'unit'))
  return parsed.success ? parsed.data : undefined
}

type ResultsPageProps = {
  /** Renders the in-basket medicine search; the route supplies it. */
  renderAddMedicine?: RenderAddMedicine
}

/** Render the basket price comparison screen. */
export function ResultsPage({
  renderAddMedicine,
}: ResultsPageProps): React.JSX.Element {
  const search: unknown = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const add = readAddParam(search)
  const unit = readUnitParam(search)

  const handleAddHandled = useCallback((): void => {
    void navigate({ to: '/results', search: {}, replace: true })
  }, [navigate])

  return (
    <ResultsExperience
      initialAdd={add}
      initialUnit={unit}
      onAddHandled={handleAddHandled}
      {...(renderAddMedicine === undefined ? {} : { renderAddMedicine })}
    />
  )
}
