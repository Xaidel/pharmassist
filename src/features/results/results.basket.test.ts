import { describe, expect, it } from 'vitest'

import {
  addBasketLine,
  clearBasket,
  readBasket,
  removeBasketLine,
  setBasketPacks,
  writeBasket,
} from './results.basket'
import { BASKET_MAX_ITEMS } from './results.domain'

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
    writeBasket(storage, [{ medicine_id: 'POC-001', packs: 2 }])

    expect(readBasket(storage)).toEqual([{ medicine_id: 'POC-001', packs: 2 }])
  })

  it('discards malformed or out-of-contract storage', () => {
    const storage = new MemoryStorage()
    storage.setItem('pharmassist.basket', '{not-json')
    expect(readBasket(storage)).toEqual([])

    storage.setItem(
      'pharmassist.basket',
      JSON.stringify([{ medicine_id: 'POC-001', packs: 0 }]),
    )
    expect(readBasket(storage)).toEqual([])
  })

  it('adds one medicine once and refuses duplicates and overflow', () => {
    const first = addBasketLine([], 'POC-001')
    expect(first).toEqual({
      lines: [{ medicine_id: 'POC-001', packs: 1 }],
      added: true,
    })

    expect(addBasketLine(first.lines, 'POC-001')).toEqual({
      lines: [{ medicine_id: 'POC-001', packs: 1 }],
      added: false,
      reason: 'duplicate',
    })

    const full = Array.from({ length: BASKET_MAX_ITEMS }, (_, index) => ({
      medicine_id: `POC-${String(index + 1)}`,
      packs: 1,
    }))
    expect(addBasketLine(full, 'POC-099')).toEqual({
      lines: full,
      added: false,
      reason: 'full',
    })
  })

  it('clamps pack changes and removes a line', () => {
    const lines = [{ medicine_id: 'POC-001', packs: 1 }]
    expect(setBasketPacks(lines, 'POC-001', 0)).toEqual([
      { medicine_id: 'POC-001', packs: 1 },
    ])
    expect(setBasketPacks(lines, 'POC-001', 99)).toEqual([
      { medicine_id: 'POC-001', packs: 10 },
    ])
    expect(setBasketPacks(lines, 'POC-001', 3)).toEqual([
      { medicine_id: 'POC-001', packs: 3 },
    ])
    expect(removeBasketLine(lines, 'POC-001')).toEqual([])
  })

  it('clears the stored basket', () => {
    const storage = new MemoryStorage()
    writeBasket(storage, [{ medicine_id: 'POC-001', packs: 1 }])
    clearBasket(storage)
    expect(storage.getItem('pharmassist.basket')).toBeNull()
  })
})
