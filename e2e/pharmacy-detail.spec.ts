import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Client } from 'pg'

const JANUMET_RESULT_KEY = 'generika-lcc-cbd2|POC-016'

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL is required for browser acceptance tests')
  }
  return url
}

async function openJanumetResults(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('janumet')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: /medicines? match/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Compare prices' }).first().click()
  await expect(
    page.getByRole('heading', { name: 'Complete baskets' }),
  ).toBeVisible()
}

async function openCheapestDetail(page: Page): Promise<void> {
  await page
    .locator('section[aria-labelledby="complete-results-heading"] li')
    .first()
    .getByRole('button', { name: 'View details' })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: /Generika Drugstore/ }),
  ).toBeVisible()
}

async function deleteReportsForResultKey(): Promise<void> {
  const client = new Client({ connectionString: requireDatabaseUrl() })
  await client.connect()
  try {
    await client.query('delete from price_report where result_key = $1', [
      JANUMET_RESULT_KEY,
    ])
  } finally {
    await client.end()
  }
}

test.afterAll(async () => {
  await deleteReportsForResultKey()
})

test('opens pharmacy detail from a result and hands off directions', async ({
  page,
}) => {
  const databaseUrl = requireDatabaseUrl()
  const startedAt = new Date()
  await openJanumetResults(page)
  await openCheapestDetail(page)

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('0917-871-8924 / (054) 472-8080')).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: /Full stock list \(/ }),
  ).toBeVisible()
  await expect(
    dialog.getByText(/MDRP ceiling \(EO 104 s\. 2020/).first(),
  ).toBeVisible()
  await expect(
    dialog.getByText('Complete basket', { exact: false }),
  ).toBeVisible()

  await page.evaluate(() => {
    const target = window as Window & { __pharmassistOpenedUrl?: string }
    window.open = (url?: string | URL) => {
      target.__pharmassistOpenedUrl = String(url)
      return null
    }
  })

  await dialog.getByRole('button', { name: 'Directions' }).click()

  const openedUrl = await page.evaluate(
    () =>
      (window as Window & { __pharmassistOpenedUrl?: string })
        .__pharmassistOpenedUrl,
  )
  expect(openedUrl).toContain('https://www.google.com/maps/dir/?api=1')
  expect(openedUrl).toMatch(/destination=13\.\d{4,6},123\.\d{4,6}$/)

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await expect
      .poll(async () => {
        const result = await client.query<{ count: number }>(
          `select count(*)::int as count
             from app_event
            where name in ('pharmacy_detail_viewed', 'directions_tapped')
              and occurred_at >= $1`,
          [startedAt],
        )
        return result.rows[0]?.count ?? 0
      })
      .toBeGreaterThanOrEqual(2)
  } finally {
    await client.end()
  }
})

test('persists a report and shows the reported state after reload', async ({
  page,
  request,
}) => {
  await deleteReportsForResultKey()
  await openJanumetResults(page)
  await openCheapestDetail(page)

  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Wrong price' }).click()
  await dialog
    .getByLabel('Note (optional)')
    .fill('Shelf price differs from the posted tag.')
  await dialog.getByRole('button', { name: 'Send report' }).click()
  await expect(
    dialog.getByText('Price reported', { exact: true }),
  ).toBeVisible()

  const summary = await request.get(
    `/api/reports?result_key=${encodeURIComponent(JANUMET_RESULT_KEY)}`,
  )
  expect(summary.status()).toBe(200)
  const summaryBody: unknown = await summary.json()
  expect(summaryBody).toMatchObject({
    result_key: JANUMET_RESULT_KEY,
    reported: true,
    latest: { reason: 'wrong_price' },
  })
  expect(JSON.stringify(summaryBody)).not.toContain(
    'Shelf price differs from the posted tag.',
  )

  await page.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByText('Price reported').first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('Price reported').first()).toBeVisible()
})

test('serves the detail and report contract errors', async ({ request }) => {
  const detail = await request.get(
    '/api/pharmacies/mercury-naga-penafrancia?medicine_ids=POC-016&origin_latitude=13.6215&origin_longitude=123.1945',
  )
  expect(detail.status()).toBe(200)
  const detailBody: unknown = await detail.json()
  expect(detailBody).toMatchObject({
    pharmacy: {
      pharmacy_id: 'mercury-naga-penafrancia',
      open_24h: true,
    },
    basket: { complete: true },
  })
  expect(JSON.stringify(detailBody)).toContain(
    'https://www.google.com/maps/dir/?api=1&destination=',
  )

  const unknownPharmacy = await request.get('/api/pharmacies/not-a-pharmacy')
  expect(unknownPharmacy.status()).toBe(404)
  expect(await unknownPharmacy.json()).toMatchObject({
    error: { code: 'UNKNOWN_PHARMACY' },
  })

  const unknownMedicine = await request.get(
    '/api/pharmacies/mercury-naga-penafrancia?medicine_ids=NOT-A-MEDICINE',
  )
  expect(unknownMedicine.status()).toBe(422)
  expect(await unknownMedicine.json()).toMatchObject({
    error: { code: 'UNKNOWN_MEDICINE' },
  })

  const badOrigin = await request.get(
    '/api/pharmacies/mercury-naga-penafrancia?origin_latitude=13.6',
  )
  expect(badOrigin.status()).toBe(400)
  expect(await badOrigin.json()).toMatchObject({
    error: { code: 'INVALID_ORIGIN' },
  })

  const badReport = await request.post('/api/reports', {
    data: {
      pharmacy_id: 'mercury-naga-penafrancia',
      medicine_ids: ['POC-016'],
      reason: 'too_expensive',
    },
  })
  expect(badReport.status()).toBe(400)

  const unknownReportPharmacy = await request.post('/api/reports', {
    data: {
      pharmacy_id: 'not-a-pharmacy',
      medicine_ids: ['POC-016'],
      reason: 'wrong_price',
    },
  })
  expect(unknownReportPharmacy.status()).toBe(404)
  expect(await unknownReportPharmacy.json()).toMatchObject({
    error: { code: 'UNKNOWN_PHARMACY' },
  })

  const unknownReportMedicine = await request.post('/api/reports', {
    data: {
      pharmacy_id: 'mercury-naga-penafrancia',
      medicine_ids: ['NOT-A-MEDICINE'],
      reason: 'wrong_price',
    },
  })
  expect(unknownReportMedicine.status()).toBe(422)
  expect(await unknownReportMedicine.json()).toMatchObject({
    error: { code: 'UNKNOWN_MEDICINE' },
  })
})
