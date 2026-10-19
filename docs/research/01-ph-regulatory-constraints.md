# Research 01 — Philippine regulatory constraints for a medicine price-and-availability service (Pharmassist, Naga City)

- Ticket: `https://github.com/Xaidel/pharmassist/issues/1`
- Date: 2026-10-19
- Scope: national laws, IRR, FDA and NPC issuances relevant to a seeded-data price/availability comparison PWA for Naga City: no sale, no delivery, no accounts, on-device prescription scan with immediate discard.
- Method: primary sources fetched directly (lawphiL.net consolidated texts, privacy.gov.ph, fda.gov.ph, officialgazette.gov.ph where reachable). Claims are cited to the instrument that owns them. Where a point could not be verified in a primary source it is listed under "Uncertainty", not stated as fact.

---

## TL;DR — the five findings that shape the product

1. **Prescription (Rx) medicines cannot be advertised or promoted to the general public in the Philippines.** Only FDA-registered OTC products may be advertised to the public; Rx/ethical drugs may only be advertised in medical journals/professional literature. This is stated in FDA Advisory No. 2022-0108, which invokes AO No. 65 s. 1989, Sec. 2, and RA 7394 Art. 108. Whether a **neutral, non-promotional price/availability listing** is "advertising" within this ban is untested; it is Pharmassist's single biggest legal risk and should be validated with FDA before launch.
2. **Price transparency itself is state policy, and pharmacies already publish prices by law.** The Generics Act (as amended by RA 9502) requires drug outlets to inform buyers of same-generic alternatives *with prices* and to post those lists; UHC (RA 11223) Sec. 28(c)–(d) requires drug outlets and providers to make prices readily accessible. A price map aligns with this direction, but it does not carve out an exemption from the advertising rules.
3. **A scanned prescription is sensitive personal information** (health data) under RA 10173 Sec. 3(l)(2). The only clean lawful basis for the scan flow is explicit, specific consent (Sec. 13(a)); the "medical treatment" exception (Sec. 13(e)) belongs to medical practitioners/institutions, not an app. On-device OCR with no server transmission/storage is therefore not optional — it is the compliance design. If any prescription data ever leaves the device, full DPA machinery (security, DPO, registration, breach notification, subcontracting) attaches.
4. **Pharmacy names, branch addresses, prices and stock are not personal data**, so publishing them does not need pharmacy consent under the DPA — but accuracy is regulated (RA 7394 Arts. 110–111 on false/misleading advertising and price comparisons), and any personal data encountered along the way (staff names, reviews, sole proprietor records, scraped pages) is protected (NPC Advisory No. 2026-01).
5. **v1 must not sell, order, or deliver anything.** Only FDA-licensed outlets may sell medicines, Rx dispensing requires a licensed pharmacist and a valid prescription, and operating an unlicensed "online pharmacy service" is a penal offense (RA 10918 Secs. 30, 33, 45(p)). Pharmassist's "no Buy button" posture is a legal requirement, not just a scope choice.

---

## 1. FDA rules on advertising/promoting prescription medicines

### 1.1 The statutory base

- **RA No. 9711 (FDA Act of 2009)** gives the FDA the power to "prescribe standards, guidelines, and regulations with respect to information, advertisements and other marketing instruments and promotion, sponsorship, and other marketing activities about the health products" — RA 9711 Sec. 5 (amending Sec. 4(o) of RA 3720). Source: RA 9711, Congress of the Philippines, approved 2009-08-18, https://lawphil.net/statutes/repacts/ra2009/ra_9711_2009.html.
- RA 9711 makes it a prohibited act to manufacture, sell, promote, advertise or sponsor any health product that is "adulterated, unregistered or misbranded" (Sec. 11(a), (j)), with criminal and administrative penalties (Sec. 12 as amended; Sec. 29-A administrative sanctions: cancellation/suspension of authorizations, fines ₱50,000–₱500,000 plus ₱1,000/day of continuing violation). Same source.
- "Authorization" under RA 9711 expressly covers "promotion, advertising, or sponsorship" of health products (Sec. 10(y) of RA 3720 as amended). Same source.

### 1.2 The ban on advertising prescription drugs to the public — the key instrument

- **FDA Advisory No. 2022-0108, "Reiteration of Warning Against the Promotion and Advertisement of Prescription Drug Products"** (issued February 2022; first Web Archive capture 2022-02-10):
  - "the promotion and advertisement of prescription drugs in the country is prohibited and punishable by law" — invoking Article 108 of RA 7394 (Consumer Act) and Sec. 2 of **Administrative Order No. 65 s. 1989, "Guidelines on Advertisement and Promotions to Implement the Generics Act of 1988"** (the AO itself was not directly retrievable; it is cited verbatim in this advisory).
  - "Only FDA-registered non-prescription or over-the-counter drug products can be advertised or promoted to the general public under the existing regulations. Except through medical journals, publications, or literature exclusively meant for medical and associated professionals, no pharmaceutical product categorized as a prescription or ethical drug shall be advertised or promoted in any form of mass media."
  - The advisory explicitly names "online selling platforms and social media market places" as covered mass media.
  - On online sales: "FDA only allows online ordering and delivery services provided that the seller has an existing licensed-pharmacy with physical address... The patient or customer is required to present a prescription or e-prescription upon ordering of any prescription drug."
  - Source: FDA (Philippines), https://web.archive.org/web/20240420050426/https://www.fda.gov.ph/fda-advisory-no-2022-0108-reiteration-of-warning-against-the-promotion-and-advertisement-of-prescription-drug-products/ (original: fda.gov.ph, retrieved via Web Archive 2026-10-19).
- **Administrative Order No. 2015-0053, "Implementing Guidelines on the Promotion and Marketing of Prescription Pharmaceutical Products and Medical Devices"** governs industry promotion. Key reiterated rule: "No PPPMD company shall employ or contract any HCP or health worker to promote, advertise or endorse any pharmaceutical product or medical device in mass media, print, audiovisual display, or social media" (Sec. V.B.2.e); FDA may post-audit promotional materials and issue cease-and-desist orders (Sec. V.B.2.g). Source: reiterated in **FDA Advisory No. 2022-2045, "Reiteration Against Unethical Business Practices Related to the Promotion of Prescription Pharmaceutical Products and Medical Devices"**, FDA, published January 2023, https://www.fda.gov.ph/fda-advisory-no-2022-2045-reiteration-against-unethical-business-practices-related-to-the-promotion-of-prescription-pharmaceutical-products-and-medical-devices/.

### 1.3 What this means for Pharmassist

- Publishing **prices/stock of Rx medicines** to consumers is not the same thing as *promoting* them, but a comparison UI is a public, mass-media vehicle. The FDA has not (as of this research) issued any guidance blessing price-comparison information for Rx products. Treat the presentation as the regulated surface: neutral, factual, no persuasive claims, no "best deal" language on Rx items, clear OTC/Rx labeling. Validate with FDA (CDRR) and counsel before pilot launch.
- Never list an **unregistered** product: RA 9711 Sec. 11(j) prohibits promoting/advertising unregistered health products, and RA 7394 Art. 112(f) prohibits advertising any drug not duly registered/approved. The catalog should be built from, and reconciliable with, the **FDA Verification Portal** (https://verification.fda.gov.ph/).

---

## 2. Publishing prices, price transparency, and stock

### 2.1 Pharmacy-side price publication is already mandatory

- **Generics Act of 1988 (RA 6675) Sec. 6(d), as amended by RA 9502 Sec. 38**: drug outlets "shall inform any buyer about any and all other drug products having the same generic name, together with their corresponding prices" and "shall post in conspicuous places in their establishments a list of drug products with the same generic name and their corresponding prices."
- **RA No. 9502 (Universally Accessible Cheaper and Quality Medicines Act of 2008) Sec. 37** (amending RA 6675 Sec. 5): DOH publishes annually the generic names and corresponding brand names of medicines available in the Philippines.
- Sources: RA 9502, approved 2008-06-06, https://lawphil.net/statutes/repacts/ra2008/ra_9502_2008.html; RA 6675 as amended (quoted in RA 9502).

### 2.2 Maximum Drug Retail Price (MDRP)

- **Executive Order No. 821 (2009-07-27)** imposed Maximum Drug Retail Prices on named active ingredients and preparations (amlodipine, atorvastatin, azithromycin, cytarabine, doxorubicin in the initial list) and provides: the MDRP applies to all retail outlets public and private; "No public or private entity or person shall be allowed to sell, reimburse, or demand from the public or patients payment or compensation higher than the MDRP"; the list is subject to periodic review. Source: EO No. 821, Official Gazette/Malacañang, https://lawphil.net/executive/execord/eo2009/eo_821_2009.html.
- **RA 9502 Sec. 26**: outlets must display the retail price (not exceeding the MDRP) with the words "RETAIL PRICE NOT TO EXCEED" and "UNDER DRUG PRICE REGULATION" on a red strip; manufacturers/traders must issue price lists. **Sec. 30(d)**: "All drug outlets are required to post in a conspicuous area within its premises a clear copy of the order." **Sec. 19(F)**: retailers must furnish DOH an annual list with prices and inventory of all drugs they retail. **Sec. 27**: LGUs and DTI submit quarterly price monitoring reports to DOH. Source: RA 9502 (above).
- **RA No. 11223 (Universal Health Care Act) Sec. 28**: (c) health care providers and facilities "shall be required to make readily accessible to the public and submit to DOH and PhilHealth, all pertinent, relevant, and up-to-date information regarding the prices of health services, and all goods and services being offered"; (d) "Drug outlets shall be required at all times to carry the generic equivalent of all drugs in the Primary Care Formulary and shall be required to provide customers with a list of therapeutic equivalents and their corresponding prices when fulfilling prescriptions or in any transaction." Sec. 4(k)(4) defines pharmacies/drug outlets as health care providers. Source: RA 11223, approved 2019-02-20, https://lawphil.net/statutes/repacts/ra2019/ra_11223_2019.html.

### 2.3 What this means for Pharmassist

- The service is **directionally aligned with national policy**: patients seeing prices is exactly what these laws push pharmacies to do. Pharmassist is not the seller, so the posting obligations in RA 9502/Generics Act do not directly bind it — but it should mirror them: when an item is under MDRP, show the MDRP ceiling; nationally published price data (DOH) can anchor "reference" prices.
- Displayed prices should be labeled as **shelf/retail prices as verified** and must carry a last-verified date, because stale or wrong prices invite accuracy challenges (see section 7 on consumer protection).

---

## 3. Prescription handling, dispensing, OCR

### 3.1 Only licensed outlets and pharmacists may dispense

- **RA No. 10918 (Philippine Pharmacy Act, 2016)**:
  - Sec. 30: "No pharmaceutical product... shall be compounded, dispensed, sold or resold, or otherwise be made available to the consuming public, except through a retail drug outlet duly licensed by the FDA." "Prescription drugs and pharmacist-only OTC medicines shall be dispensed only by a duly registered and licensed pharmacist."
  - Sec. 33: "Prescription medicines may be dispensed only by a duly registered and licensed pharmacist and only with a valid prescription of a physician, dentist, or veterinarian." Prescriptions must be filled by a pharmacist; completely filled prescriptions are surrendered for recording.
  - Sec. 31: Category A outlets (those selling Rx/pharmacist-only OTC) require a pharmacist's direct control "whether in-store or online"; online pharmacy services are defined as pharmaceutical services of a duly licensed outlet done over the internet (Sec. 5(dd)); telepharmacy is a Category B activity (Sec. 31(b)(4)).
  - Sec. 37: all dispensed prescriptions are recorded in a patient medication profile including "the name and address of the patient" and must be kept for at least 2 years and be open to FDA/Board inspection.
  - Penalties: Sec. 44(n) (revocation/suspension for "unauthorized dispensing... through unregistered online services or direct selling"); Sec. 45(p) (fining/imprisonment for "operating an unlicensed pharmaceutical outlet such as online pharmacy service or direct selling not authorized by the FDA").
  - Source: RA 10918, approved 2016-07-21, https://lawphil.net/statutes/repacts/ra2016/ra_10918_2016.html.
- **RA 9502 Sec. 43** (amending Sec. 25 of the old Pharmacy Law): no medicine except non-prescription/OTC may be sold "except through a prescription drugstore or hospital pharmacy." Source: RA 9502 (above).

### 3.2 The FDA's online-dispensing rule of thumb

- From FDA Advisory No. 2022-0108: online ordering/delivery of medicines is allowed only where the seller has an **existing licensed pharmacy with a physical address**, the service is an additional approved activity of that pharmacy, and a **prescription or e-prescription must be presented when ordering an Rx drug**. Source: as in section 1.2.

### 3.3 OCR of prescriptions = processing sensitive personal information

- A prescription typically carries the patient's name, age, prescriber, and medicine list. "Health" data is sensitive personal information under RA 10173 Sec. 3(l)(2) and under the DPA IRR Sec. 3(t)(2). Reading, extracting, using (even transiently) that image is "processing" (RA 10173 Sec. 3(j): collection, recording, consultation, use, erasure; DPA IRR Sec. 3(o)).
- Lawful bases for sensitive personal information are narrow (RA 10173 Sec. 13; DPA IRR Rule V Sec. 22): consent specific to the purpose is the workable one here; the "medical treatment" exception applies where processing "is carried out by a medical practitioner or a medical treatment institution" (Sec. 13(e)/IRR Sec. 22(e)) — Pharmassist v1 is neither. The "vital interests" and "legal claims" exceptions do not fit a convenience scan.
- NPC guidance on consent is **NPC Circular No. 2023-04, "Guidelines on Consent"** (07 November 2023), https://privacy.gov.ph/wp-content/uploads/2023/11/NPC-Circular-No.-2023-04_Guidelines-on-Consent_07Nov2023.pdf. Core requirements track the DPA/IRR: consent must be freely given, specific, informed, evidenced (written/electronic/recorded), obtained before processing, and withdrawable; purpose must be declared; consent must not be bundled with unrelated purposes (see DPA IRR Sec. 19(a), Rule IV).

### 3.4 What this means for Pharmassist

- v1 must not dispense, order, broker, or deliver; it informs only. No "Buy", "Reserve", or "Order" affordances on Rx items.
- The scan flow should be **consent-first, on-device, transitory**: capture → OCR on device → user confirmation → discard image and OCR text; no uploads, no server logs, no analytics on prescription content, patient identifiers not needed (ignore/strip them if the OCR captures them). This is also consistent with the v1 decision "no server-side prescription storage."
- If a future version moves OCR server-side or stores scans, the design must be re-reviewed under the full DPA machinery (section 4) before any deployment.

---

## 4. Data Privacy Act obligations (prescription images and health data)

### 4.1 The Act and IRR

- **RA No. 10173 (Data Privacy Act of 2012)**, approved 2012-08-15, https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html, and its IRR, https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/. Key provisions:
  - Sensitive personal information includes health data (Sec. 3(l)(2); IRR Sec. 3(t)(2)).
  - Processing sensitive PI is **prohibited** except on specified grounds — principally prior specific consent (Sec. 13(a); IRR Sec. 22(a)); medical-treatment (Sec. 13(e); IRR Sec. 22(e)); existing law (Sec. 13(b)); court/legal claims (Sec. 13(f)).
  - General principles: transparency, legitimate purpose, proportionality; data must be adequate, relevant, not excessive, kept accurate, retained no longer than necessary (Sec. 11; IRR Secs. 17–19).
  - Data subject rights: information, objection, access, correction, erasure/blocking, damages, portability (Secs. 16–18).
  - Security obligations and breach notification to the NPC and affected data subjects when sensitive PI is likely compromised (Sec. 20; IRR Rule VI and Rule IX). Breach management details: **NPC Circular No. 16-03, "Personal Data Breach Management"**, https://privacy.gov.ph/wp-content/uploads/2022/01/sgd-npc-circular-16-03-personal-data-breach-management.pdf.
  - Accountability: designate a responsible person (Sec. 21); NPC Circular No. 17-01 and **NPC Circular No. 2022-04, "Registration of Personal Data Processing System, Notification Regarding Automated Decision-Making or Profiling, Designation of Data Protection Officer, and the NPC Seal of Registration"**, https://privacy.gov.ph/wp-content/uploads/2023/05/Circular-2022-04-2.pdf (registration through the NPC Registration System; NPC has repeatedly reminded PICs/PIPs that registration has been mandatory since 2017 and that DPS/DPO registration is due within 20 days of implementation — NPC homepage announcement, privacy.gov.ph, retrieved 2026-10-19).
  - Subcontracting: PIC remains responsible; written agreements and processor duties apply (Sec. 14; IRR Rule X).
  - Penalties include imprisonment and fines (e.g., unauthorized processing of sensitive PI: 3–6 years and ₱500,000–₱4,000,000; unauthorized disclosure of sensitive PI: 3–5 years and ₱500,000–₱2,000,000) (Secs. 25, 32).
- Security detail if data is stored: **NPC Circular No. 2023-06, "Security of Personal Data in the Government and the Private Sector"** (2023), https://privacy.gov.ph/wp-content/uploads/2024/03/NPC-Circular-Repeal-16-01-Signed.pdf. Administrative fines: **NPC Circular No. 2022-01, "Guidelines on Administrative Fines"**, https://privacy.gov.ph/wp-content/uploads/2022/08/NPC-CIRCULAR-NO.-2022-01-GUIDELINES-ON-ADMINISTRATIVE-FINES-dated-08-AUGUST-2022-w-SGD.pdf.
- Automated/OCR and AI processing: **NPC Advisory No. 2024-04, "Guidelines on the Application of [the DPA]... to Artificial Intelligence Systems Processing Personal Data"** (December 2024), https://privacy.gov.ph/wp-content/uploads/2025/02/Advisory-2024.12.19-Guidelines-on-Artificial-Intelligence-w-SGD.pdf — expect transparency, lawful basis, data-minimization-by-design, risk assessments (PIA/DPIA), and human oversight expectations for AI systems handling personal data.
- Scraping/aggregating publicly available data: **NPC Advisory No. 2026-01, "Guidelines on Data Scraping of Publicly Available Personal Data"** (April 2026), https://privacy.gov.ph/wp-content/uploads/2026/04/SGD_A_1.pdf — public availability does not automatically make scraping lawful; legitimate-purpose and proportionality apply when personal data (e.g., a sole proprietor's name attached to a pharmacy page, or staff named in posts) is involved.
- Legitimate interest: **NPC Circular No. 2023-07, "Guidelines on Legitimate Interest"** (13 December 2023), https://privacy.gov.ph/wp-content/uploads/2024/01/NPC-Circular-No.-2023-07_Guidelines-on-Legitimate-Interest_13-December-2023.pdf. Note: legitimate interest is a basis for *personal information*, not a substitute for the Sec. 13 grounds for *sensitive* PI — do not rely on it for prescription data.

### 4.2 What this means for Pharmassist

- v1 has no accounts and stores nothing server-side: the DPA surface is the scan flow. The compliant design is: explicit consent screen before camera use; process on-device; extract only medicine names/strengths; never transmit or store the image, the OCR text, or the patient identifiers; give a privacy notice; appoint a DPO and register the processing system; publish a breach playbook even if the surface is minimal.
- Do not use prescription content for any purpose other than the immediate basket session (no training, no analytics, no "popular prescriptions" features) without a new lawful basis and a new DPIA.

---

## 5. Publishing pharmacy names, locations, prices and stock without a partnership

- **No statute requires pharmacy consent to publish business names, branch addresses, operating hours, shelf prices, or stock status.** The DPA protects *personal* data of natural persons (RA 10173 Sec. 3(g); IRR Sec. 3(l)); a pharmacy's business data is not personal data, and even the business name of a sole proprietorship is not per se sensitive. But any personal data encountered (owner/staff names, photos with identifiable people, user reviews naming staff) falls under the DPA and NPC Advisory No. 2026-01 if scraped.
- **Accuracy rules bind what is published**: RA 7394 Art. 110 makes false, deceptive or misleading advertisements unlawful where they induce or are likely to induce purchase; under Art. 110's second paragraph, failure to reveal material facts (e.g., "price verified on [date]", "subject to stock availability") can itself be misleading. Art. 111 regulates comparative price advertising by sellers (90-day benchmark etc.); if Pharmassist ever runs comparative price claims in its own marketing (e.g., "save X% at pharmacy Y"), those conditions and Art. 7394 Art. 115 (substantiation of special claims) apply.
- **Health-product advertising is additionally restricted**: RA 7394 Art. 112(f) — no advertising of any drug unless duly registered/approved; this reinforces the need to verify FDA registration per SKU. Enforcement is by DOH for food/drugs (Art. 109).
- **No implied endorsement**: do not suggest FDA/DOH/LGU/CHO endorsement or pharmacy "partnerships" until a real agreement exists; misleading affiliation is the same false-advertising surface.
- **Interoperability with pharmacy records**: Pharmassist never touches pharmacy patient records in v1; the pharmacy's own recording duties (RA 10918 Sec. 37) stay with the pharmacy.

---

## 6. LGU and City Health Office data sharing

- **Government-to-government data sharing requires a Data Sharing Agreement** where personal data is shared for a public function: DPA IRR Rule IV Sec. 20(d); the governing issuance is **NPC Circular No. 2020-03, "Data Sharing Agreements"** (21 December 2020, amending NPC Circular 16-02), https://privacy.gov.ph/wp-content/uploads/2021/01/Circular-Data-Sharing-Agreement-amending-16-02-21-Dec-2020-clean-copy-FINAL-LYA-and-JDN-signed-minor-edit.pdf, clarified by **NPC Advisory No. 2025-01, "Clarification on Certain Provisions of NPC Circular No. 2020-03 on Data Sharing Agreements"** (July 2025), https://privacy.gov.ph/wp-content/uploads/2025/07/SGD-2025-01-DSA-Clarification.pdf.
- Health data held by a City Health Office about patients (e.g., program records) is sensitive personal information; sharing it with a private service requires a lawful basis (statute, or specific consent) and a DSA with safeguards. Aggregate, de-identified public-health data (e.g., "Naga has N dengue cases") is not personal data and can be shared without a DSA.
- **UHC Act institutional context**: city-wide health systems are overseen by the City Health Board, and the city manages the Special Health Fund (RA 11223 Secs. 19–20). A CHO partnership should be structured through the City Health Board/city government as a procurement/cooperation matter, with the DSA reviewed by the city's DPO.
- LGU-specific ordinances (e.g., Naga City data privacy or health ordinances) were **not verified** in this research — check with the Naga City LGU/counsel before signing anything (see Uncertainty).

---

## 7. E-commerce and consumer-protection requirements

- **RA No. 8792 (E-Commerce Act of 2000)**: electronic documents/data messages have legal effect and can satisfy writing/retention requirements (Secs. 6–13); DTI is empowered to run an "online public information and quality and price monitoring system for goods and services" (Sec. 29); consumer-protection violations committed through electronic means carry the same penalties (Sec. 33(c)). Source: RA 8792, approved 2000-06-14, https://lawphil.net/statutes/repacts/ra2000/ra_8792_2000.html.
- **RA No. 7394 (Consumer Act of the Philippines)**: Art. 81 — it is unlawful to offer any consumer product for retail sale without a price tag/label/marking publicly displayed, and products may not be sold above the tagged price; Arts. 82–83 prescribe clear placement. Art. 108/110 — false/deceptive/misleading advertising is unlawful; Art. 111 — rules for comparative price advertising; Art. 112 — special advertising requirements for drugs (registration prerequisite, no unapproved claims). Arts. 81–83 bind *retail sellers* (the pharmacies), but Pharmassist's own price displays should mirror the same standard of clarity and accuracy. Source: RA 7394, approved 1992-04-13, https://lawphil.net/statutes/repacts/ra1992/ra_7394_1992.html.
- **RA No. 11967 (Internet Transactions Act of 2023)**: covers B2B and B2C internet transactions where a party is in the Philippines or the platform targets the Philippine market (Sec. 3); e-retailers must publish corporate/trade name, physical address, and contact details (Sec. 23(f)) and indicate price consistent with RA 7394 Art. 81 (Sec. 23(a)); e-marketplaces/digital platforms have due-diligence, listing-verification, and data-privacy duties (Secs. 21–22); DTI's E-Commerce Bureau enforces with fines and takedown/blacklist powers (Secs. 14–16, 29); 18-month transitory period for compliance (Sec. 32). Source: RA 11967, approved 2023-12-05, https://lawphil.net/statutes/repacts/ra2023/ra_11967_2023.html.
- **Application to Pharmassist v1**: v1 performs no sale, lease, or delivery, so the e-retailer/e-marketplace obligations do not clearly attach (see Uncertainty). But the posture should be kept transaction-free: no cart, no payment, no delivery promises, no "order" buttons, no sponsored ranking. If the roadmap later adds booking/ordering or paid placement, RA 11967 compliance (registration, disclosures, redress) re-opens.

---

## 8. Statutory discounts (why displayed prices are not the price all patients pay)

- **Senior citizens**: 20% discount and VAT exemption on the purchase of medicines (RA 9994 Sec. 4(a)(1); IRR Art. 7 Sec. 1(a)); proof of entitlement is the OSCA ID, passport, or other qualifying documents (RA 9994 Sec. 4, last paragraphs). Source: RA 9994, approved 2010-02-15, https://lawphil.net/statutes/repacts/ra2010/ra_9994_2010.html.
- **Persons with disability**: at least 20% discount on the purchase of medicines in all drugstores (RA 9442 Sec. 32(c), amending RA 7277). Source: RA 9442, approved 2007-04-30, https://lawphil.net/statutes/repacts/ra2007/ra_9442_2007.html.
- The paper "purchase booklet" requirement for the senior discount was discontinued: **DOH Administrative Order No. 2024-0017** and **FDA Circular No. 2025-005, "Delisting of Purchase Booklet from the Checklist of Requirements to Avail of the 20% Senior Citizen Discount..."** (04 September 2025), https://www.fda.gov.ph/fda-circular-no-2025-005-delisting-of-purchase-booklet-from-the-checklist-of-requirements-to-avail-of-the-20-senior-citizen-discount-on-the-purchase-of-medicines-and-medical-devices-in-accordance-w/.
- **Implication**: the shelf price Pharmassist displays is the undiscounted retail price. The UI should disclose that senior/PWD discounts (and their VAT exemption) are applied at the point of sale and are not reflected in the displayed price, so the "cheapest" ranking is understood as a shelf-price ranking. Do not compute or advertise net-of-discount prices without a verified rule engine (mixing them up is a false-price risk under RA 7394).

---

## 9. Confirmed facts vs uncertainty

### Confirmed (primary sources above)

1. Rx/ethical drugs may not be advertised or promoted to the general public in mass media; only FDA-registered OTC drugs may be. (FDA Advisory No. 2022-0108; AO 65 s. 1989 Sec. 2 as cited therein.)
2. FDA regulates advertisements/promotions of health products and can sanction promotion of unregistered products; advertising of unregistered drugs is prohibited. (RA 9711 Secs. 5(o), 11(j); RA 7394 Art. 112(f).)
3. Drug outlets must publish same-generic alternatives with prices, and providers must make prices accessible. (RA 9502 Sec. 38 amending RA 6675 Sec. 6(d); RA 11223 Sec. 28(c)–(d).)
4. MDRP exists by executive order for a defined list; outlets must display/post it; selling above it is prohibited. (EO 821 (2009); RA 9502 Secs. 19(F), 26, 27, 30(d).)
5. Only FDA-licensed outlets and licensed pharmacists may dispense Rx medicines, with a valid prescription; unlicensed online pharmacy/direct-selling operations are penalized. (RA 10918 Secs. 30, 33, 44(n), 45(p); RA 9502 Sec. 43.)
6. FDA currently allows online ordering/delivery only for a licensed pharmacy with a physical address, with prescription/e-prescription required for Rx items. (FDA Advisory No. 2022-0108.)
7. Prescription data is sensitive personal information; processing requires consent or another Sec. 13 ground; on-device, consent-based, minimalist design is the compliance path for v1. (RA 10173 Secs. 3(l)(2), 11–14, 20; DPA IRR Rule IV Secs. 17–20, Rule V Sec. 22, Rule VII; NPC Circular 2023-04.)
8. Breach notification, registration/DPO, security standards, subcontracting, and administrative-fine regimes are in force. (RA 10173 Secs. 14, 20, 21; DPA IRR Rules VI, IX, X, XI; NPC Circulars 16-03, 2022-01, 2022-04, 2023-06.)
9. Government data sharing involving personal data requires a DSA; NPC Circular 2020-03 governs, clarified by NPC Advisory 2025-01. (DPA IRR Rule IV Sec. 20(d).)
10. Consumer protection: price-tag, false-advertising, comparative-price and drug-advertising rules all apply to the market Pharmassist describes; the e-Commerce Act validates electronic documents and preserves consumer penalties. (RA 7394 Arts. 81–83, 108–112, 115; RA 8792 Secs. 6–13, 29, 33(c).)
11. RA 11967 imposes internet-transaction duties on e-retailers/platforms (identity/price disclosures, redress, privacy) with DTI enforcement and an 18-month transitory period. (RA 11967 Secs. 3, 21–23, 29, 32.)
12. Senior and PWD 20% medicine discounts are statutory and applied at purchase; the senior purchase-booklet requirement has been removed. (RA 9994 Sec. 4(a)(1); RA 9442 Sec. 32(c); FDA Circular 2025-005.)

### Uncertainty (do not encode as fact; verify before relying on it)

1. **Whether a neutral price/availability listing for Rx drugs is "advertising/promotion" under AO 65 s. 1989 / FDA Advisory 2022-0108.** No FDA issuance addresses price-comparison services directly. Recommend a written FDA (CDRR) clarification and counsel opinion before pilot; design defensively in the meantime.
2. **The current MDRP list and any successor price instruments.** EO 821 (2009) is the instrument found; DOH has since published reviews/reports whose current status was not verified in this research. Verify the live list with DOH/FDA before seeding MDRP flags.
3. **Whether Pharmassist needs an FDA advertising/promotion authorization for any public content beyond OTC product names.** RA 9711's authorization concept covers promotion of health products; how it applies to a price-list service is untested. Verify with FDA.
4. **RA 11967 IRR status and whether a non-transacting aggregator is a "digital platform" or "e-marketplace" under the Act.** The statutory text suggests coverage follows transactions, not listings, but DTI's implementing guidance (and its view of aggregators) was not fetched/verified here.
5. **Naga City / Camarines Sur local ordinances** (data privacy, health, business) and the practical availability of CHO datasets were not verified. Check with local counsel and the City Health Board before any partnership.
6. **NPC guidance specific to price-comparison or health-listing services** was not found; the closest instruments are NPC Advisory 2026-01 (scraping) and NPC Advisory 2024-04 (AI). Consider an NPC advisory opinion (procedure: NPC Circular 18-01).
7. **AO 65 s. 1989 and AO 2015-0053 full texts** were cited through FDA Advisories 2022-0108 and 2022-2045 (direct PDFs not text-extractable in this session).
8. **Trademark/name clearance for "Pharmassist"** in the Philippines — flagged in the project map as a separate item; not researched here.

---

## 10. PRD constraints to encode

Concrete requirements/restrictions for `docs/PRD.md` v1.0:

1. **No promotion of prescription medicines.** The app presents factual price/availability information; no persuasive marketing, no efficacy/safety claims, no "best medicine" or deal language on Rx items; OTC vs Rx products are visually distinct; the app never implies FDA, DOH, LGU, or pharmacy endorsement. Obtain an FDA/CDRR opinion on the launch presentation.
2. **Catalog integrity = FDA registration.** Only FDA-registered products are listable; each SKU carries a registration reference checkable against the FDA Verification Portal; unregistered/withdrawn products are purged on discovery (RA 9711 Sec. 11(j); RA 7394 Art. 112(f)).
3. **Price display rules.** Show shelf price with currency, pack/strength/form context, pharmacy identity, and "last verified" date; show the MDRP ceiling where applicable and flag listings above it; never show a computed "senior/PWD net price" — instead disclose that statutory discounts apply at the point of sale.
4. **No transactions, ever (v1).** No cart, order, reservation, payment, or delivery features; coverage and UI must not make Pharmassist an "online pharmacy service" or "direct selling" operation (RA 10918 Secs. 30, 33, 45(p)); the counter for Rx items is the pharmacy's licensed pharmacist.
5. **Scan flow privacy design.** Explicit, specific consent/notice before camera/OCR; on-device OCR only; no upload/storage of images, OCR text, or patient identifiers; strip/ignore patient identifiers in the extracted results; clear "your photo is processed on your phone and not saved" disclosure; withdrawal = nothing retained. No accounts in v1.
6. **No secondary use of scan data.** No training, analytics, or product-insight use of prescription content; session-only basket; deletion on demand/session end. Future server-side features require a new legal basis, DPIA, and (per NPC guidance) security and registration updates first.
7. **Data protection compliance baseline.** DPO designated; processing systems registered with the NPC; privacy notice and consent copy reviewed against NPC Circular 2023-04; breach response playbook per NPC Circular 2016-03; security measures per NPC Circular 2023-06; AI/OCR risk assessment aligned to NPC Advisory 2024-04; API/model vendors (if any) treated as processors with written terms (DPA Sec. 14; IRR Rule X).
8. **Pharmacy-data publication policy.** Publish only business facts (name, branch address, hours, phone, prices, stock status, verification date); no personal data of pharmacists/staff; corrections workflow with SLA; no scraping of personal data (NPC Advisory 2026-01); attribution to public sources where used.
9. **LGU/CHO interface rules.** Aggregate/de-identified data only in v1; any patient-level or personal data sharing requires a DSA (DPA IRR Sec. 20(d); NPC Circular 2020-03; NPC Advisory 2025-01) and city legal/DPO review; route partnerships through the City Health Board/UHC city-wide system structure.
10. **Accuracy controls (consumer protection).** "Cheapest" claims must be defined (complete basket at one pharmacy), based on the seeded dataset, time-stamped, and corrigible; wrong-price reporting flow promised in the PRD must actually gate stale data (RA 7394 Arts. 110–111); prices are labeled "reference shelf price".
11. **If scope changes, re-open compliance.** Any future sale/ordering/paid placement/post-pilot monetization triggers RA 11967 duties (identity/price disclosures, redress, registration), plus a fresh DPA assessment for accounts and direct marketing; record these as blockers in the PRD roadmap.
12. **Advice line.** Nothing in the product gives dosage, substitution, or treatment guidance; generic-vs-brand equivalence statements stay descriptive (no therapeutic-equivalence claims without FDA/formulary basis).
