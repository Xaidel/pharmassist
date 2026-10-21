# ADR: Server-Only Modules And Client-Safe Application Code

Type: template
Status: accepted
Classification: architecture

## Problem

One process serves HTML, serialized data, and static assets, so the boundary that decides what reaches the browser is a build-time concern. TanStack Start protects `*.server.ts` from browser bundling and transforms `createServerFn` bodies into RPC stubs, which means the framework enforces the suffix and not much else. A module that reaches for a database through an unsuffixed path ships to the browser with the code that calls it.

Three specific hazards recur. Route loaders run during SSR and again during browser navigation, so a loader that imports infrastructure directly is server code in a module the contract calls isomorphic. A dynamic import of a server function with a computed path hides the module graph from the transform that makes the RPC boundary work: the build passes and the RPC stub is emitted, but the handler is never registered, so the call fails at runtime with `Server function info not found`. And a helper that exists only so a test can control module state, such as `resetOrdersForTests`, becomes part of the public surface of a production module and a place where a test can race the application.

The reference store is process-local, which makes the last hazard easy to hit: a `Map` at module scope is not resettable without a production export, and its lifetime is invisible from any call site.

## Decision

Name the runtime boundary in the filename, keep unsuffixed code safe for both runtimes, and keep test control out of production modules.

1. `*.server.ts` is server-only and may import databases, private SDKs, filesystem modules, and secrets. Start's import protection and the production build enforce it. Components, hooks, route loaders, and client-safe barrels never import `*.server.ts`.
2. `*.client.ts` is browser-only, for a feature that needs IndexedDB, the DOM, or other client infrastructure.
3. Every unsuffixed module is client-safe. This includes `*.port.ts` and `*.use-cases.ts`, which are client-safe by design so a test can call them without starting a server.
4. A client-safe barrel never re-exports a server-only value.
5. Route loaders are isomorphic. They call client-safe server functions and never import a database, filesystem module, secret environment module, or private SDK.
6. A dynamic server-function import takes a static string literal. The transform resolves it to the RPC stub and registers the handler, so the call still crosses the server boundary. A computed import path is the one dynamic form that fails: the build passes, but the handler is never registered and the call rejects at runtime with `Server function info not found`.
7. A server function accepts one logical `data` input, validates it with a domain-authored schema, and returns plain serializable data. Exact `Request` and `Response` semantics belong in route `server.handlers`, used for public APIs and webhooks rather than app-internal work. The test for which tool to reach for is the caller rather than the return shape, and [`server-fn-boundary`](2026-09-29-server-fn-boundary.md) owns that test, the pinned builder surface, and the `Response`-return exception; this clause retains the input, validation, and serialization rules.
8. `src/start.ts` explicitly installs CSRF middleware for server functions, and retains it unless an accepted template record records an equivalent alternative.
9. Private server functions and server routes authorize internally against a server-derived principal. Route guards exist for redirect and navigation UX and are never the data-security boundary. Where that authorization code lives, and the middleware shape that carries it, are owned by [`authorization-boundary`](../security/2026-09-29-authorization-boundary.md); this clause retains the rule and not its mechanism.
10. `getRouter()` returns a fresh router instance, `src/routes/__root.tsx` renders `HeadContent` and `Scripts`, and `tanstackStart()` precedes the React Vite plugin.
11. Production source exports no test-only helper and declares no module-level mutable state. Adapters are built by a `create*` factory, and each test builds its own.

## Alternatives considered

- **Guard server code with runtime environment checks instead of filenames.** Rejected: a check runs after bundling, so the database client and its credentials are still in the browser payload, and the failure is a production incident rather than a build error.
- **A `server/` directory as the boundary.** Rejected: a directory name does not exclude a module from a browser bundle, and it collides with the feature-vertical organization in [`feature-slices`](2026-09-29-feature-slices.md).
- **Keep unsuffixed modules unrestricted and rely on review.** Rejected: the boundary that matters most is the one that fails silently at build time, and review does not fail builds.
- **Dynamic server-function imports to reduce initial bundle size.** Rejected for computed paths: the build passes and the stub is emitted, but the handler is never registered, so the call fails at runtime with `Server function info not found` — a green build and a broken call. A static-string dynamic import is supported and crosses the boundary; whether it earns its separate chunk is a per-feature call, not a boundary question.
- **Route guards as the only protection for private data.** Rejected: a guard controls navigation, not the response body of a server function that a client can call directly.
- **Test helpers such as `resetOrdersForTests` exported from production modules.** Rejected: a test seam in the production surface invites cross-test interference. The factory pattern removes the need for one.

## Consequences

Positive:

- Secrets, storage, and private SDKs cannot reach the browser, and the production build fails loudly if an attempt is made.
- Loaders, components, and tests are all safe to import anywhere, so isomorphic code stays isomorphic.
- Test isolation is a factory call, so tests cannot leak state into each other and the production surface carries no test-only exports.
- The rules are mechanically checkable, and the source-boundary tests assert them.

Negative and neutral:

- The filename carries meaning the compiler checks only at build. Start's import protection fails the production build on a denied import, but in `dev` it mocks the module and reports on access instead, so a boundary error surfaces as a console message during development rather than a failed command. The boundary tests and review still carry part of the burden.
- The `create*` factory pattern means a module that holds state must be constructed somewhere, and that somewhere is the composition root.
- Module-scope state is per process, so horizontal scaling needs shared storage; this is a property of the reference store, not of the boundary.

Reversibility: the suffix convention is cheap to keep and expensive to retrofit, which is why it is decided at the template level.

## Testing

Automated:

- `tests/routes/server-boundaries.test.ts` checks client-safe route and feature modules, with exceptions for `*.server.ts`, `*.functions.ts`, `*.middleware.ts`, and test files. Syntax-aware dependency analysis restricts middleware private imports to recognized transformed server callbacks.
- The same file asserts that no `*.server.ts` module exports a `*ForTests` helper or declares module-level `Map`, `Set`, `WeakMap`, or array state, and that no route module other than `src/routes/__root.tsx` contains an intrinsic HTML element. `__root.tsx` is the document shell and is the one place a route module renders markup.
- `tests/routes/root-contract.test.ts` asserts that `src/start.ts` installs the CSRF middleware filtered to `handlerType === 'serverFn'`, and that `src/routes/__root.tsx` renders `HeadContent` and `Scripts`.
- `bun run verify` runs the production build, so Start's import protection is exercised on every change; a broken server import fails the build rather than shipping.

Manual, because automation would misrepresent the claim:

- Import a `*.server.ts` module from a component and confirm the build rejects it, rather than bundling it.
- `src/routes/api.health.ts` is the reference application's route `server.handlers` entry point; exercising it needs a running server.
- Dynamic server-function imports, verified against the built app: a static-string import resolves to the RPC stub, the handler is registered, and the call returns over the boundary; a computed path builds green but the handler is never registered, and the call rejects at runtime with `Server function info not found`.
- `bun run test:e2e` exercises the built application through the public browser interface, and `docker build .` validates the generated Bun server output.

## Related

- [architecture.md](../../../architecture.md)
- [anti-patterns.md](../../../anti-patterns.md)
- [`feature-slices`](2026-09-29-feature-slices.md)
- [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md)
- [`cross-feature-access`](2026-09-29-cross-feature-access.md)
- [`server-fn-boundary`](2026-09-29-server-fn-boundary.md), which owns the choice between a server function and a server route, the pinned builder surface, and the caller test that replaces the shape test in clause 7
- [`authorization-boundary`](../security/2026-09-29-authorization-boundary.md), which owns where per-endpoint authorization code lives, and the mechanism clause 9 does not name
- [`server-function-call-sites`](2026-09-29-server-function-call-sites.md), which owns where a server function is called from and how a mutation refreshes
