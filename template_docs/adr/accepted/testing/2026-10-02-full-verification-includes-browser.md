# ADR: Include Built Browser Acceptance In The Completion Gate

Type: template
Status: accepted
Classification: testing

## Problem

A template user followed the skill's command labelled "Full gate" and missed browser acceptance in nine of eleven migration layers.
Source tests, typechecking, lint and build passed while runtime import-protection diagnostics remained unnoticed.
The completion wording and separate CI/browser invocation made an incomplete command look sufficient.

## Decision

`bun run verify` runs format, lint, typechecking, source tests, built-app browser acceptance, and the executable server-capability fixture, and it is the single completion gate.

`test:e2e` retains its build and standalone use; verify does not separately rebuild the main app.
The capability fixture has a separate isolated build because it is a distinct Start app, and it tests both production and dev transforms plus deliberately invalid builds.
CI installs Chromium before verify and runs one completion command.
Missing browser or server prerequisites fail the command rather than skipping.
Browser listeners attach before navigation and fail on unexpected console and page errors; expected HTTP diagnostics in negative cases are identified alongside the asserted failure behavior rather than silently discarded.
The container checks remain a separate CI job, separate from browser acceptance.

## Alternatives considered

**Keep verify separate and rename the skill section.** Better wording would help, but every caller would still need to remember a second completion command.

**Add verify:full while retaining a shorter verify.** Rejected because the familiar short command would remain the default and the original omission would recur.

**Rely only on a static re-export gate.** Useful and included, but it cannot prove transformed declaration behavior, hydration, or actual browser invocation.

## Consequences

- `bun run verify` is the only completion gate. It executes the browser suites and the capability fixtures, and exits nonzero on missing prerequisites or failed evidence.
- `.github/workflows/ci.yml` installs Chromium first and then invokes that one command. The container job stays a separate job, so a deployment change is verified without paying for browser acceptance.
- README, the agent contract, and the workflow and adoption instructions all use that same completion meaning, so "done" is one thing in the prose and one thing on the command line.
- The gate costs more time and requires browser prerequisites locally. That is the accepted cost: the omission this record exists to prevent was invisible, and it cost a user nine of eleven migration layers.
- Targeted source commands remain useful during iteration but do not authorize completion.
- The isolated fixture installs from the frozen lockfile using Bun's cache. It must not use an external `node_modules` symlink, which would change Vite's dev resolution and make the fixture test something other than the template.
- A static re-export gate remains part of the source tests. It catches the declared import boundary; only the built-app suite can prove transformed declaration behavior, hydration, and actual browser invocation.

## Testing

- `bun run verify` — the completion gate itself; nonzero exit on a missing browser or a failed suite.
- `e2e/ordering.spec.ts` — attaches its `pageerror` and `console` listeners in `beforeEach`, before any `goto`, so an unexpected runtime diagnostic fails the run rather than being reported after the fact.
- `tests/server-capabilities/run.ts` — exercises positive calls and explicit failure cases against both the production and dev transforms.
- `.github/workflows/ci.yml` — the `verify` job installs Chromium before the single completion command.

## Related

- [`server-only-modules`](../architecture/2026-09-29-server-only-modules.md)
- [testing.md](../../../testing.md)
- [development-workflow.md](../../../development-workflow.md)
