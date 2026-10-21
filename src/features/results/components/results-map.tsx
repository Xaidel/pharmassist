import type {
  Map as MapLibreMap,
  MapOptions,
  Marker,
  MarkerOptions,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'

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
  variant: 'cheapest' | 'complete' | 'pack-only' | 'incomplete' | 'no-price'
}

type MapLibreModule = {
  Map: new (options: MapOptions) => MapLibreMap
  Marker: new (options?: MarkerOptions) => Marker
}

const PIN_BASE =
  'inline-flex flex-col items-center rounded-full border px-3 py-1.5 text-xs font-semibold shadow-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

const PIN_VARIANTS = {
  cheapest: 'border-primary bg-primary text-primary-foreground',
  complete: 'border-border bg-card text-foreground',
  'pack-only': 'border-dashed border-primary bg-card text-foreground',
  incomplete: 'border-input bg-muted text-foreground',
  'no-price': 'border-border bg-background text-muted-foreground',
} as const

const PIN_SELECTED =
  'scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background'

function createPinElement(pin: MapPin, selected: boolean): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = [
    PIN_BASE,
    PIN_VARIANTS[pin.variant],
    selected ? PIN_SELECTED : '',
  ]
    .filter(Boolean)
    .join(' ')
  button.setAttribute(
    'aria-label',
    `${pin.name}: ${pin.label}${
      pin.variant === 'cheapest' ? ', cheapest complete basket' : ''
    }`,
  )
  button.dataset.pharmacyPin = pin.key
  button.textContent = pin.label
  return button
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
  origin: { latitude: number; longitude: number } | null
  route: RouteGeometry | null
  routeLoading: boolean
  onSelect: (key: string) => void
}

/** Render the map-first price view over OpenFreeMap tiles. */
export function ResultsMap({
  pins,
  selectedKey,
  origin,
  route,
  routeLoading,
  onSelect,
}: ResultsMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
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

    for (const pin of pins) {
      const element = createPinElement(pin, pin.key === selectedKey)
      element.addEventListener('click', () => {
        onSelectRef.current(pin.key)
      })
      const marker = new lib.Marker({ element, anchor: 'bottom' })
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
            padding: 48,
            maxZoom: 14,
            duration: prefersReducedMotion() ? 0 : 600,
          },
        )
        fittedRef.current = true
      }
    }
  }, [isReady, pins, selectedKey])

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
          padding: 56,
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
  }, [isReady, route])

  useEffect(() => {
    const map = mapRef.current
    if (!map || selectedKey === null || route !== null) {
      return
    }
    const pin = pins.find((candidate) => candidate.key === selectedKey)
    if (pin === undefined) {
      return
    }
    map.easeTo({
      center: [pin.longitude, pin.latitude],
      zoom: Math.max(map.getZoom(), 13.5),
      duration: prefersReducedMotion() ? 0 : 450,
    })
  }, [pins, selectedKey, route])

  return (
    <div
      className="relative mt-4 overflow-hidden rounded-3xl border border-border bg-muted"
      data-route-active={route === null ? 'false' : 'true'}
      id="results-map"
    >
      <div
        aria-label="Map of pharmacy prices"
        className="h-96 w-full"
        ref={containerRef}
        role="region"
      />
      {routeLoading && isReady && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
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
