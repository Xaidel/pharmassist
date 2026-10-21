# ADR: Cross-Feature Access Through Published Server Functions Only

Type: template
Status: accepted
Classification: architecture

## Problem

Features must be able to use each other without becoming one module. The reference application states the case exactly: an order line needs a menu item's name and price, and the menu feature owns both the catalog and the rules for what a valid item is.

There are four ways to wire that, and three of them are tempting. A direct import of `menu.domain.ts` shares types and couples two contexts that have no other relationship. A direct import of `menu.server.ts` reaches past a published boundary into another feature's storage. And a shared `src/shared/domain` model for catalog items invites a second feature to depend on a type it does not own, and grows a shared kernel whose only purpose is to avoid a small amount of mapping.

The correct cost is a deliberate one: a published contract, and a translation at the consumer's edge. That translation is what stops a catalog rename from becoming an order migration, and it is exactly what an anti-corruption layer is for.

The reference application also demonstrates the case for a genuine shared value object. Both features hold monetary amounts, both need to sum and multiply them, and the currency rule belongs to neither feature alone. That is the difference between a shared kernel assembled to avoid work and a shared value object promoted because reuse is real.

## Decision

A feature consumes another feature only through its published server functions, and promotes shared values only on demonstrated reuse.

1. A feature's public API is its `*.functions.ts` module. A consuming feature imports those server functions and nothing else from the owning feature.
2. A feature never imports another feature's `*.domain.ts` or `*.server.ts`. Language types stay with the context that owns the language.
3. The consumer maps the returned data into its own types at its edge. The port that carries a foreign capability holds published data, not the owner's domain types, so the consumer's model is insulated from the owner's changes.
4. A port named for a foreign feature is implemented in the consumer's composition root, where the call to the owner's published function happens. The use case receives the port and never learns where the data came from.
5. `src/shared/domain` receives a value object only when at least two features genuinely use it, and it carries no feature rules. `Money` is the first promotion, with `sumMoney` and `multiplyMoney` as the shared arithmetic.
6. A derived application may reverse the published-functions-only rule — consume another feature's domain types directly, import its server module, or promote its types to `src/shared` — with an accepted template record stating what it needs and what it takes on, when it needs a shared transaction, a shared read model, or a monorepo boundary it is prepared to maintain.
7. No module under `src/shared/` imports a feature, route, or `*.server.ts` module.

## Alternatives considered

- **Import another feature's domain types directly.** Rejected: it shares language across contexts that do not share a model, and a change in one becomes a change in the other.
- **Import another feature's server module directly.** Rejected: it reaches past the published boundary into another feature's storage, so the consumer's test needs the provider's infrastructure and the provider's internal refactor is a breaking change for an unrelated feature.
- **Promote catalog types to `src/shared/domain` to avoid the mapping.** Rejected: the shared kernel is assembled before a second feature needs it, and the mapping it avoids is the mechanism that keeps the two contexts independent. Mapping foreign data at the consumer's edge is the design, not a tax.
- **A shared in-process read model or a shared database transaction instead of server functions.** Not adopted: it is the right answer for some applications, and it couples the contexts at the data layer. It requires an accepted record.
- **Published server functions with a consumer-owned port (chosen).** Keeps contexts independent, keeps the consumer testable with a test double, and makes a future implementation of the foreign capability, local or remote, a wiring change.

## Consequences

Positive:

- A feature can be replaced, extracted, or moved to a service without touching its consumers, as long as it keeps its published functions.
- The consumer's domain model is insulated from the provider's, so provider renames do not migrate consumer data.
- The source-boundary test can enforce the rule mechanically, because a legal import between features has exactly one shape.
- `src/shared/domain` stays small, and each entry has a demonstrated consumer.

Negative and neutral:

- Mapping at every consuming edge is real, repeated code. It is the intended cost of independence and it is not free to maintain.
- Cross-feature features need an integration test, because a unit test on each side does not prove the pair works. The reference application covers this with browser acceptance.
- An application with genuine cross-feature transactions will find this rule inconvenient, and should record the change rather than work around it quietly.

Reversibility: reversing this is a real refactor, because every consuming edge must change at once. It is recorded here so the cost is chosen rather than discovered.

## Testing

- `tests/routes/server-boundaries.test.ts` permits cross-feature imports through published `*.functions.ts` or designated `*.surface.server.ts` integrations; syntax-aware analysis restricts runtime surface imports to bindings and provider contract type imports to injectable adapters.
- The same file asserts that no module under `src/shared/` imports a feature, route, or `*.server.ts` module.
- The reference application demonstrates the rule end to end: the orders composition root implements `MenuItemCatalog` by calling `getMenuItem`, and no orders module imports a menu domain, schema, port, or server module.
- `src/shared/domain/money.test.ts` covers the shared value object both features depend on: the `CurrencyCodeSchema` set, the `MoneySchema` constraints, the `sumMoney` and `multiplyMoney` arithmetic and the `zeroMoney` no-amount case orders derives totals with, the refusals for an empty and a mixed-currency list, and `formatMoney` for display.
- `bun run test:e2e` exercises the menu-to-cancel journey, which is the cross-feature path a unit test on each side cannot reach.

## Related

- [architecture.md](../../../architecture.md)
- [dependency-rules.md](../../../dependency-rules.md)
- [anti-patterns.md](../../../anti-patterns.md)
- [money.ts](../../../../src/shared/domain/money.ts)
- [`feature-slices`](2026-09-29-feature-slices.md)
- [`branded-domain-values`](2026-09-29-branded-domain-values.md)
- [`ports-and-use-cases`](2026-09-29-ports-and-use-cases.md)
- [`server-capability-boundaries`](2026-10-02-server-capability-boundaries.md) — partially supersedes clauses 1, 2 and 4, and corrects clause 6; consumer mapping, private domain ownership, and demonstrated shared-value promotion are retained unchanged
