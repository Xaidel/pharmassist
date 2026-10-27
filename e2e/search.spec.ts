import { expect, test } from '@playwright/test'
import { Client } from 'pg'

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL is required for browser acceptance tests')
  }
  return url
}

test('finds a medicine from a typo and records an anonymous search event', async ({
  page,
}) => {
  const databaseUrl = requireDatabaseUrl()
  const startedAt = new Date()

  await page.goto('/')
  const input = page.getByRole('combobox', { name: 'Medicine name' })

  await input.fill('amlodipne')
  await expect(
    page.getByRole('option', { name: /Norvasc/ }).first(),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: /medicines match/ }),
  ).toBeVisible()
  await expect(page.getByText('Norvasc').first()).toBeVisible()
  await expect(page.getByText('Close spelling match').first()).toBeVisible()

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await expect
      .poll(async () => {
        const result = await client.query<{ count: number }>(
          `select count(*)::int as count
             from app_event
            where name = 'search_submitted'
              and occurred_at >= $1`,
          [startedAt],
        )
        return result.rows[0]?.count ?? 0
      })
      .toBeGreaterThan(0)
  } finally {
    await client.end()
  }
})

test('opens the home map in a fixed 3D camera', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const map = page.locator('[data-home-map]')
  await expect(map).toHaveAttribute('data-home-map', 'ready', {
    timeout: 30_000,
  })
  await expect(map).toHaveAttribute('data-pitch', '45')
  await expect(map).toHaveAttribute('data-bearing', '0')
  await expect(map).toHaveAttribute('data-buildings', 'visible')

  const zoom = Number(await map.getAttribute('data-zoom'))
  const box = await map.boundingBox()
  if (box === null) {
    throw new Error('The home map is not visible')
  }

  await page.mouse.move(box.x + box.width / 2, box.y + 300)
  await page.mouse.wheel(0, -600)
  await expect
    .poll(async () => Number(await map.getAttribute('data-zoom')))
    .toBeGreaterThan(zoom)
  await expect(map).toHaveAttribute('data-pitch', '45')
  await expect(map).toHaveAttribute('data-bearing', '0')

  await page.mouse.move(box.x + box.width / 2, box.y + 300)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + 400, {
    steps: 10,
  })
  await page.mouse.up({ button: 'right' })
  await expect(map).toHaveAttribute('data-pitch', '45')
  await expect(map).toHaveAttribute('data-bearing', '0')
})

test('clearing the search box drops the results at once', async ({ page }) => {
  await page.goto('/')
  const input = page.getByRole('combobox', { name: 'Medicine name' })

  await input.fill('paracetamol')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const heading = page.getByRole('heading', { name: /medicines? match/ })
  await expect(heading).toBeVisible()
  await expect(page).toHaveURL(/[?&]q=paracetamol/)

  // fill('') fires the same input event as the box's clear (x) button.
  await input.fill('')
  await expect(heading).toBeHidden()
  await expect(page).not.toHaveURL(/[?&]q=/)
})

test('shows a pending state and a zero-result state', async ({ page }) => {
  await page.route(/\/api\/search\?/, async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 600)
    })
    await route.continue()
  })

  await page.goto('/')
  const input = page.getByRole('combobox', { name: 'Medicine name' })

  await input.fill('zzzzzz')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Searching the seeded catalog…',
  )
  await expect(
    page.getByRole('heading', { name: 'No medicines found' }),
  ).toBeVisible()
})
