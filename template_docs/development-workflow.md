# Development Workflow

Build changes as coherent vertical outcomes rather than directory-shaped phases.

## Significant Work

Authentication, persistence, public contracts, major features, migrations, deployment, and security boundaries use this sequence:

1. Approve a focused product contract with goals, non-goals, behavior, and success criteria.
2. Approve an owning technical design with routes, feature ownership, server/browser boundaries, persistence or provider responsibilities, tests, and acceptance.
3. Write focused failing tests where they clarify expected behavior.
4. Implement the smallest working vertical slice from route through feature and server boundary.
5. Add adapter-specific evidence and browser acceptance appropriate to the risk.
6. Update documentation and acceptance status with the implementation.

Review checkpoints do not automatically become document phases. Create numbered phases only for true predecessor relationships, separately verifiable outcomes, material risk, or distinct handoffs.

## Routine Work

Bug fixes, dependency maintenance, copy changes, and isolated refactors may use normal issue and pull-request review when they preserve current product and architecture contracts. Add tests that reproduce or protect the changed behavior.

## Document Formatting

Markdown uses semantic line breaks: one line per paragraph, one line per list item, never a hard wrap. The renderer wraps to the viewport, so wrapping at column 80 carries no information, and it turns a one-sentence edit into a paragraph-wide diff in review and in `git blame`. Structure comes from blank lines, headings, list markers, tables, and fences, and from nothing else.

Three things stay hard-wrapped, because their column alignment *is* the content:

- fenced code blocks, including the ASCII directory trees and dependency graphs in `architecture.md` and `dependency-rules.md`, where a shifted column changes the reading;
- table rows, one row per line, which the reader compares vertically;
- the three-line record header, whose `Status:` and `Classification:` lines must never merge into one.

Enforcement is split, and the split is deliberate. `prettier.config.js` sets `proseWrap: 'never'`, which keeps `AGENTS.md`, `README.md`, and `CHANGELOG.md` unwrapped automatically. `docs/` and `template_docs/` are in `.prettierignore`, because Prettier reflows markdown embedded in a fence and rewrites the record header — the two cases this rule exists to survive. Inside those trees the line breaking is review-enforced rather than machine-enforced, and `check_adr.py` remains the one automatic guard, failing a record whose header is malformed.

Write prose in the shape you want it to render. Do not run a formatter over a fence expecting it to preserve the contents, and do not re-wrap a paragraph to tidy it: both undo this rule.

The accepted cost is coarser prose diffs and `git blame` on documents. That is a deliberate trade for never thinking about column width again, and it is worth revisiting only if documentation review actually suffers from it.

## Engineering Skills

Both skills are expected installed globally from the org skills repository, and this repository vendors neither:

```sh
npx skills add gyud-labs/gyud-skills --skill fullstack-coder
npx skills add gyud-labs/gyud-skills --skill create-adr
```

`fullstack-coder` supplies coding and architecture conventions beyond this contract. `create-adr` owns the decision-record format, the lifecycle folders, the classification set, and the deterministic check documented in [`adr/README.md`](adr/README.md) and [`adr/AGENTS.md`](adr/AGENTS.md); its commands are written against its global install at `~/.agents/skills/create-adr`.

Vendoring skills under a repository's own `.agents/skills/` is what this rule exists to prevent. A repository's skills are authoritative for the agents that read them, so stale vendored guidance silently overrides the current contract, and a fixed copy then drifts from the org standard it copied. That is why six skills once vendored here were retired rather than updated: `ts-coder` still mandated pnpm after [`bun-toolchain`](adr/accepted/process/2026-09-29-bun-toolchain.md) was adopted, `react-ts-ui-designer` described a token pipeline the template never used, and `adr-writer` was superseded by `create-adr`. Visual guidance the retired UI skills carried now lives in [`design-system.md`](design-system.md).

## Verification

```sh
bun run verify
docker build .
```

Run the container build when deployment output, dependencies, runtime configuration, or the Dockerfile changes. The toolchain these commands assume is [`bun-toolchain`](adr/accepted/process/2026-09-29-bun-toolchain.md).

Verify includes browser acceptance and the isolated server-capability example, and it is the completion gate, per [`full-verification-includes-browser`](adr/accepted/testing/2026-10-02-full-verification-includes-browser.md). Targeted source checks are useful during iteration but do not authorize completion. Chromium must be installed before verify.
