-- Send-ahead reservation snapshot. See docs/poc/data-contract.md section 5.12.

create type send_ahead_status as enum ('created', 'expired');

-- Per-pharmacy SMS-able mobile number for the send-ahead share channel.
alter table pharmacy add column mobile text;

create table send_ahead (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  pharmacy_id text not null,
  pharmacy_name_snapshot text not null,
  medicine_ids text[] not null default '{}',
  medicine_labels text[] not null default '{}',
  quantities numeric(10,3)[] not null default '{}',
  status send_ahead_status not null default 'created',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (cardinality(medicine_ids) between 1 and 10),
  check (cardinality(medicine_ids) = cardinality(medicine_labels)),
  check (cardinality(medicine_ids) = cardinality(quantities)),
  check (char_length(reference_code) <= 16),
  check (expires_at > created_at)
);

create index send_ahead_expires_at_idx on send_ahead (expires_at);
