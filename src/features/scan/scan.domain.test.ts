import { describe, expect, it } from 'vitest'

import {
  isLowConfidence,
  SCAN_ACCEPTED_MIME_TYPES,
  SCAN_CONFIDENCE_THRESHOLD,
  SCAN_IMAGE_MAX_BYTES,
} from './scan.domain'

describe('isLowConfidence', () => {
  it('flags a confidence below the threshold', () => {
    expect(isLowConfidence(SCAN_CONFIDENCE_THRESHOLD - 0.01)).toBe(true)
  })

  it('does not flag a confidence at or above the threshold', () => {
    expect(isLowConfidence(SCAN_CONFIDENCE_THRESHOLD)).toBe(false)
    expect(isLowConfidence(0.96)).toBe(false)
  })
})

describe('scan constants', () => {
  it('accepts only JPEG, PNG, and WebP', () => {
    expect(SCAN_ACCEPTED_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ])
  })

  it('caps the image at 8 MB', () => {
    expect(SCAN_IMAGE_MAX_BYTES).toBe(8 * 1024 * 1024)
  })
})
