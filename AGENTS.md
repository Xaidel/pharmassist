# Feature-Based TanStack Start Engineering Contract

<!-- think-fast:setup -->

## Decision-making

Before deliberating on a bounded decision — routing, classification, ranking, risk, or verification gating — think fast first: run `python3 ~/.agents/skills/think-fast/scripts/think_fast.py ask --payload -` from the repo root with one `noul`, `choice`, or `score` question and the smallest state that carries it. Treat the answer as a first approximation: accept it when the decision is reversible, low-stakes, and confident; when it is uncertain or consequential, refine or override it with reasoning; when doubt remains, escalate to the user; irreversible actions always take explicit confirmation. The script reports its outcome by exit code: `0` success, `2` an invalid payload you must fix, `3` no configured backend, `4` an API or network failure. On `3`, proceed deliberately and say so. On `4`, retry once, then proceed deliberately and say so; a configured backend that is unreachable is not the same as no backend, and treating it as one is how an agent proceeds silently. Both paths belong to the `think-fast` skill; `setup-think-fast` is its installer and holds only `doctor.py`. Protocol details: `~/.agents/skills/think-fast/references/protocol.md`.

This is the sole binding engineering contract for the repository. It applies to human and AI contributors. Detailed reusable guidance lives under `template_docs/`.

## Lessons

When unsure, stuck, or hitting an error, check `docs/lessons/` first: a previous agent may have recorded the same gotcha, exemplar, or anti-pattern. Record new lessons there the moment you encounter them, not at the end of the task — a lesson written early serves your own later turns and your subagents too. One `.md` per lesson, with a short explanation and example snippets when useful.

## This Application Inherits A Template Baseline

This application was created from `gyud-internal/tpl-fsfba-ts`. Read this before anything else.

- **The engineering baseline is real and is inherited.** This contract, `template_docs/`, the accepted records in `template_docs/adr/`, the lint and verification gates, the router and Start conventions, and the security posture govern this application unless an accepted application record deliberately changes one.
- **The template's ordering example has been removed.** `src/features/menu`, `src/features/orders`, their routes, `e2e/ordering.spec.ts`, and the reference-app specifications are gone. Do not resurrect them or treat their former behavior as a precedent.
- **The product is the Pharmassist POC.** Its requirements live at [`docs/PRD.md`](docs/PRD.md) and its data and API contract at [`docs/poc/data-contract.md`](docs/poc/data-contract.md). The build is authorized by the POC map, not by the template.

Consequences for the work you are asked to do:

- Build the requested product feature as its own vertical slice. Do not extend or generalize the removed example.
- When a request is about the baseline itself, change the contract, the records, or `template_docs/` and keep the application consistent with them.
- When a request is ambiguous between the baseline and the product, ask which one is meant.
- The rules outrank any surviving example: where the two disagree, the record governs.

## Product Baseline

- Bun 1.4 as package manager and production runtime, with Node.js 22 retained for Vitest and Playwright execution, as declared in `package.json`.
- TanStack Start, TanStack Router file routes, React 19, strict TypeScript, and Vite.
- Tailwind CSS v4 with semantic design tokens and a small ShadCN-compatible UI set.
- Zod runtime validation at untrusted boundaries.
- The application uses no authentication. Persistence is introduced only through an approved application design, migrations, and recovery expectations.
- The generated Bun server (Nitro `bun` preset) is the supported deployment baseline; Docker packages it.

Do not add databases, authentication providers, global state libraries, query caches, telemetry vendors, or cloud adapters without a concrete application requirement.

## Source Ownership

| Location | Owns | Must not own |
| --- | --- | --- |
| `src/routes` | File-route declarations, paths, loaders, search/param validation, guards, metadata, SSR options, route fallbacks, routing layouts, and raw `server.handlers` | Feature UI, database access, secrets, business rules |
| `src/features/<feature>` | Feature pages, components, hooks, domain model, schemas, outbound ports, use cases, server functions, server-only adapters, and feature tests | URL registration, route-tree generation, another feature's domain or server internals |
| `src/shared/components` | Proven cross-feature rendered UI, or deliberately curated template primitives, without feature knowledge | Business behavior, loaders, server-only imports |
| `src/shared/hooks` | Proven cross-feature React behavior | Feature rules or route declarations |
| `src/shared/types` | Client-safe contracts with no single feature owner | Feature-local or server-only types |
| `src/shared/domain` | Value objects proven to serve two or more features, with no feature rules | Feature rules, entities, adapters, server-only imports |
| `src/lib` | Focused app utilities and cross-cutting infrastructure glue | Feature components, feature rules, catch-all service modules |

Create folders only when code needs them. Keep code feature-local until cross-feature reuse is real.

## Dependency Direction

A feature publishes client-callable RPC in `*.functions.ts` and, when it needs them, in-process server-only application operations in `*.surface.server.ts`. Before adding a server-only feature dependency, read `template_docs/server-capabilities.md` for the two published entrypoints, injectable consumer adapter, production binding, shared private composition and provider-authority responsibilities; [`server-capability-boundaries`](template_docs/adr/accepted/architecture/2026-10-02-server-capability-boundaries.md) and [`server-capability-authorization`](template_docs/adr/accepted/security/2026-10-02-server-capability-authorization.md) own those rules.

Production imports must follow:

```text
routes -> features -> shared/lib
entrypoints -> routes/lib
shared/lib -> never features/routes
```

- Consume foreign capabilities through narrow published contracts only when a real dependency exists, and keep both the source graph and feature graph acyclic.
- `*.port.ts` and `*.use-cases.ts` are unsuffixed and client-safe. They hold no state, read no clock, and import no adapter, framework, or Node builtin.
- In a single-entry feature, `*.functions.ts` constructs concrete adapters and owns their lifetime. In a dual-entry feature, private `*.composition.server.ts` owns construction and lifetime; both inbound entrypoints import it, it imports neither entrypoint, and no other feature may import it.
- Unsuffixed modules must be client-safe.
- `*.server.ts` may import databases, private SDKs, filesystem modules, and secrets.
- Components, hooks, route loaders, and client-safe barrels must never import `*.server.ts` directly.
- Do not re-export server-only values from a client-importable barrel.
- Do not hand-edit `src/routeTree.gen.ts`; regenerate it through dev or build tooling.

## TanStack Start Boundaries

- `getRouter()` returns a fresh router instance.
- `src/routes/__root.tsx` renders `HeadContent` and `Scripts`.
- `tanstackStart()` precedes the React Vite plugin.
- Loaders are isomorphic. They call client-safe server functions instead of databases, secrets, filesystem logic, or private SDKs.
- Browser callers and isomorphic route loaders use validated `createServerFn` wrappers. Name the method in the options object (`createServerFn({ method: 'GET' })`); there is no `.method()` builder method, and `.inputValidator()` is deprecated in favor of `.validator()`.
- Server-only feature integrations may consume published in-process application operations through consumer ports, injectable mapping factories, and production bindings. A server-side consumer may retain RPC when it needs that published transport contract. External HTTP callers use route `server.handlers`: public APIs, webhooks, or endpoints that intentionally serve cross-origin requests.
- Call a server function from a route loader for a read and from a component event handler for a mutation. A component that calls a server function which can throw `redirect()` or `notFound()` wraps it in `useServerFn()` first; that wrapper is what turns a thrown redirect into client navigation. Unwrapped, the call rejects with the redirect itself, so the caller's own error handling reports a successful mutation as a failure. Loaders need no wrapper.
- Refresh after a successful mutation with `router.invalidate()`, never by patching loader data into local state. Pending and failure state belongs to the component that awaits the call.
- Use GET for idempotent reads and POST for mutations and forms.
- Use route `server.handlers` for public APIs, webhooks, or exact `Request`/`Response` semantics.
- A dynamic server-function import must be a static string literal: the transform resolves it to the RPC stub and the call still crosses the server boundary. A computed path — ``await import(`./${name}`)`` — builds green but the function is never registered, so the call fails at runtime with `Server function info not found`.
- Private RPC, server routes, and published server-only application operations enforce provider authorization and resource access internally. Server-only operations require explicit per-call execution context with no privileged default or request identity held in process singletons. Route guards provide navigation UX and are never the only data-security boundary.
- Enforce authorization with function middleware, not with a check repeated per handler: build a policy as a factory that takes the required permissions, and attach it with `.middleware([...])`. Derive the session server-side, never from client context, and never trust a validated identifier as an authorized one.
- Shared middleware declaration factories live in `src/lib/<name>.middleware.ts`; private session implementation lives in `src/lib/<name>.server.ts` and is referenced only inside transformed `.server(...)` callbacks. Never export or eagerly evaluate private bindings. Both feature entrypoints delegate provider enforcement to focused policy or private composition; RPC middleware alone does not protect in-process calls.
- Production source exports no test-only helpers. Isolate state by building a new instance from its `create*` factory.
- `src/start.ts` must retain server-function CSRF protection unless an accepted ADR records an equivalent alternative.

## TypeScript And React

- Keep strict mode, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
- Never use `any` in maintained source; narrow `unknown` values. Tool-owned generated files may contain framework-generated types that do not follow this rule.
- Prefer `type` over `interface` except framework declaration merging.
- Add explicit parameter and return types to public functions and components.
- Document exported application APIs with succinct TSDoc.
- Infer types from runtime schemas at I/O boundaries.
- Author each invariant once in the owning `*.domain.ts`; wire contracts compose domain schemas, plus the `src/shared/domain` schema of any promoted value object they carry, and add no constraints of their own.
- Keep domain modules pure and client-safe: they import Zod and `src/shared/domain` only, and receive time, identity, and generated values as arguments.
- Keep values crossing server functions or SSR plain and serializable; domain types never use class instances, `Date`, `Map`, or `Set`.
- Consume another feature through its published RPC or server-only application contract. Only the consumer's production binding imports the provider's `*.surface.server.ts` at runtime; only its injectable mapping factory imports published provider contract types. Never import provider domain modules, private adapters, or private composition.
- Use named component exports and type-only imports.
- Use `getRouteApi()` in extracted feature pages rather than importing a route's `Route` object.
- Use semantic HTML, visible focus, correct labels, accessible status messages, and reduced-motion fallbacks.
- Use semantic tokens rather than raw palette colors in application components.
- Reach for an existing component before writing one: import the primitive from `src/shared/components/ui/`, wrap it when the wrapper names a concept, and move the existing file the day a second feature needs it. Do not re-mark up a primitive's structure and styling under a new name; see `template_docs/design-system.md`.
- Run `bun run lint` and fix `shadcn/*` design-system findings. Extend tokens or primitive variants instead of styling shared primitives with `className`; see `template_docs/design-system.md`. Suppress a rule only with a reasoned `eslint-disable-next-line` comment.

## Testing

- Co-locate feature unit and component tests with their feature.
- Keep route integration and source-boundary tests under `tests/routes`; never place test files under `src/routes`.
- Unit tests isolate external effects and cover happy paths, failures, and meaningful boundaries.
- Browser tests exercise the built application through the public UI and must not skip silently when prerequisites are absent.
- An in-process route test is not browser E2E, and a broad contract suite is not a smoke test.
- Run `bun run verify` before submission. It includes built browser acceptance and the executable server-capability fixture; missing prerequisites fail rather than skip. Run `docker build .` when changing deployment or runtime output.

## Specifications And Decisions

- Reusable template guidance and decisions live under `template_docs/`.
- Application requirements, designs, and decisions live under `docs/`.
- The POC's product and data contracts are `docs/PRD.md` and `docs/poc/data-contract.md`; neither authorizes implementation by itself. The POC map authorizes the build slices.
- Significant features, public contracts, authentication, persistence, deployment, security boundaries, migrations, and cross-runtime changes require a normative focused PRD and normative owning technical design.
- Routine fixes, maintenance, and isolated internal improvements may use ordinary issue and review flow when they do not change product or architecture contracts.
- Record durable reusable architecture decisions in `template_docs/adr/` and durable application decisions in `docs/adr/`. A new unresolved record is created in its collection's `proposed/` folder with `Status: proposed`; nothing else moves it. Cite a record by the slug its filename carries, and amend an accepted decision with a new linked record rather than editing the one it replaces.
- A technical design elaborates product requirements but must not redefine them.

## Documentation Style

- Markdown uses semantic line breaks: one line per paragraph and one line per list item, never a hard wrap. Structure comes from blank lines, headings, list markers, tables, and fences.
- Fenced code, table rows, and the three-line `create-adr` record header stay hard-wrapped, because their column alignment is the content. A record's `Status:` and `Classification:` lines must never merge.
- `AGENTS.md`, `README.md`, and `CHANGELOG.md` are kept unwrapped by `proseWrap: 'never'`. `docs/` and `template_docs/` are in `.prettierignore`, so line breaking there is review-enforced; `check_adr.py` still guards the record header.
- The rule, its exceptions, and its accepted cost are stated in `template_docs/development-workflow.md`.

## Engineering Skills

- Coding and architecture conventions beyond this contract come from the `fullstack-coder` skill. Install it with `npx skills add gyud-labs/gyud-skills --skill fullstack-coder`.
- Record lasting decisions with the `create-adr` skill and the process in `template_docs/adr/`. It is expected installed globally at `~/.agents/skills/create-adr` (`npx skills add gyud-labs/gyud-skills --skill create-adr`); this repository vendors no skills, because a repository's own skills are authoritative for the agents that read them and stale vendored guidance silently overrides the contract. The collection and this contract replace the retired vendored coding skills; see `template_docs/development-workflow.md`.

## Self-Audit

- [ ] Code is owned by the correct route, feature, shared, or utility location.
- [ ] Imports follow the directed graph and client code has no server-only dependency.
- [ ] Application-owned untrusted inputs and environment values are runtime validated.
- [ ] Private data authorization occurs at the server boundary.
- [ ] Routes remain thin and extracted pages use `getRouteApi()`.
- [ ] A component calling a server function that can redirect or 404 wraps it in `useServerFn()`, and mutations refresh through `router.invalidate()`.
- [ ] Each private server function carries the middleware for the permission it needs, its session is server-derived, and no response that reads identity is publicly cacheable.
- [ ] Domain modules are pure, client-safe, and contain no I/O or environment access.
- [ ] Invariants are authored once, and interior code trusts parsed domain types.
- [ ] Cross-feature access uses published RPC or a server-only application surface through a consumer port, injectable mapping factory, and production binding; provider domain, storage, and composition remain private.
- [ ] Use cases receive collaborators from ports; construction and lifetime belong to `*.functions.ts` for single-entry features or private `*.composition.server.ts` for dual-entry features.
- [ ] Both published entrypoints enforce provider policy and validate their own input once; server-only operations use explicit per-call context and preserve application outcomes rather than transport objects.
- [ ] New shared abstractions have demonstrated cross-feature reuse or a deliberate template-baseline purpose.
- [ ] Tests match the changed risk and all documented verification commands pass.
- [ ] Design-system lint passes; `shadcn/*` findings are fixed or suppressed with a reason.
- [ ] New components reuse what exists: a primitive is imported rather than rebuilt, a wrapper names a concept, and a shared component is imported by two or more features.
- [ ] Significant work is authorized by current product and technical contracts.
- [ ] Reusable and application documentation remain in their owning trees.
- [ ] The change did not resurrect the removed template example or weaken the baseline to match it.
- [ ] Markdown prose uses semantic line breaks, with fences, tables, and record headers left hard-wrapped.
