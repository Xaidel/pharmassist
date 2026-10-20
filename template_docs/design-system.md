# Design System

The template's UI is a small Tailwind v4 design system: semantic tokens in `src/styles.css`, shared primitives in `src/shared/components/ui/`, and an agent-first linter that enforces how applications use them. The enforcement decision is [`design-system-lint`](adr/accepted/process/2026-09-29-design-system-lint.md).

## Sources Of Truth

| Concern | Location |
| --- | --- |
| Theme tokens and dark values | `src/styles.css` (`@theme inline`, `:root`, `prefers-color-scheme`) |
| Shared primitives | `src/shared/components/ui/*` |
| Caller policy and exceptions | `design-system.lint.json` |
| Enforcement | `@shadcn/lint` rules through `bun run lint` |
| This document | `template_docs/design-system.md` |

## Tokens

Semantic color pairs, defined for light and dark in `src/styles.css`:

| Token                                            | Use for               |
| ------------------------------------------------ | --------------------- |
| `bg-background` / `text-foreground`              | Page base             |
| `bg-primary` / `text-primary-foreground`         | Primary actions       |
| `bg-muted` / `text-muted-foreground`             | De-emphasized content |
| `bg-card` / `text-card-foreground`               | Card surfaces         |
| `bg-destructive` / `text-destructive-foreground` | Danger actions        |
| `border-border` / `border-input`                 | Borders               |
| `ring-ring`                                      | Focus rings           |

Typography and scales:

| Token                   | Value                 | Use for                 |
| ----------------------- | --------------------- | ----------------------- |
| `font-sans`             | Avenir Next stack     | Body text               |
| `font-display`          | Iowan Old Style stack | Display headings        |
| `tracking-eyebrow`      | `0.2em`               | Small uppercase labels  |
| `tracking-eyebrow-wide` | `0.24em`              | Page-level slice labels |
| `leading-display`       | `0.95`                | Display headings        |

Rules:

- Semantic tokens only. Raw palette colors and undeclared tokens are lint errors.
- Use the Tailwind scale. Off-scale arbitrary values are lint errors, except structural layout values (`allow: ["layout"]`).
- Add a new visual value to `src/styles.css` first, then use it.

## Primitives And Caller Contract

A caller may change layout only; appearance belongs to the primitive. Contracts in `design-system.lint.json` widen or narrow that policy per component:

| Component | Callers may change |
| --- | --- |
| Everything | Layout: placement, width, margin, flex, position |
| `CardHeader`, `CardContent` | Layout and spacing |
| `Button` | Use `variant` and `size`; no styling overrides |
| `Badge` | Use `variant`: `default`, `primary`, `primary-strong`, `inactive` |
| `Card` | `interactive` for the hover-lift treatment |

`Card` itself keeps the global layout-only contract, because the primitive owns its internal spacing; the widened contract applies to the parts a caller composes inside it.

Use an existing variant when it fits. When the design needs a named appearance, add a CVA variant in the primitive (`src/shared/components/ui/`) instead of styling it with `className`.

## Before Writing A Component

Reach for an existing component before writing one, in this order. The decision is [`component-reuse`](adr/accepted/process/2026-10-01-component-reuse.md).

1. **A primitive exists, so import it.** `src/shared/components/ui/` is the definition of each primitive's structure and appearance. A `data-slot` value belongs to the primitive that owns it, and nothing outside the primitive set declares the same value again.
2. **A wrapper earns its place when it names a concept.** A wrapper that forwards `className` inherits the primitive's contract, so callers of the wrapper are still checked. A wrapper that only passes classes through is a one-off: inline it at the call site.
3. **The second feature promotes; it does not re-import.** Move the existing file the day a second feature needs it. Two files importing one shared component is not promotion either.

Neither `bun run lint` nor the gates can see a fork that renamed itself, so the third rung is also a review question. `bun run test:routes` fails a component that reuses a primitive's `data-slot`, and a shared component with fewer than two features importing it.

## Enforcement

`bun run lint` runs the ESLint `@shadcn/lint` rules configured in `design-system.lint.json`:

| Rule | Severity | Catches |
| --- | --- | --- |
| `shadcn/no-restyle` | error | Classes passed to design-system components |
| `shadcn/no-raw-colors` | error | Palette colors, undeclared tokens, raw SVG colors |
| `shadcn/no-arbitrary-values` | error | Off-scale values such as `p-[13px]` |
| `shadcn/no-inline-styles` | error | Inline `style` attributes and `<style>` elements |
| `shadcn/require-static-classes` | error | Class values the linter cannot read |
| `shadcn/no-unknown-classes` | error | Classes this project's Tailwind cannot generate |

A rule is added at `warn` and promoted to `error` once the template reports zero findings for it, so a new rule cannot break every build on its first day. `no-unknown-classes` has been promoted; `bun run lint` currently reports no errors and no warnings.

Inside `src/shared/components/ui/**`, `no-restyle`, `no-arbitrary-values`, and `require-static-classes` are off because primitives own their own appearance; the token and inline-style rules still apply there.

Findings carry fix guidance. Resolve them in this order:

1. Use an existing variant or token.
2. Add a CVA variant to the primitive for a reusable appearance.
3. Add a token in `src/styles.css` for a new value.
4. Widen a contract in `design-system.lint.json` when callers legitimately own part of a component's styling.
5. Suppress with a reason only for an approved exception:

```tsx
// eslint-disable-next-line shadcn/no-raw-colors -- Partner brand color, approved by design.
```

`rg "eslint-disable.*shadcn/"` lists exceptions. New tokens, variants, contracts, and suppressions are design decisions; review them as such.

## What The Linter Cannot See

The linter does not check plain CSS or `@apply`, parent-selector overrides such as `[&_button]:...`, imported class values, accessibility, or reduced-motion craft. It also cannot see a component that rebuilds a primitive: that component is not a design-system component, so `no-restyle` has nothing to attach a finding to, and the token rules apply to it without complaint. `AGENTS.md`, the `tests/routes` gates, and the `fullstack-coder` skill's UI guidance govern those.
