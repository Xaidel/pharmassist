import type {
  Map as MapLibreMap,
  MapOptions,
  Marker,
  MarkerOptions,
  PaddingOptions,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '#/lib/cn'
import { addNagaBoundary } from '#/shared/components/naga-boundary'
import {
  createCalloutPin,
  declutterCallouts,
  type CalloutPin,
  type CalloutTone,
} from '#/shared/components/map-callout-pin'

import type { RouteGeometry } from '../directions.schema'
import { NAGA_CENTER } from '../results.domain'

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const ROUTE_SOURCE_ID = 'active-route'
const ROUTE_LAYER_ID = 'active-route-line'
const ROUTE_COLOR = '#0f6b57'

/** One pharmacy pin the results map renders. */
export type MapPin = {
  key: string
  pharmacyId: string
  name: string
  latitude: number
  longitude: number
  label: string
  variant:
    | 'cheapest'
    | 'nearest'
    | 'above-mdrp'
    | 'complete'
    | 'pack-only'
    | 'incomplete'
    | 'no-price'
}

type MapLibreModule = {
  Map: new (options: MapOptions) => MapLibreMap
  Marker: new (options?: MarkerOptions) => Marker
}

const PIN_TONES = {
  cheapest: 'highlight',
  nearest: 'highlight',
  'above-mdrp': 'muted',
  complete: 'primary',
  'pack-only': 'outline',
  incomplete: 'muted',
  'no-price': 'faint',
} as const satisfies Record<MapPin['variant'], CalloutTone>

// Stacking and focus belong to the element MapLibre positions; the scale
// belongs to its inner body, or it would drag the pin off its coordinate.
const PIN_ROOT =
  'rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

const PIN_SELECTED = 'scale-110'

function isStarred(variant: MapPin['variant']): boolean {
  return variant === 'cheapest' || variant === 'nearest'
}

function createPinElement(
  pin: MapPin,
  selected: boolean,
  tracked: boolean,
  muted: boolean,
): Pick<CalloutPin<HTMLButtonElement>, 'root' | 'callout'> {
  const {
    root: button,
    body,
    callout,
  } = createCalloutPin({
    tag: 'button',
    label: pin.label,
    tone: PIN_TONES[pin.variant],
    starred: isStarred(pin.variant),
    rootClassName: cn(
      PIN_ROOT,
      selected && 'z-30',
      !selected && tracked && 'z-20',
      !selected && !tracked && isStarred(pin.variant) && 'z-10',
      !selected && !tracked && !isStarred(pin.variant) && 'z-0',
    ),
    bodyClassName: cn(selected && PIN_SELECTED, muted && 'opacity-60'),
  })
  button.type = 'button'
  button.setAttribute(
    'aria-label',
    `${pin.name}: ${pin.label}${
      pin.variant === 'cheapest'
        ? ', cheapest compliant complete basket'
        : pin.variant === 'nearest'
          ? ', nearest compliant complete basket'
          : pin.variant === 'above-mdrp'
            ? ', above MDRP ceiling'
            : ''
    }`,
  )
  button.dataset.pharmacyPin = pin.key
  button.dataset.pinCalloutState = muted ? 'muted' : 'shown'
  body.dataset.pinBody = muted ? 'muted' : 'focused'
  callout.dataset.pinCallout = ''
  return { root: button, callout }
}

function createOriginMarkerElement(): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'pointer-events-none flex flex-col items-center'
  root.dataset.originMarker = ''
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'Your current location')

  const label = document.createElement('div')
  label.className =
    'rounded-full border border-highlight bg-card px-2.5 py-1 text-xs font-semibold text-highlight shadow-sm'
  label.textContent = 'You are here'

  const dot = document.createElement('div')
  dot.className = 'relative mt-1 flex size-5 items-center justify-center'

  const pulse = document.createElement('span')
  pulse.className =
    'absolute inline-flex size-5 animate-ping rounded-full bg-highlight/30 motion-reduce:animate-none'
  pulse.dataset.originPulse = ''
  pulse.setAttribute('aria-hidden', 'true')

  const core = document.createElement('span')
  core.className =
    'relative size-3.5 rounded-full border-2 border-card bg-highlight shadow-sm'
  core.setAttribute('aria-hidden', 'true')

  dot.append(pulse, core)
  root.append(label, dot)
  return root
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

type ResultsMapProps = {
  pins: readonly MapPin[]
  selectedKey: string | null
  /** The pharmacy whose route is loading or shown. */
  trackedPharmacyId: string | null
  /** True while a route request is running or a route is shown. */
  focusMode: boolean
  origin: { latitude: number; longitude: number } | null
  route: RouteGeometry | null
  routeLoading: boolean
  onSelect: (key: string, focused: boolean) => void
  /** Pixels the floating top bar covers at the top of the map. */
  coveredTop: number
  /** Share of the map height the bottom sheet covers. */
  coveredBottomRatio: number
}

/** Render the map-first price view over OpenFreeMap tiles. */
export function ResultsMap({
  pins,
  selectedKey,
  trackedPharmacyId,
  focusMode,
  origin,
  route,
  routeLoading,
  onSelect,
  coveredTop,
  coveredBottomRatio,
}: ResultsMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const coveredTopRef = useRef(coveredTop)
  const coveredBottomRatioRef = useRef(coveredBottomRatio)

  useEffect(() => {
    coveredTopRef.current = coveredTop
    coveredBottomRatioRef.current = coveredBottomRatio
  }, [coveredTop, coveredBottomRatio])

  // Frame content in the map area the overlays leave uncovered.
  const visiblePadding = useCallback(
    (margin: number): Required<PaddingOptions> => ({
      top: coveredTopRef.current + margin,
      right: margin,
      bottom:
        Math.round(
          (containerRef.current?.clientHeight ?? 0) *
            coveredBottomRatioRef.current,
        ) + margin,
      left: margin,
    }),
    [],
  )
  const mapRef = useRef<MapLibreMap | null>(null)
  const libRef = useRef<MapLibreModule | null>(null)
  const markersRef = useRef<Marker[]>([])
  const onSelectRef = useRef(onSelect)
  const initialOriginRef = useRef(origin)
  const fittedRef = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    let disposed = false
    let map: MapLibreMap | undefined
    const initialOrigin = initialOriginRef.current

    void import('maplibre-gl')
      .then((module) => {
        if (disposed || containerRef.current === null) {
          return
        }
        try {
          module.setWorkerUrl(maplibreWorkerUrl)
          map = new module.Map({
            container: containerRef.current,
            style: MAP_STYLE_URL,
            center: [
              initialOrigin?.longitude ?? NAGA_CENTER.longitude,
              initialOrigin?.latitude ?? NAGA_CENTER.latitude,
            ],
            zoom: 12.4,
            attributionControl: { compact: true },
          })
          mapRef.current = map
          libRef.current = module
          const created = map
          // Under the route layer, which is added later.
          created.once('load', () => {
            if (!disposed) {
              addNagaBoundary(created)
            }
          })
          setIsReady(true)
        } catch {
          setMapError(
            'The map could not start on this device. The price list below has the same results.',
          )
        }
      })
      .catch(() => {
        setMapError(
          'The map could not load on this connection. The price list below has the same results.',
        )
      })

    return () => {
      disposed = true
      for (const marker of markersRef.current) {
        marker.remove()
      }
      markersRef.current = []
      map?.remove()
      mapRef.current = null
      libRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!map || !lib || !isReady) {
      return
    }

    for (const marker of markersRef.current) {
      marker.remove()
    }
    markersRef.current = []

    // Add the origin first so pharmacy pins paint above it. It is
    // pointer-events-none, so a pin at the same spot keeps its tap target.
    if (origin !== null) {
      const originMarker = new lib.Marker({
        element: createOriginMarkerElement(),
        anchor: 'bottom',
        offset: [0, 6],
      })
        .setLngLat([origin.longitude, origin.latitude])
        .addTo(map)
      markersRef.current.push(originMarker)
    }

    const callouts: { callout: HTMLDivElement; priority: number }[] = []
    for (const [index, pin] of pins.entries()) {
      const selected = pin.key === selectedKey
      const tracked = focusMode && pin.pharmacyId === trackedPharmacyId
      const muted = focusMode && !selected && !tracked
      const { root: element, callout } = createPinElement(
        pin,
        selected,
        tracked,
        muted,
      )
      // Selected, then tracked, then starred, then list order keeps its label
      // when crowded.
      callouts.push({
        callout,
        priority: selected
          ? -3
          : tracked
            ? -2
            : isStarred(pin.variant)
              ? -1
              : index,
      })
      element.addEventListener('click', () => {
        onSelectRef.current(pin.key, selected || tracked)
      })
      const marker = new lib.Marker({
        element,
        anchor: 'bottom',
        offset: [0, 6],
      })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map)
      markersRef.current.push(marker)
    }

    if (!fittedRef.current && pins.length > 0) {
      const first = pins[0]
      if (first !== undefined) {
        let west = first.longitude
        let east = first.longitude
        let south = first.latitude
        let north = first.latitude
        for (const pin of pins) {
          west = Math.min(west, pin.longitude)
          east = Math.max(east, pin.longitude)
          south = Math.min(south, pin.latitude)
          north = Math.max(north, pin.latitude)
        }
        map.fitBounds(
          [
            [west, south],
            [east, north],
          ],
          {
            padding: visiblePadding(48),
            maxZoom: 14,
            duration: prefersReducedMotion() ? 0 : 600,
          },
        )
        fittedRef.current = true
      }
    }

    const relayout = (): void => {
      declutterCallouts(
        [...callouts]
          .sort((left, right) => left.priority - right.priority)
          .map(({ callout }) => callout),
      )
    }
    relayout()
    map.on('move', relayout)
    map.on('resize', relayout)
    return () => {
      map.off('move', relayout)
      map.off('resize', relayout)
    }
  }, [
    isReady,
    origin,
    pins,
    selectedKey,
    trackedPharmacyId,
    focusMode,
    visiblePadding,
  ])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) {
      return
    }

    const apply = (): void => {
      if (map.getLayer(ROUTE_LAYER_ID)) {
        map.removeLayer(ROUTE_LAYER_ID)
      }
      if (map.getSource(ROUTE_SOURCE_ID)) {
        map.removeSource(ROUTE_SOURCE_ID)
      }
      if (route === null) {
        if (containerRef.current !== null) {
          containerRef.current.dataset.routeLayer = 'false'
        }
        return
      }

      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route,
        },
      })
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ROUTE_COLOR,
          'line-width': 5,
          'line-opacity': 0.85,
        },
      })
      if (containerRef.current !== null) {
        containerRef.current.dataset.routeLayer = 'true'
      }

      const first = route.coordinates[0]
      if (first === undefined) {
        return
      }
      let west = first[0]
      let east = first[0]
      let south = first[1]
      let north = first[1]
      for (const coordinate of route.coordinates) {
        west = Math.min(west, coordinate[0])
        east = Math.max(east, coordinate[0])
        south = Math.min(south, coordinate[1])
        north = Math.max(north, coordinate[1])
      }
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        {
          padding: visiblePadding(56),
          maxZoom: 15,
          duration: prefersReducedMotion() ? 0 : 600,
        },
      )
    }

    if (map.isStyleLoaded()) {
      apply()
    } else {
      map.once('load', apply)
    }

    return () => {
      map.off('load', apply)
    }
  }, [isReady, route, visiblePadding])

  useEffect(() => {
    const map = mapRef.current
    if (!map || selectedKey === null || route !== null) {
      return
    }
    const pin = pins.find((candidate) => candidate.key === selectedKey)
    if (pin === undefined) {
      return
    }
    const covered = visiblePadding(0)
    map.easeTo({
      center: [pin.longitude, pin.latitude],
      // Centre the pin in the uncovered band between the top bar and sheet.
      offset: [0, (covered.top - covered.bottom) / 2],
      zoom: Math.max(map.getZoom(), 13.5),
      duration: prefersReducedMotion() ? 0 : 450,
    })
  }, [pins, selectedKey, route, visiblePadding])

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-muted"
      data-route-active={route === null ? 'false' : 'true'}
      id="results-map"
    >
      <div
        aria-label="Map of pharmacy prices"
        className="h-full w-full"
        ref={containerRef}
        role="region"
      />
      {routeLoading && isReady && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center">
          <div
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-md"
            role="status"
          >
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none"
            />
            Calculating route…
          </div>
        </div>
      )}
      {!isReady && mapError === null && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/70 text-sm font-medium text-muted-foreground">
          Loading the map…
        </div>
      )}
      {mapError !== null && (
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center bg-background/95 p-6 text-center text-sm leading-relaxed text-muted-foreground"
          role="status"
        >
          {mapError}
        </div>
      )}
    </div>
  )
}
