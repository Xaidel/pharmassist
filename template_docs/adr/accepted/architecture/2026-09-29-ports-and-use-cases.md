# ADR: Ports And Use Cases Above Adapters, Composed By Server Functions

Type: template
Status: accepted
Classification: architecture

## Problem

The reference ordering feature reached the point where one module, `orders.server.ts`, performed four unrelated jobs: it held module state in a `Map`, exported `resetOrdersForTests` so tests could reach that state, read the clock through `now: string = new Date().toISOString()` default parameters, and owned the application operations and their view mapping.

The costs were concrete. Application behavior was only reachable by importing a server-only module, so its tests had to run through the server boundary. Time and identity arrived as hidden defaults rather than declared arguments, so the domain invariants were not the only thing a caller had to satisfy. And every operation's dependencies were invisible at the call site, because they were resolved by module-level state rather than passed in.

An earlier version of this template answered by keeping storage inside `*.server.ts` until a feature had a second real adapter, on the reasoning that a port seam is only worth its cost when it will be crossed. That reasoning was incomplete. The seam is also crossed by tests, by anything that needs application behavior without infrastructure, and by a future adapter that does not exist yet. The trigger is not the second adapter; it is whether the feature must store state that outlives the request, or must read a capability belonging to another feature.

This framework has no composition root to borrow. `createServerFn` is a transparent RPC boundary, not a driving adapter: on the server a call compiles to a direct function call, so there is no HTTP framework to inject into, no `NewHandler` to assemble, and no request object to thread. A feature that wants inversion must nominate one of its own modules, and only one candidate already sits on the server side of every entry point.

The competing proposal was to move the domain into a second language, on the theory that nominal types and a separate service would fix boundary discipline. That trades one typechecker for a code generator: the wire source of truth would move to an OpenAPI document with generated clients, branded identities would become strings with comments, each domain error variant would need a hand-written mapping on both sides, and generator freshness would become a new way for the system to rot silently.

## Decision

Every feature that must store request-spanning state or read a foreign capability separates its application behavior from its adapters, and the server function is the composition root.

1. **The trigger.** A feature adopts a port and a use-case module when it must **store state that outlives the request** — an aggregate that loads, mutates, and saves whole, or identities it must issue — or when it must **read a capability owned by another feature**. Either trigger brings both modules, because the operation that writes the state is the one that needs the collaborators. A feature with neither trigger has neither module: a fixed catalog that is constructed in its adapter and read whole has no aggregate, no identity strategy, and no foreign read, so a `*.server.ts` exposing a `create*` factory is enough. That is the case for `menu`.
2. **`*.port.ts` is client-safe and type-only.** It declares the outbound capabilities the feature needs as plain types: persistence, identity, and any foreign catalog it may read. It imports no adapter, framework, Node builtin, clock, random source, or environment value.
3. **Absence is a null return, not an error.** A missing row is a normal outcome, not a storage failure, so `findById` resolves to `Order | null` and the classification lives with the application, not with the technology.
4. **A port for a foreign feature carries published data, never that feature's domain types.** `MenuItemCatalog.findById` returns a name and a price, which is what makes it an anti-corruption boundary rather than a back door.
5. **Identity is a port.** `OrderIdGenerator` keeps the strategy out of application code, so a store may use a process counter, a database sequence, or a UUID.
6. **`*.use-cases.ts` is client-safe application behavior.** Each operation takes its collaborators first, then its input, then the current time as `now`, and returns a transport view rather than an aggregate. The use-case module holds no state, reads no clock or random source, and performs no I/O.
7. **`*.schema.ts` owns the projection** from an aggregate to its transport view, so derived fields are computed in exactly one place.
8. **Adapters live in `*.server.ts` behind a `create*` factory** and are the only modules that hold module state or import private infrastructure. An adapter parses its rows through the domain schema at the storage edge, because a row is untrusted data. `menu.server.ts` is the reference case: it parses its seed through `MenuItemSchema` on every build. The reference order store holds typed aggregates in a `Map` rather than serialized rows, so it has no row format to parse; an adapter with a real storage format must add the parse rather than trusting what it reads back.
9. **`*.functions.ts` is the composition root.** It is the single module permitted to name concrete adapters, and it owns their lifetime. It validates inputs with domain schemas, acquires ambient time, maps domain errors to transport outcomes, and delegates. It is also the inbound port, so no separate composition module is created.
10. **Production source exports no test-only helpers.** Isolation comes from the factory: each test builds its own adapters.
11. **TypeScript does not enforce the import graph; tests do.** Source-boundary tests assert the direction described in [`server-only-modules`](2026-09-29-server-only-modules.md), and they are the enforcement mechanism, not a supplement to a compiler.

## Alternatives considered

- **Keep storage and application behavior together in `*.server.ts` until a second adapter exists (the previous template decision).** Rejected: it is satisfied while a feature has no state and no foreign dependency, but it leaves four jobs in one module, forces application tests through the server boundary, hides each operation's collaborators, and reaches for a reset helper to control module state.
- **Full hexagonal layering with a dedicated `CompositionRoot` module and an inbound port interface per use case.** Rejected as ceremony for this framework. There is no driving adapter to invert, because the server function is the entry point and delegates directly; a composition module whose only content is construction, plus seven port interfaces with one implementation each, would be structure with no consumer. This remains the right shape for a service with an HTTP front end, which is why the Go template uses it there.
- **The domain as a Rust service, a WASM module, or a remote dependency.** Rejected on the integration axis: two definitions of every invariant, a code generator that can go stale, an extra runtime, and a network hop plus a database standing in for an in-process map. It buys nominal typing that `z.brand<'OrderId'>()` already provides.
- **One package per feature in a workspace monorepo, for compiler-enforced slice boundaries.** Not adopted; compatible with this decision and it composes with it. Each feature becomes a package with its own `exports` map, the boundary tests become a backup rather than the only enforcement, and the composition root is the seam such a split cuts along. Revisit when an application needs independent release cadence or multiple deployables.
- **Parameterised use cases over a port in the feature slice (chosen).** Keeps one runtime, one typechecker, and one deployment unit, while giving the application layer a seam that tests and future adapters can cross.

## Consequences

Positive:

- Application behavior is unit-tested against a test double, with no server boundary, no module state, and no reset helper.
- Each operation's collaborators are visible in its signature, and time is an argument rather than a hidden default.
- Use cases are client-safe, so an operation can be unit-tested against a test double with no server, no adapter, and no module state. They are not callable from the browser: an operation's collaborators are the ports, and the only implementations of those ports are adapters and the composition root, which run on the server. Replaying an operation in a browser would mean hand-writing a second set of adapters and keeping it in step with the first.
- A second adapter is a new file plus one line of wiring, not a refactor of every caller.
- Identity, storage, and foreign reads are each replaceable on their own.

Negative and neutral:

- Two more module roles for every feature that meets the trigger, and a real cost in onboarding: contributors must learn which module owns which job.
- The composition root holds adapter instances at module scope, so state is per process and per module. A dev server reload recreates it, exactly as before.
- The inward direction now has one documented exception, the composition root, which review and tests must police.
- The reference store has no transaction or concurrency control. A real adapter must add whatever its consistency model requires, including optimistic concurrency or a transaction, because load-apply-save on an aggregate is not atomic by itself.

Reversibility: the seam is additive. Collapsing use cases back into the adapter is a local change that discards a test file, and no wire contract or route moves.

## Testing

- `src/features/orders/orders.use-cases.test.ts` covers every operation against a test-double repository and catalog, including that a rejected transition never reaches the repository.
- `src/features/orders/orders.repository.server.test.ts` covers the adapter's ordering, identity sequence, defensive copies in both directions, and factory isolation.
- `tests/routes/server-boundaries.test.ts` asserts, for every `*.port.ts` and `*.use-cases.ts` under `src/features/`, that it imports no `*.server.ts` module, no `@tanstack/react-start` or React module, and no `node:` builtin, and that it contains no clock read, random read, or `process.env` access.
- The same file asserts that every `*.use-cases.ts` imports from a `*.port.ts` module, and that no `*.server.ts` module exports a `*ForTests` helper or declares module-level `Map`, `Set`, `WeakMap`, or array state.
- `template_docs/architecture.md` and `template_docs/dependency-rules.md` document the module roles, the inward direction, and the composition-root exception.

## Related

- [architecture.md](../../../architecture.md)
- [dependency-rules.md](../../../dependency-rules.md)
- [anti-patterns.md](../../../anti-patterns.md)
- [`branded-domain-values`](2026-09-29-branded-domain-values.md)
- [`server-only-modules`](2026-09-29-server-only-modules.md)
- [`cross-feature-access`](2026-09-29-cross-feature-access.md)
- [`server-capability-boundaries`](2026-10-02-server-capability-boundaries.md) — replaces clause 9's ban on separate composition for dual-entry features, and expands the clause 1 trigger to foreign commands
