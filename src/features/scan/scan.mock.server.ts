import { createHash } from 'node:crypto'

import type { ScanLine, ScanProvider } from './scan.port'

/** Default pause the mock adds so the scanning state is visible in the demo. */
export const MOCK_SCAN_DELAY_MS = 800

/** One scripted sample prescription the mock recognizes by image hash. */
export type MockSample = {
  sha256: string
  lines: ScanLine[]
}

/** The configuration the mock factory accepts; injected for tests. */
export type MockScanConfig = {
  delayMs?: number
  samples?: Record<string, MockSample>
}

const BUILT_IN_SAMPLES: Record<string, MockSample> = {
  'sample-rx-a': {
    sha256: '9ac18c4a67848c3e6cb13b78c5a14a57b3c66dd73adba922092f89dc447b33e2',
    lines: [
      { text: 'POC-001', confidence: 0.96 },
      { text: 'POC-036', confidence: 0.93 },
      { text: 'POC-025', confidence: 0.41 },
    ],
  },
  'sample-rx-b': {
    sha256: '84d63c59fd8b07505f2dca47125527cd4c70bae9a6393094881ca408b55a0730',
    lines: [
      { text: 'POC-016', confidence: 0.9 },
      { text: 'POC-042', confidence: 0.88 },
    ],
  },
  'sample-rx-c': {
    sha256: '2a413bc755f37d745cb3d1c4fea1f376eb609fd3de1447e4f7ffdd0ad0408339',
    lines: [
      { text: 'POC-019', confidence: 0.92 },
      { text: 'POC-046', confidence: 0.47 },
    ],
  },
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function delay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

/**
 * Build the POC's mock OCR provider.
 *
 * It does not OCR. It hashes the image bytes and returns a deterministic script
 * for the three bundled sample prescriptions, or a default script for any other
 * image. It is stateless and non-logging: no image is written, no text retained.
 */
export function createMockScanProvider(
  config: MockScanConfig = {},
): ScanProvider {
  const samples = config.samples ?? BUILT_IN_SAMPLES
  const delayMs = config.delayMs ?? MOCK_SCAN_DELAY_MS
  const defaultLines: ScanLine[] = [
    { text: 'POC-001', confidence: 0.9 },
    { text: 'POC-036', confidence: 0.9 },
  ]

  return {
    name: 'mock',
    async recognize(image) {
      if (delayMs > 0) {
        await delay(delayMs)
      }
      const hash = sha256Hex(image)
      for (const [id, sample] of Object.entries(samples)) {
        if (sample.sha256 === hash) {
          return { lines: sample.lines, warnings: [], scriptId: id }
        }
      }
      return {
        lines: defaultLines,
        warnings: ['DEFAULT_SCRIPT'],
        scriptId: 'default',
      }
    },
  }
}
