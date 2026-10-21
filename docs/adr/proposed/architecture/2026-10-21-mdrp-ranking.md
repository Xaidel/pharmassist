# ADR: Rank MDRP-Compliant Results Before Above-Ceiling Results

Type: project
Status: proposed
Classification: architecture

## Problem

The PRD and the POC data contract currently treat the MDRP flag and the price ranking as independent rules. [PRD §8](../../../PRD.md) ranks complete baskets by total shelf price ascending and, separately, flags any MDRP item whose observed price exceeds the ceiling. FR-25 highlights the cheapest complete option. [POC data contract §4.5–4.6](../../../poc/data-contract.md) repeats the same split: ranking is total shelf price ascending, and `above_mdrp_flag` is a display field.

[Research 15](../../../research/15-mdpr-ra11967-local-ordinances.md) recommends the opposite: flag an above-ceiling price and never rank it as a valid low price. The current behavior can present a possibly unlawful price as the best option, which is a direct trust risk for a product whose promise is honest price information.

The problem is concrete in the seeded POC. POC-016 (Janumet, metformin + sitagliptin 500 mg + 50 mg) has nine price records and every one is above the published ₱30.31/tablet ceiling. Generika LCC CBD2 at ₱32.14/tablet is currently the cheapest result and would carry the "Cheapest complete" badge. In a multi-item basket, a pharmacy with one above-ceiling item can also outrank a fully compliant pharmacy when its other items are cheaper.

The VAT basis is part of the same problem. The [EO 104 Annex A](https://www.officialgazette.gov.ph/downloads/2020/02feb/20200217-EO-104-RRD.pdf) footnote says prices are VAT-inclusive by default, and marks asterisked MRPs as VAT-exclusive; row 44 (`EO104-044`) carries that asterisk. The [EO 155 Annex A](https://www.officialgazette.gov.ph/downloads/2021/12dec/20211207-EO-155-RRD.pdf) instead makes its MRPs VAT-inclusive except for VAT-exempt medicines. Metformin + sitagliptin 50 mg/500 mg film-coated tablet is on the [FDA/BIR VAT-exempt list](https://www.fda.gov.ph/wp-content/uploads/2026/02/FDA-ADVISORY-NO.2026-0065-ANNEX.pdf), so no 12% gross-up applies to POC-016 and ₱30.31 remains the operative ceiling. A general rule is still needed for VATable products with an asterisked ceiling, or the flag itself will be wrong for those products and compliant pharmacies could be publicly marked as overcharging.

The decision question is: when a complete result contains an above-ceiling MDRP price, how should it rank, may it be called cheapest, what should the patient be told, and how should a VAT-exclusive ceiling be compared with a VAT-inclusive shelf price? The originating decision ticket is [#37](https://github.com/Xaidel/pharmassist/issues/37).

## Proposal

If accepted, we will gate the cheapest claim and the complete-basket ranking on MDRP compliance.

- Complete results split into two tiers: results with no above-ceiling item rank before any result with one. Within each tier, the existing order applies: total shelf price ascending, then distance, most recent verification, and pharmacy name.
- The "Cheapest complete" highlight goes only to the first result in the compliant tier. If no complete result is compliant, no result is highlighted. An above-ceiling result is never labelled "cheapest".
- Above-ceiling results remain visible in a separate group rather than being excluded, so the all-above case still shows every option. Incomplete and no-price groups keep their current treatment.
- The MDRP flag stays a data-quality signal, not an adjudication. Copy uses "Above MDRP ceiling" and "verify at the pharmacy", keeps the report action, and avoids "overcharging", "illegal", "violation", and any red-strip mimicry.
- VAT normalization becomes part of the ceiling comparison. A VAT-inclusive MRP is compared directly. A VAT-exclusive MRP is compared at 1.12 × MRP, rounded to the nearest centavo, when the product is VATable, and directly when the product is VAT-exempt. The comparison exposes whether the ceiling is VAT-exclusive. POC-016 remains a direct comparison at ₱30.31.
- The rule applies to the PRD ranking and MDRP requirements, the POC data contract, the results API, the results UI, and their tests. This record does not by itself authorize implementation; follow-up tickets own the change.

## Alternatives considered

**Keep the status quo.** Ranking by total and flagging above-ceiling prices is simple and already implemented. It preserves the absolute lowest observed price as the headline. It also endorses a possibly unlawful price, contradicts research 15, and leaves the all-above seed case highlighting Generika. It is rejected for the trust and compliance risk.

**Exclude above-ceiling results from the ranking.** Exclusion is the strongest reading of "never rank it as a valid low price". It hides options that may be the only ones available, and it fails when every pharmacy is above the ceiling, which is exactly the seeded POC-016 case. A fallback would be needed for that case anyway. It is rejected in favour of demotion.

**Demote above-ceiling baskets but keep the overall cheapest highlight.** This fixes the ordering while preserving the familiar "cheapest" badge on the lowest total. It is internally inconsistent: the badge would still endorse a result the ranking deliberately placed below a compliant one. It is rejected.

**Compare VAT-inclusive shelf prices to the published ceiling without normalization.** This is conservative and never under-flags. It over-flags VATable products with an asterisked VAT-exclusive ceiling and can publicly mark a compliant pharmacy as above the ceiling. It is rejected for the false-accusation risk.

**Defer the general VAT rule and fix only POC-016.** POC-016 happens to be VAT-exempt, so the current flag is correct by accident. Every other asterisked ceiling would still be compared on the wrong basis. It is rejected because the rule is cheap to state now and expensive to discover after the pilot data is collected.

## Acceptance criteria

- A complete basket with no above-ceiling item ranks before every complete basket with one, and the existing tie-breakers still apply within each tier.
- "Cheapest complete" appears only on the first compliant complete result; when every complete result is above the ceiling, no result carries the highlight.
- Above-ceiling results remain visible, are labelled "Above MDRP ceiling", are never labelled "cheapest", and use the neutral copy and report action.
- POC-016 remains flagged: nine price records, all above ₱30.31/tablet, with Generika at ₱32.14 no longer highlighted.
- The data contract states both VAT cases and the tests cover them: a VAT-exempt product compares directly, and a VATable product with a VAT-exclusive ceiling compares at 1.12 × MRP.
- The PRD's FR-25, FR-39, and §8, and the POC data contract's §4.5–4.6, describe the same rule.
- Results unit tests cover the all-above case, the mixed case, and both VAT cases; the browser acceptance test covers the visible grouping and the absence of a cheapest label in the all-above case.

## Risks

- The above-ceiling flag is derived from collected data and can be wrong. Demoting on an unverified flag penalizes a pharmacy and may steer a patient away from a lawful price. The verify/report copy, correction SLA, and neutral wording limit the harm; the product must not call the price illegal.
- A patient may pay more by following the compliant tier. The product is choosing legal compliance and trust over the absolute lowest observed price, and the above-ceiling results stay visible so the patient can still see them.
- VAT-exempt status varies by product and can change. A missing or stale status makes the effective ceiling wrong. The comparison must expose the basis and default to the published ceiling when status is unknown.
- The POC seed has only one MDRP product, all of whose prices are above the ceiling. The mixed and VATable cases need synthetic fixtures rather than relying on seed data.
- This record is proposed. The repository's ADR process moves it to accepted through pull-request review; implementation should follow that acceptance and the owning PRD/data-contract updates.
