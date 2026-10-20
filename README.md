# Pharmassist

Medicine price-and-availability map for Naga City, Camarines Sur. The repository holds the POC app shell, its local stack, and the product documentation.

## Repository layout

| Path | Owns |
| --- | --- |
| `src/` | TanStack Start routes, feature slices, shared UI, and app utilities |
| `public/` | PWA manifest, icons, offline fallback, and app-shell service worker |
| `tests/`, `e2e/` | Unit, route-contract, capability, and browser tests |
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

The dev server listens on <http://localhost:3000>. The app shell does not require Postgres yet; the database arrives with the schema ticket.

## Container stack

```sh
docker compose up --build
```

Open <http://localhost:8080>. Caddy proxies to the app, Postgres stores its data in the named `postgres-data` volume, and the app never receives a published host port of its own.

To reset the database volume:

```sh
docker compose down -v
```

Copy `.env.example` to `.env` to override the Compose defaults.

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
| `bun run verify` | Format, lint, typecheck, tests, browser acceptance, and capability fixture |

Install Chromium once before browser tests: `bunx playwright install chromium`.

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

This is the scaffold slice only: app shell, PWA, and Compose stack. Search, map results, basket ranking, pharmacy detail, directions, mocked scan, and report flows are subsequent slices in [the POC map](https://github.com/Xaidel/pharmassist/issues/17).
