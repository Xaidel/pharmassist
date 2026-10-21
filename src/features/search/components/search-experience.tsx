import { useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, SyntheticEvent } from 'react'

import { cn } from '#/lib/cn'
import { sendEvents } from '#/lib/events'
import { MedicineLine } from '#/shared/components/medicine-line'
import { Alert } from '#/shared/components/ui/alert'
import { Button } from '#/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '#/shared/components/ui/card'
import { Input } from '#/shared/components/ui/input'

import { fetchSearch, isAbortError, SearchRequestError } from '../search.api'
import {
  normalizeSearchQuery,
  SEARCH_LIMIT_DEFAULT,
  type SearchMatch,
} from '../search.domain'
import type { SearchItem } from '../search.schema'

const DEMO_SEARCHES = [
  'amlodipine',
  'paracetamol',
  'janumet',
  'amoxicilin',
] as const

function matchLabel(match: SearchMatch): string {
  if (match.type === 'exact') {
    return 'Exact name match'
  }
  if (match.type === 'prefix') {
    return 'Name starts with your search'
  }
  return 'Close spelling match'
}

function candidateLabel(count: number): string {
  return `${String(count)} candidate generic ${
    count === 1 ? 'alternative' : 'alternatives'
  } available`
}

/** Search the seeded catalog with typo-tolerant autocomplete. */
export function SearchExperience(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchItem[]>([])
  const [results, setResults] = useState<SearchItem[] | null>(null)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

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

  async function runSearch(rawQuery: string): Promise<void> {
    const normalized = normalizeSearchQuery(rawQuery)

    suggestionController.current?.abort()
    setOpen(false)
    setActiveIndex(-1)
    setError(null)

    if (normalized === '') {
      setResults(null)
      setSearchedQuery('')
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
      search: { add: item.medicine.medicine_id },
    })
  }

  function startDemoSearch(value: string): void {
    suppressSuggestions.current = true
    setQuery(value)
    void runSearch(value)
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault()
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
    <Card aria-busy={isSearching} className="mt-8">
      <CardHeader>
        <h2 className="font-display text-2xl font-semibold">
          Search medicines
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Search by brand or generic name. Small spelling mistakes still find
          the product.
        </p>
      </CardHeader>
      <CardContent>
        <form
          aria-label="Medicine search"
          className="flex flex-col gap-3"
          onSubmit={handleSubmit}
          role="search"
        >
          <label className="text-sm font-medium" htmlFor={inputId}>
            Medicine name
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-activedescendant={activeDescendantId}
              aria-autocomplete="list"
              aria-controls={open ? listboxId : undefined}
              aria-describedby={statusId}
              aria-expanded={open}
              autoComplete="off"
              className="sm:flex-1"
              disabled={isSearching}
              id={inputId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setQuery(event.target.value)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Try “amlodipine” or “Biogesic”"
              role="combobox"
              type="search"
              value={query}
            />
            <Button className="shrink-0" disabled={isSearching} type="submit">
              {isSearching ? 'Searching…' : 'Search'}
            </Button>
          </div>
        </form>

        <p
          aria-live="polite"
          className="mt-3 min-h-5 text-sm text-muted-foreground"
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
                <p className="mt-1 text-xs font-semibold uppercase tracking-eyebrow text-primary">
                  {matchLabel(item.match)}
                </p>
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
              Nothing in the seeded catalog matches “{searchedQuery}”. Try a
              brand name or a simpler spelling.
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
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a medicine to compare its seeded shelf price across Naga
              pharmacies. You can add more medicines from the results screen.
            </p>
            <ul className="mt-3 space-y-3">
              {results.map((item, index) => (
                <li
                  className="rounded-2xl border border-border bg-background p-4"
                  key={item.medicine.medicine_id}
                >
                  <MedicineLine medicine={item.medicine} />
                  <p className="mt-2 text-xs font-semibold uppercase tracking-eyebrow text-primary">
                    {matchLabel(item.match)}
                  </p>
                  {item.candidate_generic_count > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {candidateLabel(item.candidate_generic_count)}
                    </p>
                  )}
                  <div className="mt-3">
                    <Button
                      onClick={() => {
                        compareItem(item, index + 1)
                      }}
                      size="sm"
                      type="button"
                    >
                      Compare prices
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {results === null && error === null && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
              Demo searches
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEMO_SEARCHES.map((demo) => (
                <Button
                  key={demo}
                  onClick={() => {
                    startDemoSearch(demo)
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {demo}
                </Button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Results use seeded demo prices from real Naga pharmacy locations.
          Search history stays on this device; only the query length and result
          count are recorded anonymously.
        </p>
      </CardContent>
    </Card>
  )
}
