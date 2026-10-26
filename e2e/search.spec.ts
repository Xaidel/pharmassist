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
