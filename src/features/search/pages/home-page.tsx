import { getRouteApi, Link } from '@tanstack/react-router'
import { ScanLine } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '#/lib/cn'
import { InfoButton } from '#/shared/components/info-button'
import { Button } from '#/shared/components/ui/button'

import { HomeMap } from '../components/home-map'
import {
  SearchExperience,
  type BasketAccess,
} from '../components/search-experience'

const routeApi = getRouteApi('/')

function readQuery(search: unknown): string | undefined {
  if (typeof search !== 'object' || search === null) {
    return undefined
  }
  const value: unknown = Reflect.get(search, 'q')
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

type HomePageProps = {
  /**
   * Render a floating action over the map, such as the basket. It reports when
   * it opens a panel over the top half, so the search sheet can make room.
   */
  renderBasket?: (onOpenChange: (open: boolean) => void) => ReactNode
  /** Lets search results add to and remove from the basket without leaving home. */
  basket?: BasketAccess
}

/** Render the POC's map-backed, search-first home screen. */
export function HomePage({
  renderBasket,
  basket,
}: HomePageProps): React.JSX.Element {
  const [basketOpen, setBasketOpen] = useState(false)
  const initialQuery = readQuery(routeApi.useSearch())
  const navigate = routeApi.useNavigate()

  // Keep the search in the URL without a new history entry, so Back skips it.
  const handleQueryChange = useCallback(
    (query: string): void => {
      void navigate({
        to: '/',
        search: query === '' ? {} : { q: query },
        replace: true,
      })
    },
    [navigate],
  )

  // A new key remounts the search, clearing its input and results; a reset
  // search never restores the URL query.
  const [searchKey, setSearchKey] = useState(0)
  const handleHome = useCallback((): void => {
    setSearchKey((key) => key + 1)
  }, [])

  const handleScan = useCallback((): void => {
    void navigate({ to: '/scan' })
  }, [navigate])

  return (
    <main className="relative h-dvh overflow-clip bg-muted">
      {/* z-0 keeps the map and its controls beneath every panel. */}
      <HomeMap className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-md items-center gap-2 px-4 pt-safe-top">
        {/* Same width as the basket button, so the badge sits at true center. */}
        <div aria-hidden="true" className="size-14 shrink-0" />
        <div className="flex min-w-0 flex-1 justify-center">
          <InfoButton
            badgeText="Demo data"
            description="Pharmacies are real; prices and stock are sample data. No sign-up, and nothing personal is stored."
            label="Demo data. Tap for details."
            title="Demo data"
          />
        </div>
        <div className="size-14 shrink-0">{renderBasket?.(setBasketOpen)}</div>
      </div>

      <section
        aria-label="Find a medicine"
        className={cn(
          'absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-md flex-col overflow-y-auto rounded-t-3xl border border-b-0 border-border bg-card dot-grid px-5 pb-safe pt-6 shadow-sheet sm:bottom-6 sm:rounded-3xl sm:border-b',
          // With the basket open over the top half, keep to the bottom half.
          basketOpen ? 'max-h-sheet-peek' : 'max-h-[85dvh]',
        )}
      >
        <h1 className="mx-auto w-64 max-w-full shrink-0">
          {/* The logo returns to a fresh home: the search clears and the URL drops q. */}
          <Link
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={handleHome}
            replace
            search={{}}
            to="/"
          >
            <img
              alt="PharmAssist — Got a list?"
              className="h-auto w-full"
              height={52}
              src="/brand/pharmassist-logo.png"
              width={260}
            />
          </Link>
        </h1>

        <SearchExperience
          key={searchKey}
          {...(basket === undefined ? {} : { basket })}
          {...(initialQuery === undefined || searchKey > 0
            ? {}
            : { initialQuery })}
          onQueryChange={handleQueryChange}
        />

        <Button
          className="mt-3 w-full"
          onClick={handleScan}
          size="lg"
          type="button"
          variant="outline"
        >
          <ScanLine aria-hidden="true" className="size-5" />
          Scan a prescription
        </Button>
      </section>
    </main>
  )
}
