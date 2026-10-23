# Pharmassist POC — data contract and schema mapping

**Ticket:** [Xaidel/pharmassist#41](https://github.com/Xaidel/pharmassist/issues/41), revising [Xaidel/pharmassist#21](https://github.com/Xaidel/pharmassist/issues/21)
**Decision:** [16 - Pack vs per-piece (tingi) pricing](https://github.com/Xaidel/pharmassist/issues/36)
**Parent map:** [Map: Pharmassist POC — seeded-data working demo](https://github.com/Xaidel/pharmassist/issues/17)
**Status:** Contract for implementation. This revision replaces the pack-only medicine identity, pack basket, and pack-based ranking in #21. Schema and seed migration are ticket #42; quantity basket and exact-fulfillment ranking are #44; results UI is #43; end-to-end acceptance is #45. Native directions are governed by the [native pharmacy directions ADR](../adr/proposed/architecture/2026-10-21-native-pharmacy-directions.md).
**Last updated:** 2026-10-23

---

## 1. Purpose and scope

This document fixes the POC data layer before the sale-form schema, seed, API, and UI are built or migrated. It covers:

- the Postgres schema mapped from PRD section 7 — Medicine, Pharmacy, PriceObservation, Basket (session-only), and Report — plus seed batches, MDRP ceilings, candidate generics, and anonymous events;
- medicine identity without a pack, and pack, strip, and loose as per-pharmacy sale forms;
- a quantity basket in each medicine's base dispensing unit, with explicit non-sale form states;
- strict exact-fulfillment ranking and the sold-per-pack-only bucket;
- `poc-seed` tagging and a wipe that cannot touch non-seed rows;
- the HTTP contract for search, basket validation, results/ranking, pharmacy detail, native directions, scan, report, and events;
- session-only basket semantics, with no accounts, no patient identifiers, and no image retention;
- the scan endpoint as the stable swap point for the real OCR route chosen in [OCR data-flow and legal-risk decision](https://github.com/Xaidel/pharmassist/issues/16).

The contract is deliberately vendor-neutral. The POC seed and the mock OCR provider are replaceable without changing the UI or the API shapes.

### Source data

The POC seed is derived from three research outputs on the throwaway branch `research/poc-seed-data` (never merged):

| File | Use |
|---|---|
| `docs/research/data/poc-50-sku-catalog.json` | 50 medicine SKUs, FDA records, PNF/Konsulta status, reference and candidate packs, the exact MDRP match for POC-016 |
| `docs/research/data/naga-pharmacies.json` | 10 real Naga pharmacy identities, addresses, coordinates, hours, phone, provenance |
| `docs/research/data/mdrp-ceilings.json` | 204 published MDRP ceilings from EO 104 s. 2020 and EO 155 s. 2021 |

The implementation copies these fixtures into the app's seed bundle; the research branch is not a runtime dependency.

---

## 2. Decisions at a glance

1. **The basket is not a database table.** It is a client-side value object, held in page memory (optionally `sessionStorage`) and sent to the server only inside request bodies. This satisfies PRD FR-13/FR-42: prescription contents are never stored server-side. The server is stateless for baskets.
2. **The basket counts base dispensing units, not packs.** Each line is `medicine_id`, `quantity`, and `unit`; the unit must equal the medicine's `base_unit`. Pack, strip, and loose are offers the server uses to fulfill the quantity.
3. **Medicine identity excludes the pack.** A medicine is brand or generic name plus strength and dosage form. Pack, strip, and loose are sale forms observed per pharmacy; they are not separate medicine rows.
4. **One current observation per medicine, pharmacy, and sale form.** The POC holds the current record only; re-verification updates it. Price history is a pilot concern.
5. **Forms that are not sold are explicit.** Every active medicine at every seeded pharmacy has a `pack`, `strip`, and `loose` row with one of `available`, `pack_only`, `not_applicable`, `not_stocked`, or `unknown`. Only `available` carries a price.
6. **Ranking is strict exact fulfillment.** A pharmacy is comparable only when its sellable forms sum exactly to the requested quantity. The server picks the cheapest exact combination. A pharmacy that stocks the medicine but has no exact combination goes to **Sold per pack only**; it is not ranked against exact options.
7. **MDRP is compared per form.** A per-unit ceiling compares the observed loose price, the derived strip rate, or the derived box rate; a per-pack ceiling compares the pack price. Every comparison is labelled with its basis.
8. **Normal price lines show observed prices only.** There is no bare computed per-unit figure in search, results, or pharmacy detail. A derived rate appears only in the MDRP block, labelled `box rate` or `strip rate`.
9. **Reports are immutable snapshots.** `price_report` stores pharmacy and medicine labels, with no foreign keys to seeded rows, so a report survives a seed wipe and remains readable.
10. **Seed tagging is a batch reference.** Every seeded row carries `seed_batch_id = 'poc-seed'`. The wipe is scoped to that batch and refuses to run if a non-seed row depends on seeded data.
11. **MDRP ceilings are a separate reference table.** `mdrp_ceiling` holds the published ceilings; `price_observation` references an `mdrp_entry_id` only when the product and form match exactly.
12. **Candidate generic alternatives are separate from exact products.** They live in `medicine_alternative`, never enter search ranking or basket ranking, and are returned as a separate `candidate_generics` block.
13. **A medicine without an FDA registration number is not listable.** It stays in the catalog with `active = false`. In the current seed that is POC-028 only.
14. **The scan endpoint is the OCR seam.** `POST /api/scan` validates consent, never stores the image or recognized text, and returns only medicine candidates. The mock provider is replaced behind the same response shape.
15. **All API money is PHP and two decimal places.** The database uses `numeric(10,2)`; JSON uses numbers. The client formats currency.

---

## 3. Conventions

### 3.1 Identifiers

- `medicine.id`: stable text key, format `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`. The seed uses `POC-001` through `POC-050`.
- `pharmacy.id`: stable text slug, format `^[a-z0-9][a-z0-9-]{0,63}$`. The seed uses values such as `mercury-naga-penafrancia`.
- `medicine_alternative.id`: `<medicine_id>-ALT-<n>`, for example `POC-001-ALT-1`.
- `mdrp_ceiling.id`: `<order>-<row>`, for example `EO104-044`.
- `price_observation.id`, `price_report.id`: UUIDs.
- `app_event.session_id`: a random UUID generated by the client and kept in `sessionStorage`. It is not a cookie and is not linked to an identity.

Identifiers are stable across re-seeds. A pilot load may use its own stable identifiers as long as it follows the same character rules.

### 3.2 Money

- Database: `numeric(10,2)`, PHP only, non-negative.
- JSON: a number with at most two decimal places.
- The database keeps a derived `unit_rate_php` for MDRP comparison only; the API never returns it as a normal price line. In the MDRP block it appears as `observed_rate_php` with a `rate_basis`.
- The API never computes senior-citizen or PWD net prices (PRD FR-40).

### 3.3 Time

- Database: `timestamptz` for instants, `date` for calendar dates.
- JSON: ISO 8601 UTC with a `Z` suffix, for example `2026-10-20T00:00:00Z`.
- Open-now calculations use `Asia/Manila`, the pharmacy market's local timezone.
- Staleness is `verified_at < now() - interval '14 days'`.

### 3.4 HTTP

- Base path: `/api`.
- JSON request and response bodies; UTF-8.
- Same-origin only; no CORS headers.
- All `/api/*` responses: `Cache-Control: no-store`.
- All endpoints sit behind Caddy basic auth in the POC.
- Mutating endpoints reject non-`POST` methods with `405 METHOD_NOT_ALLOWED`.
- Errors use one envelope:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The basket contains an unknown medicine.",
    "details": {
      "medicine_ids": ["POC-999"]
    }
  }
}
```

`message` is safe to show to a user. `details` is optional and structured for the client, not a stack trace.

### 3.5 PRD entity mapping

| PRD section 7 entity | Table | Notes |
|---|---|---|
| **Medicine** | `medicine` | Exact product identity; brand may be null for a generic-only row; pack is not part of identity |
| **Pharmacy** | `pharmacy` | Business facts only; no staff personal data |
| **PriceRecord** | `price_observation` | One current observation per `(medicine_id, pharmacy_id, sale_form)` |
| **Basket** | — | Client-side DTO only; quantity in base units; never persisted |
| **Report** | `price_report` | Snapshot of the reported result; no foreign keys to seeded rows |
| — (extension) | `medicine_alternative` | Candidate generic products, shown separately, never ranked |
| — (extension) | `mdrp_ceiling` | Published ceilings from EO 104 s. 2020 and EO 155 s. 2021 |
| — (extension) | `seed_batch` | Provenance and wipe scope |
| — (extension) | `app_event` | Anonymous product events |

Three mappings are worth calling out against PRD section 7:

- `medicine.data_source` maps the PRD Medicine `source` field; `pnf_listed` / `pnf_entry` / `pnf_page` refine the single `pnf_status` field into checkable facts.
- `price_observation_with_mdrp` exposes the PRD `mdrp_ceiling` and `above_mdrp_flag` fields per form; they are derived from `mdrp_ceiling`, not stored on the price row.
- `price_report.result_key` is the POC's stable stand-in for the PRD `result_id`. Results are computed per request, so no result row exists to reference; the key is derived from the pharmacy and the sorted basket medicine ids. It deliberately excludes quantity and sale forms.

---

## 4. Domain invariants

These rules are enforced by the schema, the API, or the seeder as noted.

### 4.1 Medicine identity and base unit

A medicine is identified by brand or generic name plus strength and dosage form. The POC does not rank across strength or form. Pack, strip, and loose are sale forms observed per pharmacy, not part of medicine identity. Search returns exact-product rows only.

- `medicine.strength`, `medicine.dosage_form`, and `medicine.generic_name` are required.
- `medicine.brand_name` is nullable for a generic-only row.
- `medicine.base_unit` is required and is the unit the basket counts in: `tablet`, `capsule`, `mL`, `g`, `actuation`, `sachet`, or `unit-dose`.
- A different sellable pack, strip, or loose presentation is not a separate medicine row. It is a sale-form observation for the same medicine.
- The seeder derives `base_unit` from the reference product's unit basis; for a medicine without a reference pack (POC-041) it derives it from the dosage form.
- Multiple simultaneous pack sizes at one pharmacy are out of scope for the POC; the contract records one pack observation per `(medicine, pharmacy)`. Extending the unique key to the pack is a pilot change.

### 4.2 Sale forms and states

The sale forms are `pack`, `strip`, and `loose`. Every active seeded medicine has all three rows at every seeded pharmacy, and each row carries one state:

| State | Meaning | Price fields | Basket effect |
|---|---|---|---|
| `available` | The pharmacy sells this form; the shelf price is observed. | Required | Can fulfill a quantity |
| `pack_only` | This strip or loose form is not sold; the pack is the fallback. | Null | Never incomplete; the UI shows "Sold per pack only" when the pack is the only sellable form |
| `not_applicable` | The form cannot apply to this medicine, for example a loose inhaler or a strip of syrup. | Null | Never incomplete; the UI shows "Sold by the pack" when the pack is the only sellable form |
| `not_stocked` | The pharmacy does not stock the medicine; set on all three forms for that pair. | Null | Incomplete with `not_stocked` |
| `unknown` | The form has not been confirmed. | Null | No data; never displayed as "unavailable" |

Rules:

- The pack is the anchor offer in the POC: a stocked medicine always has an available pack observation. A loose-only or strip-only offer is a pilot extension.
- `pack_only` does not by itself mean that no other non-pack form is sold. It means the pack is the fallback for this form. The result copy "Sold per pack only" is used only when the pack is the only sellable form.
- `available` rows carry `form_label`, `shelf_price_php`, `pack_quantity`, `pack_unit`, `stock_status`, `verified_at`, `verified_by`, and `source`.
- `form_label` is the observed sale label: for example `Box of 100 tablets`, `Strip of 10 tablets`, or `Loose tablet`.
- `pack_quantity` is the number of base units the form contains: the pack count for a pack, the strip count for a strip, and `1` for loose.
- `pack_unit` equals `medicine.base_unit`; the schema enforces this with a composite foreign key.
- A loose form is priced per base unit. The POC does not use loose forms for `mL` or `g` medicines; they are `not_applicable`. A loose liquid form is a pilot extension.
- `pack_only` is valid only on `strip` or `loose`, and only when the pack form is `available` at that pharmacy.
- `not_applicable` is valid only on `strip` or `loose`; the pack form of an active medicine is never `not_applicable`.
- `not_stocked` is set on all three forms of a medicine/pharmacy pair, or on none. It means the pharmacy does not stock the medicine, not that a particular form is missing.
- `unknown` carries no price and does not imply absence. It is the honest state for an unconfirmed form.
- The three rows are independent for stock: a pharmacy may have the pack in stock, the strip out of stock, and loose in stock.
- `unit_rate_php` (`shelf_price_php / pack_quantity`) is generated for MDRP comparison only. It is never a normal price line and never a buyable price.

### 4.3 Basket

A basket is a list of 1–10 line items:

```json
{
  "items": [
    { "medicine_id": "POC-001", "quantity": 5, "unit": "tablet" },
    { "medicine_id": "POC-036", "quantity": 10, "unit": "tablet" }
  ]
}
```

Rules:

- `medicine_id` must exist and be `active`.
- No duplicate `medicine_id` in one basket.
- `quantity` is positive. It is an integer for `tablet`, `capsule`, `sachet`, `actuation`, and `unit-dose`, and may have up to three decimal places for `mL` and `g`.
- `unit` must equal the medicine's `base_unit`. A mismatch is rejected, never silently converted.
- The basket is held client-side. The server validates it per request and stores nothing.
- The client may keep the basket in React state and optionally `sessionStorage` for a reload; it must clear on tab close and must never put it in `localStorage`, IndexedDB, or the service worker cache.
- Search history stays on-device and is never sent as an event property.
- The API enforces 1–10 lines, the quantity rules above, and a sanity ceiling of 100,000 base units per line. It does not store the basket.

Client guardrails, owned by the results UI (#43):

- Loose entry for countable medicines: 1–90 base units per line.
- Pack or strip entry: 1–10 sellable units per line; the client converts the sellable units to base units before sending.
- A soft warning above an estimated 30-day supply. The exact estimate and copy belong to #43; the payload remains a base-unit quantity.
- These are entry guardrails, not server ranking rules. A structurally valid basket above them is still priced; the UI is what prevents accidental over-ordering.

### 4.4 Completeness, exact fulfillment, and pack-only

For a basket item at a pharmacy:

- A **sellable form** is `sale_state = 'available'` and `stock_status` is `in_stock` or `low_stock`.
- **Exact** means non-negative integer counts of sellable forms sum exactly to the requested quantity: `sum(count × pack_quantity) = quantity`.
- **Complete** means every basket item is exact. The pharmacy's total is the cheapest exact combination for all items.
- **Sold per pack only** means every item has at least one sellable form, but at least one item is not exact. The server selects the cheapest covering purchase for each non-exact item, using one sellable pack or strip form repeated, and shows the form, its observed price, the number of units to buy, and the covered quantity.
- **Incomplete** means at least one item has no sellable form. Missing reasons, in order of resolution:
  - `not_stocked` — all three forms are `not_stocked`;
  - `out_of_stock` — a form is `available` but `stock_status = 'out_of_stock'`, and no form is sellable;
  - `stock_unknown` — a form is `available` but `stock_status = 'unknown'`, and no form is sellable;
  - `no_price` — no form is `available` (only `unknown` or no rows).
- `pack_only` and `not_applicable` forms never make a basket incomplete. They are informational: the medicine is sold by the pack.
- A price record older than 14 days is still sellable but flagged `stale: true`.
- A pharmacy with no sellable form for any basket item is **no price data**: it is returned in `no_price_data`, never ranked, and displayed as "No price data" — never as "Unavailable" (PRD FR-30).
- A pharmacy with at least one sellable item but a missing item is `incomplete`.
- MDRP status never affects completeness.

### 4.5 Exact-combination selection

For each item, the server chooses the cheapest exact combination of sellable forms.

- Minimize the total observed price.
- Tie-break by fewest pack units, then fewest strip units, then fewest loose units.
- The result breakdown names every chosen form and count, for example `1 strip of 10 + 2 loose`.
- If no exact combination exists, the covering purchase uses one sellable form repeated: choose the lowest `ceil(quantity / pack_quantity) × shelf_price`; tie-break by pack before strip, then by larger `pack_quantity`.
- A covering purchase is labelled in this order: **Sold by the strip** when the chosen form is a strip; **Sold by the pack** when the chosen form is a pack and both non-pack forms are `not_applicable`; **Sold per pack only** otherwise. The UI owns the final copy (#43).

### 4.6 Ranking

Complete exact baskets split into two MDRP tiers:

1. **Compliant:** no chosen component in the basket is above its effective MDRP ceiling.
2. **Above ceiling:** at least one chosen component is above its effective MDRP ceiling.

Every compliant complete basket ranks before every above-ceiling complete basket. Within each tier the order is:

1. total shelf price ascending;
2. distance ascending;
3. the oldest chosen-component `verified_at` descending (the basket is as fresh as its stalest component);
4. pharmacy name ascending (deterministic final tie-break).

The `cheapest_complete` highlight goes only to the first result in the compliant tier. If no complete result is compliant, no result is highlighted. An above-ceiling result is never labelled "cheapest". Above-ceiling complete results stay visible in their own group; they are not excluded.

The sold-per-pack-only bucket is separate and is never ranked against exact options. Within the bucket, order by:

1. covering total ascending;
2. distance ascending;
3. pharmacy name ascending.

Incomplete baskets separately, by:

1. fewest missing items ascending;
2. known exact subtotal ascending;
3. distance ascending;
4. pharmacy name ascending.

`no_price_data` pharmacies are not ranked; they are ordered by distance, then name. The sold-per-pack-only and incomplete groups keep their existing order; `above_mdrp_ceiling` is informational for them.

The complete total is `sum(chosen form price × count)` across items. The pack-only covering total is the sum of exact item totals and the covering purchase totals for non-exact items. It is labelled as the amount the patient must buy, not as a comparable exact total. An incomplete basket's known subtotal is the sum of its exact item totals; pack-only item covering totals are shown per item.

`sort=distance` keeps the MDRP tier first, then orders complete baskets by distance, then total. Pack-only entries are ordered by distance, then covering total. Incomplete and no-price ordering is unchanged.

### 4.7 MDRP

- Ceilings come only from `mdrp_ceiling`, loaded from the published EO 104 s. 2020 / EO 155 s. 2021 annexes.
- An observation references `mdrp_entry_id` only on an exact match of:
  - molecule set (order-insensitive, normalized names);
  - strength (normalized);
  - dosage form (normalized);
  - pack, when the ceiling states a pack.
- A combination ceiling is never attached to one of its components. For example, the metformin + sitagliptin ceiling must not attach to metformin alone.
- Attachment depends on the ceiling basis:
  - `per_unit`: attach to every `available` form of the exact medicine. The comparison is per base unit.
  - `per_pack`: attach only to the `pack` observation whose `pack_quantity` and `pack_unit` match the ceiling's published pack. No exact pack means no attachment.
- The observed comparison is:
  - `per_unit` + `loose`: the observed loose price (`rate_basis: loose_price`);
  - `per_unit` + `strip`: `strip price / strip quantity` (`rate_basis: strip_rate`);
  - `per_unit` + `pack`: `pack price / pack quantity` (`rate_basis: box_rate`);
  - `per_pack` + `pack`: the pack shelf price (`rate_basis: pack_price`).
- The **effective ceiling** normalizes VAT. It is the published MRP, except when `vat_exclusive_mrp` is true and `medicine.vat_exempt` is false (VATable), in which case it is `round(1.12 × MRP, 2)`. When `medicine.vat_exempt` is true the published MRP is used directly. When `medicine.vat_exempt` is null the published MRP is used and the unknown status is exposed.
- The API exposes the published ceiling, the effective ceiling, the observed rate, the VAT-exclusive basis, and the product VAT-exempt status separately. The client labels the rate from `rate_basis`; it never presents a derived rate as a counter price.
- `above_mdrp_flag` is a derived view column, not a hand-maintained boolean. It compares the observed rate with the effective ceiling.
- A form that is not sold has no MDRP block.

POC-016 is the only seeded product with a ceiling. Its per-form comparison looks like this:

```json
{
  "entry_id": "EO104-044",
  "order": "EO 104 s. 2020",
  "annex_row": 44,
  "ceiling_php": 30.31,
  "effective_ceiling_php": 30.31,
  "ceiling_basis": "per_unit",
  "ceiling_unit": "tablet",
  "vat_exclusive": true,
  "vat_exempt": true,
  "observed_rate_php": 35.0,
  "rate_basis": "box_rate",
  "above": true,
  "source_url": "https://www.officialgazette.gov.ph/downloads/2020/02feb/20200217-EO-104-RRD.pdf",
  "checked_at": "2026-10-21"
}
```

The same medicine sold loose shows `observed_rate_php: 38.0` with `rate_basis: "loose_price"`; a strip of 7 at PHP 252 shows `36.0` with `rate_basis: "strip_rate"`. The UI labels them `Sold loose`, `Strip rate`, and `Box rate`.

The published MRP for this row is VAT-exclusive, but metformin + sitagliptin is on the FDA/BIR VAT-exempt list, so POC-016 is compared directly at PHP 30.31 and remains above the ceiling. A VATable product with the same asterisked ceiling is compared at PHP 33.95. The API exposes both numbers and the status rather than silently adjusting the shelf price.

### 4.8 Pharmacy identity and price verification

- `pharmacy.verification_status` describes the pharmacy record (identity and location), not the freshness of its prices.
- `price_observation.verified_at` and `price_observation.verified_by` describe the form observation. `verified_by` is a role or collector code (for example `poc-seed` or `collector-01`), never a personal name.
- `pharmacy.hours_text`, `pharmacy.phone`, and `pharmacy.barangay` may be null when not verified. Null means unknown, not closed and not absent.
- `open_now` is null when hours are unknown. It is never inferred from `hours_text` when structured hours are absent.
- Public health centers are a distinct `pharmacy.type`; the POC seed contains retail pharmacies only.

---

## 5. Postgres schema

The DDL below is the contract. Ticket #42 implements it as migrations. Names are stable; the API and seed tooling depend on them.

### 5.1 Extensions and enums

```sql
create extension if not exists pg_trgm;

create type rx_otc as enum ('Rx', 'OTC');
create type pharmacy_type as enum ('chain', 'independent', 'public_health_center');
create type stock_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'unknown');
create type base_unit as enum ('tablet', 'capsule', 'mL', 'g', 'actuation', 'sachet', 'unit-dose');
create type sale_form as enum ('pack', 'strip', 'loose');
create type sale_state as enum ('available', 'pack_only', 'not_applicable', 'not_stocked', 'unknown');
create type verification_status as enum ('verified', 'unverified');
create type mdrp_basis as enum ('per_unit', 'per_pack');
create type report_reason as enum ('wrong_price', 'wrong_stock', 'wrong_details', 'other');
create type report_status as enum ('open', 'triaged', 'resolved', 'dismissed');
```

`app_env` is a text check rather than an enum so test deployments can use `dev`, `test`, or `pilot` without a migration: `check (app_env in ('dev', 'test', 'pilot'))`.

### 5.2 `seed_batch`

```sql
create table seed_batch (
  id text primary key,
  kind text not null check (kind in ('poc-seed', 'pilot')),
  app_env text not null check (app_env in ('dev', 'test', 'pilot')),
  source_manifest_sha256 text,
  notes text,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create unique index seed_batch_one_poc
  on seed_batch (kind)
  where kind = 'poc-seed';
```

The POC seeder uses the fixed id `poc-seed`. Re-running the seeder updates the same batch and upserts rows; it never creates a second POC batch. A pilot load may use a `pilot` batch id, but the wipe ignores it.

### 5.3 `medicine`

```sql
create table medicine (
  id text primary key,
  category text not null,
  brand_name text,
  generic_name text not null,
  strength text not null,
  dosage_form text not null,
  base_unit base_unit not null,
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
  vat_exempt boolean,
  data_source text not null,
  seed_batch_id text references seed_batch(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text text generated always as (
    coalesce(brand_name, '') || ' ' || generic_name || ' ' ||
    strength || ' ' || dosage_form
  ) stored,
  unique (id, base_unit),
  check (active = false or fda_registration_no is not null)
);

create index medicine_search_trgm_idx
  on medicine using gin (search_text gin_trgm_ops);
create index medicine_brand_trgm_idx
  on medicine using gin (brand_name gin_trgm_ops);
create index medicine_generic_trgm_idx
  on medicine using gin (generic_name gin_trgm_ops);
create index medicine_active_idx on medicine (active);
```

`active = false` is the only way a medicine without an FDA registration number can exist. Search, basket validation, and results all filter to `active = true`.

`vat_exempt` is the product-level VAT status used only to normalize a VAT-exclusive MDRP ceiling: `true` means the product is VAT-exempt, `false` means it is VATable, and `null` means the status is unknown. The seeder sets POC-016 to `true`; it does not guess a status for the other catalog rows.

`unique (id, base_unit)` is redundant for identity but is the target of the composite foreign key that keeps `price_observation.pack_unit` equal to the medicine's base unit.

### 5.4 `medicine_alternative`

```sql
create table medicine_alternative (
  id text primary key,
  medicine_id text not null references medicine(id) on delete restrict,
  brand_name text not null,
  manufacturer text,
  reference_pack_size text,
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
```

Candidate generics are display-only. They are not joined to `price_observation`. `reference_pack_size` is a display detail, not a medicine identity and not a ranking input.

### 5.5 `mdrp_ceiling`

```sql
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

create index mdrp_ceiling_match_idx
  on mdrp_ceiling (strength, dosage_form, pack_size);
```

`price_basis` is derived from the published annex, not guessed:

- the annex states a pack (for example a 10 mL vial or a 200-dose inhaler) -> `per_pack`, and the ceiling applies to that pack;
- the annex states no pack (the tablet/capsule case) -> `per_unit`, and the ceiling applies to the listed unit, with `price_unit` recording that unit (for example `tablet`);
- if the annex states neither a pack nor a dosage form (two research rows), `price_unit` is null. Such a ceiling can be loaded for provenance but must never be attached to a price observation.

The seeder loads all 204 research rows. Only rows that match an exact POC product and form are referenced by `price_observation`.

### 5.6 `pharmacy`

```sql
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
```

`opening_hours` shape, local time in `Asia/Manila`:

```json
{
  "mon": [{ "open": "06:00", "close": "22:00" }],
  "tue": [{ "open": "06:00", "close": "22:00" }],
  "wed": [{ "open": "06:00", "close": "22:00" }],
  "thu": [{ "open": "06:00", "close": "22:00" }],
  "fri": [{ "open": "06:00", "close": "22:00" }],
  "sat": [{ "open": "06:00", "close": "22:00" }],
  "sun": [{ "open": "06:00", "close": "22:00" }]
}
```

- Keys are `mon` through `sun`.
- An empty array means closed that day.
- A missing key means unknown for that day.
- `opening_hours = null` and `open_24h = false` means hours unknown.
- `open_24h = true` means always open; `opening_hours` may be null.
- Intervals that cross midnight are allowed (`open` later than `close`).

The seeder maps the research `hours` string to this shape where it is unambiguous. "24 hours" becomes `open_24h = true`; a single daily range becomes the same interval for all seven days; a missing hours value stays null.

### 5.7 `price_observation`

```sql
create table price_observation (
  id uuid primary key default gen_random_uuid(),
  medicine_id text not null references medicine(id) on delete restrict,
  pharmacy_id text not null references pharmacy(id) on delete restrict,
  sale_form sale_form not null,
  sale_state sale_state not null,
  form_label text,
  shelf_price_php numeric(10,2) check (shelf_price_php >= 0),
  currency char(3) not null default 'PHP' check (currency = 'PHP'),
  pack_quantity numeric(10,3) check (pack_quantity is null or pack_quantity > 0),
  pack_unit base_unit,
  unit_rate_php numeric generated always as (
    shelf_price_php / nullif(pack_quantity, 0)
  ) stored,
  stock_status stock_status,
  verified_at timestamptz,
  verified_by text,
  source text,
  notes text,
  mdrp_entry_id text references mdrp_ceiling(id) on delete restrict,
  seed_batch_id text references seed_batch(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (medicine_id, pharmacy_id, sale_form),
  foreign key (medicine_id, pack_unit) references medicine (id, base_unit),
  check (
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
  check (sale_form <> 'loose' or sale_state <> 'available' or pack_quantity = 1),
  check (sale_form <> 'strip' or sale_state <> 'available' or pack_quantity >= 2),
  check (sale_state <> 'pack_only' or sale_form in ('strip', 'loose')),
  check (sale_state <> 'not_applicable' or sale_form in ('strip', 'loose'))
);

create index price_observation_pharmacy_idx on price_observation (pharmacy_id);
create index price_observation_medicine_idx on price_observation (medicine_id);
create index price_observation_verified_idx on price_observation (verified_at);
create index price_observation_state_idx on price_observation (sale_state);
create index price_observation_mdrp_idx on price_observation (mdrp_entry_id)
  where mdrp_entry_id is not null;
```

`pack_quantity` and `pack_unit` are the priced form's count and unit. Examples:

| `sale_form` | `form_label` | `pack_quantity` | `pack_unit` |
|---|---|---:|---|
| `pack` | Box of 100 tablets | 100 | tablet |
| `pack` | Box of 28 tablets | 28 | tablet |
| `pack` | Bottle of 60 mL | 60 | mL |
| `pack` | Tube of 5 g | 5 | g |
| `pack` | Box of 10 sachets | 10 | sachet |
| `pack` | 1 inhaler (200 actuations) | 200 | actuation |
| `pack` | Box of 20 unit-dose vials (2.5 mL each) | 20 | unit-dose |
| `strip` | Strip of 10 tablets | 10 | tablet |
| `loose` | Loose tablet | 1 | tablet |

The `unit_rate_php` generated column is for MDRP comparison only. The API never exposes it in a normal price line.

`pack_only` and `not_applicable` rows carry no price. The seeder sets `verified_at`, `verified_by`, `source`, and `notes` on them when the state was confirmed, so provenance is not lost; the state check only forbids price fields and an MDRP reference.

Cross-row invariants enforced by the seeder and the API (not by a single-table check):

- `pack_only` exists only where the pack form is `available` at the same pharmacy.
- `not_stocked` is set on all three forms of a medicine/pharmacy pair, or on none.
- `not_applicable` is used only for a form that cannot exist for the medicine.

### 5.8 `price_observation_with_mdrp` view

```sql
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
```

The API reads through this view. `above_mdrp_flag` and `mdrp_effective_ceiling_php` are null when no ceiling is attached. A non-available row has no price and no MDRP reference, so its comparison columns are null.

### 5.9 `price_report`

```sql
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

create index price_report_result_key_idx
  on price_report (result_key, created_at desc);
create index price_report_status_idx
  on price_report (status, created_at);
```

`result_key` is the canonical result identity:

```
<pharmacy_id>|<sorted medicine_id joined by comma>
```

Example: `mercury-naga-penafrancia|POC-001,POC-036`.

The key deliberately excludes quantity and sale forms: a report is about the pharmacy/medicine result, not the amount or the chosen form. The report has no foreign keys to `medicine` or `pharmacy`, so a seed wipe cannot delete or orphan it. The snapshots keep it readable. `medicine_ids` and `medicine_labels` are stored in the same sorted order.

### 5.10 `app_event`

```sql
create table app_event (
  id bigserial primary key,
  name text not null,
  session_id uuid not null,
  app_env text not null check (app_env in ('dev', 'test', 'pilot')),
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (jsonb_typeof(properties) = 'object')
);

create index app_event_name_occurred_idx
  on app_event (name, occurred_at desc);
create index app_event_session_occurred_idx
  on app_event (session_id, occurred_at desc);
```

No IP address, user agent, account id, query text, basket contents, report note, or image data. The event name and property allowlist are enforced by the API (section 7.12), not by the table.

### 5.11 `updated_at` trigger

```sql
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

create trigger price_observation_set_updated_at
  before update on price_observation
  for each row execute function set_updated_at();

create trigger price_report_set_updated_at
  before update on price_report
  for each row execute function set_updated_at();
```

---

## 6. Seed and wipe contract

### 6.1 Seeding

The seeder is a script under `scripts/seed/` (ticket #42). It reads a fixture bundle and writes one batch.

- **Batch id:** `poc-seed`; `kind = 'poc-seed'`; `app_env` from the runtime config.
- **Manifest hash:** SHA-256 of the fixture bundle, stored in `seed_batch.source_manifest_sha256`.
- **Transaction:** the entire seed runs in one transaction. A failure rolls back.
- **Idempotence:** re-running the seeder upserts by natural key:
  - `medicine.id`;
  - `medicine_alternative.id`;
  - `pharmacy.id`;
  - `price_observation (medicine_id, pharmacy_id, sale_form)`;
  - `mdrp_ceiling.id`;
  - `seed_batch.id`.
- **No duplicates:** a second run leaves the same row counts.
- **No non-seed writes:** every row the seeder inserts or updates has `seed_batch_id = 'poc-seed'`. It never updates a row with a different or null `seed_batch_id`.
- **Refusal in pilot:** the seeder refuses to run when `APP_ENV = pilot` unless `ALLOW_POC_SEED=1` is explicitly set for a controlled test.

### 6.2 Seed tagging

Every seeded row in these tables carries `seed_batch_id = 'poc-seed'`:

- `medicine`
- `medicine_alternative`
- `mdrp_ceiling`
- `pharmacy`
- `price_observation`

`price_report` and `app_event` are never seeded. The `seed_batch` row itself is the batch.

The tag is the only wipe scope. There is no `poc_seed` boolean that could drift from the batch reference.

### 6.3 Wipe

The wipe is a script (ticket #42) and a documented SQL sequence. It must:

1. Refuse to run when `APP_ENV = pilot` unless `ALLOW_POC_WIPE=1`.
2. Verify exactly one `seed_batch` row with `kind = 'poc-seed'`.
3. Preflight for non-seed rows that depend on seeded rows:
   - non-seed `price_observation` referencing a seeded `medicine` or `pharmacy`;
   - non-seed `medicine_alternative` referencing a seeded `medicine`;
   - non-seed `price_observation` referencing a seeded `mdrp_ceiling`.
   If any exist, abort with a report; do not delete anything.
4. Snapshot the non-seed row counts of `price_report`, `app_event`, and any pilot rows.
5. Delete in dependency order, inside one transaction:

```sql
delete from price_observation
 where seed_batch_id = 'poc-seed';

delete from medicine_alternative
 where seed_batch_id = 'poc-seed';

delete from medicine
 where seed_batch_id = 'poc-seed';

delete from pharmacy
 where seed_batch_id = 'poc-seed';

delete from mdrp_ceiling
 where seed_batch_id = 'poc-seed';

delete from seed_batch
 where id = 'poc-seed' and kind = 'poc-seed';
```

6. Verify the non-seed counts are unchanged and no `poc-seed` rows remain.

The wipe never touches `price_report` or `app_event`. Reports survive with their snapshots; events remain anonymous.

### 6.4 Seed validation

The seeder runs these checks after writing, before commit. A failure rolls back.

- Exactly 50 `medicine` rows with `seed_batch_id = 'poc-seed'`.
- Exactly 10 `pharmacy` rows with `seed_batch_id = 'poc-seed'`.
- Exactly 49 `medicine_alternative` rows with `seed_batch_id = 'poc-seed'` (POC-028 has no candidate generic).
- Exactly one inactive medicine, POC-028, with `fda_registration_no is null`.
- Every medicine has three `price_observation` rows at every seeded pharmacy: `pack`, `strip`, and `loose`, including POC-028.
- The total is 1,500 `price_observation` rows: 50 medicines × 10 pharmacies × 3 forms.
- POC-028 has only `unknown` rows and no available observation; it remains unlistable.
- Every `available` row has a price, form label, `pack_quantity`, `pack_unit`, stock status, verification, and source.
- Every `available` row's `pack_unit` equals its medicine's `base_unit`.
- Every non-available row has no price, no quantity, no stock status, and no MDRP reference.
- Every `pack_only` row has an `available` pack row at the same pharmacy.
- Every `not_stocked` row belongs to a pair whose other two forms are also `not_stocked`.
- `not_applicable` is used only for a form that cannot apply (for example loose/strip on an inhaler, or strip/loose on a bottle).
- The 431 mocked pack prices from the previous seed remain available pack observations; new loose and strip observations are mocked and labelled.
- Mocked prices vary the cheapest pharmacy by medicine rather than applying one markup per pharmacy: a chain prices a medicine the same at every branch; Generika is cheapest on local brands and has no edge on multinational originator brands; independents vary more per medicine. One factor scales all forms of a medicine at a pharmacy, so form relationships hold. POC-016 keeps its prices for the MDRP demo.
- Every active medicine with a known reference pack has at least one available pack observation; POC-041 has only `unknown` rows.
- Every FK resolves: `medicine_alternative.medicine_id`, `price_observation.medicine_id`, `price_observation.pharmacy_id`, `price_observation.mdrp_entry_id`.
- `mdrp_ceiling` has 204 rows.
- Only POC-016 observations have `mdrp_entry_id`; every such observation references `EO104-044` and is `available`.
- POC-016 has `medicine.vat_exempt = true`, so its effective ceiling stays at the published PHP 30.31 and all nine seeded prices remain above it.
- The POC-016 attachment is per form: its available pack, strip, and loose observations all carry `EO104-044`; a `not_applicable` or unconfirmed form carries none.
- The mixed and VATable MDRP cases are not seed rows. They are covered by synthetic fixtures in the ranking unit tests and the browser/DB acceptance tests, which insert a VATable product with a VAT-exclusive ceiling, then remove it.
- No component-only MDRP attachment exists.
- The demo cases in section 6.5 are present.
- The seed is idempotent: run twice in a test database and compare row counts and natural keys.

### 6.5 Demo cases

The seed must make these states reachable from known searches and baskets. Exact prices, strip sizes, and pharmacy/medicine pairs are ticket #42; the shape and conditions are fixed here.

| Case | Seed condition | How to reach it |
|---|---|---|
| Complete exact basket | POC-001 and POC-036 are sellable loose at three or more pharmacies with different exact totals | Search `amlodipine`, add 5 tablets of POC-001; search `paracetamol`, add 10 tablets of POC-036 |
| Exact mix | A pharmacy sells a strip of 10 and loose tablets for POC-036, so 12 tablets is 1 strip + 2 loose | Same search; add 12 tablets |
| Sold per pack only | A pharmacy stocks POC-003 only as a pack of 30, with no loose or strip | Search `losartan`, add 10 tablets; inspect the pack-only bucket |
| Sold by the pack (`not_applicable`) | POC-019 is an inhaler; its loose and strip forms are `not_applicable`, and the pack is 200 actuations | Search `salbutamol`, add 30 actuations; inspect the pack-only bucket |
| Incomplete basket | One pharmacy has one of the two demo items, not the other | Same POC-001 + POC-036 basket; inspect `incomplete` |
| Not stocked | A pharmacy has all three forms of POC-036 as `not_stocked` | Same basket; inspect `missing_items` reason `not_stocked` |
| Per-form stock | At one pharmacy, POC-001 pack is in stock, strip is out of stock, loose is in stock | Search `amlodipine`, add 5 tablets; the exact line uses loose |
| Stale record | A POC-036 loose observation older than 14 days remains sellable and is flagged `stale: true` | Same paracetamol basket; inspect the chosen component |
| MDRP loose vs pack | POC-016 has an observed loose price, a strip rate, and a box rate, all above the VAT-exempt PHP 30.31/tablet ceiling; no result is marked cheapest | Search `janumet` or `metformin sitagliptin`, open results and the price block |
| No price | POC-041 is active but has no known reference pack; all three forms at all pharmacies are `unknown` | Search `omeprazole`; the medicine is returned with `available_forms: []`, and results show no price data |
| Muted no-price pharmacy | A pharmacy has no sellable form for either demo basket item | Same POC-001 + POC-036 basket; inspect `no_price_data` |
| Rx vs OTC | POC-001 is Rx; POC-036 is OTC | Same basket |
| Low-confidence scan | Sample prescription A includes POC-025 at confidence 0.41 | Scan sample A |
| Unknown scan image | Any other image returns the default script | Scan any non-sample image |
| Report persistence | A report on a result remains visible after reload | Report a result, reload, inspect `reported` |

POC-028 is inactive because no FDA-registered product was found. It must not appear in search or results.

### 6.6 Catalog mapping rules

The seeder maps the research JSON to the schema as follows.

| Research field | Schema |
|---|---|
| `sku_id` | `medicine.id` |
| `category` | `medicine.category` |
| `brand_name` | `medicine.brand_name`; `"Unavailable..."` becomes null |
| `generic_name` | `medicine.generic_name` |
| `strength` | `medicine.strength` |
| `dosage_form` | `medicine.dosage_form` |
| `price_reference.unit_basis` or the dosage form | `medicine.base_unit` |
| `manufacturer` | `medicine.manufacturer`; `"Unavailable..."` becomes null |
| `rx_otc` | `medicine.rx_otc`; normalize the POC-028 research note to `Rx` |
| `fda_registration.registration_number` | `medicine.fda_registration_no` |
| `fda_registration.expiry_date` | `medicine.fda_registration_expiry` (parse to ISO date) |
| `pnf.listed` / `entry` / `page` | `medicine.pnf_listed` / `pnf_entry` / `pnf_page` |
| `konsulta.listed` / `entry` / `as_of` | `medicine.konsulta_listed` / `konsulta_entry` / `konsulta_as_of` |
| `candidate_generic.*` | one `medicine_alternative` row; its pack goes to `reference_pack_size` |
| `mdrp.*` | validation against `mdrp_ceiling` `EO104-044`; the ceiling itself comes from the MDRP fixture |
| `price_reference.pack` | the pack observation's `form_label`, `pack_quantity`, and `pack_unit` |
| `price_reference.unit_basis` | the pack observation's `pack_unit` and the medicine's `base_unit` |

`medicine.active` is false only for POC-028. `medicine.data_source` records the research provenance, for example `FDA Verification Portal; DOH PNF; PhilHealth Konsulta`. `medicine.generic_group_id` is null in the POC; candidate generics are the separate table.

The pharmacy mapping:

| Research field | Schema |
|---|---|
| `id` | `pharmacy.id` |
| `name`, `brand`, `type`, `address`, `barangay` | same-named columns |
| `latitude`, `longitude` | same-named columns |
| `hours` | `hours_text` plus `open_24h` / `opening_hours` |
| `phone` | `phone` |
| `source_type` | `data_source` |
| `source_url` | `source_url` |
| `confidence` | `coordinate_confidence` |
| `notes` | `notes` |
| `verified_fields` / `unverified_fields` | expressed as non-null vs null columns; the caveats go in `notes` |

`verification_status` is `verified` for all 10 seeded pharmacies because their identities come from official or registry sources. A medium-confidence coordinate is recorded as `coordinate_confidence = 'medium'` and explained in `notes`; it does not make the pharmacy record unverified.

### 6.7 Price fixture shape

Ticket #42 writes observations in this shape. A pack row:

```json
{
  "medicine_id": "POC-001",
  "pharmacy_id": "mercury-naga-penafrancia",
  "sale_form": "pack",
  "sale_state": "available",
  "form_label": "Box of 100 tablets",
  "shelf_price_php": 120.0,
  "pack_quantity": 100,
  "pack_unit": "tablet",
  "stock_status": "in_stock",
  "verified_at": "2026-10-20T00:00:00Z",
  "verified_by": "poc-seed",
  "source": "poc-seed",
  "notes": "Mock POC price; not collected."
}
```

A strip and a loose row for the same pair:

```json
[
  {
    "medicine_id": "POC-001",
    "pharmacy_id": "mercury-naga-penafrancia",
    "sale_form": "strip",
    "sale_state": "available",
    "form_label": "Strip of 10 tablets",
    "shelf_price_php": 14.0,
    "pack_quantity": 10,
    "pack_unit": "tablet",
    "stock_status": "in_stock",
    "verified_at": "2026-10-20T00:00:00Z",
    "verified_by": "poc-seed",
    "source": "poc-seed",
    "notes": "Mock POC price; not collected."
  },
  {
    "medicine_id": "POC-001",
    "pharmacy_id": "mercury-naga-penafrancia",
    "sale_form": "loose",
    "sale_state": "available",
    "form_label": "Loose tablet",
    "shelf_price_php": 1.5,
    "pack_quantity": 1,
    "pack_unit": "tablet",
    "stock_status": "in_stock",
    "verified_at": "2026-10-20T00:00:00Z",
    "verified_by": "poc-seed",
    "source": "poc-seed",
    "notes": "Mock POC price; not collected."
  }
]
```

A non-sale state carries no price:

```json
{
  "medicine_id": "POC-003",
  "pharmacy_id": "mercury-naga-penafrancia",
  "sale_form": "loose",
  "sale_state": "pack_only",
  "form_label": null,
  "shelf_price_php": null,
  "pack_quantity": null,
  "pack_unit": null,
  "stock_status": null,
  "verified_at": "2026-10-20T00:00:00Z",
  "verified_by": "poc-seed",
  "source": "poc-seed",
  "notes": "Only sold as a box."
}
```

`not_applicable`, `not_stocked`, and `unknown` use the same null price fields with the corresponding state. The seeder may omit null fields in the fixture and normalize them on load.

MDRP attachment is not written by hand in the price fixture. The seeder attaches `mdrp_entry_id` from the exact match table. For POC-016, every available form gets `EO104-044`; no other medicine gets a ceiling.

---

## 7. HTTP API contract

All endpoints are same-origin, behind Caddy basic auth, and return `Cache-Control: no-store`. The service worker must bypass `/api/*`; the POC has no offline price data.

### 7.1 Route summary

| Method | Path | Purpose | Persists |
|---|---|---|---|
| `GET` | `/api/config` | Client runtime config | No |
| `GET` | `/api/health` | Deploy health check | No |
| `GET` | `/api/search` | Autocomplete and exact-product lookup | No |
| `POST` | `/api/basket` | Validate and resolve a basket | No |
| `POST` | `/api/results` | Rank pharmacies for a basket | No |
| `GET` | `/api/pharmacies/{pharmacy_id}` | Pharmacy detail and form prices | No |
| `GET` | `/api/pharmacies` | Pharmacy directory for the home map | No |
| `GET` | `/api/directions` | Native road route from the device origin to a pharmacy | No |
| `POST` | `/api/scan` | Mock OCR; returns medicine candidates | No |
| `POST` | `/api/reports` | Create a wrong-price/stock report | Yes |
| `GET` | `/api/reports` | Report summary for a result | No |
| `POST` | `/api/events` | Anonymous event batch | Yes |

### 7.2 Shared DTOs

```ts
type RxOtc = "Rx" | "OTC";
type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "unknown";
type BaseUnit = "tablet" | "capsule" | "mL" | "g" | "actuation" | "sachet" | "unit-dose";
type SaleForm = "pack" | "strip" | "loose";
type SaleState = "available" | "pack_only" | "not_applicable" | "not_stocked" | "unknown";

interface MedicineSummary {
  medicine_id: string;
  category: string;
  brand_name: string | null;
  generic_name: string;
  strength: string;
  dosage_form: string;
  base_unit: BaseUnit;
  manufacturer: string | null;
  rx_otc: RxOtc;
  pnf_listed: boolean | null;
  konsulta_listed: boolean | null;
}

interface BasketItemInput {
  medicine_id: string;
  quantity: number;
  unit: BaseUnit;
}

interface BasketItem extends BasketItemInput {
  medicine: MedicineSummary;
}

interface Basket {
  items: BasketItem[];
  item_count: number;
  currency: "PHP";
}

interface SaleFormOffer {
  sale_form: SaleForm;
  sale_state: SaleState;
  form_label: string | null;
  pack_quantity: number | null;
  pack_unit: BaseUnit | null;
  shelf_price_php: number | null;
  stock_status: StockStatus | null;
  verified_at: string | null;
  stale: boolean | null;
  mdrp: MdrpInfo | null;
}

interface MdrpInfo {
  entry_id: string;
  order: string;
  annex_row: number;
  ceiling_php: number;
  effective_ceiling_php: number;
  ceiling_basis: "per_unit" | "per_pack";
  ceiling_unit: string | null;
  vat_exclusive: boolean;
  vat_exempt: boolean | null;
  observed_rate_php: number;
  rate_basis: "loose_price" | "strip_rate" | "box_rate" | "pack_price";
  above: boolean;
  source_url: string;
  checked_at: string;
}

interface FulfillmentComponent {
  sale_form: SaleForm;
  form_label: string;
  pack_quantity: number;
  pack_unit: BaseUnit;
  count: number;
  shelf_price_php: number;
  line_total_php: number;
  stock_status: StockStatus;
  verified_at: string;
  stale: boolean;
  mdrp: MdrpInfo | null;
}

interface PackOnlyLine {
  medicine_id: string;
  quantity: number;
  unit: BaseUnit;
  sale_form: "pack" | "strip";
  form_label: string;
  pack_quantity: number;
  pack_unit: BaseUnit;
  shelf_price_php: number;
  buy_quantity: number;
  covers_quantity: number;
  covering_total_php: number;
  stock_status: StockStatus;
  stale: boolean;
  copy: "sold_per_pack_only" | "sold_by_the_pack" | "sold_by_the_strip";
}
```

`MedicineSummary` deliberately omits FDA registration, internal provenance, and a single pack. Those are seed/audit fields or a sale-form detail, not patient-facing medicine identity.

`SaleFormOffer` is the full per-form state for pharmacy detail. In results, the chosen exact components are `FulfillmentComponent` values; a non-available form is not a price line.

### 7.3 `GET /api/config`

Returns the client runtime configuration. The demo badge is driven by `demo_mode`, not by a client-side guess.

```json
{
  "app_env": "dev",
  "demo_mode": true,
  "currency": "PHP",
  "locale": "en-PH",
  "naga_center": { "latitude": 13.6215, "longitude": 123.1945 },
  "scan_provider": "mock"
}
```

`demo_mode` is `app_env !== "pilot"`. The client also sets `<meta name="robots" content="noindex">` and the server sets `X-Robots-Tag: noindex`.

### 7.4 `GET /api/health`

```json
{
  "status": "ok",
  "database": "ok",
  "app_env": "dev",
  "seed_batch": "poc-seed"
}
```

`503` with `status: "degraded"` when the database is unreachable. This endpoint is for the Compose/Caddy health check, not the UI.

### 7.5 `GET /api/search`

Query parameters:

| Name | Required | Rules |
|---|---|---|
| `q` | No | Trimmed; 0–80 characters. Empty returns an empty result. |
| `limit` | No | 1–10; default 8. |

Search is case-insensitive over brand and generic names, with `pg_trgm` for 1–2 typo tolerance. Prefix matches rank before trigram matches; then similarity descending; then brand name ascending. Only `active = true` medicines are returned. Candidate generics are not returned as search rows; the response carries their count.

Response:

```json
{
  "query": "amlo",
  "items": [
    {
      "medicine": {
        "medicine_id": "POC-001",
        "category": "Cardiovascular",
        "brand_name": "Norvasc",
        "generic_name": "Amlodipine (as besilate/camsylate)",
        "strength": "5 mg",
        "dosage_form": "Tablet",
        "base_unit": "tablet",
        "manufacturer": "Viatris Pharmaceuticals LLC",
        "rx_otc": "Rx",
        "pnf_listed": true,
        "konsulta_listed": true
      },
      "match": { "field": "brand", "type": "prefix", "score": 0.92 },
      "available_forms": ["pack", "strip", "loose"],
      "candidate_generic_count": 1
    }
  ],
  "total": 1
}
```

- `match.field`: `brand`, `generic`, or `both`.
- `match.type`: `exact`, `prefix`, or `trigram`.
- `match.score`: 0–1.
- `available_forms`: the union of forms with at least one sellable observation at a seeded pharmacy, in the order `pack`, `strip`, `loose`. An empty array means no sellable form; the medicine is still returned (POC-041).
- `total` is the number of returned items, not a database total.

Empty state: `200` with `items: []` and `total: 0`. A query that is too long or a limit outside the range is `400 INVALID_QUERY`.

### 7.6 `POST /api/basket`

Validates and resolves a basket without pricing it. The scan confirm screen and manual add flow use this to turn IDs into canonical medicine summaries before calling results.

Request:

```json
{
  "items": [
    { "medicine_id": "POC-001", "quantity": 5, "unit": "tablet" },
    { "medicine_id": "POC-036", "quantity": 10, "unit": "tablet" }
  ]
}
```

Response `200`:

```json
{
  "basket": {
    "items": [
      {
        "medicine_id": "POC-001",
        "quantity": 5,
        "unit": "tablet",
        "medicine": {
          "medicine_id": "POC-001",
          "category": "Cardiovascular",
          "brand_name": "Norvasc",
          "generic_name": "Amlodipine (as besilate/camsylate)",
          "strength": "5 mg",
          "dosage_form": "Tablet",
          "base_unit": "tablet",
          "manufacturer": "Viatris Pharmaceuticals LLC",
          "rx_otc": "Rx",
          "pnf_listed": true,
          "konsulta_listed": true
        }
      },
      {
        "medicine_id": "POC-036",
        "quantity": 10,
        "unit": "tablet",
        "medicine": {
          "medicine_id": "POC-036",
          "category": "Pain / fever",
          "brand_name": "Biogesic",
          "generic_name": "Paracetamol",
          "strength": "500 mg",
          "dosage_form": "Tablet",
          "base_unit": "tablet",
          "manufacturer": "UNILAB, Inc.",
          "rx_otc": "OTC",
          "pnf_listed": true,
          "konsulta_listed": true
        }
      }
    ],
    "item_count": 2,
    "currency": "PHP"
  }
}
```

Errors:

- `400 INVALID_REQUEST` — missing `items` or a malformed quantity.
- `422 UNKNOWN_MEDICINE` — an ID does not exist or is inactive; `details.medicine_ids` lists them.
- `422 DUPLICATE_MEDICINE` — the same ID appears twice.
- `422 INVALID_UNIT` — the unit is missing or differs from the medicine's `base_unit`.
- `422 INVALID_QUANTITY` — the quantity is non-positive, has the wrong integer/decimal shape, or exceeds the 100,000-unit sanity ceiling.
- `422 BASKET_TOO_LARGE` — more than 10 items.

The endpoint never persists the basket.

### 7.7 `POST /api/results`

Ranks pharmacies for a quantity basket. This is the single ranking endpoint for both single-item searches and multi-item baskets.

Request:

```json
{
  "items": [
    { "medicine_id": "POC-001", "quantity": 5, "unit": "tablet" },
    { "medicine_id": "POC-036", "quantity": 10, "unit": "tablet" }
  ],
  "origin": { "latitude": 13.6215, "longitude": 123.1945 },
  "sort": "price"
}
```

- `items`: same rules as `/api/basket`. Required.
- `origin`: optional. Latitude -90..90, longitude -180..180. If omitted or null, the server uses `NAGA_CENTER_LAT` / `NAGA_CENTER_LNG` (default `13.6215`, `123.1945`) and reports `source: "naga_center"`.
- `sort`: `price` (default) or `distance`. `price` uses the exact-fulfillment ranking with compliant complete baskets before above-ceiling complete baskets. `distance` keeps the MDRP tier first, then orders complete baskets by distance, then total; pack-only entries by distance, then covering total; incomplete and no-price ordering is unchanged.

Response `200`:

```json
{
  "basket": {
    "items": [
      { "medicine_id": "POC-001", "quantity": 5, "unit": "tablet", "medicine": { "...": "MedicineSummary" } },
      { "medicine_id": "POC-036", "quantity": 10, "unit": "tablet", "medicine": { "...": "MedicineSummary" } }
    ],
    "item_count": 2,
    "currency": "PHP"
  },
  "origin": {
    "latitude": 13.6215,
    "longitude": 123.1945,
    "source": "device"
  },
  "complete": [
    {
      "result_key": "mercury-naga-penafrancia|POC-001,POC-036",
      "pharmacy": { "...": "PharmacySummary" },
      "status": "complete",
      "complete": true,
      "items": [
        {
          "medicine_id": "POC-001",
          "quantity": 5,
          "unit": "tablet",
          "outcome": "exact",
          "components": [
            {
              "sale_form": "loose",
              "form_label": "Loose tablet",
              "pack_quantity": 1,
              "pack_unit": "tablet",
              "count": 5,
              "shelf_price_php": 1.2,
              "line_total_php": 6.0,
              "stock_status": "in_stock",
              "verified_at": "2026-10-20T00:00:00Z",
              "stale": false,
              "mdrp": null
            }
          ],
          "total_shelf_price_php": 6.0,
          "forms": [
            { "sale_form": "pack", "sale_state": "available", "form_label": "Box of 100 tablets", "pack_quantity": 100, "pack_unit": "tablet", "shelf_price_php": 120.0, "stock_status": "in_stock", "verified_at": "2026-10-20T00:00:00Z", "stale": false, "mdrp": null },
            { "sale_form": "strip", "sale_state": "pack_only", "form_label": null, "pack_quantity": null, "pack_unit": null, "shelf_price_php": null, "stock_status": null, "verified_at": null, "stale": null, "mdrp": null },
            { "sale_form": "loose", "sale_state": "available", "form_label": "Loose tablet", "pack_quantity": 1, "pack_unit": "tablet", "shelf_price_php": 1.2, "stock_status": "in_stock", "verified_at": "2026-10-20T00:00:00Z", "stale": false, "mdrp": null }
          ]
        },
        {
          "medicine_id": "POC-036",
          "quantity": 10,
          "unit": "tablet",
          "outcome": "exact",
          "components": [
            {
              "sale_form": "strip",
              "form_label": "Strip of 10 tablets",
              "pack_quantity": 10,
              "pack_unit": "tablet",
              "count": 1,
              "shelf_price_php": 12.0,
              "line_total_php": 12.0,
              "stock_status": "in_stock",
              "verified_at": "2026-10-20T00:00:00Z",
              "stale": false,
              "mdrp": null
            }
          ],
          "total_shelf_price_php": 12.0,
          "forms": [ "...": "SaleFormOffer[]" ]
        }
      ],
      "total_shelf_price_php": 18.0,
      "known_total_php": 18.0,
      "covering_total_php": null,
      "missing_items": [],
      "above_mdrp_ceiling": false,
      "reported": false,
      "reported_at": null
    }
  ],
  "sold_per_pack_only": [
    {
      "result_key": "south-star-naga-15|POC-001,POC-036",
      "pharmacy": { "...": "PharmacySummary" },
      "status": "sold_per_pack_only",
      "complete": false,
      "items": [
        {
          "medicine_id": "POC-036",
          "quantity": 10,
          "unit": "tablet",
          "outcome": "sold_per_pack_only",
          "pack_only": {
            "sale_form": "pack",
            "form_label": "Box of 500 tablets",
            "pack_quantity": 500,
            "pack_unit": "tablet",
            "shelf_price_php": 125.0,
            "buy_quantity": 1,
            "covers_quantity": 500,
            "covering_total_php": 125.0,
            "stock_status": "in_stock",
            "stale": false,
            "copy": "sold_per_pack_only"
          },
          "components": [],
          "total_shelf_price_php": null,
          "forms": [ "...": "SaleFormOffer[]" ]
        },
        { "medicine_id": "POC-001", "quantity": 5, "unit": "tablet", "outcome": "exact", "components": [ "...": "FulfillmentComponent[]" ], "total_shelf_price_php": 6.0, "forms": [ "...": "SaleFormOffer[]" ] }
      ],
      "total_shelf_price_php": null,
      "known_total_php": 6.0,
      "covering_total_php": 131.0,
      "missing_items": [],
      "above_mdrp_ceiling": false,
      "reported": false,
      "reported_at": null
    }
  ],
  "incomplete": [
    {
      "result_key": "nueva-farmacia-naga|POC-001,POC-036",
      "pharmacy": { "...": "PharmacySummary" },
      "status": "incomplete",
      "complete": false,
      "items": [
        { "medicine_id": "POC-001", "quantity": 5, "unit": "tablet", "outcome": "not_stocked", "components": [], "total_shelf_price_php": null, "forms": [ "...": "SaleFormOffer[]" ] },
        { "medicine_id": "POC-036", "quantity": 10, "unit": "tablet", "outcome": "exact", "components": [ "...": "FulfillmentComponent[]" ], "total_shelf_price_php": 12.0, "forms": [ "...": "SaleFormOffer[]" ] }
      ],
      "total_shelf_price_php": null,
      "known_total_php": 12.0,
      "covering_total_php": null,
      "missing_items": [
        {
          "medicine_id": "POC-001",
          "brand_name": "Norvasc",
          "generic_name": "Amlodipine (as besilate/camsylate)",
          "strength": "5 mg",
          "dosage_form": "Tablet",
          "reason": "not_stocked"
        }
      ],
      "above_mdrp_ceiling": false,
      "reported": false,
      "reported_at": null
    }
  ],
  "no_price_data": [
    {
      "pharmacy": { "...": "PharmacySummary" }
    }
  ],
  "candidate_generics": [
    {
      "for_medicine_id": "POC-001",
      "items": [
        {
          "brand_name": "Amlostan",
          "manufacturer": "Lloyd Laboratories, Inc.",
          "reference_pack_size": "Box of 100 tablets",
          "rx_otc": "Rx",
          "fda_registration_no": "DR-XY...",
          "note": "Candidate generic alternative; not a therapeutic-equivalence claim."
        }
      ]
    }
  ],
  "meta": {
    "generated_at": "2026-10-21T10:00:00Z",
    "sort": "price",
    "currency": "PHP",
    "stale_after_days": 14
  }
}
```

Result shape details:

- `status`: `complete`, `sold_per_pack_only`, or `incomplete`. `complete` is true only for exact results. Entries in `no_price_data` have no result status.
- `items[].outcome`: `exact`, `sold_per_pack_only`, `not_stocked`, `out_of_stock`, `stock_unknown`, or `no_price`.
- `items[].components`: the chosen exact components, one per form used. Empty for a non-exact item.
- `items[].pack_only`: the covering purchase for a non-exact item with a sellable form. Absent otherwise.
- `items[].forms`: every form offer at the pharmacy for that medicine, including `pack_only`, `not_applicable`, `not_stocked`, and `unknown`, so the UI can explain the state.
- `above_mdrp_ceiling`: true when at least one chosen component (or the covering purchase, for a pack-only item) has `mdrp.above = true`. For complete results it controls the two-tier ranking and the cheapest highlight; for the other groups it is informational.
- `total_shelf_price_php`: the exact basket total, or null when the result is not exact.
- `known_total_php`: the sum of exact item totals; 0 when none. It is present on every result.
- `covering_total_php`: the amount the patient must buy for the whole basket (exact items plus covering purchases); non-null only when the result has at least one pack-only item, otherwise null.
- `missing_items`: empty for complete and pack-only results; otherwise one entry per missing item with a `reason`.
- `reported`: true when at least one `price_report` exists for `result_key`.
- `reported_at`: the latest report's `created_at`, or null.
- `candidate_generics`: one entry per basket medicine that has candidates. Never mixed into `complete`, `sold_per_pack_only`, or `incomplete`.
- `no_price_data` entries carry only the pharmacy summary. They are not reportable results because there is no price result to report.

Errors:

- `400 INVALID_REQUEST` / `INVALID_ORIGIN` — malformed basket or coordinates.
- `422 UNKNOWN_MEDICINE` / `DUPLICATE_MEDICINE` / `BASKET_TOO_LARGE` / `INVALID_UNIT` / `INVALID_QUANTITY`.
- `500 INTERNAL` — unexpected failure.

Empty states:

- No active medicine matches: the endpoint rejects unknown IDs with `422`; it does not return an empty basket.
- No pharmacy has any sellable form for the basket: `complete: []`, `sold_per_pack_only: []`, `incomplete: []`, and `no_price_data` contains every pharmacy. This is a valid `200`.
- No candidate generics: `candidate_generics: []`.

### 7.8 `GET /api/pharmacies/{pharmacy_id}`

Basket lines are carried as repeatable `items` values, one per line:

```text
GET /api/pharmacies/mercury-naga-penafrancia?items=POC-001:5:tablet&items=POC-036:10:tablet
```

Query parameters:

| Name | Required | Rules |
|---|---|---|
| `items` | No | Repeatable basket line, `medicine_id:quantity:unit`. 1–10 unique medicines. Omit for the full stock list. |
| `origin_latitude` | No | With `origin_longitude`; valid coordinates. |
| `origin_longitude` | No | With `origin_latitude`; valid coordinates. |

Response `200`:

```json
{
  "pharmacy": {
    "pharmacy_id": "mercury-naga-penafrancia",
    "name": "Mercury Drug – Naga City Peñafrancia",
    "brand": "Mercury Drug",
    "type": "chain",
    "address": "Panganiban St. cor. Peñafrancia St., Naga City, 4400 Camarines Sur",
    "barangay": "Dinaga",
    "latitude": 13.623234,
    "longitude": 123.185995,
    "phone": "(054) 472-3214 / (054) 811-2228 / (0968) 878-7678",
    "hours_text": "24 hours",
    "opening_hours": null,
    "open_24h": true,
    "open_now": true,
    "distance_m": 850,
    "verification_status": "verified"
  },
  "medicines": [
    {
      "medicine_id": "POC-001",
      "category": "Cardiovascular",
      "brand_name": "Norvasc",
      "generic_name": "Amlodipine (as besilate/camsylate)",
      "strength": "5 mg",
      "dosage_form": "Tablet",
      "base_unit": "tablet",
      "manufacturer": "Viatris Pharmaceuticals LLC",
      "rx_otc": "Rx",
      "pnf_listed": true,
      "konsulta_listed": true
    }
  ],
  "forms": [
    {
      "medicine_id": "POC-001",
      "forms": [
        {
          "sale_form": "pack",
          "sale_state": "available",
          "form_label": "Box of 100 tablets",
          "pack_quantity": 100,
          "pack_unit": "tablet",
          "shelf_price_php": 120.0,
          "stock_status": "in_stock",
          "verified_at": "2026-10-20T00:00:00Z",
          "stale": false,
          "mdrp": null
        },
        {
          "sale_form": "strip",
          "sale_state": "available",
          "form_label": "Strip of 10 tablets",
          "pack_quantity": 10,
          "pack_unit": "tablet",
          "shelf_price_php": 14.0,
          "stock_status": "in_stock",
          "verified_at": "2026-10-20T00:00:00Z",
          "stale": false,
          "mdrp": null
        },
        {
          "sale_form": "loose",
          "sale_state": "available",
          "form_label": "Loose tablet",
          "pack_quantity": 1,
          "pack_unit": "tablet",
          "shelf_price_php": 1.5,
          "stock_status": "in_stock",
          "verified_at": "2026-10-20T00:00:00Z",
          "stale": false,
          "mdrp": null
        }
      ]
    }
  ],
  "basket": {
    "items": [
      {
        "medicine_id": "POC-001",
        "quantity": 5,
        "unit": "tablet",
        "outcome": "exact",
        "components": [
          {
            "sale_form": "loose",
            "form_label": "Loose tablet",
            "pack_quantity": 1,
            "pack_unit": "tablet",
            "count": 5,
            "shelf_price_php": 1.5,
            "line_total_php": 7.5,
            "stock_status": "in_stock",
            "verified_at": "2026-10-20T00:00:00Z",
            "stale": false,
            "mdrp": null
          }
        ],
        "total_shelf_price_php": 7.5,
        "forms": [ "...": "SaleFormOffer[]" ]
      }
    ],
    "status": "complete",
    "complete": true,
    "total_shelf_price_php": 7.5,
    "known_total_php": 7.5,
    "covering_total_php": null,
    "missing_items": []
  }
}
```

- `forms` is the per-medicine form list, with all three states, for the detail sheet's stock list and the pack-only/not-applicable labels.
- `medicines` carries the `MedicineSummary` for every medicine in `forms`, so the detail sheet can label its stock list without a second catalog request. It is an additive field on this response only.
- When `items` is omitted, `medicines` and `forms` contain every active medicine with at least one `available` form at the pharmacy. When supplied, they contain every requested medicine, including `not_stocked` and `unknown` rows, so the basket explanation is complete.
- `basket` is present only when `items` is supplied. It carries the requested quantities and units and uses the same exact-fulfillment, pack-only, and completeness rules as results, so the detail total matches the results total for the same basket.
- Directions are requested from `GET /api/directions`; the detail response carries no external maps URL. The client keeps the patient in the embedded map.
- `open_now` is null when hours are unknown. `hours_text` is the display string; the client must not parse it to decide open/closed.
- `distance_m` uses the supplied origin or the Naga center fallback.

Errors:

- `404 UNKNOWN_PHARMACY` — no such pharmacy.
- `400 INVALID_REQUEST` — an `items` value is not `medicine_id:quantity:unit`.
- `422 UNKNOWN_MEDICINE` — an inactive or missing ID in `items`.
- `422 DUPLICATE_MEDICINE` / `INVALID_UNIT` / `INVALID_QUANTITY` / `BASKET_TOO_LARGE` — the same basket rules as `/api/basket`.
- `400 INVALID_ORIGIN` — one coordinate without the other or out of range.

Empty state: a pharmacy with no sellable form for a requested basket returns `forms` with all `not_stocked`/`unknown` states and an incomplete basket with all items missing. This is the muted no-price pharmacy.

#### `GET /api/pharmacies` — pharmacy directory

The home map pins every seeded pharmacy before any basket exists. The directory takes no parameters and carries no prices.

```json
{
  "pharmacies": [
    {
      "pharmacy_id": "mercury-naga-penafrancia",
      "name": "Mercury Drug - Penafrancia",
      "latitude": 13.6262,
      "longitude": 123.1906,
      "verification_status": "verified"
    }
  ],
  "cheapest_pharmacy_id": "generika-lcc-cbd2"
}
```

`cheapest_pharmacy_id` names the pharmacy whose prices run lowest across the catalog, or is `null` when none qualifies. It is a catalog-wide price index, not a basket ranking, and never replaces §4.6:

1. Take each verified pharmacy's lowest `available`, non-stale `unit_rate_php` per active medicine.
2. For each medicine priced at two or more of those pharmacies, divide each rate by that medicine's median rate.
3. A pharmacy's index is the median of its ratios. Pharmacies pricing fewer than half as many medicines as the best-covered pharmacy are skipped.
4. The lowest index wins; ties resolve by `pharmacy_id`.

Unverified pharmacies are listed but never named cheapest.

### 7.9 `GET /api/directions`

Native route preview from the device origin to a pharmacy. The client draws the returned geometry in the embedded map; it does not hand off to an external maps app.

Query parameters:

| Name | Required | Rules |
|---|---|---|
| `pharmacy_id` | Yes | Existing pharmacy ID. |
| `origin_latitude` | Yes | -90..90; the device origin. |
| `origin_longitude` | Yes | -180..180; the device origin. |

There is no Naga-center fallback. A missing, partial, or out-of-range origin is `400 INVALID_ORIGIN`: a route from a placeholder location would be false information.

Response `200`:

```json
{
  "pharmacy_id": "generika-lcc-cbd2",
  "origin": { "latitude": 13.6215, "longitude": 123.1945 },
  "route": {
    "type": "LineString",
    "coordinates": [
      [123.1945, 13.6215],
      [123.1912, 13.6204],
      [123.189712, 13.619626]
    ]
  },
  "distance_m": 1234,
  "duration_s": 456,
  "provider": "osrm",
  "generated_at": "2026-10-21T10:00:00Z"
}
```

Rules:

- `route.coordinates` are GeoJSON `[longitude, latitude]` pairs in travel order, with at most 5,000 points. The server requests a simplified overview, not a full-resolution trace.
- `distance_m` and `duration_s` are non-negative integers from the routing provider. The client formats them and labels them as an estimate.
- `provider` identifies the routing adapter. The client must not depend on a specific value.
- `generated_at` is the server's response time.
- The endpoint is stateless: it holds the origin in memory for the request and never stores or logs it.
- This is a route preview, not turn-by-turn navigation. The response carries no manoeuvre instructions, traffic model, or live position.
- The server sends the origin and pharmacy coordinates to the configured routing provider. The browser never calls the routing provider directly.

Errors:

- `400 INVALID_REQUEST` / `INVALID_ORIGIN` — malformed query or missing/invalid origin.
- `404 UNKNOWN_PHARMACY` — the pharmacy ID does not exist.
- `503 ROUTING_UNAVAILABLE` — the provider is unreachable or returned no usable route.
- `504 ROUTING_TIMEOUT` — the provider exceeded the 8-second timeout.

### 7.10 `POST /api/scan`

Multipart form data. The endpoint is the OCR seam.

Request fields:

| Field | Required | Rules |
|---|---|---|
| `image` | Yes | JPEG, PNG, or WebP; max 8 MB; max 4096×4096; min 320×320 |
| `consent` | Yes | The literal string `true` |
| `consent_version` | Yes | Must match the server's current version, for example `poc-2026-10` |

The server reads the image into memory, calls the configured provider, and discards the bytes. It never writes a temp file, never stores the image, and never stores recognized text. It does not log the request body, file name, or any extracted text.

Response `200`:

```json
{
  "scan_id": "3f2c7c1e-6b1a-4b6e-9a0e-1b2c3d4e5f60",
  "provider": "mock",
  "mock_script_id": "sample-rx-a",
  "items": [
    {
      "line_no": 1,
      "suggested_medicine": {
        "medicine_id": "POC-001",
        "category": "Cardiovascular",
        "brand_name": "Norvasc",
        "generic_name": "Amlodipine (as besilate/camsylate)",
        "strength": "5 mg",
        "dosage_form": "Tablet",
        "base_unit": "tablet",
        "manufacturer": "Viatris Pharmaceuticals LLC",
        "rx_otc": "Rx",
        "pnf_listed": true,
        "konsulta_listed": true
      },
      "confidence": 0.96,
      "low_confidence": false,
      "other_matches": []
    },
    {
      "line_no": 2,
      "suggested_medicine": {
        "medicine_id": "POC-036",
        "category": "Pain / fever",
        "brand_name": "Biogesic",
        "generic_name": "Paracetamol",
        "strength": "500 mg",
        "dosage_form": "Tablet",
        "base_unit": "tablet",
        "manufacturer": "UNILAB, Inc.",
        "rx_otc": "OTC",
        "pnf_listed": true,
        "konsulta_listed": true
      },
      "confidence": 0.93,
      "low_confidence": false,
      "other_matches": []
    },
    {
      "line_no": 3,
      "suggested_medicine": {
        "medicine_id": "POC-025",
        "category": "Anti-infective",
        "brand_name": "Amoxil",
        "generic_name": "Amoxicillin (as trihydrate)",
        "strength": "500 mg",
        "dosage_form": "Capsule",
        "base_unit": "capsule",
        "manufacturer": "Glaxo Wellcome Production",
        "rx_otc": "Rx",
        "pnf_listed": true,
        "konsulta_listed": true
      },
      "confidence": 0.41,
      "low_confidence": true,
      "other_matches": [
        {
          "medicine": { "...": "MedicineSummary" },
          "confidence": 0.22
        }
      ]
    }
  ],
  "warnings": ["LOW_CONFIDENCE_ITEM"],
  "image_retained": false,
  "processed_at": "2026-10-21T10:00:02Z"
}
```

Rules:

- `low_confidence` is `confidence < 0.6`. The client must ask the user to confirm or edit every low-confidence item; it never auto-adds.
- `suggested_medicine` may be null when the provider cannot map a line to an active medicine. The client falls back to manual search for that line.
- `other_matches` is at most 3; it is an OCR match list, not a therapeutic-equivalence claim.
- `warnings` values: `LOW_CONFIDENCE_ITEM`, `NO_MATCH`, `DEFAULT_SCRIPT`.
- `image_retained` is always `false`; it is a contract guarantee, not a provider hint.
- `scan_id` is an ephemeral correlation UUID for the client. It is not stored. It is not linked to a patient or a session.
- The endpoint does not interpret dosage, sig codes, or quantity. The confirm screen sets a quantity in the base unit (default 1, editable) and sends the confirmed basket to `/api/basket` and `/api/results`.

Mock behavior:

- The client bundles three sample prescription images. The server has a manifest of their SHA-256 hashes and scripted results:
  - `sample-rx-a`: POC-001, POC-036, POC-025 (low confidence);
  - `sample-rx-b`: POC-016, POC-042;
  - `sample-rx-c`: POC-019, POC-046 (low confidence).
- Any other image returns the default script (POC-001, POC-036) after a short fixed delay, with `mock_script_id: "default"`.
- The sample images contain fictional or cropped data; no real patient information.
- The mock does not OCR. It hashes the bytes and returns a script.

Errors:

| Status | Code | When |
|---|---|---|
| `400` | `MISSING_IMAGE` | No `image` part |
| `413` | `IMAGE_TOO_LARGE` | Over 8 MB |
| `415` | `UNSUPPORTED_IMAGE_TYPE` | Not JPEG/PNG/WebP |
| `422` | `CONSENT_REQUIRED` | `consent` is not `true` |
| `422` | `CONSENT_VERSION_MISMATCH` | Unknown `consent_version` |
| `503` | `SCAN_UNAVAILABLE` | Provider unavailable; client falls back to manual search |
| `504` | `SCAN_TIMEOUT` | Provider exceeded the timeout; client falls back to manual search |

The error response never echoes the image, the file name, or any text from the image.

### 7.11 `POST /api/reports`

Request:

```json
{
  "pharmacy_id": "mercury-naga-penafrancia",
  "medicine_ids": ["POC-001", "POC-036"],
  "reason": "wrong_price",
  "note": "Shelf price is 120, not 100."
}
```

Rules:

- `pharmacy_id` must exist.
- `medicine_ids`: 1–10 unique active medicine IDs.
- `reason`: `wrong_price`, `wrong_stock`, `wrong_details`, or `other`.
- `note`: optional, max 500 characters. The UI warns users not to include names, contact details, or other personal information. The note is operator-facing and never returned by the public API.
- The server computes `result_key` from `pharmacy_id` and sorted `medicine_ids`; a client-supplied key is ignored.
- The report is about the pharmacy/medicine result. It does not carry quantity or a sale form; an operator inspects the pharmacy detail to triage a form-level price.

Response `201`:

```json
{
  "report_id": "9b2f...",
  "result_key": "mercury-naga-penafrancia|POC-001,POC-036",
  "status": "open",
  "created_at": "2026-10-21T10:05:00Z",
  "reported": true
}
```

`GET /api/reports?result_key=<url-encoded>`:

```json
{
  "result_key": "mercury-naga-penafrancia|POC-001,POC-036",
  "count": 1,
  "reported": true,
  "latest": {
    "report_id": "9b2f...",
    "reason": "wrong_price",
    "status": "open",
    "created_at": "2026-10-21T10:05:00Z"
  }
}
```

- No `note` is returned.
- `count: 0` and `reported: false` are a valid `200` for an unreported result.
- The results endpoint also returns `reported` and `reported_at`, so the UI can show the state after reload without a second call.

Errors:

- `400 INVALID_REQUEST` — malformed key, missing fields, note too long, unknown reason.
- `404 UNKNOWN_PHARMACY`.
- `422 UNKNOWN_MEDICINE`.
- `429 REPORT_RATE_LIMITED` — more than 5 reports per hour per session/IP.

### 7.12 `POST /api/events`

Request:

```json
{
  "session_id": "5f0c2b7e-3e1a-4c2d-8b9f-0a1b2c3d4e5f",
  "events": [
    {
      "name": "search_submitted",
      "properties": { "query_length": 5, "result_count": 3 }
    },
    {
      "name": "results_viewed",
      "properties": {
        "item_count": 2,
        "complete_count": 3,
        "sold_per_pack_only_count": 2,
        "incomplete_count": 2,
        "no_price_count": 1,
        "sort": "price"
      }
    }
  ]
}
```

Rules:

- `session_id`: a UUID v4 generated by the client; not an account, cookie, or device fingerprint.
- `events`: 1–20 per request; body max 32 KB.
- `name`: one of the allowlisted event names below.
- `properties`: only the allowlisted keys and value types for that event. Unknown names or keys are rejected; do not silently drop them.
- The server sets `occurred_at` and `app_env`; the client does not send them.
- No free text, no medicine names, no query text, no basket contents, no quantities, no report note, no IP, no user agent.

Event allowlist:

| Event | Properties |
|---|---|
| `app_open` | `{ "install_mode": "browser" \| "standalone" }` |
| `search_submitted` | `{ "query_length": int 0..80, "result_count": int }` |
| `search_result_selected` | `{ "rank": int, "result_count": int }` |
| `results_viewed` | `{ "item_count": int, "complete_count": int, "sold_per_pack_only_count": int, "incomplete_count": int, "no_price_count": int, "sort": "price" \| "distance" }` |
| `results_sorted` | `{ "sort": "price" \| "distance" }` |
| `pharmacy_detail_viewed` | `{ "pharmacy_id": string }` |
| `directions_tapped` | `{ "pharmacy_id": string }` |
| `scan_started` | `{ "source": "camera" \| "upload" }` |
| `scan_completed` | `{ "source": "camera" \| "upload", "item_count": int, "low_confidence_count": int }` |
| `scan_failed` | `{ "source": "camera" \| "upload", "reason": "provider_error" \| "timeout" \| "invalid_image" }` |
| `basket_item_added` | `{ "source": "search" \| "scan", "item_count": int }` |
| `basket_item_removed` | `{ "item_count": int }` |
| `report_submitted` | `{ "reason": "wrong_price" \| "wrong_stock" \| "wrong_details" \| "other" }` |

`pharmacy_id` is a public business identifier, not personal data. `query_length` is a count, never the query. Quantities and sale forms are never sent as event properties.

Response `202`:

```json
{ "accepted": 2 }
```

The client sends events best-effort with `fetch` or `sendBeacon` and ignores failures. A failed event must never block a user action.

Errors:

- `400 INVALID_REQUEST` — malformed body or too many events.
- `422 INVALID_EVENT` — unknown event name, property key, or value type.
- `429 EVENT_RATE_LIMITED` — more than 120 events per minute per session.

### 7.13 Error catalogue

| HTTP | Code | Meaning |
|---:|---|---|
| `400` | `INVALID_REQUEST` | Malformed body or query |
| `400` | `INVALID_QUERY` | Search query or limit outside range |
| `400` | `INVALID_ORIGIN` | One coordinate without the other, or out of range |
| `404` | `UNKNOWN_PHARMACY` | Pharmacy ID does not exist |
| `404` | `NOT_FOUND` | Route not found |
| `405` | `METHOD_NOT_ALLOWED` | Wrong HTTP method |
| `413` | `IMAGE_TOO_LARGE` | Scan image over 8 MB |
| `415` | `UNSUPPORTED_IMAGE_TYPE` | Scan image type not accepted |
| `422` | `UNKNOWN_MEDICINE` | Medicine ID missing or inactive |
| `422` | `DUPLICATE_MEDICINE` | Repeated medicine in one basket |
| `422` | `BASKET_TOO_LARGE` | More than 10 basket items |
| `422` | `INVALID_QUANTITY` | Quantity non-positive, wrong shape, or above the sanity ceiling |
| `422` | `INVALID_UNIT` | Unit missing or not the medicine's base unit |
| `422` | `CONSENT_REQUIRED` | Scan called without consent |
| `422` | `CONSENT_VERSION_MISMATCH` | Unknown consent version |
| `422` | `INVALID_EVENT` | Event name/properties not allowlisted |
| `429` | `REPORT_RATE_LIMITED` | Report rate limit |
| `429` | `EVENT_RATE_LIMITED` | Event rate limit |
| `500` | `INTERNAL` | Unexpected server error |
| `503` | `SCAN_UNAVAILABLE` | OCR provider unavailable |
| `503` | `ROUTING_UNAVAILABLE` | Routing provider unavailable or returned no usable route |
| `503` | `DATABASE_UNAVAILABLE` | Database unreachable |
| `504` | `SCAN_TIMEOUT` | OCR provider timeout |
| `504` | `ROUTING_TIMEOUT` | Routing provider timeout |

---

## 8. Privacy, retention, and access

### 8.1 Data classification

| Table | Contains personal data? | Notes |
|---|---|---|
| `medicine` | No | Public product data |
| `medicine_alternative` | No | Public product data |
| `mdrp_ceiling` | No | Public regulation data |
| `pharmacy` | No | Business facts only; no staff personal data |
| `price_observation` | No | Business price/stock data per sale form |
| `price_report` | Potentially (free-text note) | No account; note is operator-facing and must not contain patient identifiers |
| `app_event` | No | Random session UUID and coarse event properties |
| `seed_batch` | No | Operational metadata |

### 8.2 No accounts and no patient identifiers

- No accounts, login, profiles, saved baskets, or user IDs.
- No patient names, contact details, prescription images, OCR text, or diagnosis data in the database.
- The only free-text field is `price_report.note`; the UI warns against personal information, the field is capped at 500 characters, and the public API never returns it.
- Search history is on-device only. The server logs only `query_length`, never the query.
- The anonymous event `session_id` is a random UUID in `sessionStorage`; it is not a cookie, not a device fingerprint, and not linked to an identity.

### 8.3 Basket retention

- Basket contents are held in the client's page memory and optionally `sessionStorage`.
- They are never sent to a storage endpoint; they appear only in `/api/basket` and `/api/results` request bodies.
- The service worker must not cache `/api/*` requests or responses.
- The client must clear the basket on tab close and provide a clear-basket action.

### 8.4 Scan retention

- `POST /api/scan` holds the image in memory for the duration of the request and discards it.
- No temp file, object storage, database row, log line, or analytics event contains the image or recognized text.
- The response contains only medicine candidates.
- The client revokes the image object URL after the request and never writes the image to `localStorage` or IndexedDB.
- The real OCR implementation must preserve these guarantees. If cloud OCR is chosen (#16), it runs through a stateless, non-logging proxy with processor terms; if on-device OCR is chosen, the image never leaves the device.

### 8.5 Event retention

- POC events are retained for 90 days. A manual or scheduled purge may delete older rows:

```sql
delete from app_event where occurred_at < now() - interval '90 days';
```

- Reports are retained for the POC duration for operator triage. They contain no account link.

### 8.6 Access and transport

- Caddy terminates TLS and enforces one shared basic-auth credential.
- The app and API are same-origin; no CORS.
- `X-Robots-Tag: noindex` on all responses and a `noindex` meta tag in the app shell.
- No request bodies, query strings, images, or report notes in access logs. Log method, path without query, status, and duration only.
- Routing requests are stateless: the device origin is held in memory for one request, sent only to the configured routing provider, and never stored or logged.
- The POC is not public. The demo badge is shown when `APP_ENV=dev` and hidden when `APP_ENV=pilot`.

---

## 9. OCR swap point

### 9.1 Stable seam

The client's scan flow depends only on the response shape in section 7.10. The server-side implementation is replaceable:

```ts
interface ScanCandidate {
  line_no: number;
  suggested_medicine: MedicineSummary | null;
  confidence: number;
  low_confidence: boolean;
  other_matches: Array<{ medicine: MedicineSummary; confidence: number }>;
}

interface ScanProvider {
  readonly name: string;
  recognize(image: Buffer, mimeType: string): Promise<{
    items: ScanCandidate[];
    warnings: string[];
  }>;
}
```

The POC provider is `MockScanProvider`. The pilot provider is Cloud Vision behind the same port, and it is governed by the [`scan-provider-port`](../adr/accepted/architecture/2026-10-23-scan-provider-port.md) and [`cloud-ocr-legal-gate`](../adr/accepted/security/2026-10-23-cloud-ocr-legal-gate.md) ADRs; the accuracy gate is [14b - OCR accuracy gate for v1](https://github.com/Xaidel/pharmassist/issues/63). The route, consent checks, size/type validation, response envelope, and no-retention guarantees stay the same when the mock is replaced.

### 9.2 Rules for the real provider

- Return only medicine candidates; never return full OCR text or patient identifiers.
- Resolve candidates against `medicine` with `active = true`; return `suggested_medicine: null` when no confident match exists.
- Keep confidence in 0–1 and mark `low_confidence` at the same 0.6 threshold.
- Never store the image or recognized text; never send them to analytics.
- Keep the `image_retained: false` guarantee.
- Preserve the response shape; the client's confirm/edit UI must not change.
- If the pilot chooses on-device OCR, the client can satisfy the same `ScanProvider` shape locally; the server contract remains the cloud-route fallback.
- Real prescription images must not reach Cloud Vision until the DPIA, written processor terms, and counsel sign-off in the [`cloud-ocr-legal-gate`](../adr/accepted/security/2026-10-23-cloud-ocr-legal-gate.md) ADR are complete; the adapter stays behind the [`scan-provider-port`](../adr/accepted/architecture/2026-10-23-scan-provider-port.md) port either way.

### 9.3 What the client must not depend on

- `provider` value (`"mock"` today, something else later).
- `mock_script_id` (absent for real providers).
- Any `scan_id` persistence (it is ephemeral).
- The number or content of `other_matches` beyond the documented maximum.

---

## 10. Acceptance for the next tickets

### 10.1 Schema and seed migration (#42)

- Migrations create every table, view, enum, index, constraint, and trigger in section 5 on a clean Postgres, including the `(medicine_id, pack_unit)` foreign key.
- The seed writes 1,500 `price_observation` rows: three forms for each of 50 medicines at each of 10 pharmacies; POC-028 has only `unknown` rows.
- The 431 existing mocked pack prices remain available pack observations; loose and strip observations are added and labelled mocked.
- Every form state in section 4.2 is present and reachable.
- The seed validation in section 6.4 passes.
- `seed` twice, `wipe` once: no duplicates, no residue.
- A non-seed row survives a wipe. Test with a synthetic non-seed pharmacy and a report.
- A wipe refuses when a non-seed price observation references a seeded medicine.
- POC-016 carries `EO104-044` on every available form and no other medicine carries a ceiling.
- `bun run db:acceptance` passes against Postgres 17.
- Commands are documented in the README.

### 10.2 Quantity basket and exact-fulfillment API (#44)

- `/api/basket` and `/api/results` accept `medicine_id`, `quantity`, and `unit`, and reject a unit that differs from the medicine's base unit.
- The server finds the cheapest exact combination, including mixed forms such as 1 strip + 2 loose.
- The `sold_per_pack_only` bucket is separate from exact results and shows the covering purchase and amount to buy.
- `pack_only` and `not_applicable` never make a basket incomplete; `not_stocked`, `out_of_stock`, `stock_unknown`, and `no_price` produce the documented missing reasons.
- MDRP is compared per form and labelled `loose_price`, `strip_rate`, `box_rate`, or `pack_price`.
- The API never returns a bare per-unit figure outside the MDRP block.
- `bun run typecheck`, `bun run lint`, and the unit/route tests pass.

### 10.3 Results UI (#43)

- Search and results show one row per medicine with strength and form, not a single pack.
- The quantity input is in the base unit and has familiar presets for bottles, inhalers, and tubes; the guardrail warnings are visible.
- Price lines show observed pack, strip, and loose prices; no bare computed per-unit figure.
- The exact total and form breakdown are shown.
- The "Sold per pack only" section uses "Sold by the pack" for `not_applicable` and never says "unavailable" for these states.
- The MDRP block shows `Box rate`, `Strip rate`, or `Sold loose` as appropriate.
- Every seeded state is reachable on a phone viewport.
- `bun run verify` passes.

### 10.4 End-to-end acceptance (#45)

- The scripted phone run covers quantity baskets, exact fulfillment, the exact mix, pack-only, `not_applicable`, per-form stock, stale, no-price, and MDRP per form.
- The seed-twice/wipe/reseed path and non-seed survivors pass.
- The README and pilot-cutover notes describe the sale-form and quantity model.
- `bun run verify` and `bun run db:acceptance` pass.
- The deployed acceptance script passes.
- The POC contract, seed, API, UI, and README agree.

### 10.5 MDRP-compliant ranking and VAT normalization (#46)

- Complete results split into compliant and above-ceiling tiers; every compliant result ranks before every above-ceiling result, and the existing tie-breakers apply within each tier.
- The cheapest highlight goes only to the first compliant complete result; the all-above POC-016 case has no highlight and shows every option in the above-ceiling group.
- A mixed basket whose above-ceiling result has a lower total is still ranked after the compliant result.
- The API exposes the published ceiling, the effective ceiling, `vat_exclusive`, and `vat_exempt`; the view derives `above_mdrp_flag` from the effective ceiling.
- POC-016 is VAT-exempt and stays at PHP 30.31/tablet. A synthetic VATable product with a VAT-exclusive ceiling of PHP 10.00 is compared at PHP 11.20; a PHP 11.00 price is compliant and a PHP 11.30 price is above.
- The browser acceptance covers the all-above case and a mixed basket with one compliant and one above-ceiling complete result.
- `bun run typecheck`, `bun run lint`, the unit/route tests, the browser acceptance, and `bun run db:acceptance` pass.

### 10.6 Downstream screens

- Search returns exact products with typo tolerance and empty states, and lists the available sale forms.
- Results implement the exact-fulfillment ranking, pack-only bucket, stale, MDRP, Rx/OTC, candidate-generic, and no-price states exactly as section 7.7.
- Pharmacy detail matches the selected result and shows per-form prices and stock; directions render the native route preview in the embedded map.
- Scan uses section 7.10, shows the low-confidence item, and never auto-adds; the confirm screen sets a base-unit quantity.
- Report persists and the visible `reported` state survives reload.
- Events are anonymous and reject free text and quantities.

---

## 11. Not specified here

These are intentionally left to their implementation tickets:

- exact mock prices, which forms each pharmacy sells, strip sizes, and the specific pharmacy/medicine pairs used for the demo (ticket #42);
- the three sample prescription images and their scripted item lists (ticket #28);
- MapLibre styling, pin/bottom-sheet visuals, the demo banner wording, and the 30-day warning copy (map "Not yet specified" and ticket #43);
- the production routing provider and any self-hosting plan; the POC uses a replaceable OSRM-compatible adapter (ticket #27 and the [native pharmacy directions ADR](../adr/proposed/architecture/2026-10-21-native-pharmacy-directions.md));
- VPS provider, hostname, TLS/basic-auth wiring, and the pilot-cutover runbook (ticket #29);
- price history, audit trails, admin report triage UI, and a real OCR provider (out of scope for the POC map);
- multiple simultaneous pack sizes per pharmacy, and report attribution to a specific sale form (pilot follow-ups).

---

## 12. Out of scope

- Patient accounts, saved baskets, order/reservation/payment/delivery, and pharmacy dashboards.
- Real price/stock collection, pharmacy recruitment, and pilot operations.
- Real OCR or cloud OCR integration in the POC.
- Turn-by-turn navigation, live re-routing, traffic-aware travel estimates, and voice guidance. Directions are a route preview only.
- Offline price data; the PWA caches only the app shell.
- Public/anonymous access; the POC is behind basic auth and `noindex`.
- LGU/public health center data, Bikol localization, expansion beyond Naga City, monetization, and the metrics program.
- Production hardening: HA, backups, monitoring/alerting, CI/CD, multi-user auth, and a public API.
- Splitting a basket across pharmacies, and multiple pack sizes for one medicine at one pharmacy.
