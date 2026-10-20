# Cross-feature server-only communication

This guide is the normative construction of [`server-capability-boundaries`](adr/accepted/architecture/2026-10-02-server-capability-boundaries.md) and [`server-capability-authorization`](adr/accepted/security/2026-10-02-server-capability-authorization.md), which own it. Where this guide and those records disagree, the records govern and this guide is the defect.

## Choose the published contract

| Need | Published contract | Consumer |
| --- | --- | --- |
| Browser or isomorphic loader needs server work | `<feature>.functions.ts` | Route loader or component; Start transforms the RPC implementation |
| Another feature needs the provider's RPC behavior | `<feature>.functions.ts` | Consumer composition implements its own port and maps returned data |
| Server-only feature needs an in-process read, command or decision | `<feature>.surface.server.ts` | Consumer integration binding and injectable adapter implementing its own port |
| Shared technical infrastructure without a feature owner | Focused `src/lib` module | Runtime-compatible imports; lib never imports features/routes |

The surface is an inbound application contract, not a repository adapter. A `.server.ts` suffix names runtime, not architectural role.
Publish operations over state and intentional DTOs, not a store object, domain entity, internal predicate or implementation-derived type.
Normal server-only communication needs no exception ADR. A shared transaction, unusual lifetime or departure from the dependency direction still needs an application decision.

## Wire a provider once

```text
provider.functions.ts ────────┐
                             v
provider.surface.server.ts -> provider.composition.server.ts
                                  -> provider.use-cases.ts
                                  -> provider.repository.server.ts
```

Both entrypoints import the same private composition. It constructs the provider's collaborators, owns their process/module lifetime, and imports neither entrypoint.
A single-entry feature keeps its existing functions-module construction rather than gaining another file.
RPC validates through its validator; the surface parses its own published input. Both pass parsed values to the same application implementation and access policy.
Time arrives explicitly at use cases, request actor/tenant context arrives per call, and snapshots do not expose mutable provider state.

## Keep consumer tests independent

```text
consumer.functions.ts
  -> consumer.<provider>-binding.server.ts
       -> provider.surface.server.ts
       -> consumer.<provider>-adapter.server.ts
            -> consumer.port.ts
```

If the consumer also has two entrypoints, its private composition owns this wiring instead of its functions module.
The adapter exports `create*` taking a narrow published provider contract and execution context, implements the consumer port, and maps provider inputs/results/errors into consumer terminology.
It imports provider contract types with `import type` only. Importing it in a test cannot initialize provider infrastructure.
The binding imports the real provider operations and supplies them to that factory. Each request supplies context, so no process singleton captures a principal.
The use case receives the consumer port and never imports the provider or its runtime.

The executable examples are `tests/server-capabilities/src/features/workflow/workflow.authoring-adapter.server.ts` and its matching binding, port and tests.
Authoring publishes draft reads/writes and acceptance evaluation; audit publishes writes over private storage. These model the reported authoring store, acceptance predicate and audit-store needs without publishing the underlying objects.

## Shared authorization middleware

Use a client-safe `authorization.middleware.ts` declaration and private `session.server.ts` implementation. Reference the private binding only inside the server callback:

```ts
import { createMiddleware } from '@tanstack/react-start'
import { resolveSession } from './session.server'

export function authorizationMiddleware(permission: Permission) {
  return createMiddleware({ type: 'function' }).server(({ next }) => {
    const session = resolveSession()
    assertPermission(session, permission)
    return next({ context: { session } })
  })
}
```

`Permission` and `assertPermission` belong to the app's selected policy model; the template implements neither a production identity provider nor a universal permission vocabulary.
Private imports here are safe because Start removes server callbacks from client output, not merely because an import is "internal".
The factory itself is invoked at RPC declaration time, so naming it `.server.ts` does not make the declaration safe. The fixture runner tests that rejected placement as a negative control.
Feature-specific policies stay with their feature; technical lib modules import no features.

## Preserve authority and contract outcomes

Each provider operation checks principal/resource access through shared provider policy, regardless of which entrypoint was used.
Client context is untrusted, a validated identifier is not authorized, and absent execution context never implies a privileged actor.
Jobs supply an explicit service identity. In-process calls are not process isolation and do not grant shared transactions.
Return published outcomes, including `null` for normal absence where the port expects it. Consumer adapters translate denial and infrastructure failure rather than exposing provider implementation detail.
RPC wrappers map to transport outcomes; redirect/not-found objects and response headers do not become the internal protocol.
An acceptance snapshot identifies the evaluated revision but does not guarantee a later mutation sees the same state. Atomic invariants belong inside a provider operation.

## Import and initialization traps

A functions module may import its own server implementation for references used only by transformed handlers. It cannot publish server-only values through a re-export or imported alias.
Type-only imports erase runtime links, but architecture still limits which provider contracts a consumer may know.
Eager factories in module scope can expose runtime cycles as uninitialized bindings behind green typechecks. Fix the graph and inject collaborators; do not hide a cycle behind a lazy getter.

## Executable evidence

`bun run test:capabilities` stages the fixture into a separate app, installs the same frozen dependencies, runs its unit tests, build, typecheck and lint, then browser acceptance in production and dev.
It checks server session implementation is absent from executable client output and exercises invalid re-exports and a server-only policy factory as deliberately rejected builds.
The fixture uses synthetic request credentials. It proves the integration mechanism, provider denials and mapping, not a production identity-provider choice.
The context probe shows nested RPC re-runs provider middleware and validation while outer function middleware fields are not implicitly inherited. Components calling a redirecting RPC still need `useServerFn`; bare calls reject with the redirect.
The source gate handles the template's relative and `#/` aliases, import/export syntax and literal dynamics, and reports computed/unresolved source imports. Generated route registration and CSS assets are outside the author-owned module graph.
The gate proves declared dependencies and export forms, not arbitrary value-flow safety or semantic quality of a published contract. Start builds, browser execution and review cover those claims.
