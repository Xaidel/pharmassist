# Application Specification Governance

This directory owns product requirements and implementation designs for the current application. Reusable architecture guidance lives under `template_docs/`, remains subordinate to `AGENTS.md`, and informs technical designs.

## POC Sources

The normative product and technical sources live alongside this directory, because the POC is one effort across the app, the seed tooling, and the deployment:

- [`../PRD.md`](../PRD.md) — product requirements, vision.
- [`../poc/data-contract.md`](../poc/data-contract.md) — schema, seed/wipe, HTTP API, privacy, and OCR swap contract.

The POC map on the issue tracker authorizes build slices. A specification in this directory is created only when a slice needs a design the root contract does not own.

## Delivery Sequence

```text
Product sources (Vision)
    -> focused feature or foundational-release PRD (Normative)
    -> complete or phased technical design (Normative)
    -> implementation and acceptance evidence
```

A product source supplies direction but does not authorize implementation. A focused PRD owns bounded product behavior. A technical design owns implementation structure and acceptance for its slice.

## Status

| Status        | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `Vision`      | Directional product source with no implementation authority |
| `Proposed`    | Under review and not authoritative                          |
| `Normative`   | Approved authority for the document's subject               |
| `Implemented` | Normative scope has accepted implementation evidence        |
| `Deferred`    | Valid scope intentionally postponed                         |
| `Withdrawn`   | Removed from consideration                                  |
| `Superseded`  | Replaced by a named document                                |

## Package Layout

Every specification package has an owning README that records status, reading order, source precedence, dependencies, and progress. Only this governance file is loose under `docs/specs/`.

Use one complete `technical-design.md` for a coherent capability. Create `phase-N/` only for genuine predecessor relationships, independently verifiable outcomes, substantial migration or rollout risk, or separate handoffs. Phases must not merely mirror routes, components, functions, and server modules.

Significant features and architecture changes require normative focused requirements and a normative design. Routine fixes and isolated maintenance may use ordinary issue and review flow when current contracts already authorize the behavior.
