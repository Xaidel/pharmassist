# ADR: Server Function Call Sites And Mutation Refresh

Type: template
Status: accepted
Classification: architecture

## Problem

The records govern where a server function is *defined*. [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md) makes `*.functions.ts` the composition root and the feature's inbound port, and [`server-only-modules`](2026-09-29-server-only-modules.md) fixes the suffix, the input shape, and the serialization rule. None of them says where a server function is *called from*, and the framework's answer is not uniform across call sites.

Start documents three call sites: a route loader, a component, and another server function. The first and third behave predictably. The second has a behavior that appears in no prose: `useServerFn` intercepts a thrown redirect and converts it into `router.navigate(...)`. In the installed `@tanstack/react-start`, that is its entire implementation:

```ts
function useServerFn(serverFn) {
  const router = useRouter()
  return React.useCallback(async (...args) => {
    try {
      const res = await serverFn(...args)
      if (isRedirect(res)) throw res
      return res
    } catch (err) {
      if (isRedirect(err)) {
        err.options._fromLocation = router.stores.location.get()
        return router.navigate(router.resolveRedirect(err).options)
      }
      throw err
    }
  }, [router, serverFn])
}
```

The documentation says server functions "can throw errors, redirects, and not-found responses that are handled automatically when called from route lifecycles or components using `useServerFn()`". It does not say what happens to a redirect thrown by a component that called the server function directly, and it gives `useServerFn` no page of its own. A contributor reading only the prose cannot tell whether the wrapper is required.

The reference application was correct by circumstance rather than by rule. `orders-page.tsx` called `createOrder()` directly in a click handler; that server function threw nothing, so the missing wrapper was invisible. `getOrder` does throw `notFound()`, and it is called from a route loader, where the router does handle it. The two call sites happened to be the two that work. A derived application whose first mutation throws `redirect()` from a component event handler would have had no rule to consult, and nothing in the gates would fail.

Mutation refresh was a second gap of the same shape. Both feature pages called `router.invalidate()` after a successful mutation and kept pending and failure state in local `useState`, rendering an `Alert`. That was repeated in two places, which suggests a convention, but no record or contract stated it, so the third page would have been written by copying whichever file the author opened last.

## Decision

The call-site rules and the mutation-refresh rule are stated in one place, so the composition-root rule has a matching answer on the consuming side.

1. A server function is called from one of three sites, and the site follows from the operation. A read belongs in a route loader, because the loader is the framework's isomorphic data boundary and re-runs on navigation. A mutation belongs in a component event handler. A server function that composes another server function is composition, and belongs in `*.functions.ts`.
2. **A server function that can throw `redirect()` or `notFound()` and is called from a component is wrapped in `useServerFn` before it is called.** The wrapper is what turns a thrown redirect into client navigation, as its implementation shows. A loader needs no wrapper, because the router already handles not-found and redirect outcomes in the route lifecycle.
3. A component that cannot know whether a server function redirects should wrap it. The cost of an unnecessary `useServerFn` is one hook call; the cost of a missing one is a navigation that does not happen.
4. After a successful mutation, refresh through `router.invalidate()` rather than by patching local state. Invalidation is correct regardless of which server function ran, and it is the only option that cannot drift from the loader that produced the data.
5. Pending and failure state is owned by the component that awaits the call. The template has no query cache, and `AGENTS.md` forbids adding one without a concrete requirement, so the baseline is local state and an `Alert`; an application that adopts a query library records that choice in `docs/adr/` and this item becomes that library's convention instead.
6. Error text shown to a user comes from the domain error's message, which the transport has already mapped. The composition root owns that mapping, per [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md); this record does not restate it, and a component adds a fallback message only for the case where the transport could not supply one.

### What a component call looks like

The normative positive. The page owns the call, the wrapper, and the refresh:

```tsx
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { createOrder } from '../orders.functions'

export function OrdersPage(): React.JSX.Element {
  const router = useRouter()
  const startOrder = useServerFn(createOrder)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string>()

  async function handleCreate(): Promise<void> {
    setIsCreating(true)
    setError(undefined)
    try {
      const order = await startOrder()
      await router.invalidate()
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    } catch {
      setError('The order could not be created. Try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return <Button disabled={isCreating} onClick={handleCreate}>New order</Button>
}
```

A loader needs no wrapper, and must not take one:

```ts
export const Route = createFileRoute('/orders/$orderId')({
  loader: async ({ params }) => {
    // The router already handles the not-found outcome here.
    const order = await getOrder({ data: { orderId: params.orderId } })

    return { order }
  },
  component: OrderDetailPage,
})
```

### The gotcha this record exists for

Calling a redirect-capable server function straight from an event handler bypasses the interception. The redirect arrives as an ordinary JSON payload, and the fetcher throws it — so the call **rejects**, with the redirect object as the rejection value.

```tsx
// Gotcha: the navigation never happens, and the call rejects with the redirect
// object, so the catch below reports a mutation that actually succeeded.
const order = await createOrderAndRedirect()

// Normative: the wrapper is what turns the thrown redirect into router.navigate.
const startOrder = useServerFn(createOrderAndRedirect)
const order = await startOrder()
```

That mismatch is the reason this is a rule and not a lint preference. A wrong return value is visible in the result. An unwrapped redirect is a call that succeeded, reported to the user as a failure, with no navigation — and `src/features/orders/pages/orders-page.tsx:35` is exactly that shape: its `catch` sets 'The order could not be created. Try again.' on an order that was created.

## Alternatives considered

- **Always wrap every server function a component calls, redirect-capable or not.** Rejected as noise. It makes the wrapper a default to be remembered rather than a response to a property of the function, and it hides the one case that matters. Decision item 3 already covers the uncertain case.
- **Prohibit component event handlers entirely, and route every mutation through a loader or an action.** Rejected: it is a larger change than the gap requires, and it is not what the framework is built for. Start documents event handlers as a first-class call site, and the reference application's flows read as ordinary applications rather than as workarounds. If that constraint is ever wanted it is its own decision.
- **Adopt a query library now so mutations and their refresh state are uniform.** Rejected: it is a platform default adopted before a requirement exists, which `anti-patterns.md` names as `Premature Platform Defaults` and `AGENTS.md` forbids. A derived application that needs one records it in `docs/adr/`.
- **Leave call sites undocumented and rely on the reference application as the example.** Rejected: that is the confusion this collection exists to prevent. The example is meant to be deleted, and a contributor who copies `createOrder()` from `orders-page.tsx` copies a call that happens not to redirect, without learning why it is safe.
- **Add a source-boundary test that fails when a component calls a server function without `useServerFn`.** Rejected as unimplementable as stated. A static check cannot know which server functions redirect, so any version of the rule is either too strict or too weak. Revisit when a redirect-capable mutation exists in the reference application, at which point the check has a real case to encode.

## Consequences

Positive:

- A redirect-capable mutation cannot ship with a navigation that never happens and an error message that blames the wrong thing, which is the failure this record removes.
- Refresh is stated once, so a new page matches the existing two instead of being written from whichever file was open.
- Rule 5 keeps the template free of a query-cache dependency while naming the condition under which an application adds one.

Negative and neutral:

- The rule is a precaution in the uncertain case, so a page can be correct without it. That is accepted: the alternative is a rule whose failure mode only appears in front of a user.
- `useServerFn` has no documentation page, so the citation for item 2 is its shipped source rather than prose. If a future version changes its behavior, this record's evidence goes stale before its conclusion does, and a reviewer should check the installed package rather than trust the code block above.
- Item 4 rules out local cache patching, which is occasionally the right optimization. An application that needs it should record the exception rather than introduce a second convention.
- The reference application wraps only where the rule requires it, so `createOrder` may stay unwrapped until it can redirect. A reader looking for the wrapper in every event handler will not find one, and the record's own gotcha example is the reason to read further rather than an oversight.

Deferred and out of scope: what a server function *returns* when a caller needs something other than data, and whether the router's own opinions belong to a layer. This record is about the call site only. [`server-fn-boundary`](2026-09-29-server-fn-boundary.md) owns the choice of inbound handler, and the two overlap by design; a reader arriving from either should find the other.

Reversibility: the rule is advisory, so unapplying it costs nothing and breaks no gate. Adopting a query library supersedes items 4 and 5 as a whole rather than amending them in place.

## Testing

- The reference application demonstrates rule 1 in both shapes: `orders.$orderId.tsx` calls `getOrder` from a loader, and `orders-page.tsx` calls `createOrder` from an event handler. Neither call can redirect today, so neither is wrapped, which is what rules 2 and 3 permit.
- `tests/routes/server-boundaries.test.ts` checks client-safe route and feature modules, with exceptions for `*.server.ts`, `*.functions.ts`, `*.middleware.ts`, and test files. Syntax-aware dependency analysis restricts middleware private imports to recognized transformed server callbacks; components cannot import adapters to construct their own instances.
- Rules 2, 3, and 4 are review-enforced. Whether a server function can redirect is a product fact no gate in this repository can read, which is stated here rather than glossed; the same is true of the `getRouteApi()` rule in [`feature-slices`](2026-09-29-feature-slices.md).
- No test asserts the wrapper, because a test for it would have to assert the absence of a bug in code that does not yet have one.

## Related

- [architecture.md](../../../architecture.md)
- [anti-patterns.md](../../../anti-patterns.md)
- [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md)
- [`server-only-modules`](2026-09-29-server-only-modules.md)
- [`server-fn-boundary`](2026-09-29-server-fn-boundary.md)
- [`server-capability-boundaries`](2026-10-02-server-capability-boundaries.md) supplements the caller choice: browser and isomorphic loader callers use RPC; server-only integrations may use the published in-process application contract or retain RPC when they need its transport contract; external HTTP callers use server routes.
