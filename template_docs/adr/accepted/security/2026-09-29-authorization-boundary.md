# ADR: Authorize Server Functions And Server Routes With Function Middleware

Type: template
Status: accepted
Classification: security

## Problem

The collection states the security rule correctly and three times: [`server-only-modules`](../architecture/2026-09-29-server-only-modules.md) says private server functions and server routes authorize internally and that route guards are never the data-security boundary; `AGENTS.md` repeats it; [`anti-patterns.md`](../../../anti-patterns.md) names "Route Guards As Security" as an anti-pattern. The framework's own guidance is equally emphatic, and adds a reason the template does not carry: "Server functions and server routes are API endpoints; they are reachable independently of the route that calls them."

What the collection did not say is **where the authorization code goes**, and that is a structural question rather than a restatement. The template has no authentication, so there is nothing to point at, and [`ports-and-use-cases`](../architecture/2026-09-29-ports-and-use-cases.md) makes `*.functions.ts` the composition root — the single module allowed to name concrete adapters. A derived application adding its first private endpoint has to decide whether authorization is a line in each handler, a middleware attached to each function, a request middleware in `src/start.ts`, or a port the use cases receive. Four answers, all defensible, none of them written down.

The framework has a mechanism for the second and fourth options that the template did not mention at all. `createMiddleware({ type: 'function' })` produces a middleware usable by server functions specifically, distinct from the request middleware `src/start.ts` already uses for CSRF, and its documented shape for authorization is a factory: a function taking the required permissions and returning middleware, so the same policy is applied consistently to every function that needs it.

Two documented hazards had no home either. The framework warns that "shape validation is not authorization" — a parsed identifier is well-formed, not authorized — and that anything selecting which rows get read or written must be checked against a server-derived session. And it warns that `Cache-Control: public` on a response whose handler reads a session or branches on identity "will cache one user's response and replay it to the next user", a cross-tenant data leak that no type, gate, or review checklist in this repository can catch, because it is a header on a successful response.

## Decision

Authorization lives in the handler that touches private data, enforced by function middleware rather than restated per endpoint.

1. **Authorization is enforced inside the server function or server route that touches private data**, as the collection already states. This record does not restate that; it decides where the code goes.
2. **The default mechanism is function middleware**, built with `createMiddleware({ type: 'function' })` and attached with `.middleware([...])` on the server function it guards. Request middleware in `src/start.ts` is for concerns that apply to every request, such as CSRF, and is not where per-endpoint authorization goes.
3. A shared authorization policy is a **factory** — a function taking the required permissions and returning middleware — so attaching it to a server function also states what that function requires.
4. **A private server function that can be reached without its middleware is a defect.** A missing `.middleware([...])` on a private function is review-enforced, because whether a function is private is a product fact no gate in this repository can read.
5. **The session is derived server-side**, from a cookie or request data resolved in middleware. It is never taken from client context. The framework documents that client-to-server context is opt-in through `sendContext` and "is NOT sent to the server by default since this could end up unintentionally sending large payloads to the server"; anything the client can send, the client can lie about.
6. **A validated identifier is not an authorized one.** Where a value from a validator selects which rows are read or written — a tenant id, an owner id, a path parameter — the handler must also verify the principal may reach it.
7. **A response whose handler reads a session, a cookie, or an auth header, or that branches on identity at all, is not cacheable in public caches.** Use `private`, and vary on the credentials that were read. The reference application has no identity and so no exposure here; a derived application that adds one inherits the hazard.
8. Route guards remain navigation UX, and `beforeLoad` remains for keeping users out of screens they cannot use. The framework's own framing is that a guard "avoids triggering work that would fail anyway", which is the correct description of what a guard is for.

### The policy as a factory

The normative positive. The permission is named where the endpoint is defined, and the middleware is the only thing that touches the session:

```ts
// A policy is a factory, so the requirement is an argument and stays visible.
export function authorizationMiddleware(permissions: Permissions) {
  return createMiddleware({ type: 'function' })
    .middleware([authMiddleware])
    .server(async ({ next, context }) => {
      const granted = await auth.hasPermission(context.session, permissions)

      if (!granted) throw new Error('Forbidden')

      return await next()
    })
}
```

Attached to the server function it guards, where the requirement is readable without opening the middleware:

```ts
export const getMyOrders = createServerFn({ method: 'GET' })
  .middleware([authorizationMiddleware(['orders:read'])])
  .handler(async ({ context }) => {
    return db.orders.findMany({ where: { userId: context.session.userId } })
  })
```

### The gotcha a validator does not cover

A validated identifier is well-formed, not authorized. A tenant id that passes the schema still selects somebody else's rows:

```ts
// Gotcha: the validator proves `tenantId` is a UUID. It proves nothing about
// whether this principal may read that tenant, and the response is a clean 200
// carrying another tenant's rows.
export const listInvoices = createServerFn({ method: 'GET' })
  .validator(TenantIdInputSchema)
  .handler(async ({ data }) => db.invoices.findMany({ tenantId: data.tenantId }))

// Normative: shape, then access, then use — in that order.
export const listInvoices = createServerFn({ method: 'GET' })
  .validator(TenantIdInputSchema)
  .middleware([authorizationMiddleware(['invoices:read'])])
  .handler(async ({ data, context }) => {
    await assertTenantAccess(context.session, data.tenantId)

    return db.invoices.findMany({ tenantId: data.tenantId })
  })
```

And the leak that no type or test can see, because it is a header on a successful response:

```ts
// Gotcha: this handler branches on identity, so a shared cache will serve one
// user's invoices to the next. Correct code, cross-tenant disclosure.
setResponseHeaders(new Headers({ 'Cache-Control': 'public, max-age=300' }))

// Normative: private, and vary on whatever the handler actually read.
setResponseHeaders(
  new Headers({
    'Cache-Control': 'private, max-age=60',
    Vary: 'Cookie, Authorization',
  }),
)
```

## Alternatives considered

- **An explicit authorization check at the top of each handler.** Rejected as the default: it is the framework's documented anti-pattern to leave it per-endpoint when a mechanism exists to attach it, and it makes the required permission invisible at the module's edge. It remains acceptable for a one-off check that does not fit a policy.
- **Request middleware in `src/start.ts` for authorization.** Rejected: global request middleware runs for every request including server routes and SSR, so a per-endpoint permission expressed there is either applied too broadly or conditional on inspecting the request in a way that reconstructs per-endpoint policy in the wrong place. It is the right home for CSRF, which is why the template uses it that way today.
- **A port the use cases receive, so authorization is a collaborator.** Rejected as the default, and noted as a genuine alternative: it would make authorization unit-testable in the same way the collection already makes storage testable, which is appealing. It is rejected because authorization is an inbound concern, and the collection deliberately makes the server function the inbound port with no separate interface layer. An application that wants it in the application layer should record that in `docs/adr/`; the seam already exists in [`ports-and-use-cases`](../architecture/2026-09-29-ports-and-use-cases.md).
- **Amend `server-only-modules` instead of adding a record.** Rejected: that record is `architecture`, this decision is `security`, and the classification set exists precisely so a reader can tell a trust-boundary decision from a structural one. Folding it in would also mean editing an accepted record's rationale, which the collection forbids in favor of a linked record.
- **Defer the whole question until an application adds authentication.** Rejected: this is exactly the moment the decision is most expensive, because the first private endpoint is written before anyone realizes a policy exists, and the first one is usually a handler-local check that then has to be refactored across every endpoint added since. The Authentication Extension in `architecture.md` is the right moment to *implement* this; it is not the right moment to first write it down.

## Consequences

Positive:

- A derived application adding authentication has a named place for its authorization code, so the first private endpoint is not also the first private policy.
- The required permission is an argument at the server function, readable without opening the middleware.
- Items 5, 6, and 7 name three failure modes that are invisible to types, gates, and review checklists in this repository.

Negative and neutral:

- Middleware is invisible at the call site of the function it wraps when attached in a list, so a reviewer must read the server function's definition rather than its use. That is the cost of keeping the permission next to the endpoint instead of inside it.
- A factory-based policy is one more layer between a reader and the check, and a misconfigured factory fails open or closed depending on how it is written. This record does not prescribe failure behavior; an application should record whether an authorization failure denies or errors.
- Nothing here is enforced by a gate, because whether a function is private is a product fact this repository cannot read. That is stated in item 4 rather than glossed, and it is the same review-enforced class as the `getRouteApi()` rule in [`feature-slices`](../architecture/2026-09-29-feature-slices.md).
- Item 7 addresses a hazard only reachable once identity exists. It is recorded now so an application that adds authentication inherits the warning, and it is the one item the reference application cannot demonstrate.
- The `Permissions` type in the example above does not exist in the template, because the template has no identity. The shape is the framework's; the vocabulary is a derived application's to choose, and choosing it is an application record.

Reversibility: moving authorization from middleware to a port is a refactor across every guarded function, and the collection already keeps the port seam available for exactly that. Changing the factory's failure behavior is local.

## Testing

- `tests/routes/root-contract.test.ts` asserts that `src/start.ts` installs the CSRF middleware filtered to `handlerType === 'serverFn'`, which is the one piece of function-boundary machinery the template does ship, and confirms that item 2's "request middleware for concerns that apply to every request" is a live distinction rather than a hypothetical one.
- `tests/routes/server-boundaries.test.ts` asserts that no `*.port.ts` or `*.use-cases.ts` imports a server-only module, reads the clock or the environment, or reaches an adapter. That is the mechanical half of item 1: application behavior cannot obtain a session or a secret, so a policy check placed there would have nothing to read.
- Items 3, 4, 5, 6, and 7 are review-enforced. No gate can read a session, a permission, or a response header, and the reference application has no identity to test against. Stating that is the point of the Testing section: a security claim with no evidence behind it is exactly what this collection has twice found to be a false claim.
- The E2E suite exercises the application without authentication, so it cannot and does not cover any item here. A derived application that adds identity must extend it, and the not-found and error paths in `e2e/ordering.spec.ts` are the shape such a test would take.

## Related

- [architecture.md](../../../architecture.md)
- [anti-patterns.md](../../../anti-patterns.md)
- [`server-only-modules`](../architecture/2026-09-29-server-only-modules.md)
- [`ports-and-use-cases`](../architecture/2026-09-29-ports-and-use-cases.md)
- [`server-fn-boundary`](../architecture/2026-09-29-server-fn-boundary.md)
- [`server-capability-authorization`](../security/2026-10-02-server-capability-authorization.md) — supplements clauses 1–6 with a second inbound application contract and the concrete `src/lib` middleware placement
