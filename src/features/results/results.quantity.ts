import type { BaseUnit } from '#/shared/domain/medicine-summary'

import type { BasketLine } from './results.domain'
import type { ResultsResponse, SaleFormOffer } from './results.schema'

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

/**
 * The starting quantity for a new basket line: one usual pack for bottles,
 * tubes, and inhalers, since nobody buys 1 mL of syrup, and 1 for everything
 * counted in single units.
 */
export function defaultQuantity(unit: BaseUnit): number {
  return FALLBACK_PRESETS[unit]?.quantity ?? 1
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

/** The most whole packs one basket line may ask for, per the data contract. */
export const PACK_COUNT_MAX = 10

/**
 * True when a medicine is only sold as whole bottles, tubes, or inhalers, so
 * its basket quantity is entered in packs rather than single units.
 */
export function isPackUnit(unit: BaseUnit): boolean {
  return PRESET_UNITS.has(unit)
}

/** Round a base-unit quantity up to whole packs; never below one pack. */
export function roundUpToPacks(quantity: number, packQuantity: number): number {
  return Math.max(1, Math.ceil(quantity / packQuantity)) * packQuantity
}

/** Build each basket medicine's pack presets from the forms a results response observed. */
export function presetsFromResults(
  data: ResultsResponse,
): Map<string, readonly QuantityPreset[]> {
  const forms = new Map<string, readonly SaleFormOffer[]>()
  for (const group of [
    data.complete,
    data.sold_per_pack_only,
    data.incomplete,
  ]) {
    for (const result of group) {
      for (const item of result.items) {
        if (!forms.has(item.medicine_id)) {
          forms.set(item.medicine_id, item.forms)
        }
      }
    }
  }

  const presets = new Map<string, readonly QuantityPreset[]>()
  for (const item of data.basket.items) {
    presets.set(
      item.medicine_id,
      quantityPresets(
        item.medicine.base_unit,
        forms.get(item.medicine_id) ?? [],
      ),
    )
  }
  return presets
}

/** The outcome of fitting basket lines to the packs pharmacies actually sell. */
export type PackFit = {
  lines: BasketLine[]
  /** Medicines whose odd amount was rounded up to whole packs. */
  roundedIds: string[]
}

/**
 * Fit bottle, tube, and inhaler lines to real pack sizes. A line still at its
 * usual-pack guess, and not yet `checked`, moves to the smallest real pack;
 * any other amount that is not a sold pack size rounds up to whole packs.
 * Lines with no observed pack, or counted in single units, are left alone.
 */
export function fitToPacks(
  lines: readonly BasketLine[],
  presetsByMedicine: ReadonlyMap<string, readonly QuantityPreset[]>,
  checked: ReadonlySet<string>,
): PackFit {
  const roundedIds: string[] = []
  const fitted = lines.map((line) => {
    const presets = presetsByMedicine.get(line.medicine_id) ?? []
    const smallestPack = presets[0]
    if (smallestPack === undefined || !isPackUnit(line.unit)) {
      return line
    }
    if (presets.some((preset) => preset.quantity === line.quantity)) {
      return line
    }
    if (
      !checked.has(line.medicine_id) &&
      line.quantity === defaultQuantity(line.unit)
    ) {
      return { ...line, quantity: smallestPack.quantity }
    }
    const whole = roundUpToPacks(line.quantity, smallestPack.quantity)
    if (whole === line.quantity) {
      return line
    }
    roundedIds.push(line.medicine_id)
    return { ...line, quantity: whole }
  })
  return { lines: fitted, roundedIds }
}
