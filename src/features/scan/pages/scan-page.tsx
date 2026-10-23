import { getRouteApi } from '@tanstack/react-router'
import { ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { sendEvents } from '#/lib/events'

import { BackButton } from '#/shared/components/back-button'

import { isAbortError, postScan, ScanRequestError } from '../scan.api'
import type { ScanResponse } from '../scan.schema'

import { CaptureScreen } from '../components/capture-screen'
import { ConsentScreen } from '../components/consent-screen'
import { ReviewScreen, type ScanBasketLine } from '../components/review-screen'

const routeApi = getRouteApi('/scan')

type Phase = 'consent' | 'capture' | 'scanning' | 'review'

/** Adds confirmed scan lines to the session basket; the route supplies it. */
export type AddToBasket = (lines: readonly ScanBasketLine[]) => {
  added: number
  duplicateCount: number
  full: boolean
}

type ScanPageProps = {
  addToBasket: AddToBasket
}

function failureReason(
  error: unknown,
): 'provider_error' | 'timeout' | 'invalid_image' {
  if (isAbortError(error)) {
    return 'timeout'
  }
  if (error instanceof ScanRequestError) {
    if (
      error.code === 'IMAGE_TOO_LARGE' ||
      error.code === 'UNSUPPORTED_IMAGE_TYPE' ||
      error.code === 'INVALID_IMAGE'
    ) {
      return 'invalid_image'
    }
  }
  return 'provider_error'
}

function errorMessage(error: unknown): string {
  if (error instanceof ScanRequestError) {
    if (error.code === 'SCAN_UNAVAILABLE') {
      return 'Scanning is unavailable right now. Search for a medicine instead.'
    }
    if (error.code === 'IMAGE_TOO_LARGE') {
      return 'That image is too large (over 8 MB). Use a smaller one.'
    }
    if (error.code === 'UNSUPPORTED_IMAGE_TYPE') {
      return 'Use a JPEG, PNG, or WebP image.'
    }
    return error.message
  }
  return 'Scanning failed. Check your connection and try again, or search instead.'
}

/** The consent-first, mock-recognition prescription scan flow. */
export function ScanPage({ addToBasket }: ScanPageProps): React.JSX.Element {
  const navigate = routeApi.useNavigate()
  const [phase, setPhase] = useState<Phase>('consent')
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  const searchInstead = useCallback((): void => {
    void navigate({ to: '/' })
  }, [navigate])

  const handleAgree = useCallback((): void => {
    setPhase('capture')
  }, [])

  function handleImage(image: Blob, nextSource: 'camera' | 'upload'): void {
    setError(null)
    setPhase('scanning')
    sendEvents([
      { name: 'scan_started', properties: { source: nextSource } },
    ]).catch(() => undefined)

    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller

    void postScan(image, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) {
          return
        }
        setResult(response)
        setPhase('review')
        sendEvents([
          {
            name: 'scan_completed',
            properties: {
              source: nextSource,
              item_count: response.items.length,
              low_confidence_count: response.items.filter(
                (item) => item.low_confidence,
              ).length,
            },
          },
        ]).catch(() => undefined)
      })
      .catch((scanError: unknown) => {
        if (isAbortError(scanError) || controller.signal.aborted) {
          return
        }
        setPhase('capture')
        setError(errorMessage(scanError))
        sendEvents([
          {
            name: 'scan_failed',
            properties: {
              source: nextSource,
              reason: failureReason(scanError),
            },
          },
        ]).catch(() => undefined)
      })
  }

  function handleAdd(lines: readonly ScanBasketLine[]): void {
    addToBasket(lines)
    void navigate({ to: '/results' })
  }

  return (
    <main className="relative min-h-dvh overflow-clip bg-muted">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-md items-center gap-2 px-4 pt-safe-top">
        <BackButton />
      </header>

      <div className="pt-safe-top">
        {phase === 'consent' && (
          <ConsentScreen onAgree={handleAgree} onDecline={searchInstead} />
        )}

        {phase === 'capture' && (
          <CaptureScreen
            busy={false}
            error={error}
            onImage={handleImage}
            onSearchInstead={searchInstead}
          />
        )}

        {phase === 'scanning' && (
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-5 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
              <ScanLine aria-hidden="true" className="size-8" />
            </span>
            <p
              aria-busy="true"
              className="font-display text-xl font-semibold"
              role="status"
            >
              Reading your prescription…
            </p>
            <p className="text-sm text-muted-foreground">
              This demo uses simulated recognition, so it may take a moment.
            </p>
          </div>
        )}

        {phase === 'review' && result !== null && (
          <ReviewScreen
            items={result.items}
            onAdd={handleAdd}
            onSearchInstead={searchInstead}
            warnings={result.warnings}
          />
        )}
      </div>
    </main>
  )
}
