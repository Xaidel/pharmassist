# Research 18 — POC seed: DOH MDRP ceilings under EO 104 s. 2020 and EO 155 s. 2021

- Ticket: `https://github.com/Xaidel/pharmassist/issues/18`
- Date: 2026-10-21
- Scope: the complete published Maximum Drug Retail Price (MDRP) list under **EO No. 104, s. 2020** and **EO No. 155, s. 2021**, with a machine-readable transcription, source citations, and a mapping to the POC's 50-SKU catalog. EO 821 (2009) is repealed and is not used. [S1][S2][S3][S4]
- Method: downloaded the signed annex PDFs from the Official Gazette, rendered each page, OCR'd the tables, and checked **every row's molecule, strength/form, MWP, and MRP against the page image**. Values were not inferred, estimated, or copied from a secondary list.
- Companion data: `docs/research/data/mdrp-ceilings.json` (204 entries; valid JSON).
- Citation convention: bracketed IDs resolve to the Sources table at the end. "Recommendation" and "Analysis" mark material that is not a direct transcription of the orders.

---

## TL;DR

1. **The current published list has 204 rows: 133 under EO 104 and 71 under EO 155.** Every row has both a published MWP and MRP. The complete transcription is in the JSON; Appendix A reproduces the MRP table for human review.
2. **The consumer ceiling is the MRP.** The MWP is a wholesale ceiling and is VAT-exclusive. EO 104's MRP column carries a footnote that some MRPs are VAT-exclusive (45 rows); it also marks 15 rows with a voluntary price reduction. EO 155 states that MWPs are VAT-exclusive and MRPs are VAT-inclusive except for VAT-exempt medicines. [S1][S2]
3. **The POC catalog is not frozen and is not in the repository.** Against the only available candidate list — the recommended 50-medicine starter list in research note 05 — **none of the 50 SKUs has an exact MDRP match**. Five molecules appear only in non-matching combinations or forms (amlodipine, hydrochlorothiazide, metformin, ipratropium, fluticasone). If the POC keeps that 50-SKU list, all 50 seeded `mdrp_ceiling` values must be null and the MDRP badge will not appear. [S6]
4. **The seeder must not transfer a combination ceiling to a component.** For example, EO 155 has amlodipine + perindopril 5 mg + 5 mg (MRP PHP 32.26) but no amlodipine 5 mg monotherapy; EO 104 has metformin + sitagliptin 500 mg + 50 mg (MRP PHP 30.31) but no metformin 500 mg monotherapy. A ceiling applies only to the exact molecule set, strength, and form in the annex. [S1][S2]
5. **If the POC wants to demonstrate the MDRP trust state**, add one or two MDRP-covered SKUs to the 50 during the issue #10 freeze — for example, amlodipine + perindopril 5 mg + 5 mg (EO 155 row 33) or metformin + sitagliptin 500 mg + 50 mg (EO 104 row 44). This is a product-list recommendation, not a legal conclusion. [S1][S2]
6. **Two data gaps are recorded honestly:** 144 rows do not state a pack count (mostly tablets and capsules), and 2 rows do not state a dosage form. Those fields are `null` in the JSON with a note; no pack or form was guessed.

---

## 1. What was collected

### 1.1 Counts

| Order | Signed | Annex rows | Rows with MWP | Rows with MRP | Source PDF pages |
|---|---|---:|---:|---:|---|
| EO No. 104, s. 2020 | 2020-02-17 | 133 | 133 | 133 | 4–9 |
| EO No. 155, s. 2021 | 2021-12-07 | 71 | 71 | 71 | 4–7 |
| **Total** | | **204** | **204** | **204** | |

EO 155 adds 71 formulas to the 133 already listed by EO 104; it does not replace the EO 104 rows. The JSON preserves each order's row number, so the two numbering sequences are separate (`annex_row` plus `order`). EO 155 expressly repeals EO 821. [S1][S2][S3][S4]

### 1.2 JSON shape

Each entry has:

```text
id, order, order_signed, annex_row, category,
molecule, strength, dosage_form, pack_size,
strength_and_form_raw,
mwp_php, mrp_php,
vat_exclusive_mrp, voluntary_price_reduction,
source_url, source_pdf_page, notes
```

- `mrp_php` is the published consumer ceiling.
- `mwp_php` is the published wholesale ceiling and is VAT-exclusive.
- `strength_and_form_raw` is the cleaned transcription of the annex's "Strength and Form" cell, before parsing. Use it for audit; use `strength` + `dosage_form` + `pack_size` for matching.
- `source_pdf_page` is the **PDF page number**, not the printed page number at the foot of the annex.
- `pack_size` is populated only when the annex states a volume, dose count, or weight. It is `null` for tablet/capsule rows and for vials/ampoules whose fill volume is not stated.

### 1.3 Category coverage

The list is weighted toward hospital/specialty and chronic-disease products, not the POC's primary-care basket.

| Order | Categories (rows) |
|---|---|
| EO 104 | Antihypertensives 22; Antidiabetic Drugs 28; Anti-Neoplastic/Anti-Cancer 18; Immunosuppressant 16; Analgesics 11; Antiasthmatic/COPD 8; Anticoagulant 7; Anti-Angina 3; Agents affecting bone metabolism 3; Antiemetic 3; Psoriasis/Seborrhea/Ichthyosis 2; Antidepressant 3; Iron Chelating Agent 1; Growth Hormone Inhibitor 1; Antiviral 1; Fibrinolytic 1; Hematopoietic Agent 1; Mucolytic 1; Parenteral Nutritional Product 1; Phosphate Binder 1; Surfactant 1 |
| EO 155 | Agents affecting bone metabolism 1; Analgesics 3; Anesthetics 1; Anti-Angina 2; Antiarrhythmics 1; Anti-asthma/COPD 3; Antibiotics 2; Anticoagulant 1; Anticonvulsant 1; Antidiabetic Drugs 6; Antidiuretics 2; Antiemetics 1; Anti-Glaucoma 1; Anti-Hypercholesterolemia 2; Antihypertensive Medicines 27; Anti-Neoplastic/Anti-Cancer 5; Antiparkinsonian 1; Diuretic 1; Drugs for Overactive Bladder 1; Growth Hormone Inhibitor 1; Immunosuppressant Drugs 5; Iron Chelating Agents 2; Psoriasis/Seborrhea/Ichthyosis 1 |

The category labels are the annex's section headings. Some headings split across two lines; they are joined in the JSON.

---

## 2. Source access and verification

### 2.1 What worked

- **EO 104 signed annex PDF:** `https://www.officialgazette.gov.ph/downloads/2020/02feb/20200217-EO-104-RRD.pdf` (downloaded 2026-10-21).
- **EO 155 signed annex PDF:** `https://www.officialgazette.gov.ph/downloads/2021/12dec/20211207-EO-155-RRD.pdf` (downloaded 2026-10-21).
- **Full text of the orders (for effectivity, repeal, and footnotes):** LawPhil pages for EO 104 and EO 155. LawPhil reproduces the order text but **not** the annex tables. [S3][S4]

### 2.2 What did not work

- The Official Gazette **HTML article pages** for both orders returned HTTP 403 to this client. The PDF downloads were reachable, so the primary source was still obtained.
- Both annex PDFs are **image scans with no text layer**. `pypdf` returned zero characters per page. The tables were therefore transcribed by OCR and checked visually.
- No DOH/FDA **consolidated, text-searchable MDRP table** was found in the sources reviewed. The signed annexes are the controlling publication; a convenience list on a DOH page, if one exists, was not needed and was not used.

### 2.3 Verification standard

Each of the 204 rows was checked against the rendered page image for:

1. molecule (including combination components and their order);
2. strength and form (including volumes and dose counts);
3. MWP and MRP;
4. footnote markers (`*` and `+`).

The OCR was run at 300 dpi and 400 dpi; every amount in the final JSON matches the printed page. The row-by-row check is why the JSON can be used as a transcription, not a guess. Residual OCR risk is discussed in section 7.

---

## 3. Price basis: MRP, MWP, VAT, and pack

### 3.1 The two ceilings

- **MRP (Maximum Retail Price)** is the ceiling a retailer may charge a consumer. This is the number the POC should show as the "MDRP ceiling." [S1][S2]
- **MWP (Maximum Wholesale Price)** is the ceiling given by the manufacturer/wholesaler/trader/distributor to a retailer. It is **not** a shelf-price ceiling. Do not compare an MWP to a pharmacy shelf price. [S1][S2]

### 3.2 VAT

- **EO 104 annex footnote:** "MRPs reflected are VAT-exclusive" for rows marked `*`. The same annex marks voluntary price reductions with `+`. The JSON records these as `vat_exclusive_mrp` and `voluntary_price_reduction`. **45 EO 104 rows carry the VAT-exclusive MRP footnote; 15 carry the voluntary-reduction marker.**
- **EO 155 annex footnote:** "The MWPs are exclusive of Value Added Tax (VAT). The stated MRPs are VAT-inclusive except for VAT-exempt medicines." [S2]
- **Consequence for the POC:** a VAT-inclusive shelf price may legitimately be higher than a published VAT-exclusive MRP. Do not flag a price as "above MDRP" without checking the MRP's VAT basis. The safest display is the published MRP with its basis ("VAT-exclusive" or "VAT-inclusive"), not a grossed-up number invented by the app. (Analysis/Recommendation)

### 3.3 Pack size

The annexes price the listed **strength and form**, not a standardized commercial pack:

- For tablets and capsules, the annex does not state a pack count. The ceiling is the published price for that strength/form. The POC must convert a pharmacy pack to a unit price before comparing; it must not multiply the ceiling by a pack count and present the result as a published pack ceiling. (Analysis)
- For vials, ampoules, pens, syringes, nebules, inhalers, gels, and ointments, the annex sometimes states the fill volume, dose count, or weight (e.g., "10 mL vial," "200 doses (10 mL)," "30 g gel"). The JSON captures that as `pack_size`.
- When the annex gives a vial/ampoule strength but no fill volume (e.g., "150 mg vial"), `pack_size` is `null`. Do not assume a volume.

---

## 4. Mapping to the POC 50-SKU catalog

### 4.1 Catalog status

The POC catalog is **not in the repository and not frozen**. The PRD says the final 50 are set in issue #10; research note 05 contains a **recommended** 50-medicine starter list, not final pilot data. [S6] The mapping below therefore uses that recommended list as the only available candidate. If issue #10 selects a different list, re-run the matching rules in section 5 against the JSON; do not assume this result carries over.

### 4.2 Result: zero exact matches

**None of the 50 recommended SKUs has an exact MDRP match.** The full row-by-row result is Appendix B. The five near-misses are molecule-level only:

| POC molecule | What the annex actually lists | Why it does not match |
|---|---|---|
| Amlodipine 5 mg / 10 mg tablet | Amlodipine combined with bisoprolol, hydrochlorothiazide + olmesartan, hydrochlorothiazide + valsartan, indapamide, perindopril, or telmisartan | No amlodipine monotherapy row. A combination ceiling is not a monotherapy ceiling. |
| Hydrochlorothiazide 25 mg tablet | HCTZ in fixed-dose combinations only | No HCTZ monotherapy row. |
| Metformin 500 mg / 850 mg tablet | Metformin + saxagliptin or metformin + sitagliptin | No metformin monotherapy row. |
| Ipratropium + salbutamol | Fenoterol + ipratropium (EO 155 rows 9–10) | Different bronchodilator combination. |
| Fluticasone + salmeterol | Fluticasone nebules (EO 104 row 96) | Different form and no salmeterol component. |

All other 45 SKUs are not on either list at all: losartan, enalapril, metoprolol, simvastatin, atorvastatin, aspirin, gliclazide, salbutamol, montelukast, amoxicillin, co-amoxiclav, ciprofloxacin, clarithromycin, cotrimoxazole, nitrofurantoin, cefixime, azithromycin, doxycycline, paracetamol, mefenamic acid, ibuprofen, diclofenac, omeprazole, ORS, bisacodyl, domperidone, loratadine, chlorphenamine, prednisone, ferrous + folic acid, multivitamins, and mupirocin.

**Seeder consequence:** if the POC keeps the recommended 50-SKU list, every seeded SKU must have `mdrp_ceiling = null`, `mdrp_source = null`, and the UI must not show an MDRP badge. This is consistent with the map's seed policy: "Real published MDRP ceilings where the SKU is on the DOH list; no ceiling otherwise." Zero is a valid outcome. [S5]

### 4.3 If the POC wants a visible MDRP badge

Add one or two covered SKUs during the issue #10 freeze. Two candidates fit the POC's chronic-medicine focus and are common enough to be stocked:

| Candidate SKU | Order / row | Published MRP | Note |
|---|---|---:|---|
| Amlodipine + perindopril 5 mg + 5 mg tablet | EO 155, row 33 | PHP 32.26 | Fixed-dose combination; exact match only for the 5/5 strength. |
| Metformin + sitagliptin 500 mg + 50 mg film-coated tablet | EO 104, row 44 | PHP 30.31 | Fixed-dose combination; exact match only for the 500/50 strength. |

These are recommendations for the catalog freeze, not a claim that the combination is clinically appropriate for every patient. The POC is a price-comparison tool, not prescribing guidance. (Recommendation)

---

## 5. Matching rules for the seeder

Use these rules when the 50-SKU catalog is frozen. The goal is to avoid a false MDRP badge; a missing badge is safer than a wrong ceiling.

### 5.1 Match key

A match requires **all** of:

1. **The exact molecule set.** Normalize INN names, salts, and hydrates, but require the same components. Combination order is irrelevant (`A + B` = `B + A`), but a component is not a match for a combination. Do not match amlodipine to amlodipine + perindopril.
2. **The exact per-component strength.** Compare each component's numeric value and unit. `mg` and `mcg` are not interchangeable; `1 g` = `1000 mg` may be normalized numerically, but the published form must still match.
3. **The same dosage-form family at the annex's granularity.** The annex distinguishes tablet, film-coated tablet, modified-release tablet, sustained-release tablet, extended-release tablet, controlled-release tablet, capsule, prolonged-release capsule, vial, ampoule, pre-filled pen, pre-filled syringe, nebule, inhaler, nasal spray, gel, ointment, and patch. Do not match a plain tablet to a film-coated tablet or an immediate-release product to a modified-release product without pharmacist review.
4. **The same pack when the annex states one.** If the annex says "10 mL vial," require a 10 mL vial. If the annex says "200 doses (10 mL)," require that device/pack. If the annex states no pack, compare on the published unit basis (section 5.2).

### 5.2 Unit and pack arithmetic

- For tablets/capsules with no pack count, store the published MRP as the **unit ceiling**. If the pharmacy sells a 100-tablet pack, compute `pack ceiling = unit MRP × 100` and label it **"computed from the published unit MRP"**. Never store the computed number as if the order published it.
- For products with a stated fill volume or dose count, compare like-for-like. Do not compare a 10 mL vial ceiling to a 2 mL vial price.
- Never compare an MWP to a retail price, and never compare a VAT-exclusive MRP to a VAT-inclusive shelf price without disclosing the basis.

### 5.3 Null policy

If any element fails:

```text
mdrp_match = "none"
mdrp_ceiling = null
mdrp_source = null
mdrp_checked_at = <date>
ui_copy = "No published MDRP ceiling for this exact SKU."
```

Do not fall back to a molecule-level ceiling, a different strength, a different form, or a different pack. Do not show a badge or a "ceiling" label for a null match.

### 5.4 Suggested storage fields

```text
medicine_product
  mdrp_order            -- "EO 104 s. 2020" | "EO 155 s. 2021" | null
  mdrp_annex_row        -- integer | null
  mdrp_molecule         -- exact annex molecule | null
  mdrp_strength         -- exact annex strength | null
  mdrp_form             -- exact annex form | null
  mdrp_pack             -- exact annex pack, when stated | null
  mdrp_ceiling_php      -- published MRP | null
  mdrp_vat_exclusive    -- boolean
  mdrp_match_basis      -- "exact" | "none"
  mdrp_source_url       -- annex PDF URL | null
  mdrp_checked_at       -- date
```

Keep the published MRP and any computed pack equivalent in separate columns.

---

## 6. Ambiguities and edge cases

| Case | Rows affected | How the JSON records it | How the POC should handle it |
|---|---|---|---|
| Tablet/capsule with no pack count | 144 entries have `pack_size = null` | `pack_size: null`; `strength_and_form_raw` preserves the annex text | Store the published unit ceiling; compute pack equivalents separately and label them as computed. |
| Dosage form not stated | EO 104 rows 103 and 109 | `dosage_form: null`; `notes` says the form is not stated | Do not infer "inhaler" or "vial" from context. Treat as unmatchable until a pharmacist confirms the product. |
| Vial/ampoule strength without fill volume | e.g., EO 104 rows 66–68, 70, 74, 76; EO 155 rows 63, 67 | `pack_size: null` | Do not assume a volume. Match only if the pharmacy's pack states the same fill. |
| "1.6 g vial" / "3.2 g vial" | EO 155 rows 12–13 | `strength = 1.6 g` / `3.2 g`; `pack_size: null` | The gram value is the strength, not a pack size. Do not treat it as a 1.6 g pack. |
| Film-coated vs plain tablet | e.g., EO 104 row 19 (plain tablet) vs many film-coated rows | `dosage_form` preserves the distinction | Do not match across the distinction without pharmacist review. |
| Combination ratios | e.g., amlodipine + perindopril 10/10, 10/5, 5/10, 5/5 | Four separate rows with separate MRPs | Require the exact ratio; do not use one ratio's ceiling for another. |
| Biphasic insulin | EO 104 row 30 (insulin aspart + insulin aspart protamine crystalline) | Full molecule string preserved | Do not match to insulin aspart alone. |
| Trastuzumab emtansine | EO 104 rows 67–68 | Both rows repeat "Trastuzumab Emtansine" | Two strengths of one molecule; do not treat the merged annex cell as a separate molecule. |
| VAT-exclusive MRP | 45 EO 104 rows marked `*` | `vat_exclusive_mrp: true` | Display the basis; do not gross up the ceiling in the seed. |
| Voluntary price reduction | 15 EO 104 rows marked `+` | `voluntary_price_reduction: true` | Keep the published MRP; do not add a second "discount" narrative. |
| Unit abbreviations | U vs IU in insulin rows | Preserved as published | Do not normalize U to IU in the display without a note. |

---

## 7. Gaps and uncertainty

1. **The POC catalog is not frozen.** The zero-match result is against the recommended 50-SKU starter list in research note 05, not against issue #10's final list. Re-run the match when the list is frozen. [S6]
2. **Pack counts are absent for solid oral forms.** The annex does not publish tablet/capsule counts. The POC can compare unit prices, but any pack-level number is a computation, not a published ceiling.
3. **Two rows lack a dosage form.** EO 104 rows 103 and 109 state strength and volume only. They are null in the JSON.
4. **OCR residual risk.** The annexes are scans. Every row was visually checked, but a production seed should spot-check the exact SKUs against the PDF pages recorded in `source_pdf_page` before launch.
5. **No later MDRP order is assessed here.** This ticket covers EO 104 and EO 155 only. The prior legal note found no later MDRP EO through 2026-09-08, but that is outside this ticket's transcription scope. Re-check DOH/FDA before the pilot. [S7]
6. **No consolidated DOH list was used.** The signed annexes are the source of record. A DOH convenience page, if one exists, was not needed and was not relied on.
7. **The 50-SKU list is primary-care-oriented; the annex is not.** The mismatch is structural, not a transcription error. The POC should decide whether a visible MDRP state is a POC requirement; if it is, the catalog needs at least one covered SKU.

---

## 8. Sources

| ID | Title | Issuer | URL | Date / notes |
|---|---|---|---|---|
| S1 | EO No. 104, s. 2020, Annex — List of Medicines and Corresponding MWP and MRP | President of the Philippines / Official Gazette | https://www.officialgazette.gov.ph/downloads/2020/02feb/20200217-EO-104-RRD.pdf | Signed 2020-02-17; image scan, PDF pages 4–9; 133 rows |
| S2 | EO No. 155, s. 2021, Annex — List of Medicines and Corresponding MWP and MRP | President of the Philippines / Official Gazette | https://www.officialgazette.gov.ph/downloads/2021/12dec/20211207-EO-155-RRD.pdf | Signed 2021-12-07; image scan, PDF pages 4–7; 71 rows |
| S3 | EO No. 104, s. 2020 — full text | President of the Philippines / LawPhil | https://lawphil.net/executive/execord/eo2020/eo_104_2020.html | Signed 2020-02-17; text only, no annex tables |
| S4 | EO No. 155, s. 2021 — full text | President of the Philippines / LawPhil | https://lawphil.net/executive/execord/eo2021/eo_155_2021.html | Signed 2021-12-07; repeals EO 821; text only, no annex tables |
| S5 | Map: Pharmassist POC — seeded-data working demo | GitHub issue #17 | https://github.com/Xaidel/pharmassist/issues/17 | Seed policy: real published MDRP where the SKU is on the DOH list; no ceiling otherwise |
| S6 | Research 05 — Naga market context, recommended 50-medicine starter list | Pharmassist research note | docs/research/05-naga-market-context.md | Recommendation for issue #10, not final pilot data |
| S7 | Research 15 — MDRP status, RA 11967 coverage, and local rules | Pharmassist research note | docs/research/15-mdpr-ra11967-local-ordinances.md | Prior legal note; confirms EO 104/EO 155 operative and EO 821 repealed |
| S8 | FDA Circular No. 2022-005 — labeling requirements for MRP drugs | Food and Drug Administration (Philippines) | https://www.fda.gov.ph/fda-circular-no-2022-005-guidelines-on-labeling-requirements-of-drug-products-under-maximum-retail-price-mrp/ | Context only; not used for ceilings |

---

## Appendix A — Complete published MRP list (204 rows)

The table below is a human-readable rendering of the JSON. `MRP VAT-excl.` means the order's `*` footnote applies; `voluntary reduction` means the `+` footnote applies. The JSON is authoritative for matching and includes MWP, parsed fields, and source page numbers.

| Order | Row | Molecule | Strength / form (as published) | MRP (PHP) | Flags |
|---|---:|---|---|---:|---|
| EO 104 s. 2020 | 1 | Amlodipine + Bisoprolol | 10 mg + 5 mg tablet | 24.35 | MRP VAT-excl. |
| EO 104 s. 2020 | 2 | Amlodipine + Bisoprolol | 5 mg + 10 mg tablet | 22.82 | MRP VAT-excl. |
| EO 104 s. 2020 | 3 | Amlodipine + Bisoprolol | 5 mg + 5 mg tablet | 22.90 | MRP VAT-excl. |
| EO 104 s. 2020 | 4 | Amlodipine + Hydrochlorothiazide + Olmesartan Medoxomil | 37.5 mg film-coated tablet | 18.59 | MRP VAT-excl. |
| EO 104 s. 2020 | 5 | Amlodipine + Hydrochlorothiazide + Olmesartan Medoxomil | 57.5 mg film-coated tablet | 30.75 |  |
| EO 104 s. 2020 | 6 | Amlodipine + Hydrochlorothiazide + Olmesartan Medoxomil | 62.5 mg film-coated tablet | 31.25 |  |
| EO 104 s. 2020 | 7 | Amlodipine + Hydrochlorothiazide + Valsartan | 10 mg + 160 mg + 25 mg film-coated tablet | 29.03 | MRP VAT-excl. |
| EO 104 s. 2020 | 8 | Amlodipine + Hydrochlorothiazide + Valsartan | 10 mg + 320 mg + 25 mg film-coated tablet | 34.51 | MRP VAT-excl. |
| EO 104 s. 2020 | 9 | Amlodipine + Hydrochlorothiazide + Valsartan | 5 mg + 160 mg + 25 mg film-coated tablet | 27.68 | MRP VAT-excl. |
| EO 104 s. 2020 | 10 | Amlodipine + Indapamide | 10 mg + 1.5 mg modified-release tablet | 28.50 |  |
| EO 104 s. 2020 | 11 | Amlodipine + Indapamide + Perindopril | 10 mg + 1.25 mg + 5 mg film-coated tablet | 50.00 | MRP VAT-excl. |
| EO 104 s. 2020 | 12 | Amlodipine + Indapamide + Perindopril | 10 mg + 2.5 mg + 10 mg film-coated tablet | 51.84 | MRP VAT-excl. |
| EO 104 s. 2020 | 13 | Amlodipine + Indapamide + Perindopril | 5 mg + 1.25 mg + 5 mg film-coated tablet | 44.75 | MRP VAT-excl. |
| EO 104 s. 2020 | 14 | Amlodipine + Perindopril | 2.5 mg + 3.5 mg tablet | 20.70 | MRP VAT-excl. |
| EO 104 s. 2020 | 15 | Bisoprolol + Hydrochlorothiazide | 2.5 mg + 6.25 mg film-coated tablet | 16.36 | MRP VAT-excl. |
| EO 104 s. 2020 | 16 | Bisoprolol + Hydrochlorothiazide | 5 mg + 6.25 mg film-coated tablet | 19.30 | MRP VAT-excl. |
| EO 104 s. 2020 | 17 | Eprosartan | 600 mg film-coated tablet | 41.17 | MRP VAT-excl. |
| EO 104 s. 2020 | 18 | Eprosartan + Hydrochlorothiazide | 600 mg + 12.5 mg film-coated tablet | 36.97 | MRP VAT-excl. |
| EO 104 s. 2020 | 19 | Imidapril | 10 mg tablet | 25.62 | MRP VAT-excl. |
| EO 104 s. 2020 | 20 | Indapamide + Perindopril | 2.5 mg + 10 mg film-coated tablet | 30.51 | MRP VAT-excl. |
| EO 104 s. 2020 | 21 | Levamlodipine | 2.5 mg tablet | 11.84 | MRP VAT-excl. |
| EO 104 s. 2020 | 22 | Nimodipine | 30 mg film-coated tablet | 44.70 |  |
| EO 104 s. 2020 | 23 | Dapagliflozin | 10 mg film-coated tablet | 44.20 | MRP VAT-excl. |
| EO 104 s. 2020 | 24 | Empagliflozin | 10 mg film-coated tablet | 55.31 | MRP VAT-excl. |
| EO 104 s. 2020 | 25 | Empagliflozin + Metformin | 12.5 mg + 1 g film-coated tablet | 41.52 | MRP VAT-excl. |
| EO 104 s. 2020 | 26 | Empagliflozin + Metformin | 12.5 mg + 500 mg film-coated tablet | 41.52 | MRP VAT-excl. |
| EO 104 s. 2020 | 27 | Empagliflozin + Metformin | 5 mg + 1 g film-coated tablet | 41.52 | MRP VAT-excl. |
| EO 104 s. 2020 | 28 | Empagliflozin + Metformin | 5 mg + 500 mg film-coated tablet | 33.83 | MRP VAT-excl. |
| EO 104 s. 2020 | 29 | Insulin Aspart | 100 IU/mL, 3 mL pre-filled pen | 424.04 | MRP VAT-excl. |
| EO 104 s. 2020 | 30 | Insulin Aspart + Insulin Aspart Protamine Crystalline | 100 IU/mL, 3 mL pre-filled pen | 477.26 |  |
| EO 104 s. 2020 | 31 | Insulin Degludec | 100 U/mL, 3 mL pre-filled pen | 763.40 | MRP VAT-excl. |
| EO 104 s. 2020 | 32 | Insulin Detemir | 100 U/mL, 3 mL pre-filled pen | 691.67 | MRP VAT-excl. |
| EO 104 s. 2020 | 33 | Insulin Glulisine | 100 IU/mL, 3 mL pre-filled pen | 435.18 | MRP VAT-excl. |
| EO 104 s. 2020 | 34 | Insulin Lispro | 100 IU/mL, 10 mL vial | 1192.25 | MRP VAT-excl. |
| EO 104 s. 2020 | 35 | Insulin Lispro | 100 U/mL, 3 mL pre-filled pen | 420.53 | MRP VAT-excl. |
| EO 104 s. 2020 | 36 | Linagliptin | 5 mg film-coated tablet | 55.78 | MRP VAT-excl. |
| EO 104 s. 2020 | 37 | Linagliptin + Metformin | 2.5 mg + 1 g film-coated tablet | 30.36 | MRP VAT-excl. |
| EO 104 s. 2020 | 38 | Linagliptin + Metformin | 2.5 mg + 500 mg film-coated tablet | 30.56 | MRP VAT-excl. |
| EO 104 s. 2020 | 39 | Linagliptin + Metformin | 2.5 mg + 850 mg film-coated tablet | 30.36 | MRP VAT-excl. |
| EO 104 s. 2020 | 40 | Metformin + Saxagliptin | 1 g + 5 mg extended-release tablet | 68.38 | MRP VAT-excl. |
| EO 104 s. 2020 | 41 | Metformin + Saxagliptin | 500 mg + 5 mg extended-release tablet | 68.02 | MRP VAT-excl. |
| EO 104 s. 2020 | 42 | Metformin + Sitagliptin | 1 g + 100 mg extended-release tablet | 62.50 | MRP VAT-excl. |
| EO 104 s. 2020 | 43 | Metformin + Sitagliptin | 1 g + 50 mg film-coated tablet | 32.55 | MRP VAT-excl. |
| EO 104 s. 2020 | 44 | Metformin + Sitagliptin | 500 mg + 50 mg film-coated tablet | 30.31 | MRP VAT-excl. |
| EO 104 s. 2020 | 45 | Metformin + Sitagliptin | 850 mg + 50 mg film-coated tablet | 32.14 | MRP VAT-excl. |
| EO 104 s. 2020 | 46 | Saxagliptin | 2.5 mg film-coated tablet | 47.80 | MRP VAT-excl. |
| EO 104 s. 2020 | 47 | Saxagliptin | 5 mg film-coated tablet | 57.00 | MRP VAT-excl. |
| EO 104 s. 2020 | 48 | Sitagliptin | 100 mg film-coated tablet | 65.37 | MRP VAT-excl. |
| EO 104 s. 2020 | 49 | Sitagliptin | 25 mg film-coated tablet | 46.19 | MRP VAT-excl. |
| EO 104 s. 2020 | 50 | Sitagliptin | 50 mg film-coated tablet | 53.19 | MRP VAT-excl. |
| EO 104 s. 2020 | 51 | Afatinib | 30 mg film-coated tablet | 4057.80 |  |
| EO 104 s. 2020 | 52 | Afatinib | 40 mg film-coated tablet | 3961.49 |  |
| EO 104 s. 2020 | 53 | Bevacizumab | 100 mg, 4 mL vial | 23445.90 |  |
| EO 104 s. 2020 | 54 | Bevacizumab | 400 mg, 16 mL vial | 80686.97 |  |
| EO 104 s. 2020 | 55 | Cetuximab | 5 mg/mL, 20 mL vial | 17072.58 |  |
| EO 104 s. 2020 | 56 | Denosumab | 60 mg/mL, 1 mL pre-filled syringe (SC) | 13563.20 |  |
| EO 104 s. 2020 | 57 | Erlotinib | 150 mg film-coated tablet | 2116.81 |  |
| EO 104 s. 2020 | 58 | Goserelin | 10.8 mg pre-filled syringe (SC) | 19725.85 |  |
| EO 104 s. 2020 | 59 | Goserelin | 3.6 mg pre-filled syringe (SC) | 5783.12 |  |
| EO 104 s. 2020 | 60 | Lapatinib | 250 mg film-coated tablet | 545.08 |  |
| EO 104 s. 2020 | 61 | Panitumumab | 20 mg/mL, 5 mL vial | 28929.94 |  |
| EO 104 s. 2020 | 62 | Pertuzumab | 30 mg/mL, 14 mL vial | 174115.67 |  |
| EO 104 s. 2020 | 63 | Regorafenib | 40 mg film-coated tablet | 2853.62 |  |
| EO 104 s. 2020 | 64 | Rituximab | 100 mg/10 mL, 10 mL vial | 13714.04 |  |
| EO 104 s. 2020 | 65 | Rituximab | 500 mg/50 mL, 50 mL vial | 66759.55 |  |
| EO 104 s. 2020 | 66 | Trastuzumab | 150 mg vial | 36452.14 |  |
| EO 104 s. 2020 | 67 | Trastuzumab Emtansine | 100 mg vial | 91462.46 |  |
| EO 104 s. 2020 | 68 | Trastuzumab Emtansine | 160 mg vial | 146888.25 |  |
| EO 104 s. 2020 | 69 | Azathioprine | 50 mg tablet | 42.58 | voluntary reduction |
| EO 104 s. 2020 | 70 | Basiliximab | 20 mg vial | 75574.09 |  |
| EO 104 s. 2020 | 71 | Ciclosporin | 100 mg/mL, 50 mL oral solution | 9305.57 |  |
| EO 104 s. 2020 | 72 | Etanercept | 25 mg/0.5 mL, 0.5 mL pre-filled syringe (SC) | 7459.44 |  |
| EO 104 s. 2020 | 73 | Golimumab | 50 mg/0.5 mL, 0.5 mL pre-filled autoinjector | 61648.50 |  |
| EO 104 s. 2020 | 74 | Immunoglobulin Anti-Thymocyte | 25 mg vial | 16402.57 | voluntary reduction |
| EO 104 s. 2020 | 75 | Mycophenolic Acid | 360 mg enteric-coated tablet | 94.36 |  |
| EO 104 s. 2020 | 76 | Secukinumab | 150 mg vial | 23822.77 |  |
| EO 104 s. 2020 | 77 | Sirolimus | 0.5 mg tablet | 208.55 |  |
| EO 104 s. 2020 | 78 | Sirolimus | 1 mg tablet | 276.81 |  |
| EO 104 s. 2020 | 79 | Tacrolimus | 0.5 mg prolonged-release capsule | 75.26 |  |
| EO 104 s. 2020 | 80 | Tacrolimus | 1 mg prolonged-release capsule | 131.36 |  |
| EO 104 s. 2020 | 81 | Tocilizumab | 200 mg/10 mL, 10 mL vial | 14566.97 |  |
| EO 104 s. 2020 | 82 | Tocilizumab | 400 mg/20 mL, 20 mL vial | 28830.84 |  |
| EO 104 s. 2020 | 83 | Tofacitinib | 5 mg film-coated tablet | 814.26 |  |
| EO 104 s. 2020 | 84 | Ustekinumab | 45 mg/0.5 mL, 0.5 mL pre-filled syringe | 160923.83 |  |
| EO 104 s. 2020 | 85 | Morphine | 10 mg modified-release tablet | 16.00 | voluntary reduction |
| EO 104 s. 2020 | 86 | Morphine | 30 mg modified-release tablet | 41.58 | voluntary reduction |
| EO 104 s. 2020 | 87 | Morphine | 60 mg modified-release tablet | 108.69 | voluntary reduction |
| EO 104 s. 2020 | 88 | Naloxone + Oxycodone | 10 mg + 20 mg prolonged-release tablet | 214.00 | voluntary reduction |
| EO 104 s. 2020 | 89 | Naloxone + Oxycodone | 2.5 mg + 5 mg prolonged-release tablet | 124.13 | voluntary reduction |
| EO 104 s. 2020 | 90 | Naloxone + Oxycodone | 20 mg + 40 mg prolonged-release tablet | 351.00 | voluntary reduction |
| EO 104 s. 2020 | 91 | Naloxone + Oxycodone | 5 mg + 10 mg prolonged-release tablet | 113.50 | voluntary reduction |
| EO 104 s. 2020 | 92 | Oxycodone | 10 mg controlled-release tablet | 175.39 | voluntary reduction |
| EO 104 s. 2020 | 93 | Oxycodone | 10 mg/mL, 1 mL vial | 775.23 | voluntary reduction |
| EO 104 s. 2020 | 94 | Oxycodone | 10 mg/mL, 2 mL vial | 1284.96 | voluntary reduction |
| EO 104 s. 2020 | 95 | Parecoxib | 40 mg ampule | 478.01 |  |
| EO 104 s. 2020 | 96 | Fluticasone | 500 mcg/2 mL, 2 mL nebules | 85.00 |  |
| EO 104 s. 2020 | 97 | Formoterol | 12 mcg dry powder for inhalation, capsule | 24.88 |  |
| EO 104 s. 2020 | 98 | Indacaterol | 150 mg inhalation powder, capsule | 79.11 |  |
| EO 104 s. 2020 | 99 | Indacaterol | 300 mcg inhalation powder, capsule | 77.21 |  |
| EO 104 s. 2020 | 100 | Procaterol | 10 mcg/dose, 200 doses lung metered dose inhaler | 842.78 |  |
| EO 104 s. 2020 | 101 | Roflumilast | 500 mcg film-coated tablet | 88.69 |  |
| EO 104 s. 2020 | 102 | Tiotropium Bromide | 18 mcg powder for inhalation, capsule | 92.28 |  |
| EO 104 s. 2020 | 103 | Tiotropium Bromide | 2.5 mcg per dose, 60 doses (4 mL) | 2988.26 | voluntary reduction |
| EO 104 s. 2020 | 104 | Apixaban | 2.5 mg film-coated tablet | 91.17 |  |
| EO 104 s. 2020 | 105 | Apixaban | 5 mg film-coated tablet | 90.98 |  |
| EO 104 s. 2020 | 106 | Ticagrelor | 90 mg film-coated tablet | 80.25 |  |
| EO 104 s. 2020 | 107 | Tinzaparin | 10,000 anti-XA IU, 2 mL vial (SC) | 1013.00 |  |
| EO 104 s. 2020 | 108 | Tinzaparin | 4500 anti-XA IU, 0.45 mL pre-filled syringe | 350.44 |  |
| EO 104 s. 2020 | 109 | Tirofiban | 250 mcg/mL, 50 mL | 12016.12 |  |
| EO 104 s. 2020 | 110 | Triflusal | 300 mg capsule | 45.57 |  |
| EO 104 s. 2020 | 111 | Isosorbide Dinitrate | 0.1%, 10 mL ampule | 696.81 | voluntary reduction |
| EO 104 s. 2020 | 112 | Ivabradine | 5 mg film-coated tablet | 37.86 |  |
| EO 104 s. 2020 | 113 | Ivabradine | 7.5 mg film-coated tablet | 38.19 |  |
| EO 104 s. 2020 | 114 | Calcitonin (Salmon) | 100 IU/mL, 1 mL ampule | 466.79 |  |
| EO 104 s. 2020 | 115 | Calcitonin (Salmon) | 200 IU nasal spray, 14 doses | 4274.99 |  |
| EO 104 s. 2020 | 116 | Ibandronic Acid | 6 mg/6 mL, 6 mL vial | 10762.26 |  |
| EO 104 s. 2020 | 117 | Palonosetron | 75 mcg/1.5 mL, 1.5 mL vial | 1280.26 |  |
| EO 104 s. 2020 | 118 | Ramosetron | 100 mcg oral disintegrating tablet | 940.73 |  |
| EO 104 s. 2020 | 119 | Ramosetron | 300 mcg/2 mL, 2 mL ampule | 1420.05 |  |
| EO 104 s. 2020 | 120 | Betamethasone + Calcipotriol | 500 mcg + 50 mcg/g, 30 g gel | 1726.70 |  |
| EO 104 s. 2020 | 121 | Betamethasone + Salicylic Acid | 0.5 mg + 30 mg/g, 5 g ointment | 229.38 |  |
| EO 104 s. 2020 | 122 | Vortioxetine | 10 mg film-coated tablet | 98.83 |  |
| EO 104 s. 2020 | 123 | Vortioxetine | 20 mg film-coated tablet | 99.08 |  |
| EO 104 s. 2020 | 124 | Vortioxetine | 5 mg film-coated tablet | 53.57 |  |
| EO 104 s. 2020 | 125 | Deferoxamine | 500 mg, 7.5 mL vial | 245.96 |  |
| EO 104 s. 2020 | 126 | Octreotide | 20 mg vial | 67857.95 |  |
| EO 104 s. 2020 | 127 | Ganciclovir | 500 mg vial | 2299.90 |  |
| EO 104 s. 2020 | 128 | Alteplase | 50 mg, 50 mL vial | 38186.81 |  |
| EO 104 s. 2020 | 129 | Lenograstim | 263 mcg/mL, 1 mL vial | 5599.27 |  |
| EO 104 s. 2020 | 130 | Erdosteine | 175 mg/5 mL, 60 mL suspension | 186.09 |  |
| EO 104 s. 2020 | 131 | Alanyl-Glutamine | 200 mg/mL, 100 mL solution for infusion | 2489.26 |  |
| EO 104 s. 2020 | 132 | Sevelamer | 800 mg film-coated tablet | 56.24 |  |
| EO 104 s. 2020 | 133 | Beractant | 25 mg/mL, 8 mL vial | 19600.27 | voluntary reduction |
| EO 155 s. 2021 | 1 | Ibandronic Acid | 150 mg film-coated tablet | 1626.30 |  |
| EO 155 s. 2021 | 2 | Oxycodone | 10 mg capsule | 117.00 |  |
| EO 155 s. 2021 | 3 | Oxycodone | 5 mg capsule | 92.63 |  |
| EO 155 s. 2021 | 4 | Sumatriptan | 50 mg film-coated tablet | 217.00 |  |
| EO 155 s. 2021 | 5 | Dexmedetomidine | 100 mcg/mL, 2 mL vial | 2172.24 |  |
| EO 155 s. 2021 | 6 | Nitroglycerin | 1 mg/mL, 10 mL ampule | 450.00 |  |
| EO 155 s. 2021 | 7 | Nitroglycerin | 5 mg patch | 64.80 |  |
| EO 155 s. 2021 | 8 | Flecainide | 100 mg tablet | 72.60 |  |
| EO 155 s. 2021 | 9 | Fenoterol + Ipratropium Bromide | 1.75 mg/4 mL, 4 mL unit-dose vial | 69.71 |  |
| EO 155 s. 2021 | 10 | Fenoterol + Ipratropium Bromide | 50 mcg + 20 mcg, 200 doses (10 mL) metered-dose inhaler | 567.52 |  |
| EO 155 s. 2021 | 11 | Theophylline | 250 mg sustained-release tablet | 17.82 |  |
| EO 155 s. 2021 | 12 | Clavulanic Acid + Ticarcillin | 1.6 g vial | 462.30 |  |
| EO 155 s. 2021 | 13 | Clavulanic Acid + Ticarcillin | 3.2 g vial | 756.00 |  |
| EO 155 s. 2021 | 14 | Tinzaparin | 3,500 anti-XA IU, 0.35 mL pre-filled syringe | 410.99 |  |
| EO 155 s. 2021 | 15 | Levetiracetam | 100 mg/mL, 300 mL oral solution | 1936.27 |  |
| EO 155 s. 2021 | 16 | Acarbose | 100 mg tablet | 11.66 |  |
| EO 155 s. 2021 | 17 | Acarbose | 50 mg tablet | 7.11 |  |
| EO 155 s. 2021 | 18 | Insulin Glulisine | 100 U, 10 mL vial | 1241.03 |  |
| EO 155 s. 2021 | 19 | Insulin Lispro + Insulin Lispro Protamine | 100 U/mL, 3 mL pre-filled pen | 514.00 |  |
| EO 155 s. 2021 | 20 | Liraglutide | 6 mg/mL, 3 mL pre-filled pen | 3173.88 |  |
| EO 155 s. 2021 | 21 | Metformin + Saxagliptin | 1 g + 2.5 mg extended-release tablet | 28.97 |  |
| EO 155 s. 2021 | 22 | Desmopressin | 0.1 mg tablet | 79.27 |  |
| EO 155 s. 2021 | 23 | Desmopressin | 60 mcg sublingual tablet | 64.53 |  |
| EO 155 s. 2021 | 24 | Palonosetron | 50 mcg/mL, 5 mL vial | 3666.00 |  |
| EO 155 s. 2021 | 25 | Acetazolamide | 250 mg tablet | 18.50 |  |
| EO 155 s. 2021 | 26 | Pravastatin | 20 mg tablet | 17.50 |  |
| EO 155 s. 2021 | 27 | Pravastatin | 40 mg tablet | 21.53 |  |
| EO 155 s. 2021 | 28 | Amlodipine + Hydrochlorothiazide + Valsartan | 10 mg + 160 mg + 12.5 mg film-coated tablet | 25.85 |  |
| EO 155 s. 2021 | 29 | Amlodipine + Hydrochlorothiazide + Valsartan | 5 mg + 160 mg + 12.5 mg film-coated tablet | 25.52 |  |
| EO 155 s. 2021 | 30 | Amlodipine + Perindopril | 10 mg + 10 mg tablet | 47.91 |  |
| EO 155 s. 2021 | 31 | Amlodipine + Perindopril | 10 mg + 5 mg tablet | 46.19 |  |
| EO 155 s. 2021 | 32 | Amlodipine + Perindopril | 5 mg + 10 mg tablet | 36.26 |  |
| EO 155 s. 2021 | 33 | Amlodipine + Perindopril | 5 mg + 5 mg tablet | 32.26 |  |
| EO 155 s. 2021 | 34 | Amlodipine + Telmisartan | 10 mg + 40 mg tablet | 27.05 |  |
| EO 155 s. 2021 | 35 | Amlodipine + Telmisartan | 10 mg + 80 mg tablet | 38.63 |  |
| EO 155 s. 2021 | 36 | Amlodipine + Telmisartan | 5 mg + 40 mg tablet | 27.05 |  |
| EO 155 s. 2021 | 37 | Amlodipine + Telmisartan | 5 mg + 80 mg tablet | 38.63 |  |
| EO 155 s. 2021 | 38 | Atenolol + Chlortalidone | 50 mg + 12.5 mg tablet | 6.06 |  |
| EO 155 s. 2021 | 39 | Bosentan | 125 mg film-coated tablet | 1145.00 |  |
| EO 155 s. 2021 | 40 | Fosinopril | 10 mg tablet | 20.87 |  |
| EO 155 s. 2021 | 41 | Fosinopril | 20 mg tablet | 25.56 |  |
| EO 155 s. 2021 | 42 | Hydrochlorothiazide + Quinapril | 12.5 mg + 20 mg film-coated tablet | 39.61 |  |
| EO 155 s. 2021 | 43 | Iloprost | 10 mcg/mL, 2 mL nebule | 1587.48 |  |
| EO 155 s. 2021 | 44 | Indapamide + Perindopril | 0.62 mg + 2 mg tablet | 12.24 |  |
| EO 155 s. 2021 | 45 | Indapamide + Perindopril | 1.2 mg + 5 mg film-coated tablet | 25.63 |  |
| EO 155 s. 2021 | 46 | Lercanidipine | 10 mg film-coated tablet | 30.80 |  |
| EO 155 s. 2021 | 47 | Lercanidipine | 20 mg film-coated tablet | 41.74 |  |
| EO 155 s. 2021 | 48 | Metolazone | 5 mg tablet | 25.89 |  |
| EO 155 s. 2021 | 49 | Nimodipine | 10 mg, 50 mL vial | 2112.65 |  |
| EO 155 s. 2021 | 50 | Quinapril | 10 mg tablet | 20.05 |  |
| EO 155 s. 2021 | 51 | Quinapril | 20 mg tablet | 33.43 |  |
| EO 155 s. 2021 | 52 | Quinapril | 5 mg tablet | 15.01 |  |
| EO 155 s. 2021 | 53 | Trandolapril + Verapamil | 2 mg + 180 mg sustained-release capsule | 30.46 |  |
| EO 155 s. 2021 | 54 | Verapamil | 5 mg, 2 mL ampule | 158.55 |  |
| EO 155 s. 2021 | 55 | Afatinib | 50 mg film-coated tablet | 3099.73 |  |
| EO 155 s. 2021 | 56 | Erlotinib | 100 mg film-coated tablet | 1421.33 |  |
| EO 155 s. 2021 | 57 | Exemestane | 25 mg tablet | 365.96 |  |
| EO 155 s. 2021 | 58 | Fulvestrant | 250 mg/5 mL, 5 mL pre-filled syringe | 23592.47 |  |
| EO 155 s. 2021 | 59 | Gefitinib | 250 mg tablet | 3122.40 |  |
| EO 155 s. 2021 | 60 | Bromocriptine | 2.5 mg tablet | 97.65 |  |
| EO 155 s. 2021 | 61 | Bumetanide | 1 mg tablet | 20.88 |  |
| EO 155 s. 2021 | 62 | Oxybutynin | 5 mg tablet | 2.73 |  |
| EO 155 s. 2021 | 63 | Octreotide | 30 mg vial | 88729.48 |  |
| EO 155 s. 2021 | 64 | Everolimus | 10 mg tablet | 3628.09 |  |
| EO 155 s. 2021 | 65 | Everolimus | 5 mg tablet | 1814.04 |  |
| EO 155 s. 2021 | 66 | Infliximab | 100 mg, 10 mL vial | 30000.00 |  |
| EO 155 s. 2021 | 67 | Tacrolimus | 5 mg prolonged-release capsule | 675.81 |  |
| EO 155 s. 2021 | 68 | Tocilizumab | 80 mg/4 mL, 4 mL vial | 9032.81 |  |
| EO 155 s. 2021 | 69 | Deferasirox | 125 mg dispersible tablet | 361.32 |  |
| EO 155 s. 2021 | 70 | Deferasirox | 250 mg dispersible tablet | 641.42 |  |
| EO 155 s. 2021 | 71 | Betamethasone + Salicylic Acid | 0.5 mg + 30 mg/g, 10 g ointment | 301.12 |  |

---

## Appendix B — Provisional mapping to the recommended 50-SKU list

The list below is the recommendation in research note 05, not the frozen issue #10 catalog. **0 of 50 have an exact MDRP match.** A "No exact match" result means the molecule appears in the annex only in a different combination or form; it is still not a match for the POC SKU.

| # | Medicine | POC strength / form | MDRP result | Reason |
|---:|---|---|---|---|
| 1 | Amlodipine | 5 mg tablet | **No exact match** | Amlodipine appears only in fixed-dose combinations; no amlodipine monotherapy row. |
| 2 | Amlodipine | 10 mg tablet | **No exact match** | Amlodipine appears only in fixed-dose combinations; no amlodipine monotherapy row. |
| 3 | Losartan | 50 mg tablet | **No match** | Losartan is not in EO 104 or EO 155. |
| 4 | Losartan | 100 mg tablet | **No match** | Losartan is not in EO 104 or EO 155. |
| 5 | Losartan + hydrochlorothiazide | 50 mg + 12.5 mg tablet | **No match** | Losartan and this combination are not listed. |
| 6 | Enalapril | 5 mg tablet | **No match** | Enalapril is not listed. |
| 7 | Enalapril | 20 mg tablet | **No match** | Enalapril is not listed. |
| 8 | Metoprolol | 50 mg tablet | **No match** | Metoprolol is not listed. |
| 9 | Metoprolol | 100 mg tablet | **No match** | Metoprolol is not listed. |
| 10 | Hydrochlorothiazide | 25 mg tablet | **No exact match** | HCTZ appears only in fixed-dose combinations; no HCTZ monotherapy row. |
| 11 | Simvastatin | 20 mg tablet | **No match** | Simvastatin is not listed. |
| 12 | Simvastatin | 40 mg tablet | **No match** | Simvastatin is not listed. |
| 13 | Atorvastatin | 20 mg tablet | **No match** | Atorvastatin is not listed; EO 155 lists pravastatin only. |
| 14 | Aspirin (low-dose) | 80 mg tablet | **No match** | Aspirin is not listed. |
| 15 | Metformin | 500 mg tablet | **No exact match** | Metformin appears only with saxagliptin or sitagliptin; no metformin monotherapy row. |
| 16 | Metformin | 850 mg tablet | **No exact match** | Metformin appears only with saxagliptin or sitagliptin; no metformin monotherapy row. |
| 17 | Gliclazide | 30 mg MR tablet | **No match** | Gliclazide is not listed. |
| 18 | Gliclazide | 60 mg MR tablet | **No match** | Gliclazide is not listed. |
| 19 | Salbutamol | 100 mcg/dose MDI | **No match** | Salbutamol is not listed. |
| 20 | Salbutamol | 2 mg/5 mL syrup | **No match** | Salbutamol is not listed. |
| 21 | Salbutamol | 1 mg/mL nebule | **No match** | Salbutamol is not listed. |
| 22 | Ipratropium + salbutamol | 500 mcg + 2.5 mg unit-dose | **No match** | EO 155 lists fenoterol + ipratropium, a different combination. |
| 23 | Fluticasone + salmeterol | 100 mcg + 50 mcg DPI | **No match** | EO 104 lists fluticasone nebules only; no salmeterol combination. |
| 24 | Montelukast | 10 mg tablet | **No match** | Montelukast is not listed. |
| 25 | Amoxicillin | 500 mg capsule | **No match** | Amoxicillin is not listed. |
| 26 | Amoxicillin | 250 mg/5 mL suspension | **No match** | Amoxicillin is not listed. |
| 27 | Co-amoxiclav | 500 mg + 125 mg tablet | **No match** | Co-amoxiclav is not listed. |
| 28 | Co-amoxiclav | 400 mg + 57 mg/5 mL suspension | **No match** | Co-amoxiclav is not listed. |
| 29 | Ciprofloxacin | 500 mg tablet | **No match** | Ciprofloxacin is not listed. |
| 30 | Clarithromycin | 500 mg tablet | **No match** | Clarithromycin is not listed. |
| 31 | Cotrimoxazole | 400 mg + 80 mg tablet | **No match** | Cotrimoxazole is not listed. |
| 32 | Nitrofurantoin | 100 mg capsule | **No match** | Nitrofurantoin is not listed. |
| 33 | Cefixime | 200 mg capsule | **No match** | Cefixime is not listed. |
| 34 | Azithromycin | 500 mg tablet | **No match** | Azithromycin is not in the current EO 104/EO 155 annexes (it was in repealed EO 821). |
| 35 | Doxycycline | 100 mg capsule | **No match** | Doxycycline is not listed. |
| 36 | Paracetamol | 500 mg tablet | **No match** | Paracetamol is not listed. |
| 37 | Paracetamol | 120 mg/5 mL syrup | **No match** | Paracetamol is not listed. |
| 38 | Mefenamic acid | 500 mg tablet/capsule | **No match** | Mefenamic acid is not listed. |
| 39 | Ibuprofen | 200 mg tablet | **No match** | Ibuprofen is not listed. |
| 40 | Diclofenac | 50 mg tablet | **No match** | Diclofenac is not listed. |
| 41 | Omeprazole | 20 mg capsule | **No match** | Omeprazole is not listed. |
| 42 | Oral rehydration salts | 20.5 g sachet | **No match** | ORS is not listed. |
| 43 | Bisacodyl | 5 mg tablet | **No match** | Bisacodyl is not listed. |
| 44 | Domperidone | 10 mg tablet | **No match** | Domperidone is not listed. |
| 45 | Loratadine | 10 mg tablet | **No match** | Loratadine is not listed. |
| 46 | Chlorphenamine | 4 mg tablet | **No match** | Chlorphenamine is not listed. |
| 47 | Prednisone | 10 mg tablet | **No match** | Prednisone is not listed. |
| 48 | Ferrous salt + folic acid | 60 mg + 400 mcg tablet | **No match** | This combination is not listed. |
| 49 | Multivitamins | tablet | **No match** | Multivitamins are not listed. |
| 50 | Mupirocin | 2% ointment, 5 g | **No match** | Mupirocin is not listed. |
