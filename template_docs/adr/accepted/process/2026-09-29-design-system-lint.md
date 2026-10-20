# ADR: Enforce The Design System With @shadcn/lint

Type: template
Status: accepted
Classification: process

## Problem

`AGENTS.md` requires semantic tokens and shared primitives, but nothing enforced the rule: the ESLint gate only checked TypeScript, and no test asserted styling. Agents and humans could pass `bg-pink-500`, `p-[13px]`, or restyle a primitive with `className` without any gate failing.

`@shadcn/lint` is an agent-first ESLint plugin for Tailwind v4 design systems. It reads `components.json`, the theme in `src/styles.css`, and the primitives' variants, and its findings explain what to use instead. It supports per-component contracts, so the template can state what callers may override.

The design-system policy is part of the template's verification baseline, which makes it a template decision rather than a local preference: a derived application inherits the policy file, the plugin registration, and the gate that fails when the policy is broken.

## Decision

Enforce the template's design system with `@shadcn/lint` through the existing ESLint gate.

- Install the plugin and `@typescript-eslint/parser` as exact devDependencies.
- Keep the rule policy in `design-system.lint.json`: `no-restyle`, `no-raw-colors`, `no-arbitrary-values`, `no-inline-styles`, `require-static-classes`, and `no-unknown-classes` all at `error`.
- The global caller policy is `allow: ["layout"]`. A per-component contract widens it, and `CardHeader` and `CardContent` additionally allow `spacing`. `Card` itself is not widened, because the primitive already sets its own internal spacing and the global layout policy is the correct contract for its callers. A contract names only components the primitive set actually exports; the pattern and the component table below it are kept in step with `src/shared/components/ui/`.
- Turn off `no-restyle`, `no-arbitrary-values`, and `require-static-classes` inside `src/shared/components/ui/**` so primitives style themselves.
- Document tokens, primitives, contracts, and the fix order in [`design-system.md`](../../../design-system.md).
- A new rule starts at `warn` and is promoted to `error` in the same change that proves it clean. `no-unknown-classes` was added at `warn` and promoted once the template reported zero findings for it, which is why it is now an error with no staged `warn` rule left.

## Alternatives considered

- **Document the rules and rely on review.** Rejected: unverifiable prose is what allowed the drift this record exists to stop.
- **Limit class overrides in TypeScript prop types.** Rejected: it narrows component APIs, produces errors without fix guidance, and cannot express token rules.
- **Write a custom lint rule set.** Rejected: it duplicates a maintained plugin and diverges from the org's other Tailwind projects.
- **Snapshot-test rendered class names.** Rejected: it detects a change after it is written and does not tell an author what to use instead.

## Consequences

Positive: token and primitive policy is executable; findings tell agents what to use instead; caller allowances are reviewable in one file.

Negative and neutral: `@shadcn/lint` is early at 0.1.x, so the dependency is pinned exactly and upgraded deliberately; a component change that introduces a reusable appearance now requires a variant, which is the intended cost; the plugin's built-in class grammar is used because the template's `cn` is not the npm `cn` package; and promoting a staged rule to `error` is a one-line change that must be earned by evidence rather than assumed.

Reversibility: remove the plugin, the policy file, and the ESLint registration. The documented policy remains as guidance.

## Testing

- `bun run lint` reports zero findings — no errors and no warnings — on the reference application. A warning count above zero means a rule is staged for promotion and has not earned it yet.
- `bun run verify` passes with the plugin registered in `eslint.config.js`, so the gate and `design-system.lint.json` are read together rather than maintained apart.
- Adding `bg-pink-500` or `p-[13px]` to feature UI, or passing a `className` that restyles a primitive, fails the gate.
- `template_docs/design-system.md` states the tokens, the primitive set, the caller contract, and the fix order this record enforces. Its component table does two jobs, so it is a superset of the policy file: every component named in a `contracts` pattern appears in the table, and a row may also name a component whose rule is "use its variants" without a contract, because `Button`, `Badge`, and `Card` are constrained by the variant surface rather than by a widened allowance. Adding a component to the table therefore does not require a contract, but adding a `contracts` pattern does require a table row.

## Related

- [design-system.md](../../../design-system.md)
- [development-workflow.md](../../../development-workflow.md)
- [`server-only-modules`](../architecture/2026-09-29-server-only-modules.md)
