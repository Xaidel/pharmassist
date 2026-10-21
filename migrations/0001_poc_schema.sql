-- Pharmassist POC schema, from docs/poc/data-contract.md section 5.

create extension if not exists pg_trgm;

create type rx_otc as enum ('Rx', 'OTC');
create type pharmacy_type as enum ('chain', 'independent', 'public_health_center');
create type stock_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'unknown');
create type verification_status as enum ('verified', 'unverified');
create type mdrp_basis as enum ('per_unit', 'per_pack');
create type report_reason as enum ('wrong_price', 'wrong_stock', 'wrong_details', 'other');
create type report_status as enum ('open', 'triaged', 'resolved', 'dismissed');

create table seed_batch (
  id text primary key,
  kind text not null check (kind in ('poc-seed', 'pilot')),
  app_env text not null check (app_env in ('dev', 'test', 'pilot')),
  source_manifest_sha256 text,
  notes text,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create unique index seed_batch_one_poc on seed_batch (kind) where kind = 'poc-seed';

create table medicine (
  id text primary key,
  category text not null,
  brand_name text,
  generic_name text not null,
  strength text not null,
  dosage_form text not null,
  pack_size text,
  manufacturer text,
  rx_otc rx_otc not null,
  fda_registration_no text,
  fda_registration_expiry date,
  pnf_listed boolean,
  pnf_entry text,
  pnf_page integer,
  konsulta_listed boolean,
  konsulta_entry text,
  konsulta_as_of date,
  generic_group_id text,
  active boolean not null default true,
  data_source text not null,
  seed_batch_id text references seed_batch(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text text generated always as (
    coalesce(brand_name, '') || ' ' || generic_name || ' ' || strength || ' ' || dosage_form
  ) stored,
  check (active = false or fda_registration_no is not null)
);

create index medicine_search_trgm_idx on medicine using gin (search_text gin_trgm_ops);
create index medicine_brand_trgm_idx on medicine using gin (brand_name gin_trgm_ops);
create index medicine_generic_trgm_idx on medicine using gin (generic_name gin_trgm_ops);
create index medicine_active_idx on medicine (active);

create table medicine_alternative (
  id text primary key,
  medicine_id text not null references medicine(id) on delete restrict,
  brand_name text not null,
  manufacturer text,
  pack_size text,
  rx_otc rx_otc not null,
  fda_registration_no text,
  registration_expiry date,
  note text,
  display_order integer not null default 0,
  seed_batch_id text references seed_batch(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (medicine_id, brand_name, fda_registration_no)
);

create index medicine_alternative_medicine_idx
  on medicine_alternative (medicine_id, display_order);

create table mdrp_ceiling (
  id text primary key,
  order_id text not null,
  order_signed date not null,
  annex_row integer not null,
  category text,
  molecule text not null,
  molecules text[] not null,
  strength text not null,
  dosage_form text,
  pack_size text,
  strength_and_form_raw text,
  mwp_php numeric(10,2),
  mrp_php numeric(10,2) not null,
  price_basis mdrp_basis not null,
  price_unit text,
  vat_exclusive_mrp boolean not null default false,
  voluntary_price_reduction boolean not null default false,
  source_url text not null,
  source_pdf_page integer,
  checked_at date not null,
  notes text,
  seed_batch_id text references seed_batch(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (mrp_php > 0),
  check (mwp_php is null or mwp_php > 0),
  check (cardinality(molecules) > 0),
  check (
    (price_basis = 'per_pack' and pack_size is not null and price_unit is null)
    or
    (price_basis = 'per_unit' and pack_size is null)
  )
);

create index mdrp_ceiling_match_idx on mdrp_ceiling (strength, dosage_form, pack_size);

create table pharmacy (
  id text primary key,
  name text not null,
  brand text,
  type pharmacy_type not null,
  address text not null,
  barangay text,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  phone text,
  hours_text text,
  open_24h boolean not null default false,
  opening_hours jsonb,
  verification_status verification_status not null default 'unverified',
  data_source text not null,
  source_url text,
  coordinate_confidence text check (coordinate_confidence in ('high', 'medium', 'low')),
  notes text,
  seed_batch_id text references seed_batch(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opening_hours is null or jsonb_typeof(opening_hours) = 'object')
);

create index pharmacy_type_idx on pharmacy (type);

create table price_record (
  id uuid primary key default gen_random_uuid(),
  medicine_id text not null references medicine(id) on delete restrict,
  pharmacy_id text not null references pharmacy(id) on delete restrict,
  shelf_price_php numeric(10,2) not null check (shelf_price_php >= 0),
  currency char(3) not null default 'PHP' check (currency = 'PHP'),
  pack_size text not null,
  pack_quantity numeric(10,3) check (pack_quantity is null or pack_quantity > 0),
  pack_unit text,
  unit_price_php numeric generated always as (
    shelf_price_php / nullif(pack_quantity, 0)
  ) stored,
  stock_status stock_status not null,
  verified_at timestamptz not null,
  verified_by text not null,
  source text not null,
  notes text,
  mdrp_entry_id text references mdrp_ceiling(id) on delete restrict,
  seed_batch_id text references seed_batch(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (medicine_id, pharmacy_id),
  check (
    (pack_quantity is null and pack_unit is null)
    or
    (pack_quantity is not null and pack_unit is not null)
  )
);

create index price_record_pharmacy_idx on price_record (pharmacy_id);
create index price_record_medicine_idx on price_record (medicine_id);
create index price_record_verified_idx on price_record (verified_at);
create index price_record_mdrp_idx on price_record (mdrp_entry_id)
  where mdrp_entry_id is not null;

create view price_record_with_mdrp as
select
  pr.*,
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
    when mc.price_basis = 'per_pack' then pr.shelf_price_php
    when mc.price_basis = 'per_unit' then pr.shelf_price_php / nullif(pr.pack_quantity, 0)
  end as mdrp_observed_price_php,
  case
    when mc.id is null then null
    when mc.price_basis = 'per_pack' then pr.shelf_price_php > mc.mrp_php
    when mc.price_basis = 'per_unit' then
      pr.shelf_price_php / nullif(pr.pack_quantity, 0) > mc.mrp_php
  end as above_mdrp_flag
from price_record pr
left join mdrp_ceiling mc on mc.id = pr.mdrp_entry_id;

create table price_report (
  id uuid primary key default gen_random_uuid(),
  result_key text not null,
  pharmacy_id text not null,
  pharmacy_name_snapshot text not null,
  medicine_ids text[] not null default '{}',
  medicine_labels text[] not null default '{}',
  reason report_reason not null,
  note text check (note is null or char_length(note) <= 500),
  status report_status not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (cardinality(medicine_ids) between 1 and 10),
  check (cardinality(medicine_ids) = cardinality(medicine_labels)),
  check (char_length(result_key) <= 512)
);

create index price_report_result_key_idx on price_report (result_key, created_at desc);
create index price_report_status_idx on price_report (status, created_at);

create table app_event (
  id bigserial primary key,
  name text not null,
  session_id uuid not null,
  app_env text not null check (app_env in ('dev', 'test', 'pilot')),
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (jsonb_typeof(properties) = 'object')
);

create index app_event_name_occurred_idx on app_event (name, occurred_at desc);
create index app_event_session_occurred_idx on app_event (session_id, occurred_at desc);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger medicine_set_updated_at
  before update on medicine
  for each row execute function set_updated_at();

create trigger medicine_alternative_set_updated_at
  before update on medicine_alternative
  for each row execute function set_updated_at();

create trigger pharmacy_set_updated_at
  before update on pharmacy
  for each row execute function set_updated_at();

create trigger price_record_set_updated_at
  before update on price_record
  for each row execute function set_updated_at();

create trigger price_report_set_updated_at
  before update on price_report
  for each row execute function set_updated_at();
