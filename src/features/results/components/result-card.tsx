import { Badge } from '#/shared/components/ui/badge'
import { Button } from '#/shared/components/ui/button'
import { Card } from '#/shared/components/ui/card'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import type { ResultsResponse } from '../results.schema'
import {
  formatDistance,
  formatMissingReason,
  formatOpenNow,
  formatPeso,
  formatVerified,
} from '../results.format'

import { PriceLineItem } from './price-line'

type CompleteResult = ResultsResponse['complete'][number]
type IncompleteResult = ResultsResponse['incomplete'][number]
type Result = CompleteResult | IncompleteResult

type ResultCardProps = {
  id: string
  result: Result
  medicines: readonly MedicineSummary[]
  cheapest: boolean
  routeActive: boolean
  onShowRoute: () => void
  onOpenDetail: () => void
}

function oldestVerifiedAt(result: Result): string | null {
  let oldest: string | null = null
  for (const price of result.prices) {
    if (oldest === null || price.verified_at < oldest) {
      oldest = price.verified_at
    }
  }
  return oldest
}

/** Render one ranked pharmacy with its trust states and price breakdown. */
export function ResultCard({
  id,
  result,
  medicines,
  cheapest,
  routeActive,
  onShowRoute,
  onOpenDetail,
}: ResultCardProps): React.JSX.Element {
  const medicineById = new Map(
    medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const aboveMdrp = result.prices.some((price) => price.mdrp?.above === true)
  const stale = result.prices.some((price) => price.stale)
  const lowStock = result.prices.some(
    (price) => price.stock_status === 'low_stock',
  )
  const verified = oldestVerifiedAt(result)

  return (
    <Card
      aria-current={routeActive ? 'true' : undefined}
      className="h-full"
      id={id}
    >
      <div className="flex h-full flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold">
              {result.pharmacy.name}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {result.pharmacy.address}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cheapest && (
              <Badge variant="primary-strong">Cheapest complete</Badge>
            )}
            {aboveMdrp && (
              <Badge variant="destructive">Above MDRP ceiling</Badge>
            )}
            {stale && <Badge>Price older than 14 days</Badge>}
            {lowStock && <Badge>Low stock</Badge>}
            {result.reported && <Badge>Price reported</Badge>}
          </div>
        </div>

        <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{formatDistance(result.pharmacy.distance_m)} away</span>
          <span aria-hidden="true">·</span>
          <span>{formatOpenNow(result.pharmacy.open_now)}</span>
          {verified !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>Verified {formatVerified(verified)}</span>
            </>
          )}
        </p>

        <div className="mt-4">
          {result.status === 'complete' ? (
            <>
              <p className="font-display text-3xl font-semibold">
                {formatPeso(result.total_shelf_price_php)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.prices.length}{' '}
                {result.prices.length === 1 ? 'item' : 'items'} in the complete
                basket
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-semibold">
                {formatPeso(result.known_total_php)} known
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.missing_items.length}{' '}
                {result.missing_items.length === 1 ? 'item' : 'items'} missing
                from this basket
              </p>
              <ul className="mt-3 space-y-2">
                {result.missing_items.map((item) => (
                  <li
                    className="flex flex-wrap items-center gap-2 text-sm"
                    key={item.medicine_id}
                  >
                    <span className="font-medium">
                      {item.brand_name ?? item.generic_name}
                    </span>
                    <span className="text-muted-foreground">
                      {item.strength} · {item.dosage_form}
                    </span>
                    <Badge>{formatMissingReason(item.reason)}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onOpenDetail} size="sm" type="button">
            View details
          </Button>
          <Button
            aria-pressed={routeActive}
            onClick={onShowRoute}
            size="sm"
            type="button"
            variant="outline"
          >
            {routeActive ? 'Route shown' : 'Show route'}
          </Button>
        </div>

        <details className="mt-4 border-t border-border pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            Price breakdown ({result.prices.length})
          </summary>
          <ul className="mt-3 space-y-4">
            {result.prices.map((price) => {
              const medicine = medicineById.get(price.medicine_id)
              return (
                <PriceLineItem
                  key={price.medicine_id}
                  medicine={medicine}
                  price={price}
                />
              )
            })}
          </ul>
        </details>
      </div>
    </Card>
  )
}
