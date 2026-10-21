# Template Architecture Decision Records

This directory holds the records that govern applications derived from the template: one durable record per architecturally significant decision, with the forces that shaped it and the trade-offs it accepted. Records are written with the `create-adr` skill, which owns the format, the lifecycle, and the deterministic check.

Whether an accepted record authorizes implementation is decided by [`AGENTS.md`](../../AGENTS.md), not by the record. A derived application's own decisions live in [`docs/adr/`](../../docs/adr/README.md); the placement rule and the retained-versus-replaced distinction are stated once in the repository [README](../../README.md#documentation-ownership).

## What Warrants A Record

Write a record when a durable decision intended for derived applications changes the source decomposition, runtime boundaries, dependency direction, the validation model, the testing baseline, the security posture, or the supported deployment construction. Strong signals are a change to system boundaries or ownership, a new public interface or data model, a material effect on reliability, security, cost, or operability, adoption or removal of a platform or construction technique, a migration or release strategy that constrains later work, or a recurring debate that needs a durable resolution.

Routine implementation belongs in code or a technical design. Product behavior belongs in an application PRD. A database, identity provider, or application deployment choice belongs in `docs/adr/`. A tooling choice that is not part of the verification baseline belongs in [`development-workflow.md`](../development-workflow.md) rather than in a record.

## Layout And Naming

Every record's path encodes its lifecycle, its classification, and its first-proposed date:

```text
template_docs/adr/{lifecycle}/{classification}/{yyyy-mm-dd}-kebab-case-title.md
```

| Folder | `Status:` line | Meaning |
| --- | --- | --- |
| `proposed/` | `Status: proposed` | Under review; a recommendation, not yet an agreed decision |
| `accepted/` | `Status: accepted` | Agreed and authoritative; kept current with what actually shipped |
| `rejected/` | `Status: rejected — <why>` | Considered and declined; the reason is the verdict readers come for |
| `archived/` | sealed status, plus `Archived: YYYY-MM-DD` | Frozen history; never authority for current behavior |

The lifecycle folder is the status, and the classification subfolder is named by the record's own `Classification:` line, so the two header fields the check cross-verifies are copies of the path rather than a second vocabulary to keep in sync. A record sits exactly two levels down: a lifecycle folder holds only class folders, and a class folder holds only records. One closed set serves as both the header value and the folder name, which is what caps the tree at one level without a rule of its own.

The class is fixed at birth and travels with the record, so a lifecycle transition moves exactly one folder and a reclassification is itself a move. Correcting a class that was wrong is therefore a `git mv` plus repair of every relative link that pointed into the old subfolder, in the same change — not an edit to the file's contents alone.

The date is when the topic was first proposed and never changes, so relative links survive lifecycle moves. A same-day collision is resolved by varying the slug, never by renumbering or renaming an existing record. There is no identifier: the filename and header are the identity, which is why a title, a path, and a header can never disagree about a number. All four lifecycle folders are kept in git with a `.gitkeep`, so an empty lifecycle is visible in a clone and a record never lands in a folder that has to be invented. A class folder appears with the first record that needs it, so a lifecycle that has never held a record of some class simply has no such subfolder.

## Citing A Record

The slug is the record's handle. Cite it in prose, in review, and in a commit message:

| Handle | Class | Record |
| --- | --- | --- |
| `feature-slices` | `architecture` | Feature Slices As Vertical Bounded Contexts |
| `branded-domain-values` | `architecture` | Domain Values As Branded Serializable Types With One Validation Authority |
| `ports-and-use-cases` | `architecture` | Ports And Use Cases Above Adapters, Composed By Server Functions |
| `server-only-modules` | `architecture` | Server-Only Modules And Client-Safe Application Code |
| `cross-feature-access` | `architecture` | Cross-Feature Access Through Published Server Functions Only |
| `bun-toolchain` | `process` | Bun 1.4 Package Manager And Runtime With Retained Vitest |
| `design-system-lint` | `process` | Enforce The Design System With @shadcn/lint |
| `server-fn-boundary` | `architecture` | Server Functions Or Server Routes, And The API Surface They Share |
| `server-function-call-sites` | `architecture` | Server Function Call Sites And Mutation Refresh |
| `authorization-boundary` | `security` | Authorize Server Functions And Server Routes With Function Middleware |
| `component-reuse` | `process` | Reach For An Existing Component Before Writing One |
| `server-capability-boundaries` | `architecture` | Publish Server-Only Application Capabilities Between Features |
| `server-capability-authorization` | `security` | Preserve Provider Authority Across Both Feature Entrypoints |
| `no-rsc-composite-components` | `architecture` | Do Not Adopt Server Components Or Composite Components Yet |
| `full-verification-includes-browser` | `testing` | Include Built Browser Acceptance In The Completion Gate |

Two local naming rules make that possible, and both are permitted by the skill's "common norms and local policy" section:

- A slug is a short distinctive handle of two or three words, deliberately shorter than the title. The title names the decision; the slug names the decision in a way that survives being typed into a search box, a commit message, or a review comment.
- Every citation renders its handle as the link text, so what a reader sees is exactly what they can search for.

To find a record by handle: `ls template_docs/adr/accepted/*` or `grep -rl 'ports-and-use-cases' .`. To find one by status or class, grep the header lines as [AGENTS.md](AGENTS.md) describes.

## Header And Skeleton

```text
# ADR: <decision-focused title>

Type: template
Status: <proposed | accepted | rejected — reason>
Classification: <class>
```

This snippet is fenced as `text`, not `markdown`, on purpose. A formatter that reflows embedded markdown merges the field lines into one, which is the exact failure this contract forbids, and `text` is what keeps the snippet verbatim whatever is run over it.

`Type:` repeats what the collection already says — `template_docs/adr/` takes `template`, `docs/adr/` takes `project` — so a record read out of context still states what kind of decision it records, and the check fails a record whose `Type:` disagrees with its folder.

`Status:` carries no dates and no parentheticals. The filename holds the first-proposed date and git holds everything else. A record's prose follows the repository's semantic-line-break rule, and the header above is the one place in a record that stays hard-wrapped; both are stated in [`development-workflow.md`](../development-workflow.md#document-formatting).

The lifecycle folder selects the skeleton, and a transition re-satisfies the target skeleton in the same change that moves the file:

| Folder | Required sections in order |
| --- | --- |
| `proposed/` | `## Problem` · `## Proposal` · `## Alternatives considered` · `## Acceptance criteria` · `## Risks` |
| `accepted/` | `## Problem` · `## Decision` · `## Alternatives considered` · `## Consequences` |
| `rejected/` | `## Problem` · `## Proposal` · `## Alternatives considered` |
| `archived/` | The skeleton of the status it was sealed with, plus an `Archived: YYYY-MM-DD` line |

Records may add sections of their own between `## Decision` and `## Alternatives considered`. An accepted record states what confirms it in a present-tense `## Testing` section, and its relationships in `## Related`; it may not carry `## Proposal`, `## Plan`, `## Migration plan`, or `## Acceptance criteria`, which are proposal-era headings. A rejected record keeps its proposal-time sections and carries its verdict on the `Status:` line.

## Classification

Each record declares exactly one class from this closed set, in this order, and the same eight names are the only subfolders a lifecycle folder may hold:

| Class | What it covers |
| --- | --- |
| `architecture` | A structural decision about the shipped source: boundaries, dependency direction, vocabulary |
| `process` | Tooling, policy, and workflow around the code: gates, CI, package manager, review rules |
| `data` | Schemas, ownership, persistence, consistency boundaries, migrations, durable formats |
| `security` | Authentication, authorization, trust boundaries, secrets, threat-model outcomes |
| `testing` | Test infrastructure and strategy |
| `feature` | A new user- or model-facing capability |
| `bug-fix` | Corrects a defect or closes a gap a postmortem surfaced |
| `simplification` | Removes behavior or surface area without adding a capability |

`architecture` is how the source is shaped, `process` is the surrounding tooling, and `data` is what the system stores and exchanges. A refactor has no class of its own: `simplification` answers it, because its discriminator is whether observable behavior changes. Adding a class is a deliberate local decision: update this file, [AGENTS.md](AGENTS.md), and the `create-adr` skill together.

The class is not only a header field. It is the subfolder the record is written into, so `accepted/architecture/2026-09-29-feature-slices.md` carries `Classification: architecture`, and the check fails a record whose line and folder disagree. That is the whole reason the duplication is allowed where a `Date:` or a `Deciders:` line is refused: an unverified copy of the path drifts silently, and a checked one is a violation the gate names on line 5.

## No Index

There is no index of records, by design. The folder tree, the header lines, and repository search are the inventory, and a maintained list would only duplicate them while making every unrelated change a merge hotspot. Discovery rules for agents are in [AGENTS.md](AGENTS.md). [README.md](../../README.md) owns the repository-wide placement rule, which changes only when the rule changes, never when a record is added.

## Vocabulary

These records, [`architecture.md`](../architecture.md), [`dependency-rules.md`](../dependency-rules.md), and `AGENTS.md` use one term per concept. A derived application inherits the terms with the meanings, so substituting a synonym introduces a second vocabulary rather than a clearer sentence.

| Term | Means | Not |
| --- | --- | --- |
| Feature slice | One business capability and the directory that holds it; a bounded context | A route, a screen, or a technical layer |
| Domain module | `<feature>.domain.ts`: the pure, client-safe home of one feature's rules, value objects, and domain errors | The model as an abstract concept, or a schema module |
| Wire contract | The shape a `*.schema.ts` declares for data entering or leaving the process | The domain rule the contract re-expresses |
| Transport view | The plain, serializable value a server function returns, produced by projecting an aggregate | The aggregate, or a class instance |
| Operation | One exported function in a `*.use-cases.ts` module | A use-case module, or a server function |
| Use case | The application behavior in a `*.use-cases.ts` module, written as operations over a feature's own types | A single function, or a use case in the product sense |
| Port | A client-safe, type-only declaration of an outbound capability the feature needs but does not implement | An adapter, or a class with behavior |
| Adapter | A `*.server.ts` module implementing a port, owning state and private infrastructure | A repository class, or a factory |
| Composition root | The feature-owned construction boundary that names concrete adapters and owns their lifetime: `*.functions.ts` for a single-entry feature, private `*.composition.server.ts` for a dual-entry feature | A provider's public operation contract, or construction owned by a consumer |
| Inbound port | A published feature entrypoint: client-callable RPC in `*.functions.ts`, or intentional in-process server-only application operations in `*.surface.server.ts` | A provider's private implementation |
| Anti-corruption boundary | A port for a foreign feature that carries published data rather than the owner's domain types | A shared kernel |
| Edge | A place where untrusted or external data enters and is parsed once: server-function input, persisted rows, route parameters, external payloads | A layer of validation wrappers |
| Client-safe | Safe to import in both runtimes: a browser bundle may contain it | Untested, or unused by the browser today |
| Server-only | Reachable only from the server, named `*.server.ts` | Anything that happens to run on the server |
| Template record | A record in this collection, intended to govern derived applications | An application decision |
| Application record | A record in [`docs/adr/`](../../docs/adr/README.md), governing one application | A record inherited from the template |
| Promotion | Moving a component or a value object to `src/shared/` once two or more features genuinely use it | Moving anything that looks reusable |

"Record" always means a decision record and never a product requirement document. The collections are written with the `create-adr` skill, which owns the format and lifecycle; this vocabulary is the only local addition.

## The Architecture These Records Impose

[`server-capability-boundaries`](accepted/architecture/2026-10-02-server-capability-boundaries.md) and [`server-capability-authorization`](accepted/security/2026-10-02-server-capability-authorization.md) add a second inbound contract, and [server-capabilities.md](../server-capabilities.md) is their normative construction: a published server-only entrypoint is an inbound application contract; private composition owns shared construction; integration factories implement consumer ports without runtime provider imports, and production bindings supply provider operations.

The records state one vertical-slice DDD architecture that stays inside TanStack Start's own concepts. One feature is one business capability and a bounded context, and a feature's modules are arranged vertically, from pure rules outward to the one module that knows its adapters:

```text
src/routes                     routing adapter: URL, loader lifecycle, metadata, handlers
    |
    v
src/features/<feature>/
    *.domain.ts                pure rules, branded values, domain errors
    *.schema.ts                wire contracts and the projection to a transport view
    *.port.ts                  outbound capabilities, type-only
    *.use-cases.ts             application behavior: collaborators, input, now
    *.server.ts                adapters: state, private infrastructure
    *.client.ts                browser-only infrastructure, when a feature needs it
    *.functions.ts             RPC inbound port; composition root for a single-entry feature
    *.surface.server.ts        second inbound port, when the feature is called server-side
    *.composition.server.ts    shared construction for a dual-entry feature, private to it
    <consumer>-adapter.server.ts   consumer port implementation, no runtime provider import
    <consumer>-binding.server.ts   the only module importing the provider's surface
    pages/ components/         feature UI, unaware of all of the above
    |
    +--> another feature through its public *.functions.ts (browser, SSR, HTTP client)
    |
    +--> a server-only feature through its public *.surface.server.ts

src/shared/domain              value objects promoted by two or more features
src/shared/components          rendered UI with no feature knowledge
src/shared/hooks               proven cross-feature React behavior
src/shared/types               client-safe contracts with no feature owner
src/lib                        focused cross-cutting glue, and shared middleware
src/router.tsx  src/start.ts   framework entrypoints
```

`*.port.ts` and `*.use-cases.ts` appear only in a feature that meets the trigger in [`ports-and-use-cases`](accepted/architecture/2026-09-29-ports-and-use-cases.md), expanded to foreign commands by `server-capability-boundaries`; `*.client.ts` appears only in a feature that needs browser-only infrastructure; `src/shared/*` subfolders appear only on promotion. The four additional server-only roles appear only when needed: `*.surface.server.ts` is the second entrypoint, `*.composition.server.ts` is the construction both entrypoints share and no other feature may import, and the consumer's adapter and binding pair is how a consumer reaches it without importing the provider's implementation.

Four properties follow, and each record is easier to judge against them: rules are authored once in the domain module; the boundary is inverted at exactly one place, since an operation receives its collaborators and only a composition root names an adapter; untrusted input is parsed at an edge while the interior trusts the result; and neither entrypoint grants authority because a call originates on the server. [`architecture.md`](../architecture.md) is the operational form of this model and [`dependency-rules.md`](../dependency-rules.md) is its import graph.

## Decision Process

Records start in `proposed/`. Maintainers accept or reject through pull-request review, which is the only thing that moves a record out of `proposed/`. Acceptance is never inferred from authorship, from implementation, or from silence. `AGENTS.md` is the binding contract a change is measured against, and the records are subordinate to it. A PR accepting a record that changes the engineering baseline updates the binding contract and vocabulary in the same change; contradictory summaries do not constitute a second decision.

Changing an accepted decision means a new record that names exactly what it retains and what it changes. The old record keeps its rationale and gains relationship links; it is archived only once the replacement is accepted.

## Consolidation History

The template was consolidated in place before its first release, so no derived application has inherited or cited an earlier identifier. The superseded set was _Domain Model Inside Feature Slices_, _Bun 1.4 Package Manager And Runtime With Retained Vitest_, _Retire Vendored Coding Skills In Favor Of fullstack-coder_, _Enforce The Design System With @shadcn/lint_, and _Application Use Cases Over Outbound Ports In Feature Slices_. Every durable insight was carried into a current record rather than dropped: the former "no port until a second adapter" rule became the stored-state-or-foreign-capability trigger in the ports and use cases record; the skills decision left the record set because it is process rather than architecture and now lives in [`development-workflow.md`](../development-workflow.md#engineering-skills); and the toolchain and design-system records were carried across with their options and evidence intact.
