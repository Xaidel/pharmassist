# ADR: Persist Send-Ahead Reservation Records Server-Side

Type: project
Status: proposed
Classification: security

## Problem

The POC wants a send-ahead reservation: a patient picks a pharmacy and sends their list ahead so the pharmacy can pre-bag it, cutting peak-hour queue wait for small purchases.
This is an advisory pre-bagging handoff, not a stock hold, a purchase, or a payment, so it stays transaction-free and outside the RA 11967 e-marketplace trigger that [PRD §6.9 FR-57](../../PRD.md) reserves for real transactions.

A meaningful send-ahead needs a durable record the pharmacy can resolve later.
But the product's privacy baseline forbids that: [PRD §6.6 FR-42](../../PRD.md) says prescription contents are never stored server-side, and [decision #1 of the POC data contract](../../poc/data-contract.md) makes the list a client-only value object, sent to the server only inside request bodies, so the server is stateless for lists.

A list derived from a prescription is sensitive personal information under RA 10173, so persisting it is a privacy-posture change, not just a new table.
The decision question is whether the POC may persist a send-ahead record that contains the list, and if so, how that persistence is bounded so the client-only-list posture stays intact everywhere else.

## Proposal

If accepted, the POC will persist send-ahead reservations server-side, deliberately narrowing the client-only-list rule to this one path.

- A `send_ahead` record stores a reference code, a pharmacy snapshot, a list snapshot (medicine identifiers, labels, and base-unit quantities), a status, and `created_at`.
- The record is treated as sensitive personal information. It stores the list and its code, and no patient identity or contact data: no name, phone, or account identifier. It is keyed only by its reference code.
- The record is never seeded, carries no foreign key to seeded rows, and survives a seed wipe, following the snapshot pattern already used by `price_report`.
- The record is created only by an explicit user action. The patient's confirmation screen renders the slip from the list still held on the device; the server returns the reference code and the stored status. The slip offers a "Send via SMS" action that composes a plain-text reservation message (code, pharmacy, items, quantities, expiry) and opens the patient's SMS app, so the patient sends the list to the pharmacy ahead of arrival.
- The POC adds no public read-back surface: no endpoint is exempted from Caddy basic auth, and the code resolves via SQL in the POC, the same way reports are inspected today. A live pharmacy-side lookup is deferred; how the list reaches the pharmacy is recorded in [`send-ahead-patient-share`](2026-10-25-send-ahead-patient-share.md) and is not part of this decision.
- The list remains client-only on every other path. Only the send-ahead record persists list contents.
- Field-level details — the exact column set, the retention window, expiry, and the status lifecycle — are owned by the implementing technical design and ticket, not by this record.

## Alternatives considered

**Keep the send-ahead client-side only, as a pickup slip.**
No persistence, fully consistent with FR-42 and decision #1, and implementable in one slice.
It is rejected because a reservation that vanishes when the tab closes is not durable enough for a pharmacy to resolve a code later; the server-side record is the point of the feature.

**Persist server-side and add a public code-lookup endpoint.**
This is the most real — a pharmacy can open the reservation without credentials — but it creates the POC's first public surface and requires exempting a path from Caddy basic auth, which the demo does not exercise.
It is rejected; the POC uses the patient-share mechanism in [`send-ahead-patient-share`](2026-10-25-send-ahead-patient-share.md), and the pharmacy dashboard is its deferred alternative.

**Persist server-side and add a lookup endpoint behind basic auth.**
This works only for a holder of the shared POC credential, so it is a fancier SQL inspection rather than a usable pharmacy read-back.
It is rejected as surface without value.

**Keep the whole product client-only and drop the reservation.**
This preserves the strongest privacy posture but removes the capability the patient-facing loop is being extended to demonstrate.
It is rejected because the send-ahead is the intended new capability.

## Acceptance criteria

- `docs/PRD.md` FR-42 and the POC data contract record that the list stays client-only except for an explicit send-ahead reservation record, and link to this record.
- The POC data contract specifies the `send_ahead` schema: a reference code, a pharmacy snapshot, a list snapshot, a status, and `created_at`, with no patient identity or contact fields, never seeded, no foreign key to seeded rows, and surviving a seed wipe.
- The send-ahead record is created only by an explicit user action and stores no name, phone, or account identifier.
- The POC exposes no public or basic-auth lookup endpoint for send-ahead records; the code resolves via SQL, the same as reports.
- The confirmation screen renders the slip from the on-device list with a "Send via SMS" action that composes a plain-text reservation message, and the server returns the reference code and the stored status.

## Risks

- Persisting prescription contents means a database compromise now exposes health data that the client-only design previously kept off the server.
  Mitigation is minimalism — a code and a list snapshot, no identity or contact data — plus short retention (to be set in the design), and no public read-back surface in the POC.
- The narrowing of FR-42 could be misread as a general relaxation of the client-only-list rule.
  This record states the exception is exactly the send-ahead path and no other.
- A retention and expiry policy left unspecified until the design lands risks holding sensitive data longer than necessary.
  The design must set a retention window and a deletion path before the slice is accepted.
- Reversibility: the record and table are deletable before the pilot, but once real patients use it in the pilot the privacy-posture change is real and must be reflected in the pilot's DPIA and privacy notice.
