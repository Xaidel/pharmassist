import { useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { KeyboardEvent } from 'react'

import { cn } from '#/lib/cn'
import { sendEvents } from '#/lib/events'
import { MedicineLine } from '#/shared/components/medicine-line'
import { Alert } from '#/shared/components/ui/alert'
import { Button } from '#/shared/components/ui/button'

import { fetchSearch, isAbortError, SearchRequestError } from '../search.api'
import {
  normalizeSearchQuery,
  SEARCH_LIMIT_DEFAULT,
  type SearchMatch,
} from '../search.domain'
import type { SearchItem } from '../search.schema'

import { SearchBar } from './search-bar'

// Exact and prefix matches are what the user typed; only a spelling
// correction is worth pointing out.
function matchNote(match: SearchMatch): string | null {
  return match.type === 'exact' || match.type === 'prefix'
    ? null
    : 'Close spelling match'
}

function candidateLabel(count: number): string {
  return `${String(count)} candidate generic ${
    count === 1 ? 'alternative' : 'alternatives'
  } available`
}

/** How adding a medicine to the basket went. */
export type AddToBasketResult = 'added' | 'duplicate' | 'full'

/** Adds to, removes from, and watches the basket; the route supplies it. */
export type BasketAccess = {
  add: (
    medicineId: string,
    unit: SearchItem['medicine']['base_unit'],
  ) => AddToBasketResult
  remove: (medicineId: string) => void
  /** Calls back when the basket changes; returns an unsubscribe. */
  subscribe: (onChange: () => void) => () => void
  /** The basket's medicine IDs, comma-joined, so equal baskets compare equal. */
  snapshot: () => string
}

type SearchExperienceProps = {
  /** When given, results add to the basket and stay here instead of opening prices. */
  basket?: BasketAccess
  /** A search to run on arrival, such as one restored by Back. */
  initialQuery?: string
  /** Reports each completed search, so the page can remember it. */
  onQueryChange?: (query: string) => void
}

const noSubscribe = (): (() => void) => () => undefined
const emptySnapshot = (): string => ''

/** Search the seeded catalog with typo-tolerant autocomplete. */
export function SearchExperience({
  basket,
  initialQuery,
  onQueryChange,
}: SearchExperienceProps): React.JSX.Element {
  // Read the live basket, so a removal in the basket drawer shows here too.
  const basketKey = useSyncExternalStore(
    basket?.subscribe ?? noSubscribe,
    basket?.snapshot ?? emptySnapshot,
    emptySnapshot,
  )
  const inBasket = new Set(basketKey === '' ? [] : basketKey.split(','))
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchItem[]>([])
  const [results, setResults] = useState<SearchItem[] | null>(null)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [basketFull, setBasketFull] = useState(false)

  const inputId = useId()
  const listboxId = useId()
  const statusId = useId()
  const resultsHeadingId = useId()

  const navigate = useNavigate()
  const suppressSuggestions = useRef(false)
  const suggestionController = useRef<AbortController | null>(null)

  useEffect(() => {
    if (suppressSuggestions.current) {
      suppressSuggestions.current = false
      return
    }

    const normalized = normalizeSearchQuery(query)
    if (normalized.length < 2) {
      setSuggestions([])
      setIsSuggesting(false)
      setOpen(false)
      return
    }

    const controller = new AbortController()
    suggestionController.current = controller
    const timer = window.setTimeout(() => {
      // A submitted search cancels this lookup without clearing the timer.
      if (controller.signal.aborted) {
        return
      }
      setIsSuggesting(true)
      void fetchSearch({ q: normalized, limit: 6 }, controller.signal)
        .then((response) => {
          if (controller.signal.aborted) {
            return
          }
          setSuggestions(response.items)
          setActiveIndex(-1)
          setOpen(response.items.length > 0)
        })
        .catch((searchError: unknown) => {
          if (isAbortError(searchError) || controller.signal.aborted) {
            return
          }
          setSuggestions([])
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSuggesting(false)
          }
        })
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
      if (suggestionController.current === controller) {
        suggestionController.current = null
      }
    }
  }, [query])

  // Re-run a search restored from the URL, such as after Back from results.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || initialQuery === undefined) {
      return
    }
    restoredRef.current = true
    suppressSuggestions.current = true
    setQuery(initialQuery)
    void runSearch(initialQuery)
  })

  async function runSearch(rawQuery: string): Promise<void> {
    const normalized = normalizeSearchQuery(rawQuery)

    suggestionController.current?.abort()
    setIsSuggesting(false)
    setOpen(false)
    setActiveIndex(-1)
    setError(null)

    if (normalized === '') {
      setResults(null)
      setSearchedQuery('')
      onQueryChange?.('')
      return
    }

    setIsSearching(true)
    try {
      const response = await fetchSearch({
        q: normalized,
        limit: SEARCH_LIMIT_DEFAULT,
      })
      setResults(response.items)
      setSearchedQuery(response.query)
      onQueryChange?.(response.query)
      setSuggestions([])
      sendEvents([
        {
          name: 'search_submitted',
          properties: {
            query_length: response.query.length,
            result_count: response.total,
          },
        },
      ]).catch(() => undefined)
    } catch (searchError) {
      if (isAbortError(searchError)) {
        return
      }
      setResults(null)
      setSearchedQuery(normalized)
      setError(
        searchError instanceof SearchRequestError
          ? searchError.message
          : 'Search is unavailable right now. Check your connection and try again.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  function selectSuggestion(item: SearchItem): void {
    const label = item.medicine.brand_name ?? item.medicine.generic_name
    suppressSuggestions.current = true
    setQuery(label)
    void runSearch(label)
  }

  function compareItem(item: SearchItem, rank: number): void {
    sendEvents([
      {
        name: 'search_result_selected',
        properties: {
          rank,
          result_count: results?.length ?? 0,
        },
      },
    ]).catch(() => undefined)
    void navigate({
      to: '/results',
      search: {
        add: item.medicine.medicine_id,
        unit: item.medicine.base_unit,
      },
    })
  }

  function addItem(item: SearchItem, rank: number): void {
    if (basket === undefined) {
      compareItem(item, rank)
      return
    }
    const result = basket.add(
      item.medicine.medicine_id,
      item.medicine.base_unit,
    )
    setBasketFull(result === 'full')
    if (result === 'added') {
      sendEvents([
        {
          name: 'search_result_selected',
          properties: { rank, result_count: results?.length ?? 0 },
        },
      ]).catch(() => undefined)
    }
  }

  function removeItem(item: SearchItem): void {
    basket?.remove(item.medicine.medicine_id)
    setBasketFull(false)
  }

  function seePrices(): void {
    void navigate({ to: '/results' })
  }

  function handleSubmit(): void {
    const active =
      open && activeIndex >= 0 ? suggestions[activeIndex] : undefined
    if (active !== undefined) {
      selectSuggestion(active)
      return
    }
    void runSearch(query)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (!open || suggestions.length === 0) {
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % suggestions.length)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      )
    }
  }

  const activeSuggestion =
    open && activeIndex >= 0 ? suggestions[activeIndex] : undefined
  const activeDescendantId =
    activeSuggestion === undefined
      ? undefined
      : `${listboxId}-${activeSuggestion.medicine.medicine_id}`
  const statusMessage = isSearching
    ? 'Searching the seeded catalog…'
    : isSuggesting
      ? 'Looking for matches…'
      : ''
  const resultsHeading =
    results === null
      ? ''
      : results.length === 1
        ? `1 medicine matches “${searchedQuery}”`
        : `${String(results.length)} medicines match “${searchedQuery}”`

  return (
    <div aria-busy={isSearching} className="mt-5">
      <SearchBar
        activeDescendantId={activeDescendantId}
        busy={isSearching}
        formLabel="Medicine search"
        inputId={inputId}
        label="Medicine name"
        listboxId={listboxId}
        onKeyDown={handleKeyDown}
        onSubmit={handleSubmit}
        onValueChange={setQuery}
        open={open}
        statusId={statusId}
        value={query}
      />

      <p
        aria-live="polite"
        className="mt-2 min-h-5 text-sm text-muted-foreground empty:min-h-0"
        id={statusId}
        role="status"
      >
        {statusMessage}
      </p>

      {open && suggestions.length > 0 && (
        <ul
          aria-label="Medicine suggestions"
          className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
          id={listboxId}
          role="listbox"
        >
          {suggestions.map((item, index) => (
            <li
              aria-selected={index === activeIndex}
              className={cn(
                'cursor-pointer px-4 py-3 transition-colors hover:bg-muted',
                index === activeIndex && 'bg-muted',
              )}
              id={`${listboxId}-${item.medicine.medicine_id}`}
              key={item.medicine.medicine_id}
              onMouseDown={(event) => {
                event.preventDefault()
                selectSuggestion(item)
              }}
              role="option"
            >
              <MedicineLine medicine={item.medicine} />
              {matchNote(item.match) !== null && (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {matchNote(item.match)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {error !== null && <Alert className="mt-5">{error}</Alert>}

      {results !== null && results.length === 0 && (
        <section
          aria-labelledby={`${resultsHeadingId}-empty`}
          className="mt-5 rounded-2xl border border-border bg-background p-5"
        >
          <h3
            className="font-display text-xl font-semibold"
            id={`${resultsHeadingId}-empty`}
          >
            No medicines found
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Nothing in the seeded catalog matches “{searchedQuery}”. Try a brand
            name or a simpler spelling.
          </p>
        </section>
      )}

      {results !== null && results.length > 0 && (
        <section aria-labelledby={resultsHeadingId} className="mt-5">
          <h3
            className="font-display text-xl font-semibold"
            id={resultsHeadingId}
          >
            {resultsHeading}
          </h3>
          <p className="mt-1 text-base text-muted-foreground">
            {basket === undefined
              ? 'Choose a medicine to compare its price across Naga pharmacies.'
              : 'Add each medicine on your list, then compare prices for all of them at once.'}
          </p>
          {basketFull && (
            <Alert className="mt-3" variant="info">
              Your list is full (10 medicines). Remove one before adding
              another.
            </Alert>
          )}
          <ul className="mt-3 space-y-3">
            {results.map((item, index) => (
              <li
                className="rounded-2xl border border-border bg-background p-4"
                key={item.medicine.medicine_id}
              >
                <MedicineLine medicine={item.medicine} />
                {matchNote(item.match) !== null && (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    {matchNote(item.match)}
                  </p>
                )}
                {item.candidate_generic_count > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {candidateLabel(item.candidate_generic_count)}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {basket === undefined ? (
                    <Button
                      onClick={() => {
                        compareItem(item, index + 1)
                      }}
                      size="sm"
                      type="button"
                    >
                      Compare prices
                    </Button>
                  ) : inBasket.has(item.medicine.medicine_id) ? (
                    <>
                      {/* Tapping the confirmation undoes the add. */}
                      <Button
                        aria-label={`In your list. Tap to remove ${
                          item.medicine.brand_name ?? item.medicine.generic_name
                        } ${item.medicine.strength}.`}
                        aria-pressed
                        onClick={() => {
                          removeItem(item)
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <span aria-hidden="true">✓</span> In your list
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        addItem(item, index + 1)
                      }}
                      size="sm"
                      type="button"
                    >
                      + Add to your list
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {basket !== undefined && inBasket.size > 0 && (
        // One basket-level action: prices are always for the whole list.
        <div className="sticky bottom-0 z-10 -mx-1 mt-4 bg-card px-1 pb-1 pt-3">
          <Button
            className="w-full"
            onClick={seePrices}
            size="lg"
            type="button"
          >
            See prices for your {inBasket.size}{' '}
            {inBasket.size === 1 ? 'medicine' : 'medicines'}
            <ArrowRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      )}
    </div>
  )
}
