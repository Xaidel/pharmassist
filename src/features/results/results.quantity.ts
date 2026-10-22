import type { BaseUnit } from '#/shared/domain/medicine-summary'

import type { SaleFormOffer } from './results.schema'

/** One familiar base-unit quantity offered beside a basket line's input. */
export type QuantityPreset = {
  quantity: number
  label: string
}

const PRESET_UNITS: ReadonlySet<BaseUnit> = new Set(['mL', 'g', 'actuation'])

const FALLBACK_PRESETS: Partial<Record<BaseUnit, QuantityPreset>> = {
  mL: { quantity: 60, label: '1 bottle (60 mL)' },
  g: { quantity: 5, label: '1 tube (5 g)' },
  actuation: { quantity: 200, label: '1 inhaler (200 actuations)' },
}

const THIRTY_DAY_LIMITS: Record<'mL' | 'g' | 'actuation', number> = {
  mL: 450,
  g: 30,
  actuation: 200,
}

const COUNTABLE_THIRTY_DAY_LIMIT = 90

/**
 * Return the observed pack quantities worth offering as one-tap presets.
 *
 * The POC only offers full-pack entry for bottles, inhalers, and tubes. The
 * labels come from the observed sale form so the shortcut matches the shelf
 * label; a missing observation falls back to the usual POC pack size.
 */
export function quantityPresets(
  unit: BaseUnit,
  forms: readonly SaleFormOffer[],
): QuantityPreset[] {
  if (!PRESET_UNITS.has(unit)) {
    return []
  }

  const presets: QuantityPreset[] = []
  const seen = new Set<number>()
  for (const form of forms) {
    if (form.sale_form !== 'pack') {
      continue
    }
    if (
      form.pack_quantity === null ||
      form.form_label === null ||
      seen.has(form.pack_quantity)
    ) {
      continue
    }
    seen.add(form.pack_quantity)
    presets.push({ quantity: form.pack_quantity, label: form.form_label })
  }

  if (presets.length > 0) {
    return presets.sort((left, right) => left.quantity - right.quantity)
  }

  const fallback = FALLBACK_PRESETS[unit]
  return fallback === undefined ? [] : [fallback]
}

/**
 * Return a soft entry warning when a quantity exceeds a typical 30-day supply.
 *
 * The guardrail is client-side copy only: the server still prices any
 * structurally valid basket, including quantities above this estimate.
 */
export function quantityWarning(
  quantity: number,
  unit: BaseUnit,
): string | null {
  if (unit === 'mL' || unit === 'g' || unit === 'actuation') {
    const limit = THIRTY_DAY_LIMITS[unit]
    const label = unit === 'actuation' ? 'actuations' : unit
    return quantity > limit
      ? `More than ${String(limit)} ${label} is above a typical 30-day supply. Check the quantity before comparing prices.`
      : null
  }

  return quantity > COUNTABLE_THIRTY_DAY_LIMIT
    ? `More than ${String(COUNTABLE_THIRTY_DAY_LIMIT)} units is above a typical 30-day supply. Check the quantity before comparing prices.`
    : null
}
