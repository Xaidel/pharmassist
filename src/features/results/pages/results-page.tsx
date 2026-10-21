import { getRouteApi } from '@tanstack/react-router'
import { useCallback } from 'react'

import { ResultsExperience } from '../components/results-experience'

const routeApi = getRouteApi('/results')

function readAddParam(search: unknown): string | undefined {
  if (typeof search !== 'object' || search === null) {
    return undefined
  }
  const value: unknown = Reflect.get(search, 'add')
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Render the basket price comparison screen. */
export function ResultsPage(): React.JSX.Element {
  const search: unknown = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const add = readAddParam(search)

  const handleAddHandled = useCallback((): void => {
    void navigate({ to: '/results', search: {}, replace: true })
  }, [navigate])

  return <ResultsExperience initialAdd={add} onAddHandled={handleAddHandled} />
}
