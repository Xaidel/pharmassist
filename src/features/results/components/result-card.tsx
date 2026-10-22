import { Badge } from '#/shared/components/ui/badge'
import { Button } from '#/shared/components/ui/button'
import { Card } from '#/shared/components/ui/card'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import type { ResultsResponse } from '../results.schema'
import {
  formatDistance,
  formatOpenNow,
  formatPeso,
  formatVerified,
} from '../results.format'

import { ResultItemList } from './result-items'

type CompleteResult = ResultsResponse['complete'][number]
type SoldResult = ResultsResponse['sold_per_pack_only'][number]
type IncompleteResult = ResultsResponse['incomplete'][number]
type Result = CompleteResult | SoldResult | IncompleteResult

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
  for (const item of result.items) {
    for (const component of item.components) {
      if (oldest === null || component.verified_at < oldest) {
        oldest = component.verified_at
      }
    }
  }
  return oldest
}

/** Render one ranked pharmacy with its trust states and fulfillment breakdown. */
export function ResultCard({
  id,
  result,
  medicines,
  cheapest,
  routeActive,
  onShowRoute,
  onOpenDetail,
}: ResultCardProps): React.JSX.Element {
  const aboveMdrp = result.above_mdrp_ceiling
  const stale = result.items.some((item) =>
    item.forms.some((offer) => offer.stale === true),
  )
  const lowStock = result.items.some((item) =>
    item.forms.some((offer) => offer.stock_status === 'low_stock'),
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
            {result.status === 'sold_per_pack_only' && (
              <Badge>Sold per pack only</Badge>
            )}
            {aboveMdrp && <Badge>Above MDRP ceiling</Badge>}
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
          {result.status === 'complete' && (
            <>
              <p className="font-display text-3xl font-semibold">
                {formatPeso(result.total_shelf_price_php)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Exact total for {result.items.length}{' '}
                {result.items.length === 1 ? 'medicine' : 'medicines'}
              </p>
            </>
          )}
          {result.status === 'sold_per_pack_only' && (
            <>
              <p className="font-display text-2xl font-semibold">
                {formatPeso(result.covering_total_php)} to buy
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                No exact combination; covering purchases are listed per item.
              </p>
            </>
          )}
          {result.status === 'incomplete' && (
            <>
              <p className="font-display text-2xl font-semibold">
                {formatPeso(result.known_total_php)} known
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.missing_items.length}{' '}
                {result.missing_items.length === 1 ? 'item' : 'items'} missing
                from this basket
              </p>
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

        <ResultItemList items={result.items} medicines={medicines} />
      </div>
    </Card>
  )
}
