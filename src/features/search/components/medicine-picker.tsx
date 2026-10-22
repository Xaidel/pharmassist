import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { cn } from '#/lib/cn'
import { MedicineLine } from '#/shared/components/medicine-line'
import type { BaseUnit } from '#/shared/domain/medicine-summary'

import { fetchSearch, isAbortError } from '../search.api'
import { normalizeSearchQuery, SEARCH_LIMIT_DEFAULT } from '../search.domain'
import type { SearchItem } from '../search.schema'

import { SearchBar } from './search-bar'

/** The medicine a picker hands back when the user chooses one. */
export type PickedMedicine = {
  medicineId: string
  unit: BaseUnit
}

type MedicinePickerProps = {
  onPick: (medicine: PickedMedicine) => void
  /** Medicines already chosen; they show as added and cannot be picked again. */
  excludeIds?: readonly string[]
}

/** Find a medicine with the app's search bar and add it in place, without leaving the page. */
export function MedicinePicker({
  onPick,
  excludeIds = [],
}: MedicinePickerProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searchToken, setSearchToken] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const inputId = useId()
  const listboxId = useId()
  const statusId = useId()

  useEffect(() => {
    const normalized = normalizeSearchQuery(query)
    if (normalized.length < 2) {
      setItems([])
      setLoading(false)
      return
    }

    // Typing waits briefly for more letters; the Search button goes now.
    const controller = new AbortController()
    const submitted = searchToken > 0
    const timer = window.setTimeout(
      () => {
        setLoading(true)
        void fetchSearch(
          { q: normalized, limit: submitted ? SEARCH_LIMIT_DEFAULT : 6 },
          controller.signal,
        )
          .then((response) => {
            setItems(response.items)
            setActiveIndex(-1)
          })
          .catch((error: unknown) => {
            if (!isAbortError(error)) {
              setItems([])
            }
          })
          .finally(() => {
            if (!controller.signal.aborted) {
              setLoading(false)
            }
          })
      },
      submitted ? 0 : 250,
    )

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, searchToken])

  // The field can sit low in a scrolling drawer; bring new suggestions into view.
  useEffect(() => {
    if (items.length > 0) {
      listRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [items])

  const excluded = new Set(excludeIds)

  function pick(item: SearchItem): void {
    if (excluded.has(item.medicine.medicine_id)) {
      return
    }
    onPick({
      medicineId: item.medicine.medicine_id,
      unit: item.medicine.base_unit,
    })
    // Clear for the next medicine; most baskets have more than one.
    setQuery('')
    setSearchToken(0)
    setItems([])
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape' && items.length > 0) {
      // Close the suggestions first; a second Escape closes the basket.
      event.stopPropagation()
      setItems([])
      return
    }
    if (items.length === 0) {
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % items.length)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1))
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const active = items[activeIndex]
      if (active !== undefined) {
        pick(active)
      }
    }
  }

  const open = items.length > 0
  const active = activeIndex >= 0 ? items[activeIndex] : undefined
  const normalized = normalizeSearchQuery(query)
  const statusMessage = loading
    ? 'Looking for matches…'
    : normalized.length >= 2 && items.length === 0
      ? `No medicine matches “${normalized}”.`
      : open
        ? 'Tap a medicine to add it.'
        : ''

  return (
    <div>
      <SearchBar
        activeDescendantId={
          active === undefined
            ? undefined
            : `${listboxId}-${active.medicine.medicine_id}`
        }
        busy={false}
        formLabel="Add a medicine"
        inputId={inputId}
        inputRef={inputRef}
        label="Add a medicine"
        listboxId={listboxId}
        onKeyDown={handleKeyDown}
        placeholder="Add a medicine"
        onSubmit={() => {
          setSearchToken((token) => token + 1)
        }}
        onValueChange={(value) => {
          setQuery(value)
          setSearchToken(0)
        }}
        open={open}
        statusId={statusId}
        value={query}
      />
      <p
        aria-live="polite"
        className="mt-2 min-h-5 text-sm text-muted-foreground"
        id={statusId}
        role="status"
      >
        {statusMessage}
      </p>

      {open && (
        <ul
          aria-label="Medicines to add"
          className="mt-1 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
          id={listboxId}
          ref={listRef}
          role="listbox"
        >
          {items.map((item, index) => {
            const added = excluded.has(item.medicine.medicine_id)
            return (
              <li
                aria-disabled={added}
                aria-selected={index === activeIndex}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3 transition-colors',
                  added
                    ? 'cursor-default opacity-60'
                    : 'cursor-pointer hover:bg-muted',
                  index === activeIndex && 'bg-muted',
                )}
                id={`${listboxId}-${item.medicine.medicine_id}`}
                key={item.medicine.medicine_id}
                onMouseDown={(event) => {
                  event.preventDefault()
                  pick(item)
                }}
                role="option"
              >
                <MedicineLine medicine={item.medicine} />
                <span className="shrink-0 text-sm font-semibold text-primary">
                  {added ? 'Added' : '+ Add'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
