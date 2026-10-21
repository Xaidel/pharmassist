import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function searchAndCompare(page: Page, query: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Medicine name' }).fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: /medicines? match/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Compare prices' }).first().click()
  await expect(
    page.getByRole('heading', { name: 'Compare basket prices' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Complete baskets' }),
  ).toBeVisible()
}

async function addAnotherMedicine(page: Page, query: string): Promise<void> {
  await page.getByRole('link', { name: 'Search medicines' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: /medicines? match/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Compare prices' }).first().click()
  await expect(
    page.getByRole('heading', { name: 'Compare basket prices' }),
  ).toBeVisible()
}

test('shows the single-medicine map results with MDRP, stale, and no-price states', async ({
  page,
}) => {
  const workerErrors: string[] = []
  const workerFailures: string[] = []
  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return
    }
    const text = message.text()
    if (
      text.includes('Worker failed to load') ||
      text.includes('maplibre-gl-worker')
    ) {
      workerErrors.push(text)
    }
  })
  page.on('requestfailed', (request) => {
    if (request.url().includes('maplibre-gl-worker')) {
      workerFailures.push(request.url())
    }
  })

  await searchAndCompare(page, 'janumet')

  await expect(page.getByText('Janumet').first()).toBeVisible()
  await expect(page.getByText('Cheapest complete').first()).toBeVisible()
  await expect(page.getByText(/900\.00/).first()).toBeVisible()
  await expect(page.getByText('Above MDRP ceiling').first()).toBeVisible()
  await expect(page.getByText('Price older than 14 days').first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'No price data' }),
  ).toBeVisible()
  await expect(page.getByText(/CMS Naga San Felipe/).first()).toBeVisible()
  await expect(
    page.getByText('Distances use the Naga City center.'),
  ).toBeVisible()

  await expect(page.locator('[data-pharmacy-pin]')).toHaveCount(10)
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()
  expect(workerErrors).toEqual([])
  expect(workerFailures).toEqual([])
  const cheapestPin = page.locator(
    '[data-pharmacy-pin="generika-lcc-cbd2|POC-016"]',
  )
  await expect(cheapestPin).toHaveCount(1)
  await expect(cheapestPin).toContainText(/900/)
  await expect(
    page.locator('[data-pharmacy-pin="no-price:generika-san-felipe"]'),
  ).toHaveCount(1)

  await page
    .getByText(/Price breakdown \(1\)/)
    .first()
    .click()
  await expect(
    page.getByText(/MDRP ceiling \(EO 104 s\. 2020, row 44\)/).first(),
  ).toBeVisible()
})

test('ranks a multi-item basket and keeps incomplete and no-price pharmacies separate', async ({
  page,
}) => {
  await searchAndCompare(page, 'amlodipine')
  await addAnotherMedicine(page, 'paracetamol')

  await expect(page.getByText('Norvasc').first()).toBeVisible()
  await expect(page.getByText('Biogesic').first()).toBeVisible()
  await expect(page.getByText(/6 pharmacies/).first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Closest to complete' }),
  ).toBeVisible()
  await expect(page.getByText(/item[s]? missing/).first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'No price data' }),
  ).toBeVisible()
  await expect(page.getByText(/204\.00/).first()).toBeVisible()
  await expect(page.getByText('Cheapest complete').first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('Norvasc').first()).toBeVisible()
  await expect(page.getByText('Biogesic').first()).toBeVisible()

  await page.getByRole('button', { name: 'Nearest first' }).click()
  await expect(
    page.getByRole('button', { name: 'Nearest first' }),
  ).toHaveAttribute('aria-pressed', 'true')

  const completeSection = page.locator(
    'section[aria-labelledby="complete-results-heading"]',
  )
  await expect(
    completeSection
      .getByRole('heading', { name: 'New Nazareno Drugstore' })
      .first(),
  ).toBeVisible()
  await expect(page.getByText('Cheapest complete').first()).toBeVisible()

  await expect(page.locator('[data-pharmacy-pin]')).toHaveCount(10)
})

test('rejects malformed baskets with the contract error codes', async ({
  request,
}) => {
  const invalid = await request.post('/api/results', {
    data: { items: [{ medicine_id: 'POC-001', quantity: 0, unit: 'tablet' }] },
  })
  expect(invalid.status()).toBe(422)
  const invalidBody: unknown = await invalid.json()
  expect(invalidBody).toMatchObject({ error: { code: 'INVALID_QUANTITY' } })

  const unit = await request.post('/api/results', {
    data: { items: [{ medicine_id: 'POC-001', quantity: 1, unit: 'capsule' }] },
  })
  expect(unit.status()).toBe(422)
  const unitBody: unknown = await unit.json()
  expect(unitBody).toMatchObject({ error: { code: 'INVALID_UNIT' } })

  const unknown = await request.post('/api/results', {
    data: {
      items: [{ medicine_id: 'NOT-A-MEDICINE', quantity: 1, unit: 'tablet' }],
    },
  })
  expect(unknown.status()).toBe(422)
  const unknownBody: unknown = await unknown.json()
  expect(unknownBody).toMatchObject({ error: { code: 'UNKNOWN_MEDICINE' } })

  const duplicate = await request.post('/api/results', {
    data: {
      items: [
        { medicine_id: 'POC-001', quantity: 1, unit: 'tablet' },
        { medicine_id: 'POC-001', quantity: 1, unit: 'tablet' },
      ],
    },
  })
  expect(duplicate.status()).toBe(422)
  const duplicateBody: unknown = await duplicate.json()
  expect(duplicateBody).toMatchObject({
    error: { code: 'DUPLICATE_MEDICINE' },
  })

  const tooLarge = await request.post('/api/results', {
    data: {
      items: Array.from({ length: 11 }, (_, index) => ({
        medicine_id: `POC-${String(index + 1).padStart(3, '0')}`,
        quantity: 1,
        unit: 'tablet',
      })),
    },
  })
  expect(tooLarge.status()).toBe(422)
  const tooLargeBody: unknown = await tooLarge.json()
  expect(tooLargeBody).toMatchObject({ error: { code: 'BASKET_TOO_LARGE' } })

  const basket = await request.post('/api/basket', {
    data: { items: [{ medicine_id: 'POC-001', quantity: 2, unit: 'tablet' }] },
  })
  expect(basket.status()).toBe(200)
  const basketBody: unknown = await basket.json()
  expect(basketBody).toMatchObject({
    basket: { item_count: 1, currency: 'PHP' },
  })
})

test('keeps the results usable at a phone viewport while prices load slowly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/results', async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 600)
    })
    await route.continue()
  })

  await page.goto('/')
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('amlodipine')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: /medicines? match/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Compare prices' }).first().click()

  await expect(page.getByRole('status')).toContainText('Checking prices')
  await expect(
    page.getByRole('heading', { name: 'Complete baskets' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Closest to complete' }),
  ).toBeVisible()
  await expect(page.locator('[data-pharmacy-pin]')).toHaveCount(10)
})
