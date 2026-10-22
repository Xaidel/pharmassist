import { Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

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
import {
  isPackUnit,
  PACK_COUNT_MAX,
  quantityWarning,
  type QuantityPreset,
} from '../results.quantity'

type BasketPanelProps = {
  items: readonly BasketLine[]
  medicines: readonly MedicineSummary[]
  busy: boolean
  onQuantityChange: (medicineId: string, quantity: number) => void
  onRemove: (medicineId: string) => void
  onClear: () => void
  presetsByMedicine: ReadonlyMap<string, readonly QuantityPreset[]>
  /** Shows a close button when the panel is a drawer. */
  onClose?: () => void
  /** An in-place medicine search, shown when the user taps Add a medicine. */
  addMedicine?: ReactNode
  /** Called when the user starts adding, so the page can make room. */
  onStartAdding?: () => void
  /** A main action under the list, such as Compare prices. */
  footer?: ReactNode
}

function allowsDecimal(unit: BaseUnit): boolean {
  return unit === 'mL' || unit === 'g'
}

// Countable units read as words, so they pluralise; mL and g are symbols and do not.
function unitLabel(quantity: number, unit: BaseUnit): string {
  return quantity === 1 || unit === 'mL' || unit === 'g' ? unit : `${unit}s`
}

function sanitizeDraft(value: string, decimal: boolean): string {
  if (!decimal) {
    return value.replace(/\D/g, '')
  }

  const cleaned = value.replace(/[^0-9.]/g, '')
  const [whole = '', ...parts] = cleaned.split('.')
  const fraction = parts.join('').slice(0, 3)
  return parts.length === 0 ? whole : `${whole}.${fraction}`
}

function isValidDraft(value: string, decimal: boolean): boolean {
  if (value === '' || value === '.') {
    return false
  }
  return decimal ? /^\d*(\.\d{0,3})?$/.test(value) : /^\d+$/.test(value)
}

type QuantityInputProps = {
  value: number
  ariaLabel: string
  /** Allow up to three decimal places, for mL and g. */
  decimal: boolean
  min: number
  max: number
  disabled: boolean
  onChange: (quantity: number) => void
}

/** A typable count with the same bounds as the stepper buttons beside it. */
function QuantityInput({
  value,
  ariaLabel,
  decimal,
  min,
  max,
  disabled,
  onChange,
}: QuantityInputProps): React.JSX.Element {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit(): void {
    if (!isValidDraft(draft, decimal)) {
      setDraft(String(value))
      return
    }

    const parsed = Number(draft)
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
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
      aria-label={ariaLabel}
      autoComplete="off"
      className="w-14 text-center"
      disabled={disabled}
      inputMode={decimal ? 'decimal' : 'numeric'}
      onBlur={commit}
      onChange={(event) => {
        setDraft(sanitizeDraft(event.target.value, decimal))
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
      pattern={decimal ? '[0-9]*[.]?[0-9]{0,3}' : '[0-9]*'}
      value={draft}
    />
  )
}

type BasketLineControlsProps = {
  item: BasketLine
  label: string
  pack: QuantityPreset | undefined
  busy: boolean
  onQuantityChange: (medicineId: string, quantity: number) => void
}

/** The − count + controls for one line: whole packs, or single units. */
function BasketLineControls({
  item,
  label,
  pack,
  busy,
  onQuantityChange,
}: BasketLineControlsProps): React.JSX.Element {
  if (pack === undefined) {
    return (
      <div
        aria-label={`Quantity of ${label}`}
        className="flex items-center gap-2"
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
          ariaLabel={`Quantity of ${label} in ${item.unit}`}
          decimal={allowsDecimal(item.unit)}
          disabled={busy}
          max={BASKET_MAX_QUANTITY}
          min={BASKET_MIN_QUANTITY}
          onChange={(quantity) => {
            onQuantityChange(item.medicine_id, quantity)
          }}
          value={item.quantity}
        />
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
        <span className="text-base text-muted-foreground">
          {unitLabel(item.quantity, item.unit)}
        </span>
      </div>
    )
  }

  // Sold only as whole packs: count packs, never odd amounts.
  const packCount = Math.max(1, Math.ceil(item.quantity / pack.quantity))
  return (
    <div
      aria-label={`Number of packs of ${label}`}
      className="flex items-center gap-2"
      role="group"
    >
      <Button
        aria-label={`One fewer pack of ${label}`}
        disabled={busy || packCount <= 1}
        onClick={() => {
          onQuantityChange(item.medicine_id, (packCount - 1) * pack.quantity)
        }}
        size="icon"
        type="button"
        variant="outline"
      >
        −
      </Button>
      <QuantityInput
        ariaLabel={`Number of packs of ${label}`}
        decimal={false}
        disabled={busy}
        max={PACK_COUNT_MAX}
        min={1}
        onChange={(count) => {
          onQuantityChange(item.medicine_id, count * pack.quantity)
        }}
        value={packCount}
      />
      <Button
        aria-label={`One more pack of ${label}`}
        disabled={busy || packCount >= PACK_COUNT_MAX}
        onClick={() => {
          onQuantityChange(item.medicine_id, (packCount + 1) * pack.quantity)
        }}
        size="icon"
        type="button"
        variant="outline"
      >
        +
      </Button>
      <span className="min-w-0 text-base leading-tight">
        × {pack.label}
        <span className="block text-sm text-muted-foreground">
          {item.quantity} {unitLabel(item.quantity, item.unit)} in total
        </span>
      </span>
    </div>
  )
}

/** Render the session basket as a numbered, prescription-style list. */
export function BasketPanel({
  items,
  medicines,
  busy,
  onQuantityChange,
  onRemove,
  onClear,
  presetsByMedicine,
  onClose,
  addMedicine,
  onStartAdding,
  footer,
}: BasketPanelProps): React.JSX.Element {
  const medicineById = new Map(
    medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )

  return (
    <Card aria-busy={busy}>
      {/* A reseta-style header: the list name and its size over a dashed rule. */}
      <CardHeader>
        <div className="flex items-center gap-3 border-b-2 border-dashed border-border pb-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold">Your basket</h2>
            <p className="text-base text-muted-foreground">
              {items.length === 0
                ? 'No medicines yet'
                : `${String(items.length)} ${
                    items.length === 1 ? 'medicine' : 'medicines'
                  }`}
            </p>
          </div>
          {onClose !== undefined && (
            <Button
              aria-label="Close basket"
              className="shrink-0"
              onClick={onClose}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <p className="text-base text-muted-foreground">
            Search for a medicine and tap Add to basket to start your list.
          </p>
        ) : (
          <ol className="divide-y divide-dashed divide-border">
            {items.map((item, index) => {
              const medicine = medicineById.get(item.medicine_id)
              const label =
                medicine === undefined
                  ? item.medicine_id
                  : (medicine.brand_name ?? medicine.generic_name)
              const presets = presetsByMedicine.get(item.medicine_id) ?? []
              const warning = quantityWarning(item.quantity, item.unit)
              // Bottles, tubes, and inhalers are counted in their smallest real pack.
              const pack = isPackUnit(item.unit) ? presets[0] : undefined

              return (
                <li
                  className="flex gap-3 py-4 first:pt-0 last:pb-0"
                  key={item.medicine_id}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {medicine === undefined ? (
                          <p className="font-semibold text-foreground">
                            {label}
                          </p>
                        ) : (
                          <MedicineLine medicine={medicine} />
                        )}
                      </div>
                      <Button
                        aria-label={`Remove ${label}`}
                        className="-mr-2 -mt-2 shrink-0"
                        disabled={busy}
                        onClick={() => {
                          onRemove(item.medicine_id)
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-5" />
                      </Button>
                    </div>

                    <div className="mt-3">
                      <BasketLineControls
                        busy={busy}
                        item={item}
                        label={label}
                        onQuantityChange={onQuantityChange}
                        pack={pack}
                      />
                    </div>

                    {/* With one pack size the counter covers it; offer a choice only when sizes differ. */}
                    {presets.length > (pack === undefined ? 0 : 1) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {pack === undefined ? 'Quick pick:' : 'Pack size:'}
                        </span>
                        {presets.map((preset) => (
                          <Button
                            aria-label={`Set ${label} quantity to ${preset.label}`}
                            disabled={busy}
                            key={`${String(preset.quantity)}:${preset.label}`}
                            onClick={() => {
                              onQuantityChange(
                                item.medicine_id,
                                preset.quantity,
                              )
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
                        className="mt-2 text-sm leading-relaxed text-destructive"
                        role="status"
                      >
                        {warning}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {footer !== undefined && (
          // Stays in view while the drawer scrolls, so the main action is never hidden.
          <div className="sticky bottom-0 mt-4 bg-card py-3">{footer}</div>
        )}

        {(addMedicine !== undefined || items.length > 0) && (
          <div className="mt-4 border-t-2 border-dashed border-border pt-4">
            {addMedicine !== undefined && (
              // Focusing the field means the user is adding, so the page can make room.
              <div onFocusCapture={onStartAdding}>{addMedicine}</div>
            )}
            {items.length > 0 && (
              <div className="mt-2 flex justify-end">
                <Button
                  disabled={busy}
                  onClick={onClear}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Clear basket
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
