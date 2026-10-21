# Architecture

This template organizes a TanStack Start application by business capability while preserving the framework's file-route and runtime boundaries.

The shape described here is imposed by [`feature-slices`](adr/accepted/architecture/2026-09-29-feature-slices.md) through [`cross-feature-access`](adr/accepted/architecture/2026-09-29-cross-feature-access.md). Where this document and a record disagree, the record governs and this document is the defect. The [`adr/README.md`](adr/README.md) states the model as a single diagram.

The server-only communication extension is decided in [`server-capability-boundaries`](adr/accepted/architecture/2026-10-02-server-capability-boundaries.md) and [`server-capability-authorization`](adr/accepted/security/2026-10-02-server-capability-authorization.md); [server-capabilities.md](server-capabilities.md) gives the complete construction and authority contract. The ordering reference demonstrates the RPC relationship and does not yet exercise the second entrypoint. A server-only integration receives a published application contract through its own port, and a dual-entry feature shares private composition instead of exposing infrastructure.

## Product Specification Flow

```text
Master PRD (Vision)
    -> focused feature or release PRD (Normative)
    -> complete or phased technical design (Normative)
    -> implementation
    -> acceptance evidence
```

Use this full flow proportionately for significant product or architecture changes. Routine maintenance does not require ceremonial specifications.

## Runtime Flow

```text
browser or SSR request
    -> file route loader or event handler
    -> client-safe createServerFn wrapper (composition root)
    -> feature use case (client-safe application operation)
    -> outbound port (repository, identity, catalog)
    -> server-only adapter
    -> pure feature domain transition
    -> database, provider, filesystem, or private SDK
```

Routes register URLs and lifecycle behavior. Features own business-facing UI and behavior. The diagram shows single-entry RPC construction; dual-entry RPC and server-only application wrappers share private composition rather than calling one another. Use cases own application orchestration. Outbound ports name the capabilities an application operation needs. Server-only modules own private infrastructure access.

Raw clients, webhooks, and public APIs use route `server.handlers` because those interfaces need exact HTTP method, status, header, and body control.

## Default Source Shape

```text
src/
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   ├── api.health.ts
│   ├── menu.tsx
│   ├── orders.index.tsx
│   └── orders.$orderId.tsx
├── features/
│   ├── menu/
│   │   ├── pages/
│   │   ├── menu.domain.ts
│   │   ├── menu.schema.ts
│   │   ├── menu.functions.ts
│   │   └── menu.server.ts
│   └── orders/
│       ├── pages/
│       ├── components/
│       ├── orders.domain.ts
│       ├── orders.schema.ts
│       ├── orders.port.ts
│       ├── orders.use-cases.ts
│       ├── orders.functions.ts
│       └── orders.repository.server.ts
├── shared/
│   ├── domain/
│   └── components/
├── lib/
│   └── cn.ts
├── router.tsx
├── start.ts
└── styles.css
```

The tree is the reference application's shape, not a template every feature must reproduce. It shows what the two reference features happen to need: `menu` has a `pages/` folder and no `components/` folder, and a feature that needs neither ships no subfolder at all. `routeTree.gen.ts` is generated and absent from the tree by policy.

A feature contains one business capability. Its optional subfolders are local organization, not application-wide horizontal layers. Do not pre-create empty folders.

Six route modules is the reference application's count, not a ceiling: `__root.tsx` is the document shell, `index.tsx` redirects to the first feature route, `api.health.ts` is the route `server.handlers` entry point, and each remaining file registers one URL and names the feature page that renders it.

A feature with an application layer adds `<feature>.port.ts` and `<feature>.use-cases.ts`. A feature without one, such as a read-only catalog with no lifecycle, skips both.

## Route Modules Are Routing Adapters

Route modules own `createFileRoute`, paths, loaders, guards, search and parameter validation, metadata, SSR behavior, route fallbacks, and routing layouts. They import feature pages and client-safe feature functions.

An extracted feature page uses `getRouteApi('/route/id')` for loader data, params, search, and navigation. It must not import the route module's `Route` object because that creates a circular dependency.

## Feature Domain Model

A feature is the bounded context for its language, rules, and data. Its domain model lives in one domain module, `<feature>.domain.ts`, that is client-safe and pure: it imports Zod and `src/shared/domain` only. It owns value objects, the entity or aggregate type with its pure transitions, and domain errors.

- `*.schema.ts` composes wire contracts from domain schemas, and from the `src/shared/domain` schema of a promoted value object when the contract contains one, and declares no constraints of its own. It also owns the pure projection from a domain aggregate to its transport view, so derived fields are computed once and never accepted as input. A feature with no domain behavior may keep its rules in `*.schema.ts`.
- Parse at edges: server-function validators, persisted rows, external payloads, and route parameters. Interior code trusts the types those edges produced and does not re-validate.
- Domain values stay plain and serializable: branded primitives and plain objects, not class instances, `Date`, `Map`, or `Set`.
- Domain behavior is pure. Time, identity, and generated values arrive as arguments; the domain performs no I/O, environment access, or authorization.
- An aggregate is the consistency and transaction unit. It loads and saves whole, and its invariants hold after every operation.
- A feature consumes another feature through published RPC or intentional server-only application operations and maps provider outcomes into its own types. Runtime surface imports belong only to consumer production bindings; injectable mapping factories may import published contract types. Provider domain, adapters, and composition stay private.
- A value object proven to serve two or more features promotes to `src/shared/domain/` with no feature rules attached.

## Feature Application Layer

A feature gets an application layer when it must store state that outlives the request — an aggregate that loads, mutates, and saves whole, or identities it must issue — or when it consumes a foreign capability, including reads, commands, and decisions. The trigger is the work, not ambition: the ordering feature owns an order store and must read another feature's catalog, so it has one. A fixed catalog that its adapter constructs and returns whole has neither trigger, so it does not.

- `*.port.ts` is client-safe and declares the outbound capabilities the feature needs as plain types: persistence, identity, and any foreign catalog it is allowed to read. It imports no adapter, framework, Node builtin, clock, random source, or environment value. Absence is a null return, because a missing row is a normal outcome rather than a storage failure. A port for a foreign feature carries that feature's published data, never its domain types, which is what makes it an anti-corruption boundary.
- `*.use-cases.ts` is client-safe application behavior. Each operation receives its collaborators first, then its input, then the current time as `now`, and returns a transport view. Use cases hold no state, read no clock, and perform no I/O, so they are unit-testable against a test double with no server running. They are not called from the browser, because the only implementations of the ports they receive are adapters and the composition root.
- Ordinary server adapters, including `*.repository.server.ts`, implement ports and own state or private infrastructure. They are reached through the feature's composition owner. Published surfaces, private composition, and integration bindings are server-only modules with separate architectural roles.
- Construction and adapter lifetime belong to `*.functions.ts` for a single-entry feature or private `*.composition.server.ts` shared by both inbound entrypoints for a dual-entry feature. Composition imports neither wrapper. Server functions validate, acquire ambient time, map application outcomes to transport outcomes, and delegate; server-only operations validate their own input and preserve application outcomes.

Storage and state are therefore never reachable from a use case, a component, or a loader, and a second adapter is a new file rather than a refactor of every caller.

## Server And Browser Boundaries

- `*.server.ts` is server-only and protected from browser bundles by Start.
- `*.client.ts` is browser-only when a feature needs IndexedDB, DOM, or other client infrastructure.
- Unsuffixed modules remain safe for both runtimes. `*.port.ts` and `*.use-cases.ts` are unsuffixed on purpose: they are client-safe, so a test can call them without a server. Client-safe is what makes a module testable, not a claim that the browser uses it.
- Route loaders may execute during SSR and browser navigation, so they never import server-only infrastructure directly.
- Server functions accept one logical `data` input and validate it at runtime.
- Server-function validators use domain-authored schemas; handlers and use cases trust the parsed types instead of re-validating.
- Server functions return plain serializable data unless raw response semantics are intentional.
- Global `src/start.ts` explicitly installs CSRF middleware for server functions.

## Shared UI And App Utilities

`src/shared/components` contains reusable rendered UI with no feature knowledge. `src/lib` contains focused framework glue and utilities such as class-name merging, environment parsing, logging, and serialization.

`src/styles.css` owns the semantic design tokens, and [`design-system.md`](design-system.md) documents the primitive set, the caller contract, and the extension rules. `@shadcn/lint` enforces them through `bun run lint`. A component moves out of its feature and into `src/shared/components` the day a second feature needs it, as a move of the existing file; [`component-reuse`](adr/accepted/process/2026-10-01-component-reuse.md) owns that decision and the two gates that hold it.

Neither location is a dumping ground. Keep feature code in its feature until actual cross-feature reuse makes another owner clearer.

`src/shared/domain` contains value objects proven to serve two or more features. It carries no feature rules and imports no feature or server-only module.

## Authentication Extension

Authentication is intentionally not implemented. When an application adds it:

1. Keep session/provider access in `src/lib/*.server.ts` or an owning auth feature.
2. Resolve a trusted principal from server request or session data.
3. Enforce provider authorization at every private RPC, server route, and server-only application operation, with explicit per-call context for in-process operations.
4. Add route guards only for redirect and navigation UX.
5. Validate trusted origins, use `httpOnly`, `sameSite`, and production `secure` cookies, and retain CSRF protection.
6. Record the selected identity and authorization model in an application ADR and technical design.

Steps 1 through 4 state the rule that [`server-only-modules`](adr/accepted/architecture/2026-09-29-server-only-modules.md) owns. The mechanism they do not name is function middleware, owned by [`authorization-boundary`](adr/accepted/security/2026-09-29-authorization-boundary.md): a policy is a factory that takes the required permissions, and a server function attaches it with `.middleware([...])`, so the requirement is visible where the endpoint is defined.

## Persistence Extension

The reference store is process-local and lives behind `OrderRepository`. A real persistence adapter belongs in the owning feature or focused server utility and remains behind server functions; the composition root is the only place that changes to adopt it. The aggregate is the transaction unit: load it, apply one domain transition, and save it whole. Storage and external payloads map into domain types at their edge, and identity comes from the store rather than from application code. The reference store has no transaction or concurrency control, so a real adapter must add whatever its consistency model requires. Database selection, migrations, transaction boundaries, tenancy, backup, restoration, and deployment sequencing require an application-specific decision and design.
