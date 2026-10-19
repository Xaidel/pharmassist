# 03 — Medicine catalog and generic-equivalence data

**Ticket:** [03-medicine-catalog-data.md](../issues/03-medicine-catalog-data.md)  
**Researched:** 19 October 2026  
**Status:** Complete

---

## Question

What authoritative or licensable data sources can supply the pilot's medicine catalog — brand name, generic name, dosage form, strength, pack size, manufacturer, and generic-equivalence groupings — for 50 medicines across 10 pharmacies in the Philippines? Evaluate the FDA Philippines drug registry, DOH and PhilHealth references, MIMS Philippines, commercial drug databases, and open datasets. Recommend a primary source and a fallback.

---

## Bottom line

- **Primary source: the FDA Philippines Verification Portal's registered drug-product records**, supplemented by the **DOH Philippine National Formulary (PNF/EML)** for canonical generic names and essential-medicine status.
- The FDA portal is free, authoritative, current, and supplies brand, generic, dosage form/strength, packaging, manufacturer, registration number, and expiry. It does **not** provide a clean `pack_size` field or any official generic-equivalence grouping, has **no documented bulk API or open-data licence**, and rate-limits repeated queries.
- **Fallback: a licensed MIMS Philippines data/API agreement.** MIMS is the most complete Philippines-specific brand-level directory identified in this pass and has continuous editorial updates, but its standard website and API terms prohibit copying, scraping, database-building, and AI/ML use. Pricing is quote-only. A bespoke written licence is required.
- **No source reviewed provides an official brand-to-brand "generic equivalence" table.** Candidate groups must be derived from generic name + strength + dosage form, then reviewed by a pharmacist. Treat them as "candidate generic alternatives", not automatic therapeutic equivalents.
- **PhilHealth is a reference publisher, not a product catalog.** It hosts the PNF-EML and uses the ePNF for financing, but does not publish a brand-level medicine master.
- **The DOH Drug Price Reference Index (DPRI)** is useful for public-sector price benchmarking only; it is not a brand/product catalog.
- **Open Data Philippines did not yield a medicine catalog** in this pass. The portal is a JavaScript app whose dataset API requires a client key; no relevant dataset was confirmed.
- For a 50-medicine pilot, free FDA data plus pharmacist curation is feasible. The real work is mapping each pharmacy's actual brand/pack assortment, not enumerating 50 generic molecules.

---

## Method and access notes

- Reviewed official portals and terms on **19 October 2026**.
- Downloaded and parsed the PNF-EML PDF and the 2021 DPRI PDF; queried the public FDA Verification Portal search endpoint used by its front-end.
- **Access limitations encountered:** `doh.gov.ph` returned HTTP 403 to this client; `pnf.doh.gov.ph` and `pharma.doh.gov.ph` did not resolve; `dpri.doh.gov.ph` returned HTTP 403. PhilHealth and the DOH Cordillera (CAR) regional site were accessible and are used as mirrors where noted.
- The FDA endpoint returned HTTP 429 under repeated queries; findings below reflect successful queries made with pauses.
- This note is research, not legal advice. Licensing conclusions should be checked by counsel before launch.

---

## Findings by source

### 1. FDA Philippines — Verification Portal / registered drug products

**What it is.** The FDA Verification Portal is the agency's public lookup for FDA-registered health products and licensed establishments. Drug product records sit under the Center for Drug Regulation and Research (`cdrr`) category. It is accessible without login at <https://verification.fda.gov.ph/>.

**Confirmed fields.** The portal's front-end calls an undocumented JSON endpoint:

```text
GET https://verification.fda.gov.ph/api/search?q=<term>
```

Successful responses contain arrays for multiple product categories, including `cdrr`. Each `cdrr` record exposes:

| Field | Example |
|---|---|
| `registration_number` | `DRHR-638` |
| `generic_name` | `Paracetamol` |
| `brand_name` | `Biogesic` |
| `dosage_strength_form` | `500 mg Tablet` |
| `classification` | `Over-the-Counter (OTC) Drug` |
| `packaging` | `Alu/PVC Blister Pack (Box of 500's); Alu/PVC Blister Pack (Box of 10's)` |
| `manufacturer` | `UNILAB, Inc.` |
| `country_of_origin` | `Philippines` |
| `trader`, `importer`, `distributor` | separate fields |
| `app_type` | `Renewal` |
| `issuance_date`, `expiry_date` | `05 January 2023`, `02 April 2028` |
| `pharmacologic_category` | `Analgesic/Antipyretic` |

A search for `biogesic` returned 13 records, including the 500 mg tablet, 120 mg/5 mL suspension, and `Biogesic 325`. A search for `amoxicillin` returned 352 records in one response. A search for `diclofenac` returned 128 records. These are **product-level** records: one row per registration/brand/strength/pack configuration, not one row per molecule.

**Coverage and currency.** The portal covers FDA-registered human drug products, including prescription and OTC, locally manufactured and imported. In the `diclofenac` query, all 128 records had expiry dates on or after 25 October 2026 and **none were expired** at access; records with 2026 issuance dates were also present. This is consistent with a live registry of currently valid Certificates of Product Registration (CPRs), not a historical archive. *Uncertainty:* we did not verify whether withdrawn/expired records are ever returned, or whether every registered pack variant is represented.

**Pack size and identifiers.** `packaging` is free text and often contains multiple pack configurations in one record. Some records have an empty `packaging` string (observed in a paracetamol combination record). There is **no normalized `pack_size`** field, and no GTIN/barcode. `dosage_strength_form` is also a combined free-text field; strength and form must be parsed. Data-quality issues exist: observed typos include `Trihdyrate` and `Analegsic`.

**Generic-equivalence groupings.** The registry has **no equivalence-group field**. `generic_name` is the natural grouping key, but it contains salts/hydrates and free-text variations (e.g., `Amoxicillin (as trihydrate)` vs `Amoxicillin (as Trihdyrate)`), and combination products are separate rows. The FDA's **Certificate of Listing of Identical Drug Product (CLIDP)** is a registration pathway for products identical to a principal registered product; it is not a public equivalence or substitution list, and it does not provide brand-to-brand groupings. Candidate groups must be built and reviewed.

**API/export.** The JSON endpoint is what the portal itself uses, but it is **not documented as a public developer API**, exposes only a free-text `q` parameter, returns all matching categories in one payload, has no server-side pagination or total count, and is rate-limited (HTTP 429 observed). There is no bulk download or CSV export on the portal. For 50 medicines, search-assisted manual curation is practical; a full national extract is not.

**Licensing/cost.** Access is free. However, no explicit open-data licence was found on the FDA pages reviewed, and the site footer carries a copyright notice (`Copyright © 2026. All Rights Reserved.`). The portal is intended for verification lookups. **Do not treat it as an open dataset or scrape it at scale without written permission.** For a commercial catalog, request permission/FOI clarification from FDA (`info@fda.gov.ph`) before automated or bulk reuse.

**Update cadence.** No published refresh schedule. Records reflect CPR issuance/renewal/expiry and appeared current at access. For the pilot, refresh monthly and always filter on `expiry_date >= today`.

**Pilot fit.** **High.** It is the best free source for the product-level fields and the only authoritative brand/manufacturer/registration source identified. Its gaps (normalization, equivalence, licensing, bulk access) are manageable for 50 medicines.

---

### 2. DOH Philippine National Formulary (PNF / ePNF)

**What it is.** The PNF Essential Medicines List is the DOH's national formulary, published by the DOH Pharmaceutical Division. The accessible PDF is the **8th edition (title page: 2017), EML as of 02 November 2022**, 66 pages, hosted by PhilHealth at <https://www.philhealth.gov.ph/partners/providers/pdf/PNF-EML_11022022.pdf>.

**Confirmed fields.** The EML table is organized by:

- **Active Ingredient**
- **Route of Administration**
- **Pharmaceutical Forms and Strengths**

Example entry:

```text
Paracetamol Oral:
  300 mg and 500 mg tablet
  100 mg/mL drops, 15 mL
  120 mg/5 mL syrup/suspension, 30 mL, 60 mL and 120 mL
  ...
Inj.: 150 mg/mL, 2 mL ampoule solution for injection (IM/IV)
```

It contains **no brand names**, **no manufacturer column**, and **no commercial pack-size/manufacturer identifiers**. Volumes such as 15 mL or 60 mL describe the preparation, not a manufacturer's pack. It also has **no generic-equivalence groupings**; occurrences of "equivalent" in the text refer to salt/strength equivalents (e.g., elemental zinc, iodine), not interchangeable brands.

**Coverage.** It is an essential-medicines list, not a full market catalog. In a spot check, all **18 unique common generic names** sampled (paracetamol, amoxicillin, metformin, amlodipine, losartan, omeprazole, salbutamol, ceftriaxone, insulin, atorvastatin, cotrimoxazole, mefenamic acid, oral rehydration salts, ferrous sulfate, folic acid, vitamin A, albendazole, clopidogrel) appeared. The actual 50-item pilot list should still be checked.

**Current edition and availability.** The 2025 PhilHealth advisory refers to the **electronic PNF (ePNF)** at `https://pnf.doh.gov.ph` and says PhilHealth uses it as a financing reference. At access on 19 October 2026, `pnf.doh.gov.ph` did not resolve, and the PNF PDF's stated update site `www.pharmadiv.gov.ph` also did not resolve. The PhilHealth-hosted PDF was accessible. *Uncertainty:* the ePNF may be temporarily unavailable or blocked from this network; a browser check is needed before relying on it in production.

**Update cadence.** Edition-based, with rolling additions through the ePNF (the PhilHealth advisory lists newly added medicines). There is no fixed public release schedule.

**API/export.** PDF only (and an ePNF web interface when reachable). No API, no structured export.

**Licensing/cost.** Free government publication; no explicit open licence was found in the PDF. PhilHealth's disclaimer says its information "may be used for educational or informative purposes and may be reproduced, copied, or downloaded without the written permission from PhilHealth", but this is not a clear commercial redistribution licence. Attribute DOH and PhilHealth; seek written clarification for commercial reuse.

**Pilot fit.** **High as a supplement, not as a catalog.** Use it to canonicalize generic names, dosage forms, strengths, and essential-medicine status. It cannot supply brand, manufacturer, or commercial pack size.

---

### 3. PhilHealth

**What it is.** PhilHealth is the national health insurer. It publishes the PNF-EML PDF for providers and issued **Advisory No. 2025-0060** on the electronic PNF.

**Confirmed facts.**

- Advisory 2025-0060 (signed 23 October 2025) directs users to `https://pnf.doh.gov.ph` for the ePNF and states that the ePNF is used by PhilHealth "in financing quality health care services" and that PNF drugs should be available for providers' usual case-mix.
- PhilHealth hosts the PNF-EML PDF at `partners/providers/pdf/PNF-EML_11022022.pdf`.
- PhilHealth's **All Case Rates** search and benefit packages are payment references, not a product-level medicine catalog. No brand/manufacturer/pack master was found.
- PhilHealth's disclaimer permits educational/informative reproduction without written permission, but restricts illegal/damaging/pornographic use; it does not grant a general commercial data licence.

**Pilot fit.** **Reference only.** Use PhilHealth for the PNF/EML and financing context, not as the catalog source.

---

### 4. MIMS Philippines

**What it is.** MIMS Philippines is a commercial drug directory covering prescription drugs, OTC medicines, and related resources, with continuous editorial updates. Public pages expose drug name, contents (generic), indications, and company information; the advanced search explicitly supports searching by **ATC, Contents, MIMS Class, Drug Name, and Manufacturer/Distributor** (<https://www.mims.com/philippines/drug/advancedsearch>).

**Coverage and fields.** It is the most complete Philippines-specific brand-level directory identified in this pass. Public product highlights show brand name, contents, and indications. Manufacturer/distributor is a supported search facet. **Pack size** is expected to be part of MIMS product monographs in print/digital form, but we could not verify a structured pack-size field through the public site because drug-detail pages returned HTTP 403 to our client. *Uncertainty:* confirm pack-size coverage and structured export in a vendor sample.

**Generic equivalence.** MIMS exposes generic contents and offers duplicate-therapy/interaction alerts in its CDS product, but no public brand-to-brand equivalence table was found. It does not solve the equivalence-grouping requirement by itself.

**API/export.** MIMS advertises **MIMS Web Services** (JSON APIs) through its developer portal and **MIMS Integrated** CDS with a "lightweight API"; the CDS page lists the Philippines as an add-on region. Access is by account request/demo, not self-service. The developer portal we reached is oriented to Australia/New Zealand; Philippine API availability and terms must be confirmed with MIMS sales.

**Licensing/cost.**

- Website Terms of Use (updated 24 May 2024) prohibit, among other things: copying, downloading, storing, reusing, republishing, reproducing, or redistributing content; scraping; and using content for AI/ML purposes without written consent. The licence is "revocable, non-exclusive, non-transferable" and limited to private, non-commercial use.
- MIMS Web Services terms (last revised 8 August 2022) prohibit scraping, building databases, or creating permanent copies of API content, and require attribution.
- Full drug-detail access requires free registration; print/digital publications are subscription-based. **No public price list** was found: the Philippines subscription form is an order/contact form (circulation.ph@mims.com), and CDS/API pricing is via sales (cdssales@mims.com).
- A catalog use case therefore requires a **bespoke written data licence** that expressly permits storage, derived data, and display in the product. Standard terms do not.

**Update cadence.** Continuous, editorially maintained.

**Pilot fit.** **Best fallback if licensed.** It can supply the complete brand-level dataset and reduce curation, but cost and legal friction are material for a 50-medicine pilot.

---

### 5. Other commercial drug databases

- **IQVIA** is primarily a market-measurement/audit business; public materials do not establish that it sells a Philippine brand/pack product master suitable for a catalog. Treat as not verified.
- **DrugBank, First Databank, and similar global clinical databases** are enterprise-licensed and clinically oriented. Their Philippine brand/pack coverage is not established from public materials and would need a sample-extract test against the 50-medicine list.
- No other Philippines-specific commercial drug database was identified in this pass beyond MIMS and its CDS/API products.

**Assessment.** Do not assume global databases cover Philippine brands, pack sizes, or local registration status. If considered, require a vendor demo and a coverage test before pricing.

---

### 6. Open datasets and other government downloads

**Open Data Philippines (`data.gov.ph`).** The portal is an Angular single-page app. Its front-end uses an `X-API-KEY` and `/api/public/dataset/search`; unauthenticated requests to those paths returned the SPA shell rather than JSON. No medicine-catalog dataset was confirmed. *Uncertainty:* a dataset may exist behind the portal's search UI, but it was not retrievable as open data in this pass.

**DOH Drug Price Reference Index (DPRI).** The 2021 **9th Edition** PDF (39 pages) is available from the DOH Cordillera site: <https://caro.doh.gov.ph/wp-content/uploads/2021/09/2021DPRI-as-of-9-17-2021.pdf>. It lists ceiling/reference prices for essential medicines used in government procurement and is **updated annually** from previous-year purchase orders. It is a price reference by medicine/preparation/strength, not a product registry; it does not supply manufacturer or commercial pack identifiers. The central `dpri.doh.gov.ph` returned HTTP 403 at access; a reported newer edition could not be verified on an official host.

**PNF/EML.** Covered above; official PDF, no structured export.

**FDA Verification Portal.** Covered above; public search, not an open dataset.

**Assessment.** No open dataset combines brand + generic + form + strength + pack + manufacturer + equivalence. DPRI and PNF are useful free reference layers, not catalog substitutes.

---

## Comparison

| Source | Brand | Generic | Form/strength | Pack size | Manufacturer | Equivalence grouping | Coverage | Licence/cost | Update | API/export | Pilot fit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **FDA Verification Portal** | Yes | Yes | Yes, combined free text | Free-text `packaging`; not normalized | Yes (+ trader/importer/distributor) | No; derivable from `generic_name` | Registered drug products; product-level | Free access; no explicit open licence; copyright notice | Current registry; no published schedule | Undocumented JSON search; no pagination/bulk export; rate-limited | **Primary** |
| **DOH PNF / ePNF** | No | Yes (active ingredient) | Yes | Preparation volumes only; no commercial pack | No | No | National essential medicines | Free; no explicit open licence | Edition + rolling ePNF | PDF/web; no API | **Supplement** |
| **PhilHealth** | No | Via PNF | Via PNF | No | No | No | PNF reference and payment context | Free; educational/informative reproduction allowed | Follows PNF | PDF/web; no API | Reference only |
| **MIMS Philippines** | Yes | Yes (contents) | Yes | Likely in monographs; not verified structured | Yes (manufacturer/distributor search) | No public table; duplicate-therapy alerts in CDS | Broad PH brand directory | Paid/quote; standard terms prohibit copying/scraping/database-building/AI use | Continuous | Licensed API/CDS; no public export | **Fallback if licensed** |
| **DOH DPRI** | No | Yes | Yes | No | No | No | Essential medicines price reference | Free | Annual | PDF; no API | Price benchmark only |
| **Open Data Philippines** | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | No medicine catalog confirmed | Free | Unknown | API key required; no dataset confirmed | Not usable |

---

## Generic-equivalence groupings

**What the sources actually provide.** FDA `generic_name`; PNF active-ingredient entries; MIMS contents; and the FDA CLIDP registration pathway. None is a maintained, brand-to-brand equivalence or substitution table.

**What is missing.** There is no public field for bioequivalence, therapeutic equivalence, or interchangeable brands. The PNF's "equivalent" language refers to salts and elemental strengths, not interchangeable products. The FDA CLIDP concerns identical-product listing for registration, not clinical equivalence.

**Recommended pilot model.** Build a curated `generic_group` layer:

1. Normalize the active ingredient/INN, including salt or ester form (e.g., `amoxicillin (as trihydrate)` → `amoxicillin`).
2. Include strength and dosage form in the group key: `inn + strength + form`.
3. Keep combination products as their own groups; do not group a combination with its individual components.
4. Do not group different salts/esters, modified-release vs immediate-release, or different routes unless a pharmacist explicitly approves.
5. Flag biologics, narrow-therapeutic-index drugs, and products requiring bioequivalence evidence for extra review.
6. Require pharmacist sign-off and store `reviewed_by`, `reviewed_at`, and `confidence`.
7. Display as **"Generic alternatives (candidate)"**, not "therapeutically equivalent" or "automatically substitutable".

**Example.** `Paracetamol 500 mg tablet` can include Biogesic 500 mg tablet and generic paracetamol 500 mg tablets. It must not include `Paracetamol 120 mg/5 mL suspension`, `Paracetamol 325 mg tablet`, or combination products such as `Paracetamol + Orphenadrine`.

---

## Uncertainties and open questions

- **FDA automated access:** whether the JSON endpoint is officially sanctioned for repeated/automated queries, and what volume is acceptable. No developer documentation or API terms were found.
- **FDA completeness:** whether the portal includes every valid pack variant and whether it ever returns expired/withdrawn records. The `diclofenac` query suggested active-only, but this needs confirmation.
- **FDA licensing:** whether a government open-data licence or FOI release can cover commercial reuse; no explicit licence was found.
- **PNF/ePNF availability:** `pnf.doh.gov.ph` and `pharma.doh.gov.ph` did not resolve at access. The current ePNF contents and update log could not be inspected directly; the PhilHealth-hosted 2022 snapshot was used.
- **MIMS pack size and PH API:** public drug-detail pages returned 403; pack-size coverage and Philippine API terms/pricing were not verified. Confirm with a vendor sample and quote.
- **DPRI currency:** the latest official copy retrieved was the 2021 9th edition; the central DPRI site returned 403, and a newer edition referenced in secondary sources was not verified on an official host.
- **50-medicine coverage:** the actual 50-item list was not available. The FDA registry should cover registered brands, and the PNF sample covered common generics, but the list must be tested.
- **Legal interpretation:** whether factual extraction from government registries requires permission is a jurisdiction-specific legal question. This note is not legal advice.

---

## Sources

| ID | Title | URL | Accessed | Used for |
|---|---|---|---|---|
| S1 | FDA Philippines — Verification Portal | <https://verification.fda.gov.ph/> | 19 Oct 2026 | Product-level registry, API endpoint, fields, coverage |
| S2 | FDA Philippines — Home Page | <https://www.fda.gov.ph/> | 19 Oct 2026 | Agency context, copyright notice |
| S3 | FDA Philippines — Downloadables (Center for Drug Regulation and Research) | <https://www.fda.gov.ph/downloadables/> | 19 Oct 2026 | Drug registration references, CLIDP listing |
| S4 | FDA Philippines — Certificate of Listing of Identical Drug Product (CLIDP) Application | <https://www.fda.gov.ph/wp-content/uploads/2021/05/Certificate-of-Listing-of-Identical-Drug-Product-CLIDP-Application.pdf> | 19 Oct 2026 | CLIDP scope; not an equivalence list |
| S5 | DOH — Philippine National Formulary Essential Medicines List, 8th Edition (2017), EML as of 02 November 2022 (hosted by PhilHealth) | <https://www.philhealth.gov.ph/partners/providers/pdf/PNF-EML_11022022.pdf> | 19 Oct 2026 | PNF fields, coverage, edition, no brands/manufacturers |
| S6 | PhilHealth — Advisory No. 2025-0060 (Electronic PNF/EML) | <https://www.philhealth.gov.ph/advisories/2025/PA2025-0060_v1.pdf> | 19 Oct 2026 | ePNF URL, PhilHealth use of PNF, added medicines |
| S7 | PhilHealth — Disclaimer | <https://www.philhealth.gov.ph/disclaimer/> | 19 Oct 2026 | Reproduction/copyright terms |
| S8 | DOH Cordillera — The Philippines Drug Price Reference Index | <https://caro.doh.gov.ph/the-philippines-drug-price-reference-index/> | 19 Oct 2026 | DPRI official mirror |
| S9 | DOH — 2021 Drug Price Reference Index, 9th Edition | <https://caro.doh.gov.ph/wp-content/uploads/2021/09/2021DPRI-as-of-9-17-2021.pdf> | 19 Oct 2026 | DPRI scope, annual update, price-reference-only assessment |
| S10 | MIMS Philippines — Drugs Directory & Medical Information | <https://www.mims.com/philippines> | 19 Oct 2026 | Coverage, continuous editorial update, Rx/OTC |
| S11 | MIMS — Terms of Use | <https://www.mims.com/terms-of-use> | 19 Oct 2026 | Copying/scraping/AI prohibitions; updated 24 May 2024 |
| S12 | MIMS — Subscribe / Philippines subscription form | <https://www.mims.com/subscribe> | 19 Oct 2026 | Paid publications; no public price list; contact route |
| S13 | MIMS Web Services Developer Portal — Terms of Use | <https://developer.mims.com/au/Home/TermsAU> | 19 Oct 2026 | API terms: no database-building/permanent copies; attribution |
| S14 | MIMS Clinical Decision Support — MIMS Integrated | <https://cds.mims.com/mims-integrated/> | 19 Oct 2026 | Licensed API/CDS, Philippines add-on, quote/demo route |
| S15 | MIMS Philippines — Advanced Search | <https://www.mims.com/philippines/drug/advancedsearch> | 19 Oct 2026 | Search facets: ATC, contents, manufacturer/distributor |
| S16 | Open Data Philippines | <https://data.gov.ph/> | 19 Oct 2026 | Portal structure; no medicine catalog confirmed |
| S17 | DOH — Drug Price Reference Index central site | <https://dpri.doh.gov.ph/> | 19 Oct 2026 | Returned HTTP 403; documents access limitation |
| S18 | DOH — electronic Philippine National Formulary (ePNF) | <https://pnf.doh.gov.ph/> | 19 Oct 2026 | Did not resolve; documents access limitation |

---

## Recommended pilot data source

### Primary: FDA Verification Portal + DOH PNF/EML

Use the **FDA Verification Portal** as the system of record for product-level facts:

- `registration_number`, `brand_name`, `generic_name`, `dosage_strength_form`, `packaging`, `manufacturer`, `trader`/`importer`/`distributor`, `classification`, `issuance_date`, `expiry_date`, `pharmacologic_category`.

Use the **DOH PNF/EML** to:

- canonicalize generic names and strengths;
- flag essential medicines;
- sanity-check that the pilot's 50 molecules are in the national formulary.

Use each pharmacy's inventory/POS extract to decide **which brands and packs** to include. The 50-medicine list is a shared generic core; the brand/pack mapping is per pharmacy.

**Why this is the right primary source:** it is authoritative, free, product-level, current, and sufficient for a 50-medicine pilot. The main costs are curation and normalization, not licensing.

**Conditions/risks:**

- The JSON endpoint is undocumented and rate-limited; do not build a high-volume scraper.
- There is no open-data licence; request written permission/FOI clarification before systematic reuse.
- `packaging` and `dosage_strength_form` need parsing and QA.
- No official equivalence groups; pharmacist review is mandatory.
- Refresh monthly and filter expired CPRs.

### Fallback: MIMS Philippines licensed data/API

If the pilot can fund a licence and the FDA permission path is too slow or too limited, license **MIMS Philippines** data/API. It offers the most complete Philippines-specific brand-level directory identified in this pass, with continuous updates.

**Conditions:**

- The standard website and API terms prohibit copying, scraping, database-building, permanent copies, and AI/ML use. Negotiate a written data licence that expressly permits storage, derived data, and in-product display.
- Pricing is not published; request a quote from MIMS circulation/CDS sales.
- Validate that the licensed extract includes the fields the pilot needs (especially pack size and manufacturer) and that it covers all brands stocked by the 10 pharmacies.

**No-cost contingency if MIMS licensing stalls:** use the pharmacies' own inventory/POS masters as the brand/pack source, verified line-by-line against the FDA portal. This is free but manual; it still needs FDA verification and PNF normalization.

### Why not the others

- **PNF alone:** no brands, manufacturers, or commercial packs; not a product catalog.
- **PhilHealth alone:** no product-level catalog; it references the PNF.
- **DPRI alone:** price benchmark, not a catalog.
- **Open Data Philippines:** no medicine catalog confirmed; not a reliable dependency.
- **Global databases:** Philippine brand/pack coverage not established; enterprise cost without proven fit.

---

## Implementation note: licensing, attribution, and data handling

### Licensing

1. **FDA:** Access is public and free, but no explicit open-data licence was found. Send a written request/FOI to FDA (`info@fda.gov.ph`) describing the pilot, the 50-medicine scope, the fields stored, the refresh frequency, and whether derived data will be displayed. Until written clarity is received, keep FDA use to manual/small-volume verification and store only factual fields (registration number, names, strength/form, pack description, manufacturer, dates) with source attribution. Do not copy FDA prose or scrape at scale.
2. **PNF/DPRI:** Free government publications, but no explicit commercial-reuse licence. Attribute DOH (and PhilHealth for the hosted PNF PDF). Seek written clarification from the DOH Pharmaceutical Division if the PNF will be redistributed commercially.
3. **MIMS:** Do not use the public site or API to build the catalog without a licence. The website terms prohibit copying/storing/redistributing and AI/ML use; the API terms prohibit database-building/permanent copies. Obtain a signed data licence that covers storage, derived data, display, and termination/deletion obligations.
4. **PhilHealth:** The disclaimer permits educational/informative reproduction, not a general commercial licence. Use PhilHealth only as a reference/citation.
5. **Record-level provenance:** store `source_name`, `source_url`, `retrieved_at`, `licence_status`, and `source_record_id` on every imported row. This makes attribution and deletion practical.

### Attribution

Display a short attribution in the catalog/About screen, for example:

> Medicine catalog contains factual data derived from the FDA Philippines Verification Portal (accessed 19 October 2026) and the DOH Philippine National Formulary, 8th edition (EML as of 2 November 2022). Generic alternatives are candidate groupings reviewed by a pharmacist and are not a determination of therapeutic equivalence. FDA/DOH/PhilHealth do not endorse this product.

For MIMS-licensed data, use the attribution required in the signed licence.

### Data handling

- **Do not** present the catalog as official FDA/DOH/PhilHealth output or imply endorsement.
- **Do not** display "equivalent" or "substitutable" without pharmacist review; use "candidate generic alternative".
- **Do not** delete a product merely because its CPR expired; flag it and let the pharmacy decide based on stock.
- **Do** keep raw `dosage_strength_form` and `packaging` strings alongside parsed fields, so parsing errors are auditable.
- **Do** separate `manufacturer` from `trader`/`importer`/`distributor`; they are different legal roles.
- **Do** version the catalog and record which pharmacist approved each generic group.

### Suggested refresh cadence

| Layer | Cadence | Action |
|---|---|---|
| FDA product records | Monthly | Re-query the 50 medicines; update expiry/manufacturer/packaging; flag delisted products |
| PNF/EML status | Quarterly or on new ePNF advisory | Check for additions/removals |
| Pharmacy assortment/prices | Per pharmacy agreement (weekly/monthly) | Reconcile brand/pack list and selling prices |
| Generic groups | On catalog change | Pharmacist review and sign-off |

### Suggested schema

```text
medicine_product
  product_id
  fda_registration_number
  brand_name
  generic_name_raw
  inn_normalized
  dosage_form
  strength
  pack_size_raw
  pack_size_normalized
  manufacturer
  trader
  importer
  distributor
  rx_otc
  cpr_issuance_date
  cpr_expiry_date
  pharmacologic_category
  source_name
  source_url
  source_record_id
  retrieved_at
  licence_status

generic_group
  generic_group_id
  inn_normalized
  strength
  dosage_form
  route
  reviewed_by
  reviewed_at
  confidence
  notes

pharmacy_product
  pharmacy_id
  product_id
  local_sku
  local_brand_name
  local_pack_description
  selling_price
  in_stock
  observed_at
```

This separates the shared regulatory catalog, the derived generic groups, and each pharmacy's commercial assortment.
