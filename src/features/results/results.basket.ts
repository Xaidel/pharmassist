import {
  BASKET_MAX_ITEMS,
  BASKET_MAX_PACKS,
  BASKET_MIN_PACKS,
  basketLinesSchema,
  type BasketLine,
} from './results.domain'

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

/** Add one medicine at one pack, preserving the existing order. */
export function addBasketLine(
  lines: readonly BasketLine[],
  medicineId: string,
): AddBasketLineOutcome {
  if (lines.some((line) => line.medicine_id === medicineId)) {
    return { lines: [...lines], added: false, reason: 'duplicate' }
  }
  if (lines.length >= BASKET_MAX_ITEMS) {
    return { lines: [...lines], added: false, reason: 'full' }
  }
  return {
    lines: [...lines, { medicine_id: medicineId, packs: 1 }],
    added: true,
  }
}

/** Change one basket line's pack count within the contract limits. */
export function setBasketPacks(
  lines: readonly BasketLine[],
  medicineId: string,
  packs: number,
): BasketLine[] {
  const clamped = Math.min(
    BASKET_MAX_PACKS,
    Math.max(BASKET_MIN_PACKS, Math.trunc(packs)),
  )
  return lines.map((line) =>
    line.medicine_id === medicineId ? { ...line, packs: clamped } : line,
  )
}

/** Remove one medicine from the basket. */
export function removeBasketLine(
  lines: readonly BasketLine[],
  medicineId: string,
): BasketLine[] {
  return lines.filter((line) => line.medicine_id !== medicineId)
}
