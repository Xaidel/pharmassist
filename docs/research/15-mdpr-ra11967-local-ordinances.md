# Research 15 — MDRP status, RA 11967 coverage, and Naga/Camarines Sur local rules

- Ticket: `https://github.com/Xaidel/pharmassist/issues/6`
- Date: 2026-10-19
- Scope: the four remaining legal uncertainties from issue #1 — (1) the current Maximum Drug Retail Price (MDRP/MRP) regime and display rules, (2) the Internet Transactions Act (RA 11967) IRR and whether a non-transacting price-comparison aggregator is covered, (3) Naga City and Camarines Sur local ordinances/permitting rules, and (4) whether an NPC advisory opinion is warranted.
- Method: primary sources fetched directly on 2026-10-19. The signed RA 11967 IRR is a scanned PDF; its text was extracted by OCR from the DTI-hosted signed copy and cross-checked against the statutory text. Naga City ordinances were read from the city's official legislative database (`naga.gov.ph` / `www2.naga.gov.ph`). Where a source could not be reached or a question could not be verified, it is stated as uncertainty, not fact.
- Citation convention: bracketed IDs (e.g., [S3]) resolve to the full title, issuer, URL, and date in the Sources table at the end. Each legal claim is tied to the instrument that owns it; recommendations are marked "Recommendation" or "Analysis".

---

## TL;DR — the four answers

1. **EO 821 is no longer the operative MDRP instrument.** It was repealed by **EO No. 155, s. 2021** (2021-12-07). The current regime is **EO No. 104, s. 2020** (86 drug molecules / 133 formulas) plus **EO No. 155, s. 2021** (an additional 34 molecules / 71 formulas), i.e. roughly **120 molecules / 204 formulas**, with some source variance in the molecule count. No later MDRP-related EO appears in the LawPhil EO indexes through the latest EO listed (No. 124, 2026-09-08). [S1][S2][S3][S4][S5][S6][S27]
2. **The MDRP display rule is a physical-label rule plus an outlet-posting rule.** The MRP must appear on the immediate container/minimum pack with the exact words “RETAIL PRICE NOT TO EXCEED” and “UNDER DRUG PRICE REGULATION” on a red strip; outlets must post a clear copy of the price order; no one may sell above the ceiling. No MDRP-specific rule for online listings was found, but an online seller is still bound by the no-sale-above-MRP rule and general price-display/consumer-protection rules. [S2][S3][S6][S7][S9][S10][S11]
3. **RA 11967’s IRR is in force.** The IRR is **Joint Administrative Order No. 24-03**, signed 2024-05-24 (signing ceremony 2024-05-22); the 18-month transitory period ended **2025-06-20**, and DTI announced full enforcement on 2025-06-23. A pure, non-transacting price-comparison aggregator is **likely outside** the e-marketplace definition and, on the better reading, outside the transaction-anchored scope of the Act; however, the IRR’s broad “digital platform” definition (which adds “offered” and “healthcare”) and its Section 33 obligations for platforms without oversight create a real boundary risk if any transaction-adjacent feature is added. [S10][S11][S12][S13]
4. **Naga City requires a Mayor’s Permit for businesses with a physical office/hub in the city, and its FOI ordinance allows denial of commercial-purpose data requests.** No general Naga City data-privacy ordinance was found; the city has a DPO (`dpo@naga.gov.ph`). Camarines Sur has no accessible online ordinance database, so no provincial ordinance was verified. An **NPC advisory opinion is optional, not a launch prerequisite**; it is worth considering only if health data leaves the device, accounts/reviews are added, or CHO/LGU patient-level data is ingested. [S14][S15][S16][S17][S18][S19][S20][S21][S22][S23]

---

## 1. Maximum Drug Retail Price (MDRP/MRP): current status

### 1.1 EO 821 is repealed; EO 104 and EO 155 are the operative instruments

- **EO No. 821 (2009-07-27)** imposed MDRPs on five active ingredients (amlodipine, atorvastatin, azithromycin, cytarabine, doxorubicin) and 27 formulas, with a review clause and a 2009 price list. [S1]
- **EO No. 104 (2020-02-17)** imposed a Maximum Retail Price (MRP) and/or Maximum Wholesale Price (MWP) on **86 drug molecules / 133 drug formulas**, applicable to all public and private retail outlets (drugstores, hospitals and hospital pharmacies, HMOs, convenience stores, supermarkets, and the like). It prohibits any person from selling, reimbursing, or demanding an amount higher than the MRP/MWP, and gives a 90-day transition for existing inventory. [S2]
- **EO No. 155 (2021-12-07)** added **34 drug molecules / 71 drug formulas** (Annex A) to the MRP/MWP regime, repeated the labeling requirement (including for EO 104 formulas), required DOH review every six months, and expressly **repealed EO No. 821**. [S3][S4]
- **FDA Circular No. 2022-005** confirms the sequence: EO 821’s 5 molecules/27 formulas were expanded to 86 molecules/133 formulas by EO 104, and EO 155 added 34 molecules/71 formulas and repealed EO 821. [S6]
- **Count variance:** EO 155’s recital says EO 104 covered “87 drug molecules or 133 drug formulas”; EO 104 itself says “86 drug molecules or 133 drug formulas”; FDA Circular 2022-005 uses 86/133. The formula count (133 + 71 = 204) is consistent; the molecule total is therefore **120 or 121** depending on the source. The PRD should not hard-code a total; it should key coverage to the annex rows (molecule + strength + form) and reconcile against the current DOH/FDA list. [S2][S3][S4][S5][S6]
- **No later MDRP EO found:** the LawPhil Executive Orders indexes for 2022, 2023, 2024, 2025, and 2026 (through EO No. 124, 2026-09-08) contain no MDRP/MRP-related EO. As of 2026-10-19, EO 104 and EO 155 remain the operative instruments. [S27]
- **Review clause, not automatic expiry:** EO 155 requires DOH, in consultation with DTI, to review the list six months after effectivity and every six months thereafter. A review does not automatically change the list; a delisting/addition would need a subsequent issuance. No such subsequent EO was found. [S3]
- **Do not reuse EO 821’s 2009 prices:** EO 821 is repealed; its 2009 ceilings are historical. The current ceilings are in the annexes to EO 104 and EO 155. [S1][S3]

### 1.2 What the current list covers, and the VAT nuance

- The list is **product-specific**, not molecule-only: each row pairs a molecule (or fixed-dose combination) with a strength and dosage form, and sometimes a pack. The MRP/MWP applies to that formula, not to every product containing the molecule. [S4][S5]
- EO 104’s annex covers antihypertensives, antidiabetics, anti-neoplastics/anti-cancer, immunosuppressants, and other categories; EO 155’s annex adds agents affecting bone metabolism, analgesics, anesthetics, anti-angina, anti-arrhythmics, anti-asthma/COPD, antibiotics, anticoagulants, anticonvulsants, antidiuretics, antiemetics, anti-glaucoma, anti-hypercholesterolemia, antihypertensives, anti-neoplastics, antiparkinsonian, diuretics, overactive-bladder drugs, growth-hormone inhibitors, immunosuppressants, iron chelators, and a psoriasis/seborrhea/ichthyosis medicine. [S4][S5]
- Examples visible in the annexes include amlodipine and amlodipine combinations, atorvastatin, azithromycin, cytarabine, doxorubicin, dapagliflozin, empagliflozin, insulin aspart/detemir/glulisine/lispro, metformin + sitagliptin/saxagliptin, afatinib, bevacizumab, cetuximab, trastuzumab, tacrolimus, and tocilizumab. This is illustrative, not the complete list; the annexes control. [S4][S5]
- **VAT:** EO 155’s annex states that the MWPs are exclusive of VAT, while the stated MRPs are **VAT-inclusive except for VAT-exempt medicines**. Consumer shelf prices are normally VAT-inclusive. A comparison must not compare an MWP to a consumer shelf price, and must account for VAT-exempt drugs where the MRP is not VAT-inclusive. [S4]
- **Authoritative source for seeding:** use Annex A of EO 104 and Annex A of EO 155, then reconcile each SKU against the FDA-registered product label and the FDA Verification Portal. Do not infer an MRP from a different strength, form, or pack. [S4][S5][S6]

### 1.3 Display obligations for physical retailers

The legal display duties are layered:

1. **Label on the product.** Every manufacturer, importer, distributor, wholesaler, trader, or retailer of a drug intended for sale must display the retail price, which must not exceed the MRP. The MRP must be printed on the label of the **immediate container** and the **minimum pack** offered for retail, preceded by the words **“RETAIL PRICE NOT TO EXCEED”** and with **“UNDER DRUG PRICE REGULATION”** on a **red strip**. [S7 Sec. 26(a)]
2. **Price lists.** Manufacturers, importers, and traders must issue price lists to wholesalers, distributors, retailers, and DOH, indicating the retail price and the MRP. [S7 Sec. 26(b)]
3. **Posting at the outlet.** All drug outlets must post, in a conspicuous area within the premises, a clear copy of the President’s price order, easily accessible to the public and updated regularly. [S7 Sec. 30(d)]
4. **No sale above the ceiling.** EO 104 prohibits any public or private entity from selling, reimbursing, or demanding an amount higher than the MRP/MWP; EO 155 extends that regime to the additional formulas and requires the displayed retail price not to exceed the MRP. [S2 Sec. 2][S3 Secs. 1–2]
5. **Price transparency.** UHC Act (RA 11223) Sec. 28(c)–(d) requires health care providers and drug outlets to make prices readily accessible and to provide therapeutic-equivalent price lists; this reinforces, but does not replace, the MDRP rules. [S8]
6. **FDA labeling process.** FDA Circular 2022-005 implements the labeling requirement: the MRP statement is printed on primary and secondary packaging on a red strip, with a one-year exhaustion period for old labeling, and delisted products revert to regular labels. [S6]

### 1.4 Online listings: what is actually required

- **No MDRP-specific online-listing rule was found** in the FDA issuances reviewed. The red-strip rule is a **product-label** rule; it is not written as a requirement for a webpage or a comparison listing. [S6][S7]
- **The no-sale-above-MRP rule still applies to an online seller.** EO 104/EO 155 bind “retail outlets” and prohibit any person from selling above the MRP; an online seller of an MRP drug is still a seller. [S2][S3]
- **If RA 11967 applies**, an e-retailer/online merchant must indicate price consistent with RA 7394 Art. 81, and an e-marketplace must require merchants to show price inclusive of taxes and other charges. [S10 Sec. 23(a)][S11 Sec. 34(b), Sec. 32(h)]
- **RA 7394 Art. 81** requires a price tag/label publicly displayed and prohibits sale above the tagged price; this is the general consumer-protection baseline for any price display. [S9]
- **Practical reading:** an online listing for an MRP drug should show the observed retail price and, separately, the MRP ceiling. The listing should not present the MRP as the seller’s own price, and should not reproduce the red-strip label as if Pharmassist were the manufacturer/retailer. The pharmacy remains responsible for the product label and for not selling above the ceiling. [S2][S3][S6][S7] (Analysis)
- **Recommended display for Pharmassist (not a legal mandate):**
  - show “MDRP/MRP ceiling: ₱X” with the legal source (EO 104 or EO 155 annex) and the date checked;
  - show the observed shelf price separately, with pharmacy name/branch and “last verified” date/time;
  - label the observed price as a VAT-inclusive shelf price, and note the VAT treatment of the MRP;
  - flag any observed price above the ceiling as “above MDRP ceiling — verify/report”, and do not rank it as a valid low price;
  - never apply a molecule-level ceiling to a different strength/form/pack;
  - do not compute senior/PWD discounts into the comparison; disclose that statutory discounts apply at the point of sale. [S2][S3][S4][S6][S7][S8][S9] (Recommendation)

### 1.5 Confirmed vs. uncertain (MDRP)

**Confirmed**

- EO 821 was repealed by EO 155; it is not the current list. [S3 Sec. 10]
- EO 104 imposed MRP/MWP on 86 molecules/133 formulas; EO 155 added 34 molecules/71 formulas. [S2][S3][S4][S5][S6]
- The MRP label must use the exact red-strip wording on the immediate container/minimum pack; outlets must post the price order; selling above the MRP is prohibited. [S2][S3][S7]
- No later MDRP-related EO appears in the LawPhil EO indexes through 2026-09-08. [S27]
- No MDRP-specific online-listing display rule was found; the physical-label rule and the no-sale-above-MRP rule are the anchors. [S6][S7]

**Uncertain**

- Whether DOH has issued administrative delistings/additions or a consolidated current list outside the EO annexes. EO 155 requires six-monthly reviews; the results were not published in the sources reviewed. Verify with DOH’s pharmaceutical management/price-regulation unit before seeding. [S3]
- The exact current molecule count (120 vs. 121) because EO 104/EO 155/FDA Circular counts differ by one. The formula count (204) is consistent. [S2][S3][S6]
- The full text of DOH Administrative Order No. 2020-0039 (the MRP implementation guidelines) was not retrieved; its existence and role are cited through FDA Circular 2022-005. Do not treat the AO’s details as verified beyond that citation. [S6]
- Whether an online listing that merely displays an MRP is itself subject to a separate FDA labeling/promotion rule. No such rule was found; the conservative design is to display the ceiling neutrally and avoid red-strip mimicry. [S6][S7] (Analysis)

---

## 2. RA 11967 (Internet Transactions Act): IRR status and aggregator coverage

### 2.1 IRR status and enforcement timeline

- **RA No. 11967** was approved **2023-12-05**. It applies to B2B and B2C internet transactions where a party is in the Philippines or the platform/e-retailer/online merchant avails of the Philippine market and has minimum contacts. “Internet transaction” means the **sale or lease** of digital or non-digital goods and services over the internet. [S10 Secs. 3, 4(h)]
- **The IRR is Joint Administrative Order No. 24-03.** DTI hosted the signed IRR; the signature page bears digital signature dates of **2024-05-24**. DTI’s news release says the signing ceremony was **2024-05-22** and the IRR was issued **2024-05-24**. The IRR takes effect **15 days after publication** in the Official Gazette or a newspaper of general circulation and filing with the UP Law Center. [S11 Sec. 52][S12]
- **The transitory period ended 2025-06-20.** DTI announced on **2025-06-23** that RA 11967 is in full effect following the end of the 18-month transitory period on Friday, 2025-06-20; DTI can now issue takedown orders and enforce the IRR. [S13]
- **No aggregator-specific DTI guidance was found.** The IRR and DTI’s public materials do not specifically address a non-transacting price-comparison service. The analysis below is therefore based on the statutory/IRR text, not on a DTI ruling. [S10][S11][S13] (Analysis)

### 2.2 The key definitions

| Term | Statutory text | IRR text | Consequence for a price-comparison service |
|---|---|---|---|
| Internet transaction | “the sale or lease of digital or non-digital goods and services over the internet”; includes e-commerce [S10 Sec. 4(h)] | “the sale or offer for sale, or lease or offer for lease, of digital or non-digital goods and services over the internet”; includes e-commerce [S11 Sec. 2(m)] | A pure information listing is not itself a sale/lease; but “offer for sale” is broad. |
| Digital platform | ICT-enabled mechanisms that “connect and integrate producers and users in online environments where goods and services are requested, developed, and sold, and data is generated and exchanged,” including e-marketplace, mobile app, delivery, social media, travel [S10 Sec. 4(d)] | Same idea, but adds **“offered”** and lists **“healthcare”** among examples [S11 Sec. 2(f)] | The IRR is broader than the statute; a site that displays pharmacy offers could arguably fit “offered.” |
| E-marketplace | A digital platform whose business is to connect online consumers with online merchants, facilitate shipment/logistics and post-purchase support, and **otherwise retains oversight over the consummation of the transaction** [S10 Sec. 4(e)] | Adds “facilitate and conclude the sales, process the payment ... or facilitate shipment/logistics and post-purchase support ... and otherwise retains oversight” [S11 Sec. 2(j)] | A non-transacting listing does not conclude sales, process payment, ship, or retain oversight; **not an e-marketplace**. |
| Oversight over the transaction | Not defined in the Act | “participating over or providing facilities that lead to the perfection, consummation or execution of all or a part of any internet transaction, including ... online shopping carts, or delivery services” [S11 Sec. 2(o)] | No cart, no payment, no delivery, no order facilitation = no oversight. |
| Scope/exclusions | B2B/B2C internet transactions with a Philippine party or Philippine-market availment; C2C and online media content excluded [S10 Sec. 3] | Adds exclusions for transactions “solely and exclusively executed, consummated, and perfected offline,” foreign/domestic entities not availing of the Philippine market through e-commerce, and online media content [S11 Secs. 3–4] | If the user views a price online but buys at the pharmacy counter, the transaction is consummated offline — a strong argument for exclusion. |

### 2.3 Is a non-transacting price-comparison aggregator covered?

**Short answer: likely no, but the boundary is not free from doubt.**

- **Not an e-marketplace.** Pharmassist does not connect a consumer to a merchant for the conclusion of a sale, does not process payment, does not ship or provide post-purchase support, and does not retain oversight over the consummation of a transaction. It fails every functional element of the IRR’s e-marketplace definition. [S10 Sec. 4(e)][S11 Sec. 2(j)]
- **Probably not a covered “digital platform” either, on the transaction-anchored reading.** The Act applies to “internet transactions” (sale/lease). A site that displays independently collected shelf prices, with no offer for sale by Pharmassist, no merchant-posted offers, no cart/order/payment/delivery, and no per-transaction commission, is an information service, not a party to an internet transaction. If the user buys at the physical pharmacy, the transaction is “solely and exclusively executed, consummated, and perfected offline,” which the IRR expressly excludes. [S10 Secs. 3, 4(h)][S11 Secs. 3–4] (Analysis)
- **The counter-argument is the IRR’s broader “digital platform” definition.** The IRR defines digital platforms as mechanisms that connect producers and users “where goods and services are requested, developed, offered, or sold,” and expressly lists “healthcare.” A site that displays pharmacy offers and links users to pharmacies could be characterized as connecting users in an environment where goods/services are “offered.” The IRR also imposes obligations on “other digital platforms that do not retain oversight over the consummation of the transaction” (Sec. 33), which presupposes a transaction somewhere but does not require the platform to retain oversight. This is the residual risk. [S11 Secs. 2(f), 33] (Analysis)
- **The risk becomes material if any of these appear:** merchant accounts or merchant-posted price/stock offers; a “Buy,” “Order,” “Reserve,” or “Add to cart” button; payment or delivery facilitation; affiliate links that complete a purchase; per-transaction commissions; or sponsored ranking tied to sales. Any of these could turn the service into a digital platform/e-marketplace or an online merchant. [S10 Secs. 21–23][S11 Secs. 32–34] (Analysis)
- **If covered, the obligations are significant.** An e-marketplace must require merchant registration information, maintain and regularly verify a merchant list, require name/brand/price/description/condition, prohibit regulated goods without permits, provide redress, and protect data privacy. “Other digital platforms” under Sec. 33 must distinguish commercial/private accounts, prohibit sale/advertisement of regulated goods without permits, require merchant name/location/description/condition/contact, provide redress, maintain a merchant list, and protect data privacy. [S10 Secs. 21–22][S11 Sec. 33]
- **If the service ever sells medicines**, a separate regulatory layer applies: only FDA-licensed outlets and licensed pharmacists may dispense, and unlicensed online pharmacy/direct-selling is penalized. That is outside this ticket’s scope but remains a hard gate. [S28][S26]

### 2.4 Design constraints to stay outside RA 11967

These are recommendations, not statutory text:

1. **No sale, offer for sale, lease, cart, order, reservation, payment, or delivery** by Pharmassist. The UI must be information-only.
2. **No merchant accounts or merchant-posted offers.** Prices/stock are seeded/verified by Pharmassist, not posted by pharmacies as offers to sell.
3. **No checkout links or affiliate links that complete a transaction.** If linking out, link to the pharmacy’s homepage/contact page, not a product checkout.
4. **No per-transaction commissions or sponsored ranking tied to sales.** If monetization is added later, re-run the RA 11967 analysis first.
5. **Label the service** as an information/comparison service, not an online pharmacy, e-pharmacy, marketplace, or delivery service.
6. **If any transaction-adjacent feature is added**, treat RA 11967 as triggered: register with the DTI E-Commerce Bureau, publish the required identity/contact/price/condition information, provide redress, and comply with the e-marketplace/digital-platform obligations. Make this a roadmap gate. [S10][S11][S13] (Recommendation)

### 2.5 Confirmed vs. uncertain (RA 11967)

**Confirmed**

- The IRR is Joint Administrative Order No. 24-03, signed 2024-05-24; the 18-month transitory period ended 2025-06-20; full enforcement was announced 2025-06-23. [S11][S12][S13]
- The Act applies to B2B/B2C internet transactions (sale/lease); e-marketplaces must connect consumers/merchants, facilitate/conclude sales or logistics, and retain oversight. [S10][S11]
- The IRR’s “digital platform” definition is broader than the statute: it adds “offered” and “healthcare.” [S11 Sec. 2(f)]
- The IRR expressly excludes transactions consummated offline and online media content. [S11 Sec. 4]
- No DTI issuance specifically addressing price-comparison aggregators was found. [S11][S13]

**Uncertain**

- Whether DTI’s E-Commerce Bureau would treat a price-comparison site that displays pharmacy offers and links out as a “digital platform” under the IRR’s broad definition. There is no on-point guidance; the conservative design is to avoid any transaction facilitation. [S11] (Analysis)
- The exact publication/effectivity date of the IRR (the signed copy says 15 days after publication; the publication date was not verified). The enforcement timeline is confirmed by DTI’s 2025-06-23 announcement. [S11][S13]
- Whether “online media content” could be read to cover a commercial comparison site. The safer position is not to rely on that exclusion; rely on the no-transaction design. [S11 Sec. 4] (Analysis)

---

## 3. Naga City and Camarines Sur local rules

### 3.1 Naga City business permitting

- **Ordinance No. 2026-093, “Mayor’s Permit Compliance Ordinance of Naga City”** (enacted 2026-08-11; published in Bicol Mail in August–September 2026) applies to **all business establishments operating in Naga City**, including sole proprietorships, partnerships, corporations, cooperatives, tax-exempt entities, and **online businesses with physical distribution outlets or hubs in the city**. It requires a valid Mayor’s Permit before operating, authorizes closure for non-compliance, imposes a **₱3,000** administrative fine and **₱5,000 per day** for unauthorized re-opening, allows retroactive assessment of back taxes, and adds a **25% surcharge** plus **2% monthly interest** (capped at 36 months). It also requires display of the permit. [S15]
- **The Citizens Charter** states that all enterprises must secure a Business License and Mayor’s Permit and pay business taxes before commercial operations; renewal is January 1–20; requirements include DTI/SEC/CDA registration, barangay business clearance, zoning, sanitary, building, and fire clearances. For drugstores, the additional requirement is a **BFAD (now FDA) license**. [S16]
- **“Setting Up Business”** lists the sequence: register with SEC/DTI/CDA; secure the Mayor’s Permit; register with BIR; register with SSS, PhilHealth, and Pag-IBIG. [S17]
- **Application to Pharmassist:** if it has a physical office/hub in Naga, it is a business establishment and needs a Mayor’s Permit; the 2026-093 ordinance expressly covers online businesses with physical distribution outlets/hubs. If it is genuinely remote-only with no physical establishment in Naga, the ordinance’s coverage is less clear, but the Citizens Charter’s general “all enterprises” language and the city’s business-tax rules may still apply. Confirm the classification with the Naga City Business Permit and Licensing Division (BPLD) before launch. [S15][S16][S17] (Analysis)
- **No Naga City ordinance specifically requiring a permit to publish pharmacy prices was found** in the published ordinance database. Pharmassist is not a drugstore; it does not need an FDA LTO merely to publish prices. If it ever sells, dispenses, or delivers medicines, the FDA licensing/pharmacy rules apply. [S16][S28][S29]

### 3.2 Naga City FOI Ordinance and LGU data sharing

- **Ordinance No. 2021-014, “FOI Ordinance of the City Government of Naga”** (enacted 2021-02-16) operationalizes freedom of information in the city. It creates a legal presumption in favor of access, requires a written request to the Office of the City Administrator, and sets a **five-working-day** response period (extendable in exceptional cases). [S14 Secs. 4, 8]
- **Privacy protection:** Section 7 requires city offices to protect personal information under the Data Privacy Act and to disclose personal information only when material/relevant and permitted by law. [S14 Sec. 7]
- **Commercial-purpose denial:** Section 12 lists grounds on which the right to information “will obviously be denied,” including **“For Commercial purpose.”** This is a direct local constraint on using the FOI process to obtain CHO/LGU datasets for a commercial price-comparison service. [S14 Sec. 12]
- **Implication:** do not plan on FOI as the data-access route for commercial use. If Pharmassist needs CHO/LGU data, structure it as a written partnership/data-sharing arrangement with the City Health Office/City Health Board, with a Data Sharing Agreement (DSA) where personal data is involved and review by the city’s DPO. This aligns with the national DPA/DSA framework in issue #1. [S14][S24][S25] (Recommendation)

### 3.3 Naga City data privacy and health data

- **No general Naga City data-privacy ordinance was found.** A search of the city’s published SP ordinances and previous ordinances for “privacy” returned only the CCTV ordinance (No. 2025-089); the city’s “Data Privacy Seal” page is a post with no substantive regulatory text; the city’s “Privacy Policy” page is a standard website privacy policy, not a local ordinance. [S18][S29] (Negative finding; the online ordinance database may be incomplete.)
- **The city has a Data Protection Officer.** The Citizens Charter’s “Data privacy concerns & services” entry directs data-subject requests and privacy incidents to **`dpo@naga.gov.ph`**. Use this contact for any DSA/DPIA review. [S18]
- **The city has a health-data precedent, but it is COVID-specific.** Ordinance No. 2020-086 (enacted 2020-09-08) created the eSALVAR digital contact-tracing system, with data-protection provisions: information is under the custody of the City Epidemiology and Surveillance Unit (CESU) of the City Health Office and the Contact Tracing Monitoring Center; access is limited to designated data controllers; data is used only for contact tracing; records are deleted after 60 days; an audit team oversees privacy. The ordinance applies during the public health emergency and terminates automatically when the President lifts the emergency. It is **not** a basis for pharmacy price data, but it shows the city’s pattern of regulating health-data systems through custody, retention, and audit rules. [S19]
- **Implication:** treat any CHO/LGU health dataset as sensitive personal information; use aggregate/de-identified data in v1; for patient-level data, require a DSA, lawful basis, DPIA, and city legal/DPO review. [S19][S24][S25] (Recommendation)

### 3.4 Camarines Sur provincial rules

- **No accessible provincial ordinance database was found.** The official provincial website (`camarinessur.gov.ph`) exposes transparency, bidding, tourism, and profile pages, but its sitemap does not include an ordinance database or a searchable legislative archive. No provincial ordinance affecting pharmacy data publication, health data, or LGU data sharing was found. [S20]
- **Limitation:** this is a negative finding from the public website, not proof that no provincial ordinance exists. The Sangguniang Panlalawigan (SP) Secretary and Provincial Legal Officer are the proper custodians. Before any provincial data partnership, request the relevant ordinances/resolutions and a written data-sharing opinion from the Provincial Legal Officer/DPO. [S20] (Recommendation)
- **National law still applies:** any provincial health data sharing involving personal data requires a DSA under the DPA framework, regardless of whether a provincial ordinance exists. [S24][S25]

### 3.5 Confirmed vs. uncertain (local)

**Confirmed**

- Naga City requires a Mayor’s Permit for business establishments; Ordinance 2026-093 covers online businesses with physical distribution outlets/hubs and imposes fines/closure for non-compliance. [S15]
- Drugstores need a BFAD/FDA license as an additional business-permit requirement; Pharmassist is not a drugstore unless it sells/dispenses. [S16][S28]
- Naga’s FOI Ordinance allows denial of requests for “commercial purpose” and requires privacy protection under the DPA. [S14]
- Naga has a DPO contact (`dpo@naga.gov.ph`); no general local data-privacy ordinance was found in the published ordinance database. [S18][S29]
- Camarines Sur has no accessible online ordinance database; no provincial ordinance was verified. [S20]

**Uncertain**

- Whether Naga’s BPLD treats a remote-only online service with no physical office/hub as a “business establishment” required to secure a Mayor’s Permit. The 2026-093 text focuses on physical establishments/online businesses with physical outlets/hubs; the Citizens Charter’s “all enterprises” language is broader. Confirm before launch. [S15][S16]
- Whether the Naga ordinance database is complete; a local privacy/health ordinance may exist outside the published database. Verify with the SP Secretary/City Legal Officer. [S18]
- Whether Camarines Sur has a provincial data-privacy/health-data ordinance not published online. Verify with the SP Secretary/Provincial Legal Officer. [S20]

---

## 4. NPC advisory opinion: is it warranted, and how does it work?

### 4.1 What an NPC advisory opinion is — and is not

- An advisory opinion is the NPC’s determination on a data privacy/data protection matter at the request of a party. It is based only on the facts and circumstances provided, provides guidance to the requesting party and the public, and is **not a standing rule binding on the NPC** in other cases. It does not adjudicate issues between parties, impose sanctions, or award damages; it may be referred to the Complaints and Investigations Division. [S21 Sec. 2]
- It is **not a license, approval, or legal opinion** that guarantees compliance. It also cannot be used to review contracts or to approve a privacy notice, privacy manual, consent form, or terms and conditions. [S21 Sec. 5]

### 4.2 Process and timeline under NPC Circular No. 18-01

- **Who may request:** any party, including a data subject/citizen or a representative of a PIC/PIP. [S22]
- **How:** a letter request addressed to the Privacy Commissioner and Chairman, delivered personally or by direct/electronic mail, containing:
  - name, complete business/postal address, telephone, and e-mail;
  - the novel issues/questions of law or matters to be clarified;
  - a comprehensive narrative of the facts and legal bases;
  - an affidavit/certification that the subject is not pending in a case in litigation before the courts or the NPC and is not subject to an ongoing investigation/compliance check;
  - all relevant documents/attachments. [S21 Sec. 4]
- **What NPC will not accommodate:** issues already decided or pending; matters before the NPC/investigation; previously issued advisory opinions; questions too general, abstract, anticipatory, or speculative; contract review; review of privacy notices/manuals/consent forms/policies. [S21 Sec. 5]
- **Timeline:** release within **20 working days** from receipt by the concerned division, extendable for complexity/novelty; a conference may be required; fees may be prescribed; opinions may be published with sensitive/proprietary information redacted. [S21 Secs. 9–12]

### 4.3 Is an opinion warranted for Pharmassist?

**Recommendation: optional, not a launch prerequisite; conditionally useful.**

- **For v1 as designed, an NPC advisory opinion is not required.** Publishing pharmacy business names, branch addresses, prices, and stock is generally business data, not personal data; the DPA does not require NPC approval for that. (Personal data encountered along the way — a sole proprietor’s name, staff names, user reviews — remains protected.) The on-device prescription scan is sensitive personal information, but the compliance path (explicit consent, on-device processing, no storage/transmission, no secondary use) is set out in the DPA/IRR and the NPC’s consent guidance. [S24][S25][S30][S32] (Analysis)
- **An opinion is worth considering if any of these become true:**
  - prescription images or OCR text leave the device, or the service stores health data;
  - the service adds accounts, reviews, pharmacist profiles, or other personal-data features;
  - the service ingests CHO/LGU patient-level data or enters a DSA;
  - the service adopts a novel AI/OCR or automated decision-making design that the team wants the NPC to review. [S21][S24][S25] (Recommendation)
- **If filing, frame it narrowly.** Provide the actual data flow, the proposed retention/deletion rules, the consent design, and the specific DPA provisions in question. Do not ask the NPC to approve a privacy notice or contract; do not ask speculative “what if we add X later” questions. [S21 Sec. 5] (Recommendation)
- **Do not block the pilot on the NPC.** A DPIA, a compliant privacy notice/consent flow, a DPO, and NPC registration are the operational prerequisites; an advisory opinion is additional comfort, not a gate. [S24][S25] (Recommendation)
- **No on-point NPC advisory opinion was found.** The published advisory opinions index through 2026-09-22 contains no opinion specifically on pharmacy price comparison or medicine price listings. The closest general guidance is the NPC’s AI advisory (2024-04) and scraping advisory (2026-01), which are general frameworks, not service-specific approvals. [S23][S31][S32]

### 4.4 Confirmed vs. uncertain (NPC)

**Confirmed**

- NPC Circular No. 18-01 governs the procedure: letter request, facts/legal bases, certification, 20-working-day timeline, possible extension/fees, publication with redactions. [S21][S22]
- An advisory opinion is guidance, not a binding rule or adjudication; NPC will not review contracts/privacy notices or answer speculative questions. [S21]
- No on-point NPC advisory opinion on pharmacy price comparison was found in the published index. [S23]

**Uncertain**

- Whether the NPC would accept a request at the pre-launch, design stage or treat it as “anticipatory”/“too general.” The safer route is to file only with concrete, implemented or near-implemented data flows. [S21 Sec. 5] (Analysis)
- The exact fees, if any, and the current backlog/turnaround beyond the 20-working-day standard. The circular allows fees and extensions; the NPC’s current processing times were not verified. [S21 Secs. 10–12]

---

## 5. Consolidated confirmed facts and uncertainties

### Confirmed (primary sources)

1. EO 821 is repealed; EO 104 and EO 155 are the current MRP/MWP instruments. [S1][S2][S3]
2. EO 104 covers 86 molecules/133 formulas; EO 155 adds 34 molecules/71 formulas; the annexes are product-specific and set MRP/MWP per strength/form. [S2][S3][S4][S5][S6]
3. No later MDRP-related EO appears in the LawPhil EO indexes through 2026-09-08 (EO No. 124). [S27]
4. The MRP label must use “RETAIL PRICE NOT TO EXCEED” and “UNDER DRUG PRICE REGULATION” on a red strip on the immediate container/minimum pack; outlets must post the price order; selling above the MRP is prohibited. [S2][S3][S7]
5. No MDRP-specific online-listing rule was found; online sellers remain bound by the no-sale-above-MRP rule and general price-display/consumer-protection rules. [S6][S7][S9][S10][S11]
6. RA 11967’s IRR is Joint Administrative Order No. 24-03, signed 2024-05-24; the transitory period ended 2025-06-20 and full enforcement began 2025-06-23. [S11][S12][S13]
7. RA 11967 applies to B2B/B2C internet transactions (sale/lease); an e-marketplace must connect consumers/merchants, facilitate/conclude sales or logistics, and retain oversight. [S10][S11]
8. The IRR’s “digital platform” definition is broader than the statute (adds “offered” and “healthcare”); its Section 33 imposes obligations on platforms that do not retain oversight. [S11]
9. A pure, non-transacting price-comparison site is likely outside the e-marketplace definition and, on the better reading, outside the transaction-anchored scope; the boundary is uncertain if transaction-adjacent features are added. [S10][S11] (Analysis)
10. Naga City requires a Mayor’s Permit for business establishments; Ordinance 2026-093 covers online businesses with physical distribution outlets/hubs and imposes fines/closure. [S15][S16]
11. Naga’s FOI Ordinance allows denial of commercial-purpose requests and requires DPA-compliant privacy protection; the city has a DPO at `dpo@naga.gov.ph`. [S14][S18]
12. No general Naga City data-privacy ordinance was found in the published ordinance database; Camarines Sur has no accessible online ordinance database. [S18][S20][S29]
13. NPC Circular 18-01 governs advisory opinion requests; an opinion is guidance, not a binding rule, and is not required for v1. [S21][S22]

### Uncertain (do not encode as fact)

1. **Current DOH MDRP list after the six-monthly reviews.** EO 155 requires reviews; no consolidated current list or later EO was found. Verify with DOH/FDA before seeding. [S3]
2. **Exact molecule count** (120 vs. 121) due to the 86/87 discrepancy in EO 104 descriptions; the formula count (204) is consistent. [S2][S3][S6]
3. **Full text of DOH AO 2020-0039** (MRP implementation guidelines) was not retrieved; it is cited through FDA Circular 2022-005 only. [S6]
4. **Whether DTI would treat a price-comparison site as a “digital platform”** under the IRR’s broad definition if it displays pharmacy offers and links out. No on-point guidance; design conservatively. [S11] (Analysis)
5. **Whether Naga’s BPLD requires a Mayor’s Permit for a remote-only online service with no physical office/hub.** The 2026-093 text focuses on physical establishments/online businesses with physical outlets/hubs; the Citizens Charter is broader. Confirm with BPLD. [S15][S16]
6. **Whether a Naga or Camarines Sur data-privacy/health-data ordinance exists outside the published databases.** Verify with the SP Secretary/City or Provincial Legal Officer. [S18][S20]
7. **Whether NPC would accept a pre-launch advisory opinion request** or treat it as anticipatory/too general. File only with concrete data flows. [S21 Sec. 5]
8. **Whether an online listing that displays an MRP is subject to a separate FDA promotion/labeling rule.** No such rule was found; keep the display neutral and non-promotional. [S6][S7] (Analysis)

---

## 6. Sources

| ID | Title | Issuer | URL | Date |
|---|---|---|---|---|
| S1 | Executive Order No. 821, “Prescribing the Maximum Drug Retail Prices for Selected Drugs and Medicines...” | President of the Philippines / LawPhil | https://lawphil.net/executive/execord/eo2009/eo_821_2009.html | 2009-07-27 (repealed 2021) |
| S2 | Executive Order No. 104, “Improving Access to Healthcare Through the Regulation of Prices in the Retail of Drugs and Medicines” | President of the Philippines / LawPhil | https://lawphil.net/executive/execord/eo2020/eo_104_2020.html | 2020-02-17 |
| S3 | Executive Order No. 155, “Further Improving Access to Healthcare Through the Regulation of Prices in the Retail of Drugs and Medicines” | President of the Philippines / LawPhil | https://lawphil.net/executive/execord/eo2021/eo_155_2021.html | 2021-12-07 |
| S4 | EO No. 155, Annex A (List of Medicines and Corresponding MWP and MRP) | Official Gazette | https://www.officialgazette.gov.ph/downloads/2021/12dec/20211207-EO-155-RRD.pdf | 2021-12-07 |
| S5 | EO No. 104, Annex (List of Medicines and Corresponding MWP and MRP) | Official Gazette | https://www.officialgazette.gov.ph/downloads/2020/02feb/20200217-EO-104-RRD.pdf | 2020-02-17 |
| S6 | FDA Circular No. 2022-005, “Guidelines on Labeling Requirements of Drug Products under Maximum Retail Price (MRP)” | Food and Drug Administration (Philippines) | https://www.fda.gov.ph/fda-circular-no-2022-005-guidelines-on-labeling-requirements-of-drug-products-under-maximum-retail-price-mrp/ | Web-posted 2022-06-27 (exact issuance date not stated on page) |
| S7 | Republic Act No. 9502, “Universally Accessible Cheaper and Quality Medicines Act of 2008” | Congress of the Philippines / LawPhil | https://lawphil.net/statutes/repacts/ra2008/ra_9502_2008.html | 2008-06-06 |
| S8 | Republic Act No. 11223, “Universal Health Care Act” | Congress of the Philippines / LawPhil | https://lawphil.net/statutes/repacts/ra2019/ra_11223_2019.html | 2019-02-20 |
| S9 | Republic Act No. 7394, “Consumer Act of the Philippines” | Congress of the Philippines / LawPhil | https://lawphil.net/statutes/repacts/ra1992/ra_7394_1992.html | 1992-04-13 |
| S10 | Republic Act No. 11967, “Internet Transactions Act of 2023” | Congress of the Philippines / LawPhil | https://lawphil.net/statutes/repacts/ra2023/ra_11967_2023.html | 2023-12-05 |
| S11 | Implementing Rules and Regulations of RA No. 11967 (Joint Administrative Order No. 24-03) | DTI, DICT, NPC, DA, DOH, BSP | https://dtiwebfiles.s3.ap-southeast-1.amazonaws.com/Laws+and+Policies/eCommerce/DTI+BSP+NPC+DA+DOH+DICT+SIGNED_IRR+OF+THE+ITA_4.pdf | Signed 2024-05-24 |
| S12 | “DTI leads interagency signing of Internet Transactions Act guidelines” | Department of Trade and Industry | https://www.dti.gov.ph/dti-archives/dti-news-archived/dti-dti-leads-interagency-signing-internet-transactions-act-guidelines | 2024-05-23 |
| S13 | “DTI begins full enforcement of e-commerce law, liability rules” | Department of Trade and Industry | https://www.dti.gov.ph/dti-archives/dti-news-archived/dti-dti-begins-full-enforcement-e-commerce-law-liability-rules | 2025-06-23 |
| S14 | Ordinance No. 2021-014, “FOI Ordinance of the City Government of Naga” | Sangguniang Panlungsod, City of Naga | https://www2.naga.gov.ph/sp_ordinances/ordinance-no-2021-014/ | Enacted 2021-02-16 |
| S15 | Ordinance No. 2026-093, “Mayor’s Permit Compliance Ordinance of Naga City” | Sangguniang Panlungsod, City of Naga | https://www2.naga.gov.ph/sp_ordinances/ordinance-no-2026-093/ | Enacted 2026-08-11; published Aug–Sep 2026 |
| S16 | “Business Permit Application and Renewal” (Citizens Charter) | City Treasurer’s Office, City of Naga | https://www2.naga.gov.ph/2023-city-service/business-permit-application-and-renewal/ | Accessed 2026-10-19 |
| S17 | “Setting Up Business” | City Government of Naga | https://www2.naga.gov.ph/setting-up-business/ | Accessed 2026-10-19 |
| S18 | “Data privacy concerns & services” and city privacy pages | City Government of Naga | https://www2.naga.gov.ph/2023-city-service/data-privacy-concerns-services/ ; https://www2.naga.gov.ph/privacy-policy-2/ | Accessed 2026-10-19 |
| S19 | Ordinance No. 2020-086, “Digital Contact Tracing System Ordinance of Naga City” (eSALVAR) | Sangguniang Panlungsod, City of Naga | https://www2.naga.gov.ph/sp_ordinances/ordinance-no-2020-086/ | Enacted 2020-09-08 |
| S20 | Official provincial website and sitemap | Provincial Government of Camarines Sur | https://www.camarinessur.gov.ph/ ; https://www.camarinessur.gov.ph/sitemap.xml | Accessed 2026-10-19 |
| S21 | NPC Circular No. 18-01, “Rules of Procedure on Requests for Advisory Opinions” | National Privacy Commission | https://privacy.gov.ph/npc-circular-no-18-01-rules-of-procedure-on-requests-for-advisory-opinions/ | 2018-09-10 (page also bears 2018-09-19) |
| S22 | “Requesting Advisory Opinions” | National Privacy Commission | https://privacy.gov.ph/requesting-advisory-opinions/ | Accessed 2026-10-19 |
| S23 | Advisory Opinions index | National Privacy Commission | https://privacy.gov.ph/advisory-opinions/ | Through 2026-09-22 (accessed 2026-10-19) |
| S24 | Republic Act No. 10173, “Data Privacy Act of 2012” | Congress of the Philippines / LawPhil | https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html | 2012-08-15 |
| S25 | Implementing Rules and Regulations of the Data Privacy Act of 2012 | National Privacy Commission | https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/ | Accessed 2026-10-19 |
| S26 | FDA Advisory No. 2022-0108, “Reiteration of Warning Against the Promotion and Advertisement of Prescription Drug Products” | Food and Drug Administration (Philippines) | https://web.archive.org/web/20240420050426/https://www.fda.gov.ph/fda-advisory-no-2022-0108-reiteration-of-warning-against-the-promotion-and-advertisement-of-prescription-drug-products/ | 2022 (archived 2024-04-20) |
| S27 | LawPhil Executive Orders indexes, 2022–2026 | LawPhil Project | https://lawphil.net/executive/execord/eo2022/eo2022.html ; https://lawphil.net/executive/execord/eo2023/eo2023.html ; https://lawphil.net/executive/execord/eo2024/eo2024.html ; https://lawphil.net/executive/execord/eo2025/eo2025.html ; https://lawphil.net/executive/execord/eo2026/eo2026.html | Accessed 2026-10-19 |
| S28 | Republic Act No. 10918, “Philippine Pharmacy Act” | Congress of the Philippines / LawPhil | https://lawphil.net/statutes/repacts/ra2016/ra_10918_2016.html | 2016-07-21 |
| S29 | Naga City SP Ordinances database (search interface) | City Government of Naga | https://www2.naga.gov.ph/the-sangguniang-panlungsod/ordinances/ | Accessed 2026-10-19 |
| S30 | NPC Circular No. 2023-04, “Guidelines on Consent” | National Privacy Commission | https://privacy.gov.ph/wp-content/uploads/2023/11/NPC-Circular-No.-2023-04_Guidelines-on-Consent_07Nov2023.pdf | 2023-11-07 |
| S31 | NPC Advisory No. 2024-04, “Guidelines on the Application of the Data Privacy Act to Artificial Intelligence Systems Processing Personal Data” | National Privacy Commission | https://privacy.gov.ph/wp-content/uploads/2025/02/Advisory-2024.12.19-Guidelines-on-Artificial-Intelligence-w-SGD.pdf | 2024-12-19 |
| S32 | NPC Advisory No. 2026-01, “Guidelines on Data Scraping of Publicly Available Personal Data” | National Privacy Commission | https://privacy.gov.ph/wp-content/uploads/2026/04/SGD_A_1.pdf | 2026-04 |
| S33 | Republic Act No. 9994, “Expanded Senior Citizens Act of 2010” | Congress of the Philippines / LawPhil | https://lawphil.net/statutes/repacts/ra2010/ra_9994_2010.html | 2010-02-15 |
| S34 | Republic Act No. 9442, “An Act Amending RA No. 7277” (PWD discounts) | Congress of the Philippines / LawPhil | https://lawphil.net/statutes/repacts/ra2007/ra_9442_2007.html | 2007-04-30 |

---

## PRD constraints to encode

1. **Correct the legal basis in all product/PRD copy.** Replace “MDRP under EO 821” with **“MRP/MDRP under EO No. 104, s. 2020 and EO No. 155, s. 2021”**; EO 821 is repealed. Do not reuse its 2009 prices. [S1][S2][S3]
2. **Seed an MDRP flag table from the annexes, keyed to molecule + strength + form + pack.** Do not apply a molecule-level ceiling across different strengths/forms/packs; reconcile each SKU against the FDA-registered label and the FDA Verification Portal; re-check the DOH list before launch and after each six-month review cycle. [S2][S3][S4][S5][S6]
3. **Display the ceiling and the observed price separately.** For MRP items, show “MDRP/MRP ceiling: ₱X” with the legal source and date; show the observed shelf price separately with pharmacy/branch and “last verified” date/time; flag prices above the ceiling and never rank them as a valid low price. [S2][S3][S6][S7] (Recommendation)
4. **Do not mimic the red-strip label.** Use neutral “MDRP ceiling” wording, not “RETAIL PRICE NOT TO EXCEED” as if Pharmassist were the seller/manufacturer. The red-strip wording is a product-label requirement on the immediate container/minimum pack. [S6][S7]
5. **Handle VAT correctly.** MRPs are VAT-inclusive except for VAT-exempt medicines; MWPs are VAT-exclusive; consumer shelf prices are normally VAT-inclusive. Do not compare MWP to shelf price, and flag the VAT basis where relevant. [S4]
6. **Keep v1 transaction-free.** No cart, order, reservation, payment, delivery, merchant accounts, merchant-posted offers, affiliate checkout links, or per-transaction commissions. This is the core design that keeps Pharmassist outside RA 11967’s e-marketplace/digital-platform obligations. [S10][S11] (Recommendation)
7. **Make RA 11967 a roadmap gate.** If any transaction-adjacent feature is added (order/reserve/pay/deliver, merchant-posted offers, affiliate checkout, sponsored sales ranking), re-run the RA 11967 analysis, register with the DTI E-Commerce Bureau, and implement the e-marketplace/digital-platform obligations before launch. [S10][S11][S13]
8. **Do not present Pharmassist as an online pharmacy/e-pharmacy.** No dispensing, prescription fulfillment, or delivery; Rx items remain dispensed by a licensed pharmacy/pharmacist with a valid prescription. [S26][S28]
9. **Secure Naga City permits if there is a physical office/hub.** Ordinance 2026-093 requires a Mayor’s Permit for business establishments, including online businesses with physical distribution outlets/hubs; budget for the permit, business taxes, and the ordinance’s fines/closure risk. Confirm the remote-only classification with Naga BPLD. [S15][S16][S17]
10. **Do not use FOI for commercial LGU data.** Naga’s FOI Ordinance allows denial of “commercial purpose” requests; use a written partnership/DSA with the City Health Office/City Health Board and city DPO review instead. [S14][S18][S24][S25]
11. **Keep LGU/CHO data aggregate and de-identified in v1.** Patient-level or personal data requires a DSA, lawful basis, DPIA, and city legal/DPO review; for Camarines Sur, verify the provincial ordinance/legal position with the SP Secretary/Provincial Legal Officer because no provincial ordinance database is online. [S19][S20][S24][S25]
12. **Treat an NPC advisory opinion as optional, not a launch gate.** Prepare the DPIA, privacy notice/consent flow, DPO, and NPC registration; file a narrow advisory opinion only if health data leaves the device, accounts/reviews are added, or LGU patient-level data is ingested. Do not ask NPC to approve contracts/privacy notices. [S21][S22][S24][S25]
13. **Keep the on-device OCR design.** Explicit consent before camera/OCR; on-device processing; no upload/storage of images, OCR text, or patient identifiers; no secondary use; withdrawal leaves nothing retained. Any change reopens the DPA analysis. [S24][S25] (Recommendation)
14. **Keep price-accuracy controls.** Show pharmacy identity, pack/strength/form, observed shelf price, and last-verified date/time; provide a correction workflow; define any “cheapest” claim (complete basket at one pharmacy, timestamped, corrigible); disclose that senior/PWD discounts apply at the point of sale and are not computed in the comparison. [S8][S9][S33][S34] (Recommendation)
