import { sendEvents } from '#/lib/events'
import type { BaseUnit } from '#/shared/domain/medicine-summary'

import {
  addBasketLine,
  addBasketLines,
  getSessionStorage,
  readBasket,
  removeBasketLine,
  writeBasket,
} from './results.basket'
import type { BasketLine } from './results.domain'

/** Fired on `window` when the basket changes outside the results screen. */
export const BASKET_CHANGED_EVENT = 'pharmassist:basket-changed'

/** How adding a medicine to the basket from another screen went. */
export type AddToBasketResult = 'added' | 'duplicate' | 'full'

/** The result of merging confirmed scan lines into the session basket. */
export type AddLinesToBasketResult = {
  added: number
  duplicateCount: number
  full: boolean
}

/** Merge confirmed scan lines into the session basket and announce the change. */
export function addLinesToSessionBasket(
  additions: readonly BasketLine[],
): AddLinesToBasketResult {
  const storage = getSessionStorage()
  const outcome = addBasketLines(readBasket(storage), additions)
  writeBasket(storage, outcome.lines)
  window.dispatchEvent(new Event(BASKET_CHANGED_EVENT))
  if (outcome.added > 0) {
    sendEvents([
      {
        name: 'basket_item_added',
        properties: { source: 'scan', item_count: outcome.lines.length },
      },
    ]).catch(() => undefined)
  }
  return {
    added: outcome.added,
    duplicateCount: outcome.duplicateIds.length,
    full: outcome.full,
  }
}

/** Add a medicine to the session basket from another screen, such as home search. */
export function addToSessionBasket(
  medicineId: string,
  unit: BaseUnit,
): AddToBasketResult {
  const storage = getSessionStorage()
  const outcome = addBasketLine(readBasket(storage), medicineId, unit)
  if (!outcome.added) {
    return outcome.reason
  }

  writeBasket(storage, outcome.lines)
  window.dispatchEvent(new Event(BASKET_CHANGED_EVENT))
  sendEvents([
    {
      name: 'basket_item_added',
      properties: { source: 'search', item_count: outcome.lines.length },
    },
  ]).catch(() => undefined)
  return 'added'
}

/** Remove a medicine from the session basket from another screen, such as home search. */
export function removeFromSessionBasket(medicineId: string): void {
  const storage = getSessionStorage()
  const current = readBasket(storage)
  const next = removeBasketLine(current, medicineId)
  if (next.length === current.length) {
    return
  }

  writeBasket(storage, next)
  window.dispatchEvent(new Event(BASKET_CHANGED_EVENT))
  sendEvents([
    {
      name: 'basket_item_removed',
      properties: { item_count: next.length },
    },
  ]).catch(() => undefined)
}

/** Listen for basket changes made outside the results screen; returns an unsubscribe. */
export function subscribeToBasket(onChange: () => void): () => void {
  window.addEventListener(BASKET_CHANGED_EVENT, onChange)
  return () => {
    window.removeEventListener(BASKET_CHANGED_EVENT, onChange)
  }
}

/** The basket's medicine IDs as one stable string, for `useSyncExternalStore`. */
export function basketIdsSnapshot(): string {
  return readBasket(getSessionStorage())
    .map((line) => line.medicine_id)
    .join(',')
}

/** Announce a basket change made by the basket drawer to other listeners. */
export function announceBasketChange(): void {
  window.dispatchEvent(new Event(BASKET_CHANGED_EVENT))
}

/** Everything another screen needs to add to, remove from, and watch the basket. */
export const sessionBasket = {
  add: addToSessionBasket,
  addLines: addLinesToSessionBasket,
  remove: removeFromSessionBasket,
  subscribe: subscribeToBasket,
  snapshot: basketIdsSnapshot,
} as const
