# ADR: Publish Server-Only Application Capabilities Between Features

Type: template
Status: accepted
Classification: architecture

## Problem

A template user needed four kinds of server-side sharing: a middleware policy factory, authoring operations over shared state, an acceptance decision, and an audit sink.
The published-functions-only rule led them to re-export server-only bindings from client-importable functions modules.
Those four exports produced seventeen import-protection denials despite green source tests and a green build in their application.
Allowing any server-module import would avoid that runtime trap but would discard the feature ownership and test isolation that motivated the original rule.

## Decision

A feature publishes client-callable RPC in `<feature>.functions.ts` and, when it needs them, in-process server-only application operations in `<feature>.surface.server.ts`.
That second entrypoint is an ordinary supported relationship, not an exception that needs an application record per dependency.
It publishes intentional input and result contracts and operations, including provider-owned decisions; repositories, mutable store objects, entities, internal domain functions, and implementation types stay private.
The consumer declares its own port, maps through an injectable `<consumer>.<provider>-adapter.server.ts`, and imports the runtime provider entrypoint only from a `<consumer>.<provider>-binding.server.ts`.
The mapping factory carries no runtime provider import, so its tests supply a fake without initializing provider infrastructure.
Only that factory may import published provider contract types; consumer ports and use cases keep their own vocabulary.

A feature with two inbound entrypoints uses a private `<feature>.composition.server.ts` to construct collaborators and own their lifetime.
Both entrypoints import composition; composition imports neither entrypoint, and no other feature may import it.
The published server-only operations bind to that instance rather than to a factory that would silently create one provider instance per consumer.
A single-entry feature keeps its composition in its functions module.
Instances are per server module and per process, not cluster-wide; request principal and tenant context are supplied per operation rather than retained in process singletons.

The application-layer trigger is storing cross-request state or consuming a foreign capability, including commands.
Private infrastructure belongs in a focused `src/lib/*.server.ts` only when it owns technical concerns with no feature rules and no feature imports.
The source graph and the feature graph stay acyclic.
Eager factory construction is supported in an acyclic composition graph; lazy construction is not a substitute for fixing a cycle.

This record partially supersedes [`cross-feature-access`](2026-09-29-cross-feature-access.md) clauses 1, 2, and 4, retaining its consumer mapping, its private domain ownership, and its demonstrated shared-value promotion.
It replaces [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md) clause 9's ban on separate composition for dual-entry features, and expands that record's clause 1 trigger to foreign commands.
It supplements the caller choice in [`server-fn-boundary`](2026-09-29-server-fn-boundary.md) and [`server-function-call-sites`](2026-09-29-server-function-call-sites.md): browser and SSR callers use RPC, server-only integrations can use the published in-process application contract, and external HTTP callers still use server routes. A server-side consumer may retain RPC when it needs that published transport contract.
A shared transaction, or any other departure from these boundaries, requires an application record in `docs/adr/`; that corrects the template-collection requirement in `cross-feature-access` clause 6.

## Alternatives considered

**Retain published server functions for every caller.** Retained as the client-callable default, but insufficient for request-independent server integrations and the reported server-only capability sharing.

**Permit arbitrary feature-to-feature server imports.** Rejected because it reaches into provider storage and makes consumers depend on private implementation and infrastructure during tests.

**Publish server-only values through one unsuffixed barrel.** Rejected because those values survive in the client graph. A client-safe contract or transformed declaration in an unsuffixed file remains valid; the mixed runtime barrel is the defect.

**Require an exception ADR and explicit importer registration for every server-only dependency.** Rejected because it leaves normal server-to-server communication exceptional and adds a second inventory that can drift. The filename roles, declared consumer port and dependency gate establish the supported shape; semantic ownership remains review-enforced.

## Consequences

- The supported set of cross-feature relationships grows from one entrypoint to two, so the source graph has a documented shape that is no longer expressible as "published server functions only".
- A dual-entry feature has more files. That is the accepted cost of the second entrypoint, and separate production bindings are what keep fake-based tests free of provider initialization.
- The suffix establishes runtime placement, not the correctness of the published contract. Review must confirm that a `.surface.server.ts` module exposes application behavior rather than private state; the filename cannot enforce that.
- In-process calls give no shared transaction and no independent service isolation. A decision result can go stale before a later command reads it, so a provider must enforce any atomic invariant inside its own operation rather than relying on a caller to compose two calls.
- The portable skills absorb this decision only after it is accepted and available at a real upstream revision, so the pinned template reference is what a skill author reads.

## Testing

- `tests/routes/dependency-graph.test.ts` — enforces published entrypoints, the consumer integration roles, private composition, runtime cycles, feature cycles, and `src/lib` ownership, with positive and negative syntax fixtures.
- `tests/routes/server-capability-fixture.test.ts` applies production dependency-boundary checks to fixture source and verifies that the injectable consumer adapter has no runtime provider dependency.
- `bun run test:capabilities` invokes `tests/server-capabilities/run.ts`, stages and builds the isolated Start application, and runs production and dev browser suites to exercise authoring reads and commands, provider-owned acceptance, and audit writes through consumer ports.
- Together they cover that RPC and the server-only operations share provider state, that consumer factories accept fakes without provider initialization, that denied access stays denied, and that concurrent callers keep separate identity.

## Related

- [`cross-feature-access`](2026-09-29-cross-feature-access.md)
- [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md)
- [`server-fn-boundary`](2026-09-29-server-fn-boundary.md)
- [`server-function-call-sites`](2026-09-29-server-function-call-sites.md)
- [`server-capability-authorization`](../security/2026-10-02-server-capability-authorization.md)
- [server-capabilities.md](../../../server-capabilities.md)
