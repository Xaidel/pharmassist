import type { MedicineSummary } from '#/shared/domain/medicine-summary'
import { Badge } from '#/shared/components/ui/badge'
import { Button } from '#/shared/components/ui/button'
import { Card } from '#/shared/components/ui/card'

import {
  formatDistance,
  formatOpenNow,
  formatVerified,
} from '../results.format'
import type { ResultsResponse } from '../results.schema'

import { ResultCard } from './result-card'

/** The prefix that marks a no-price pharmacy key in the results UI. */
export const NO_PRICE_KEY_PREFIX = 'no-price:'

export function noPriceKey(pharmacyId: string): string {
  return `${NO_PRICE_KEY_PREFIX}${pharmacyId}`
}

type ResultsListProps = {
  data: ResultsResponse
  medicines: readonly MedicineSummary[]
  cheapestKey: string | null
  activePharmacyId: string | null
  onOpenDetail: (key: string) => void
  onShowRoute: (key: string) => void
}

/** Render the ranked list that mirrors the map, grouped by completeness. */
export function ResultsList({
  data,
  medicines,
  cheapestKey,
  activePharmacyId,
  onOpenDetail,
  onShowRoute,
}: ResultsListProps): React.JSX.Element {
  return (
    <>
      <section aria-labelledby="complete-results-heading" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              className="font-display text-2xl font-semibold"
              id="complete-results-heading"
            >
              Complete baskets
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranked by the cheapest total shelf price. The cheapest complete
              option is marked on the map and in this list.
            </p>
          </div>
          <Badge>
            {data.complete.length}{' '}
            {data.complete.length === 1 ? 'pharmacy' : 'pharmacies'}
          </Badge>
        </div>

        {data.complete.length === 0 ? (
          <Card className="mt-4">
            <p className="p-5 text-sm leading-relaxed text-muted-foreground">
              No pharmacy has every item in this basket right now. The closest
              options below show what is missing.
            </p>
          </Card>
        ) : (
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
            {data.complete.map((result) => (
              <li
                className="w-72 shrink-0 snap-start sm:w-auto"
                key={result.result_key}
              >
                <ResultCard
                  cheapest={result.result_key === cheapestKey}
                  id={`result-${result.result_key}`}
                  medicines={medicines}
                  onOpenDetail={() => {
                    onOpenDetail(result.result_key)
                  }}
                  onShowRoute={() => {
                    onShowRoute(result.result_key)
                  }}
                  result={result}
                  routeActive={activePharmacyId === result.pharmacy.pharmacy_id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pack-only-heading" className="mt-10">
        <h2
          className="font-display text-2xl font-semibold"
          id="pack-only-heading"
        >
          Sold per pack only
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These pharmacies stock every item but cannot match the requested
          quantity exactly. The amount to buy covers the basket with whole packs
          or strips, so it is not a comparable exact total.
        </p>
        {data.sold_per_pack_only.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Every pharmacy that stocks the basket can fulfill it exactly.
          </p>
        ) : (
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
            {data.sold_per_pack_only.map((result) => (
              <li
                className="w-72 shrink-0 snap-start sm:w-auto"
                key={result.result_key}
              >
                <ResultCard
                  cheapest={false}
                  id={`result-${result.result_key}`}
                  medicines={medicines}
                  onOpenDetail={() => {
                    onOpenDetail(result.result_key)
                  }}
                  onShowRoute={() => {
                    onShowRoute(result.result_key)
                  }}
                  result={result}
                  routeActive={activePharmacyId === result.pharmacy.pharmacy_id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="incomplete-results-heading" className="mt-10">
        <h2
          className="font-display text-2xl font-semibold"
          id="incomplete-results-heading"
        >
          Closest to complete
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These pharmacies can supply part of the basket. Missing items are
          listed, and none of these totals is a complete basket total.
        </p>
        {data.incomplete.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Every pharmacy with any price can supply the whole basket.
          </p>
        ) : (
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
            {data.incomplete.map((result) => (
              <li
                className="w-72 shrink-0 snap-start sm:w-auto"
                key={result.result_key}
              >
                <ResultCard
                  cheapest={false}
                  id={`result-${result.result_key}`}
                  medicines={medicines}
                  onOpenDetail={() => {
                    onOpenDetail(result.result_key)
                  }}
                  onShowRoute={() => {
                    onShowRoute(result.result_key)
                  }}
                  result={result}
                  routeActive={activePharmacyId === result.pharmacy.pharmacy_id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="no-price-heading" className="mt-10">
        <h2
          className="font-display text-2xl font-semibold"
          id="no-price-heading"
        >
          No price data
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These pharmacies have no usable price for this basket. They are muted
          here and never shown as unavailable.
        </p>
        {data.no_price_data.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Every pharmacy has at least one usable price for this basket.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.no_price_data.map(({ pharmacy }) => {
              const key = noPriceKey(pharmacy.pharmacy_id)
              const routeActive = activePharmacyId === pharmacy.pharmacy_id
              const hoursText = pharmacy.hours_text
              return (
                <li id={`result-${key}`} key={key}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                      <div>
                        <h3 className="font-semibold">{pharmacy.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {pharmacy.address}
                        </p>
                        <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                          <span>
                            {formatDistance(pharmacy.distance_m)} away
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatOpenNow(pharmacy.open_now)}</span>
                          {hoursText !== null && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{hoursText}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge>No price data</Badge>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            onClick={() => {
                              onOpenDetail(key)
                            }}
                            size="sm"
                            type="button"
                          >
                            View details
                          </Button>
                          <Button
                            aria-pressed={routeActive}
                            onClick={() => {
                              onShowRoute(key)
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {routeActive ? 'Route shown' : 'Show route'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Prices are reference shelf prices for the form shown and must be
        confirmed at the pharmacy. Seeded demo prices are not live quotes.
        Statutory senior and PWD discounts apply at the point of sale and are
        not included in these totals.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Latest data generated {formatVerified(data.meta.generated_at)} from the
        seeded catalog.
      </p>
      <p className="sr-only">
        {data.complete.length} complete, {data.sold_per_pack_only.length}{' '}
        sold-per-pack-only, and {data.incomplete.length} incomplete pharmacy
        results, plus {data.no_price_data.length} without price data.
      </p>
    </>
  )
}
