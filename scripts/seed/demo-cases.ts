import type { Client } from 'pg'

import { ToolingError } from '../db/database'

type CountRow = { count: number }
type CompleteBasketRow = { pharmacies: number; totals: number }

async function count(
  client: Client,
  sql: string,
  values: readonly unknown[] = [],
): Promise<number> {
  const result = await client.query<CountRow>(sql, [...values])
  return result.rows[0]?.count ?? 0
}

function assertDemo(condition: boolean, message: string): void {
  if (!condition) {
    throw new ToolingError('SEED_VALIDATION', message)
  }
}

/**
 * Confirm the demo states from data-contract section 6.5 are reachable after a seed.
 * The queries mirror the completeness rules in section 4.4.
 */
export async function assertDemoCases(
  client: Client,
  batchId: string,
): Promise<void> {
  const complete = await client.query<CompleteBasketRow>(
    `with available as (
       select pr.pharmacy_id,
              sum(case when pr.medicine_id = 'POC-001' then pr.shelf_price_php end) as first_item,
              sum(case when pr.medicine_id = 'POC-036' then pr.shelf_price_php end) as second_item
         from price_record pr
        where pr.seed_batch_id = $1
          and pr.medicine_id in ('POC-001', 'POC-036')
          and pr.stock_status in ('in_stock', 'low_stock')
        group by pr.pharmacy_id
     )
     select count(*)::int as pharmacies,
            count(distinct (first_item + second_item))::int as totals
       from available
      where first_item is not null and second_item is not null`,
    [batchId],
  )
  const completeBasket = complete.rows[0]
  assertDemo(
    (completeBasket?.pharmacies ?? 0) >= 3 &&
      (completeBasket?.totals ?? 0) >= 2,
    'The demo basket POC-001 + POC-036 must be complete at three or more pharmacies with different totals',
  )

  const incomplete = await count(
    client,
    `select count(*)::int as count
       from pharmacy p
      where p.seed_batch_id = $1
        and exists (
          select 1 from price_record pr
           where pr.seed_batch_id = $1
             and pr.pharmacy_id = p.id
             and pr.medicine_id = 'POC-001'
             and pr.stock_status in ('in_stock', 'low_stock'))
        and not exists (
          select 1 from price_record pr
           where pr.seed_batch_id = $1
             and pr.pharmacy_id = p.id
             and pr.medicine_id = 'POC-036'
             and pr.stock_status in ('in_stock', 'low_stock'))`,
    [batchId],
  )
  assertDemo(
    incomplete >= 1,
    'The demo basket must be incomplete at one or more pharmacies',
  )

  const noPriceData = await count(
    client,
    `select count(*)::int as count
       from pharmacy p
      where p.seed_batch_id = $1
        and not exists (
          select 1 from price_record pr
           where pr.seed_batch_id = $1
             and pr.pharmacy_id = p.id
             and pr.medicine_id in ('POC-001', 'POC-036')
             and pr.stock_status in ('in_stock', 'low_stock'))`,
    [batchId],
  )
  assertDemo(
    noPriceData >= 1,
    'The demo basket must have a pharmacy with no price data',
  )

  const aboveMdrp = await count(
    client,
    `select count(*)::int as count
       from price_record_with_mdrp
      where seed_batch_id = $1
        and medicine_id = 'POC-016'
        and above_mdrp_flag is true`,
    [batchId],
  )
  assertDemo(
    aboveMdrp >= 1,
    'POC-016 must have a price above the published MDRP ceiling',
  )

  const stale = await count(
    client,
    `select count(*)::int as count
       from price_record
      where seed_batch_id = $1
        and verified_at < now() - interval '14 days'`,
    [batchId],
  )
  assertDemo(stale >= 1, 'The seed must include a stale price record')

  const rxOtc = await count(
    client,
    `select count(*)::int as count
       from medicine
      where seed_batch_id = $1
        and ((id = 'POC-001' and rx_otc = 'Rx')
          or (id = 'POC-036' and rx_otc = 'OTC'))`,
    [batchId],
  )
  assertDemo(rxOtc === 2, 'POC-001 must be Rx and POC-036 must be OTC')

  const inactive = await count(
    client,
    `select count(*)::int as count
       from medicine
      where seed_batch_id = $1 and id = 'POC-028' and active = false`,
    [batchId],
  )
  assertDemo(inactive === 1, 'POC-028 must stay inactive')

  const noPack = await count(
    client,
    `select count(*)::int as count
       from medicine
      where seed_batch_id = $1 and id = 'POC-041' and active = true and pack_size is null`,
    [batchId],
  )
  assertDemo(noPack === 1, 'POC-041 must stay active without a reference pack')

  const orphanPrices = await count(
    client,
    `select count(*)::int as count
       from price_record
      where seed_batch_id = $1 and medicine_id = 'POC-041'`,
    [batchId],
  )
  assertDemo(orphanPrices === 0, 'POC-041 must not have a price record')
}
