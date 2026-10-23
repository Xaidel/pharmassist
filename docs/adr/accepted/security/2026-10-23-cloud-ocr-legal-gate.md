# ADR: Gate Cloud OCR On A DPIA, Processor Terms, And Counsel Sign-Off

Type: project
Status: accepted
Classification: security

## Problem

The pilot's chosen OCR provider is Google Cloud Vision, and the provider-neutral adapter is recorded in [`scan-provider-port`](../architecture/2026-10-23-scan-provider-port.md).
That architecture record authorizes the port and the adapter, but it does not authorize sending a real prescription image to Google.
A prescription contains health information, which is sensitive personal information under RA 10173, and Cloud Vision processes the image on a processor outside the device and outside the Philippines.
[Research 01](../../../research/01-ph-regulatory-constraints.md) finds that explicit consent is the workable lawful basis for this flow and that the controller remains accountable for a processor transfer; [research 04](../../../research/04-ocr-feasibility.md) recommends a stateless, non-logging proxy with a DPIA and processor terms.
The adapter can be built and tested before those conditions are met, so the project needs an explicit, auditable gate that prevents a real prescription image from reaching the vendor while the legal work is incomplete.
The gate is separate from the 120-prescription accuracy test: a passing accuracy result does not create a lawful basis, and a completed DPIA does not prove the OCR is accurate.
The gate is also separate from the FDA/CDRR opinion on publishing prescription-drug prices, which is its own launch condition under [research 01](../../../research/01-ph-regulatory-constraints.md).
The decision question is what must be true before any real prescription image is sent to Cloud Vision in a live environment, and how that condition is enforced.

## Decision

Real prescription images must not be sent to Cloud Vision in any environment until all three conditions are complete and recorded.

1. **DPIA.** A Data Protection Impact Assessment for the scan flow is completed and approved by the DPO or accountable data-protection owner.
   It covers the purpose and lawful basis, the necessity and proportionality of the processing, data minimization, the crop and mask controls, the no-retention design, the cross-border transfer, the processor, the risks and safeguards, breach handling, data-subject rights, and a review date.
2. **Processor terms.** Written terms with Google Cloud are in place and reviewed against the actual service.
   They cover confidentiality, security, subprocessors, breach notification, data location, no use of content to train or improve models, deletion or return, and audit or assistance obligations.
3. **Counsel sign-off.** Philippine data privacy counsel reviews and signs off on the DPIA, the processor terms, the consent copy, the privacy notice, and the transfer basis before the first real scan.

The consent copy must be specific and informed.
It names Google Cloud as the OCR processor, states the purpose of extracting medicine names for the basket, discloses that the image leaves the device and is transferred cross-border, describes the no-retention design, offers manual search as the fallback, and explains how to avoid or withdraw from the scan.
It must not say that the image never leaves the phone or that processing happens only on the device.

The gate is a server-side enablement, not a hidden UI control.
The composition root must refuse to select the real adapter for real prescription data unless an explicit, reviewed enablement is true; an absent or false value fails closed, and the client cannot override it.
The gate applies to every environment that can receive real prescription images, including staging.
Synthetic images may exercise the adapter before the gate, subject to the processor terms and cost controls.

The 120-prescription accuracy test follows the de-identification and consent protocol in [research 04](../../../research/04-ocr-feasibility.md); completing that test does not enable production.
The POC remains on the mock provider, and its consent copy must not promise more than the pilot can keep; it uses the pilot copy or is explicitly labelled as a simulation.

The gate is owned by the DPO or legal owner; engineering enforces the configuration and records the evidence.
The approved DPIA, the signed processor terms, and the counsel sign-off are linked from the pilot launch checklist and from #16.

## Alternatives considered

**Run Cloud Vision with an internal DPIA only.** This is faster and cheaper, but the consent and transfer basis may be challenged later, and the product would be processing sensitive health data through a foreign processor without an independent legal review. It is rejected because the data is sensitive and the transfer is the core risk.

**Rely on Google's standard terms and public privacy page.** The standard terms are necessary but not sufficient: the controller remains accountable, and the specific processing, data location, no-training commitment, breach notification, and deletion path still need to be checked against the service actually used. It is rejected as a substitute for written terms and review.

**Wait for the accuracy test before starting the legal work.** This sequences two independent gates and delays the pilot. The legal analysis does not depend on the accuracy result, and the DPIA and processor terms can run in parallel with the test. It is rejected because it adds delay without reducing risk.

**Treat the FDA/CDRR opinion as the gate for OCR.** The FDA opinion concerns prescription-drug advertising and price publication, not the Data Privacy Act transfer. Conflating the two would block OCR for an unrelated reason and still leave the processor transfer unreviewed. It is rejected; the FDA opinion remains a separate price-listing gate.

**Use on-device OCR to avoid the processor transfer.** ML Kit is not callable from the PWA, Tesseract is unsuitable for handwriting, and a native wrapper is outside the PWA-only pilot. It is rejected for the same reasons recorded in [`scan-provider-port`](../architecture/2026-10-23-scan-provider-port.md).

**Ship Cloud Vision with a client-side consent toggle only.** Consent is necessary but not sufficient; the controller still needs the DPIA, the processor terms, and the transfer review, and a client toggle is not an enforcement boundary. It is rejected because it would make a legal gate optional at runtime.

## Consequences

Positive:

- No real prescription image can reach Cloud Vision by accident while the legal work is incomplete.
- The launch condition is explicit, auditable, and linkable from #16 and the pilot checklist.
- The consent copy is reviewed against the actual data flow, so the product does not make a privacy promise it cannot keep.
- The adapter and the accuracy test can proceed in parallel with the legal work, using the mock or synthetic images.
- The gate keeps the DPO and counsel in the release path instead of treating privacy as a post-launch concern.

Negative and neutral:

- Real scans cannot launch until the DPIA, the processor terms, and counsel review are complete; that work has cost and calendar time.
- The pilot's scan feature may launch later than search, because the gate is independent of the accuracy result.
- The gate adds a server-side configuration and a release-review step; an operator error must fail closed, not open.
- A shallow or copy-pasted DPIA can create false confidence; the review must be specific to the scan flow and the actual vendor service.
- Vendor terms and data locations can change; the approval needs a review date and a re-check when the service or region changes.
- The gate does not improve OCR accuracy, and the accuracy gate still applies separately.

Reversibility: the gate is a configuration and release condition. If counsel rejects the transfer, the real adapter stays disabled or is removed; the port, the mock, and the manual-search fallback remain.

## Testing

- Review confirms the record's path, status, skeleton, and links with the repository check, `check_adr.py docs/adr`.
- A configuration test asserts that selecting the real adapter for real prescription data fails closed unless the legal enablement is explicitly true; `SCAN_PROVIDER=cloud-vision` alone is not sufficient.
- A route test exercises `POST /api/scan` with the gate off and confirms it uses the mock or returns `SCAN_UNAVAILABLE`; no test sends a real prescription image to Cloud Vision.
- Review confirms the consent copy names Google Cloud, the cross-border transfer, the no-retention design, the manual fallback, and the withdrawal path.
- Review confirms the POC mock consent copy does not make a stronger promise than the pilot copy.
- The pilot launch checklist links the approved DPIA, the signed processor terms, and the counsel sign-off before the real adapter is enabled.
- The gate is not implemented in the POC; the pilot implementation owns it, and the POC remains on the mock.

## Related

- [#7](https://github.com/Xaidel/pharmassist/issues/7) — PRD map; #16 is its OCR decision ticket
- [#15](https://github.com/Xaidel/pharmassist/issues/15) — assemble the v1 PRD; the gate must appear in its scan and privacy sections
- [#16](https://github.com/Xaidel/pharmassist/issues/16) — OCR data-flow and legal-risk decision
- [#17](https://github.com/Xaidel/pharmassist/issues/17) — POC map; the mock scan and the `POST /api/scan` seam
- [#28](https://github.com/Xaidel/pharmassist/issues/28) — POC scan implementation
- [`scan-provider-port`](../architecture/2026-10-23-scan-provider-port.md) — the provider-neutral adapter decision this gate protects
- [Research 01](../../../research/01-ph-regulatory-constraints.md) — Philippine regulatory constraints and the DPA analysis
- [Research 04](../../../research/04-ocr-feasibility.md) — OCR feasibility, the test plan, and the no-retention proxy recommendation
- [PRD](../../../PRD.md) — scan requirements in §5.2 and §6.2, privacy in §6.6
- [POC data contract](../../../poc/data-contract.md) — `POST /api/scan` in §7.10 and the OCR swap point in §9
