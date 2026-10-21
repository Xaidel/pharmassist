import { MedicineLine } from '#/shared/components/medicine-line'
import { Badge } from '#/shared/components/ui/badge'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import { formatMissingReason, formatPeso } from '../results.format'
import type { ResultsResponse } from '../results.schema'

import { PriceLineItem } from './price-line'

type ResultBasketItem = ResultsResponse['complete'][number]['items'][number]

function packOnlyLabel(
  copy: 'sold_per_pack_only' | 'sold_by_the_pack' | 'sold_by_the_strip',
): string {
  switch (copy) {
    case 'sold_by_the_pack':
      return 'Sold by the pack'
    case 'sold_by_the_strip':
      return 'Sold by the strip'
    case 'sold_per_pack_only':
      return 'Sold per pack only'
  }
}

type ResultItemListProps = {
  items: readonly ResultBasketItem[]
  medicines: readonly MedicineSummary[]
}

/** Render each basket item's exact, covering-purchase, or missing outcome. */
export function ResultItemList({
  items,
  medicines,
}: ResultItemListProps): React.JSX.Element {
  const medicineById = new Map(
    medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )

  return (
    <ul className="mt-3 space-y-3">
      {items.map((item) => {
        const medicine = medicineById.get(item.medicine_id)
        return (
          <li
            className="rounded-2xl border border-border bg-background p-3"
            key={item.medicine_id}
          >
            {medicine === undefined ? (
              <p className="font-semibold">{item.medicine_id}</p>
            ) : (
              <MedicineLine medicine={medicine} />
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Requested {item.quantity} {item.unit}
            </p>

            {item.outcome === 'exact' && (
              <ul className="mt-2 space-y-1 text-sm">
                {item.components.map((component) => (
                  <li key={component.sale_form}>
                    {component.count} × {component.form_label} —{' '}
                    <span className="font-semibold">
                      {formatPeso(component.line_total_php)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {item.outcome === 'sold_per_pack_only' &&
              item.pack_only !== undefined && (
                <div className="mt-2 text-sm">
                  <Badge>{packOnlyLabel(item.pack_only.copy)}</Badge>
                  <p className="mt-2">
                    Buy {item.pack_only.buy_quantity} ×{' '}
                    {item.pack_only.form_label} for{' '}
                    <span className="font-semibold">
                      {formatPeso(item.pack_only.covering_total_php)}
                    </span>{' '}
                    ({item.pack_only.covers_quantity} {item.pack_only.pack_unit}{' '}
                    covered).
                  </p>
                </div>
              )}

            {item.outcome !== 'exact' &&
              item.outcome !== 'sold_per_pack_only' && (
                <p className="mt-2 text-sm">
                  <Badge>{formatMissingReason(item.outcome)}</Badge>
                </p>
              )}

            {item.forms.length > 0 && (
              <details className="mt-3 border-t border-border pt-2">
                <summary className="cursor-pointer text-sm font-semibold text-primary">
                  Form prices at this pharmacy
                </summary>
                <ul className="mt-2 space-y-2">
                  {item.forms.map((offer) => (
                    <PriceLineItem
                      key={offer.sale_form}
                      medicine={medicine}
                      offer={offer}
                    />
                  ))}
                </ul>
              </details>
            )}
          </li>
        )
      })}
    </ul>
  )
}
