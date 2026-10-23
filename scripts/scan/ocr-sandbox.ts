/**
 * Run one image through the live Cloud Vision adapter and print the lines it
 * recognizes. This is a development sandbox, not part of the application.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json \
 *     bun scripts/scan/ocr-sandbox.ts path/to/image.png
 *
 * The image never leaves memory beyond the Cloud Vision call and is not stored.
 */
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { createCloudVisionScanProvider } from '../../src/features/scan/scan.cloud-vision.server'

function mimeTypeFor(path: string): string {
  if (path.endsWith('.png')) {
    return 'image/png'
  }
  if (path.endsWith('.webp')) {
    return 'image/webp'
  }
  return 'image/jpeg'
}

const path = process.argv[2]
if (path === undefined) {
  console.error('usage: bun scripts/scan/ocr-sandbox.ts <image>')
  process.exit(1)
}

const bytes = new Uint8Array(await readFile(path))
const provider = createCloudVisionScanProvider()
const result = await provider.recognize(bytes, mimeTypeFor(path))

if (result.lines.length === 0) {
  console.log(`No text recognized in ${basename(path)}.`)
} else {
  console.log(
    `Recognized ${String(result.lines.length)} line(s) in ${basename(path)}:`,
  )
  for (const line of result.lines) {
    console.log(`${line.confidence.toFixed(2)}\t${line.text}`)
  }
}
