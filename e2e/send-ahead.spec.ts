import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Client } from 'pg'

const JANUMET_RESULT_KEY = 'mercury-naga-penafrancia|POC-016'
const WATSONS_RESULT_KEY = 'watsons-sm-city-naga|POC-016'
const NO_PRICE_KEY = 'no-price:generika-san-felipe'
const REFERENCE_CODE_PATTERN = /^SA-[A-HJ-KM-NP-Z2-9]{6}$/

const createdCodes = new Set<string>()

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
  await page.getByRole('button', { name: '+ Add to your list' }).first().click()
  await page.getByRole('button', { name: 'See prices' }).first().click()
  await expect(
    page.getByRole('heading', { name: 'Complete lists' }),
  ).toBeVisible()
}

async function openPharmacyDetail(
  page: Page,
  resultKey: string,
): Promise<ReturnType<Page['getByRole']>> {
  const card = page.locator(`[id="result-${resultKey}"]`)
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'View details' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

async function readCreatedRow(referenceCode: string): Promise<{
  pharmacy_id: string
  medicine_ids: string[]
  medicine_labels: string[]
  quantities: string[]
  status: string
  expires_at: Date
  created_at: Date
}> {
  const client = new Client({ connectionString: requireDatabaseUrl() })
  await client.connect()
  try {
    const result = await client.query<{
      pharmacy_id: string
      medicine_ids: string[]
      medicine_labels: string[]
      quantities: string[]
      status: string
      expires_at: Date
      created_at: Date
    }>(
      `select pharmacy_id, medicine_ids, medicine_labels, quantities, status,
              expires_at, created_at
         from send_ahead
        where reference_code = $1`,
      [referenceCode],
    )
    const row = result.rows[0]
    if (row === undefined) {
      throw new Error(`No send-ahead row for ${referenceCode}`)
    }
    return row
  } finally {
    await client.end()
  }
}

test.afterEach(async () => {
  if (createdCodes.size === 0) {
    return
  }
  const client = new Client({ connectionString: requireDatabaseUrl() })
  await client.connect()
  try {
    await client.query(
      'delete from send_ahead where reference_code = any($1::text[])',
      [[...createdCodes]],
    )
  } finally {
    await client.end()
  }
  createdCodes.clear()
})

test('creates a send-ahead slip and opens a pre-filled SMS message', async ({
  page,
}) => {
  const startedAt = new Date()
  await openJanumetResults(page)
  const dialog = await openPharmacyDetail(page, JANUMET_RESULT_KEY)

  await dialog.getByRole('button', { name: 'Send ahead' }).click()
  await expect(
    dialog.getByRole('heading', { name: 'Send-ahead reservation' }),
  ).toBeVisible()

  const codeElement = dialog.locator('p[aria-label^="Reference code"]')
  const code = (await codeElement.textContent())?.trim() ?? ''
  expect(code).toMatch(REFERENCE_CODE_PATTERN)
  createdCodes.add(code)

  await expect(
    dialog.getByText('Janumet 500 mg + 50 mg Film-coated tablet'),
  ).toBeVisible()
  await expect(dialog.getByText(/1 tablet/).first()).toBeVisible()
  await expect(dialog.getByText(/38\.00/).first()).toBeVisible()
  await expect(dialog.getByText(/Reserve until/)).toBeVisible()
  await expect(dialog.getByText(/not a guaranteed hold/).first()).toBeVisible()

  const smsLink = dialog.locator('a[href^="sms:+639688787678"]')
  await expect(smsLink).toBeVisible()
  const href = await smsLink.getAttribute('href')
  const decoded = decodeURIComponent(href ?? '')
  expect(decoded).toContain(`Send-ahead request ${code}`)
  expect(decoded).toContain('Mercury Drug')
  expect(decoded).toContain('Janumet 500 mg + 50 mg Film-coated tablet')
  expect(decoded).toContain('Reserve until')

  const row = await readCreatedRow(code)
  expect(row.pharmacy_id).toBe('mercury-naga-penafrancia')
  expect(row.medicine_ids).toEqual(['POC-016'])
  expect(row.medicine_labels).toEqual([
    'Janumet 500 mg + 50 mg Film-coated tablet',
  ])
  expect(row.quantities.map(Number)).toEqual([1])
  expect(row.status).toBe('created')
  expect(row.expires_at.getTime() - row.created_at.getTime()).toBe(
    24 * 60 * 60 * 1000,
  )

  const client = new Client({ connectionString: requireDatabaseUrl() })
  await client.connect()
  try {
    await expect
      .poll(async () => {
        const result = await client.query<{ count: number }>(
          `select count(*)::int as count
             from app_event
            where name = 'send_ahead_created'
              and occurred_at >= $1
              and properties = '{"pharmacy_id": "mercury-naga-penafrancia"}'::jsonb`,
          [startedAt],
        )
        return result.rows[0]?.count ?? 0
      })
      .toBeGreaterThan(0)
  } finally {
    await client.end()
  }
})

test('shows a warning instead of SMS when the pharmacy has no mobile number', async ({
  page,
}) => {
  await openJanumetResults(page)
  const dialog = await openPharmacyDetail(page, WATSONS_RESULT_KEY)

  await dialog.getByRole('button', { name: 'Send ahead' }).click()
  await expect(
    dialog.getByRole('heading', { name: 'Send-ahead reservation' }),
  ).toBeVisible()

  const code = (
    await dialog.locator('p[aria-label^="Reference code"]').textContent()
  )?.trim()
  expect(code).toMatch(REFERENCE_CODE_PATTERN)
  if (code !== undefined) {
    createdCodes.add(code)
  }

  await expect(dialog.getByText(/no SMS-able mobile number/)).toBeVisible()
  await expect(dialog.locator('a[href^="sms:"]')).toHaveCount(0)

  if (code !== undefined) {
    const row = await readCreatedRow(code)
    expect(row.pharmacy_id).toBe('watsons-sm-city-naga')
  }
})

test('hides Send ahead on a no-price pharmacy and rejects malformed requests', async ({
  page,
  request,
}) => {
  await openJanumetResults(page)
  const noPriceCard = page.locator(`[id="result-${NO_PRICE_KEY}"]`)
  await expect(noPriceCard).toBeVisible()
  await noPriceCard.getByRole('button', { name: 'View details' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Send ahead' })).toHaveCount(
    0,
  )

  const valid = await request.post('/api/send-ahead', {
    data: {
      pharmacy_id: 'mercury-naga-penafrancia',
      items: [{ medicine_id: 'POC-001', quantity: 5, unit: 'tablet' }],
    },
  })
  expect(valid.status()).toBe(201)
  const validBody = (await valid.json()) as { reference_code: string }
  createdCodes.add(validBody.reference_code)
  expect(validBody.reference_code).toMatch(REFERENCE_CODE_PATTERN)

  const readBack = await request.get('/api/send-ahead')
  expect(readBack.status()).toBe(405)

  const unknownPharmacy = await request.post('/api/send-ahead', {
    data: {
      pharmacy_id: 'not-a-pharmacy',
      items: [{ medicine_id: 'POC-001', quantity: 1, unit: 'tablet' }],
    },
  })
  expect(unknownPharmacy.status()).toBe(404)
  expect(await unknownPharmacy.json()).toMatchObject({
    error: { code: 'UNKNOWN_PHARMACY' },
  })

  const unknownMedicine = await request.post('/api/send-ahead', {
    data: {
      pharmacy_id: 'mercury-naga-penafrancia',
      items: [{ medicine_id: 'NOT-A-MEDICINE', quantity: 1, unit: 'tablet' }],
    },
  })
  expect(unknownMedicine.status()).toBe(422)
  expect(await unknownMedicine.json()).toMatchObject({
    error: { code: 'UNKNOWN_MEDICINE' },
  })

  const badUnit = await request.post('/api/send-ahead', {
    data: {
      pharmacy_id: 'mercury-naga-penafrancia',
      items: [{ medicine_id: 'POC-001', quantity: 1, unit: 'capsule' }],
    },
  })
  expect(badUnit.status()).toBe(422)
  expect(await badUnit.json()).toMatchObject({
    error: { code: 'INVALID_UNIT' },
  })

  const badQuantity = await request.post('/api/send-ahead', {
    data: {
      pharmacy_id: 'mercury-naga-penafrancia',
      items: [{ medicine_id: 'POC-001', quantity: 1.5, unit: 'tablet' }],
    },
  })
  expect(badQuantity.status()).toBe(422)
  expect(await badQuantity.json()).toMatchObject({
    error: { code: 'INVALID_QUANTITY' },
  })

  const tooLarge = await request.post('/api/send-ahead', {
    data: {
      pharmacy_id: 'mercury-naga-penafrancia',
      items: Array.from({ length: 11 }, (_, index) => ({
        medicine_id: `POC-${String(index + 1).padStart(3, '0')}`,
        quantity: 1,
        unit: 'tablet',
      })),
    },
  })
  expect(tooLarge.status()).toBe(422)
  expect(await tooLarge.json()).toMatchObject({
    error: { code: 'BASKET_TOO_LARGE' },
  })

  const patientField = await request.post('/api/send-ahead', {
    data: {
      pharmacy_id: 'mercury-naga-penafrancia',
      items: [{ medicine_id: 'POC-001', quantity: 1, unit: 'tablet' }],
      patient_name: 'Ada',
    },
  })
  expect(patientField.status()).toBe(400)
  expect(await patientField.json()).toMatchObject({
    error: { code: 'INVALID_REQUEST' },
  })
})
