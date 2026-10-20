# POC seed: provisional 50-SKU medicine catalog

**Ticket:** [Xaidel/pharmassist#20](https://github.com/Xaidel/pharmassist/issues/20)  
**Researched:** 21 October 2026  
**Status:** Provisional. Candidate generic groups require pharmacist review; no therapeutic-equivalence claim is made.

---

## 1. Bottom line

- The catalog has **50 SKUs**. **49 of 50** are listed in the **DOH Philippine National Formulary Essential Medicines List** (8th edition, EML as of 2 November 2022). The exception is **POC-016**, the MDRP-covered metformin + sitagliptin combination added under issue #30 (see section 4.1).
- **33 of 50 (66%)** are listed in the **PhilHealth Konsulta drug list** (Annex C, as of 30 March 2024) after a line-by-line check of strength and dosage form. PRD FR-6 and research note 05 state 32 of 50; the one-SKU difference is flagged for reconciliation in the final-list ticket (#10).
- **49 of 50** SKUs have a verified FDA reference product and a verified candidate generic alternative. The exception is **co-amoxiclav 400 mg + 57 mg per 5 mL suspension, 70 mL**: it is PNF- and Konsulta-listed, but no FDA Verification Portal record for that presentation was found in this pass, so its reference product is recorded as unavailable.
- No price data were collected. The "candidate cheapest-generic" alternatives are candidate groupings, not price-ranked products, until shelf-price collection establishes the ranking.
- Product-level data are in `docs/research/data/poc-50-sku-catalog.json`.

---

## 2. Method

### 2.1 SKU basis

The 50-row list is the PNF/Konsulta-anchored starter list in [`docs/research/05-naga-market-context.md`](05-naga-market-context.md), section 4. This note does not reopen the list apart from one deliberate replacement under issue #30: **POC-016** was changed from metformin 850 mg to metformin + sitagliptin 500 mg + 50 mg to give the POC an exact published MDRP ceiling (section 4.1). For every row it adds a reference brand and pack for the price record, the FDA registration record, and a candidate generic alternative.

### 2.2 Primary sources

| ID | Source | Use in this note |
|---|---|---|
| S1 | DOH **Philippine National Formulary Essential Medicines List**, 8th edition (title page 2017), EML as of 2 November 2022, hosted by PhilHealth: <https://www.philhealth.gov.ph/partners/providers/pdf/PNF-EML_11022022.pdf> | Confirmed the active ingredient, strength, and dosage form of every SKU; page references in the catalog table are to this PDF. |
| S2 | PhilHealth **Annex C: Checklist of PhilHealth Konsulta Drugs and its Preparations**, as of 30 March 2024: <https://www.philhealth.gov.ph/circulars/2024/0013/Annex_C_Checklist_of_PhilHealth_Konsulta_Drugs_as_of_March_2024.pdf> | Line-by-line Konsulta membership check at the strength/form level. |
| S3 | FDA Philippines **Verification Portal**, registered drug products (`cdrr` records): <https://verification.fda.gov.ph/> | Brand, generic, strength/form, manufacturer, Rx/OTC classification, packaging, registration number, and registration expiry for the selected reference and candidate products. |

The FDA records were read on **21 October 2026** through the same undocumented JSON search endpoint the portal front-end uses (`/api/search?q=…`). The endpoint has no bulk export and rate-limits repeated queries (HTTP 429 observed); the extract is therefore a point-in-time sample of the search terms used, not a full national extract. Selected records were then checked by registration number against the saved query results. The FDA portal has no public developer API or open-data licence; this note uses it for verification, not bulk redistribution.

### 2.3 Product selection rules

1. **Reference product.** Prefer the originator/top-selling brand where it is present in the FDA extract. Where a classic originator was not found (Renitec, Aquazide, Augmentin, Klacid, Bactrim, Macrodantin, Suprax, Vibramycin, Chlor-Trimeton), a currently registered local brand is used as the reference pack and the substitution is noted in the JSON `data_gaps` and below.
2. **Pack for the price record.** Use the FDA-registered commercial pack that best matches the PNF/Konsulta presentation. Where the FDA packaging field lists several packs, the chosen pack is recorded in `price_reference.pack`; the full registered packaging string is preserved in `fda_registration.packaging_as_registered`.
3. **Candidate generic alternative.** Use a registered product with the same generic name, strength, and dosage form, and record its FDA registration number and pack. Two exceptions are explicitly flagged: a different inhaler device (Seretide Diskus vs Salmetide capsule DPI) and a different dosage form (cefixime capsule vs tablet). These are candidates for review, **not** interchangeable products.
4. **Unavailable facts.** If a product or field could not be verified, the JSON records `null` or an explicit "Unavailable" value rather than an invented fact.

### 2.4 Caveats

- **No therapeutic-equivalence claim.** The FDA registry has no bioequivalence or interchangeable-brand field. Candidate groups are derived from generic name + strength + dosage form and must be reviewed by a pharmacist.
- **No price claim.** "Candidate cheapest-generic" is a placeholder label. Price rank must be established by the shelf-price collection.
- **Pack sizes are registration data.** A pharmacy may sell a different pack or sell per unit. Price records must capture the actual pack and compute the unit price.
- **Rx/OTC follows the FDA classification of the specific product.** It can differ between brands of the same molecule (for example, Aspilets is classified Rx while Philprin is OTC; Motilium is Rx while Gastromec is OTC). "Household Remedy (HR)" products are treated as OTC-family products, not prescription drugs.
- **Point-in-time records.** Registration expiry dates are certificate validity dates, not product expiry dates. Re-verify before the pilot.

---

## 3. Counts at a glance

| Measure | Count |
|---|---:|
| SKUs | 50 |
| PNF-listed | 49 |
| Konsulta-listed | 33 (66%) |
| FDA reference product verified | 49 |
| Candidate generic product verified | 49 |
| Reference or candidate registration expiring within 6 months (to 21 April 2027) | 9 (5 reference, 4 candidate) |

---

## 4. Catalog

The table gives the reference product and candidate generic for each SKU. Full fields — including the FDA generic/strength/form as registered, full packaging string, candidate manufacturer, candidate Rx/OTC, registration expiry, and per-SKU gaps — are in the JSON.

| # | Category | Generic (strength; form) | Reference brand / pack | Manufacturer | Rx/OTC | FDA reg | Candidate generic / pack | PNF p. | Konsulta |
|---:|---|---|---|---|---|---|---|---:|---|
| POC-001 | Cardiovascular | Amlodipine (as besilate/camsylate) 5 mg; Tablet | Norvasc / Box of 100 tablets | Viatris Pharmaceuticals LLC | Rx | DRP-3419 | Amlostan / Box of 100 tablets | 17 | Y |
| POC-002 | Cardiovascular | Amlodipine (as besilate/camsylate) 10 mg; Tablet | Norvasc / Box of 100 tablets | Viatris Pharmaceuticals LLC | Rx | DRP-3429 | Lodi / Box of 30 tablets | 17 | Y |
| POC-003 | Cardiovascular | Losartan (as potassium salt) 50 mg; Tablet | Cozaar / Box of 30 tablets | Organon Pharma (UK) Limited | Rx | DRP-6249 | Prestan / Box of 100 tablets | 45 | Y |
| POC-004 | Cardiovascular | Losartan (as potassium salt) 100 mg; Tablet | Cozaar / Box of 30 tablets | Organon Pharma (UK) Limited | Rx | DRP-6250 | Wilopres / Box of 100 tablets | 45 | Y |
| POC-005 | Cardiovascular | Losartan + hydrochlorothiazide 50 mg + 12.5 mg; Film-coated tablet | Hyzaar / Box of 30 tablets | Organon Pharma (UK) Limited | Rx | DR-XY24847 | Zartan Plus / Box of 30 tablets | 45 | — |
| POC-006 | Cardiovascular | Enalapril (as maleate) 5 mg; Tablet | Scheepril / Box of 100 tablets | Scheele Laboratories Phils., Inc. | Rx | DRP-1079 | Enara 5 / Box of 28 tablets | 30 | Y |
| POC-007 | Cardiovascular | Enalapril (as maleate) 20 mg; Tablet | Scheepril / Box of 100 tablets | Scheele Laboratories Phils., Inc. | Rx | DRP-1078 | Enara 20 / Box of 28 tablets | 30 | Y |
| POC-008 | Cardiovascular | Metoprolol (as tartrate) 50 mg; Tablet | Betaloc / Box of 100 tablets | AstraZeneca Pharmaceutical Company Ltd. | Rx | DR-X1848 | Neobloc / Box of 100 tablets | 47 | Y |
| POC-009 | Cardiovascular | Metoprolol (as tartrate) 100 mg; Tablet | Betaloc / Box of 105 tablets | AstraZeneca Pharmaceutical Company Ltd. | Rx | DR-X1812 | Neobloc / Box of 100 tablets | 47 | Y |
| POC-010 | Cardiovascular | Hydrochlorothiazide 25 mg; Tablet | Hytaz / Box of 200 tablets | Amherst Laboratories, Inc. | Rx | DRP-9982 | Diuzid / Box of 100 tablets | 38 | Y |
| POC-011 | Cardiovascular | Simvastatin 20 mg; Tablet | Zocor / Box of 30 tablets | Organon Pharma (UK) Limited | Rx | DRP-6241 | Vastilan / Box of 30 tablets | 57 | Y |
| POC-012 | Cardiovascular | Simvastatin 40 mg; Tablet | Zocor HP / Box of 30 tablets | Organon Pharma (UK) Limited | Rx | DRP-6243 | Vastilan / Box of 30 tablets | 57 | Y |
| POC-013 | Cardiovascular | Atorvastatin (as calcium) 20 mg; Tablet | Lipitor / Box of 100 tablets | Pfizer Pharmaceuticals LLC | Rx | DRP-3362 | Atorlee / Box of 100 tablets | 18 | — |
| POC-014 | Cardiovascular | Aspirin 80 mg; Tablet | Aspilets / Box of 500 tablets | Amherst Laboratories, Inc. | Rx | DR-2350 | Philprin / Box of 100 tablets | 18 | Y |
| POC-015 | Diabetes | Metformin (as hydrochloride) 500 mg; Film-coated tablet | Gludin / Box of 100 tablets | Hizon Laboratories, Inc. | Rx | DRP-7406-03 | Formex / Box of 100 tablets | 46 | Y |
| POC-016 § | Diabetes | Metformin (as hydrochloride) + sitagliptin (as phosphate monohydrate) 500 mg + 50 mg; Film-coated tablet | Janumet / Box of 28 tablets | Patheon Puerto Rico, Inc. | Rx | DRP-4010 | Sitaplus / Box of 21 tablets | — | — |
| POC-017 | Diabetes | Gliclazide 30 mg; Modified-release tablet | Glicla-Natrapharm / Box of 60 tablets | Lloyd Laboratories, Inc. | Rx | DR-XY38504 | Azukon MR 30 / Box of 60 tablets | 36 | Y |
| POC-018 | Diabetes | Gliclazide 60 mg; Modified-release tablet | Diamicron MR / Box of 60 tablets | Les Laboratoires Servier Industrie | Rx | DR-XY38522 | Neoclazz MR / Box of 100 tablets | 36 | Y |
| POC-019 | Respiratory | Salbutamol (as sulfate) 100 mcg/dose; Metered-dose inhaler (200 actuations) | Ventolin Inhaler / 1 inhaler (200 actuations) | Glaxo Wellcome S.A. | Rx | DR-XY23941 | Salbumin / 1 inhaler (200 doses) | 57 | Y |
| POC-020 | Respiratory | Salbutamol (as sulfate) 2 mg/5 mL; Syrup | Asmalin / Bottle of 60 mL | Amherst Laboratories, Inc. | Rx | DRP-12186 | Salbugen / Bottle of 60 mL | 57 | Y |
| POC-021 | Respiratory | Salbutamol (as sulfate) 1 mg/mL; Nebuliser solution, 2.5 mL unit-dose | Ventolin Nebules / Box of 20 ampoules (2.5 mL each) | GlaxoSmithKline Australia Pty Ltd | Rx | DR-XY13579 | Asmacaire / Box of 35 ampoules (2.5 mL each) | 57 | Y |
| POC-022 | Respiratory | Ipratropium + salbutamol 500 mcg + 2.5 mg per 2.5 mL; Nebuliser solution, unit-dose | Combivent UDV / Box of 20 unit-dose vials (2.5 mL each) | Laboratoire Unither | Rx | DRP-7891 | Combipul / Box of 20 unit-dose vials (2.5 mL each) | 41 | Y |
| POC-023 | Respiratory | Fluticasone (as propionate) + salmeterol (as xinafoate) 100 mcg + 50 mcg per dose; Dry-powder inhaler | Seretide 100 Diskus / 1 Diskus (60 doses) | Glaxo Wellcome Production | Rx | DR-XY25838 | Salmetide / Box of 40 capsules + inhaler † | 35 | Y |
| POC-024 | Respiratory | Montelukast (as sodium) 10 mg; Film-coated tablet | Singulair / Box of 28 tablets | Organon Pharma (UK) Limited | Rx | DR-XY24157 | Monteresp / Box of 30 tablets | 48 | — |
| POC-025 | Anti-infective | Amoxicillin (as trihydrate) 500 mg; Capsule | Amoxil / Box of 100 capsules | Glaxo Wellcome Production | Rx | DRP-6461 | Nuevamoxil / Box of 100 capsules | 17 | Y |
| POC-026 | Anti-infective | Amoxicillin (as trihydrate) 250 mg/5 mL; Powder for suspension, 60 mL | Pediamox / Bottle of 60 mL | Asian Antibiotics, Inc. | Rx | DR-X8346 | Trixen-250 / Bottle of 60 mL | 17 | Y |
| POC-027 | Anti-infective | Co-amoxiclav (amoxicillin + potassium clavulanate) 500 mg + 125 mg; Film-coated tablet | Moxinova CV / Box of 14 tablets | Yeluri Formulations Pvt. Ltd. | Rx | DRP-11805 | Atadar / Box of 12 tablets | 25 | Y |
| POC-028 | Anti-infective | Co-amoxiclav (amoxicillin + potassium clavulanate) 400 mg + 57 mg per 5 mL; Powder for suspension, 70 mL | Unavailable (not found in FDA extract) / Bottle of 70 mL (per PNF/Konsulta; product not verified) | Unavailable (not found in FDA extract) | Rx* | Unavailable | Unavailable | 25 | Y |
| POC-029 | Anti-infective | Ciprofloxacin (as hydrochloride) 500 mg; Film-coated tablet | Ciprobay / Box of 50 tablets | Bayer AG | Rx | DRP-7194 | Ciprophil / Box of 100 tablets | 24 | Y |
| POC-030 | Anti-infective | Clarithromycin 500 mg; Film-coated tablet | Clarithro-Natrapharm / Box of 28 tablets | Interphil Laboratories, Inc. | Rx | DRP-2331-04 | Claribid / Box of 100 tablets | 24 | Y |
| POC-031 | Anti-infective | Cotrimoxazole (sulfamethoxazole + trimethoprim) 400 mg + 80 mg; Tablet | Cozole / Box of 100 tablets | Lloyd Laboratories, Inc. | Rx | DR-XY17719-B | Cotrimaxol / Box of 100 tablets | 26 | Y |
| POC-032 | Anti-infective | Nitrofurantoin 100 mg; Capsule | Macrobex / Box of 100 capsules | Scheele Laboratories Phils., Inc. | Rx | DRP-049-04 | Nitro / Box of 20 capsules | 50 | Y |
| POC-033 | Anti-infective | Cefixime (as trihydrate) 200 mg; Capsule | Vamocef / Box of 50 capsules | Lloyd Laboratories, Inc. | Rx | DR-XY44294 | Cefipro 200 / Box of 20 tablets ‡ | 23 | — |
| POC-034 | Anti-infective | Azithromycin (as dihydrate) 500 mg; Film-coated tablet | Zithromax / Box of 3 tablets | Viatris Pharmaceuticals LLC | Rx | DRP-8702 | AzithroMax / Box of 3 tablets | 19 | — |
| POC-035 | Anti-infective | Doxycycline (as hyclate) 100 mg; Capsule | Doxin / Box of 50 capsules | Amherst Laboratories, Inc. | Rx | DR-X1308 | Medox / Box of 100 capsules | 30 | — |
| POC-036 | Pain / fever | Paracetamol 500 mg; Tablet | Biogesic / Box of 500 tablets | UNILAB, Inc. | OTC | DR-153 | Acetawind / Box of 100 tablets | 52 | Y |
| POC-037 | Pain / fever | Paracetamol 120 mg/5 mL; Syrup/suspension, 60 mL | Calpol / Bottle of 60 mL | PT Sterling Products Indonesia | OTC | DRHR-2132 | Tempra / Bottle of 60 mL | 52 | Y |
| POC-038 | Pain / fever | Mefenamic acid 500 mg; Tablet | Ponstan / Box of 200 tablets | P.T. Pfizer Indonesia | Rx | DRP-2092 | Mefenax / Box of 100 tablets | 45 | — |
| POC-039 | Pain / fever | Ibuprofen 200 mg; Tablet | Medicol / Box of 500 tablets | UNILAB, Inc. | OTC | DR-XY24958 | Midol / Box of 100 tablets | 39 | — |
| POC-040 | Pain / fever | Diclofenac (as sodium) 50 mg; Enteric-coated tablet | Voltaren Forte / Box of 100 tablets | Novartis Saglik, Gida Ve Tarim Urunleri San. Ve Tic. A.S. | Rx | DR-XY27769 | Rheudi / Box of 100 tablets | 28 | — |
| POC-041 | GI | Omeprazole 20 mg; Capsule | Losec / Unavailable (FDA packaging field blank; confirm at pharmacy) | AstraZeneca AB | Rx | DR-XY18227 | Megapraz / Box of 30 capsules | 51 | — |
| POC-042 | GI | Oral rehydration salts (ORS 75-replacement) 20.5 g per sachet; Powder for oral solution | E-Lyte / Box of 10 sachets | Medicamen Biotech Limited | OTC | DRP-9468 | Rap-Ors / Box of 10 sachets | 51 | Y |
| POC-043 | GI | Bisacodyl 5 mg; Enteric-coated tablet | Dulcolax / Box of 120 tablets | Sanofi Vietnam Shareholding Company | OTC | DR-XY42393 | Bisapro / Box of 100 tablets | 20 | — |
| POC-044 | GI | Domperidone 10 mg; Tablet | Motilium / Box of 100 tablets | Interphil Laboratories, Inc. | Rx | DR-XY25762 | Gastromec / Box of 100 tablets | 29 | — |
| POC-045 | Allergy | Loratadine 10 mg; Tablet | Claritin / Box of 100 tablets | PT. Bayer Indonesia | OTC | DR-XY46593 | Clarexa / Box of 100 tablets | 45 | — |
| POC-046 | Allergy | Chlorphenamine (as maleate) 4 mg; Tablet | Antamin / Box of 100 tablets | Pascual Laboratories, Inc. | Rx | DR-2359 | Allermax / Box of 100 tablets | 24 | Y |
| POC-047 | Steroid | Prednisone 10 mg; Film-coated tablet | Biopred / Box of 100 tablets | Lloyd Laboratories, Inc. | Rx | DR-XY31050 | Presone / Box of 100 tablets | 55 | Y |
| POC-048 | Vitamin / mineral | Ferrous salt + folic acid 60 mg elemental iron + 400 mcg folic acid; Film-coated tablet | Folifex / Box of 100 tablets | Azarias Pharmaceutical Laboratories Inc. | OTC | DRP-13739-03 | Prenat / Box of 100 tablets | 34 | — |
| POC-049 | Vitamin / mineral | Multivitamins standard adult tablet; Tablet | Enervon / Bottle of 30 tablets | UNILAB, Inc. | OTC | DR-XY30455 | Revitaplex / Box of 100 tablets | 49 | — |
| POC-050 | Topical | Mupirocin 2% (20 mg/g); Ointment, 5 g tube | Bactroban / Tube of 5 g | Glaxo Operations UK Ltd. Trading as Glaxo Wellcome Operations | Rx | DRP-4193 | Mupigen / Tube of 5 g | 49 | — |

**Table notes**

- † The candidate is a capsule DPI with a separate inhaler, not a Diskus device. It is the same strength but not a like-for-like device substitution.
- ‡ The candidate is a film-coated tablet, not a capsule. It is the same molecule and strength but a different dosage form.
- \* The reference product could not be verified in the FDA extract; PNF and Konsulta both list this presentation.
- "Unavailable" means the fact was not verified in this pass. It is not an assertion that no such product exists.
- PNF page numbers refer to the PNF-EML PDF (S1); the PNF entry (or a summary for composition-table entries) is in the JSON `pnf.entry`.
- § POC-016 is the MDRP-covered SKU added under issue #30. It is not PNF- or Konsulta-listed. See section 4.1.

### 4.1 MDRP-covered SKU added under issue #30

Issue #30 required one SKU with an exact MDRP match so the POC's above-MDRP state can be demonstrated with a real published ceiling. **POC-016** was replaced for this purpose. The catalog still has exactly 50 SKUs.

| Field | Value |
|---|---|
| Replaced SKU | POC-016 Metformin (as hydrochloride) 850 mg film-coated tablet (Glucophage Forte, DRP-6510) |
| Replacement SKU | POC-016 Metformin (as hydrochloride) + sitagliptin (as phosphate monohydrate) 500 mg + 50 mg film-coated tablet (Janumet) |
| Why this row | 850 mg was the second metformin strength in the catalog, so the 500 mg monotherapy row (POC-015) remains; the replaced record also had blank FDA manufacturer and packaging fields; and the replacement stays in the Diabetes category. |
| FDA reference | **Janumet**, DRP-4010, Patheon Puerto Rico, Inc. (importer Merck Sharp & Dohme (I.A.) LLC), 50 mg/500 mg film-coated tablet, Alu/Alu blister x 7's (box of 28's; box of 7's physician sample), registration expiry 14 March 2029. Source: FDA Verification Portal, <https://verification.fda.gov.ph/api/search?q=janumet>, accessed 2026-10-21. |
| Candidate generic | **Sitaplus**, DR-XY48840, Lloyd Laboratories, Inc., 500 mg/50 mg film-coated tablet, Alu/Alu blister x 7's (box of 21's), registration expiry 10 August 2028. Source: FDA Verification Portal, <https://verification.fda.gov.ph/api/search?q=sitaplus>, accessed 2026-10-21. |
| MDRP match key | **Exact**: molecule set `{metformin, sitagliptin}`; strength `500 mg + 50 mg`; form `film-coated tablet`; pack `null` (the annex states no pack count). |
| MDRP source | EO No. 104, s. 2020, annex **row 44**, MRP **PHP 30.31** per tablet (VAT-exclusive), MWP PHP 25.05. Source: [S4], PDF page 5. |
| Seed fields | `mdrp.match_basis = "exact"`, `mdrp.mdrp_entry_id = "EO104-044"`, `mdrp.annex_row = 44`, `mdrp.mrp_php = 30.31`, `mdrp.vat_exclusive_mrp = true`, `mdrp.pack_size = null`, `mdrp.source_url = S4`. |

The annex publishes no pack count for this row, so PHP 30.31 is the **unit ceiling**. The box-of-28 equivalent is 30.31 × 28 = PHP 848.68; it must be labelled as computed from the published unit MRP, not as a published pack ceiling. The MRP is VAT-exclusive, so a VAT-inclusive shelf price may legitimately exceed it; the UI must show that basis. This SKU is the one exception to the zero-match result in research note 18.

---

## 5. PNF and Konsulta overlap

### 5.1 PNF

**49 of 50** SKUs match a PNF entry at the active-ingredient level, and each row's strength/form is covered by the PNF entry cited in the table. The exception is **POC-016**, the MDRP-covered metformin + sitagliptin fixed-dose combination added under issue #30; the PNF EML does not list that combination. The PNF is the canonical generic-name and strength/form reference; it does not supply brands, manufacturers, or commercial packs.

### 5.2 Konsulta

**33 of 50 (66%)** SKUs match Annex C at the strength/form level:

`POC-001, 002, 003, 004, 006, 007, 008, 009, 010, 011, 012, 014, 015, 017, 018, 019, 020, 021, 022, 023, 025, 026, 027, 028, 029, 030, 031, 032, 036, 037, 042, 046, 047`

The 17 SKUs **not** in Annex C are:

`POC-005` (losartan + HCTZ 50/12.5), `POC-013` (atorvastatin 20), `POC-016` (metformin + sitagliptin 500/50, added under #30), `POC-024` (montelukast 10), `POC-033` (cefixime 200), `POC-034` (azithromycin 500), `POC-035` (doxycycline 100), `POC-038` (mefenamic acid 500), `POC-039` (ibuprofen 200), `POC-040` (diclofenac 50), `POC-041` (omeprazole 20), `POC-043` (bisacodyl 5), `POC-044` (domperidone 10), `POC-045` (loratadine 10), `POC-048` (ferrous salt + folic acid), `POC-049` (multivitamins), `POC-050` (mupirocin 2%).

### 5.3 The 32-versus-33 discrepancy

PRD FR-6 and research note 05 both state that **32 of 50** overlap with Konsulta. A line-by-line check of the same 50 rows against Annex C finds **33**. Replacing POC-016 under issue #30 reduced the earlier row-level count from 34 to 33, so the gap against the stated 32 is now one SKU. The earlier note does not identify which SKU was excluded, so the exact cause cannot be reconstructed without re-running the earlier count; the most likely explanation is count drift between the list draft and the final table. **Reconcile this in the final-list ticket (#10) before freezing the pilot catalog.** The JSON records both figures and the row-level result.

---

## 6. Candidate generic groups

The candidate alternatives in the table and JSON are **candidate generic groups**, derived from generic name + strength + dosage form. They are not a determination of therapeutic equivalence, bioequivalence, or interchangeability. The FDA registry has no brand-to-brand equivalence field, so a pharmacist must review each group before the app presents it as an alternative.

Points to carry into that review:

- **Same molecule/strength/form is the default rule.** Two rows are explicit exceptions: Seretide 100 Diskus vs Salmetide capsule DPI, and Vamocef capsule vs Cefipro tablet. Both are flagged in the JSON and the table.
- **Rx/OTC can differ by brand.** Aspilets is Rx while Philprin is OTC; Motilium is Rx while Gastromec is OTC; Calpol is OTC while Tempra is a Household Remedy. The app should use the specific product's FDA classification, not the molecule's.
- **"Cheapest" is not established.** The candidates are low-cost generic brands chosen as plausible price leaders, but no shelf price was collected. Price collection must rank the reference brand and the candidate within each pharmacy.
- **Pack sizes differ.** Unit-price normalisation is required: per tablet/capsule, per mL, per actuation, per unit-dose, per sachet, or per gram, as recorded in `price_reference.unit_basis`.

---

## 7. Data gaps and verification notes

### 7.1 Product-level gaps

1. **Co-amoxiclav 400 mg + 57 mg per 5 mL, 70 mL (POC-028).** PNF and Konsulta both list it. No FDA Verification Portal record for this presentation was found in this pass, so the reference brand, manufacturer, pack size, and candidate generic are recorded as unavailable. Verify against the FDA portal and a pharmacy's actual stock before the pilot.
2. **Losec 20 mg (POC-041, DR-XY18227).** The FDA packaging field is blank. Confirm the retail pack.
3. **POC-016 MDRP match.** The replacement SKU's ceiling is tied to EO 104 s. 2020 row 44 (per-tablet, VAT-exclusive). Re-verify the annex row and the Janumet/Sitaplus registrations before the pilot.

### 7.2 Brand substitutions

The following classic originator brands were **not found** in the FDA extract used for this pass. A verified registered local brand was substituted as the reference pack and is noted per SKU in the JSON:

| SKU | Expected classic brand | Verified reference used |
|---|---|---|
| POC-006/007 | Renitec | Scheepril |
| POC-010 | Aquazide | Hytaz |
| POC-015 | Glucophage 500 | Gludin |
| POC-017 | Diamicron MR 30 | Glicla-Natrapharm 30 |
| POC-020 | Ventolin syrup (60 mL) | Asmalin (Ventolin syrup found only as 100 mL) |
| POC-026 | Amoxil 250 mg/5 mL | Pediamox |
| POC-027 | Augmentin | Moxinova CV |
| POC-030 | Klacid | Clarithro-Natrapharm |
| POC-031 | Bactrim | Cozole |
| POC-032 | Macrodantin | Macrobex |
| POC-033 | Suprax | Vamocef |
| POC-035 | Vibramycin | Doxin |
| POC-042 | Hydrite 20.5 g | E-Lyte (Hydrite found only as 4.1 g household-remedy packs) |
| POC-046 | Chlor-Trimeton | Antamin |
| POC-047 | Originator prednisone brand not identified | Biopred |
| POC-048 | Fefol | Folifex |

These substitutions do not mean the classic brands are unregistered or unavailable in pharmacies; they mean the FDA extract did not return them. If the pilot needs those exact brands for price comparison, verify each against the FDA portal and the pharmacy shelf before adding it.

### 7.3 Registration expiry within 6 months

The following selected registrations expire on or before **21 April 2027** (CPR validity, not product expiry). Re-verify before the pilot:

| Date | Role | SKU | Brand | Registration |
|---|---|---|---|---|
| 2026-11-05 | reference | POC-041 | Losec | DR-XY18227 |
| 2026-12-22 | reference | POC-021 | Ventolin Nebules | DR-XY13579 |
| 2026-12-22 | candidate | POC-034 | AzithroMax | DRP-3456-02 |
| 2027-01-12 | reference | POC-015 | Gludin | DRP-7406-03 |
| 2027-01-17 | candidate | POC-020 | Salbugen | DRP-6795-01 |
| 2027-03-12 | candidate | POC-049 | Revitaplex | DR-XY22685 |
| 2027-04-02 | reference | POC-009 | Betaloc 100 | DR-X1812 |
| 2027-04-05 | reference | POC-046 | Antamin | DR-2359 |
| 2027-04-12 | candidate | POC-037 | Tempra | DRHR-1766 |

### 7.4 Other gaps and risks

- **No price data.** The catalog has no shelf prices, no senior/PWD discounted prices, and no stock status. Those are collected in the pilot.
- **Pack-size normalisation.** FDA packaging is free text and sometimes lists multiple packs. The chosen price-reference pack is in the JSON, but the pharmacy may sell a different pack; capture the actual pack and compute the unit price.
- **FDA extract coverage.** The portal has no bulk API and rate-limits searches. Some registered products may not have been returned by the 37 generic search terms used. The extract is adequate for a 50-SKU seed but must be re-verified, not treated as a national product master.
- **Edition lag.** PNF is the 8th edition with EML as of 2 November 2022; Konsulta Annex C is as of 30 March 2024. Check for newer ePNF/Konsulta advisories before launch.
- **Regulatory presentation.** Publishing prescription-medicine prices may be treated as advertising/promotion. Clear the presentation with FDA/counsel per research note 01 before any public price goes live.

---

## 8. Recommended next steps for the final list (#10)

1. Reconcile the **32-versus-33** Konsulta count and record the final overlap in the PRD.
2. Verify a registered product for **co-amoxiclav 400/57 70 mL**, or replace the SKU with a PNF/Konsulta alternative if it cannot be sourced.
3. Re-verify the **9 registrations expiring within 6 months**, especially Losec and Ventolin Nebules.
4. Have a pharmacist review every **candidate generic group**, with explicit attention to the two device/form exceptions.
5. Use the reference packs in this catalog for shelf-price collection; capture actual pack, unit price, stock status, and senior/PWD price.
6. Decide whether to keep the verified local reference brands or add the absent classic brands after manual FDA/pharmacy verification.
7. Re-check the PNF/Konsulta editions and the FDA records immediately before the pilot freeze.
8. Keep POC-016's MDRP match pinned to EO 104 s. 2020 row 44 and re-verify the annex row and FDA registrations before the pilot.

---

## 9. Sources

| ID | Source | URL | Accessed |
|---|---|---|---|
| S1 | DOH Philippine National Formulary Essential Medicines List, 8th Edition (2017), EML as of 02 November 2022 (hosted by PhilHealth) | <https://www.philhealth.gov.ph/partners/providers/pdf/PNF-EML_11022022.pdf> | 21 Oct 2026 |
| S2 | PhilHealth Annex C: Checklist of PhilHealth Konsulta Drugs and its Preparations, as of 30 March 2024 | <https://www.philhealth.gov.ph/circulars/2024/0013/Annex_C_Checklist_of_PhilHealth_Konsulta_Drugs_as_of_March_2024.pdf> | 21 Oct 2026 |
| S3 | FDA Philippines Verification Portal — registered drug products (`cdrr`) | <https://verification.fda.gov.ph/> | 21 Oct 2026 |
| S4 | EO No. 104, s. 2020, Annex — List of Medicines and Corresponding MWP and MRP | <https://www.officialgazette.gov.ph/downloads/2020/02feb/20200217-EO-104-RRD.pdf> | 21 Oct 2026 |

Internal references: [`docs/PRD.md`](../PRD.md) FR-6; [`docs/research/05-naga-market-context.md`](05-naga-market-context.md) §4 (the 50-row basis) and §7 (data-gap validation plan); [`docs/research/03-medicine-catalog-data.md`](03-medicine-catalog-data.md) (FDA/PNF source assessment); [`docs/research/poc-mdrp-ceilings.md`](poc-mdrp-ceilings.md) (MDRP transcription and matching rules).
