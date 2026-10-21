# ADR: Server Functions Or Server Routes, And The API Surface They Share

Type: template
Status: accepted
Classification: architecture

## Problem

[`server-only-modules`](2026-09-29-server-only-modules.md) decided, in one clause, that "exact `Request` and `Response` semantics belong in route `server.handlers`, used for public APIs and webhooks rather than app-internal work." Everything else in the collection treats a server function as the app's server boundary and treats `server.handlers` as a template detail demonstrated once by `api.health.ts`.

The framework states the choice more sharply, and symmetrically, from both sides. On server functions: "If you need an endpoint that can be called from outside your Start app, use server routes instead." On server routes: "If you only need to call server-side logic from within your Start app and want Start to handle serialization for you, use server functions instead." And for cross-origin: "Use server routes for public APIs or endpoints that intentionally support cross-origin requests."

The previous clause got the answer right and the discriminator wrong. It asked about the shape of the return value — `Request`/`Response` semantics — when the framework asks **who is calling**. An app-internal caller that genuinely needs a `Response` had been told it had the wrong tool; a third-party caller that wants JSON had been told it should use `server.handlers` without learning why. The shape test and the caller test agree most of the time and diverge exactly where a webhook or an external API lives.

Two related questions were also open. The API surface a server function is built from was unpinned: nothing stated that the method belongs in the options object, or which validator is current, and the Start documentation mentions only one of the two validator names while the shipped package keeps the other as a deprecated alias. And `Response` is a permitted server-function return type at the type level, with no example of it anywhere in the Start documentation — the "Raw Responses" section is a single truncated sentence. A template that leaves that to discovery gets a divergent answer per contributor.

## Decision

The discriminator is the caller, not the return shape, and both kinds of inbound handler are built from a pinned surface.

1. **The caller decides the tool.** A server function is for a caller inside the application: a route loader, a component, or another server function. It serializes its return value, so it is the default and the one a feature's inbound port is made of.
2. **A server route is for a caller outside the application**, which means a public API, a webhook from a third party, or an endpoint that intentionally supports cross-origin requests. Its handler receives the real `Request` and returns a real `Response`, and the application controls status, headers, and body.
3. A file may be both. Start permits a route to declare `server.handlers` and a `component` together, so a health check or a public API can live in the same file as the page that documents it.
4. **When the caller is inside the application, do not reach for a server route because the response looks complicated.** Serialization is the feature, not a limitation to route around. A need for a non-serializable return is the one case that changes the answer, and it is a signal to record the decision.
5. **A server function is built with the method in its options object and `.validator()`.** There is no `.method()` builder method, and `inputValidator` is a deprecated alias for `validator` under a name the Start documentation never mentions.
6. A server function returns plain serializable data, or a `Response` when a raw response is the intent. A `Response` return is permitted and short-circuits serialization, but it is undocumented in the framework, so it is a deliberate choice to record rather than a convenience to use.
7. Route parameters and search params are validated where they are declared and remain isomorphic code, per [`server-only-modules`](2026-09-29-server-only-modules.md). This record does not restate that; it owns the choice of inbound handler and its surface.

### The pinned server-function surface

The normative positive, and the only accepted form:

```ts
import { createServerFn } from '@tanstack/react-start'

import { AddOrderLineInputSchema } from './orders.schema'

export const addOrderLine = createServerFn({ method: 'POST' })
  .validator(AddOrderLineInputSchema)
  .handler(async ({ data }) => {
    return orderUseCases.addOrderLine(
      orderRepository,
      menuItemCatalog,
      data,
      now(),
    )
  })
```

The runtime builder object is exactly `options`, `middleware`, `validator`, `inputValidator`, and `handler`. Two forms therefore fail, and neither fails quietly — a typo in a builder chain is a `TypeError` at import, and the deprecated alias carries `/** @deprecated Use `validator` instead. */` in its own type declaration and emits a build warning:

```ts
// Gotcha: no such builder method. `method` is a property of the options type,
// not a callable stage, so this throws at module evaluation.
export const placeOrder = createServerFn().method('POST').handler(handler)

// Gotcha: deprecated. It is the same function as `validator` under a name the
// documentation does not use, so it still works — and it is marked deprecated in
// its type and warns at build, so the alias is noisy rather than silent.
export const removeOrderLine = createServerFn({ method: 'POST' })
  .inputValidator(RemoveOrderLineInputSchema)
  .handler(handler)
```

A third form is quieter than either, because nothing fails at all. The options object is optional and `method` defaults to `GET`, so a mutation written this way typechecks, compiles, and announces itself to any proxy or prefetcher as an idempotent read:

```ts
// Gotcha: no such warning anywhere. Omitting `method` does not leave it unset —
// it becomes GET, so a POST that mutates ships as an idempotent request.
export const cancelOrder = createServerFn().handler(cancel)
```

The method therefore has to be named by rule rather than by failure, which is what this record's pinned surface is for.

An unvalidated function is called with no argument at all, which is a difference in the call signature and not only in the definition:

```ts
// No validator: the call takes no options object.
export const listMenu = createServerFn({ method: 'GET' }).handler(() => catalog.list())
await listMenu()

// With a validator: `data` is required.
export const getMenuItem = createServerFn({ method: 'GET' })
  .validator(MenuItemIdInputSchema)
  .handler(({ data }) => catalog.findById(data.itemId))
await getMenuItem({ data: { itemId: '3' } })
```

### The caller test, in both shapes

An internal caller, which is a server function and gets serialization:

```ts
// Internal: a route loader calls this. Return value is serialized for the browser.
export const listOrders = createServerFn({ method: 'GET' }).handler(() =>
  orderUseCases.listOrders(orderRepository),
)
```

An external caller, which is a server route and gets raw HTTP semantics:

```ts
// External: an infrastructure probe, not an application feature call.
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => Response.json({ status: 'ok' }),
    },
  },
})
```

## Alternatives considered

- **Keep the `Request`/`Response` shape test as the discriminator.** Rejected: it reaches the right answer from the wrong premise, so it fails on both real cases. An internal caller that needs a `Response` is steered away from the tool that is correct for it, and a third-party caller is given a rule it cannot apply, because the thing that identifies it is not its own return value. The caller test is the one the framework documents, from both sides, and it is the one that predicts behavior.
- **Treat server routes as a separate subject and leave the previous clause alone.** Rejected: the clause lived in an accepted record, so leaving it would put two records giving different tests for the same question, with the wrong one in the authoritative folder. A derived application reading the accepted collection would get the discriminator wrong and never learn the question was open.
- **Standardize on `server.handlers` for everything, so one inbound shape serves both callers.** Rejected: it discards serialization for the common case. A server function's typed return value is what makes a feature's inbound port checkable at compile time, and every internal call site in the reference application would lose that.
- **Standardize on server functions everywhere, and handle webhooks by calling them from a thin server route.** Close to the chosen answer; the residual difference is whether external protocol logic lives in the route. Rejected as a decision to defer, because the previous clause already put external semantics in the route, so this decision keeps the existing structure and only fixes the discriminator.
- **Pin the API surface in `AGENTS.md` only, and leave the reasoning to a record.** Rejected, and the choice is split rather than uniform: the surface facts are verifiable against the installed package and belong in the contract, while the caller-based rule is a decision and belongs here. `AGENTS.md` carries item 5; this record carries the reason.

## Consequences

Positive:

- The discriminator predicts behavior, so a contributor choosing between the two tools can answer from the caller without inspecting return-value shapes.
- The two builder forms that fail are named, with the shape that works, and both fail loudly: one at import, one as a build warning. A third, which fails not at all, is named beside them.
- The caller's identity is the same test for an internal endpoint and an external one, which is one rule rather than two.

Negative and neutral:

- The caller test is easy to state and easy to misread. A health check, a webhook, and an internal debug endpoint all have ambiguous callers, and a contributor will occasionally pick wrong. The cost is a slightly wrong tool, not a wrong boundary.
- Pinning the surface means the template now holds an opinion about a dependency's API, which goes stale on a major version. The code blocks above are the evidence a reviewer re-checks rather than trusts.
- Where external protocol logic lives is not decided. The previous clause already put it in the route, so this decision preserves that rather than endorsing it; an application that needs the route to be thinner should record that in `docs/adr/`.
- Item 6 rests on type-level behavior plus the shipped source, because the framework's own documentation of raw responses is an incomplete sentence. If a future version documents it properly, amend this record rather than leaving it as the only account.

Deferred: a source-boundary test distinguishing a server route from a server function by its caller. No gate can read who calls a handler, so the rule is review-enforced, and that is stated in the Testing section rather than glossed.

Reversibility: the discriminator is a rule, so changing it changes guidance and not code. Item 5 is a one-line correction per server function if the dependency's builder changes.

## Testing

- The reference application satisfies the caller test in both directions. `orders.functions.ts` and `menu.functions.ts` are server functions, reached only from loaders, components, and one another. `api.health.ts` is a server route: an infrastructure probe, called by the container health check in CI rather than by application code.
- `tests/routes/root-contract.test.ts` asserts that `src/routes/__root.tsx` renders `HeadContent` and `Scripts`, so the document shell that both kinds of route can share is present and unchanged.
- Every server function in `src/` is built with the method in its options object and `.validator()` where it takes input, and every one of them is called with the signature item 5 implies. This is review-enforced rather than test-enforced: a static check for a deprecated builder name would be a phrase match, which is the same class of gate this collection has twice found to mean less than it claims.
- Nothing in the gates reads the surface facts above. `check_adr.py` checks record structure and `bun run verify` runs the source gates; neither can see which builder method a server function uses, which is what the previous item states. Nothing in the gates can read a handler's caller either.

## Related

- [architecture.md](../../../architecture.md)
- [dependency-rules.md](../../../dependency-rules.md)
- [`server-only-modules`](2026-09-29-server-only-modules.md)
- [`server-function-call-sites`](2026-09-29-server-function-call-sites.md)
- [`authorization-boundary`](../security/2026-09-29-authorization-boundary.md)
- [`server-capability-boundaries`](2026-10-02-server-capability-boundaries.md) supplements the caller choice: browser and isomorphic loader callers use RPC; server-only integrations may use the published in-process application contract or retain RPC when they need its transport contract; external HTTP callers use server routes.
