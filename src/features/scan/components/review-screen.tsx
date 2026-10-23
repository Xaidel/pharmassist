import { AlertTriangle, Search } from 'lucide-react'
import { useState } from 'react'

import { MedicineLine } from '#/shared/components/medicine-line'
import { Alert } from '#/shared/components/ui/alert'
import { Badge } from '#/shared/components/ui/badge'
import { Button } from '#/shared/components/ui/button'
import { Input } from '#/shared/components/ui/input'
import { Label } from '#/shared/components/ui/label'
import type { BaseUnit } from '#/shared/domain/medicine-summary'

import type { ScanCandidate } from '../scan.schema'

/** One confirmed line the review screen hands back to add to the basket. */
export type ScanBasketLine = {
  medicine_id: string
  quantity: number
  unit: BaseUnit
}

type ReviewScreenProps = {
  items: ScanCandidate[]
  warnings: string[]
  onAdd: (lines: ScanBasketLine[]) => void
  onSearchInstead: () => void
}

const decimalStep = (unit: BaseUnit): string =>
  unit === 'mL' || unit === 'g' ? '0.001' : '1'

/** Review and confirm each recognized medicine; nothing is added automatically. */
export function ReviewScreen({
  items,
  warnings,
  onAdd,
  onSearchInstead,
}: ReviewScreenProps): React.JSX.Element {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  function setQuantity(lineNo: number, quantity: number): void {
    setQuantities((current) => ({ ...current, [String(lineNo)]: quantity }))
  }

  function toggleRemoved(lineNo: number): void {
    setRemoved((current) => {
      const next = new Set(current)
      if (next.has(String(lineNo))) {
        next.delete(String(lineNo))
      } else {
        next.add(String(lineNo))
      }
      return next
    })
  }

  const confirmed = items.filter(
    (item) =>
      !removed.has(String(item.line_no)) && item.suggested_medicine !== null,
  )

  function handleAdd(): void {
    const lines: ScanBasketLine[] = []
    for (const item of items) {
      if (removed.has(String(item.line_no))) {
        continue
      }
      const medicine = item.suggested_medicine
      if (medicine === null) {
        continue
      }
      lines.push({
        medicine_id: medicine.medicine_id,
        quantity: quantities[String(item.line_no)] ?? 1,
        unit: medicine.base_unit,
      })
    }
    onAdd(lines)
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-safe pt-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Review the medicines
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm or edit each one. Nothing is added on its own.
        </p>
      </div>

      {warnings.includes('DEFAULT_SCRIPT') && (
        <Alert variant="info">
          We could not match this photo to a sample prescription, so these are
          demo suggestions. Confirm or change them before adding.
        </Alert>
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          const removedNow = removed.has(String(item.line_no))
          const medicine = item.suggested_medicine

          if (medicine === null) {
            return (
              <li
                className="rounded-2xl border border-border bg-background p-4"
                key={item.line_no}
              >
                <p className="font-semibold">A line could not be matched</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add this medicine by searching instead.
                </p>
              </li>
            )
          }

          return (
            <li
              className="rounded-2xl border border-border bg-background p-4"
              key={item.line_no}
            >
              <div className="flex items-start gap-3">
                <div className={removedNow ? 'opacity-50' : undefined}>
                  <MedicineLine medicine={medicine} />
                </div>
                <button
                  aria-label={`Remove ${medicine.brand_name ?? medicine.generic_name}`}
                  className="ml-auto shrink-0 text-sm font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => {
                    toggleRemoved(item.line_no)
                  }}
                  type="button"
                >
                  {removedNow ? 'Keep' : 'Remove'}
                </button>
              </div>

              {item.low_confidence && !removedNow && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="highlight">
                    <AlertTriangle aria-hidden="true" className="size-3.5" />
                    Low confidence
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Check the name before you add it.
                  </span>
                </div>
              )}

              {!removedNow && (
                <div className="mt-3 flex items-center gap-3">
                  <Label htmlFor={`scan-qty-${String(item.line_no)}`}>
                    Quantity
                  </Label>
                  <Input
                    className="w-24"
                    id={`scan-qty-${String(item.line_no)}`}
                    inputMode="decimal"
                    min={1}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (Number.isFinite(value) && value >= 1) {
                        setQuantity(item.line_no, value)
                      }
                    }}
                    step={decimalStep(medicine.base_unit)}
                    type="number"
                    value={quantities[String(item.line_no)] ?? 1}
                  />
                  <span className="text-sm text-muted-foreground">
                    {medicine.base_unit === 'actuation'
                      ? 'actuations'
                      : medicine.base_unit}
                    {medicine.base_unit === 'unit-dose' ? 's' : ''}
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-2">
        <Button
          disabled={confirmed.length === 0}
          onClick={handleAdd}
          size="lg"
          type="button"
        >
          Add{' '}
          {confirmed.length === 1
            ? 'medicine'
            : `${String(confirmed.length)} medicines`}{' '}
          to basket
        </Button>
        <Button
          onClick={onSearchInstead}
          size="lg"
          type="button"
          variant="outline"
        >
          <Search aria-hidden="true" className="size-5" />
          Search instead
        </Button>
      </div>
    </div>
  )
}
