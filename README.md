# Pharmassist

Medicine price-and-availability map for Naga City, Camarines Sur. The repository holds the POC app shell, its local stack, and the product documentation.

## Repository layout

| Path | Owns |
| --- | --- |
| `src/` | TanStack Start routes, feature slices, shared UI, and app utilities |
| `public/` | PWA manifest, icons, offline fallback, and app-shell service worker |
| `migrations/` | Postgres schema migrations applied by `bun run db:migrate` |
| `scripts/` | Database migrations and seed/wipe tooling |
| `tests/`, `e2e/` | Unit, route-contract, capability, database-tooling, and browser tests |
| `template_docs/` | Reusable TanStack Start architecture and engineering guidance inherited from the template |
| `docs/PRD.md` | Product requirements |
| `docs/poc/data-contract.md` | POC schema, seed/wipe, and HTTP API contract |
| `docs/research/` | Research notes |
| `docs/adr/` | Decisions specific to this application |
| `docker-compose.yml` | App, Postgres, and Caddy for the local/production stack |
| `Caddyfile` | Caddy reverse proxy in front of the app |

The app is scaffolded from [`gyud-internal/tpl-fsfba-ts`](https://github.com/gyud-internal/tpl-fsfba-ts). Its engineering contract is [`AGENTS.md`](AGENTS.md).

## Prerequisites

- Bun 1.4.2 (declared in `.bun-version`)
- Node.js 22.23.1 for Vitest and Playwright (declared in `.node-version`)
- Docker with Compose for the container stack

## Local development

```sh
bun install --frozen-lockfile
bun run dev
```

The dev server listens on <http://localhost:3000>. Search reads Postgres, so start the database and load the seed before using the home screen.

## Container stack

```sh
docker compose up --build
```

Open <http://localhost:8080>. Caddy proxies to the app, Postgres stores its data in the named `postgres-data` volume, and the app never receives a published host port of its own.

To reset the database volume:

```sh
docker compose down -v
```

Copy `.env.example` to `.env` to override the Compose defaults. Postgres is published on `127.0.0.1:${POSTGRES_PORT}` so the host-side tooling can reach the Compose database; keep `DATABASE_URL` in `.env` aligned with `POSTGRES_*`.

## Database

Start Postgres, apply the schema, and load the seed fixture:

```sh
cp .env.example .env
docker compose up -d postgres
bun run db:migrate
bun run db:seed
```

The seeder reads the full POC fixture at `scripts/seed/fixtures/poc-seed/` — 50 medicines, 10 Naga pharmacies, 204 published MDRP ceilings, and mocked prices with the demo trust states — writes one `poc-seed` batch in a single transaction, and is idempotent. The wipe removes only rows tagged `seed_batch_id = 'poc-seed'`; it refuses to run while a non-seed row depends on seeded data, and it never touches reports, send-ahead reservations, or anonymous events.

```sh
bun run db:wipe
```

Both commands refuse to touch `APP_ENV=pilot` unless `ALLOW_POC_SEED=1` or `ALLOW_POC_WIPE=1` is set deliberately. To exercise the full acceptance sequence against a scratch database:

```sh
bun run db:acceptance
```

`db:acceptance` creates and drops `pharmassist_tooling_*` on the server in `DATABASE_URL`; it never touches the application database.

## Sale forms and quantity lists

Each active medicine has a pack, strip, and loose observation at every seeded pharmacy, and each observation carries one explicit state: `available`, `pack_only`, `not_applicable`, `not_stocked`, or `unknown`. Only an available form has a shelf price. The results screen ranks MDRP-compliant complete lists before lists with an item above the ceiling, marks only a compliant list as cheapest, keeps covering purchases in a separate "Sold per pack only" bucket, shows `pack_only` forms as "Sold per pack only" and `not_applicable` forms as "Sold by the pack" — never as unavailable. MDRP comparisons expose the published and effective ceiling, including the 12% gross-up for a VATable product with a VAT-exclusive ceiling. Derived per-unit rates appear only inside the MDRP comparison, labelled `Box rate`, `Strip rate`, or `Sold loose`.

The seed makes every demo case reachable and labelled: complete exact lists, the strip + loose exact mix, pack-only covering purchases, `not_applicable` pack-only copy, incomplete and not-stocked reasons, per-form stock, stale verification, all-above MDRP, no-price data, and per-form MDRP comparisons. `bun run db:acceptance` proves the seed, wipe, and MDRP fixtures; `bun run test:e2e` exercises the same states through the mobile viewport, and `bun run verify` runs the full gate.

List quantities are entered in each medicine's base unit: tablets, capsules, mL, g, actuations, sachets, or unit-doses. The results screen offers one-tap full-pack presets for bottles, inhalers, and tubes, and shows a soft warning above an estimated 30-day supply. These entry guardrails are client-side only; the API still prices any structurally valid list and enforces only the contract bounds.

## Send-ahead reservations

A pharmacy result with price data offers **Send ahead** from the detail sheet. The app creates an advisory `send_ahead` record through `POST /api/send-ahead` and shows a slip with a copyable `SA-` reference code, the pharmacy, the base-unit list, the indicative total, and a 24-hour expiry. The slip opens the patient's SMS app pre-filled with the pharmacy's `mobile` and the reservation message; a pharmacy with only a landline or no number shows a warning instead, but the record is still created. No patient identity is stored, no read-back endpoint exists, and the code resolves through SQL in the POC. Expired rows are removed with `bun run db:purge-send-ahead`; a seed wipe leaves reservations untouched.

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the Vite dev server on port 3000 |
| `bun run build` | Build the Bun/Nitro production output |
| `bun run start` | Run the built server |
| `bun run lint` | ESLint plus the design-system policy |
| `bun run typecheck` | Strict TypeScript check |
| `bun run test` | Vitest unit and route tests |
| `bun run test:e2e` | Build and run the Playwright browser spec |
| `bun run db:migrate` | Apply pending Postgres migrations |
| `bun run db:seed` | Load the seed fixture in one idempotent transaction |
| `bun run db:wipe` | Remove `poc-seed` rows without touching non-seed data |
| `bun run db:purge-send-ahead` | Delete expired send-ahead reservations |
| `bun run db:acceptance` | Prove migrations, idempotent seed, guarded wipe, and send-ahead purge on a scratch database |
| `bun run verify` | Format, lint, typecheck, tests, browser acceptance, and capability fixture |

Install Chromium once before browser tests: `bunx playwright install chromium`. Browser acceptance reads the seeded database, so `bun run verify` requires a running Postgres with `bun run db:migrate` and `bun run db:seed` applied, and `DATABASE_URL` set.

## PWA

`public/manifest.webmanifest`, the icons under `public/icons/`, and the app-shell service worker at `public/sw.js` make the POC installable. The service worker caches only the offline shell, manifest, and icons. It never caches navigations containing seeded prices or any `/api/*` request, so price data is unavailable offline by design.

## Documentation ownership

| Location | Ownership |
| --- | --- |
| [`template_docs/`](template_docs/architecture.md) | Reusable TanStack Start architecture and engineering guidance |
| [`template_docs/adr/`](template_docs/adr/README.md) | Decisions inherited from the template |
| [`docs/`](docs/README.md) | Product requirements, research, POC contracts, and application decisions |

Material that governs derived applications belongs in `template_docs/`. Material that governs this application belongs under `docs/`.

## Status

The scaffold, PWA, Compose stack, Postgres schema, seed/wipe tooling, typo-tolerant medicine search with anonymous search events, map-first results with list ranking, pharmacy detail, directions, report flows, the mocked prescription scan, and the advisory send-ahead reservation are in place. VPS deployment remains as the final slice in [the POC map](https://github.com/Xaidel/pharmassist/issues/17).
