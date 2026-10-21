# ADR: Reuse Components Instead of Rebuilding Them

Type: template
Status: accepted
Classification: process

## Problem

The source-ownership contract says `src/shared/components` holds proven cross-feature rendered UI, and [Speculative Shared Code](../../../anti-patterns.md) says not to move a component there on a hunch. Neither states the other half of the question: what to do when a component already exists and a second one is about to be written anyway.

The enforcement that exists cannot see that failure. `shadcn/no-restyle` is the rule that makes a caller use a variant instead of restyling a primitive, and a component that re-marks up a primitive's structure and styling is not a design-system component, so the rule has nothing to attach a finding to. Token rules still apply to it, so a rebuilt primitive passes `bun run lint` clean while carrying a private copy of the spacing, focus ring, and color bindings the primitive already owns. The rule that forbids forking is structurally blind to the fork.

Three shapes have no rule at all: rebuilding a primitive that already exists; a wrapper that only forwards classes through; and a second feature that re-implements a piece another feature already renders instead of promoting it.

The reference application ships clean by luck. The ordering example happens not to duplicate anything, and no gate would fail if it did, so the gap survives a template that otherwise proves its own policies at zero findings.

## Decision

Components are reused rather than rebuilt, and a template gate holds the two shapes that can be decided mechanically.

The order to walk before writing a component:

1. **A primitive exists, so import it.** `src/shared/components/ui/` is the definition of each primitive's structure and appearance, and a `data-slot` value is the primitive's own: nothing outside the primitive set declares the same value again. A component that re-marks up a primitive is a fork.
2. **A wrapper earns its place when it binds a named concept.** A wrapper that forwards `className` to the primitive inherits that primitive's contract, so [`design-system-lint`](2026-09-29-design-system-lint.md) keeps checking what callers pass to it — `SaveButton` is legitimate, because the name is a concept the domain has. A wrapper that only passes classes through is itself a one-off: inline it at the call site.
3. **The second feature promotes; it does not re-import.** Promotion happens the day the second feature needs the piece, as a move of the existing file rather than a second copy of it. Two files importing one shared component is not promotion, and neither is a hunch that something will be reused later.

What the linter still decides is unchanged: token, arbitrary-value, inline-style, class-existence, and caller-contract policy stay with [`design-system-lint`](2026-09-29-design-system-lint.md). This record adds the placement decision that policy cannot reach, and the two gates that make it hold.

The two mechanical gates are:

- `tests/routes/root-contract.test.ts` asserts that each primitive's `data-slot` values are declared only inside `src/shared/components/ui/`, which fails a fork that keeps the primitive's slot name.
- `tests/routes/server-boundaries.test.ts` asserts that every component under `src/shared/components/` outside the primitive set is imported by two or more features, which fails a component promoted on a hunch.

## Alternatives considered

- **Write an ESLint rule that detects rebuilt primitives.** Rejected: deciding that two components are the same means comparing rendered structure and class sets, which is a false-positive machine that would fire on legitimate variation and be suppressed within a week. The slot declaration is the part of a fork that is decidable, so the rule covers that and leaves the rest to review.
- **Detect near-duplicate components by comparing their markup.** Rejected for the same reason, and worse: it punishes the variation that makes a component a component.
- **Rely on a code-review checklist item.** Rejected: [`design-system-lint`](2026-09-29-design-system-lint.md) already rejected documenting-and-reviewing for the class rules, and the same reasoning applies one level up. A rebuilt primitive is also unusually hard to catch in review, because the diff reads as ordinary feature code rather than as a design-system change.
- **Extend the existing linter to cover it.** Rejected: upstream documents that a locally rebuilt component is outside what these rules see, so the fix belongs in the template's own gate rather than in the plugin's scope.
- **Ban `data-slot` outside the primitive set.** Rejected: the hook is required on component roots for styling and targeting, and removing it would trade a real convention for a checkable one.
- **Gate on a feature component having exactly one importer.** Rejected: a feature's private sub-component legitimately has one, so the signal is too noisy to fail a build. It stays a review question.

## Consequences

The rule that forbids forking a primitive gains a gate, and the inverse drift — a component promoted to `shared` on a hunch — gains one too, so the two errors are decided in the same place instead of reviewed in opposite directions.

The cost is two more source-reading assertions in the route suites, and a convention becoming load-bearing: `data-slot` now decides a gate as well as styling and targeting, so renaming a primitive's slot is a breaking change for its consumers. Promotion is also no longer purely retrospective, so the second feature's diff includes moving a file, which is more work in that change than writing a second copy of it would have been.

Two shapes stay review-enforced, and the gates do not pretend otherwise: a fork under a fresh slot name (`data-slot="order-card"` copying a primitive's markup), and whether a wrapper binds a named concept rather than forwarding classes. `data-slot` covers structure, so it cannot see a fork that renamed itself.

Reversibility: delete the two assertions and the ladder remains as guidance. Nothing else in the contract depends on them.

## Testing

`bun run test:routes` runs both gates alongside the existing boundary checks:

- `root-contract.test.ts` → `declares each primitive slot only inside the primitive set` reads every `data-slot` value out of the primitive set and fails any `.tsx` outside it that declares the same value, naming the primitive that already owns it.
- `server-boundaries.test.ts` → `promotes a shared component only once two features use it` counts the distinct features importing each promoted component and fails one with fewer than two, naming the count and the directory it belongs in until a second feature needs it.

`bun run test:routes` reports zero findings on the reference application: the primitive set owns eleven distinct slot values and no component outside it declares any of them, and no component is promoted, which is the correct state for an application this size. `bun run verify` passes with the assertions in place, so the gates and the policy file are read together rather than maintained apart.

Known limits, stated so a clean run is not over-read. The slot gate reads one convention, so it fails the fork that reuses the primitive's slot name and not the one that renames itself. The promotion gate resolves direct import paths, as the cross-feature deep-import check beside it also does, so a component re-exported through a barrel is review's job; it is also vacuous when nothing is promoted, which is correct rather than untested.

Review-enforced, by the nature of the question: whether a wrapper binds a named concept, and any fork under a fresh slot name.

## Related

- [design-system.md](../../../design-system.md)
- [development-workflow.md](../../../development-workflow.md)
- [`design-system-lint`](2026-09-29-design-system-lint.md)
- [`feature-slices`](../architecture/2026-09-29-feature-slices.md)
- [`server-only-modules`](../architecture/2026-09-29-server-only-modules.md)
