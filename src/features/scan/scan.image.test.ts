import { describe, expect, it } from 'vitest'

import { readImageDimensions } from './scan.image'

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  bytes[11] = 13
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  bytes[16] = (width >> 8) & 0xff
  bytes[17] = width & 0xff
  bytes[20] = (height >> 8) & 0xff
  bytes[21] = height & 0xff
  return bytes
}

function jpeg(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(13)
  bytes[0] = 0xff
  bytes[1] = 0xd8
  bytes[2] = 0xff
  bytes[3] = 0xc0
  bytes[4] = 0
  bytes[5] = 11
  bytes[6] = 8
  bytes[7] = (height >> 8) & 0xff
  bytes[8] = height & 0xff
  bytes[9] = (width >> 8) & 0xff
  bytes[10] = width & 0xff
  return bytes
}

function webp(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30)
  bytes.set(
    [
      0x52, 0x49, 0x46, 0x46, 0x16, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
      0x38, 0x20,
    ],
    0,
  )
  bytes[26] = width & 0xff
  bytes[27] = (width >> 8) & 0x3f
  bytes[28] = height & 0xff
  bytes[29] = (height >> 8) & 0x3f
  return bytes
}

describe('readImageDimensions', () => {
  it('reads PNG dimensions from the IHDR chunk', () => {
    expect(readImageDimensions(png(512, 256))).toEqual({
      width: 512,
      height: 256,
    })
  })

  it('reads JPEG dimensions from the start-of-frame marker', () => {
    expect(readImageDimensions(jpeg(768, 512))).toEqual({
      width: 768,
      height: 512,
    })
  })

  it('reads WebP lossy dimensions from the frame header', () => {
    expect(readImageDimensions(webp(640, 480))).toEqual({
      width: 640,
      height: 480,
    })
  })

  it('sniffs the format instead of trusting a declared type', () => {
    // A JPEG uploaded under a PNG label is still read as a JPEG.
    expect(readImageDimensions(jpeg(768, 512))).toEqual({
      width: 768,
      height: 512,
    })
  })

  it('returns null when no recognized signature is present', () => {
    expect(readImageDimensions(new Uint8Array(24))).toBeNull()
  })
})
