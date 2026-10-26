import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'

import { cn } from '#/lib/cn'
import { loadBaseMapStyle } from '#/shared/components/base-map-style'
import { addNagaBoundary } from '#/shared/components/naga-boundary'
import {
  createCalloutPin,
  declutterCallouts,
  type CalloutTone,
} from '#/shared/components/map-callout-pin'

import { fetchPharmacyPins, type PharmacyPins } from '../pharmacy-pins.api'

// Frames central Naga City above the home sheet.
const HOME_CENTER = { latitude: 13.6105, longitude: 123.1945 } as const

// Pharmacies this far from the cluster's median point stay off the first view.
const DOWNTOWN_RADIUS_M = 1500
const METERS_PER_DEGREE = 111_320

type Pharmacy = PharmacyPins['pharmacies'][number]

type PinVariant = 'cheapest' | 'verified' | 'unverified'

// The catalog-wide cheapest pharmacy is not a basket result, so it carries only
// a star and otherwise competes with other verified pins on equal terms.
const PIN_TONES = {
  cheapest: 'primary',
  verified: 'primary',
  unverified: 'muted',
} as const satisfies Record<PinVariant, CalloutTone>

// Placed first wins a collision.
const PIN_PRIORITY = { cheapest: 0, verified: 0, unverified: 1 } as const

function pinVariant(pharmacy: Pharmacy, cheapestId: string | null): PinVariant {
  if (pharmacy.pharmacy_id === cheapestId) {
    return 'cheapest'
  }
  return pharmacy.verification_status === 'verified' ? 'verified' : 'unverified'
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/** Keep the pharmacies near the cluster's median point, so outliers do not zoom the map out. */
function downtownPharmacies(pharmacies: readonly Pharmacy[]): Pharmacy[] {
  const centerLatitude = median(pharmacies.map((p) => p.latitude))
  const centerLongitude = median(pharmacies.map((p) => p.longitude))
  const longitudeScale = Math.cos((centerLatitude * Math.PI) / 180)
  const nearby = pharmacies.filter((pharmacy) => {
    const north = (pharmacy.latitude - centerLatitude) * METERS_PER_DEGREE
    const east =
      (pharmacy.longitude - centerLongitude) *
      METERS_PER_DEGREE *
      longitudeScale
    return Math.hypot(north, east) <= DOWNTOWN_RADIUS_M
  })
  return nearby.length === 0 ? [...pharmacies] : nearby
}

type HomeMapProps = {
  className?: string
}

/** Render the Naga City basemap and pharmacy pins behind the home sheet. */
export function HomeMap({ className }: HomeMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let disposed = false
    let map: MapLibreMap | undefined
    const markers: Marker[] = []
    const controller = new AbortController()

    void Promise.all([
      import('maplibre-gl'),
      fetchPharmacyPins(controller.signal).catch(() => null),
    ])
      .then(([module, directory]) => {
        const container = containerRef.current
        if (disposed || container === null) {
          return
        }
        try {
          module.setWorkerUrl(maplibreWorkerUrl)
          const created = new module.Map({
            container,
            center: [HOME_CENTER.longitude, HOME_CENTER.latitude],
            zoom: 13.2,
            attributionControl: { compact: true },
          })
          loadBaseMapStyle(created)
          map = created
          created.once('load', () => {
            if (!disposed) {
              addNagaBoundary(created)
              setIsReady(true)
            }
          })

          if (directory === null || directory.pharmacies.length === 0) {
            return
          }
          type HomePin = {
            root: HTMLDivElement
            callout: HTMLDivElement
            dot: HTMLDivElement
            priority: number
          }
          const callouts: HomePin[] = []
          // A tapped dot shows its name even where its label was decluttered.
          let revealed: HomePin | null = null
          const reveal = (pin: HomePin | null): void => {
            revealed?.root.classList.remove('z-10')
            revealed = pin
            revealed?.root.classList.add('z-10')
            relayout()
          }
          for (const pharmacy of directory.pharmacies) {
            const variant = pinVariant(pharmacy, directory.cheapest_pharmacy_id)
            const {
              root: element,
              callout,
              dot,
            } = createCalloutPin({
              tag: 'div',
              label: pharmacy.name,
              tone: PIN_TONES[variant],
              starred: variant === 'cheapest',
              rootClassName: 'pointer-events-none',
            })
            element.dataset.homePin = variant
            const pin: HomePin = {
              root: element,
              callout,
              dot,
              priority: PIN_PRIORITY[variant],
            }
            callouts.push(pin)
            // The marker stays click-through; only the dot, with a padded hit
            // area, takes taps.
            dot.classList.add(
              'pointer-events-auto',
              'relative',
              'cursor-pointer',
              'before:absolute',
              'before:-inset-2.5',
              "before:content-['']",
            )
            dot.dataset.homePinDot = ''
            dot.addEventListener('click', () => {
              reveal(pin)
            })
            markers.push(
              new module.Marker({ element, anchor: 'bottom', offset: [0, 6] })
                .setLngLat([pharmacy.longitude, pharmacy.latitude])
                .addTo(created),
            )
          }

          const framed = downtownPharmacies(directory.pharmacies)
          const longitudes = framed.map((p) => p.longitude)
          const latitudes = framed.map((p) => p.latitude)
          created.fitBounds(
            [
              [Math.min(...longitudes), Math.min(...latitudes)],
              [Math.max(...longitudes), Math.max(...latitudes)],
            ],
            {
              // Keep pins clear of the sheet that covers the lower map.
              padding: {
                top: 72,
                right: 48,
                bottom: Math.round(container.clientHeight * 0.5) + 32,
                left: 48,
              },
              maxZoom: 16,
              duration: 0,
            },
          )

          const byPriority = callouts.sort(
            (left, right) => left.priority - right.priority,
          )
          function relayout(): void {
            declutterCallouts(
              revealed === null
                ? byPriority
                : [
                    { ...revealed, pinned: true },
                    ...byPriority.filter((pin) => pin !== revealed),
                  ],
            )
          }
          relayout()
          created.on('move', relayout)
          created.on('resize', relayout)
          // A tap on open map hides the tapped name again.
          created.on('click', (event) => {
            const target = event.originalEvent.target
            if (
              !(target instanceof Element) ||
              target.closest('[data-home-pin-dot]') === null
            ) {
              reveal(null)
            }
          })
        } catch {
          // The sheet stays usable over the plain background.
        }
      })
      .catch(() => undefined)

    return () => {
      disposed = true
      controller.abort()
      for (const marker of markers) {
        marker.remove()
      }
      map?.remove()
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-muted transition-opacity duration-500 motion-reduce:transition-none',
        isReady ? 'opacity-100' : 'opacity-60',
        className,
      )}
      data-home-map={isReady ? 'ready' : 'loading'}
      ref={containerRef}
    />
  )
}
