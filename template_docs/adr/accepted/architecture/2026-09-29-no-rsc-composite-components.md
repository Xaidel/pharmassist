# ADR: Do Not Adopt Server Components Or Composite Components Yet

Type: template
Status: accepted
Classification: architecture

## Problem

TanStack Start exports a server-rendering API this template says nothing about. `@tanstack/react-start/rsc` re-exports `renderServerComponent` and `createCompositeComponent`, the latter described in the framework documentation as returning "a composite source rendered via `<CompositeComponent src={...} />` (supports slots)". A contributor who knows React Server Components will look for it, find it, and find no instruction about whether to use it.

The answer that matters is that it is not usable as shipped, and the evidence is in the installed dependency tree rather than only in prose.

- The implementation lives in `@tanstack/react-start-rsc`, which is at version **0.1.31**, while `@tanstack/react-start` is at **1.168.32**. The framework documentation marks the feature "⚠️ Server Components are experimental! The API may see refinements" and says it "will remain so into early v1".
- The documentation states it "is not enabled by default" and requires `tanstackStart({ rsc: { enabled: true } })`, React 19, Vite 7 or later, and `@vitejs/plugin-rsc`. **`@vitejs/plugin-rsc` is not present in this template's dependency tree at all**, so the feature is not merely disabled — it is absent.
- The client-side entries for both helpers are stubs, and their shipped type declarations say so: "This function should never be called at runtime on the client. It exists only to satisfy bundler imports in client bundles. The real implementation only runs inside server functions."
- The framework documents a semantic limit on the feature's main selling point: "Slots are opaque on the server. The server cannot inspect slot content. `React.Children.map()` and `cloneElement()` won't work on `props.children`." The documented workaround is render props instead of children.
- Serialization differs from the rest of the framework. The documentation notes that server components use React's native Flight protocol, that "TanStack Start's custom serialization isn't available in server components yet", and that "Primitives, Dates, and React elements work."

That last point collides with an accepted record. [`branded-domain-values`](2026-09-29-branded-domain-values.md) decides that a "`Date`, `Map`, or `Set` never crosses a server-function or SSR boundary" and that domain values "cross server-function and SSR boundaries with no mapper". The record scopes that to two boundaries correctly, but an application that adopted server components would have a third boundary where `Date` works and where the domain model says it does not. That is two vocabularies for one concept, which the collection's own README names as the failure its vocabulary table exists to prevent.

## Decision

We do not adopt server components or composite components, and this record says so with the reason and the trigger.

1. The template does not enable `rsc`, does not depend on `@vitejs/plugin-rsc`, and imports nothing from `@tanstack/react-start/rsc`. A feature composes its UI from React components in the ordinary way, which is what the reference application does and what every accepted record in this collection describes.
2. The serialization rules stay as [`branded-domain-values`](2026-09-29-branded-domain-values.md) states them: plain, serializable values across every boundary the template uses. `Date`, `Map`, and `Set` do not cross one.
3. A feature that genuinely needs to hand a server-rendered subtree to the client composes it as a normal component, passing the data it needs as a serializable value. That is the mechanism the reference application uses, and it is sufficient for the composition cases the template demonstrates.
4. The conditions for revisiting are the four below, each with the evidence that would settle it, so a contributor can tell whether the feature is adoptable rather than guessing at whether it is mature enough.

## Adoption Conditions

The feature is reconsidered when **all four** conditions hold. Each is written as an observable fact with the evidence that settles it, so the question is answerable rather than a judgement about whether the feature feels ready. A condition that is close is not met.

**1. The feature is a released API, not an experimental one.** Today the guide marks it "⚠️ Server Components are experimental! The API may see refinements" and says it "will remain so into early v1". Settled by: the guide carrying a stable-version statement, and `@tanstack/react-start-rsc` reaching `1.x`. It is currently `0.1.31`, behind `@tanstack/react-start` at `1.168.32`.

**2. `@vitejs/plugin-rsc` is a supported dependency, not an opt-in one.** The feature requires it, and it is **not present in this template's dependency tree at all**, so the feature is absent rather than merely disabled. Settled by: the plugin being a declared dependency of a template that enables the feature, rather than something an adopting developer has to add alongside a config flag.

**3. The opaque-slots limitation is lifted, or a render-prop-only shape is documented as supported.** The guide states that "Slots are opaque on the server. The server cannot inspect slot content. `React.Children.map()` and `cloneElement()` won't work on `props.children`", and names render props as the workaround. The gotcha is invisible in types:

```tsx
// What adoption would look like. The client entry is a stub whose shipped
// declaration says it "should never be called at runtime on the client".
const getCard = createServerFn().handler(async () => {
  const src = await createCompositeComponent((props: { children?: React.ReactNode }) => (
    <div className="card">
      <h2>Server-rendered header</h2>
      <div>{props.children}</div>
    </div>
  ))

  return { src }
})

// The gotcha, which TypeScript accepts and the runtime cannot honour: the server
// never sees what is inside `children`. The framework documentation states that
// `React.Children.map()` and `cloneElement()` won't work on `props.children`;
// the feature is not enabled in this template, so the docs' claim is recorded
// rather than an observed failure mode.
const card = useMemo(() => React.Children.map(children, (child) => cloneElement(child)), [children])
```

Settled by: either the limitation removed, or the documentation naming a shape that composes correctly, with the stub behaviour replaced by a runtime error.

**4. Flight serialization is reconciled with [`branded-domain-values`](2026-09-29-branded-domain-values.md).** That record decides that a `Date`, `Map`, or `Set` never crosses a server-function or SSR boundary, and it scopes that to two boundaries correctly. The guide says of server components that "TanStack Start's custom serialization isn't available in server components yet" and that "Primitives, Dates, and React elements work". Adopting the feature would give a third boundary with different rules, which is two vocabularies for one concept. Settled by: a linked amendment to `branded-domain-values` that states the third boundary's rules, or a confirmation that the boundaries are genuinely separate with deliberately different rules, recorded in the same change.

Until all four hold, a feature that needs this records the need in `docs/adr/`, names the condition it is waiting on, and implements the nearest supported alternative — which is a normal component, per item 3.

## Alternatives considered

- **Adopt composite components now, behind the flag, as a demonstration.** Rejected: the feature's own type declarations describe the client path as a stub that must not run, the required Vite plugin is not installed, and a demonstration is the wrong way to carry an API the documentation says may see refinements before v1. A template that ships it would be teaching an API its own upstream calls experimental.
- **Stay silent and let the absence of documentation be the answer.** Rejected: this is the confusion the collection exists to prevent, and it is the same failure the reference-example boundary had to be fixed for. A contributor who knows RSC concludes the template simply has not considered it, and invents a local convention. Silence produces a second vocabulary; a record prevents one.
- **Adopt only `renderServerComponent`, which has no slots and therefore no opaque-slot limitation.** Rejected on the same grounds as the composite API — the dependency is absent, the client entry is a stub, and it shares the experimental Flight serialization. Choosing the less awkward half of an unstable feature does not make the feature stable.
- **Ban the import outright with a lint rule or a boundary test.** Rejected as premature and slightly wrong: the rule would forbid a legitimate future capability, and a lint failure for an import from a documented framework export is a confusing signal when the real reason is maturity rather than policy. A prohibition that is really a deferral should read as a deferral.
- **Amend `branded-domain-values` now to carve out a third boundary.** Rejected: the accepted record is correct about the boundaries the template uses, and amending an accepted record's rationale in anticipation of an unbuilt feature is exactly what the collection forbids. Amendment belongs to item 4, at the point the feature is adopted.

## Consequences

The deferral holds until all four adoption conditions are met, and each is a fact that can be checked today rather than a judgement about maturity.

- The template does not enable `rsc` and does not depend on `@vitejs/plugin-rsc`, so no source file imports `@tanstack/react-start/rsc` and `vite.config.ts` carries no `rsc` flag.
- [`branded-domain-values`](2026-09-29-branded-domain-values.md) continues to state one serialization rule, with no carve-out for a boundary the template does not use.
- A contributor asking "should this be a composite component?" finds four numbered adoption conditions with the evidence that settles each, not an absence or a single run-on sentence.
- Nothing in the source-boundary tests asserts this. A determined contributor can add the import; the tests assert what this collection declares, and adding an assertion for a feature that should not exist would make the suite a statement of policy about upstream maturity, which is the wrong place for it.
- The feature may stabilize sooner than expected, and this record will have kept the template behind. That is the accepted cost: being early costs a rewrite in a direction the framework chose, while being late costs a rewrite plus a migration off an API that changed.
- Maturity is not measurable. The four conditions are a judgement about it, written as observable facts — a released API, a supported dependency, a lifted limitation, reconciled serialization — so a reviewer can argue about them rather than about whether the feature feels ready.
- An application that adopts server components anyway, with Flight serialization genuinely separate, will find the branded-values rule reads as too broad. That is condition 4's work, and arriving late costs one amendment to one record.
- Adoption supersedes this record rather than editing it: the replacement names which of the four conditions were met, and `branded-domain-values` gains a linked amendment in the same change.

## Testing

Review confirms that the template does not enable RSC, does not declare `@vitejs/plugin-rsc`, and has no maintained source imports from `@tanstack/react-start/rsc`. No automated import prohibition is added. Reconsideration requires evidence for all four adoption conditions and an accepted replacement decision.

## Related

- [`branded-domain-values`](2026-09-29-branded-domain-values.md)
