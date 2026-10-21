import { describe, expect, it } from 'vitest'

import {
  addBasketLine,
  clearBasket,
  readBasket,
  removeBasketLine,
  setBasketQuantity,
  writeBasket,
} from './results.basket'
import { BASKET_MAX_ITEMS, BASKET_MAX_QUANTITY } from './results.domain'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe('session basket', () => {
  it('round-trips the validated basket', () => {
    const storage = new MemoryStorage()
    writeBasket(storage, [
      { medicine_id: 'POC-001', quantity: 5, unit: 'tablet' },
    ])

    expect(readBasket(storage)).toEqual([
      { medicine_id: 'POC-001', quantity: 5, unit: 'tablet' },
    ])
  })

  it('discards malformed or out-of-contract storage', () => {
    const storage = new MemoryStorage()
    storage.setItem('pharmassist.basket', '{not-json')
    expect(readBasket(storage)).toEqual([])

    storage.setItem(
      'pharmassist.basket',
      JSON.stringify([{ medicine_id: 'POC-001', quantity: 0, unit: 'tablet' }]),
    )
    expect(readBasket(storage)).toEqual([])

    storage.setItem(
      'pharmassist.basket',
      JSON.stringify([{ medicine_id: 'POC-001', packs: 1 }]),
    )
    expect(readBasket(storage)).toEqual([])
  })

  it('adds one medicine once and refuses duplicates and overflow', () => {
    const first = addBasketLine([], 'POC-001', 'tablet')
    expect(first).toEqual({
      lines: [{ medicine_id: 'POC-001', quantity: 1, unit: 'tablet' }],
      added: true,
    })

    expect(addBasketLine(first.lines, 'POC-001', 'tablet')).toEqual({
      lines: [{ medicine_id: 'POC-001', quantity: 1, unit: 'tablet' }],
      added: false,
      reason: 'duplicate',
    })

    const full = Array.from({ length: BASKET_MAX_ITEMS }, (_, index) => ({
      medicine_id: `POC-${String(index + 1)}`,
      quantity: 1,
      unit: 'tablet' as const,
    }))
    expect(addBasketLine(full, 'POC-099', 'tablet')).toEqual({
      lines: full,
      added: false,
      reason: 'full',
    })
  })

  it('clamps quantity changes and removes a line', () => {
    const lines = [
      { medicine_id: 'POC-001', quantity: 1, unit: 'tablet' as const },
    ]
    expect(setBasketQuantity(lines, 'POC-001', 0)).toEqual([
      { medicine_id: 'POC-001', quantity: 1, unit: 'tablet' },
    ])
    expect(
      setBasketQuantity(lines, 'POC-001', BASKET_MAX_QUANTITY + 1),
    ).toEqual([
      {
        medicine_id: 'POC-001',
        quantity: BASKET_MAX_QUANTITY,
        unit: 'tablet',
      },
    ])
    expect(setBasketQuantity(lines, 'POC-001', 3)).toEqual([
      { medicine_id: 'POC-001', quantity: 3, unit: 'tablet' },
    ])
    expect(removeBasketLine(lines, 'POC-001')).toEqual([])
  })

  it('clears the stored basket', () => {
    const storage = new MemoryStorage()
    writeBasket(storage, [
      { medicine_id: 'POC-001', quantity: 1, unit: 'tablet' },
    ])
    clearBasket(storage)
    expect(storage.getItem('pharmassist.basket')).toBeNull()
  })
})
