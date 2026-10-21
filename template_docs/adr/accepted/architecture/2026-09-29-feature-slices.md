# ADR: Feature Slices As Vertical Bounded Contexts

Type: template
Status: accepted
Classification: architecture

## Problem

A template must choose one organizing principle, because the choice is what a derived application inherits. The framework already imposes a partial one: TanStack Start owns file routes, server functions, and an import-protection boundary, so any layering scheme that contradicts those concepts fights the framework it ships with.

The alternative in wide use is horizontal layering by technical type: `components/`, `services/`, `hooks/`, `utils/`, `types/`. It fails a specific test. One product change, such as adding a quantity rule to an order line, scatters across `types/order.ts`, `services/orderService.ts`, `components/OrderForm.tsx`, and a validator, so no single place can be read to learn what the system believes. It also has no answer for where business rules belong, which is the question that produces the most architecture argument in a codebase of any size.

Domain-driven design supplies the alternative vocabulary: bounded context, ubiquitous language, and an aggregate root as the consistency unit. Adopting the full tactical form per feature, however, duplicates containment the framework and the feature contract already provide, and a domain model earns its cost only when the feature has real rules. The reference ordering application supplies both a case with rules (an order aggregate with a lifecycle and a quantity ceiling) and a case without them (a read-only menu catalog), so the organizing principle has to work for both.

## Decision

A feature slice is the unit of organization, and a feature is a bounded context.

1. A feature owns one business capability: its language, its rules, its data, its server boundary, and its UI. It is named for the capability, not for a route or a screen.
2. One change touches one feature directory. Everything needed to change a rule is in that slice, and a reader learns the system by reading slices.
3. Inside a feature, modules are arranged vertically, never by technical role across the application. A feature's optional subfolders (`pages/`, `components/`) are local organization, not application-wide horizontal layers.
4. `src/routes` is a routing adapter. It owns `createFileRoute`, paths, loaders, guards, search and parameter validation, metadata, SSR options, route fallbacks, routing layouts, and raw `server.handlers`. It contains no feature UI, no business rule, no schema, and no infrastructure import, and an extracted feature page reaches loader data through `getRouteApi()` rather than importing the route's `Route` object.
5. `src/shared` holds only code with demonstrated cross-feature use and no feature knowledge. Promotion requires at least two real consumers. `src/shared/domain` is the promotion path for value objects; `src/shared/components` for rendered UI; `src/shared/hooks` for proven cross-feature React behavior; `src/shared/types` for client-safe contracts with no feature owner.
6. `src/lib` holds focused cross-cutting glue. The reference application needs only `cn.ts`; environment parsing and logging are added when a concrete need appears. It is not a `utils.ts` collection and contains no feature components or rules.
7. Do not pre-create empty folders or placeholder layers. Structure follows real code.

## Alternatives considered

- **Horizontal layers by technical type.** Rejected: a single rule change scatters across directories, no directory can answer "what does this system consider valid", and the scheme collides with Start's file-route and server-function concepts.
- **One package per bounded context in a workspace monorepo.** Not adopted, and compatible with this decision. It buys compiler-enforced slice boundaries and independent release cadence at the cost of a build graph, and this template ships one deployable. Revisit when a derived application needs multiple deployables or separate release trains; the composition root in [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md) is already the seam that such a split would cut along.
- **A single global domain model shared by all features.** Rejected: it is a fake shared kernel, it couples features that have no real dependency, and it forces unrelated language into one place. See [`cross-feature-access`](2026-09-29-cross-feature-access.md).
- **One feature per route or per page.** Rejected: features are capabilities, so one feature may back several routes and one route may compose several features.

## Consequences

Positive:

- A change is local, and the set of files that encode a rule is discoverable by listing one directory.
- Routes stay thin, so framework concerns and business concerns are separable in review.
- Shared code appears only when reuse is real, so `shared` stays small enough to trust.
- The feature contract composes with Start's own boundaries instead of competing with them.

Negative and neutral:

- Vertical slices duplicate small amounts of structure across features that horizontal layers would have shared, and the duplication is the intended cost of locality.
- `shared` is the only ambiguous location, and the two-consumer rule must be enforced by review because it is a judgment, not a syntax error.
- The reference application has exactly two features, which demonstrates the principle but does not prove it at scale; a derived application supplies that evidence.

Reversibility: the organizing principle is expensive to reverse once an application has many features. It is a template-level decision precisely because it should be chosen once and inherited rather than re-litigated per slice.

## Testing

- `tests/routes/server-boundaries.test.ts` checks client-safe route and feature modules, with exceptions for `*.server.ts`, `*.functions.ts`, `*.middleware.ts`, and test files. Syntax-aware dependency analysis restricts middleware private imports to recognized transformed server callbacks.
- The same file permits cross-feature imports through published `*.functions.ts` or designated `*.surface.server.ts` integrations; syntax-aware analysis restricts runtime surface imports to bindings and provider contract type imports to injectable adapters.
- The same file asserts that every route module other than `src/routes/__root.tsx` contains no intrinsic HTML element, which is how "routes render a feature page, not markup" is enforced. `__root.tsx` is the one deliberate exception: it is the document shell that renders `html`, `head`, and `body`.
- `getRouteApi()` usage in extracted feature pages, and the rule that a page never imports its own route's `Route` object, are review-enforced rather than test-enforced: today no page violates either.
- `template_docs/architecture.md` and `template_docs/dependency-rules.md` document the ownership table and the directed import graph that follow from this record.

## Related

- [architecture.md](../../../architecture.md)
- [dependency-rules.md](../../../dependency-rules.md)
- [`branded-domain-values`](2026-09-29-branded-domain-values.md)
- [`cross-feature-access`](2026-09-29-cross-feature-access.md)
