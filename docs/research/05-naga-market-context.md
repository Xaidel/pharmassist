# Research 05 — Naga City market context for a medicine price-comparison pilot

- Ticket: `https://github.com/Xaidel/pharmassist/issues/5`
- Date: 2026-10-19
- Scope: demand-side and supply-side context for the v1 seeded-data pilot — 50 medicines across 10 pharmacies in Naga City, Camarines Sur.
- Method: official LGU, PSA-derived, DOH/PhilHealth, PIDS, PCC, ITU/World Bank, and chain store-locator sources, fetched on 19 October 2026. Where a source was blocked, the limitation is stated. Figures are labelled **Confirmed**, **Estimate**, or **Unconfirmed**. The 50-medicine list and 10-pharmacy mix are recommendations for issue #10, not settled pilot data.

> This note is market research, not clinical or legal advice. The medicine list is a price-comparison catalogue, not prescribing guidance. Publishing prescription-medicine prices is a regulated surface; see research note 01 before launch.

---

## TL;DR — the ten findings that shape the pilot

1. **Naga City had 209,170 residents in the 2020 census, spread over 27 barangays.** The city is a first-class independent component city and the commercial, educational, and religious hub of Bicol. *(Confirmed — PSA 2020 CPH via Naga City.)*
2. **The 60+ population is about 17,976 (8.6%) and the registered PWD population is 7,000+ (3.3%).** These groups are the core discount-sensitive segment; the figures are not mutually exclusive. *(60+ derived from PSA 2020 age bands; PWD count is the LGU registry, July 2023.)*
3. **Out-of-pocket payment is the dominant financing channel.** OOP was **44.36% of current health expenditure in 2023**; historically, drugs and medicines accounted for **46% of medical OOP**, rising to **55% for poorer households**. *(Confirmed national data — WHO GHED/World Bank 2023; PIDS 2011 citing 2006 FIES.)*
4. **The pharmacy market is chain-heavy but not chain-only.** Confirmed chain outlets in Naga: **South Star 21, Mercury 10, Generika 4, Watsons 3 at SM City Naga** — 38 official-locator branches — **plus at least one TGP branch**, for a confirmed floor of **39 chain branches**. *(Confirmed via official locators, except TGP; see table.)*
5. **Independent pharmacies remain numerous.** A 2026 local survey of small and medium pharmacies in Naga drew from **363 employees of small-scale pharmacies and 25 medium-scale stakeholders** (197 respondents). That implies roughly **60–100 independent/small outlets** and a total market of about **100–140 outlets**. *(Estimate, not a registry count.)*
6. **Common OOP categories are chronic-disease and acute-primary-care medicines:** antihypertensives, antidiabetics, respiratory inhalers, antibiotics, analgesics/antipyretics, GI medicines, antihistamines, and vitamins. The CHO itself cites hypertension, diabetes, and cough/cold medicines as recurring needs. *(Confirmed category signals; exact local sales mix is unconfirmed.)*
7. **The CHO free-medicine channel is real but leaky.** The City Health Office dispenses prescribed medicines free to Naga residents, but its own doctor reported stock-outs that force patients to buy outside. *(Confirmed — CHO Citizen's Charter and Bicol Mail interview, 2023.)*
8. **Mobile reach is high enough for a PWA, but not universal.** National estimates: **67.3% of individuals used the internet in 2024** and there were **115.3 mobile subscriptions per 100 people**. Only **8.8%** of 2019 NICTHS respondents had bought products online. *(Confirmed national; no city-level official penetration figure.)*
9. **The pilot should be a 50-SKU PNF/Konsulta-anchored list and a 10-pharmacy mix of 8 chain branches plus 2 independents.** The mix covers downtown, south, east/CBD, north, and a mall format, and deliberately includes the independent segment. *(Recommendation.)*
10. **Priority data gaps must be closed before the pilot dataset is frozen:** the LGU business-permit pharmacy count, the CHO barangay health station inventory, and a small patient intercept survey on price-comparison behaviour. *(Unconfirmed; see §7.)*

---

## 1. Demand-side context

### 1.1 Population, growth, and barangays

Naga City's official population page reproduces the PSA 2020 Census of Population and Housing: **209,170 residents on 1 May 2020**, up from 196,003 in 2015 and 174,931 in 2010. The 2015–2020 annual growth rate was **1.38%**; the 2010–2020 rate was **1.80%**. *(Confirmed — City Government of Naga, "Population," sourced to PSA 2000/2010/2015/2020 censuses.)*

The city has **27 barangays**. The 2020 barangay populations are:

| Barangay | Population (2020) | Barangay | Population (2020) |
|---|---:|---|---:|
| Abella | 5,757 | Pacol | 14,747 |
| Bagumbayan Norte | 2,203 | Panicuason | 3,100 |
| Bagumbayan Sur | 7,867 | Peñafrancia | 4,503 |
| Balatas | 11,112 | Sabang | 6,838 |
| Calauag | 11,295 | San Felipe | 21,098 |
| Cararayan | 19,692 | San Francisco (Pob.) | 722 |
| Carolina | 6,870 | San Isidro | 3,432 |
| Concepcion Grande | 11,125 | Santa Cruz | 7,135 |
| Concepcion Pequeña | 25,139 | Tabuco | 4,240 |
| Dayangdang | 4,130 | Tinago | 2,904 |
| Del Rosario | 10,337 | Triangulo | 8,702 |
| Dinaga | 344 | | |
| Igualdad Interior | 3,008 | | |
| Lerma | 1,640 | | |
| Liboton | 3,105 | | |
| Mabolo | 8,125 | | |

*Source: City Government of Naga, "Population" (PSA 2020 CPH). Confirmed.*

The largest barangays — **Concepcion Pequeña (25,139), San Felipe (21,098), Cararayan (19,692), Pacol (14,747), Calauag (11,295), Concepcion Grande (11,125), Balatas (11,112), Del Rosario (10,337)** — are the main residential catchments. Downtown Naga (Dinaga, San Francisco, Igualdad, Lerma, Tabuco) has a small resident population but a large daytime population of shoppers, students, workers, and commuters. Naga is the regional centre of commerce, education, and religion for Bicol, so its effective catchment is larger than the city's resident population. *(Confirmed qualitative — City Government of Naga, "Naga City: Heart of Bicol.")*

### 1.2 Age structure, seniors, and PWDs

**Seniors (60+).** The PSA 2020 age distribution for Naga, as compiled by CityPopulation.de, gives:

| Age band | Population | Share of 209,170 |
|---|---:|---:|
| 60–69 | 11,268 | 5.39% |
| 70–79 | 4,884 | 2.34% |
| 80+ | 1,824 | 0.87% |
| **60+ total** | **17,976** | **8.59%** |
| 65+ (for reference) | 11,341 | 5.42% |

*Source: PSA 2020 CPH age distribution for Naga City, accessed via CityPopulation.de, "Naga (Camarines Sur)" (C 2020). Confirmed as a derived sum; the age bands are census data.*

**PWDs.** The Naga City Persons with Disability Affairs Office reported **more than 7,000 registered PWDs** in July 2023, up from about 4,000 in 2016; around 2,000 of the registered PWDs were assessed with mental-health issues. This is **3.3% of the 2020 population**, but it is a *registered* count, not a prevalence estimate. *(Confirmed — City Government of Naga, "Naga has 7,000 PWDs," 17 July 2023.)*

**Why this matters.** Both groups are entitled to a **20% discount and VAT exemption on medicine purchases** under RA 9994 (senior citizens) and RA 10754 (PWDs). Naga implements these through OSCA senior IDs/booklets and PDAO ePWD IDs. The pilot should therefore capture **regular shelf price and discounted price** for each SKU, not just one price. *(Confirmed — RA 9994 Sec. 4(a)(1); RA 10754 Sec. 4(a)(3); Naga OSCA page; Naga PDAO article.)*

### 1.3 Income, out-of-pocket spending, and the demand for price information

- **OOP is the largest financing channel.** Out-of-pocket expenditure was **44.36% of current health expenditure in 2023** (down from 48.8% in 2019 but still high by regional standards). *(Confirmed — WHO Global Health Expenditure Database via World Bank, indicator `SH.XPD.OOPC.CH.ZS`.)*
- **Medicines dominate medical OOP.** A PIDS profile of the Philippine pharmaceutical sector, citing the 2006 Family Income and Expenditure Survey, found that **drugs and medicines accounted for 46% of total medical out-of-pocket expenses**, rising to **55% for poorer households**. The figure is historical but establishes the structural pattern: medicine purchases are the household health cost that price comparison can most directly affect. *(Confirmed historical — PIDS Discussion Paper 2011-11, May 2011.)*
- **Health spending is rising but unevenly delivered.** PIDS reported in November 2025 that national health spending crossed PHP 1 trillion in 2021 and was expected to reach **PHP 1.4 trillion in 2024**, with per-capita spending near **PHP 12,000**; it warned that fragmented LGU delivery produces inequitable access and inconsistent pricing. *(Confirmed — PIDS press release, 2025.)*
- **Retail prices are high relative to reference prices.** The Philippine Competition Commission's 2022 study found that originator drugs sold in private retail outlets were **17 times** international reference prices, while the lowest-priced generics were still **more than five times** reference prices. Retail/drugstores sold drugs at higher average prices than hospitals. *(Confirmed — PCC Discussion Paper No. 01 Series of 2022.)*

**Implication.** A Naga household buying maintenance medicines monthly has a strong financial reason to compare prices, but the comparison must include **generic equivalents and pack-size normalisation** — otherwise a “cheaper” pack may simply be smaller.

### 1.4 Mobile and internet context

| Indicator | Value | Source | Confidence |
|---|---:|---|---|
| Individuals using the internet, Philippines, 2024 | **67.3%** | ITU via World Bank `IT.NET.USER.ZS` | Confirmed national |
| Mobile cellular subscriptions per 100 people, 2024 | **115.3** | ITU via World Bank `IT.CEL.SETS.P2` | Confirmed national |
| Respondents who had bought products online, 2019 NICTHS | **8.8%** | DICT/PSA NICTHS 2019, ITU country presentation, Sept 2020 | Confirmed national |
| Naga City-specific internet or smartphone penetration | Not published | — | Unconfirmed |

The national numbers show that most Filipinos are online and mobile subscriptions exceed the population, but e-commerce is still shallow: in the 2019 National ICT Household Survey, only 8.8% of respondents had bought products online. That is consistent with a **mobile-web, low-bandwidth, no-account PWA** rather than an app-first or delivery-first product.

Naga is an urban regional centre with an official city mobile app (**MyNaga**, available on Apple App Store and Google Play) and a digital healthcare pilot at the Naga Super Health Center. These are evidence of local smartphone use and LGU digital readiness, but they are not penetration measurements. *(Confirmed qualitative — City Government of Naga, "Now Available: MyNaga App"; "Digital healthcare pilot launched at Naga Super Health Center.")*

**Implication.** Design for a smartphone-first patient, but keep an assisted/offline path (barangay health workers, CHO counters, printed/QR price lists) for older and lower-income patients. Do not assume patients can upload a prescription or complete an online checkout.

### 1.5 What is known about local patient behaviour

There is **no public, city-representative patient survey** on medicine price comparison in Naga. The credible local signals are:

- **The CHO sees medicine access as a recurring gap.** In a 2023 Bicol Mail interview, Dr. Ronnel Mejaro of the Naga City Health Office said the CHO has problems providing basic medicines for **hypertension, diabetes, and common cough and cold**, and that when stocks run out “the patients themselves have to spend money in order to get medicine.” *(Confirmed — Bicol Mail, 15 April 2023.)*
- **Branded purchasing is sticky.** The PCC's 2022 study found that branded generics accounted for about **90% of total pharmaceutical sales**, unbranded generics only about 5%; in hypertension, **7 in 10 shoppers bought branded products**, and about **80% of shoppers with prescriptions bought the brand prescribed**. *(Confirmed national — PCC 2022.)*
- **Small pharmacies compete on customer needs and cost.** The 2026 Naga study of small and medium pharmacies found that owners/managers rate “understanding customer needs” and “cost optimization” highly, and that rising drug costs, supply-chain disruptions, staffing shortages, and regulatory compliance are their main challenges. *(Local survey, 197 respondents; not a representative census — Panga & Galvez, 2026.)*

**Implication.** The pilot hypothesis — patients will use a free, no-account price map if it shows real shelf prices and stock — is plausible but **unvalidated in Naga**. Add a small intercept survey (n≈100–150) at the CHO, NCGH, and 3–4 pharmacies during the dry run.

---

## 2. Supply-side context

### 2.1 Pharmacy market structure

Naga's pharmacy market has four national/regional chains with a confirmed local footprint, one franchise chain with at least one confirmed branch, and a large independent/small-pharmacy segment.

| Type | Chain | Confirmed Naga outlets | Source | Notes |
|---|---|---:|---|---|
| Chain | **South Star Drug** | **21** | Official store-locations page | Largest confirmed chain footprint; includes mall/supermarket counters and 24-hour branches |
| Chain | **Mercury Drug** | **10** | Official store locator (Camarines Sur branch list) | Includes one 24-hour branch (Peñafrancia) |
| Chain | **Generika Drugstore** | **4** | Official store-locator endpoint | Generic-focused chain; LCC CBD2, San Felipe, San Francisco, Concepcion Grande |
| Chain | **Watsons** | **3 at SM City Naga** | Official store finder | Main store, department-store counter, supermarket counter; health-and-beauty format |
| Chain | **The Generics Pharmacy (TGP)** | **1+** (Padian St) | NusaList directory; TGP Naga City Facebook page | Franchise locator not accessible; likely more branches |
| Independent | **Nagadrug Corporation** | 1 confirmed | FDA Verification Portal, LTO CDRR-RV-DS-1617544 (valid to 21 Feb 2028) | Panganiban Drive, Triangulo |
| Independent | **New Nazareno Drugstore** | 1 confirmed by directory | NusaList | Pavillon 5, Panganiban Drive; verify FDA LTO before recruitment |
| Independent | **Citi Pharma Co.** | 1 confirmed by directory | NusaList | Door 40, Crescini Bldg., CBD II, Triangulo; verify FDA LTO |
| Independent | **Knopper Pharmacy** | 1 indicated | Facebook page | Address/LTO not verified |

**Confirmed floor:** **38 official-locator branches** (South Star 21 + Mercury 10 + Generika 4 + Watsons 3) **plus at least one TGP branch = 39 chain branches**. If the Watsons Naga Mall counters and additional TGP franchise branches are counted, the floor rises to about 41–45. *(Confirmed for South Star, Mercury, Generika, and Watsons; TGP is directory-confirmed only.)*

**Total market size is an estimate.** The 2026 Naga pharmacy study's sampling frame was **363 employees from small-scale pharmacy businesses and 25 stakeholders from medium-scale businesses**. If a small pharmacy employs roughly 4–6 people, that implies **about 60–90 small pharmacies**, plus a handful of medium-scale pharmacies. Adding the confirmed chain branches gives a planning range of **about 100–140 pharmacy outlets** in Naga. *(Estimate — derived from Panga & Galvez 2026; not a business-permit count.)*

**Chain share.** On that estimate, chains are **roughly 30% of outlets** but a much larger share of branded footfall and mall traffic. Independents are likely the majority of outlets by count. This is exactly the mix a price-comparison pilot should test: chain price discipline versus independent/generic price dispersion.

### 2.2 Confirmed chain branch inventory

**Mercury Drug (10 branches).** All addresses and hours are from the official store locator. *(Confirmed, accessed 19 Oct 2026.)*

| Branch | Address | Hours |
|---|---|---|
| Naga City Abella | Abella St. cor. J. Hernandez St. | 6:00 AM–10:00 PM |
| Naga City Avenue Square | Avenue Square, Magsaysay St., Balatas | 7:00 AM–10:00 PM |
| Naga City Concepcion Grande | 48 Maharlika Highway, Zone 4, Concepcion Grande | 6:00 AM–10:00 PM |
| Naga City Elias Angeles | Elias Angeles St. | 6:00 AM–9:00 PM |
| Naga City Gen. Luna | Gen. Luna St. cor. Prieto St. | 6:00 AM–9:00 PM |
| Naga City J. Miranda | J. Miranda Ave. cor. Panganiban St. | 7:00 AM–11:00 PM |
| Naga City Nagaland E-Mall | Nagaland E-Mall, Peñafrancia Ave. | 6:00 AM–9:00 PM |
| Naga City P. Burgos | P. Burgos St. | 6:00 AM–10:00 PM |
| Naga City Peñafrancia | Panganiban St. cor. Peñafrancia St. | **24 hours** |
| Naga City Puregold | Puregold Naga, ALDP Mall, Diversion Rd., Triangulo | 7:00 AM–10:00 PM |

**South Star Drug (21 branches).** The official store-locations page lists 21 Naga branches, including 24-hour branches at **Crown Hotel (E. Angeles cor. P. Burgos)** and **McKay Bldg. (Panganiban Drive)**, plus mall/supermarket counters at **LCC Shopping Center, Robinsons Place Naga, Robinsons Supermarket Naga, and Puregold Naga**. Selected branches:

| Branch | Address | Hours |
|---|---|---|
| SSD Naga 3 | Crown Hotel Bldg., E. Angeles St. cor. P. Burgos St., San Francisco | **24 hours** |
| SSD Naga 13 | Door 1–4 McKay Bldg., Panganiban Drive | **24 hours** |
| SSD Naga 15 | #77 Concepcion Pequeña | 7:00 AM–7:00 PM |
| SSD Naga 1 | Caceres St. | 7:00 AM–7:00 PM |
| SSD Naga 7 | LCC Shopping Center, Felix Plazo St. | 8:00 AM–5:00 PM |
| SSD Naga 10 | Peñafrancia Ave. cor. Liboton St. | 7:00 AM–7:00 PM |
| SSD Naga City J. Miranda | Units 101–103, J. Miranda Ave. cor. Princeton St., Concepcion Pequeña | 7:00 AM–6:00 PM |
| SSD Puregold Naga | ALDP Bldg., Diversion Rd., Triangulo | 6:30 AM–7:00 PM |

*Source: South Star Drug, "Store Locations." Confirmed.*

**Generika Drugstore (4 branches).** *(Confirmed via official store-locator endpoint.)*

| Branch | Address | Hours |
|---|---|---|
| CMS Naga City SF | No. 622 Peñafrancia Ave., San Francisco | 7:00 AM–8:30 PM |
| CMS Naga San Felipe | Blk. 1, Lot 16, Parkview Executive Village, San Felipe | 7:00 AM–8:30 PM |
| CMS Naga LCC CBD2 | G/F LCC Mall, Bicol Central Station CBD2, Brgy. Triangulo | 9:00 AM–8:00 PM |
| CAMSUR Naga LCC | Villa Grande Homes Subd., Concepcion Grande | 7:30 AM–8:30 PM |

**Watsons (3 counters at SM City Naga).** The official store finder lists **Watsons SM City Naga**, **Watsons SM City Naga Department Store**, and **Watsons SM City Naga Supermarket**. The same directory data also shows **Watsons Naga Mall 1 and 2**, which should be verified before recruitment. *(Confirmed for SM City; Naga Mall counters are directory-only.)*

**TGP (1+).** The NusaList directory lists **The Generics Pharmacy – Padian St**; a TGP Naga City Facebook community page also exists. The official TGP locator did not resolve during this research. Treat TGP as **1+ confirmed branch** and verify the franchise list with TGP before recruitment. *(Directory-confirmed only.)*

### 2.3 Public health facilities

| Facility | Location | Services relevant to the pilot | Source |
|---|---|---|---|
| **City Health Office (CHO)** | Naga City Center for Health and Nutrition Bldg., City Hall Complex, J. Miranda Ave., Concepcion Pequeña | Outpatient consultation, **free medicines**, anti-TB drugs, leprosy drugs, immunization, maternal care, dental, STI/HIV services | Naga City CHO page; Citizen's Charter "Availing of Free Medicines" |
| **Naga City Super Health Center** | Barangay Concepcion Pequeña | Primary-care consultations, vital signs, blood sugar, hemoglobin, ECG, telehealth/digital records; PhilHealth YAKAP program | Naga City, "Digital healthcare pilot launched at Naga Super Health Center" |
| **Naga City General Hospital (NCGH)** | Balatas Development Center | Outpatient, emergency room, laboratory, admitting, isolation, **pharmacy services**, NICU, maternal care | Naga City, "Better Health Services for Nagueños through the Naga City General Hospital" |
| **Barangay health stations / health centers** | One per barangay is the planning assumption (27 total) | Immunization, maternal care, disease surveillance, referrals, barangay health caravans | Naga City Health Services page; Super Health Center article mentions caravans in Pacol, Concepcion Grande, Del Rosario. **Exact BHS count unconfirmed — verify with CHO.** |

**Free medicines are not a full substitute for retail.** The CHO's Citizen's Charter says free medicines are dispensed to Naga residents after consultation or with a Mayor's Office job order. But the CHO doctor's 2023 interview confirms stock-outs force patients to buy outside. The pilot should therefore show the CHO as a **separate “free/available at CHO” channel**, not as a pharmacy price competitor, and should not imply that CHO stock is guaranteed. *(Confirmed — CHO Citizen's Charter; Bicol Mail 2023.)*

### 2.4 Local pharmacy business conditions

The 2026 Naga study is the best local supply-side evidence available, despite its limitations (employee perceptions, unclear establishment-level sampling, small local journal):

- Most pharmacies were **sole proprietorships**.
- Most had been operating **1–10 years**.
- Most employed **1–9 personnel**.
- Average monthly income was **PHP 100,001–PHP 500,000**.
- The top challenges were **rising drug costs, supply-chain disruptions, staffing shortages, rising operating expenses, and regulatory compliance**.
- Cost optimization was the highest-rated sustainability practice.

*(Local survey — Panga & Galvez, 2026, 197 respondents.)*

**Implication for onboarding.** Independent pharmacies are small, owner-operated, and time-poor. Price collection must be low-effort (one short visit or a WhatsApp/Viber form), and the pilot must not require new hardware, POS integration, or a paid listing. Willingness to pay is issue #8; this note only establishes that the segment is numerous and operationally constrained.

---

## 3. Common out-of-pocket medicine categories

The following categories are the demand-side target. They combine (a) the DOH PNF essential-medicines list, (b) the PhilHealth Konsulta drug list, (c) the CHO's stated common needs, and (d) national evidence on branded/generic purchasing. The **exact local sales mix is unconfirmed** and should be validated with 3–4 pharmacies and CHO dispensing records.

| Category | Common molecules | Why it is likely OOP | Evidence |
|---|---|---|---|
| **Hypertension / cardiovascular** | Amlodipine, losartan, losartan + HCTZ, enalapril, metoprolol, hydrochlorothiazide, simvastatin, atorvastatin, aspirin | Monthly maintenance therapy; CHO cites hypertension; Konsulta covers these | PNF EML; PhilHealth Konsulta Annex C; Bicol Mail 2023 |
| **Diabetes** | Metformin, gliclazide | Monthly maintenance therapy; CHO cites diabetes; Konsulta covers both | PNF EML; Konsulta Annex C; Bicol Mail 2023 |
| **Respiratory** | Salbutamol MDI/nebule/syrup, ipratropium + salbutamol, fluticasone + salmeterol, montelukast | Chronic asthma/COPD; inhalers are high-unit-cost and often bought retail | PNF EML; Konsulta Annex C |
| **Anti-infectives** | Amoxicillin, co-amoxiclav, ciprofloxacin, clarithromycin, cotrimoxazole, nitrofurantoin, cefixime, azithromycin, doxycycline | Acute outpatient infections; frequently prescribed and bought in full courses | PNF EML; Konsulta Annex C |
| **Pain / fever / inflammation** | Paracetamol, mefenamic acid, ibuprofen, diclofenac, aspirin | High-volume OTC and prescription purchases; cough/cold and body pain are common | PNF EML; Konsulta Annex C; Bicol Mail 2023 |
| **GI** | Omeprazole, oral rehydration salts, bisacodyl, domperidone | Common OTC/primary-care purchases; ORS is a high-volume diarrhea treatment | PNF EML; Konsulta Annex C |
| **Allergy** | Loratadine, chlorphenamine | Common OTC antihistamines; cough/cold and allergic rhinitis | PNF EML; Konsulta Annex C |
| **Steroids** | Prednisone | Common short-course prescription; inexpensive but price-dispersed | PNF EML; Konsulta Annex C |
| **Vitamins / minerals** | Ferrous salt + folic acid, multivitamins | High-volume OOP purchases, especially for women and older adults | PNF EML |
| **Topical** | Mupirocin 2% ointment | Common minor-infection prescription; small-ticket OOP | PNF EML |

**Not included in the 50-SKU pilot:** insulin (cold chain), vaccines, controlled substances, oncology/specialty drugs, and high-cost biologics. These add storage, handling, and regulatory complexity without improving the price-comparison test. Herbal products (e.g., lagundi) are a possible later addition; they are in the PNF but are a different purchasing category.

---

## 4. Recommended 50-medicine starter list

**Selection criteria:**

1. All 50 are in the **DOH Philippine National Formulary Essential Medicines List** (8th edition, EML as of 2 November 2022).
2. **32 of the 50 (64%)** overlap with the **PhilHealth Konsulta drug list** (Annex C, as of 30 March 2024), which makes them relevant to the public primary-care channel.
3. The list concentrates on **chronic maintenance medicines and high-volume acute primary-care medicines**, matching the CHO's stated common needs and the OOP evidence.
4. It covers **tablets, capsules, suspensions, inhalers, nebuliser solutions, sachets, and one topical**, so the pilot tests different pack-size and unit-price normalisation.
5. It excludes cold-chain, controlled, and specialty products.

**Collection unit:** for tablets/capsules, collect the **pack size and price per tablet/capsule**; for suspensions, collect the **bottle size and price per mL**; for inhalers, collect **actuations and price per actuation**; for nebules, collect **price per unit-dose**; for ointment, collect **tube size and price per gram**. For each SKU, collect the **lowest-priced generic/equivalent** and the **top-selling brand**, plus stock status and senior/PWD discounted price.

| # | Category | Medicine (generic) | Strength / form | Collection unit | PNF / Konsulta |
|---:|---|---|---|---|---|
| 1 | Cardiovascular | Amlodipine | 5 mg tablet | per tablet; common pack | PNF; Konsulta |
| 2 | Cardiovascular | Amlodipine | 10 mg tablet | per tablet; common pack | PNF; Konsulta |
| 3 | Cardiovascular | Losartan | 50 mg tablet | per tablet; common pack | PNF; Konsulta |
| 4 | Cardiovascular | Losartan | 100 mg tablet | per tablet; common pack | PNF; Konsulta |
| 5 | Cardiovascular | Losartan + hydrochlorothiazide | 50 mg + 12.5 mg tablet | per tablet; common pack | PNF |
| 6 | Cardiovascular | Enalapril | 5 mg tablet | per tablet; common pack | PNF; Konsulta |
| 7 | Cardiovascular | Enalapril | 20 mg tablet | per tablet; common pack | PNF; Konsulta |
| 8 | Cardiovascular | Metoprolol | 50 mg tablet | per tablet; common pack | PNF; Konsulta |
| 9 | Cardiovascular | Metoprolol | 100 mg tablet | per tablet; common pack | PNF; Konsulta |
| 10 | Cardiovascular | Hydrochlorothiazide | 25 mg tablet | per tablet; common pack | PNF; Konsulta |
| 11 | Cardiovascular | Simvastatin | 20 mg tablet | per tablet; common pack | PNF; Konsulta |
| 12 | Cardiovascular | Simvastatin | 40 mg tablet | per tablet; common pack | PNF; Konsulta |
| 13 | Cardiovascular | Atorvastatin | 20 mg tablet | per tablet; common pack | PNF |
| 14 | Cardiovascular | Aspirin (low-dose) | 80 mg tablet | per tablet; common pack | PNF; Konsulta |
| 15 | Diabetes | Metformin | 500 mg tablet | per tablet; common pack | PNF; Konsulta |
| 16 | Diabetes | Metformin | 850 mg tablet | per tablet; common pack | PNF; Konsulta |
| 17 | Diabetes | Gliclazide | 30 mg MR tablet | per tablet; common pack | PNF; Konsulta |
| 18 | Diabetes | Gliclazide | 60 mg MR tablet | per tablet; common pack | PNF; Konsulta |
| 19 | Respiratory | Salbutamol | 100 mcg/dose MDI, 200 actuations | per actuation; per inhaler | PNF; Konsulta |
| 20 | Respiratory | Salbutamol | 2 mg/5 mL syrup, 60 mL | per mL; per bottle | PNF; Konsulta |
| 21 | Respiratory | Salbutamol | 1 mg/mL nebuliser solution, 2.5 mL unit-dose | per unit-dose | PNF; Konsulta |
| 22 | Respiratory | Ipratropium + salbutamol | 500 mcg + 2.5 mg per 2.5 mL unit-dose | per unit-dose | PNF; Konsulta |
| 23 | Respiratory | Fluticasone + salmeterol | 100 mcg + 50 mcg per dose DPI | per actuation; per device | PNF; Konsulta |
| 24 | Respiratory | Montelukast | 10 mg tablet | per tablet; common pack | PNF |
| 25 | Anti-infective | Amoxicillin | 500 mg capsule | per capsule; common pack | PNF; Konsulta |
| 26 | Anti-infective | Amoxicillin | 250 mg/5 mL suspension, 60 mL | per mL; per bottle | PNF; Konsulta |
| 27 | Anti-infective | Co-amoxiclav (amoxicillin + clavulanate) | 500 mg + 125 mg tablet | per tablet; common pack | PNF; Konsulta |
| 28 | Anti-infective | Co-amoxiclav | 400 mg + 57 mg per 5 mL suspension, 70 mL | per mL; per bottle | PNF; Konsulta |
| 29 | Anti-infective | Ciprofloxacin | 500 mg tablet | per tablet; common pack | PNF; Konsulta |
| 30 | Anti-infective | Clarithromycin | 500 mg tablet | per tablet; common pack | PNF; Konsulta |
| 31 | Anti-infective | Cotrimoxazole (sulfamethoxazole + trimethoprim) | 400 mg + 80 mg tablet | per tablet; common pack | PNF; Konsulta |
| 32 | Anti-infective | Nitrofurantoin | 100 mg capsule | per capsule; common pack | PNF; Konsulta |
| 33 | Anti-infective | Cefixime | 200 mg capsule | per capsule; common pack | PNF |
| 34 | Anti-infective | Azithromycin | 500 mg tablet | per tablet; common pack | PNF |
| 35 | Anti-infective | Doxycycline | 100 mg capsule | per capsule; common pack | PNF |
| 36 | Pain / fever | Paracetamol | 500 mg tablet | per tablet; common pack | PNF; Konsulta |
| 37 | Pain / fever | Paracetamol | 120 mg/5 mL syrup, 60 mL | per mL; per bottle | PNF; Konsulta |
| 38 | Pain / fever | Mefenamic acid | 500 mg tablet/capsule | per tablet; common pack | PNF |
| 39 | Pain / fever | Ibuprofen | 200 mg tablet | per tablet; common pack | PNF |
| 40 | Pain / fever | Diclofenac | 50 mg tablet | per tablet; common pack | PNF |
| 41 | GI | Omeprazole | 20 mg capsule | per capsule; common pack | PNF |
| 42 | GI | Oral rehydration salts (ORS) | 20.5 g sachet | per sachet | PNF; Konsulta |
| 43 | GI | Bisacodyl | 5 mg tablet | per tablet; common pack | PNF |
| 44 | GI | Domperidone | 10 mg tablet | per tablet; common pack | PNF |
| 45 | Allergy | Loratadine | 10 mg tablet | per tablet; common pack | PNF |
| 46 | Allergy | Chlorphenamine | 4 mg tablet | per tablet; common pack | PNF; Konsulta |
| 47 | Steroid | Prednisone | 10 mg tablet | per tablet; common pack | PNF; Konsulta |
| 48 | Vitamin / mineral | Ferrous salt + folic acid | 60 mg elemental iron + 400 mcg folic acid tablet | per tablet; common pack | PNF |
| 49 | Vitamin / mineral | Multivitamins | tablet | per tablet; common pack | PNF |
| 50 | Topical | Mupirocin | 2% ointment, 5 g tube | per gram; per tube | PNF |

**Caveats for issue #10:**

- **SKU availability will vary.** Not every pharmacy will stock every strength or pack. The pilot should allow “not stocked” and “out of stock” as valid data, and should record the closest substitute only if the pharmacist confirms it is the same molecule/strength/form.
- **Brands matter.** The PCC evidence says branded generics dominate. For each generic row, collect the **cheapest unbranded/generic** and the **top-selling brand**; store them as separate `pharmacy_product` rows under the same `generic_group`.
- **Discount prices.** For each row, record the regular price and the **senior/PWD 20% discount + VAT-exempt** price. If the pharmacy cannot show a discounted price without an ID, record “not quoted” rather than guessing.
- **Pack-size normalisation.** A 100-tablet pack at PHP 2.00/tablet is not comparable to a 10-tablet pack at PHP 2.50/tablet unless the UI shows unit price. The dataset must store pack size and computed unit price.
- **Regulatory review.** Prescription-medicine price publication may be treated as advertising/promotion; clear the presentation with FDA/counsel per research note 01 before launch.

---

## 5. Recommended 10-pharmacy mix

### 5.1 The mix

| # | Pharmacy | Type | Address | Why it is in the pilot |
|---:|---|---|---|---|
| 1 | **Mercury Drug – Naga City Peñafrancia** | Chain (Mercury) | Panganiban St. cor. Peñafrancia St. | Downtown; **24 hours**; high footfall; on the Panganiban/Peñafrancia commercial axis |
| 2 | **Mercury Drug – Naga City Concepcion Grande** | Chain (Mercury) | 48 Maharlika Highway, Zone 4, Concepcion Grande | Southern residential corridor; captures Concepcion Grande/Pequeña catchment |
| 3 | **Mercury Drug – Naga City Puregold** | Chain (Mercury) | Puregold Naga, ALDP Mall, Diversion Rd., Triangulo | Eastern/CBD supermarket format; different price format from a standalone branch |
| 4 | **South Star Drug – SSD Naga 3** | Chain (South Star) | Crown Hotel Bldg., E. Angeles St. cor. P. Burgos St., San Francisco | Downtown; **24 hours**; largest chain's flagship format |
| 5 | **South Star Drug – SSD Naga 15** | Chain (South Star) | #77 Concepcion Pequeña | Southern residential; tests a non-mall South Star branch |
| 6 | **Generika Drugstore – CMS Naga LCC CBD2** | Chain (Generika) | G/F LCC Mall, Bicol Central Station CBD2, Triangulo | Generic-focused chain; eastern/CBD; tests generic price leadership |
| 7 | **Generika Drugstore – CMS Naga San Felipe** | Chain (Generika) | Blk. 1, Lot 16, Parkview Executive Village, San Felipe | Northern/eastern residential; captures San Felipe, the second-most-populous barangay |
| 8 | **Watsons – SM City Naga** | Chain (Watsons) | SM City Naga, Triangulo | Mall/health-and-beauty format; tests whether a non-pharmacy-first format prices differently |
| 9 | **New Nazareno Drugstore** | Independent | Pavillon 5, Panganiban Drive | Independent, downtown; tests independent price/stock behaviour near the chain cluster |
| 10 | **Nagadrug Corporation** | Independent | Door 8 Pav 1, Panganiban Drive, Triangulo | Independent, eastern/CBD; **FDA-verified LTO** (CDRR-RV-DS-1617544, valid to 21 Feb 2028) |

**Balance:** 3 Mercury + 2 South Star + 2 Generika + 1 Watsons + 2 independents = **10**. This is 8 chain branches and 2 independents, covering downtown, south, east/CBD, north, and a mall.

### 5.2 Geographic coverage

| Area | Pharmacies in the mix | Catchment |
|---|---|---|
| Downtown / City Hall axis | Mercury Peñafrancia, South Star Naga 3, New Nazareno | Dinaga, San Francisco, Igualdad, Lerma, Tabuco; daytime shoppers/workers |
| South | Mercury Concepcion Grande, South Star Naga 15 | Concepcion Pequeña (25,139), Concepcion Grande (11,125), Balatas (11,112) |
| East / CBD / diversion road | Mercury Puregold, Generika LCC CBD2, Nagadrug | Triangulo (8,702), Sabang, San Isidro; mall and transport hub |
| North / San Felipe | Generika San Felipe | San Felipe (21,098), Carolina, Mabolo |
| Mall / regional catchment | Watsons SM City Naga | City-wide and provincial shoppers |

### 5.3 Alternates and recruitment notes

- **Alternate independents:** **Citi Pharma Co.** (Door 40, Crescini Bldg., CBD II, Triangulo; phone +63 54 478 0090) and **Knopper Pharmacy** (address/LTO to verify). Use these if New Nazareno or Nagadrug declines.
- **Alternate chain branches:** **South Star Naga 13** (McKay Bldg., Panganiban Drive; 24 hours) and **Mercury J. Miranda** (J. Miranda Ave. cor. Panganiban St.; near the CHO) are strong substitutes.
- **Watsons Naga Mall 1/2:** directory-listed but not confirmed on the official store finder; verify before adding.
- **Recruitment order:** start with the 8 chain branches (corporate approvals may be centralised), then the 2 independents (owner-operator decision). Do not promise paid placement or ranking; the pilot is free for pharmacies (standing decision).
- **Minimum viable mix:** if an independent declines, replace with Citi Pharma or a third South Star branch rather than dropping the independent segment entirely. The pilot's core test is cross-pharmacy dispersion; a chain-only sample would understate it.

---

## 6. What this means for the PRD

1. **The demand story is strong but local behaviour is unproven.** OOP is high and medicines dominate medical OOP; the CHO sees stock-outs; branded purchasing is sticky. But no Naga patient survey proves that patients will compare prices before buying. The PRD should frame v1 as a **pilot hypothesis**, with a success metric that includes price-comparison sessions and basket savings, not just app installs.
2. **The supply side is chain-heavy but independent-rich.** The 10-pharmacy mix must include independents; otherwise the pilot measures chain price discipline, not market dispersion. The 50-SKU list must include both unbranded generics and top-selling brands, because branded generics dominate sales.
3. **Public facilities are a channel, not a competitor.** The CHO/Super Health Center/NCGH network can supply referrals and assisted access. Show “free at CHO” separately from pharmacy prices; do not imply guaranteed stock.
4. **Discounts are a first-class data field.** Seniors (8.6%) and PWDs (3.3% registered) are large enough to matter, and the 20% + VAT exemption can change the cheapest option. Capture regular and discounted prices.
5. **Mobile-first, but not mobile-only.** National internet use is 67.3% and mobile subscriptions exceed the population, but e-commerce is shallow. Keep the PWA lightweight and add an assisted/offline path.
6. **Regulatory clearance is a prerequisite.** Publishing prescription-medicine prices may be treated as advertising/promotion; see research note 01. The 50-SKU list includes Rx products, so the PRD must encode neutral, non-promotional presentation and a verification date.

---

## 7. Data gaps and validation plan

| Gap | Why it matters | How to close it |
|---|---|---|
| **LGU business-permit pharmacy count** | The 100–140 total is an estimate; the chain/independent split could be off | Request the Business Permits and Licensing Office's list of registered drugstores/retail outlets for Naga; reconcile with FDA LTO records |
| **CHO barangay health station inventory** | The “27 BHS” assumption is unconfirmed | Ask the CHO for the list of functioning BHS/health centers, staff, and hours |
| **CHO free-medicine list and stock** | “Free at CHO” is a real channel but stock varies | Request the current free-medicine list and a stock snapshot; add a “last verified” date |
| **OSCA/PDAO registered counts and discount compliance** | Senior/PWD discount prices are a key differentiator | Ask OSCA/PDAO for registered counts by barangay; spot-check 3 pharmacies for discount quoting |
| **Patient price-comparison behaviour** | The core demand hypothesis is unvalidated | Run a 100–150 respondent intercept survey at CHO, NCGH, and 3–4 pharmacies: smartphone use, current purchase behaviour, willingness to travel, trust in posted prices |
| **Pharmacy sales mix** | The 50-SKU list is PNF-based, not local-sales-based | Ask 3–4 pharmacies for their top 50 SKUs by volume (or a de-identified basket mix); adjust the list before freezing |
| **TGP and Watsons Naga Mall presence** | Chain floor may be undercounted | Check TGP franchise locator and Watsons store finder for Naga Mall; verify addresses |
| **FDA LTO status of independents** | New Nazareno/Citi Pharma/Knopper are directory-listed, not FDA-verified | Query the FDA Verification Portal for each establishment; only list licensed outlets |

---

## 8. Confidence ledger

| Claim | Value used in this note | Confidence | Basis |
|---|---|---|---|
| Naga City population, 2020 | 209,170 | **Confirmed** | PSA 2020 CPH via Naga City "Population" |
| Number of barangays | 27 | **Confirmed** | Naga City profile/population page |
| 60+ population | 17,976 (8.59%) | **Confirmed derived** | PSA 2020 age bands via CityPopulation.de; sum of 60–69, 70–79, 80+ |
| Registered PWDs | 7,000+ (3.3%) | **Confirmed** | Naga PDAO, July 2023; registered count, not prevalence |
| OOP share of current health expenditure, 2023 | 44.36% | **Confirmed national** | WHO GHED via World Bank |
| Drugs' share of medical OOP | 46% (55% for poor) | **Confirmed historical** | PIDS 2011, citing 2006 FIES |
| Internet users, Philippines, 2024 | 67.3% | **Confirmed national** | ITU via World Bank |
| Mobile subscriptions per 100, 2024 | 115.3 | **Confirmed national** | ITU via World Bank |
| Online purchase rate, 2019 NICTHS | 8.8% | **Confirmed national** | DICT/PSA NICTHS 2019, ITU presentation |
| Confirmed chain branches | 39 (South Star 21, Mercury 10, Generika 4, Watsons 3, TGP 1+) | **Confirmed floor** | Official locators; TGP directory-only |
| Independent/small pharmacies | ~60–100 | **Estimate** | Derived from 2026 Naga study's 363 small-pharmacy employees |
| Total pharmacy outlets | ~100–140 | **Estimate** | Chain floor + independent estimate |
| 50-medicine list | 50 PNF-based SKUs | **Recommendation** | PNF EML; PhilHealth Konsulta; CHO demand signals |
| 10-pharmacy mix | 8 chain + 2 independent | **Recommendation** | Official locators + independent directory/FDA records |
| City-level mobile/internet penetration | Not published | **Unconfirmed** | No official city-level dataset found |
| Naga patient price-comparison behaviour | Not measured | **Unconfirmed** | No public city-representative study found |

---

## 9. Sources

| ID | Title | Issuer | URL | Date / accessed | Used for |
|---|---|---|---|---|---|
| S1 | Population | City Government of Naga | <https://www2.naga.gov.ph/population/> | Accessed 19 Oct 2026; PSA 2020 CPH | 209,170 population; 27 barangay populations; growth rates |
| S2 | Naga City: Heart of Bicol (city profile) | City Government of Naga | <https://www2.naga.gov.ph/naga-city-profile/> | Accessed 19 Oct 2026 | 27 barangays; 84.48 km²; regional commercial/education hub; first-class independent component city |
| S3 | 2020 Census of Population and Housing — population counts declared official | Philippine Statistics Authority | <https://psa.gov.ph/content/2020-census-population-and-housing-2020-cph-population-counts-declared-official-president> (census data reproduced in S1) | Census date 1 May 2020 | Official population and barangay counts |
| S4 | Naga (Camarines Sur) — population and age distribution (C 2020) | CityPopulation.de (compiling PSA 2020 CPH) | <https://www.citypopulation.de/en/philippines/luzon/admin/camarines_sur/051724__naga/> | Accessed 19 Oct 2026 | 60–69, 70–79, 80+, 65+ age bands |
| S5 | Naga has 7,000 PWDs | City Government of Naga | <https://www2.naga.gov.ph/naga-has-7000-pwds/> | 17 Jul 2023 | Registered PWD count and PDAO context |
| S6 | Office for Senior Citizens Affairs | City Government of Naga | <https://www2.naga.gov.ph/office-service/office-for-senior-citizens-affairs/> | Accessed 19 Oct 2026 | OSCA ID/booklet issuance; senior discount pathway |
| S7 | City Health Office | City Government of Naga | <https://www2.naga.gov.ph/office-service/city-health-office/> | Accessed 19 Oct 2026 | CHO services, free medicines, outpatient consultation, contact/address |
| S8 | Health Services (Citizen's Charter) | City Government of Naga | <https://www2.naga.gov.ph/health-services/> | Accessed 19 Oct 2026 | CHO service list; free-medicine PDF; outpatient/maternal/immunization services |
| S9 | Digital healthcare pilot launched at Naga Super Health Center to streamline medical services | City Government of Naga | <https://www2.naga.gov.ph/digital-healthcare-pilot-launched-at-naga-super-health-center-to-streamline-medical-services/> | 2026; accessed 19 Oct 2026 | Super Health Center location/services; barangay caravans; PhilHealth YAKAP |
| S10 | Better Health Services for Nagueños through the Naga City General Hospital | City Government of Naga | <https://www2.naga.gov.ph/better-health-services-for-naguenos-through-the-naga-city-general-hospital/> | n.d.; accessed 19 Oct 2026 | NCGH location, outpatient/ER/pharmacy services, patient volumes |
| S11 | Naga City Healthcare: Getting better in the midst of challenges | Bicol Mail | <https://www.bicolmail.net/single-post/naga-city-healthcare-getting-better-in-the-midst-of-challenges> | 15 Apr 2023 | CHO medicine stock-outs; common needs (hypertension, diabetes, cough/cold); patients buying outside |
| S12 | Store Locator — Camarines Sur | Mercury Drug Corporation | <https://www.mercurydrug.com/store-locator.html> | Accessed 19 Oct 2026 | 10 Naga branches; addresses; hours |
| S13 | Store Locations | South Star Drug | <https://southstardrug.com.ph/pages/store-locations> | Accessed 19 Oct 2026 | 21 Naga branches; addresses; hours |
| S14 | Store Locator | Generika Drugstore | <https://www.generika.com.ph/store-locator/> | Accessed 19 Oct 2026 | 4 Naga branches; addresses; hours |
| S15 | Store Finder | Watsons Philippines | <https://www.watsons.com.ph/store-finder> | Accessed 19 Oct 2026 | 3 Watsons counters at SM City Naga |
| S16 | Pharmacies near Naga Bus Terminal, Naga City | NusaList | <https://ph.nusalist.com/pharmacies/all/13.619670/123.190430/naga-bus-terminal-naga-city-philippines> | Accessed 19 Oct 2026 | TGP Padian St; Watsons Naga Mall 1/2; New Nazareno; Citi Pharma; independent addresses/phones |
| S17 | Top 10+ Best Pharmacies in Naga, Philippines | BusinessList.ph | <https://www.businesslist.ph/category/pharmacies/city:naga> | Accessed 19 Oct 2026 | Directory cross-check for Mercury/South Star branches |
| S18 | FDA Verification Portal — NAGADRUG CORPORATION, LTO No. CDRR-RV-DS-1617544 | Food and Drug Administration Philippines | <https://verification.fda.gov.ph/> | Record valid to 21 Feb 2028; accessed 19 Oct 2026 | Independent pharmacy FDA LTO verification |
| S19 | The Financial Sustainability of Small and Medium-Scale Pharmacy Businesses in Naga City | Panga, D.L.D. & Galvez, S.M., *International Journal of Sustainability and Advanced Integrated Research* 2(2) | <https://ijsair.com/index.php/ijsair/article/download/680/657> | Apr–Jun 2026; DOI 10.65339/ijsair.V2.I2.575 | Local pharmacy business profile; 363 small-pharmacy employees; 197 respondents; challenges |
| S20 | Pharmaceutical Competition in the Philippines | Magno, C., Philippine Competition Commission, PCC Discussion Paper No. 01 Series of 2022 | <https://www.phcc.gov.ph/storage/pdf-resources/1673487756_DP-2022-01-Pharmaceutical-Competition-in-the-Philippines.pdf> | 2022 | Retail price vs reference price; branded generics ~90% of sales; hypertension brand purchasing |
| S21 | A Profile of the Philippine Pharmaceutical Sector | Reyes, C.M. et al., PIDS Discussion Paper Series No. 2011-11 | <https://pidswebs.pids.gov.ph/CDN/PUBLICATIONS/pidsdps1111.pdf> | May 2011 | Drugs = 46% of medical OOP (55% for poor); 32,538 retail outlets nationwide (2009) |
| S22 | PH health spending soars to PHP 1.4 Trillion, but fragmented system threatens UHC gains—experts | Philippine Institute for Development Studies | <https://pids.gov.ph/details/news/press-releases/ph-health-spending-soars-to-php-1-4-trillion-but-fragmented-system-threatens-uhc-gains-experts> | 2025 (forum 20 Nov 2025) | Health spending ~PHP 1.4T in 2024; per-capita ~PHP 12,000; LGU fragmentation |
| S23 | Individuals using the Internet (% of population) — Philippines | ITU via World Bank Open Data | <https://api.worldbank.org/v2/country/PHL/indicator/IT.NET.USER.ZS> | 2024 value; accessed 19 Oct 2026 | 67.3% internet users |
| S24 | Mobile cellular subscriptions (per 100 people) — Philippines | ITU via World Bank Open Data | <https://api.worldbank.org/v2/country/PHL/indicator/IT.CEL.SETS.P2> | 2024 value; accessed 19 Oct 2026 | 115.3 subscriptions per 100 |
| S25 | Out-of-pocket expenditure (% of current health expenditure) — Philippines | WHO Global Health Expenditure Database via World Bank Open Data | <https://api.worldbank.org/v2/country/PHL/indicator/SH.XPD.OOPC.CH.ZS> | 2023 value; accessed 19 Oct 2026 | 44.36% OOP share |
| S26 | Partnership in ICT Statistics: The National ICT Household Survey 2019 — Country Presentation Philippines | International Telecommunication Union (ITU), with DICT/PSA | <https://www.itu.int/en/ITU-D/Statistics/Documents/events/egh2020/EGHEGTI2020_ICTHHSurvey2019Philippines_Presentation.pdf> | Sep 2020 | NICTHS 2019 methodology; 8.8% online purchase rate |
| S27 | Philippine National Formulary Essential Medicines List, 8th Edition, EML as of 02 November 2022 | Department of Health, Pharmaceutical Division (hosted by PhilHealth) | <https://www.philhealth.gov.ph/partners/providers/pdf/PNF-EML_11022022.pdf> | EML as of 2 Nov 2022 | 50-SKU basis; generic names/strengths/forms |
| S28 | Annex C: Checklist of PhilHealth Konsulta Drugs and its Preparations | Philippine Health Insurance Corporation | <https://www.philhealth.gov.ph/circulars/2024/0013/Annex_C_Checklist_of_PhilHealth_Konsulta_Drugs_as_of_March_2024.pdf> | As of 30 Mar 2024 | Konsulta drug list; primary-care overlap |
| S29 | Republic Act No. 9994 (Expanded Senior Citizens Act of 2010) | Congress of the Philippines | <https://lawphil.net/statutes/repacts/ra2010/ra_9994_2010.html> | 15 Feb 2010 | 20% senior discount + VAT exemption on medicines |
| S30 | Republic Act No. 10754 (PWD benefits) | Congress of the Philippines | <https://lawphil.net/statutes/repacts/ra2016/ra_10754_2016.html> | 24 Mar 2016 | 20% PWD discount + VAT exemption on medicines |
| S31 | Now Available: MyNaga App — Naga City at Your Fingertips | City Government of Naga | <https://www2.naga.gov.ph/available-mynaga-app/> | Accessed 19 Oct 2026 | Local smartphone/digital-service readiness (qualitative) |

**Access limitations:** `psa.gov.ph`, `doh.gov.ph`, `dict.gov.ph`, `ictstatistics.dict.gov.ph`, `nhfr.doh.gov.ph`, and `officialgazette.gov.ph` returned 403/Cloudflare challenges to this client. PSA population and age data were obtained through the Naga City reproduction (S1) and CityPopulation.de (S4); the PNF and Konsulta list through PhilHealth-hosted PDFs (S27, S28); the laws through LawPhil (S29, S30). The DICT NICTHS findings were obtained through the ITU country presentation (S26). No claim in this note depends on a page that could not be read in at least one accessible form.

---

## 10. Recommended next steps for issue #10

1. **Freeze the 50 SKUs** after a 2-pharmacy dry run: check availability, pack sizes, and whether the top-selling brand is stocked. Replace any SKU that fewer than 6 of 10 pharmacies carry with a close PNF alternative.
2. **Recruit the 8 chain branches first** (central approvals), then the 2 independents. Have Citi Pharma and South Star Naga 13 as backups.
3. **Collect at least 3 price points per SKU** (regular, senior/PWD discounted, and “not stocked/out of stock”) and record the verification date and collector.
4. **Run the patient intercept survey** before launch; use it to set the success metrics and the assisted-access design.
5. **Clear the regulatory presentation** with FDA/counsel per research note 01 before any public price goes live.


