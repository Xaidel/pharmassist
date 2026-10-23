import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { createMockScanProvider } from './scan.mock.server'

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

describe('createMockScanProvider', () => {
  it('returns the script for a sample whose hash matches', async () => {
    const image = new Uint8Array([1, 2, 3, 4])
    const lines = [{ text: 'POC-001', confidence: 0.9 }]
    const provider = createMockScanProvider({
      delayMs: 0,
      samples: { 'sample-test': { sha256: sha256(image), lines } },
    })

    const result = await provider.recognize(image, 'image/png')

    expect(result.scriptId).toBe('sample-test')
    expect(result.lines).toEqual(lines)
    expect(result.warnings).toEqual([])
  })

  it('returns the default script for an unknown image', async () => {
    const provider = createMockScanProvider({ delayMs: 0, samples: {} })

    const result = await provider.recognize(new Uint8Array([9, 9]), 'image/png')

    expect(result.scriptId).toBe('default')
    expect(result.warnings).toEqual(['DEFAULT_SCRIPT'])
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it('reports its name as the provider the response carries', () => {
    const provider = createMockScanProvider({ delayMs: 0 })
    expect(provider.name).toBe('mock')
  })
})
