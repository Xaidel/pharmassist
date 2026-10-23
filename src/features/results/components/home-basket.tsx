import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { Alert } from '#/shared/components/ui/alert'
import { Button } from '#/shared/components/ui/button'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import { announceBasketChange, BASKET_CHANGED_EVENT } from '../basket-actions'
import { isAbortError, postResults } from '../results.api'
import {
  clearBasket,
  getSessionStorage,
  readBasket,
  removeBasketLine,
  setBasketQuantity,
  writeBasket,
} from '../results.basket'
import type { BasketLine } from '../results.domain'
import {
  fitToPacks,
  presetsFromResults,
  type QuantityPreset,
} from '../results.quantity'

import { BasketDrawer } from './basket-drawer'
import { BasketPanel } from './basket-panel'
import { BasketToggleButton } from './basket-toggle-button'

type HomeBasketProps = {
  /** Reports when the drawer opens or closes, so the page can make room for it. */
  onOpenChange?: (open: boolean) => void
}

/** The home screen's basket button and the drawer it opens over the map. */
export function HomeBasket({
  onOpenChange,
}: HomeBasketProps): React.JSX.Element {
  // Null until the browser basket is read, so the server render never shows a stale count.
  const [lines, setLines] = useState<BasketLine[] | null>(null)
  const [medicines, setMedicines] = useState<MedicineSummary[]>([])
  const [presets, setPresets] = useState<
    ReadonlyMap<string, readonly QuantityPreset[]>
  >(new Map())
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bumped when another screen adds to the basket, so an open drawer reloads.
  const [basketVersion, setBasketVersion] = useState(0)
  const knownIdsRef = useRef<ReadonlySet<string>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  useEffect(() => {
    const refresh = (): void => {
      setLines(readBasket(getSessionStorage()))
    }
    const handleChange = (): void => {
      const next = readBasket(getSessionStorage())
      setLines(next)
      // Reload names only for a medicine added elsewhere; edits here need none.
      if (next.some((line) => !knownIdsRef.current.has(line.medicine_id))) {
        setBasketVersion((version) => version + 1)
      }
    }
    refresh()
    // Returning through the back/forward cache skips mount, so read again.
    window.addEventListener('pageshow', refresh)
    window.addEventListener(BASKET_CHANGED_EVENT, handleChange)
    return () => {
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener(BASKET_CHANGED_EVENT, handleChange)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    const current = readBasket(getSessionStorage())
    setLines(current)
    setError(null)
    if (current.length === 0) {
      setMedicines([])
      return
    }

    // The basket stores only IDs and quantities. The price lookup returns the
    // names to show and the real pack sizes, so packs are counted correctly.
    const controller = new AbortController()
    setLoading(true)
    void postResults(
      { items: current, origin: null, sort: 'price' },
      controller.signal,
    )
      .then((response) => {
        const nextPresets = presetsFromResults(response)
        setPresets(nextPresets)
        // Show bottles, tubes, and inhalers in the real whole packs.
        const fit = fitToPacks(current, nextPresets, new Set())
        if (fit.lines.some((line, index) => line !== current[index])) {
          writeBasket(getSessionStorage(), fit.lines)
          setLines(fit.lines)
          announceBasketChange()
        }
        const resolved = response.basket.items.map((item) => item.medicine)
        knownIdsRef.current = new Set(
          resolved.map((medicine) => medicine.medicine_id),
        )
        setMedicines(resolved)
      })
      .catch((requestError: unknown) => {
        if (isAbortError(requestError)) {
          return
        }
        setError('Your basket could not load. Check your connection.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })
    return () => {
      controller.abort()
    }
  }, [open, basketVersion])

  function persist(next: BasketLine[]): void {
    writeBasket(getSessionStorage(), next)
    setLines(next)
    announceBasketChange()
  }

  const count = lines?.length ?? 0

  return (
    <>
      <BasketToggleButton
        count={count}
        onToggle={() => {
          setOpen((value) => !value)
        }}
        open={open}
      />

      {open && (
        <BasketDrawer
          className="pointer-events-auto absolute inset-x-4 top-full mt-2"
          onClose={() => {
            setOpen(false)
          }}
        >
          {error !== null && <Alert className="mb-2">{error}</Alert>}
          <BasketPanel
            busy={loading}
            footer={
              count > 0 ? (
                <Button
                  className="w-full"
                  onClick={() => {
                    void navigate({ to: '/results' })
                  }}
                  type="button"
                >
                  See prices
                </Button>
              ) : undefined
            }
            items={lines ?? []}
            medicines={medicines}
            onClear={() => {
              clearBasket(getSessionStorage())
              setLines([])
              announceBasketChange()
            }}
            onClose={() => {
              setOpen(false)
            }}
            onQuantityChange={(medicineId, quantity) => {
              persist(setBasketQuantity(lines ?? [], medicineId, quantity))
            }}
            onRemove={(medicineId) => {
              persist(removeBasketLine(lines ?? [], medicineId))
            }}
            presetsByMedicine={presets}
          />
        </BasketDrawer>
      )}
    </>
  )
}
