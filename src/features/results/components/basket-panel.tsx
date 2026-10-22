import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { MedicineLine } from '#/shared/components/medicine-line'
import { Button } from '#/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '#/shared/components/ui/card'
import { Input } from '#/shared/components/ui/input'
import type {
  BaseUnit,
  MedicineSummary,
} from '#/shared/domain/medicine-summary'

import {
  BASKET_MAX_QUANTITY,
  BASKET_MIN_QUANTITY,
  type BasketLine,
} from '../results.domain'
import { quantityWarning, type QuantityPreset } from '../results.quantity'

type BasketPanelProps = {
  items: readonly BasketLine[]
  medicines: readonly MedicineSummary[]
  busy: boolean
  onQuantityChange: (medicineId: string, quantity: number) => void
  onRemove: (medicineId: string) => void
  onClear: () => void
  presetsByMedicine: ReadonlyMap<string, readonly QuantityPreset[]>
}

function allowsDecimal(unit: BaseUnit): boolean {
  return unit === 'mL' || unit === 'g'
}

function sanitizeDraft(value: string, unit: BaseUnit): string {
  if (!allowsDecimal(unit)) {
    return value.replace(/\D/g, '')
  }

  const cleaned = value.replace(/[^0-9.]/g, '')
  const [whole = '', ...parts] = cleaned.split('.')
  const fraction = parts.join('').slice(0, 3)
  return parts.length === 0 ? whole : `${whole}.${fraction}`
}

function isValidDraft(value: string, unit: BaseUnit): boolean {
  if (value === '' || value === '.') {
    return false
  }
  return allowsDecimal(unit)
    ? /^\d*(\.\d{0,3})?$/.test(value)
    : /^\d+$/.test(value)
}

type QuantityInputProps = {
  value: number
  unit: BaseUnit
  label: string
  disabled: boolean
  onChange: (quantity: number) => void
}

/** A typable base-unit quantity with the same bounds as the stepper buttons. */
function QuantityInput({
  value,
  unit,
  label,
  disabled,
  onChange,
}: QuantityInputProps): React.JSX.Element {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit(): void {
    if (!isValidDraft(draft, unit)) {
      setDraft(String(value))
      return
    }

    const parsed = Number(draft)
    if (
      !Number.isFinite(parsed) ||
      parsed < BASKET_MIN_QUANTITY ||
      parsed > BASKET_MAX_QUANTITY
    ) {
      setDraft(String(value))
      return
    }

    const normalized = Math.round(parsed * 1000) / 1000
    setDraft(String(normalized))
    if (normalized !== value) {
      onChange(normalized)
    }
  }

  return (
    <Input
      aria-label={`Quantity of ${label} in ${unit}`}
      autoComplete="off"
      className="w-20 text-center"
      disabled={disabled}
      inputMode={allowsDecimal(unit) ? 'decimal' : 'numeric'}
      onBlur={commit}
      onChange={(event) => {
        setDraft(sanitizeDraft(event.target.value, unit))
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
          event.currentTarget.blur()
          return
        }
        if (event.key === 'Escape') {
          setDraft(String(value))
          event.currentTarget.blur()
        }
      }}
      pattern={allowsDecimal(unit) ? '[0-9]*[.]?[0-9]{0,3}' : '[0-9]*'}
      value={draft}
    />
  )
}

/** Render the session basket and its base-unit quantity controls. */
export function BasketPanel({
  items,
  medicines,
  busy,
  onQuantityChange,
  onRemove,
  onClear,
  presetsByMedicine,
}: BasketPanelProps): React.JSX.Element {
  const medicineById = new Map(
    medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )

  return (
    <Card aria-busy={busy} className="mt-6">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Your basket</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'medicine' : 'medicines'} ·{' '}
            {items.length === 1 ? 'one quantity line' : 'quantity lines'}
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
            const presets = presetsByMedicine.get(item.medicine_id) ?? []
            const warning = quantityWarning(item.quantity, item.unit)

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
                    aria-label={`Quantity of ${label}`}
                    className="flex flex-wrap items-center gap-2"
                    role="group"
                  >
                    <Button
                      aria-label={`Reduce the quantity of ${label}`}
                      disabled={busy || item.quantity <= BASKET_MIN_QUANTITY}
                      onClick={() => {
                        onQuantityChange(item.medicine_id, item.quantity - 1)
                      }}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      −
                    </Button>
                    <QuantityInput
                      disabled={busy}
                      label={label}
                      onChange={(quantity) => {
                        onQuantityChange(item.medicine_id, quantity)
                      }}
                      unit={item.unit}
                      value={item.quantity}
                    />
                    <span className="min-w-10 text-sm font-medium text-muted-foreground">
                      {item.unit}
                    </span>
                    <Button
                      aria-label={`Increase the quantity of ${label}`}
                      disabled={busy || item.quantity >= BASKET_MAX_QUANTITY}
                      onClick={() => {
                        onQuantityChange(item.medicine_id, item.quantity + 1)
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

                {presets.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                      Quick pick
                    </span>
                    {presets.map((preset) => (
                      <Button
                        aria-label={`Set ${label} quantity to ${preset.label}`}
                        disabled={busy}
                        key={`${String(preset.quantity)}:${preset.label}`}
                        onClick={() => {
                          onQuantityChange(item.medicine_id, preset.quantity)
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                )}

                {warning !== null && (
                  <p
                    className="mt-2 text-xs leading-relaxed text-destructive"
                    role="status"
                  >
                    {warning}
                  </p>
                )}
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
          Quantities are counted in each medicine&apos;s base unit. Type a
          quantity or use the buttons; quick picks enter a full bottle, inhaler,
          or tube. A soft warning appears above a typical 30-day supply.
          Pharmacies fulfill the quantity with their observed pack, strip, or
          loose forms.
        </p>
      </CardContent>
    </Card>
  )
}
