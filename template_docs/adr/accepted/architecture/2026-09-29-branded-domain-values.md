# ADR: Domain Values As Branded Serializable Types With One Validation Authority

Type: template
Status: accepted
Classification: architecture

## Problem

A feature with real rules needs somewhere to put them that is neither the transport layer nor the UI. The failure modes are well known and each has a plausible cause.

Primitives with per-site validation duplicates one rule across a form, a server function, and a storage adapter, and permits confusion between quantities that are all numbers or identities that are all strings: an `OrderId` and a `MenuItemRef` are both digit strings, so a swapped argument type-checks and ships a wrong order.

Rich class entities solve the first problem and break the second in this framework. A server function returns a serialized value and SSR renders in a separate runtime, so an entity with private fields, methods, and `Date` members does not survive the boundary; it forces a parallel DTO type and a mapper at every edge, and a second model for the browser that drifts from the first.

A shared Zod schema per rule solves duplication but not the parse-everywhere cost: if every interior function re-validates, the type system stops carrying information and the parse call becomes decoration.

The reference ordering feature has exactly the rules that make this matter. An order carries a lifecycle of `draft`, `placed`, and `cancelled`; lines may change only while it is a draft; a merged quantity may not exceed twenty; a total is derived from line snapshots and must never be accepted as input.

## Decision

Author each invariant once in the owning `*.domain.ts`, and keep domain values plain.

1. Each feature's domain model lives in one **domain module**, `<feature>.domain.ts`. It is client-safe and pure: it imports Zod and `src/shared/domain` only, and performs no I/O, environment access, clock read, random read, or authorization.
2. Value objects are branded transparent primitives or plain objects inferred from Zod schemas. `OrderIdSchema`, `MenuItemRefSchema`, and `QuantitySchema` produce non-interchangeable types. A class instance, `Date`, `Map`, or `Set` never crosses a server-function or SSR boundary.
3. Domain behavior is pure functions that receive time, identity, and generated values as arguments. The domain never reads the clock, a random source, or the environment.
4. One validation authority per rule. `*.schema.ts` composes wire contracts from domain schemas, and from the `src/shared/domain` schema of a promoted value object when the contract contains one; it adds no constraint of its own. A feature with no domain behavior may keep its rules in `*.schema.ts`.
5. Parse at edges; trust the interior. Server-function validators, persisted rows, external payloads, and route parameters are the only parse points. Interior code consumes the parsed types and does not re-validate.
6. Domain errors are stable codes carried by one error type, such as `OrderError` with `ORDER_NOT_FOUND` and `QUANTITY_LIMIT`. Messages are presentation, codes are contract.
7. An entity is a plain type with identity and lifecycle; pure functions own transitions and each returns a new value. An aggregate is the consistency and transaction unit: it loads and saves whole, and its invariants hold after every operation.
8. Derived values are never stored as authority and never accepted as input. Totals come from line snapshots through the shared `Money` value object.
9. A value object proven to serve two or more features promotes to `src/shared/domain/` with no feature rules attached. `Money` is the first promotion.

## Alternatives considered

- **Primitives validated at each use site.** Rejected: duplicates every rule and permits identity and quantity confusion.
- **Class entities with private fields, kept server-side, plus DTO mappers.** Rejected: the domain model cannot be shared with the browser, every RPC edge needs a mapper, and the two models drift. This is the cost the serialization constraint of TanStack Start imposes.
- **Aggregate methods that persist themselves through a repository injected into the entity.** Rejected: persistence is an outbound capability, and an entity that can write cannot be constructed in a test without infrastructure, or reused by a second adapter. Repositories are declared in the application layer; see [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md).
- **A single global domain model imported by every feature.** Rejected: a shared kernel assembled before the reuse exists.
- **Generated models and clients from an external schema service.** Rejected: the wire source of truth would stop being the Zod schema the application already validates with, introducing a second definition of every rule and a generator that can go stale silently.

## Consequences

Positive:

- One rule, one home, one validation authority; a form and a server function share a schema.
- Identities and quantities are non-interchangeable at compile time.
- Domain values cross server-function and SSR boundaries with no mapper.
- Domain unit tests exercise rules with no server, no adapter, and no framework.

Negative and neutral:

- Branded types require a parse to create, so constructors are noisier than a type annotation; that is the price of the guarantee.
- `parse` on an already-valid value is cheap but not free, and it is spent at edges only by this decision.
- The aggregate is plain and mutable in principle, so nothing in the type system prevents `order.status = 'cancelled'` outside a transition. Adapters copy on read and write, and review plus tests carry the remainder. This is weaker than private fields in a language that has them.

Reversibility: branded types and pure transitions survive most refactors, but once branded identities are stored or cross a boundary, removing the brand is a wide change. The brand is cheap to keep and expensive to drop.

## Testing

- A domain module's test file covers the rules that module actually declares. `orders.domain.test.ts` covers value-object construction, the merged-quantity limit, every transition guard including the line-currency guard, terminal cancellation, and the six error codes the domain module raises; the two it does not raise, `ORDER_NOT_FOUND` and `MENU_ITEM_NOT_FOUND`, belong to the application layer and are covered in `orders.use-cases.test.ts`. `menu.domain.test.ts` covers its value objects and the requirement that a catalog entry carry a price, because a read-only catalog declares no transitions; the price rules themselves belong to `MoneySchema` and are covered in `money.test.ts`.
- `tests/routes/server-boundaries.test.ts` asserts that every `*.domain.ts` imports no server, schema, functions, or React module, and reads no clock, random source, or environment value.
- The same file asserts that no module under `src/shared/` imports a feature, route, or `*.server.ts` module.
- `template_docs/anti-patterns.md` records the anemic domain, class objects across runtime boundaries, interior re-validation, and impure domain as named anti-patterns.

## Related

- [`server-capability-authorization`](../security/2026-10-02-server-capability-authorization.md) supplements clause 5 with server-only application ingress and clarifies parsing once per distinct feature-context boundary.

- [architecture.md](../../../architecture.md)
- [anti-patterns.md](../../../anti-patterns.md)
- [testing.md](../../../testing.md)
- [`feature-slices`](2026-09-29-feature-slices.md)
- [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md)
