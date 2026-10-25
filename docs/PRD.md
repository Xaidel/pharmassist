# Pharmassist — Product Requirements Document

**Version:** 0.2 (research-integrated baseline)
**Status:** Draft — open decisions are tracked in `https://github.com/Xaidel/pharmassist/issues/7`; v1.0 is produced by issue #15.
**Last updated:** 2026-10-21
**Owner:** Karl
**Pilot market:** Naga City, Camarines Sur, Philippines

## 1. Summary

Pharmassist is a mobile-first medicine price and availability map. A patient searches for a medicine — or scans a prescription — and sees which nearby pharmacies have it, what it costs, and which single pharmacy is cheapest for the whole list. v1 is a seeded-data, information-only pilot in Naga City that tests whether patients will use and trust the loop before real data operations and pharmacy partnerships are built. It does not sell or deliver medicines and reserves nothing; it may forward a list ahead for pre-bagging (an advisory send-ahead).

## 2. Problem

Patients in Naga City pay out of pocket for medicines and have no reliable way to know, before traveling, which nearby pharmacy has the medicine in stock or at the lowest total price. Prices vary by pharmacy and pack; prescriptions can contain several medicines; asking by phone or walking between drugstores costs time and fare.

The current market is single-seller, not comparison-first. Watsons, Generika, MedsGo, and MedExpress publish only their own prices; Mercury Drug publishes no online prices. Naga has chain stores but no confirmed same-day pharmacy delivery. No product answers "where in Naga is my full list cheapest and in stock right now?" before the patient orders, uploads a prescription, or creates an account.

## 3. Goals and non-goals

### 3.1 Goals (v1 pilot)

- Let a patient find an exact medicine by brand or generic name.
- Let a patient scan a prescription and confirm the extracted items, where OCR passes its accuracy and legal gates.
- Rank pharmacies by the total shelf price of the complete list at one pharmacy.
- Show results on a map with price-labeled pins and a sorted list.
- Make data freshness, MDRP ceilings, and uncertainty visible.
- Validate patient demand and trust with seeded data before investing in data operations.
- Operate within Philippine regulatory and privacy constraints from day one.

### 3.2 Non-goals (v1)

- Clinical advice, dosage guidance, diagnosis, or treatment recommendations.
- Patient accounts, refill reminders, delivery, telehealth, or pharmacy dashboards. These are captured in the post-v1 roadmap.
- Splitting a list across multiple pharmacies.
- Real-time stock, crowdsourcing, or self-serve pharmacy updates.
- Native iOS/Android apps.
- Paid marketing.
- Expansion beyond Naga City.
- Any cart, order, payment, or delivery transaction, or any reservation that holds or guarantees stock.
- Any computed senior-citizen or PWD net price. Shelf prices are shown; statutory discounts are disclosed.
- Turn-by-turn navigation, live re-routing, traffic-aware travel estimates, or voice guidance. Directions are an indicative route preview inside the embedded map.

## 4. Users

### 4.1 Primary user

An out-of-pocket patient in Naga City, often buying for themselves or a family member. They may hold a paper prescription or want an over-the-counter medicine. They use a low- to mid-range Android phone and mobile data, are price-sensitive, and are often time-constrained. They need a fast answer: "Where do I go, and how much will it cost?"

### 4.2 Market context

- Naga City had 209,170 residents across 27 barangays (PSA 2020 census).
- About 17,976 residents are aged 60+ (8.6%), and 7,000+ are registered PWDs (3.3%). Discount eligibility is a first-class concern.
- Out-of-pocket payment was 44.36% of current health expenditure in 2023; medicines historically accounted for about 46% of medical out-of-pocket spending (55% for poorer households).
- The pharmacy market is chain-heavy but not chain-only: about 38 official-locator chain branches (South Star 21, Mercury 10, Generika 4, Watsons 3, plus at least one TGP branch) and an estimated 60–100 independent outlets.
- Mobile reach is sufficient for a PWA: 67.3% internet use and 115.3 mobile subscriptions per 100 people in 2024. E-commerce is shallow (8.8% online purchase rate in 2019), so an assisted/offline path matters.

### 4.3 Secondary users

- **Pharmacy staff:** the source of price and stock data, and the eventual payer. v1 needs their cooperation for seed data, even without a formal partnership.
- **Public health centers / LGU:** a trusted distribution channel and a possible data source; shown separately from retail pharmacies because of eligibility, queue, and subsidy differences.
- **Clinic staff and doctors:** a distribution channel through QR cards handed out with prescriptions.

## 5. Core user journeys

### 5.1 Search for a medicine

1. The user opens the PWA from a QR card, link, or Facebook post.
2. They type a brand or generic name; autocomplete suggests matches.
3. They select the exact product (brand or generic, strength, form, pack).
4. They see a map-first results screen: pins labeled with the relevant shelf price, the cheapest complete option highlighted, and a bottom list sorted by total.
5. They tap a pin or list item for pharmacy details, stock, distance, hours, phone, and last-verified date.
6. They tap **Show route** to draw the road route from their current location to the pharmacy in the embedded map, with distance and estimated travel time.
7. If the item is under MDRP, the result shows the ceiling separately and flags any observed price above it.

### 5.2 Scan a prescription

1. The user taps **Scan prescription** and sees a clear consent notice explaining what is processed, where, and that the image is not stored.
2. They take a photo.
3. OCR suggests medicine names; the user reviews and confirms or edits each item. Manual search is the fallback.
4. The confirmed items form a list.
5. The app ranks pharmacies that have the complete list, cheapest total first.
6. If no pharmacy has everything, the app shows closest-to-complete options separately, with missing items listed. It never auto-splits the list.
7. If OCR is unavailable or fails, the scan path collapses to manual search without penalty.

The OCR data-flow choice (cloud stateless proxy versus on-device only) is unresolved in issue #16. The launch gate is in section 6.2.

### 5.3 Report a wrong price or stock

1. From a result, the user taps **Report wrong price or stock**.
2. They select a reason and optionally add a note.
3. The report is recorded for the data operator; the result shows a reported state.
4. Triage SLA and correction workflow are defined in issue #10.

## 6. Functional requirements

### 6.1 Search and catalog

- **FR-1:** Search by brand name or generic name.
- **FR-2:** Autocomplete with tolerance for common misspellings.
- **FR-3:** Results are exact products: same brand or generic identity, strength, form, and pack size. No cross-strength or cross-form ranking.
- **FR-4:** Candidate generic alternatives appear separately and are never mixed into the exact-product ranking. They are derived from INN plus strength and form, require pharmacist review, and are labeled "candidate generic alternatives," not therapeutic equivalents.
- **FR-5:** Symptom-based search is not supported in v1.
- **FR-6:** The pilot catalog is 50 medicines, anchored to the Philippine National Formulary and the PhilHealth Konsulta list (32 of 50 overlap). The final list is set in issue #10.
- **FR-7:** Only FDA-registered products are listable. Each medicine carries an FDA registration reference that can be checked against the FDA Verification Portal; unregistered or withdrawn products are purged on discovery.
- **FR-8:** Prescription (Rx) and over-the-counter (OTC) products are visually distinct. There is no persuasive marketing, efficacy or safety claim, "best medicine" language, or deal language on Rx items.

### 6.2 Prescription scan

- **FR-9:** Photo capture from the device camera or an upload.
- **FR-10:** Explicit, specific consent notice before camera or OCR. No scan without consent.
- **FR-11:** OCR suggests medicine names; every item must be confirmed or edited by the user before ranking. No auto-add.
- **FR-12:** If OCR is unavailable or fails, the user can add items manually.
- **FR-13:** No server-side prescription storage, no OCR-text storage, and no secondary use. Patient identifiers are stripped or ignored; the list is session-only and deleted on session end.
- **FR-14:** If cloud OCR is used, it must run through a stateless, non-logging proxy with processor terms, a DPIA, and client-side deletion immediately after extraction. If on-device OCR is used, no image leaves the device. Ticket 14 chooses the route.
- **FR-15:** No pharmacist review of scans in v1.
- **FR-16:** The app does not interpret dosage or sig codes; it only captures product names.
- **FR-17:** OCR launch gate: test 120 de-identified prescriptions (300+ items). Proceed if top-3 medicine-name recall is at least 70% and dangerous top-1 error is at most 2%. Drop OCR from v1 if top-3 recall is below 50%.

### 6.3 List comparison

- **FR-18:** A list is one or more confirmed medicines.
- **FR-19:** v1 ranks single pharmacies by the total shelf price of the complete list.
- **FR-20:** No splitting across pharmacies in v1.
- **FR-21:** If no pharmacy has the complete list, show closest-to-complete options separately, listing the missing items.
- **FR-22:** The list total uses exact pack shelf prices. Pack-size normalization rules are defined in the data model.
- **FR-23:** A list is complete only when every item has a verified price and stock record at one pharmacy.

### 6.4 Map and results

- **FR-24:** Map-first results with pharmacy pins labeled with the relevant shelf price.
- **FR-25:** The cheapest MDRP-compliant complete option is visually highlighted. A complete list with an item above the ceiling is never highlighted as cheapest.
- **FR-26:** A sorted, swipeable bottom list mirrors the map.
- **FR-27:** Each result shows distance, open-now status, last-verified date, and stock status.
- **FR-28:** The pharmacy detail sheet shows name, address, hours, phone, stock list, price breakdown, last verified, and directions.
- **FR-29:** Directions render the road route from the user's current location to the pharmacy inside the embedded map, with distance and estimated travel time. The POC does not hand off to an external maps app and does not provide turn-by-turn guidance. See the [native pharmacy directions ADR](adr/proposed/architecture/2026-10-21-native-pharmacy-directions.md).
- **FR-30:** Unverified pharmacies may appear muted as "no price data." They are never shown as "unavailable."
- **FR-31:** Default sort is cheapest list; a "nearest first" sort is available.
- **FR-32:** No fare or transport-cost modeling in v1.
- **FR-33:** No implied partnership or endorsement by a pharmacy, the LGU, DOH, or FDA. Public-source attribution is shown where data comes from a public source.

### 6.5 Trust, price display, and MDRP

- **FR-34:** Every price is a "reference shelf price" with currency, pack/strength/form context, pharmacy identity, and a "verified on [date]" label.
- **FR-35:** Prices older than 14 days are flagged as possibly outdated.
- **FR-36:** One-tap **Report wrong price or stock** on every result. Reports gate stale data; the correction workflow has an SLA defined in issue #10.
- **FR-37:** A visible disclaimer says prices are indicative and must be confirmed at the pharmacy.
- **FR-38:** No receipt-photo verification in v1.
- **FR-39:** For MDRP items (EO 104 s. 2020 and EO 155 s. 2021), show the published ceiling and the observed shelf price separately, compare against the effective ceiling, and flag any observed price above it. A VAT-exclusive ceiling is compared at 1.12 times the published amount for VATable products and directly for VAT-exempt products; an unknown VAT status falls back to the published ceiling and is disclosed. Use neutral "Above MDRP ceiling" copy and do not mimic the red-strip product label.
- **FR-40:** Never compute or display a "senior/PWD net price." Disclose that the statutory 20% discount applies at the point of sale and may change the amount paid.

### 6.6 Privacy and clinical boundary

- **FR-41:** No accounts or patient identity in v1.
- **FR-42:** Prescription images are discarded immediately; prescription contents are not stored server-side, except for an explicit send-ahead reservation (FR-60), which stores only a pharmacy snapshot, a list snapshot, and a reference code and expires automatically.
- **FR-43:** Search history stays on-device.
- **FR-44:** No dosage, diagnosis, substitution, or treatment advice. Users are directed to a pharmacist or doctor.
- **FR-45:** Generic-versus-brand statements are descriptive. No therapeutic-equivalence claim without an FDA or formulary basis.
- **FR-46:** Data protection baseline: a designated DPO, NPC processing-system registration, a privacy notice and consent copy aligned to NPC Circular 2023-04, a breach-response playbook per NPC Circular 2016-03, security measures per NPC Circular 2023-06, an AI/OCR risk assessment aligned to NPC Advisory 2024-04, and written processor terms for any OCR or hosting vendor.
- **FR-47:** LGU and City Health Office data: only aggregate or de-identified data in v1. Any patient-level sharing requires a Data Sharing Agreement under DPA IRR Sec. 20(d), NPC Circular 2020-03, and city legal/DPO review.

### 6.7 Platform and performance

- **FR-48:** Mobile-first PWA, installable, usable on low-end Android and slow connections.
- **FR-49:** OCR runs through the route chosen in issue #16. Cloud OCR is stateless and non-logging; on-device OCR uploads nothing.
- **FR-50:** The map and list remain usable on a 3G connection, with graceful loading and empty states.
- **FR-51:** Language and localization are defined in issue #13.

### 6.8 Acquisition surfaces

- **FR-52:** QR cards for partner clinics and doctors that open the PWA.
- **FR-53:** Shareable links for local Facebook community groups.
- **FR-54:** LGU and barangay health worker distribution. Public health centers are shown separately from retail pharmacies.
- **FR-55:** No paid ads in the pilot.

### 6.9 Transaction and compliance boundary

- **FR-56:** v1 has no cart, order, payment, or delivery feature, and no reservation that holds or guarantees stock. The one exception is an advisory send-ahead (FR-60), which forwards the list ahead for pre-bagging and transacts nothing. The counter for Rx items is the pharmacy's licensed pharmacist.
- **FR-57:** Any future ordering, payment, delivery, merchant offers, affiliate checkout, or per-transaction commission is a roadmap gate that triggers RA 11967 and a fresh DPA assessment.
- **FR-58:** The launch requires an FDA/CDRR opinion on presenting neutral Rx price and availability information, plus counsel sign-off. This is a launch gate, not a build task.
- **FR-59:** A Naga Mayor's Permit is required if the operation has a physical outlet or hub in the city. LGU/CHO data goes through a partnership or DSA, not an FOI commercial-purpose request.
- **FR-60:** An advisory send-ahead lets a patient forward their list to a chosen pharmacy to be pre-bagged before arrival, cutting queue wait. It is transaction-free: it does not hold or guarantee stock, takes no payment, and stores no patient identity. The record holds only a pharmacy snapshot, a list snapshot, and a reference code, and expires after 24 hours. In v1 the list reaches the pharmacy through an SMS the patient sends from their own phone; where a pharmacy has no SMS-able mobile number, the app shows a warning instead. A pharmacy-exclusive dashboard for receiving reservations is on the post-v1 roadmap.

## 7. Data model (pilot)

| Entity | Key fields |
|---|---|
| **Medicine** | id, brand_name, generic_name, strength, dosage_form, pack_size, manufacturer, generic_group_id (candidate), fda_registration_no, rx_otc, pnf_status, source |
| **Pharmacy** | id, name, type (chain, independent, public health center), address, barangay, lat/lng, hours, phone, verification_status, data_source |
| **PriceRecord** | medicine_id, pharmacy_id, shelf_price, currency, mdrp_ceiling (optional), above_mdrp_flag, stock_status, verified_at, verified_by, source, notes |
| **List** | items (medicine_id, packs), total_shelf_price, completeness |
| **Report** | result_id, reason, note, created_at, status, resolution |
| **SendAhead** | reference_code, pharmacy_id, pharmacy_name_snapshot, medicine_ids, medicine_labels, quantities, status, expires_at, created_at |

Data rules:

- Exact-product matching uses medicine identity, strength, form, and pack size.
- Pack size is normalized for display only; the ranking uses the actual pack shelf price.
- A list is complete when every item has a verified price and stock record at one pharmacy.
- A price older than 14 days is flagged as possibly outdated.
- Public health centers are stored as a distinct pharmacy type and displayed separately.
- Pharmacy records contain business facts only: no personal data about pharmacists or staff.
- MDRP ceilings are stored separately from observed shelf prices.

## 8. Ranking rules

1. Filter to exact product matches for every list item.
2. Keep pharmacies with verified price data for every item (complete list).
3. Split complete lists into two tiers: lists with no item above its effective MDRP ceiling, and lists with at least one. Every compliant list ranks before every above-ceiling list.
4. Rank within each tier by total shelf price, ascending.
5. Tie-breakers: distance, then most recent verification.
6. Highlight only the cheapest compliant complete option; if no complete list is compliant, highlight none.
7. Show above-ceiling complete lists in a separate group. Never mark them cheapest.
8. Show incomplete lists separately, sorted by fewest missing items, then by known total.
9. Unverified pharmacies are muted and never ranked.
10. Flag any MDRP item whose observed price exceeds the effective ceiling.
11. Never compute senior/PWD net prices.
12. No fare modeling and no sponsored placement in the organic ranking.

## 9. Monetization (post-pilot)

- The v1 pilot is free for patients and pharmacies.
- The intended post-pilot model is a pharmacy subscription for demand analytics and a verified profile, plus clearly labeled sponsored placement.
- There is no pay-to-be-listed and no pay-to-rank. The organic cheapest ranking cannot be bought.
- Price points, inclusions, and contract terms are set in issue #14.
- Adding transactions or commissions reopens RA 11967 and DPA compliance.

## 10. Success metrics

The final metrics and instrumentation are defined in issue #12. Candidate bars from charting, to be confirmed:

- 200+ unique patients over 8 weeks.
- 30% of search or scan sessions ending in a pharmacy selection or directions tap.
- 25% of users returning within four weeks.
- 15% median list saving versus the most expensive in-stock option.
- Fewer than 10% of reported prices are wrong.

## 11. Pilot plan

- **Market:** Naga City, Camarines Sur.
- **Dataset:** 50 medicines across 10 pharmacies, one-time real shelf-price collection, seeded into the app. The starter list is anchored to the Philippine National Formulary and PhilHealth Konsulta; 32 of 50 overlap with Konsulta.
- **Recommended pharmacy mix:** 3 Mercury, 2 South Star, 2 Generika, 1 Watsons, and 2 independents (New Nazareno and Nagadrug), covering downtown, south, east/CBD, north, and a mall. Alternates: Citi Pharma, South Star Naga 13, Mercury J. Miranda. Final mix is set in issue #10.
- **Channels:** Clinic QR cards, local Facebook groups, LGU and barangay health workers.
- **Duration:** Defined in issue #11.
- **Budget and resourcing:** Defined in issue #11.
- **Go/no-go gate:** Defined in issues #11 and #12.

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Rx price/availability presentation is treated as advertising | Keep the presentation factual, visually separate OTC and Rx, make no promotional claims, and obtain an FDA/CDRR opinion before launch (issues #1 and #6) |
| Prices and stock go stale | Visible verification date, 14-day stale flag, user reports, and an explicit "reference shelf price" framing |
| No personal pharmacy access for data | One-time seed collection through a local field collector; public chain prices where available; LGU channel |
| OCR fails on local handwriting | Mandatory user confirmation, manual fallback, and the 120-prescription test gate (issues #4 and #16) |
| Cloud OCR conflicts with the strict privacy design | Stateless non-logging proxy, explicit consent, DPIA, processor terms, or on-device-only fallback (issue #16) |
| MDRP ceiling is misrepresented | Show ceiling and shelf price separately; flag above-ceiling prices; never mimic the red-strip label |
| Transactions accidentally make the product an e-marketplace | Keep v1 information-only; treat ordering, payment, delivery, and commissions as RA 11967 roadmap gates |
| LGU data sharing lacks a lawful basis | Aggregate/de-identified only; DSA and city legal/DPO review for patient-level data |
| Patients do not trust or return | Clinic and LGU trust channels, transparent freshness, no pay-to-rank |
| Pharmacy monetization does not materialize | Validate willingness to pay before building the model (issues #8 and #14) |
| List data is incomplete | Complete lists ranked first; incomplete options shown separately with missing items |
| Chain resistance or price-war dynamics | Keep pharmacy inclusion free and factual; validate partner concerns in issue #8; revisit post-pilot |
| Low-end devices and bandwidth | PWA, lightweight map and list, graceful degradation |
| Native routing is unavailable or low quality | Keep pharmacy detail and prices usable, show a retryable route error, use a replaceable server-side routing adapter, and label the route as a preview; choose a supported provider or self-host before the pilot |

## 13. Open questions

Tracked in `https://github.com/Xaidel/pharmassist/issues/7`; issues #8 to #14 and #16:

- Pharmacy willingness to pay (issue #8)
- LGU data terms (issue #9)
- Dataset and collection plan (issue #10)
- Timeline and budget (issue #11)
- Metrics (issue #12)
- Language and localization (issue #13)
- Monetization mechanics (issue #14)
- OCR data-flow and legal-risk decision (issue #16)

Resolved research is in issues #1 to #6 and their notes under `docs/research/`.

## 14. Glossary

- **Medicine:** a specific product identified by brand or generic name, strength, dosage form, and pack size.
- **Exact product:** the same medicine identity as the searched item; no cross-strength or cross-form substitution.
- **Candidate generic alternative:** a product derived from the same INN plus strength and form, shown separately and requiring pharmacist review. Not a therapeutic-equivalence claim.
- **List:** the set of medicines a patient wants to buy together, usually from one prescription.
- **Complete list:** a pharmacy has verified price and stock data for every item in the list.
- **Incomplete list:** a pharmacy is missing one or more items; shown separately.
- **Reference shelf price:** the observed retail shelf price at a pharmacy, with a verification date and source. Not a computed net price.
- **MDRP:** Maximum Drug Retail Price. Ceilings under EO 104 s. 2020 and EO 155 s. 2021, shown separately from the observed shelf price.
- **Seeded data:** one-time pilot data collected from real pharmacies, not a live feed.
- **Public health center:** an LGU-run facility, shown separately from retail pharmacies because of eligibility, queue, and subsidy differences.
- **Pilot:** the seeded-data Naga City validation, not a production launch.
- **Transaction-free:** no cart, order, payment, or delivery in the product. An advisory send-ahead reservation is permitted and is not a transaction.
- **Send-ahead (advisory reservation):** a patient forwards their list to a chosen pharmacy so it can be pre-bagged before arrival. It holds no stock, takes no payment, and stores no patient identity.

## 15. Post-v1 roadmap

- Patient accounts and saved lists.
- Refill reminders.
- Delivery and online ordering.
- Telehealth and pharmacist consultation.
- Pharmacy-side dashboards and self-serve price and stock updates.
- A pharmacy-exclusive dashboard to receive and manage send-ahead reservations.
- Real-time or crowdsourced stock.
- List splitting across pharmacies.
- Expansion beyond Naga City.
- Native apps if retention justifies them.

Each of delivery, ordering, and paid placement reopens RA 11967 and DPA compliance before it ships.

## 16. Research and references

- 01 Regulatory and legal constraints — `docs/research/01-ph-regulatory-constraints.md`
- 02 Competitive landscape — `docs/research/02-competitive-landscape.md`
- 03 Catalog and generic-equivalence data — `docs/research/03-medicine-catalog-data.md`
- 04 OCR feasibility — `docs/research/04-ocr-feasibility.md`
- 05 Naga City market context — `docs/research/05-naga-market-context.md`
- 15 MDRP, RA 11967, and local ordinances — `docs/research/15-mdpr-ra11967-local-ordinances.md`
