import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'

import { sendEvents } from '#/lib/events'
import { Alert } from '#/shared/components/ui/alert'
import { Badge } from '#/shared/components/ui/badge'
import { Button } from '#/shared/components/ui/button'
import { Card } from '#/shared/components/ui/card'

import { isAbortError, postResults, ResultsRequestError } from '../results.api'
import { DirectionsRequestError, fetchDirections } from '../directions.api'
import type { DirectionsResponse } from '../directions.schema'
import {
  addBasketLine,
  clearBasket,
  getSessionStorage,
  readBasket,
  removeBasketLine,
  setBasketPacks,
  writeBasket,
} from '../results.basket'
import {
  cheapestCompleteResultKey,
  type BasketLine,
  type Origin,
  type ResultSort,
} from '../results.domain'
import {
  formatDistance,
  formatDuration,
  formatPesoCompact,
} from '../results.format'
import type { ResultsResponse } from '../results.schema'

import { BasketPanel } from './basket-panel'
import { CandidateGenerics } from './candidate-generics'
import { PharmacyDetailSheet } from './pharmacy-detail-sheet'
import { noPriceKey, NO_PRICE_KEY_PREFIX, ResultsList } from './results-list'
import { ResultsMap, type MapPin } from './results-map'

type ResultsExperienceProps = {
  initialAdd: string | undefined
  onAddHandled: () => void
}

type LoadStatus = 'idle' | 'loading' | 'updating'
type RouteStatus = 'idle' | 'loading' | 'error'

type ActiveRoute = {
  response: DirectionsResponse
  pharmacyName: string
}

function resultErrorMessage(error: unknown): string {
  if (error instanceof ResultsRequestError) {
    if (error.code === 'UNKNOWN_MEDICINE') {
      return 'One medicine in this basket is no longer in the catalog. Remove it or clear the basket.'
    }
    return error.message
  }
  return 'Prices are unavailable right now. Check your connection and try again.'
}

function locationLabel(source: 'device' | 'naga_center'): string {
  return source === 'device'
    ? 'Distances use your current location.'
    : 'Distances use the Naga City center.'
}

type DetailContext = {
  pharmacyId: string
  pharmacyName: string
  resultKey: string | null
  reported: boolean
  reportedAt: string | null
}

function detailContextForKey(
  key: string,
  data: ResultsResponse,
): DetailContext | null {
  if (key.startsWith(NO_PRICE_KEY_PREFIX)) {
    const pharmacyId = key.slice(NO_PRICE_KEY_PREFIX.length)
    const pharmacy = data.no_price_data.find(
      (entry) => entry.pharmacy.pharmacy_id === pharmacyId,
    )?.pharmacy
    if (pharmacy === undefined) {
      return null
    }
    return {
      pharmacyId,
      pharmacyName: pharmacy.name,
      resultKey: null,
      reported: false,
      reportedAt: null,
    }
  }

  const result =
    data.complete.find((entry) => entry.result_key === key) ??
    data.incomplete.find((entry) => entry.result_key === key)
  if (result === undefined) {
    return null
  }
  return {
    pharmacyId: result.pharmacy.pharmacy_id,
    pharmacyName: result.pharmacy.name,
    resultKey: result.result_key,
    reported: result.reported,
    reportedAt: result.reported_at,
  }
}

/** Run the map-first basket comparison experience. */
export function ResultsExperience({
  initialAdd,
  onAddHandled,
}: ResultsExperienceProps): React.JSX.Element {
  const [basketLines, setBasketLines] = useState<BasketLine[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [locationState, setLocationState] = useState<
    'locating' | 'device' | 'fallback'
  >('locating')
  const [sort, setSort] = useState<ResultSort>('price')
  const [data, setData] = useState<ResultsResponse | null>(null)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [detailKey, setDetailKey] = useState<string | null>(null)
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null)
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle')
  const [routeError, setRouteError] = useState<string | null>(null)
  const [locationAttempt, setLocationAttempt] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)

  const initialAddHandledRef = useRef(false)
  const lastViewedRef = useRef<string | null>(null)
  const routeRequestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (initialAddHandledRef.current) {
      return
    }
    initialAddHandledRef.current = true

    const storage = getSessionStorage()
    let next = readBasket(storage)
    let added = false
    let addNotice: string | null = null

    if (initialAdd !== undefined) {
      const outcome = addBasketLine(next, initialAdd)
      next = outcome.lines
      added = outcome.added
      if (!outcome.added) {
        addNotice =
          outcome.reason === 'full'
            ? 'A basket can hold up to 10 medicines. Remove one before adding another.'
            : 'That medicine is already in your basket.'
      }
    }

    writeBasket(storage, next)
    setBasketLines(next)
    setHydrated(true)
    if (addNotice !== null) {
      setNotice(addNotice)
    }
    if (added) {
      sendEvents([
        {
          name: 'basket_item_added',
          properties: { source: 'search', item_count: next.length },
        },
      ]).catch(() => undefined)
    }
    if (initialAdd !== undefined) {
      onAddHandled()
    }
  }, [initialAdd, onAddHandled])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationState('fallback')
      return
    }

    setLocationState('locating')
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) {
          return
        }
        setOrigin({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationState('device')
      },
      () => {
        if (!cancelled) {
          setOrigin(null)
          setLocationState('fallback')
        }
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    )

    return () => {
      cancelled = true
    }
  }, [locationAttempt])

  useEffect(() => {
    routeRequestRef.current?.abort()
    setActiveRoute(null)
    setRouteStatus('idle')
    setRouteError(null)
  }, [origin])

  useEffect(() => {
    if (routeStatus === 'idle' && activeRoute === null) {
      return
    }
    const element = document.getElementById('results-map')
    if (element === null) {
      return
    }
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    element.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [activeRoute, routeStatus])

  useEffect(() => {
    return () => {
      routeRequestRef.current?.abort()
    }
  }, [])

  function requestLocation(): void {
    setRouteError(null)
    setRouteStatus('idle')
    setLocationState('locating')
    setLocationAttempt((attempt) => attempt + 1)
  }

  useEffect(() => {
    if (!hydrated) {
      return
    }
    if (basketLines.length === 0) {
      setData(null)
      setError(null)
      setStatus('idle')
      return
    }

    const controller = new AbortController()
    setStatus(data === null ? 'loading' : 'updating')
    setError(null)

    void postResults({ items: basketLines, origin, sort }, controller.signal)
      .then((response) => {
        setData(response)
        setStatus('idle')
        const signature = [
          response.meta.sort,
          response.origin.source,
          response.basket.items
            .map((item) => `${item.medicine_id}:${String(item.packs)}`)
            .join(','),
          localeOriginKey(response.origin),
        ].join('|')
        if (lastViewedRef.current !== signature) {
          lastViewedRef.current = signature
          sendEvents([
            {
              name: 'results_viewed',
              properties: {
                item_count: response.basket.item_count,
                complete_count: response.complete.length,
                incomplete_count: response.incomplete.length,
                no_price_count: response.no_price_data.length,
                sort: response.meta.sort,
              },
            },
          ]).catch(() => undefined)
        }
      })
      .catch((requestError: unknown) => {
        if (isAbortError(requestError)) {
          return
        }
        setError(resultErrorMessage(requestError))
        setStatus('idle')
      })

    return () => {
      controller.abort()
    }
  }, [hydrated, basketLines, origin, sort, reloadToken])

  useEffect(() => {
    if (selectedKey === null) {
      return
    }
    const element = document.getElementById(`result-${selectedKey}`)
    if (element === null) {
      return
    }
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    element.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [selectedKey])

  const medicines = useMemo(
    () => data?.basket.items.map((item) => item.medicine) ?? [],
    [data],
  )

  const cheapestKey = useMemo(
    () => (data === null ? null : cheapestCompleteResultKey(data.complete)),
    [data],
  )

  const detailContext = useMemo(
    () =>
      detailKey === null || data === null
        ? null
        : detailContextForKey(detailKey, data),
    [detailKey, data],
  )

  const pins = useMemo<MapPin[]>(() => {
    if (data === null) {
      return []
    }
    const next: MapPin[] = []
    for (const result of data.complete) {
      next.push({
        key: result.result_key,
        pharmacyId: result.pharmacy.pharmacy_id,
        name: result.pharmacy.name,
        latitude: result.pharmacy.latitude,
        longitude: result.pharmacy.longitude,
        label: formatPesoCompact(result.total_shelf_price_php),
        variant: result.result_key === cheapestKey ? 'cheapest' : 'complete',
      })
    }
    for (const result of data.incomplete) {
      next.push({
        key: result.result_key,
        pharmacyId: result.pharmacy.pharmacy_id,
        name: result.pharmacy.name,
        latitude: result.pharmacy.latitude,
        longitude: result.pharmacy.longitude,
        label: `${String(result.missing_items.length)} missing`,
        variant: 'incomplete',
      })
    }
    for (const { pharmacy } of data.no_price_data) {
      next.push({
        key: noPriceKey(pharmacy.pharmacy_id),
        pharmacyId: pharmacy.pharmacy_id,
        name: pharmacy.name,
        latitude: pharmacy.latitude,
        longitude: pharmacy.longitude,
        label: 'No price',
        variant: 'no-price',
      })
    }
    return next
  }, [data, cheapestKey])

  function persist(next: BasketLine[]): void {
    const storage = getSessionStorage()
    writeBasket(storage, next)
    setBasketLines(next)
  }

  function handlePacksChange(medicineId: string, packs: number): void {
    persist(setBasketPacks(basketLines, medicineId, packs))
  }

  function handleRemove(medicineId: string): void {
    const next = removeBasketLine(basketLines, medicineId)
    persist(next)
    if (next.length === 0) {
      setSelectedKey(null)
      setDetailKey(null)
    }
    sendEvents([
      {
        name: 'basket_item_removed',
        properties: { item_count: next.length },
      },
    ]).catch(() => undefined)
  }

  function handleClear(): void {
    clearRoute()
    clearBasket(getSessionStorage())
    setBasketLines([])
    setSelectedKey(null)
    setDetailKey(null)
    setError(null)
    setNotice(null)
    lastViewedRef.current = null
  }

  function clearRoute(): void {
    routeRequestRef.current?.abort()
    setActiveRoute(null)
    setRouteStatus('idle')
    setRouteError(null)
  }

  function handleShowRoute(key: string): void {
    if (data === null) {
      return
    }
    const context = detailContextForKey(key, data)
    if (context === null) {
      return
    }

    if (activeRoute?.response.pharmacy_id === context.pharmacyId) {
      clearRoute()
      return
    }

    setSelectedKey(key)
    setDetailKey(null)
    routeRequestRef.current?.abort()
    setActiveRoute(null)
    setRouteError(null)

    if (origin === null) {
      setRouteStatus('error')
      setRouteError(
        'Turn on location to see a route from your current position.',
      )
      return
    }

    const controller = new AbortController()
    routeRequestRef.current = controller
    setRouteStatus('loading')
    sendEvents([
      {
        name: 'directions_tapped',
        properties: { pharmacy_id: context.pharmacyId },
      },
    ]).catch(() => undefined)

    void fetchDirections(
      { pharmacyId: context.pharmacyId, origin },
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) {
          return
        }
        setActiveRoute({
          response,
          pharmacyName: context.pharmacyName,
        })
        setRouteStatus('idle')
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return
        }
        setRouteError(
          error instanceof DirectionsRequestError
            ? error.message
            : 'A route is unavailable right now. Check your connection and try again.',
        )
        setRouteStatus('error')
      })
  }

  function handleSort(nextSort: ResultSort): void {
    if (nextSort === sort) {
      return
    }
    setSort(nextSort)
    sendEvents([
      { name: 'results_sorted', properties: { sort: nextSort } },
    ]).catch(() => undefined)
  }

  const busy = status !== 'idle'
  const empty = hydrated && basketLines.length === 0

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-eyebrow-wide text-primary">
            Pharmassist POC
          </p>
          <Badge variant="primary">Demo data</Badge>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-display tracking-tight sm:text-5xl">
              Compare basket prices
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Seeded shelf prices across 10 real Naga pharmacy locations.
              Distances, completeness, and price freshness are shown for every
              result.
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
            to="/"
          >
            Search medicines
          </Link>
        </div>
      </header>

      {!hydrated && (
        <Card aria-busy="true" className="mt-6">
          <p className="p-6 text-sm text-muted-foreground" role="status">
            Loading your basket…
          </p>
        </Card>
      )}

      {empty && (
        <Card className="mt-6">
          <div className="p-6">
            <h2 className="font-display text-2xl font-semibold">
              Your basket is empty
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Search for a medicine and choose Compare prices to rank the seeded
              pharmacies for your basket.
            </p>
            <Link
              className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-2 hover:underline"
              to="/"
            >
              Search for a medicine
            </Link>
          </div>
        </Card>
      )}

      {!empty && hydrated && isInitialLoading(data, status) && (
        <Card aria-busy="true" className="mt-6">
          <p className="p-6 text-sm text-muted-foreground" role="status">
            Checking prices and stock at the seeded pharmacies…
          </p>
        </Card>
      )}

      {!empty && hydrated && error !== null && data === null && (
        <Card className="mt-6">
          <div className="p-6">
            <Alert>{error}</Alert>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setReloadToken((token) => token + 1)
                }}
                type="button"
              >
                Try again
              </Button>
              <Button onClick={handleClear} type="button" variant="outline">
                Clear basket
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!empty && data !== null && (
        <>
          <BasketPanel
            busy={busy}
            items={basketLines}
            medicines={medicines}
            onClear={handleClear}
            onPacksChange={handlePacksChange}
            onRemove={handleRemove}
          />

          {notice !== null && <Alert className="mt-4">{notice}</Alert>}
          {error !== null && (
            <div className="mt-4">
              <Alert>
                {error}{' '}
                <button
                  className="font-semibold underline underline-offset-2"
                  onClick={() => {
                    setReloadToken((token) => token + 1)
                  }}
                  type="button"
                >
                  Try again
                </button>
              </Alert>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <div
              aria-label="Sort results"
              className="flex flex-wrap gap-2"
              role="group"
            >
              <Button
                aria-pressed={sort === 'price'}
                onClick={() => {
                  handleSort('price')
                }}
                size="sm"
                type="button"
                variant={sort === 'price' ? 'default' : 'outline'}
              >
                Cheapest first
              </Button>
              <Button
                aria-pressed={sort === 'distance'}
                onClick={() => {
                  handleSort('distance')
                }}
                size="sm"
                type="button"
                variant={sort === 'distance' ? 'default' : 'outline'}
              >
                Nearest first
              </Button>
              {busy && (
                <span
                  className="self-center text-sm text-muted-foreground"
                  role="status"
                >
                  Updating prices…
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {locationState === 'device'
                ? locationLabel('device')
                : locationState === 'locating'
                  ? 'Using Naga City center while we check your location.'
                  : locationLabel('naga_center')}
            </p>
          </div>

          {routeStatus === 'error' && (
            <div className="mt-4">
              <Alert>
                {routeError}
                {origin === null && (
                  <div className="mt-3">
                    <Button
                      onClick={requestLocation}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Use my location
                    </Button>
                  </div>
                )}
              </Alert>
            </div>
          )}

          {activeRoute !== null && (
            <section
              aria-labelledby="active-route-heading"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <h2
                  className="font-display text-lg font-semibold"
                  id="active-route-heading"
                >
                  Route to {activeRoute.pharmacyName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDistance(activeRoute.response.distance_m)} · about{' '}
                  {formatDuration(activeRoute.response.duration_s)} · Route
                  preview, not turn-by-turn navigation.
                </p>
              </div>
              <Button
                onClick={clearRoute}
                size="sm"
                type="button"
                variant="outline"
              >
                Clear route
              </Button>
            </section>
          )}

          <div className={busy ? 'opacity-60' : undefined}>
            <ResultsMap
              onSelect={(key) => {
                setSelectedKey(key)
                setDetailKey(key)
              }}
              origin={origin}
              pins={pins}
              route={activeRoute?.response.route ?? null}
              routeLoading={routeStatus === 'loading'}
              selectedKey={selectedKey}
            />
          </div>

          <div className={busy ? 'opacity-60' : undefined}>
            <ResultsList
              activePharmacyId={activeRoute?.response.pharmacy_id ?? null}
              cheapestKey={cheapestKey}
              data={data}
              medicines={medicines}
              onOpenDetail={setDetailKey}
              onShowRoute={handleShowRoute}
            />
          </div>

          <CandidateGenerics
            groups={data.candidate_generics}
            medicines={medicines}
          />

          {detailContext !== null && (
            <PharmacyDetailSheet
              basketItems={basketLines}
              onOpenChange={(open) => {
                if (!open) {
                  setDetailKey(null)
                }
              }}
              onReported={() => {
                setReloadToken((token) => token + 1)
              }}
              onShowRoute={() => {
                if (detailKey !== null) {
                  handleShowRoute(detailKey)
                }
              }}
              open={detailKey !== null}
              origin={origin}
              pharmacyId={detailContext.pharmacyId}
              reported={detailContext.reported}
              reportedAt={detailContext.reportedAt}
              resultKey={detailContext.resultKey}
            />
          )}

          <section className="mt-10 rounded-3xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">
              About these prices
            </h2>
            <p className="mt-2">
              Every amount is a reference shelf price for the pack shown, not a
              quote. Seeded demo prices and stock are mocked; pharmacy names and
              locations are real. Confirm the price at the pharmacy.
            </p>
            <p className="mt-2">
              MDRP ceilings come from EO 104 s. 2020 and EO 155 s. 2021 and are
              shown separately from the observed price. Statutory senior and PWD
              discounts are applied at the point of sale and are not computed
              here.
            </p>
          </section>
        </>
      )}
    </main>
  )
}

function localeOriginKey(origin: ResultsResponse['origin']): string {
  return `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)}`
}

function isInitialLoading(
  data: ResultsResponse | null,
  status: LoadStatus,
): boolean {
  return data === null && status !== 'idle'
}
