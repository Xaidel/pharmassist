import { createFileRoute } from '@tanstack/react-router'

import { sessionBasket } from '#/features/results/basket-actions'
import { HomeBasket } from '#/features/results/components/home-basket'
import { HomePage } from '#/features/search/pages/home-page'

type HomeSearch = {
  q?: string
}

// The last search lives in the URL, so Back from results restores it.
function validateHomeSearch(search: Record<string, unknown>): HomeSearch {
  const q = search.q
  return typeof q === 'string' && q.trim().length > 0 ? { q } : {}
}

export const Route = createFileRoute('/')({
  validateSearch: validateHomeSearch,
  component: HomeRoute,
})

// The home page belongs to search; the basket it adds to belongs to results.
function HomeRoute(): React.JSX.Element {
  return (
    <HomePage
      basket={sessionBasket}
      renderBasket={(onOpenChange) => (
        <HomeBasket onOpenChange={onOpenChange} />
      )}
    />
  )
}
