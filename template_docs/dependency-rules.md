# Dependency Rules

Production imports form a directed acyclic graph. This document implements [`feature-slices`](adr/accepted/architecture/2026-09-29-feature-slices.md), [`ports-and-use-cases`](adr/accepted/architecture/2026-09-29-ports-and-use-cases.md), and [`server-only-modules`](adr/accepted/architecture/2026-09-29-server-only-modules.md); the records govern where this document and the import graph disagree.

The server-only entrypoint and composition rows below are the import graph of [`server-capability-boundaries`](adr/accepted/architecture/2026-10-02-server-capability-boundaries.md), and they are normative.

| Importer | Allowed application imports |
| --- | --- |
| `src/routes` | client-safe feature APIs, feature pages, shared UI, `src/lib` |
| `src/features/<feature>/pages` | same feature client-safe modules, shared UI/hooks/types/domain, `src/lib` |
| `src/features/<feature>/components` | same feature client-safe modules, shared UI/hooks/types/domain, `src/lib` |
| `src/features/<feature>/*.domain.ts` | zod, `src/shared/domain`, same feature domain modules |
| `src/features/<feature>/*.schema.ts` | same feature domain, `src/shared/domain`, zod |
| `src/features/<feature>/*.port.ts` | same feature domain, `src/shared/domain` |
| `src/features/<feature>/*.use-cases.ts` | same feature domain, schemas, and ports |
| `src/features/<feature>/*.functions.ts` | same feature domain, schemas, ports, use cases, its own server adapters or private composition, another feature's public `*.functions.ts`, focused client-safe and server-only `src/lib` bindings used only by transformed server code |
| `src/features/<feature>/*.surface.server.ts` | same feature schemas, private composition and published contract types; focused server-only `src/lib` |
| `src/features/<feature>/*.composition.server.ts` | same feature use cases, domain, schemas, ports, adapters and integration bindings; focused `src/lib`; never inbound wrappers |
| `src/features/<feature>/*-adapter.server.ts` | consumer port/domain/schema, focused `src/lib`, type-only provider surface contracts; no runtime provider import |
| `src/features/<feature>/*-binding.server.ts` | own injectable integration factory, focused `src/lib`, provider's published `*.surface.server.ts` operations |
| `src/features/<feature>/*.server.ts` | same feature domain, schemas, and ports, another feature's public `*.functions.ts`, server-only `src/lib`, private infrastructure packages |
| `src/shared/*` | other shared code and `src/lib` only |
| `src/lib` | other focused `src/lib` modules only |
| `src/router.tsx` and `src/start.ts` | generated routes and `src/lib` framework glue |

## Feature Internal Direction

Within one feature, production imports point inward:

```text
shared/domain <- domain
shared/domain <- schema
shared/domain <- port

domain <- schema <- use-cases <- functions
domain <- port   <- use-cases <- functions
domain <- schema <- server    <- functions
port             <- server
```

- `*.domain.ts` imports zod and `src/shared/domain` only.
- `*.schema.ts` composes domain schemas and the schema of any promoted value object it carries, and never imports a server module.
- `*.port.ts` is type-only: it declares capabilities, imports no adapter, and carries no behavior.
- `*.use-cases.ts` receives collaborators as parameters and imports no adapter, no framework, no Node builtin, no clock, no random source, and no environment value.
- Ordinary server adapters implement ports and are reached from the feature's composition owner, never another feature.
- Single-entry features retain composition in `*.functions.ts`. Dual-entry features use private `*.composition.server.ts`, reached only by their own functions and surface entrypoints. Both entrypoints share application implementation and instance lifetime, and composition imports neither.

## Environment Rules

- Browser-reachable code must not import `*.server.ts`, Node-only modules, private SDKs, secret environment access, or `@tanstack/react-start/server`.
- Server function wrappers may be imported by routes and browser UI because Start transforms their implementation into RPC stubs.
- A dynamic server-function import must be a static string literal. A computed path obscures the transform boundary: the build passes, but the function is never registered and the call fails at runtime with `Server function info not found`.
- A client-safe barrel must not re-export a server-only value.
- This includes functions modules, named/star re-exports, and import-then-export aliases. An ordinary internal import is safe only where Start removes its references from client output.
- A focused `*.middleware.ts` declaration may import private bindings used only inside recognized `createMiddleware(...).server(...)` callbacks. Factory evaluation, exported private values and client callbacks are not server-only. See [server-capabilities.md](server-capabilities.md).

## Feature Dependencies

When a real capability dependency exists, consume public RPC functions or published server-only application operations through the consumer's own port and mapping. Runtime surface imports occur only in integration bindings; injectable factories can import published surface contract types with `import type`. Provider domain, repository and private composition modules remain private. A normal supported dependency needs no exception record. Move a contract to `shared` only when it has no single feature owner.

No module under `src/shared/` imports a feature, a route, or a `*.server.ts` module.

## Enforcement

The syntax-aware `dependency-graph.ts` adds production runtime-module cycles, feature dependency cycles, lib-to-feature/route reversal, published server-value exports and the designated integration shapes. It recognizes relative and `#/` aliases, type-only links, exports, side effects and literal dynamics; it reports computed/unresolved source imports. Generated route registration and CSS assets are outside the author-owned graph. Arbitrary value-flow analysis, public contract quality, actual mapping and authorization correctness remain build/runtime/review responsibilities.

TypeScript does not enforce this graph, and the framework enforces only the part of it that concerns the browser. `tests/routes/server-boundaries.test.ts` rejects server-only imports from routes and client-safe feature modules except recognized transformed middleware uses, and limits cross-feature imports to published RPC or designated server-only surface integrations. It also checks shared ownership, domain purity, application-layer isolation, and demonstrated shared-component reuse. Its syntax-aware dependency analysis is tested in `dependency-graph.test.ts` and applied to the isolated capability fixture in `server-capability-fixture.test.ts`. Semantic ownership, focused utilities, and `getRouteApi()` usage remain review-enforced. Fix the import graph rather than weakening Start import protection.
