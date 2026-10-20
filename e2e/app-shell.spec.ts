import { expect, test } from '@playwright/test'

test('serves the placeholder shell and registers the app-shell worker', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'The scaffold is up.' }),
  ).toBeVisible()
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  )

  const manifestResponse = await page.request.get('/manifest.webmanifest')
  expect(manifestResponse.ok()).toBe(true)

  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration()
        return registration?.active?.scriptURL ?? ''
      }),
    )
    .toContain('/sw.js')
})
