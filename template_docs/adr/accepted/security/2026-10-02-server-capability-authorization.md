# ADR: Preserve Provider Authority Across Both Feature Entrypoints

Type: template
Status: accepted
Classification: security

## Problem

Function middleware protects client-callable RPC, but a server-only application entrypoint does not execute the RPC builder chain.
Treating a server-origin call as inherently authorized would bypass provider policy, while relying on an outer function's context would depend on propagation the framework does not promise.
The existing shared middleware guidance also lacks a tested module placement for factories evaluated when `.middleware([...])` is declared.

## Decision

Both feature entrypoints preserve provider-owned authorization and resource access before running private application behavior.
Ingress derives identity from server request or session data, or from an explicit service identity for a job.
A server-only contract receives a narrow execution context supplied per call, with no privileged default when the context is absent and no request identity held in a process singleton.
An alternative that hands out pre-authorized capabilities must record its issuance, its scope, and its enforcement in an application security decision.
The domain stays pure and contains no authorization; each entrypoint delegates enforcement to focused provider policy or private composition, so RPC and in-process calls cannot drift apart.
Every inbound path validates its own input once with the provider's domain-authored schemas, then delegates the parsed values to the common implementation.
Stable application outcomes cross the in-process contract; HTTP status, response headers, redirect, and not-found objects are mapped at the RPC or HTTP wrapper rather than used as the internal protocol.
Consumer integration adapters translate provider outcomes into consumer-owned outcomes, preserving the distinctions between absence, denial, and failure.

Shared middleware declarations live in `src/lib/<name>.middleware.ts`, with private session and provider access in `src/lib/<name>.server.ts` referenced only inside `createMiddleware(...).server(...)` callbacks.
Feature-specific permission decisions stay with their feature; `src/lib` owns the plumbing and imports no feature.
Start's server-callback transform removes the imported private binding; it is never exported, eagerly evaluated, or used in a client callback.
The executable fixture contrasts this with a factory that is itself named `.server.ts`, which is evaluated in the RPC declaration and denied by client import protection.

This record supplements [`authorization-boundary`](2026-09-29-authorization-boundary.md) clauses 1–6 with a second inbound application contract and concrete middleware placement.
RPC middleware stays required for private RPC, route guards stay navigation UX, CSRF protection stays installed, and identity-dependent HTTP responses keep the existing private-cache policy.
Neither the RPC contract nor the server-only contract grants authority merely because a call originates on the server.

## Alternatives considered

**Consumer-only authorization for internal calls.** Rejected because the consumer can become a confused deputy and provider-specific resource rules would migrate into unrelated features.

**Call RPC for every server-side operation.** Retained for callers needing that published transport contract, but it cannot replace an explicit request-independent server contract.

**Put all middleware declarations in `.server.ts`.** Rejected for the tested factory-at-declaration pattern because the factory remains needed in the client module. Split the transform-compatible declaration from private implementation instead.

## Consequences

- Explicit per-call context is a contract between trusted modules, not protection from malicious code in the same process. An application must define how service identities are issued.
- A value may be parsed once at each distinct feature-context boundary. Within one context, interior code trusts that boundary's parsed values and does not parse them again.
- The synthetic fixture proves mechanisms and failure paths, not the suitability of any production identity provider. Choosing one stays with the application.
- Middleware declarations and private implementations are two files per shared policy rather than one, which is the cost of keeping the declaration evaluable in a client module.
- Template guidance states the enforcement responsibilities while leaving identity-provider selection to applications, so adopting this decision does not pull in an auth vendor.

## Testing

- `bun run test:capabilities` — verifies authorized and denied RPC, nested RPC, and in-process calls, invalid provider input, forged client identity, distinct concurrent actors, and consumer outcome mapping.
- The context probe — distinguishes request-derived identity from outer function context, so no rule depends on automatic propagation of outer function middleware fields.
- The fixture runner — checks that the private session implementation is present in server output and absent from executable client output, and runs deliberately invalid middleware and re-export builds as negative controls.

## Related

- [`authorization-boundary`](2026-09-29-authorization-boundary.md)
- [`server-only-modules`](../architecture/2026-09-29-server-only-modules.md)
- [`server-capability-boundaries`](../architecture/2026-10-02-server-capability-boundaries.md)
