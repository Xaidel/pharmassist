import { expect, test } from '@playwright/test'

test('RPC and server-only operations share state, preserve provider policy and map results', async ({
  page,
  context,
}) => {
  const errors: string[] = []
  let expectedFailure = false
  page.on('console', (message) => {
    const expectedHttpDiagnostic =
      expectedFailure &&
      /^Failed to load resource: the server responded with a status of (500|404)\b/.test(
        message.text(),
      )
    if (message.type() === 'error' && !expectedHttpDiagnostic)
      errors.push(message.text())
  })
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  await context.setExtraHTTPHeaders({ authorization: 'Bearer alpha' })
  await page.goto('/')
  await expect(page.getByRole('heading')).toHaveText(
    'Server capability fixture',
  )
  await expect(
    page.getByRole('button', { name: 'rpc-write', exact: true }),
  ).toBeEnabled()
  // Context headers must not override the per-call credential under test.
  await context.setExtraHTTPHeaders({})
  const result = page.getByLabel('Result')
  await page.getByRole('button', { name: 'rpc-write', exact: true }).click()
  await expect(result).toHaveText('{"text":"Draft title","revision":1}')
  await page.getByRole('button', { name: 'internal-read', exact: true }).click()
  await expect(result).toHaveText(
    '{"ready":true,"version":1,"title":"Draft title"}',
  )
  await page.getByLabel('Text', { exact: true }).fill('Revised title')
  await page
    .getByRole('button', { name: 'internal-write', exact: true })
    .click()
  await expect(result).toHaveText('{"version":2}')
  await page.getByRole('button', { name: 'rpc-read', exact: true }).click()
  await expect(result).toHaveText(
    '{"accepted":true,"text":"Revised title","revision":2}',
  )
  await page.getByRole('button', { name: 'context', exact: true }).click()
  await expect(result).toHaveText('{"actor":"alice","outerMarker":false}')
  await page.getByRole('button', { name: 'audit', exact: true }).click()
  await expect(result).toHaveText('{"reference":1}')
  await page.getByRole('button', { name: 'rpc-audit', exact: true }).click()
  await expect(result).toHaveText('{"receipt":2}')
  await page.getByRole('button', { name: 'nested', exact: true }).click()
  await expect(result).toHaveText(
    '{"accepted":true,"text":"Revised title","revision":2}',
  )
  await page.getByLabel('Tenant', { exact: true }).fill('beta')
  expectedFailure = true
  await page.getByRole('button', { name: 'internal-read', exact: true }).click()
  await expect(result).toHaveText('WORKFLOW_ACCESS_DENIED')
  await page.getByRole('button', { name: 'nested', exact: true }).click()
  await expect(result).toHaveText('FORBIDDEN')
  await page.getByLabel('Tenant', { exact: true }).fill('invalid')
  await page.getByRole('button', { name: 'nested', exact: true }).click()
  await expect(result).toContainText('Invalid')
  await page.getByLabel('Tenant', { exact: true }).fill('alpha')
  // This actor can invoke the workflow command but lacks the provider's write permission.
  await page.getByLabel('Credential', { exact: true }).fill('reader')
  await page
    .getByRole('button', { name: 'internal-write', exact: true })
    .click()
  await expect(result).toHaveText('WORKFLOW_ACCESS_DENIED')
  await page.getByLabel('Credential', { exact: true }).fill('invalid')
  await page.getByRole('button', { name: 'nested', exact: true }).click()
  await expect(result).toHaveText('UNAUTHENTICATED')
  const beforeRedirect = page.url()
  await page.getByRole('button', { name: 'redirect', exact: true }).click()
  await expect(result).toHaveText('REDIRECT')
  await expect(page).toHaveURL(beforeRedirect)
  await page.getByRole('button', { name: 'missing', exact: true }).click()
  await expect(result).toHaveText('NOT_FOUND')
  expect(errors).toEqual([])
})

test('concurrent actors retain separate context and provider state', async ({
  browser,
}) => {
  const alpha = await browser.newContext({
    extraHTTPHeaders: { authorization: 'Bearer alpha' },
  })
  const beta = await browser.newContext({
    extraHTTPHeaders: { authorization: 'Bearer beta' },
  })
  const errors: string[] = []
  try {
    const pages = await Promise.all([alpha.newPage(), beta.newPage()])
    const [a, b] = pages
    for (const page of pages) {
      page.on('pageerror', (error) => {
        errors.push(error.message)
      })
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
    }
    await Promise.all([a.goto('/'), b.goto('/?tenant=beta')])
    await Promise.all([
      expect(
        a.getByRole('button', { name: 'rpc-write', exact: true }),
      ).toBeEnabled(),
      expect(
        b.getByRole('button', { name: 'rpc-write', exact: true }),
      ).toBeEnabled(),
    ])
    await alpha.setExtraHTTPHeaders({})
    await beta.setExtraHTTPHeaders({})
    await b.getByLabel('Tenant', { exact: true }).fill('beta')
    await b.getByLabel('Credential', { exact: true }).fill('beta')
    await b.getByLabel('Text', { exact: true }).fill('Beta title')
    await a.getByLabel('Text', { exact: true }).fill('Alpha concurrent')
    await Promise.all([
      a.getByRole('button', { name: 'context', exact: true }).click(),
      b.getByRole('button', { name: 'context', exact: true }).click(),
    ])
    await expect(a.getByLabel('Result')).toHaveText(
      '{"actor":"alice","outerMarker":false}',
    )
    await expect(b.getByLabel('Result')).toHaveText(
      '{"actor":"bob","outerMarker":false}',
    )
    await Promise.all([
      a.getByRole('button', { name: 'internal-write', exact: true }).click(),
      b.getByRole('button', { name: 'internal-write', exact: true }).click(),
    ])
    await expect(b.getByLabel('Result')).toContainText('"version":')
    await expect(a.getByLabel('Result')).toContainText('"version":')
    await a.getByRole('button', { name: 'internal-read', exact: true }).click()
    await expect(a.getByLabel('Result')).toHaveText(
      /"title":"Alpha concurrent"/,
    )
    await b.getByRole('button', { name: 'rpc-read', exact: true }).click()
    await expect(b.getByLabel('Result')).toHaveText(
      '{"accepted":true,"text":"Beta title","revision":1}',
    )
    expect(errors).toEqual([])
  } finally {
    await Promise.all([alpha.close(), beta.close()])
  }
})
