import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function searchAndCompare(page: Page, query: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Medicine name' }).fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: /medicines? match/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: '+ Add to basket' }).first().click()
  await page.getByRole('button', { name: 'See prices' }).first().click()
  await expect(
    page.getByRole('heading', { name: 'Compare basket prices' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Complete baskets' }),
  ).toBeVisible()
}

async function addAnotherMedicine(page: Page, query: string): Promise<void> {
  // Back restores the previous search, so wait for this query's results.
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: new RegExp(`match “${query}”`) }),
  ).toBeVisible()
  await page.getByRole('button', { name: '+ Add to basket' }).first().click()
  await page.getByRole('button', { name: 'See prices' }).first().click()
  await expect(
    page.getByRole('heading', { name: 'Compare basket prices' }),
  ).toBeVisible()
}

// Quantity controls live in the basket drawer, opened from the top bar.
async function openBasket(page: Page): Promise<void> {
  const chip = page.getByRole('button', { name: /^Basket, / })
  if ((await chip.getAttribute('aria-expanded')) !== 'true') {
    await chip.click()
  }
}

async function setQuantity(
  page: Page,
  medicineName: string,
  quantity: string,
): Promise<void> {
  await openBasket(page)
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
  await expect(page.locator('[data-origin-marker]')).toHaveCount(0)

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

test('marks the device origin without joining the pharmacy pins', async ({
  page,
}) => {
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({
    latitude: 13.623234,
    longitude: 123.185995,
  })

  await searchAndCompare(page, 'janumet')

  await expect(
    page.getByText('Distances use your current location.'),
  ).toBeVisible()

  const marker = page.locator('[data-origin-marker]')
  await expect(marker).toHaveCount(1)
  await expect(marker).toHaveAttribute('role', 'img')
  await expect(marker).toHaveAttribute('aria-label', 'Your current location')
  await expect(marker).toHaveText('You are here')
  await expect(marker.locator('[data-pharmacy-pin]')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Your current location' }),
  ).toHaveCount(0)
  await expect(page.locator('[data-pharmacy-pin]')).toHaveCount(10)

  const pulse = page.locator('[data-origin-pulse]')
  await expect(pulse).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect
    .poll(async () =>
      pulse.evaluate((element) => getComputedStyle(element).animationName),
    )
    .toBe('none')

  // The mocked origin is the Mercury pin's own point, so the marker's bottom
  // should land exactly there.
  const mercuryPin = page.locator(
    '[data-pharmacy-pin="mercury-naga-penafrancia|POC-016"]',
  )
  const [markerBox, pinBox] = await Promise.all([
    marker.boundingBox(),
    mercuryPin.boundingBox(),
  ])
  if (markerBox === null || pinBox === null) {
    throw new Error('The origin marker or the Mercury pin is not visible')
  }
  expect(
    Math.abs(markerBox.x + markerBox.width / 2 - (pinBox.x + pinBox.width / 2)),
  ).toBeLessThanOrEqual(3)
  expect(
    Math.abs(markerBox.y + markerBox.height - (pinBox.y + pinBox.height)),
  ).toBeLessThanOrEqual(3)

  // The marker itself must not receive taps: at its dot, the browser should
  // hit a pharmacy pin, and clicking there must open that pharmacy.
  const hit = await page.evaluate(() => {
    const element = document.querySelector('[data-origin-marker]')
    if (element === null) {
      return null
    }
    const rect = element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.bottom - 4
    const pin =
      document.elementFromPoint(x, y)?.closest('[data-pharmacy-pin]') ?? null
    const key = pin?.getAttribute('data-pharmacy-pin') ?? null
    return pin === null || key === null ? null : { x, y, key }
  })
  if (hit === null) {
    throw new Error('No pharmacy pin sits under the origin marker')
  }
  await page.mouse.click(hit.x, hit.y)
  await expect(page.getByRole('dialog')).toBeVisible()

  // Selecting scales the pin's visual body, never the marker element
  // MapLibre positions. Scaling the marker itself drags its dot off the
  // projected point, and the offset changes again on every zoom.
  const selectedPin = page.locator(`[data-pharmacy-pin="${hit.key}"]`)
  await expect(selectedPin).toHaveClass(/z-30/)
  const [selectedBox, selectedTransform] = await Promise.all([
    selectedPin.boundingBox(),
    selectedPin.evaluate((element) => element.style.transform),
  ])
  if (selectedBox === null) {
    throw new Error('The selected pharmacy pin is not visible')
  }
  const projected = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(
    selectedTransform,
  )
  if (projected === null) {
    throw new Error('The selected pharmacy pin has no projected position')
  }
  expect(
    Math.abs(selectedBox.x + selectedBox.width / 2 - Number(projected[1])),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(selectedBox.y + selectedBox.height - Number(projected[2])),
  ).toBeLessThanOrEqual(1)
})

test('focuses the tracked pharmacy and promotes a tapped price', async ({
  page,
}) => {
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({
    latitude: 13.6215,
    longitude: 123.1945,
  })
  await page.route('**/api/directions**', async (route) => {
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

  await searchAndCompare(page, 'janumet')

  const trackedKey = 'mercury-naga-penafrancia|POC-016'
  const otherKey = 'new-nazareno-drugstore|POC-016'
  const trackedPin = page.locator(`[data-pharmacy-pin="${trackedKey}"]`)
  const otherPin = page.locator(`[data-pharmacy-pin="${otherKey}"]`)

  await page
    .locator(`[id="result-${trackedKey}"]`)
    .getByRole('button', { name: 'Show route' })
    .click()
  await expect(
    page.getByRole('heading', { name: /Route to Mercury Drug/ }),
  ).toBeVisible()
  await expect(page.locator('#results-map')).toHaveAttribute(
    'data-route-active',
    'true',
  )

  const readPinStyle = async (pin: typeof trackedPin) =>
    pin.evaluate((element) => {
      const body = element.querySelector('[data-pin-body]')
      return {
        opacity: body === null ? 1 : Number(getComputedStyle(body).opacity),
        zIndex: Number(getComputedStyle(element).zIndex) || 0,
      }
    })

  await expect(trackedPin.locator('[data-pin-callout]')).toBeVisible()
  await expect(otherPin.locator('[data-pin-callout]')).toBeVisible()
  const trackedStyle = await readPinStyle(trackedPin)
  const mutedStyle = await readPinStyle(otherPin)
  expect(mutedStyle.opacity).toBeLessThan(trackedStyle.opacity)
  expect(mutedStyle.zIndex).toBeLessThan(trackedStyle.zIndex)

  // A muted price is promoted without changing the route or opening the
  // modal. Tapping the promoted pin again opens its details.
  await otherPin.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: /Route to Mercury Drug/ }),
  ).toBeVisible()
  const promotedStyle = await readPinStyle(otherPin)
  expect(promotedStyle.opacity).toBe(trackedStyle.opacity)
  const pinZIndexes = await page
    .locator('[data-pharmacy-pin]')
    .evaluateAll((pins) =>
      pins.map((pin) => Number(getComputedStyle(pin).zIndex) || 0),
    )
  expect(promotedStyle.zIndex).toBe(Math.max(...pinZIndexes))

  await otherPin.click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: 'Clear route' }).click()
  await expect(page.locator('#results-map')).toHaveAttribute(
    'data-route-active',
    'false',
  )
  await expect(page.locator('[data-pin-body="muted"]')).toHaveCount(0)
  await expect(otherPin.locator('[data-pin-callout]')).toBeVisible()
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
  await expect(page.getByText(/1\.59/).first()).toBeVisible()
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
  // Under nearest-first the star follows distance, not price.
  await expect(page.getByText('Nearest complete').first()).toBeVisible()
  await expect(page.getByText('Cheapest complete')).toHaveCount(0)

  await expect(page.locator('[data-pharmacy-pin]')).toHaveCount(10)
})

test('counts bottles in whole packs with a 30-day guardrail on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await searchAndCompare(page, 'asmalin')
  await openBasket(page)

  // A syrup starts at one real bottle and can only change by whole bottles.
  const packs = page.getByRole('textbox', {
    name: 'Number of packs of Asmalin',
  })
  await expect(packs).toHaveValue('1')
  await expect(page.getByText('60 mL in total')).toBeVisible()
  await page.getByRole('button', { name: 'One more pack of Asmalin' }).click()
  await expect(packs).toHaveValue('2')
  await expect(page.getByText('120 mL in total')).toBeVisible()

  await packs.fill('9')
  await packs.press('Enter')
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

test('renders not-applicable inhaler forms as sold by the pack', async ({
  page,
}) => {
  // Inhalers are counted in whole packs, so no odd amount can be asked for.
  await searchAndCompare(page, 'ventolin inhaler')

  await expect(
    page.getByRole('heading', { name: 'Sold per pack only' }),
  ).toBeVisible()
  await expect(page.getByText(/^Unavailable$/i)).toHaveCount(0)

  await page.getByText('Form prices at this pharmacy').first().click()
  await expect(
    page.getByText(/Pack · 1 inhaler \(200 actuations\)/).first(),
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
  await page.getByRole('button', { name: '+ Add to basket' }).first().click()
  await page.getByRole('button', { name: 'See prices' }).first().click()

  await expect(page.getByRole('status')).toContainText('Checking prices')
  await expect(
    page.getByRole('heading', { name: 'Complete baskets' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Closest to complete' }),
  ).toBeVisible()
  await expect(page.locator('[data-pharmacy-pin]')).toHaveCount(10)
})
