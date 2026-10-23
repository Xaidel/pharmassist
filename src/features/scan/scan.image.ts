/** The pixel dimensions read from an image header, in pixels. */
export type ImageDimensions = {
  width: number
  height: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function hasSignature(
  bytes: Uint8Array,
  signature: readonly number[],
): boolean {
  if (bytes.length < signature.length) {
    return false
  }
  return signature.every((value, index) => bytes[index] === value)
}

function byteAt(bytes: Uint8Array, offset: number): number {
  return bytes[offset] ?? 0
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (byteAt(bytes, offset) << 8) | byteAt(bytes, offset + 1)
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return (
    byteAt(bytes, offset) |
    (byteAt(bytes, offset + 1) << 8) |
    (byteAt(bytes, offset + 2) << 16)
  )
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return byteAt(bytes, offset) | (byteAt(bytes, offset + 1) << 8)
}

/** Read a four-character ASCII tag from the header, or null past the end. */
function asciiTag(bytes: Uint8Array, offset: number): string | null {
  let tag = ''
  for (let index = offset; index < offset + 4; index += 1) {
    const byte = bytes[index]
    if (byte === undefined) {
      return null
    }
    tag += String.fromCharCode(byte)
  }
  return tag
}

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  // Signature (8) + IHDR length (4) + "IHDR" (4) = 16, then width and height.
  if (bytes.length < 24) {
    return null
  }
  const width = readUint16BE(bytes, 16)
  const height = readUint16BE(bytes, 20)
  return width === 0 || height === 0 ? null : { width, height }
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]
    if (marker === undefined) {
      return null
    }
    // Skip padding 0xff bytes and markers with no payload.
    if (marker === 0xff) {
      offset += 1
      continue
    }
    const standalone = [0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]
    if (standalone.includes(marker)) {
      offset += 2
      continue
    }
    const length = readUint16BE(bytes, offset + 2)
    // Start-of-frame markers carry the height then the width after precision.
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      const height = readUint16BE(bytes, offset + 5)
      const width = readUint16BE(bytes, offset + 7)
      return width === 0 || height === 0 ? null : { width, height }
    }
    if (length < 2) {
      return null
    }
    offset += 2 + length
  }
  return null
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 30) {
    return null
  }
  const fourCC = asciiTag(bytes, 12)
  if (fourCC === 'VP8 ') {
    const width = readUint16LE(bytes, 26) & 0x3fff
    const height = readUint16LE(bytes, 28) & 0x3fff
    return width === 0 || height === 0 ? null : { width, height }
  }
  if (fourCC === 'VP8L') {
    if (byteAt(bytes, 20) !== 0x2f) {
      return null
    }
    const width = 1 + (byteAt(bytes, 21) | ((byteAt(bytes, 22) & 0x3f) << 8))
    const height =
      1 +
      (((byteAt(bytes, 22) & 0xc0) >> 6) |
        (byteAt(bytes, 23) << 2) |
        ((byteAt(bytes, 24) & 0x0f) << 10))
    return { width, height }
  }
  if (fourCC === 'VP8X') {
    const width = 1 + readUint24LE(bytes, 24)
    const height = 1 + readUint24LE(bytes, 27)
    return { width, height }
  }
  return null
}

/**
 * Read the pixel dimensions from an image's header bytes.
 *
 * The format is sniffed from the magic bytes (PNG, JPEG, or WebP) rather than
 * trusting the declared MIME type, because a mislabelled upload — a JPEG saved
 * with a `.png` extension, say — must still be read. Returns null when the
 * header cannot be read, which the caller treats as an invalid image.
 */
export function readImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (hasSignature(bytes, PNG_SIGNATURE)) {
    return readPngDimensions(bytes)
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return readJpegDimensions(bytes)
  }
  if (
    bytes.length >= 12 &&
    asciiTag(bytes, 0) === 'RIFF' &&
    asciiTag(bytes, 8) === 'WEBP'
  ) {
    return readWebpDimensions(bytes)
  }
  return null
}
