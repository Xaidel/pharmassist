# Template Adoption

Use this checklist after creating a repository from the template.

This repository ships a worked example, not a product: `src/features/menu`, `src/features/orders`, the routes that serve them, `e2e/ordering.spec.ts`, and `docs/specs/reference-app/` demonstrate the baseline and are replaced wholesale. Every file in that example opens with a `Reference example` header pointing at the "This Repository Is A Template" section of [`AGENTS.md`](../AGENTS.md), so it is identifiable from the file alone. Everything under [`template_docs/`](architecture.md) is the part a derived application inherits.

## Retain

Retain `tests/server-capabilities/` as baseline integration evidence; it is an isolated synthetic test app, not a product feature to extend. The ordering reference under `src/` and `e2e/ordering.spec.ts` remains the example replaced by adoption. [server-capabilities.md](server-capabilities.md) explains how real features use the demonstrated server-only relationship.

- `AGENTS.md` and the source-boundary rules, unless an accepted architecture record deliberately changes them.
- `template_docs/` and its record collection: keep the rules and every accepted record, because a derived application inherits them. Amend a decision with a new linked record rather than editing the one it replaces.
- Strict TypeScript, ESLint, Prettier, Vitest, Playwright, and CI gates.
- The router factory, root document contract, Start CSRF middleware, and generated-file policy.
- Docker's non-root multi-stage runtime when Bun container deployment remains valid ([`bun-toolchain`](adr/accepted/process/2026-09-29-bun-toolchain.md)).
- The design-system policy: `design-system.lint.json`, [`design-system.md`](design-system.md), and the `@shadcn/lint` rules in the lint gate ([`design-system-lint`](adr/accepted/process/2026-09-29-design-system-lint.md)).

## Set Up Engineering Skills

Install the org skills after creating a repository. Both are global installs; the repository vendors neither:

```sh
npx skills add gyud-labs/gyud-skills --skill fullstack-coder
npx skills add gyud-labs/gyud-skills --skill create-adr
```

`create-adr` owns the decision-record format, lifecycle, and check, with its commands written against `~/.agents/skills/create-adr`; see [`development-workflow.md`](development-workflow.md#engineering-skills). Do not vendor skills under `.agents/skills/`, and do not restore the retired `ts-coder`, `react-ts-engineer`, `react-ts-ui-designer`, `tanstack-start-engineer`, or `ts-qa-engineer` skills, nor the deprecated `adr-writer`.

## Replace

- Package name, version, visible application title, metadata, and README introduction.
- `docs/specs/master/` with the durable product vision.
- `docs/specs/reference-app/` with the first bounded release contract and technical design.
- The ordering reference slices and routes one complete vertical slice at a time.
- Browser acceptance with the new product's critical journey.
- `.env.example` when the application gains runtime configuration.

## Remove When Unused

- Ordering routes, `src/features/menu`, and `src/features/orders` after replacement behavior is accepted.
- The `Reference example` file header that opens every file in the reference application, and the browser test that drives it, `e2e/ordering.spec.ts`.
- UI primitives that no surviving feature uses.
- Docker only when an accepted deployment decision selects a different supported runtime and supplies equivalent release evidence.

## Add Deliberately

- A runtime-validated `src/lib/env.server.ts` before reading secrets.
- Authentication only with a documented session/provider and authorization model.
- Persistence only with migrations, transaction semantics, local setup, release sequencing, and recovery expectations.
- Query caching only when route loaders and invalidation do not adequately express the application's cache requirements.

## Final Search And Verification

Search for `Reference example`, `Ordering`, `tpl-fsfba-ts`, `reference-app`, and the retired skill names. Remove stale example branding, requirements, environment names, and browser assertions. A file that still opens with the `Reference example` header belongs to the template's example application, not to the derived product.

```sh
grep -rl "Reference example" src e2e
bun install --frozen-lockfile
bun run verify
docker build .
```
