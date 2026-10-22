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

async function setQuantity(
  page: Page,
  medicineName: string,
  quantity: string,
): Promise<void> {
  const input = page.getByRole('textbox', {
    name: new RegExp(`Quantity of ${medicineName} in`),
  })
  await input.fill(quantity)
  await input.press('Enter')
  await expect(input).toHaveValue(quantity)
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
  await expect(
    page.getByRole('heading', { name: 'Above MDRP ceiling' }),
  ).toBeVisible()
  await expect(page.getByText('Cheapest complete')).toHaveCount(0)
  await expect(page.getByText(/38\.00/).first()).toBeVisible()
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
  const janumetPin = page.locator(
    '[data-pharmacy-pin="mercury-naga-penafrancia|POC-016"]',
  )
  await expect(janumetPin).toHaveCount(1)
  await expect(janumetPin).toContainText(/38/)
  await expect(janumetPin).toHaveAttribute('aria-label', /above MDRP ceiling/)
  await expect(
    page.locator('[data-pharmacy-pin="no-price:generika-san-felipe"]'),
  ).toHaveCount(1)

  await page.getByText('Form prices at this pharmacy').first().click()
  await expect(
    page.getByText(/MDRP ceiling \(EO 104 s\. 2020, row 44\)/).first(),
  ).toBeVisible()
  await expect(page.getByText('Box rate').first()).toBeVisible()
  await expect(page.getByText('Strip rate').first()).toBeVisible()
  await expect(page.getByText('Sold loose').first()).toBeVisible()
})

test('keeps per-form stock mismatches visible on the results screen', async ({
  page,
}) => {
  await searchAndCompare(page, 'amlodipine')
  await setQuantity(page, 'Norvasc', '5')

  const mercuryCard = page.locator(
    '[id="result-mercury-naga-penafrancia|POC-001"]',
  )
  await expect(mercuryCard).toBeVisible()
  await expect(mercuryCard.getByText(/5 . Loose tablet/)).toBeVisible()

  await mercuryCard.getByText('Form prices at this pharmacy').click()
  await expect(mercuryCard.getByText('Out of stock').first()).toBeVisible()
  await expect(mercuryCard.getByText('In stock').first()).toBeVisible()
})

test('shows the pack-only covering purchase and its copy', async ({ page }) => {
  await searchAndCompare(page, 'losartan')
  await setQuantity(page, 'Cozaar', '10')

  await expect(
    page.getByRole('heading', { name: 'Sold per pack only' }),
  ).toBeVisible()

  const mercuryCard = page.locator(
    '[id="result-mercury-naga-penafrancia|POC-003"]',
  )
  await expect(mercuryCard).toBeVisible()
  await expect(
    mercuryCard.getByText('Sold per pack only').first(),
  ).toBeVisible()
  await expect(
    mercuryCard.getByText(/Buy 1 . Box of 30 tablets for/),
  ).toBeVisible()
  await expect(page.getByText(/^Unavailable$/i)).toHaveCount(0)
})

test('ranks a multi-item basket and keeps incomplete and no-price pharmacies separate', async ({
  page,
}) => {
  await searchAndCompare(page, 'amlodipine')
  await addAnotherMedicine(page, 'paracetamol')

  await expect(page.getByText('Norvasc').first()).toBeVisible()
  await expect(page.getByText('Biogesic').first()).toBeVisible()
  await expect(page.getByText(/8 pharmacies/).first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Closest to complete' }),
  ).toBeVisible()
  await expect(page.getByText(/item[s]? missing/).first()).toBeVisible()
  await expect(page.getByText('Not stocked').first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'No price data' }),
  ).toBeVisible()
  await expect(page.getByText(/1\.62/).first()).toBeVisible()
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

test('offers full-pack quantity presets and a 30-day guardrail on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await searchAndCompare(page, 'asmalin')

  await page
    .getByRole('button', { name: 'Set Asmalin quantity to Bottle of 60 mL' })
    .click()
  await expect(
    page.getByRole('textbox', { name: 'Quantity of Asmalin in mL' }),
  ).toHaveValue('60')

  await setQuantity(page, 'Asmalin', '500')
  await expect(
    page.getByText(/More than 450 mL is above a typical 30-day supply/),
  ).toBeVisible()
})

test('shows the exact form mix for a quantity basket on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await searchAndCompare(page, 'janumet')
  await setQuantity(page, 'Janumet', '12')

  await expect(page.getByText('1 × Strip of 7 tablets').first()).toBeVisible()
  await expect(page.getByText('5 × Loose tablet').first()).toBeVisible()
  await expect(
    page.getByText('Exact total for 1 medicine').first(),
  ).toBeVisible()
})

test('renders pack-only and not-applicable forms as sold by the pack', async ({
  page,
}) => {
  await searchAndCompare(page, 'ventolin inhaler')
  await setQuantity(page, 'Ventolin Inhaler', '30')

  await expect(
    page.getByRole('heading', { name: 'Sold per pack only' }),
  ).toBeVisible()
  await expect(page.getByText('Sold by the pack').first()).toBeVisible()
  await expect(page.getByText(/^Unavailable$/i)).toHaveCount(0)

  await page.getByText('Form prices at this pharmacy').first().click()
  await expect(
    page.getByText(/for 1 inhaler \(200 actuations\)/).first(),
  ).toBeVisible()
  await expect(page.getByText(/Strip · Sold by the pack/).first()).toBeVisible()
  await expect(page.getByText(/Loose · Sold by the pack/).first()).toBeVisible()
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
