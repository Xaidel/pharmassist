# ADR: Rank MDRP-Compliant Results Before Above-Ceiling Results

Type: project
Status: accepted
Classification: architecture

## Problem

The PRD and the POC data contract currently treat the MDRP flag and the price ranking as independent rules. [PRD §8](../../../PRD.md) ranks complete baskets by total shelf price ascending and, separately, flags any MDRP item whose observed price exceeds the ceiling. FR-25 highlights the cheapest complete option. [POC data contract §4.5–4.6](../../../poc/data-contract.md) repeats the same split: ranking is total shelf price ascending, and `above_mdrp_flag` is a display field.

[Research 15](../../../research/15-mdpr-ra11967-local-ordinances.md) recommends the opposite: flag an above-ceiling price and never rank it as a valid low price. The current behavior can present a possibly unlawful price as the best option, which is a direct trust risk for a product whose promise is honest price information.

The problem is concrete in the seeded POC. POC-016 (Janumet, metformin + sitagliptin 500 mg + 50 mg) has nine price records and every one is above the published ₱30.31/tablet ceiling. Generika LCC CBD2 at ₱32.14/tablet is currently the cheapest result and would carry the "Cheapest complete" badge. In a multi-item basket, a pharmacy with one above-ceiling item can also outrank a fully compliant pharmacy when its other items are cheaper.

The VAT basis is part of the same problem. The [EO 104 Annex A](https://www.officialgazette.gov.ph/downloads/2020/02feb/20200217-EO-104-RRD.pdf) footnote says prices are VAT-inclusive by default, and marks asterisked MRPs as VAT-exclusive; row 44 (`EO104-044`) carries that asterisk. The [EO 155 Annex A](https://www.officialgazette.gov.ph/downloads/2021/12dec/20211207-EO-155-RRD.pdf) instead makes its MRPs VAT-inclusive except for VAT-exempt medicines. Metformin + sitagliptin 50 mg/500 mg film-coated tablet is on the [FDA/BIR VAT-exempt list](https://www.fda.gov.ph/wp-content/uploads/2026/02/FDA-ADVISORY-NO.2026-0065-ANNEX.pdf), so no 12% gross-up applies to POC-016 and ₱30.31 remains the operative ceiling. A general rule is still needed for VATable products with an asterisked ceiling, or the flag itself will be wrong for those products and compliant pharmacies could be publicly marked as overcharging.

The decision question is: when a complete result contains an above-ceiling MDRP price, how should it rank, may it be called cheapest, what should the patient be told, and how should a VAT-exclusive ceiling be compared with a VAT-inclusive shelf price? The originating decision ticket is [#37](https://github.com/Xaidel/pharmassist/issues/37).

## Decision

We gate the cheapest claim and the complete-basket ranking on MDRP compliance.

- Complete results split into two tiers: a complete basket with no above-ceiling item ranks before every complete basket with one. Within each tier the existing order applies: total shelf price ascending, then distance, most recent verification, and pharmacy name.
- The "Cheapest complete" highlight goes only to the first result in the compliant tier. If no complete result is compliant, no result is highlighted. An above-ceiling result is never labelled "cheapest".
- Above-ceiling results remain visible in a separate group rather than being excluded, so the all-above case still shows every option. They are labelled "Above MDRP ceiling" and keep the report action. Incomplete and no-price groups keep their current treatment.
- The MDRP flag stays a data-quality signal, not an adjudication. Copy uses "Above MDRP ceiling" and "verify at the pharmacy", keeps the report action, and avoids "overcharging", "illegal", "violation", and any red-strip mimicry.
- VAT normalization is part of the ceiling comparison. A VAT-inclusive MRP is compared directly. A VAT-exclusive MRP is compared at 1.12 × MRP, rounded to the nearest centavo, when the product is VATable, and directly when the product is VAT-exempt. The comparison exposes whether the ceiling is VAT-exclusive. POC-016 remains a direct comparison at ₱30.31, so it stays flagged: nine price records, all above ₱30.31/tablet, with Generika at ₱32.14 no longer highlighted.
- The rule governs the PRD ranking and MDRP requirements in FR-25, FR-39, and §8, the POC data contract in §4.5–4.6, the results API, the results UI, and their tests. This record does not by itself authorize implementation; [#46](https://github.com/Xaidel/pharmassist/issues/46) owns the change.

## Alternatives considered

**Keep the status quo.** Ranking by total and flagging above-ceiling prices is simple and already implemented. It preserves the absolute lowest observed price as the headline. It also endorses a possibly unlawful price, contradicts research 15, and leaves the all-above seed case highlighting Generika. It is rejected for the trust and compliance risk.

**Exclude above-ceiling results from the ranking.** Exclusion is the strongest reading of "never rank it as a valid low price". It hides options that may be the only ones available, and it fails when every pharmacy is above the ceiling, which is exactly the seeded POC-016 case. A fallback would be needed for that case anyway. It is rejected in favour of demotion.

**Demote above-ceiling baskets but keep the overall cheapest highlight.** This fixes the ordering while preserving the familiar "cheapest" badge on the lowest total. It is internally inconsistent: the badge would still endorse a result the ranking deliberately placed below a compliant one. It is rejected.

**Compare VAT-inclusive shelf prices to the published ceiling without normalization.** This is conservative and never under-flags. It over-flags VATable products with an asterisked VAT-exclusive ceiling and can publicly mark a compliant pharmacy as above the ceiling. It is rejected for the false-accusation risk.

**Defer the general VAT rule and fix only POC-016.** POC-016 happens to be VAT-exempt, so the current flag is correct by accident. Every other asterisked ceiling would still be compared on the wrong basis. It is rejected because the rule is cheap to state now and expensive to discover after the pilot data is collected.

## Consequences

- Compliance now governs the headline claim: the product no longer presents a possibly unlawful price as the best option, and above-ceiling options stay visible rather than being hidden.
- A patient may pay more by following the compliant tier. The product chooses legal compliance and trust over the absolute lowest observed price, and the above-ceiling results remain visible so the patient can still see them.
- The above-ceiling flag is derived from collected data and can be wrong. Demoting on an unverified flag penalizes a pharmacy and may steer a patient away from a lawful price. The verify/report copy, correction SLA, and neutral wording limit the harm; the product must not call the price illegal.
- VAT-exempt status varies by product and can change. A missing or stale status makes the effective ceiling wrong. The comparison must expose the basis and default to the published ceiling when status is unknown.
- The POC seed has only one MDRP product, all of whose prices are above the ceiling. The mixed and VATable cases need synthetic fixtures rather than reliance on seed data.
- The PRD's FR-25, FR-39, and §8 and the POC data contract's §4.5–4.6 must be updated to state the same rule. [#46](https://github.com/Xaidel/pharmassist/issues/46) owns those updates and the implementation.

## Testing

- Review confirms the record's path, status, skeleton, and links with the repository check, `check_adr.py docs/adr`.
- [#46](https://github.com/Xaidel/pharmassist/issues/46) adds results unit tests covering the all-above case, the mixed case, and both VAT cases; until they land, the ranking and copy rules are review-enforced against this record.
- [#46](https://github.com/Xaidel/pharmassist/issues/46) adds browser acceptance coverage for the visible grouping and the absence of a cheapest label in the all-above POC-016 case.
- Review confirms the PRD and the POC data contract describe the same tiering, gated highlight, neutral flag copy, and VAT rule before [#46](https://github.com/Xaidel/pharmassist/issues/46) closes.

## Related

- [#37](https://github.com/Xaidel/pharmassist/issues/37) — originating decision ticket
- [#46](https://github.com/Xaidel/pharmassist/issues/46) — POC implementation follow-up
- [PR #47](https://github.com/Xaidel/pharmassist/pull/47) — acceptance pull request
- [PRD](../../../PRD.md)
- [POC data contract](../../../poc/data-contract.md)
- [Research 15](../../../research/15-mdpr-ra11967-local-ordinances.md)
