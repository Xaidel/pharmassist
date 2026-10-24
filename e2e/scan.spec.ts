import { expect, test } from '@playwright/test'
import { deflateSync } from 'node:zlib'

let crcTable: number[] | null = null
function crc32(buf: Buffer): number {
  if (crcTable === null) {
    crcTable = []
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const byte of buf) {
    crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([length, typeBuf, data, crc])
}

function makePng(width: number, height: number): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3))
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    raw[offset++] = 0
    for (let x = 0; x < width; x += 1) {
      raw[offset++] = 120
      raw[offset++] = 130
      raw[offset++] = 140
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

test('enforces consent and reviews a low-confidence sample before adding', async ({
  page,
}) => {
  await page.goto('/scan')

  // Consent is enforced; declining returns to home safely.
  await expect(
    page.getByRole('heading', { name: 'Scan a prescription' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Search instead' }).click()
  await expect(page).toHaveURL(/\/$/)

  // Re-enter through the home entry point and consent.
  await page.getByRole('button', { name: 'Scan a prescription' }).click()
  await expect(
    page.getByRole('heading', { name: 'Scan a prescription' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'I agree, continue' }).click()

  // A bundled sample is recognized without a file picker.
  await page.getByRole('button', { name: 'Sample prescription A' }).click()
  await expect(
    page.getByRole('heading', { name: 'Review the medicines' }),
  ).toBeVisible()
  await expect(page.getByText('Low confidence').first()).toBeVisible()

  // Nothing auto-adds; confirm the reviewed items into the basket.
  await page.getByRole('button', { name: /medicines to your list/ }).click()
  await expect(page).toHaveURL(/\/results/)
})

test('an unknown image produces the default script', async ({ page }) => {
  await page.goto('/scan')
  await page.getByRole('button', { name: 'I agree, continue' }).click()

  const upload = page.locator('input[type="file"]').nth(1)
  await upload.setInputFiles({
    name: 'prescription.png',
    mimeType: 'image/png',
    buffer: makePng(320, 320),
  })

  await expect(
    page.getByRole('heading', { name: 'Review the medicines' }),
  ).toBeVisible()
  await expect(page.getByText('Low confidence')).toHaveCount(0)
  await expect(page.getByText('Norvasc').first()).toBeVisible()
  await expect(page.getByText('Biogesic').first()).toBeVisible()
})
