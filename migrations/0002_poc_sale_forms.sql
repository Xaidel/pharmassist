-- POC contract revision: per-form price observations and pack-free medicine identity.
-- See docs/poc/data-contract.md sections 4 and 5.

create type base_unit as enum ('tablet', 'capsule', 'mL', 'g', 'actuation', 'sachet', 'unit-dose');
create type sale_form as enum ('pack', 'strip', 'loose');
create type sale_state as enum ('available', 'pack_only', 'not_applicable', 'not_stocked', 'unknown');

-- Medicine identity no longer carries a pack. base_unit is the basket unit and the
-- target of the composite key that keeps an observation's pack_unit aligned.
alter table medicine add column base_unit base_unit;

do $$
begin
  if exists (
    select 1
      from price_record
     group by medicine_id
    having count(distinct pack_unit) > 1
  ) then
    raise exception 'A medicine has more than one pack unit; cannot derive base_unit';
  end if;
end;
$$;

update medicine m
   set base_unit = pr.pack_unit::base_unit
  from (
    select medicine_id, min(pack_unit) as pack_unit
      from price_record
     where pack_unit is not null
     group by medicine_id
  ) pr
 where pr.medicine_id = m.id;

update medicine
   set base_unit = case
     when lower(dosage_form) like '%tablet%' then 'tablet'::base_unit
     when lower(dosage_form) like '%capsule%' then 'capsule'::base_unit
     when lower(dosage_form) like '%inhaler%' then 'actuation'::base_unit
     when lower(dosage_form) like '%sachet%' then 'sachet'::base_unit
     when lower(dosage_form) like '%unit-dose%' then 'unit-dose'::base_unit
     when lower(dosage_form) like '%oint%' or lower(dosage_form) like '%g tube%' then 'g'::base_unit
     when lower(dosage_form) like '%syrup%'
       or lower(dosage_form) like '%suspension%'
       or lower(dosage_form) like '%ml%' then 'mL'::base_unit
   end
 where base_unit is null;

do $$
begin
  if exists (select 1 from medicine where base_unit is null) then
    raise exception 'Cannot derive base_unit for medicines: %',
      (select string_agg(id, ', ' order by id) from medicine where base_unit is null);
  end if;
end;
$$;

alter table medicine alter column base_unit set not null;
alter table medicine drop column pack_size;
alter table medicine add constraint medicine_id_base_unit_key unique (id, base_unit);

alter table medicine_alternative rename column pack_size to reference_pack_size;

alter table price_record rename to price_observation;

alter table price_observation rename constraint price_record_pkey to price_observation_pkey;
alter table price_observation rename constraint price_record_medicine_id_fkey to price_observation_medicine_id_fkey;
alter table price_observation rename constraint price_record_pharmacy_id_fkey to price_observation_pharmacy_id_fkey;
alter table price_observation rename constraint price_record_mdrp_entry_id_fkey to price_observation_mdrp_entry_id_fkey;
alter table price_observation rename constraint price_record_seed_batch_id_fkey to price_observation_seed_batch_id_fkey;

alter index price_record_pharmacy_idx rename to price_observation_pharmacy_idx;
alter index price_record_medicine_idx rename to price_observation_medicine_idx;
alter index price_record_verified_idx rename to price_observation_verified_idx;
alter index price_record_mdrp_idx rename to price_observation_mdrp_idx;

alter trigger price_record_set_updated_at on price_observation
  rename to price_observation_set_updated_at;

drop view price_record_with_mdrp;

alter table price_observation drop constraint price_record_check;
alter table price_observation drop constraint price_record_medicine_id_pharmacy_id_key;

alter table price_observation
  add column sale_form sale_form,
  add column sale_state sale_state,
  add column form_label text;

alter table price_observation
  alter column shelf_price_php drop not null,
  alter column stock_status drop not null,
  alter column verified_at drop not null,
  alter column verified_by drop not null,
  alter column source drop not null;

update price_observation
   set sale_form = 'pack',
       sale_state = 'available',
       form_label = pack_size;

alter table price_observation
  alter column sale_form set not null,
  alter column sale_state set not null;

alter table price_observation drop column pack_size;

alter table price_observation
  alter column pack_unit type base_unit using pack_unit::base_unit;

alter table price_observation drop column unit_price_php;

alter table price_observation
  add column unit_rate_php numeric generated always as (
    shelf_price_php / nullif(pack_quantity, 0)
  ) stored;

alter table price_observation
  add constraint price_observation_natural_key unique (medicine_id, pharmacy_id, sale_form),
  add constraint price_observation_medicine_base_unit_fkey
    foreign key (medicine_id, pack_unit) references medicine (id, base_unit),
  add constraint price_observation_available_fields_check check (
    (sale_state = 'available'
      and form_label is not null
      and shelf_price_php is not null
      and pack_quantity is not null
      and pack_unit is not null
      and stock_status is not null
      and verified_at is not null
      and verified_by is not null
      and source is not null)
    or
    (sale_state <> 'available'
      and shelf_price_php is null
      and pack_quantity is null
      and pack_unit is null
      and stock_status is null
      and mdrp_entry_id is null)
  ),
  add constraint price_observation_loose_quantity_check check (
    sale_form <> 'loose' or sale_state <> 'available' or pack_quantity = 1
  ),
  add constraint price_observation_strip_quantity_check check (
    sale_form <> 'strip' or sale_state <> 'available' or pack_quantity >= 2
  ),
  add constraint price_observation_pack_only_form_check check (
    sale_state <> 'pack_only' or sale_form in ('strip', 'loose')
  ),
  add constraint price_observation_not_applicable_form_check check (
    sale_state <> 'not_applicable' or sale_form in ('strip', 'loose')
  );

create index price_observation_state_idx on price_observation (sale_state);

create view price_observation_with_mdrp as
select
  po.*,
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
  end as mdrp_rate_basis,
  case
    when mc.id is null then null
    when mc.price_basis = 'per_pack' then po.shelf_price_php > mc.mrp_php
    when mc.price_basis = 'per_unit' then
      po.shelf_price_php / nullif(po.pack_quantity, 0) > mc.mrp_php
  end as above_mdrp_flag
from price_observation po
left join mdrp_ceiling mc on mc.id = po.mdrp_entry_id;
