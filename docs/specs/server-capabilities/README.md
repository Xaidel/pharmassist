# Server-capability gap remediation

Status: delivered. The user approved implementation of the concrete plan on 2026-10-02, and maintainer review has since accepted the three template records this package implements.

## Requirement

An engineer following the template and fullstack-coder must be able to communicate between server-only features as a normal supported operation, without publishing private values through an RPC module or importing another feature's storage.
The motivating user report described authorization middleware, authoring state, acceptance evaluation and an audit sink forced through functions-module re-exports, producing four invalid exports and seventeen import-protection denials.
The same report found an incomplete command labelled full verification and runtime initialization failures caused by eager factories in cyclic graphs.

## Scope

- Published server-only feature operations with consumer-owned ports and mapping.
- Shared private composition for provider RPC and server-only entrypoints.
- Consumer fake-based tests without runtime provider initialization.
- Explicit provider authorization and request-independent service context.
- Tested middleware declaration placement, server-value export checks and runtime/feature cycle checks.
- Built browser acceptance in the completion command, including diagnostics and missing-prerequisite failures.

Moved-test collection, tool-config moves, violation-snapshot drift and shell-component ownership are separate follow-ups.
No production authentication provider or persistence platform is added, and the reference ordering relationship remains RPC-based.

## Design and authority

[server-capabilities.md](../../../template_docs/server-capabilities.md) owns the construction walkthrough and module contracts.
The three accepted template records own architectural access/construction, provider authority, and completion verification respectively.
The accepted historical records those decisions touch retain their rationale and carry relationship links naming what was retained and what changed.
The isolated synthetic Start app lives under `tests/server-capabilities/`; derived applications retain it as baseline evidence and replace the separate ordering application example during adoption.

## Acceptance evidence

`E2E_PORT=3118 bun run verify` covers main source checks, the built ordering journey, staged fixture source checks and unit tests, production/dev capability journeys, and two rejected-build controls.
`tests/routes/server-capability-fixture.test.ts` applies the real dependency gate to the same fixture source that is built, rather than testing a reimplementation.
Factory isolation, defensive copies, mapped outcomes and request-independent calls have co-located unit/integration tests.
Browser assertions cover shared state through both entrypoints, nested validation/middleware, non-inherited outer context, forged client identity, denied provider permissions, concurrent actors, audit receipts and nested transport outcomes.
Docker build and a non-root container health probe validate unchanged reference deployment output.

The portable skill snapshot/pins and Atlas taxonomy are updated only after an accepted upstream revision exists. Independent agent behavior comparisons remain pending at that point; the executable fixture is mechanical evidence, not a claim of controlled skill evaluation.
