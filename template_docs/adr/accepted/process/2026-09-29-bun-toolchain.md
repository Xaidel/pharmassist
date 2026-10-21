# ADR: Bun 1.4 Package Manager And Runtime With Retained Vitest

Type: template
Status: accepted
Classification: process

## Problem

The template baseline declares Node.js 22 LTS and pnpm 10 in `package.json`, with a Node Nitro server (`node .output/server/index.mjs`) as the supported deployment output. The project uses TanStack Start on React 19, Vite 8, Nitro 3 beta, Vitest 4 with jsdom and Testing Library, Playwright browser acceptance, and a Node multi-stage Dockerfile.

Bun 1.4 is requested as the primary package manager and runtime. The contention points are test-runner maturity (`bun test` versus Vitest) and TanStack Start compatibility with Bun. TanStack documents Bun deployment for React 19 applications via the Nitro `bun` preset, or a custom `Bun.serve` server, and Bun documents the same Vite invocation shape. A known upstream defect makes symlinked `node_modules` layouts, which are the pnpm default and Bun's `isolated` linker, emit a broken SSR bundle: `createServerFn is not a function`, reported as TanStack/router#8139 and oven-sh/bun#39963.

This record governs the toolchain the runtime boundary in [`server-only-modules`](../architecture/2026-09-29-server-only-modules.md) is built and verified with, so it is a template decision rather than a local preference: a derived application inherits the lockfile, the scripts, the container, and the gates together.

## Decision

Adopt Bun 1.4 as package manager and production runtime while retaining Vitest as the primary test runner.

- `packageManager` declares `bun@1.4.2` and `bun.lock` replaces `pnpm-lock.yaml`.
- `bunfig.toml` pins `[install] linker = "hoisted"` until the upstream symlinked-layout SSR defect is fixed.
- Vite build and dev run through Bun (`bun --bun vite ...`). Vitest runs through `bun run test`, which executes `vitest run`; the `vitest` binary's `#!/usr/bin/env node` shebang keeps it on the Node-compatible path, so the Bun runtime is neither forced with `bun --bun vitest` nor replaced by `bun test`.
- Nitro uses `preset: "bun"`; `bun run build` emits `.output/server/index.mjs` and `bun run start` runs it on `oven/bun:1.4.2-alpine` images as the non-root `bun` user.
- Node.js 22 stays declared in `engines` and in `.node-version`, because Vitest and Playwright execute there.
- Vitest, jsdom, Testing Library, and Playwright coverage remain authoritative. No test rewrite to `bun:test` is in scope for this record.

## Alternatives considered

- **Stay on pnpm 10 and Node 22.** Viable and lowest risk, but rejects the requested Bun migration and keeps Corepack and pnpm tooling.
- **Bun package manager only, Node runtime retained.** Lower risk than this decision, because it keeps the default Nitro preset and `node:22` images. Rejected because the request includes the Bun runtime and React 19 satisfies the TanStack Bun guideline.
- **Full Bun including a `bun test` migration.** Rejected: `bun test` coverage is experimental with no HTML or branch parity, `__mocks__` auto-mocking is unsupported, `vi.mock` hoisting semantics differ, watch mode reruns the full set, and the Vitest team does not support the Bun runtime because of tinypool and worker-thread incompatibilities. The jsdom component suite would need rewrites for no product gain.
- **Bun `isolated` linker for stricter dependency resolution.** Rejected until router#8139 is fixed: both pnpm and Bun isolated layouts reproduce the SSR 500 with identical bundle-size divergence.

## Consequences

Positive: one Bun toolchain for install, scripts, dev, build, and production; faster installs; a documented TanStack React 19 Bun path; no test churn.

Negative and neutral: the hoisted layout forfeits pnpm-style phantom-dependency strictness; the Bun JSC runtime replaces V8 in production, where the exposure is limited to the `esbuild` and `lightningcss` built dependencies but must still be validated; `AGENTS.md`, `README.md`, `template_docs/`, CI, and the Dockerfile move off pnpm together; and generic pnpm wording in upstream skills remains out of scope for this record.

Reversibility: restore `pnpm-lock.yaml` from history, revert the Nitro preset to its default, and restore `node:22` images. This record preserves the fallback shape.

## Testing

Automated:

- `bun install --frozen-lockfile` from a clean clone is reproducible, which proves the committed `bun.lock` matches `package.json`.
- `bun run verify` and `bun run test:e2e` pass under the hoisted linker; the `createServerFn is not a function` SSR 500 that the pinned linker avoids would fail the E2E run's first page load.
- `bun run build` followed by `bun run start` serves `/` and `/api/health` with HTTP 200.

Manual:

- Inspect `.output/server/ssr.mjs` and confirm it stays at the hoisted size rather than the ~240 kB inflated bundle the symlinked layouts produced.
- `docker build .` plus a container health probe against `GET /api/health` passes on `oven/bun:1.4.2-alpine`.

## Related

- [`server-only-modules`](../architecture/2026-09-29-server-only-modules.md)
- [adoption.md](../../../adoption.md)
- TanStack Start hosting guide (Bun section), oven-sh/bun#39963, TanStack/router#8139
