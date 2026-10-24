import { expect, test } from '@playwright/test'
import { Client } from 'pg'

const FIXTURE_MEDICINE_ID = 'FIX-MDRP-001'
const FIXTURE_CEILING_ID = 'FIX-EO104-900'
const COMPLIANT_PHARMACY_ID = 'watsons-sm-city-naga'
// Sells POC-001 loose for less than the compliant pharmacy, so its basket is
// cheaper overall even with the above-ceiling fixture price.
const ABOVE_PHARMACY_ID = 'south-star-naga-3'

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL is required for browser acceptance tests')
  }
  return url
}

type FixturePrice = {
  pharmacyId: string
  loosePrice: number
}

const FIXTURE_PRICES: readonly FixturePrice[] = [
  { pharmacyId: COMPLIANT_PHARMACY_ID, loosePrice: 11.15 },
  { pharmacyId: ABOVE_PHARMACY_ID, loosePrice: 11.21 },
]

async function insertFixture(client: Client): Promise<void> {
  await client.query(
    `insert into medicine (
       id, category, brand_name, generic_name, strength, dosage_form, base_unit,
       manufacturer, rx_otc, fda_registration_no, active, vat_exempt, data_source
     ) values ($1, 'Fixture', 'Fixture Brand', 'Fixturemolecule', '500 mg',
               'Tablet', 'tablet', 'Fixture Labs', 'Rx', 'DR-FIXTURE-001',
               true, false, 'browser-acceptance')`,
    [FIXTURE_MEDICINE_ID],
  )
  await client.query(
    `insert into mdrp_ceiling (
       id, order_id, order_signed, annex_row, category, molecule, molecules,
       strength, dosage_form, pack_size, strength_and_form_raw, mwp_php,
       mrp_php, price_basis, price_unit, vat_exclusive_mrp,
       voluntary_price_reduction, source_url, source_pdf_page, checked_at,
       notes
     ) values ($1, 'Fixture order', '2026-10-22', 900, 'Fixture',
               'Fixturemolecule', array['Fixturemolecule'], '500 mg', 'Tablet',
               null, null, null, 10.00, 'per_unit', 'tablet', true, false,
               'https://example.test', null, '2026-10-22',
               'Browser acceptance fixture')`,
    [FIXTURE_CEILING_ID],
  )

  for (const price of FIXTURE_PRICES) {
    await client.query(
      `insert into price_observation (
         medicine_id, pharmacy_id, sale_form, sale_state, form_label,
         shelf_price_php, pack_quantity, pack_unit, stock_status, verified_at,
         verified_by, source, mdrp_entry_id
       ) values
         ($1, $2, 'pack', 'available', 'Box of 10 tablets', 8.00, 10,
          'tablet', 'in_stock', now(), 'acceptance-test',
          'browser-acceptance', $3),
         ($1, $2, 'strip', 'available', 'Strip of 5 tablets', 5.00, 5,
          'tablet', 'in_stock', now(), 'acceptance-test',
          'browser-acceptance', $3),
         ($1, $2, 'loose', 'available', 'Loose tablet', $4, 1,
          'tablet', 'in_stock', now(), 'acceptance-test',
          'browser-acceptance', $3)`,
      [
        FIXTURE_MEDICINE_ID,
        price.pharmacyId,
        FIXTURE_CEILING_ID,
        price.loosePrice,
      ],
    )
  }
}

async function deleteFixture(client: Client): Promise<void> {
  await client.query(`delete from price_observation where medicine_id = $1`, [
    FIXTURE_MEDICINE_ID,
  ])
  await client.query(`delete from medicine where id = $1`, [
    FIXTURE_MEDICINE_ID,
  ])
  await client.query(`delete from mdrp_ceiling where id = $1`, [
    FIXTURE_CEILING_ID,
  ])
}

test('ranks a compliant basket before a cheaper VATable above-ceiling basket', async ({
  page,
}) => {
  const client = new Client({ connectionString: requireDatabaseUrl() })
  await client.connect()

  try {
    await insertFixture(client)

    await page.addInitScript(() => {
      sessionStorage.setItem(
        'pharmassist.basket',
        JSON.stringify([
          { medicine_id: 'FIX-MDRP-001', quantity: 1, unit: 'tablet' },
          { medicine_id: 'POC-001', quantity: 1, unit: 'tablet' },
        ]),
      )
    })
    await page.goto('/results')

    await expect(
      page.getByRole('heading', { name: 'Complete lists' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Above MDRP ceiling' }),
    ).toBeVisible()

    const compliantCard = page.locator(
      `[id="result-${COMPLIANT_PHARMACY_ID}|FIX-MDRP-001,POC-001"]`,
    )
    await expect(compliantCard).toBeVisible()
    await expect(compliantCard.getByText('Cheapest complete')).toBeVisible()
    await expect(compliantCard).not.toContainText('Above MDRP ceiling')

    const aboveCard = page.locator(
      `[id="result-${ABOVE_PHARMACY_ID}|FIX-MDRP-001,POC-001"]`,
    )
    await expect(aboveCard).toBeVisible()
    await expect(aboveCard.getByText('Above MDRP ceiling')).toBeVisible()
    await expect(aboveCard.getByText('Cheapest complete')).toHaveCount(0)

    const compliantPrice = await compliantCard
      .locator('p')
      .filter({ hasText: /^₱/ })
      .first()
      .textContent()
    const abovePrice = await aboveCard
      .locator('p')
      .filter({ hasText: /^₱/ })
      .first()
      .textContent()
    expect(compliantPrice).not.toBeNull()
    expect(abovePrice).not.toBeNull()
    const compliantTotal = Number((compliantPrice ?? '').replace(/[^\d.]/g, ''))
    const aboveTotal = Number((abovePrice ?? '').replace(/[^\d.]/g, ''))
    expect(aboveTotal).toBeLessThan(compliantTotal)
  } finally {
    await deleteFixture(client).catch(() => undefined)
    await client.end()
  }
})
