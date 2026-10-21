import type { Client } from 'pg'

import { ToolingError } from '../db/database'

type CountRow = { count: number }

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
  const completeBasket = await client.query<{ count: number; totals: number }>(
    `with exact as (
       select pharmacy_id, medicine_id,
              min(case
                when sale_form = 'loose'
                  then shelf_price_php * (case when medicine_id = 'POC-001' then 5 else 10 end)
                when sale_form = 'strip'
                  and pack_quantity = (case when medicine_id = 'POC-001' then 5 else 10 end)
                  then shelf_price_php
              end) as price
         from price_observation
        where seed_batch_id = $1
          and medicine_id in ('POC-001', 'POC-036')
          and sale_state = 'available'
          and stock_status in ('in_stock', 'low_stock')
        group by pharmacy_id, medicine_id
     ),
     totals as (
       select pharmacy_id, sum(price) as total
         from exact
        group by pharmacy_id
       having count(*) = 2
     )
     select count(*)::int as count,
            count(distinct total)::int as totals
       from totals`,
    [batchId],
  )
  assertDemo(
    (completeBasket.rows[0]?.count ?? 0) >= 3 &&
      (completeBasket.rows[0]?.totals ?? 0) >= 2,
    'The demo basket POC-001 + POC-036 must be complete at three or more pharmacies with different totals',
  )

  const exactMix = await count(
    client,
    `select count(*)::int as count
       from price_observation strip
       join price_observation loose
         on loose.seed_batch_id = strip.seed_batch_id
        and loose.medicine_id = strip.medicine_id
        and loose.pharmacy_id = strip.pharmacy_id
      where strip.seed_batch_id = $1
        and strip.medicine_id = 'POC-036'
        and strip.sale_form = 'strip'
        and strip.sale_state = 'available'
        and strip.pack_quantity = 10
        and strip.stock_status in ('in_stock', 'low_stock')
        and loose.sale_form = 'loose'
        and loose.sale_state = 'available'
        and loose.stock_status in ('in_stock', 'low_stock')`,
    [batchId],
  )
  assertDemo(
    exactMix >= 1,
    'POC-036 must sell a strip of 10 and loose tablets at one pharmacy',
  )

  const packOnly = await count(
    client,
    `select count(*)::int as count
       from (
         select pharmacy_id
           from price_observation
          where seed_batch_id = $1 and medicine_id = 'POC-003'
          group by pharmacy_id
         having count(*) filter (where sale_form = 'pack' and sale_state = 'available') = 1
            and count(*) filter (where sale_form = 'strip' and sale_state = 'pack_only') = 1
            and count(*) filter (where sale_form = 'loose' and sale_state = 'pack_only') = 1
       ) pairs`,
    [batchId],
  )
  assertDemo(
    packOnly >= 1,
    'POC-003 must be sold per pack only at one pharmacy',
  )

  const inhaler = await count(
    client,
    `select count(*)::int as count
       from price_observation
      where seed_batch_id = $1
        and medicine_id = 'POC-019'
        and pharmacy_id = 'mercury-naga-penafrancia'
        and (
          (sale_form = 'pack' and sale_state = 'available' and pack_quantity = 200 and pack_unit = 'actuation')
          or (sale_form in ('strip', 'loose') and sale_state = 'not_applicable')
        )`,
    [batchId],
  )
  assertDemo(
    inhaler === 3,
    'POC-019 must be an inhaler sold by the pack with not_applicable strip and loose forms',
  )

  const incomplete = await count(
    client,
    `select count(*)::int as count
       from pharmacy p
      where p.seed_batch_id = $1
        and exists (
          select 1 from price_observation po
           where po.seed_batch_id = $1
             and po.pharmacy_id = p.id
             and po.medicine_id = 'POC-001'
             and po.sale_state = 'available'
             and po.stock_status in ('in_stock', 'low_stock'))
        and not exists (
          select 1 from price_observation po
           where po.seed_batch_id = $1
             and po.pharmacy_id = p.id
             and po.medicine_id = 'POC-036'
             and po.sale_state = 'available'
             and po.stock_status in ('in_stock', 'low_stock'))`,
    [batchId],
  )
  assertDemo(
    incomplete >= 1,
    'The demo basket must be incomplete at one or more pharmacies',
  )

  const notStocked = await count(
    client,
    `select count(*)::int as count
       from (
         select pharmacy_id
           from price_observation
          where seed_batch_id = $1 and medicine_id = 'POC-036'
          group by pharmacy_id
         having count(*) filter (where sale_state = 'not_stocked') = 3
       ) pairs`,
    [batchId],
  )
  assertDemo(
    notStocked >= 1,
    'POC-036 must be not_stocked on all three forms at one pharmacy',
  )

  const perFormStock = await count(
    client,
    `select count(*)::int as count
       from (
         select pharmacy_id
           from price_observation
          where seed_batch_id = $1 and medicine_id = 'POC-001'
          group by pharmacy_id
         having count(*) filter (where sale_form = 'pack' and sale_state = 'available' and stock_status = 'in_stock') >= 1
            and count(*) filter (where sale_form = 'strip' and sale_state = 'available' and stock_status = 'out_of_stock') >= 1
            and count(*) filter (where sale_form = 'loose' and sale_state = 'available' and stock_status = 'in_stock') >= 1
       ) pairs`,
    [batchId],
  )
  assertDemo(
    perFormStock >= 1,
    'POC-001 must have independent pack, strip, and loose stock at one pharmacy',
  )

  const noPriceData = await count(
    client,
    `select count(*)::int as count
       from pharmacy p
      where p.seed_batch_id = $1
        and not exists (
          select 1 from price_observation po
           where po.seed_batch_id = $1
             and po.pharmacy_id = p.id
             and po.medicine_id in ('POC-001', 'POC-036')
             and po.sale_state = 'available'
             and po.stock_status in ('in_stock', 'low_stock'))`,
    [batchId],
  )
  assertDemo(
    noPriceData >= 1,
    'The demo basket must have a pharmacy with no price data',
  )

  const janumet = await count(
    client,
    `select count(*)::int as count
       from price_observation_with_mdrp
      where seed_batch_id = $1
        and medicine_id = 'POC-016'
        and above_mdrp_flag is true
        and mdrp_entry_id = 'EO104-044'`,
    [batchId],
  )
  assertDemo(
    janumet >= 3,
    'POC-016 must have a per-form price above the published MDRP ceiling',
  )

  const janumetForms = await count(
    client,
    `select count(*)::int as count
       from price_observation_with_mdrp
      where seed_batch_id = $1
        and medicine_id = 'POC-016'
        and pharmacy_id = 'mercury-naga-penafrancia'
        and (
          (sale_form = 'pack' and mdrp_rate_basis = 'box_rate' and mdrp_observed_rate_php = 35)
          or (sale_form = 'strip' and mdrp_rate_basis = 'strip_rate' and mdrp_observed_rate_php = 36)
          or (sale_form = 'loose' and mdrp_rate_basis = 'loose_price' and mdrp_observed_rate_php = 38)
        )`,
    [batchId],
  )
  assertDemo(
    janumetForms === 3,
    'POC-016 must expose its pack, strip, and loose MDRP comparison',
  )

  const stale = await count(
    client,
    `select count(*)::int as count
       from price_observation
      where seed_batch_id = $1
        and medicine_id = 'POC-036'
        and sale_form = 'loose'
        and sale_state = 'available'
        and verified_at < now() - interval '14 days'`,
    [batchId],
  )
  assertDemo(stale >= 1, 'The seed must include a stale loose price record')

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

  const inactiveForms = await count(
    client,
    `select count(*)::int as count
       from price_observation
      where seed_batch_id = $1 and medicine_id = 'POC-028'
        and sale_state <> 'unknown'`,
    [batchId],
  )
  assertDemo(
    inactiveForms === 0,
    'POC-028 must only have unknown form observations',
  )

  const noPack = await count(
    client,
    `select count(*)::int as count
       from medicine
      where seed_batch_id = $1 and id = 'POC-041' and active = true`,
    [batchId],
  )
  assertDemo(noPack === 1, 'POC-041 must stay active without a reference pack')

  const noPriceForms = await count(
    client,
    `select count(*)::int as count
       from price_observation
      where seed_batch_id = $1 and medicine_id = 'POC-041'
        and sale_state <> 'unknown'`,
    [batchId],
  )
  assertDemo(
    noPriceForms === 0,
    'POC-041 must only have unknown form observations',
  )
}
