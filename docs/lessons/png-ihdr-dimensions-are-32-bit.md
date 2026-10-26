# PNG IHDR width and height are 32-bit big-endian

The scan dimension reader parsed the PNG IHDR width and height as 16-bit values, so every real PNG failed validation with `INVALID_IMAGE` while the synthetic unit-test fixture still passed. The PNG spec stores both fields as four-byte big-endian integers at offsets 16 and 20.

```ts
function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) * 0x1000000 +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  )
}

const width = readUint32BE(bytes, 16)
const height = readUint32BE(bytes, 20)
```

When a unit test builds a binary fixture by hand, encode the same width and height the format actually specifies; a fixture that mirrors the parser's mistake hides the bug.
