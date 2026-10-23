import { Clock, MapPin } from 'lucide-react'

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
  featured: 'cheapest' | 'nearest' | null
  routeActive: boolean
  onShowRoute: () => void
  onOpenDetail: () => void
  onUsePack?: (medicineId: string, quantity: number) => void
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
  featured,
  routeActive,
  onShowRoute,
  onOpenDetail,
  onUsePack,
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
        {(featured !== null ||
          result.status === 'sold_per_pack_only' ||
          aboveMdrp ||
          stale ||
          lowStock ||
          result.reported) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {featured !== null && (
              <Badge variant="highlight">
                <span aria-hidden="true">★</span>
                {featured === 'nearest'
                  ? 'Nearest complete'
                  : 'Cheapest complete'}
              </Badge>
            )}
            {result.status === 'sold_per_pack_only' && (
              <Badge>Sold per pack only</Badge>
            )}
            {aboveMdrp && <Badge>Above MDRP ceiling</Badge>}
            {stale && <Badge>Price older than 14 days</Badge>}
            {lowStock && <Badge>Low stock</Badge>}
            {result.reported && <Badge>Price reported</Badge>}
          </div>
        )}

        <h3 className="font-display text-xl font-semibold leading-snug">
          {result.pharmacy.name}
        </h3>

        <div className="mt-2">
          {result.status === 'complete' && (
            <>
              <p className="font-display text-3xl font-semibold">
                {formatPeso(result.total_shelf_price_php)}
              </p>
              <p className="text-base text-muted-foreground">
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
              <p className="text-base text-muted-foreground">
                Only sold in whole packs or strips.
              </p>
            </>
          )}
          {result.status === 'incomplete' && (
            <>
              <p className="font-display text-2xl font-semibold">
                {formatPeso(result.known_total_php)} known
              </p>
              <p className="text-base text-muted-foreground">
                {result.missing_items.length}{' '}
                {result.missing_items.length === 1 ? 'item' : 'items'} missing
              </p>
            </>
          )}
        </div>

        <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-base">
          <span>{formatDistance(result.pharmacy.distance_m)} away</span>
          <span aria-hidden="true">·</span>
          <span>{formatOpenNow(result.pharmacy.open_now)}</span>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="flex-1" onClick={onOpenDetail} type="button">
            View details
          </Button>
          <Button
            aria-pressed={routeActive}
            className="flex-1"
            onClick={onShowRoute}
            type="button"
            variant="outline"
          >
            {routeActive ? 'Route shown' : 'Show route'}
          </Button>
        </div>

        {/* Two separate facts, each with its own icon, so they never read as one. */}
        <ul className="mt-4 space-y-2 text-sm leading-snug text-muted-foreground">
          <li className="flex gap-2">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="sr-only">Address: </span>
              {result.pharmacy.address}
            </span>
          </li>
          {verified !== null && (
            <li className="flex gap-2">
              <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>Price checked {formatVerified(verified)}</span>
            </li>
          )}
        </ul>

        <ResultItemList
          items={result.items}
          medicines={medicines}
          {...(onUsePack === undefined ? {} : { onUsePack })}
        />
      </div>
    </Card>
  )
}
