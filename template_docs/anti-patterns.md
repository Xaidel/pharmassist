# Anti-Patterns

Each entry names the failure, then the rule that prevents it. The rules are stated in [`feature-slices`](adr/accepted/architecture/2026-09-29-feature-slices.md) through [`cross-feature-access`](adr/accepted/architecture/2026-09-29-cross-feature-access.md); this document is the review checklist for them, not a second source of truth.

## Publishing private values through RPC

Functions modules are client-importable. Compose private bindings for transformed server handlers; never re-export a store, server-only factory or private helper from them, including through an imported alias. Server-only communication uses a published application entrypoint, consumer port and integration binding as shown in [server-capabilities.md](server-capabilities.md).

## Initialization order as architecture

Eager module-scope construction can expose a runtime import cycle as an uninitialized binding behind green typechecks. Keep construction in the composition owner, inject collaborators, and remove cycles. A lazy getter hides evaluation order rather than repairing the dependency direction.

## Fat Route Modules

Symptoms include forms, feature state, schemas, database imports, or business rules in `src/routes`. Keep paths and route lifecycle behavior there; move the feature behavior to its owning slice.

## Route Guards As Security

A redirect protects navigation UX, not data. Every private server function and server route authorizes using trusted server-derived identity.

## Folder Names As Runtime Protection

A directory called `server` does not prevent browser bundling. Use `*.server.ts`, Start import protection, and correct imports.

## One Feature Per Page

Features represent business capabilities, not route names. One feature may support several routes, and one route may compose several features.

## Speculative Shared Code

Do not move a component, hook, type, or utility to `shared` because it might be reused. Promote it only after ownership is genuinely cross-feature.

## Rebuilt Primitives And One-Off Components

A second component that re-marks up a primitive's structure and styling under a new name, instead of importing the primitive. The linter cannot see it, so the fork ships clean while carrying a private copy of the spacing, focus ring, and color bindings the primitive already owns.

A wrapper that only forwards classes through, and a second feature that writes its own copy of a piece another feature already renders. The second feature promotes the existing file; it does not re-implement it.

Import the primitive. Wrap it when the wrapper names a concept the domain has. Promote when a second feature needs the piece. See [`component-reuse`](adr/accepted/process/2026-10-01-component-reuse.md).

## Catch-All Services And Utilities

Avoid global `services/` and unrelated `utils.ts` collections. Use feature server functions and focused utilities, each named for the job it does: `cn.ts` for class-name merging, `env.server.ts` for environment parsing once the application needs one, and a logger once it needs one.

## Direct Infrastructure In Loaders

Loaders are isomorphic. They call server functions rather than importing a database, filesystem, secret environment module, or private SDK.

## Premature Platform Defaults

Do not make a database, auth provider, analytics vendor, query cache, or cloud adapter a template requirement before the application has that need.

## Anemic Domain

A `*.domain.ts` that contains only types while rules live in server operations, UI, or schemas. Invariants and transitions belong to the domain module; move behavior there or delete the domain module.

## Class Domain Objects Across Runtime Boundaries

A domain entity built from classes with methods or private state cannot cross a server-function or SSR serialization boundary intact. Keep domain values plain and serializable: branded primitives and plain objects.

## Interior Re-Validation

Re-checking a value already parsed at the boundary of the same feature context. Parse once at each distinct feature-context boundary; trust the resulting types within that context.

## Global Domain Model And Premature Shared Kernel

Promoting value objects or entities to `src/shared/domain` before two features genuinely use them, or sharing one feature's domain types across features. Promote on demonstrated reuse and map foreign data at the consumer's edge.

## Impure Domain

Clock reads, environment access, random values, authorization, or I/O inside `*.domain.ts`. Pass time, identity, and generated values as arguments; keep enforcement at the server boundary.

## Ports Without A Trigger

A `*.port.ts`, a `*.use-cases.ts` module, or a composition root written for a capability the feature does not have. A port is justified by state the feature must store across requests or by a foreign capability it consumes, including a read, command, or decision, not by aspiration: a fixed catalog with no lifecycle needs neither, and a `*.server.ts` exposing a `create*` factory is enough.

The retired rule — no port until a second real adapter exists — is the same mistake stated as a waiting period, and it fails for tests as much as it fails for the next adapter. The trigger is the work, not the number of implementations.

## Adapters In The Application Layer

A `*.port.ts` or `*.use-cases.ts` module that imports an adapter, reaches for `process.env`, reads the clock, or holds module state. Ports are type-only, use cases take their collaborators as parameters, and only the composition root names concrete implementations.

## Test-Only Seams In Production Modules

A `resetOrdersForTests` export, a module-level `Map` a test can clear, or any other export that exists only so a test can control state. Build isolated instances from a factory instead; the factory is a legitimate production seam and the test helper is not.

## Routes That Render Markup

Feature JSX in a route module, or a route that composes elements instead of naming one feature page. `src/routes/__root.tsx` is the exception: it is the document shell and renders `html`, `head`, and `body`. Every other route registers a URL and names a page component.
