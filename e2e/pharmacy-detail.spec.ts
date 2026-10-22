import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Client } from 'pg'

const JANUMET_RESULT_KEY = 'mercury-naga-penafrancia|POC-016'

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
    dialog.getByRole('heading', { name: /Mercury Drug/ }),
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

test('opens pharmacy detail and renders a native route', async ({ page }) => {
  const databaseUrl = requireDatabaseUrl()
  const startedAt = new Date()
  let directionsRequested = false

  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({
    latitude: 13.6215,
    longitude: 123.1945,
  })

  await page.route('**/api/directions**', async (route) => {
    directionsRequested = true
    await new Promise((resolve) => {
      setTimeout(resolve, 800)
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pharmacy_id: 'mercury-naga-penafrancia',
        origin: { latitude: 13.6215, longitude: 123.1945 },
        route: {
          type: 'LineString',
          coordinates: [
            [123.1945, 13.6215],
            [123.1912, 13.6204],
            [123.189712, 13.619626],
          ],
        },
        distance_m: 1234,
        duration_s: 456,
        provider: 'osrm',
        generated_at: '2026-10-21T10:00:00Z',
      }),
    })
  })

  await openJanumetResults(page)
  await expect(
    page.getByText('Distances use your current location.'),
  ).toBeVisible()
  await openCheapestDetail(page)

  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText('(054) 472-3214 / (054) 811-2228 / (0968) 878-7678'),
  ).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: /Full stock list \(/ }),
  ).toBeVisible()
  await expect(
    dialog
      .locator('section[aria-labelledby="detail-stock-heading"]')
      .getByText(/MDRP ceiling \(EO 104 s\. 2020/)
      .first(),
  ).toBeVisible()
  await expect(dialog.getByText('Exact basket', { exact: false })).toBeVisible()

  await dialog.getByRole('button', { name: 'Show route on map' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Calculating route…')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Route to Mercury Drug/ }),
  ).toBeVisible()
  await expect(page.getByText(/1\.2 km/).first()).toBeVisible()
  await expect(page.getByText(/8 min/).first()).toBeVisible()
  await expect(
    page.getByText(/Route preview, not turn-by-turn navigation/),
  ).toBeVisible()
  await expect(page.locator('#results-map')).toHaveAttribute(
    'data-route-active',
    'true',
  )
  await expect(page.locator('[data-route-layer="true"]')).toBeVisible()
  expect(directionsRequested).toBe(true)

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
    '/api/pharmacies/mercury-naga-penafrancia?items=POC-016:5:tablet&origin_latitude=13.6215&origin_longitude=123.1945',
  )
  expect(detail.status()).toBe(200)
  const detailBody: unknown = await detail.json()
  expect(detailBody).toMatchObject({
    pharmacy: {
      pharmacy_id: 'mercury-naga-penafrancia',
      open_24h: true,
    },
    basket: {
      complete: true,
      items: [{ medicine_id: 'POC-016', quantity: 5, unit: 'tablet' }],
    },
  })
  expect(JSON.stringify(detailBody)).not.toContain('directions_url')

  const unknownPharmacy = await request.get('/api/pharmacies/not-a-pharmacy')
  expect(unknownPharmacy.status()).toBe(404)
  expect(await unknownPharmacy.json()).toMatchObject({
    error: { code: 'UNKNOWN_PHARMACY' },
  })

  const unknownMedicine = await request.get(
    '/api/pharmacies/mercury-naga-penafrancia?items=NOT-A-MEDICINE:1:tablet',
  )
  expect(unknownMedicine.status()).toBe(422)
  expect(await unknownMedicine.json()).toMatchObject({
    error: { code: 'UNKNOWN_MEDICINE' },
  })

  const badUnit = await request.get(
    '/api/pharmacies/mercury-naga-penafrancia?items=POC-016:1:capsule',
  )
  expect(badUnit.status()).toBe(422)
  expect(await badUnit.json()).toMatchObject({
    error: { code: 'INVALID_UNIT' },
  })

  const badQuantity = await request.get(
    '/api/pharmacies/mercury-naga-penafrancia?items=POC-016:1.5:tablet',
  )
  expect(badQuantity.status()).toBe(422)
  expect(await badQuantity.json()).toMatchObject({
    error: { code: 'INVALID_QUANTITY' },
  })

  const badOrigin = await request.get(
    '/api/pharmacies/mercury-naga-penafrancia?origin_latitude=13.6',
  )
  expect(badOrigin.status()).toBe(400)
  expect(await badOrigin.json()).toMatchObject({
    error: { code: 'INVALID_ORIGIN' },
  })

  const missingDirectionOrigin = await request.get(
    '/api/directions?pharmacy_id=mercury-naga-penafrancia',
  )
  expect(missingDirectionOrigin.status()).toBe(400)
  expect(await missingDirectionOrigin.json()).toMatchObject({
    error: { code: 'INVALID_ORIGIN' },
  })

  const unknownDirectionPharmacy = await request.get(
    '/api/directions?pharmacy_id=not-a-pharmacy&origin_latitude=13.6215&origin_longitude=123.1945',
  )
  expect(unknownDirectionPharmacy.status()).toBe(404)
  expect(await unknownDirectionPharmacy.json()).toMatchObject({
    error: { code: 'UNKNOWN_PHARMACY' },
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
