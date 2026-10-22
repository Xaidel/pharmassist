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

/** The complete result starred on the map, and why it was chosen. */
export type FeaturedResult = {
  key: string
  kind: 'cheapest' | 'nearest'
}

export function noPriceKey(pharmacyId: string): string {
  return `${NO_PRICE_KEY_PREFIX}${pharmacyId}`
}

type ResultsListProps = {
  data: ResultsResponse
  medicines: readonly MedicineSummary[]
  featured: FeaturedResult | null
  activePharmacyId: string | null
  onOpenDetail: (key: string) => void
  onShowRoute: (key: string) => void
  /** Changes a basket line to the whole-pack amount a pharmacy sells. */
  onUsePack: (medicineId: string, quantity: number) => void
}

/** Render the ranked list that mirrors the map, grouped by completeness. */
export function ResultsList({
  data,
  medicines,
  featured,
  activePharmacyId,
  onOpenDetail,
  onShowRoute,
  onUsePack,
}: ResultsListProps): React.JSX.Element {
  const compliantComplete = data.complete.filter(
    (result) => !result.above_mdrp_ceiling,
  )
  const aboveMdrpComplete = data.complete.filter(
    (result) => result.above_mdrp_ceiling,
  )

  return (
    <>
      <section aria-labelledby="complete-results-heading" className="mt-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              className="font-display text-xl font-semibold"
              id="complete-results-heading"
            >
              Complete baskets
            </h2>
            <p className="mt-1 text-base text-muted-foreground">
              Have all your medicines.{' '}
              {data.meta.sort === 'distance'
                ? 'Nearest first.'
                : 'Cheapest first.'}
            </p>
          </div>
          <Badge>
            {compliantComplete.length}{' '}
            {compliantComplete.length === 1 ? 'pharmacy' : 'pharmacies'}
          </Badge>
        </div>

        {compliantComplete.length === 0 ? (
          <Card className="mt-4">
            <p className="p-5 text-base leading-relaxed text-muted-foreground">
              {data.complete.length === 0
                ? 'No pharmacy has all your medicines right now. See the closest options below.'
                : 'Every pharmacy with all your medicines has a price above the government limit (MDRP). See them below.'}
            </p>
          </Card>
        ) : (
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {compliantComplete.map((result) => (
              <li className="w-72 shrink-0 snap-start" key={result.result_key}>
                <ResultCard
                  onUsePack={onUsePack}
                  featured={
                    result.result_key === featured?.key ? featured.kind : null
                  }
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

      {aboveMdrpComplete.length > 0 && (
        <section aria-labelledby="above-mdrp-heading" className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                className="font-display text-xl font-semibold"
                id="above-mdrp-heading"
              >
                Above MDRP ceiling
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                Have all your medicines, but a price is above the government
                limit (MDRP). Check the price at the pharmacy.
              </p>
            </div>
            <Badge>
              {aboveMdrpComplete.length}{' '}
              {aboveMdrpComplete.length === 1 ? 'pharmacy' : 'pharmacies'}
            </Badge>
          </div>
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {aboveMdrpComplete.map((result) => (
              <li className="w-72 shrink-0 snap-start" key={result.result_key}>
                <ResultCard
                  onUsePack={onUsePack}
                  featured={null}
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
        </section>
      )}

      <section aria-labelledby="pack-only-heading" className="mt-8">
        <h2
          className="font-display text-xl font-semibold"
          id="pack-only-heading"
        >
          Sold per pack only
        </h2>
        <p className="mt-1 text-base text-muted-foreground">
          Have all your medicines, but only in whole packs or strips.
        </p>
        {data.sold_per_pack_only.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {data.sold_per_pack_only.map((result) => (
              <li className="w-72 shrink-0 snap-start" key={result.result_key}>
                <ResultCard
                  onUsePack={onUsePack}
                  featured={null}
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

      <section aria-labelledby="incomplete-results-heading" className="mt-8">
        <h2
          className="font-display text-xl font-semibold"
          id="incomplete-results-heading"
        >
          Closest to complete
        </h2>
        <p className="mt-1 text-base text-muted-foreground">
          Have some of your medicines. Missing ones are listed.
        </p>
        {data.incomplete.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {data.incomplete.map((result) => (
              <li className="w-72 shrink-0 snap-start" key={result.result_key}>
                <ResultCard
                  onUsePack={onUsePack}
                  featured={null}
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

      <section aria-labelledby="no-price-heading" className="mt-8">
        <h2
          className="font-display text-xl font-semibold"
          id="no-price-heading"
        >
          No price data
        </h2>
        <p className="mt-1 text-base text-muted-foreground">
          No prices yet for your medicines. Call or visit to ask.
        </p>
        {data.no_price_data.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None.</p>
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

      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        Prices are for reference only. Confirm at the pharmacy. Senior citizen
        and PWD discounts are given at the counter and are not included here.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
