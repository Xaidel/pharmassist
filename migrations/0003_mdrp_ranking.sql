-- MDRP-compliant ranking and VAT normalization.
-- See docs/poc/data-contract.md sections 4.6-4.7 and 5.8.

-- Product VAT status: true = exempt, false = vatable, null = unknown.
alter table medicine add column vat_exempt boolean;

drop view price_observation_with_mdrp;

create view price_observation_with_mdrp as
select
  base.*,
  case
    when base.mdrp_entry_id is null then null
    when base.mdrp_ceiling_basis = 'per_pack' then
      base.shelf_price_php > base.mdrp_effective_ceiling_php
    when base.mdrp_ceiling_basis = 'per_unit' then
      base.shelf_price_php / nullif(base.pack_quantity, 0) >
        base.mdrp_effective_ceiling_php
  end as above_mdrp_flag
from (
  select
    po.*,
    m.vat_exempt as mdrp_vat_exempt,
    mc.order_id as mdrp_order,
    mc.annex_row as mdrp_annex_row,
    mc.mrp_php as mdrp_ceiling_php,
    mc.price_basis as mdrp_ceiling_basis,
    mc.price_unit as mdrp_ceiling_unit,
    mc.vat_exclusive_mrp as mdrp_vat_exclusive,
    mc.source_url as mdrp_source_url,
    mc.checked_at as mdrp_checked_at,
    case
      when mc.id is null then null
      when mc.vat_exclusive_mrp and m.vat_exempt is false then
        round(mc.mrp_php * 1.12, 2)
      else mc.mrp_php
    end as mdrp_effective_ceiling_php,
    case
      when mc.id is null then null
      when mc.price_basis = 'per_pack' then po.shelf_price_php
      when mc.price_basis = 'per_unit' then
        po.shelf_price_php / nullif(po.pack_quantity, 0)
    end as mdrp_observed_rate_php,
    case
      when mc.id is null then null
      when mc.price_basis = 'per_pack' then 'pack_price'
      when po.sale_form = 'loose' then 'loose_price'
      when po.sale_form = 'strip' then 'strip_rate'
      else 'box_rate'
    end as mdrp_rate_basis
  from price_observation po
  join medicine m on m.id = po.medicine_id
  left join mdrp_ceiling mc on mc.id = po.mdrp_entry_id
) base;
