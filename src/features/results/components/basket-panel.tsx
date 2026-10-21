import { Link } from '@tanstack/react-router'

import { MedicineLine } from '#/shared/components/medicine-line'
import { Button } from '#/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '#/shared/components/ui/card'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  BASKET_MAX_PACKS,
  BASKET_MIN_PACKS,
  type BasketLine,
} from '../results.domain'

type BasketPanelProps = {
  items: readonly BasketLine[]
  medicines: readonly MedicineSummary[]
  busy: boolean
  onPacksChange: (medicineId: string, packs: number) => void
  onRemove: (medicineId: string) => void
  onClear: () => void
}

/** Render the session basket and its pack controls. */
export function BasketPanel({
  items,
  medicines,
  busy,
  onPacksChange,
  onRemove,
  onClear,
}: BasketPanelProps): React.JSX.Element {
  const medicineById = new Map(
    medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const packCount = items.reduce((sum, item) => sum + item.packs, 0)

  return (
    <Card aria-busy={busy} className="mt-6">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Your basket</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'medicine' : 'medicines'} ·{' '}
            {packCount} {packCount === 1 ? 'pack' : 'packs'}
          </p>
        </div>
        <Button
          disabled={busy}
          onClick={onClear}
          size="sm"
          type="button"
          variant="ghost"
        >
          Clear basket
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {items.map((item) => {
            const medicine = medicineById.get(item.medicine_id)
            const label =
              medicine === undefined
                ? item.medicine_id
                : (medicine.brand_name ?? medicine.generic_name)

            return (
              <li
                className="border-t border-border pt-4 first:border-t-0 first:pt-0"
                key={item.medicine_id}
              >
                {medicine === undefined ? (
                  <p className="font-semibold text-foreground">{label}</p>
                ) : (
                  <MedicineLine medicine={medicine} />
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div
                    aria-label={`Packs of ${label}`}
                    className="flex items-center gap-2"
                    role="group"
                  >
                    <Button
                      aria-label={`Remove one pack of ${label}`}
                      disabled={busy || item.packs <= BASKET_MIN_PACKS}
                      onClick={() => {
                        onPacksChange(item.medicine_id, item.packs - 1)
                      }}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      −
                    </Button>
                    <span
                      aria-live="polite"
                      className="min-w-8 text-center text-sm font-semibold"
                    >
                      {item.packs}
                    </span>
                    <Button
                      aria-label={`Add one pack of ${label}`}
                      disabled={busy || item.packs >= BASKET_MAX_PACKS}
                      onClick={() => {
                        onPacksChange(item.medicine_id, item.packs + 1)
                      }}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      onRemove(item.medicine_id)
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4">
          <Link
            className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
            to="/"
          >
            Add another medicine
          </Link>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Totals multiply each pharmacy&apos;s pack shelf price by the number of
          packs. Prices are per pack, not per tablet.
        </p>
      </CardContent>
    </Card>
  )
}
