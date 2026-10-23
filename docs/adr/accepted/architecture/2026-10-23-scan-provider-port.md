# ADR: Use Cloud Vision Behind A Provider-Neutral Scan Port

Type: project
Status: accepted
Classification: architecture

## Problem

The pilot's prescription scan needs handwriting OCR, and [decision #16](https://github.com/Xaidel/pharmassist/issues/16) selects Google Cloud Vision `DOCUMENT_TEXT_DETECTION` as the pilot provider.
The choice is privacy-sensitive: a prescription is sensitive personal information, the image crosses to a processor, and [research 01](../../../research/01-ph-regulatory-constraints.md) recommends on-device processing while [research 04](../../../research/04-ocr-feasibility.md) recommends Cloud Vision through a stateless, non-logging proxy with consent, a DPIA, and processor terms.
The architecture must let the product use Cloud Vision without making the vendor's API, credentials, region, request shape, or failure modes part of the scan feature's application behavior, its UI, or its wire contract.
The POC already defines `POST /api/scan` as the stable scan seam and uses a mock provider; the pilot must replace the mock implementation behind the same endpoint when the legal and accuracy gates clear.
The repository's inherited architecture already separates client-safe ports and use cases from server-only adapters, and the directions feature demonstrates the shape with `DirectionsProvider` and an OSRM adapter.
The decision question is how the scan feature should depend on Cloud Vision so the provider is replaceable, the privacy guarantees are enforceable in one place, and the mock, the pilot provider, and their tests cannot drift.

## Decision

The pilot's chosen OCR provider is Cloud Vision, used as one adapter behind a provider-neutral `ScanProvider` port; the scan feature does not depend on the vendor.
The port is client-safe and type-only, lives in `src/features/scan/scan.port.ts`, and carries neutral values: a minimized image in, recognized lines with confidence out.
The Cloud Vision implementation is server-only, lives in `src/features/scan/scan.cloud-vision.server.ts`, and is the only module that imports the Cloud Vision SDK or calls its endpoint, reads its credentials, or knows its region, model, language hints, timeout, and retry policy.
The POC mock is a second adapter behind the same port and remains the default for the POC and for automated tests.
The composition root selects the adapter from validated server configuration: `SCAN_PROVIDER=mock` for the POC, `SCAN_PROVIDER=cloud-vision` for the pilot, and an unknown value fails closed.
A single-entry scan feature constructs its adapter and catalog matcher in `scan.server.ts`; if a second inbound entrypoint is added, construction moves to a private `scan.composition.server.ts` that both entrypoints import and no other feature imports.
The route handler in `src/routes/api.scan.ts` validates the multipart request and consent, calls the feature's server-only scan operation, and returns the wire response; it must not import the vendor, construct an adapter, or contain provider-specific options.
The client scan module calls `POST /api/scan` and consumes the response schema; it must not import a `*.server.ts` module or the vendor.
`scan.use-cases.ts` orchestrates the OCR port and a second client-safe `MedicineMatcher` port; the OCR adapter returns text and confidence only, and the matcher resolves them against the medicine catalog through a server-only binding.
The adapter must be stateless and non-logging: it must not write the image to disk, retain recognized text, log the request body or file name, or return raw OCR text to the client.
The adapter must preserve the no-retention guarantee, and `POST /api/scan` must return only candidate lines and an ephemeral `scan_id`, never patient identifiers or full OCR text.
The client must crop to the medicine lines and mask patient identifiers before upload; the adapter must not attempt to recover or return them.
Cloud Vision-specific behavior, including `DOCUMENT_TEXT_DETECTION`, language hints, and the online synchronous endpoint, must stay inside the adapter and must not appear in the port, the use case, the wire contract, or the UI.
A provider replacement or removal is an adapter-and-composition change; the route, the client, the response schema, and the consent gate do not change.
This record authorizes the port and adapter architecture; it does not authorize production use of Cloud Vision with real prescriptions.
The DPIA, processor terms, consent copy, and counsel sign-off in #16 remain a separate launch gate.

## Alternatives considered

**Call Cloud Vision directly from `src/routes/api.scan.ts`.** This is the smallest file count and avoids a port. The route would then own the vendor SDK, credentials, region, timeout, retries, and no-retention logic; swapping to the mock or another provider would mean editing the route and its tests, and the privacy guarantee would be enforced at the HTTP edge rather than in one adapter. It is rejected because it couples the stable entrypoint to the vendor and makes the mock and real contracts drift likely.

**Import Cloud Vision inside `scan.use-cases.ts` or `scan.domain.ts`.** This keeps the call near the application behavior but violates the client-safe rule for use cases and domain modules, pulls a server-only SDK into the client graph, and forces unit tests to carry vendor fixtures. It is rejected because it destroys the test seam and the server/client boundary.

**Run OCR as a separate service behind its own HTTP API.** This gives strong isolation and independent deployment, but adds a second deployable, another network hop, its own authentication and secrets, and operational surface for a pilot that already has one app and a route seam. The in-process port provides the same replaceability without the extra service. It is rejected for the pilot; the port leaves room to split the provider out later if scale or isolation requires it.

**Keep one `scan.server.ts` that both selects and calls the vendor, with no port.** This is fewer modules, but the use case cannot be tested against a fake, the mock and Cloud Vision implementations diverge, and application behavior cannot change provider without editing the adapter. It is rejected because the seam is the point of the decision.

## Consequences

Positive:

- The vendor is replaceable: a different OCR provider, the POC mock, or no provider at all is an adapter-and-composition change, not a route, UI, or wire-contract change.
- The mock and the pilot provider share one port and one response contract, so the POC demo and the pilot implementation can be tested against the same use case.
- The no-retention and no-logging guarantees are concentrated in one adapter and one route, which makes them reviewable and testable rather than spread across the feature.
- Application behavior is unit-tested against a fake provider with no vendor key, no network, and no server boundary.
- Cloud Vision-specific features and limits stay out of the domain and the UI, so the product can drop OCR if the accuracy or legal gate fails without leaving vendor concepts behind.

Negative and neutral:

- The feature gains a port, an adapter, a composition root, and a second matcher port, which is more indirection than a direct call.
- The port must stay deliberately small; a vendor feature that does not fit the neutral `ScanLine` shape cannot be used without extending the port, and extending the port for one vendor would leak it.
- The adapter can only be contract-tested with recorded fixtures; a live Cloud Vision call in CI would require a key and would send real or synthetic images to the processor, so the test is an approximation of the vendor's behavior.
- The composition root and the `SCAN_PROVIDER` configuration become a failure point; an unknown or partial configuration must fail closed, and the POC and pilot must not silently share the wrong provider.
- The mock and the real adapter can drift unless the same contract test suite runs against both.
- The legal gate is not closed by this decision; the adapter can be built and tested, but production scans with real prescriptions remain prohibited until the DPIA, processor terms, consent copy, and counsel sign-off in #16 clear.
- Cloud Vision's accuracy on Philippine handwriting, brand names, and sig codes is unproven until the 120-prescription test; the port makes it cheap to remove the provider, but it does not make the accuracy risk smaller.

## Testing

- Review confirms the record's path, status, skeleton, and links with the repository check, `check_adr.py docs/adr`.
- A unit test for `recognizePrescription` runs against a fake `ScanProvider` and a fake `MedicineMatcher`, proving the use case has no vendor import and no network.
- A source-boundary test under `tests/routes` asserts that `@google-cloud/vision` is imported only by `scan.cloud-vision.server.ts`, that `scan.port.ts` and `scan.use-cases.ts` import no `*.server.ts`, vendor, React, or `node:` module, and that no client module imports the adapter.
- A contract test runs the mock adapter and the Cloud Vision adapter against the same recorded request and response fixtures, with an injectable transport for the vendor adapter so no live call is made.
- A route integration test calls `POST /api/scan` with `SCAN_PROVIDER=mock` and covers consent rejection, size and type validation, the low-confidence item, and `image_retained: false`.
- Browser acceptance covers the mock scan flow; no browser test depends on Cloud Vision.
- Review confirms the route handler and client scan module contain no vendor import or provider-specific option.
- The scan feature is not yet implemented; #28 owns the POC scan flow and its tests, and conformance is review-enforced against this record until they land.

## Related

- [#7](https://github.com/Xaidel/pharmassist/issues/7) — PRD map; #16 is its OCR decision ticket
- [#16](https://github.com/Xaidel/pharmassist/issues/16) — OCR data-flow and legal-risk decision
- [#17](https://github.com/Xaidel/pharmassist/issues/17) — POC map; the mock scan and the `POST /api/scan` seam
- [#28](https://github.com/Xaidel/pharmassist/issues/28) — POC scan implementation
- [`cloud-ocr-legal-gate`](../security/2026-10-23-cloud-ocr-legal-gate.md) — the launch gate for real prescription images
- [`ports-and-use-cases`](../../../../template_docs/adr/accepted/architecture/2026-09-29-ports-and-use-cases.md) — inherited architecture for ports, use cases, and composition roots
- [`server-only-modules`](../../../../template_docs/adr/accepted/architecture/2026-09-29-server-only-modules.md) — inherited server-only boundary
- [Research 01](../../../research/01-ph-regulatory-constraints.md) — Philippine regulatory constraints
- [Research 04](../../../research/04-ocr-feasibility.md) — OCR feasibility and the accuracy gate
- [PRD](../../../PRD.md) — scan requirements in §5.2 and §6.2, privacy in §6.6
- [POC data contract](../../../poc/data-contract.md) — `POST /api/scan` in §7.10 and the OCR swap point in §9
- [`directions.port.ts`](../../../../src/features/results/directions.port.ts) — the application's existing provider-port precedent
