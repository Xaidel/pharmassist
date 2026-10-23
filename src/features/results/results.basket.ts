import type { BaseUnit } from '#/shared/domain/medicine-summary'

import {
  BASKET_MAX_ITEMS,
  BASKET_MAX_QUANTITY,
  BASKET_MIN_QUANTITY,
  type BasketLine,
} from './results.domain'
import { defaultQuantity } from './results.quantity'
import { basketLinesSchema } from './results.schema'

const BASKET_STORAGE_KEY = 'pharmassist.basket'

/** Return session storage when the browser exposes it to this page. */
export function getSessionStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}

/** Read the session-only basket, discarding anything malformed. */
export function readBasket(storage: Storage | undefined): BasketLine[] {
  if (storage === undefined) {
    return []
  }
  try {
    const raw = storage.getItem(BASKET_STORAGE_KEY)
    if (raw === null) {
      return []
    }
    const parsed = basketLinesSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.slice(0, BASKET_MAX_ITEMS) : []
  } catch {
    return []
  }
}

/** Write the session-only basket; a blocked storage write never breaks a click. */
export function writeBasket(
  storage: Storage | undefined,
  lines: readonly BasketLine[],
): void {
  if (storage === undefined) {
    return
  }
  try {
    storage.setItem(BASKET_STORAGE_KEY, JSON.stringify(lines))
  } catch {
    return
  }
}

/** Remove the basket from session storage. */
export function clearBasket(storage: Storage | undefined): void {
  if (storage === undefined) {
    return
  }
  try {
    storage.removeItem(BASKET_STORAGE_KEY)
  } catch {
    return
  }
}

/** The outcome of adding one medicine to the session basket. */
export type AddBasketLineOutcome =
  | { lines: BasketLine[]; added: true }
  | { lines: BasketLine[]; added: false; reason: 'duplicate' | 'full' }

/** Add one medicine at one base unit, preserving the existing order. */
export function addBasketLine(
  lines: readonly BasketLine[],
  medicineId: string,
  unit: BaseUnit,
): AddBasketLineOutcome {
  if (lines.some((line) => line.medicine_id === medicineId)) {
    return { lines: [...lines], added: false, reason: 'duplicate' }
  }
  if (lines.length >= BASKET_MAX_ITEMS) {
    return { lines: [...lines], added: false, reason: 'full' }
  }
  return {
    lines: [
      ...lines,
      { medicine_id: medicineId, quantity: defaultQuantity(unit), unit },
    ],
    added: true,
  }
}

/** The outcome of merging confirmed scan lines into the session basket. */
export type AddBasketLinesOutcome = {
  lines: BasketLine[]
  added: number
  duplicateIds: string[]
  full: boolean
}

/**
 * Merge confirmed scan lines into the session basket.
 *
 * A line whose medicine is already present is skipped and reported as a
 * duplicate. Additions stop at the basket's item limit and report `full`.
 */
export function addBasketLines(
  lines: readonly BasketLine[],
  additions: readonly BasketLine[],
): AddBasketLinesOutcome {
  const present = new Set(lines.map((line) => line.medicine_id))
  const duplicateIds: string[] = []
  const appended: BasketLine[] = []

  for (const addition of additions) {
    if (present.has(addition.medicine_id)) {
      duplicateIds.push(addition.medicine_id)
      continue
    }
    if (lines.length + appended.length >= BASKET_MAX_ITEMS) {
      break
    }
    present.add(addition.medicine_id)
    appended.push({
      medicine_id: addition.medicine_id,
      quantity: addition.quantity,
      unit: addition.unit,
    })
  }

  return {
    lines: [...lines, ...appended],
    added: appended.length,
    duplicateIds,
    full: appended.length + duplicateIds.length < additions.length,
  }
}

/** Change one basket line's quantity within the contract limits. */
export function setBasketQuantity(
  lines: readonly BasketLine[],
  medicineId: string,
  quantity: number,
): BasketLine[] {
  if (!Number.isFinite(quantity)) {
    return [...lines]
  }
  const clamped = Math.min(
    BASKET_MAX_QUANTITY,
    Math.max(BASKET_MIN_QUANTITY, quantity),
  )
  const normalized = Math.round(clamped * 1000) / 1000
  return lines.map((line) =>
    line.medicine_id === medicineId ? { ...line, quantity: normalized } : line,
  )
}

/** Remove one medicine from the basket. */
export function removeBasketLine(
  lines: readonly BasketLine[],
  medicineId: string,
): BasketLine[] {
  return lines.filter((line) => line.medicine_id !== medicineId)
}
