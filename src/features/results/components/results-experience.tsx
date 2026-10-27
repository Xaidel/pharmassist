import { Link } from '@tanstack/react-router'
import { MapPin as MapPinIcon, Maximize2, Minimize2, Tag } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { cn } from '#/lib/cn'
import { sendEvents } from '#/lib/events'

import { InfoButton } from '#/shared/components/info-button'
import { Alert } from '#/shared/components/ui/alert'
import { Button } from '#/shared/components/ui/button'
import type { BaseUnit } from '#/shared/domain/medicine-summary'

import { isAbortError, postResults, ResultsRequestError } from '../results.api'
import { DirectionsRequestError, fetchDirections } from '../directions.api'
import type { DirectionsResponse } from '../directions.schema'
import {
  addBasketLine,
  clearBasket,
  getSessionStorage,
  readBasket,
  removeBasketLine,
  setBasketQuantity,
  writeBasket,
} from '../results.basket'
import {
  cheapestCompleteResultKey,
  nearestCompleteResultKey,
  type BasketLine,
  type Origin,
  type ResultSort,
} from '../results.domain'
import {
  formatDistance,
  formatDuration,
  formatPesoCompact,
} from '../results.format'
import {
  fitToPacks,
  presetsFromResults,
  type QuantityPreset,
} from '../results.quantity'
import type { ResultsResponse } from '../results.schema'

import { BackButton } from '#/shared/components/back-button'
import { BasketDrawer } from './basket-drawer'
import { BasketPanel } from './basket-panel'
import { BasketToggleButton } from './basket-toggle-button'
import { CandidateGenerics } from './candidate-generics'
import { MapModeToggleButton } from './map-mode-toggle-button'
import { PharmacyDetailSheet } from './pharmacy-detail-sheet'
import {
  noPriceKey,
  NO_PRICE_KEY_PREFIX,
  ResultsList,
  type FeaturedResult,
} from './results-list'
import { ResultsMap, type MapPin } from './results-map'
import { useSheetDrag, type SheetSnap } from './use-sheet-drag'

/** A medicine chosen from an in-place picker. */
export type AddedMedicine = {
  medicineId: string
  unit: BaseUnit
}

/** Renders a medicine search that adds without leaving the page. */
export type RenderAddMedicine = (
  onPick: (medicine: AddedMedicine) => void,
  excludeIds: readonly string[],
) => ReactNode

type ResultsExperienceProps = {
  initialAdd: string | undefined
  initialUnit: BaseUnit | undefined
  onAddHandled: () => void
  renderAddMedicine?: RenderAddMedicine
}

type LoadStatus = 'idle' | 'loading' | 'updating'

// Share of the screen the peeking sheet covers, and the floating top bar height.
// Keep in step with the `h-sheet-peek` and `h-sheet-full` utilities in styles.css.
const SHEET_PEEK_RATIO = 0.46
const SHEET_FULL_RATIO = 0.88
// Keep in step with the `h-sheet-closed` utility: just the handle row.
const SHEET_CLOSED_PX = 56
// The basket button plus the 2D/3D button beneath it.
const TOP_BAR_CLEARANCE_PX = 120
type RouteStatus = 'idle' | 'loading' | 'error'

type ActiveRoute = {
  response: DirectionsResponse
  pharmacyName: string
}

function resultErrorMessage(error: unknown): string {
  if (error instanceof ResultsRequestError) {
    if (error.code === 'UNKNOWN_MEDICINE') {
      return 'One medicine in your list is no longer in the catalog. Remove it or clear the list.'
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
    data.sold_per_pack_only.find((entry) => entry.result_key === key) ??
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
  initialUnit,
  onAddHandled,
  renderAddMedicine,
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
  const [trackedPharmacyId, setTrackedPharmacyId] = useState<string | null>(
    null,
  )
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle')
  const [routeError, setRouteError] = useState<string | null>(null)
  const [locationAttempt, setLocationAttempt] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [sheet, setSheet] = useState<SheetSnap>('peek')
  const [basketOpen, setBasketOpen] = useState(false)
  const [map3d, setMap3d] = useState(true)

  // True only while the sheet is closed because the user started adding a
  // medicine, so closing the basket reopens it; a sheet the user closed stays closed.
  const closedForAddingRef = useRef(false)

  function snapSheet(next: SheetSnap): void {
    closedForAddingRef.current = false
    // A full sheet needs the whole screen, so the basket gives way.
    if (next === 'full') {
      setBasketOpen(false)
    }
    setSheet(next)
  }

  function closeBasket(): void {
    setBasketOpen(false)
    if (closedForAddingRef.current) {
      closedForAddingRef.current = false
      setSheet('peek')
    }
  }

  const sheetDrag = useSheetDrag({
    snap: sheet,
    onSnap: snapSheet,
    closedPx: SHEET_CLOSED_PX,
    peekRatio: SHEET_PEEK_RATIO,
    fullRatio: SHEET_FULL_RATIO,
  })
  const dragHeight = sheetDrag.dragHeight

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
      if (initialUnit === undefined) {
        addNotice =
          'That medicine could not be added automatically. Search and add it again.'
      } else {
        const outcome = addBasketLine(next, initialAdd, initialUnit)
        next = outcome.lines
        added = outcome.added
        if (!outcome.added) {
          addNotice =
            outcome.reason === 'full'
              ? 'Your list can hold up to 10 medicines. Remove one before adding another.'
              : 'That medicine is already in your list.'
        }
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
  }, [initialAdd, initialUnit, onAddHandled])

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
    setTrackedPharmacyId(null)
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
            .map(
              (item) =>
                `${item.medicine_id}:${String(item.quantity)}:${item.unit}`,
            )
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
                sold_per_pack_only_count: response.sold_per_pack_only.length,
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

  const presetsByMedicine = useMemo(
    () =>
      data === null
        ? new Map<string, readonly QuantityPreset[]>()
        : presetsFromResults(data),
    [data],
  )

  // Bottles, tubes, and inhalers are only sold whole. Once prices show the
  // real pack size, fit the basket to it and say when an amount was rounded.
  const packCheckedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (data === null) {
      return
    }
    const fit = fitToPacks(
      basketLines,
      presetsByMedicine,
      packCheckedRef.current,
    )
    for (const line of basketLines) {
      packCheckedRef.current.add(line.medicine_id)
    }
    if (fit.lines.every((line, index) => line === basketLines[index])) {
      return
    }
    writeBasket(getSessionStorage(), fit.lines)
    setBasketLines(fit.lines)
    if (fit.roundedIds.length > 0) {
      const names = fit.roundedIds.map((medicineId) => {
        const medicine = data.basket.items.find(
          (item) => item.medicine_id === medicineId,
        )?.medicine
        return medicine === undefined
          ? medicineId
          : (medicine.brand_name ?? medicine.generic_name)
      })
      setNotice(
        `${names.join(' and ')} ${
          names.length === 1 ? 'is' : 'are'
        } only sold as whole packs, so the amount was rounded up to the next full pack.`,
      )
    }
  }, [data, basketLines, presetsByMedicine])

  // The starred result follows the sort the shown results were ranked by.
  const featured = useMemo<FeaturedResult | null>(() => {
    if (data === null) {
      return null
    }
    const kind = data.meta.sort === 'distance' ? 'nearest' : 'cheapest'
    const key =
      kind === 'nearest'
        ? nearestCompleteResultKey(data.complete)
        : cheapestCompleteResultKey(data.complete)
    return key === null ? null : { key, kind }
  }, [data])

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
        variant: result.above_mdrp_ceiling
          ? 'above-mdrp'
          : result.result_key === featured?.key
            ? featured.kind
            : 'complete',
      })
    }
    for (const result of data.sold_per_pack_only) {
      next.push({
        key: result.result_key,
        pharmacyId: result.pharmacy.pharmacy_id,
        name: result.pharmacy.name,
        latitude: result.pharmacy.latitude,
        longitude: result.pharmacy.longitude,
        label: formatPesoCompact(result.covering_total_php),
        variant: 'pack-only',
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
  }, [data, featured])

  function persist(next: BasketLine[]): void {
    const storage = getSessionStorage()
    writeBasket(storage, next)
    setBasketLines(next)
  }

  function handleQuantityChange(medicineId: string, quantity: number): void {
    persist(setBasketQuantity(basketLines, medicineId, quantity))
  }

  function handleAdd({ medicineId, unit }: AddedMedicine): void {
    const outcome = addBasketLine(basketLines, medicineId, unit)
    if (!outcome.added) {
      setNotice(
        outcome.reason === 'full'
          ? 'Your list can hold up to 10 medicines. Remove one before adding another.'
          : 'That medicine is already in your list.',
      )
      return
    }
    setNotice(null)
    persist(outcome.lines)
    sendEvents([
      {
        name: 'basket_item_added',
        properties: { source: 'search', item_count: outcome.lines.length },
      },
    ]).catch(() => undefined)
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
    setTrackedPharmacyId(null)
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
    setTrackedPharmacyId(context.pharmacyId)
    // Drop the sheet so the route on the map is visible.
    setSheet('peek')
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

  function handlePinSelect(key: string, focused: boolean): void {
    if (routeFocus && !focused) {
      setSelectedKey(key)
      return
    }
    setSelectedKey(key)
    setDetailKey(key)
  }

  function toggleBasket(): void {
    if (basketOpen) {
      closeBasket()
      return
    }
    // Basket takes the upper half; only a full sheet must shrink to make room.
    setSheet((current) => (current === 'full' ? 'peek' : current))
    setBasketOpen(true)
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

  const routeFocus = routeStatus === 'loading' || activeRoute !== null
  const busy = status !== 'idle'
  const empty = hydrated && basketLines.length === 0

  const sheetExpanded = sheet === 'full'
  const basketCount = basketLines.length

  return (
    <main className="relative h-dvh overflow-clip bg-muted">
      <div
        className={cn(
          'absolute inset-0 z-0 transition-opacity motion-reduce:transition-none',
          busy && data !== null && 'opacity-70',
        )}
      >
        <ResultsMap
          coveredBottomRatio={SHEET_PEEK_RATIO}
          coveredTop={TOP_BAR_CLEARANCE_PX}
          focusMode={routeFocus}
          is3d={map3d}
          onSelect={handlePinSelect}
          origin={origin}
          pins={pins}
          route={activeRoute?.response.route ?? null}
          routeLoading={routeStatus === 'loading'}
          selectedKey={selectedKey}
          trackedPharmacyId={trackedPharmacyId}
        />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-xl items-center gap-2 px-4 pt-safe-top">
        <BackButton />
        <div className="ml-auto flex flex-col items-center gap-2">
          <BasketToggleButton
            count={basketCount}
            onToggle={toggleBasket}
            open={basketOpen}
          />
          <MapModeToggleButton
            is3d={map3d}
            onToggle={() => {
              setMap3d((current) => !current)
            }}
          />
        </div>

        {basketOpen && (
          <BasketDrawer
            className={cn(
              'pointer-events-auto absolute inset-x-4 top-full mt-2',
              // With the sheet closed for adding, the basket may use more height.
              sheet === 'closed' && 'max-h-basket-tall',
            )}
            onClose={closeBasket}
          >
            <BasketPanel
              addMedicine={renderAddMedicine?.(
                handleAdd,
                basketLines.map((line) => line.medicine_id),
              )}
              busy={busy}
              items={basketLines}
              medicines={medicines}
              onClear={handleClear}
              onClose={closeBasket}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
              presetsByMedicine={presetsByMedicine}
              onStartAdding={() => {
                if (sheet !== 'closed') {
                  closedForAddingRef.current = true
                }
                setSheet('closed')
              }}
            />
          </BasketDrawer>
        )}
      </header>

      <section
        aria-labelledby="results-sheet-heading"
        className={cn(
          'absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-xl flex-col rounded-t-3xl border border-b-0 border-border bg-card shadow-sheet sm:bottom-4 sm:rounded-3xl sm:border-b',
          dragHeight !== null
            ? 'h-sheet-drag'
            : cn(
                'transition-sheet',
                sheet === 'full'
                  ? 'h-sheet-full'
                  : sheet === 'closed'
                    ? 'h-sheet-closed'
                    : 'h-sheet-peek',
              ),
        )}
        style={
          dragHeight === null
            ? undefined
            : ({
                '--sheet-drag-height': `${String(dragHeight)}px`,
              } as CSSProperties)
        }
      >
        <div className="relative shrink-0">
          <button
            aria-controls="results-sheet-body"
            aria-expanded={sheet !== 'closed'}
            className="flex h-14 w-full cursor-grab touch-none select-none items-center justify-center rounded-t-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:cursor-grabbing"
            type="button"
            {...sheetDrag.handleProps}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-16 rounded-full bg-primary/20"
            />
            <span className="sr-only">
              {sheet === 'closed'
                ? 'Show results'
                : sheetExpanded
                  ? 'Show more of the map'
                  : 'Show all results'}
            </span>
          </button>
          {/* A tap target for people who cannot or do not swipe. */}
          <Button
            aria-label={sheetExpanded ? 'Show the map' : 'Show the full list'}
            className="absolute right-3 top-2"
            onClick={() => {
              snapSheet(sheetExpanded ? 'peek' : 'full')
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            {sheetExpanded ? (
              <Minimize2 aria-hidden="true" className="size-5" />
            ) : (
              <Maximize2 aria-hidden="true" className="size-5" />
            )}
          </Button>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-safe"
          id="results-sheet-body"
        >
          {/* The map, top bar, and cards already say what this is; the title stays for screen readers. */}
          <h1 className="sr-only" id="results-sheet-heading">
            Compare your list prices
          </h1>
          {data !== null && (
            <div
              aria-label="Sort results"
              className="mb-3 grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1"
              role="group"
            >
              <Button
                aria-pressed={sort === 'price'}
                onClick={() => {
                  handleSort('price')
                }}
                type="button"
                variant={sort === 'price' ? 'default' : 'ghost'}
              >
                <Tag aria-hidden="true" className="size-4" />
                Cheapest first
              </Button>
              <Button
                aria-pressed={sort === 'distance'}
                onClick={() => {
                  handleSort('distance')
                }}
                type="button"
                variant={sort === 'distance' ? 'default' : 'ghost'}
              >
                <MapPinIcon aria-hidden="true" className="size-4" />
                Nearest first
              </Button>
            </div>
          )}
          {data !== null && (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span>
                {locationState === 'device'
                  ? locationLabel('device')
                  : locationState === 'locating'
                    ? 'Using Naga City center while we check your location.'
                    : locationLabel('naga_center')}
              </span>
              <InfoButton
                description={
                  locationState === 'device'
                    ? 'Distances are measured in a straight line from where you are now. The road trip can be longer; tap Show route on a pharmacy to see it.'
                    : 'Your location is off, so distances are measured in a straight line from Naga City center, not from you. Turn on location to see how far each pharmacy is from where you are.'
                }
                label="About distances"
                title="How distances work"
              >
                {(close) =>
                  locationState === 'fallback' ? (
                    <Button
                      onClick={() => {
                        requestLocation()
                        close()
                      }}
                      type="button"
                    >
                      Use my location
                    </Button>
                  ) : null
                }
              </InfoButton>
              {busy && <span role="status">Updating prices…</span>}
            </p>
          )}

          {!hydrated && (
            <p
              aria-busy="true"
              className="mt-4 text-sm text-muted-foreground"
              role="status"
            >
              Loading your list…
            </p>
          )}

          {empty && (
            <div className="mt-4">
              <h2 className="font-display text-lg font-semibold">
                Your list is empty
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Search for a medicine and tap Add to your list to rank the
                seeded pharmacies for your list.
              </p>
              <Link
                className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-2 hover:underline"
                to="/"
              >
                Search for a medicine
              </Link>
            </div>
          )}

          {!empty && hydrated && isInitialLoading(data, status) && (
            <p
              aria-busy="true"
              className="mt-4 text-sm text-muted-foreground"
              role="status"
            >
              Checking prices and stock at the seeded pharmacies…
            </p>
          )}

          {!empty && hydrated && error !== null && data === null && (
            <div className="mt-4">
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
                  Clear list
                </Button>
              </div>
            </div>
          )}

          {!empty && data !== null && (
            <>
              {notice !== null && (
                <Alert className="mt-4" variant="info">
                  {notice}
                </Alert>
              )}
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

              {routeStatus === 'error' && (
                <div className="mt-4">
                  <Alert variant={origin === null ? 'info' : 'destructive'}>
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
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"
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
                <ResultsList
                  activePharmacyId={activeRoute?.response.pharmacy_id ?? null}
                  data={data}
                  featured={featured}
                  medicines={medicines}
                  onOpenDetail={setDetailKey}
                  onShowRoute={handleShowRoute}
                  onUsePack={handleQuantityChange}
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

              <section className="mt-8 rounded-3xl border border-border bg-background p-5 text-sm leading-relaxed text-muted-foreground">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  About these prices
                </h2>
                <p className="mt-2">
                  Every amount is a reference shelf price for the form shown,
                  not a quote. Seeded demo prices and stock are mocked; pharmacy
                  names and locations are real. Confirm the price at the
                  pharmacy.
                </p>
                <p className="mt-2">
                  MDRP ceilings come from EO 104 s. 2020 and EO 155 s. 2021 and
                  are shown separately from the observed price. MDRP-compliant
                  complete lists rank before lists with an item above the
                  published ceiling, and only a compliant list can be marked
                  cheapest. A VAT-exclusive ceiling is compared at 1.12 times
                  the published amount for VATable products, and directly for
                  VAT-exempt products. Statutory senior and PWD discounts are
                  applied at the point of sale and are not computed here.
                </p>
              </section>
            </>
          )}
        </div>
      </section>
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
