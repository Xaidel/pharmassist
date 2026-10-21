import type {
  Map as MapLibreMap,
  MapOptions,
  Marker,
  MarkerOptions,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'

import { NAGA_CENTER } from '../results.domain'

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

/** One pharmacy pin the results map renders. */
export type MapPin = {
  key: string
  pharmacyId: string
  name: string
  latitude: number
  longitude: number
  label: string
  variant: 'cheapest' | 'complete' | 'incomplete' | 'no-price'
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
  onSelect: (key: string) => void
}

/** Render the map-first price view over OpenFreeMap tiles. */
export function ResultsMap({
  pins,
  selectedKey,
  origin,
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
    if (!map || selectedKey === null) {
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
  }, [pins, selectedKey])

  return (
    <div className="relative mt-4 overflow-hidden rounded-3xl border border-border bg-muted">
      <div
        aria-label="Map of pharmacy prices"
        className="h-96 w-full"
        ref={containerRef}
        role="region"
      />
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
