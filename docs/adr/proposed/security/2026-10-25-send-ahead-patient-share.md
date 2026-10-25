# ADR: Route Send-Ahead Reservations Through The Patient's SMS

Type: project
Status: proposed
Classification: security

## Problem

A send-ahead reservation only earns its value — pre-bagging that cuts queue wait — when the pharmacy sees the list before the patient arrives, not when they walk in.
The POC has no pharmacy-side surface and no authentication, so the pharmacy cannot be given an in-app read-back view without building identity and onboarding the POC deliberately lacks.

The decision question is how the pharmacy receives the reservation list in the POC, and over which single channel, given there is no dashboard and no public API, and the list is sensitive personal information that must not sit behind a public, unauthenticated URL.

## Proposal

If accepted, the POC routes the reservation to the pharmacy through the patient's own SMS app, over SMS as the one channel, with no read-back surface in the app.

- The confirmation screen composes a plain-text reservation message — the reference code, the pharmacy, the item list with base-unit quantities, and the expiry — and opens the patient's SMS app through an `sms:` deep link, pre-filled with the pharmacy's mobile number and the message. The patient taps send.
- SMS is the single channel; there is no multi-app share sheet and no Messenger or WhatsApp delivery. The patient is the courier of their own list; the app never contacts the pharmacy directly.
- The reservation needs a per-pharmacy SMS-able mobile number. Where a pharmacy has no mobile number — only a landline or nothing — the app shows a warning instead of the send action; the reservation can still be created, but it is not delivered by SMS.
- The POC exposes no read-back endpoint and no Caddy basic-auth exemption. The server record and its code resolve via SQL, the same as reports, as recorded in [`send-ahead-persistence`](2026-10-25-send-ahead-persistence.md).
- Sending is the primary action on the slip, so the value is delivered only when the patient sends ahead of arrival.

## Alternatives considered

**Pharmacy-exclusive dashboard.**
A dedicated, access-controlled, per-pharmacy view is the intended eventual destination: pharmacy staff can see and act on reservations without the patient, and access is enforced per pharmacy rather than left to whoever holds a link.
It is deferred — not rejected — because it needs authentication, pharmacy onboarding, and a product and technical design the POC deliberately does not have; the patient-SMS mechanism is the stopgap until it lands.

**Pharmassist sends the SMS through a gateway.**
The app could deliver the reservation itself over an SMS provider, which is automatic and needs no patient action or cost, but it requires a gateway vendor and its cost, and would be mocked in the POC since no gateway is wired up; the pharmacy could also not reply to the patient.
It is deferred to the pilot, alongside the dashboard.

**Multi-channel share sheet (Messenger, SMS, WhatsApp).**
A generic share sheet reaches more channels but splits the flow across apps the patient may or may not use and makes the message format and delivery inconsistent.
It is rejected in favour of SMS as the single, consolidated channel.

**Public, unauthenticated code page.**
A `GET /r/<code>` page is the cheapest read-back and needs no accounts, but it makes a reservation readable by anyone who holds the link, and an unguessable code is a weak, non-revocable control for health data.
It is rejected.

**Patient shows the slip at the counter only.**
The patient could simply display the slip on arrival, but then the pharmacy sees the list when the patient is already waiting, which is exactly the wait the feature exists to remove.
It is rejected for not delivering pre-bagging.

## Acceptance criteria

- The confirmation screen offers a "Send via SMS" action that opens the SMS app pre-filled with the pharmacy's mobile number and the reservation message; there is no multi-app share sheet, and no Messenger or WhatsApp delivery.
- A pharmacy with no SMS-able mobile number shows a warning instead of the send action, and the reservation can still be created.
- The data contract carries a per-pharmacy SMS-able `mobile` number; the seed backfills it for pharmacies that have one and leaves it null where only a landline or no number exists.
- No read-back endpoint or Caddy basic-auth exemption exists in the POC; the reservation record and its code resolve via SQL only, as recorded in [`send-ahead-persistence`](2026-10-25-send-ahead-persistence.md).
- A pharmacy dashboard, when built, is a separate effort with its own design and is not added to the POC silently.

## Risks

- The reservation list transits the patient's SMS carrier, which the app does not control. This is acceptable for the POC's seeded-data demo and must be revisited before real patient data flows through it.
- SMS costs the patient, and a patient may skip the send to save the few centavos; the send action must be one tap and the message pre-filled so the friction is minimal.
- Delivery depends on the patient actually sending; if they do not, the pharmacy never sees the reservation. The slip must make sending the primary, obvious action.
- A landline-only or phone-less pharmacy cannot receive an SMS, so the warning path must not read as a broken feature; it explains that the reservation is recorded but not delivered.
- Deferring the dashboard risks the send-ahead staying a demo behavior; the pilot plan must carry the dashboard as a named item or the pre-bagging value never materializes at scale.
