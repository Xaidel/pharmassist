# POC seed — real Naga City pharmacy records

- Ticket: [#19 — POC seed: compile real Naga pharmacy records](https://github.com/Xaidel/pharmassist/issues/19)
- Parent map: [#17 — Map: Pharmassist POC](https://github.com/Xaidel/pharmassist/issues/17) (not edited by this ticket)
- Date: 2026-10-21
- Scope: the 10 real pharmacy identities for the POC seed — 3 Mercury Drug, 2 South Star Drug, 2 Generika Drugstore, 1 Watsons, and 2 independents (New Nazareno Drugstore and Nagadrug Corporation).
- Machine-readable companion: [`data/naga-pharmacies.json`](data/naga-pharmacies.json).
- Coordinate reference system: WGS84.

> This is seed identity data, not price, stock, or clinical data. Prices, stock, and verification dates in the POC remain mocked. Coordinates are for map pins and directions only.

## 1. Result in brief

The PRD mix is intact; **no branch was substituted**. Four records have an uncertain coordinate or a locator-data conflict, and two independents have unverified hours. Every record is anchored to at least one primary source (official chain locator, official branch page, or FDA LTO registry) plus a map cross-check.

| # | Pharmacy | Type | Barangay | Latitude, longitude | Confidence |
|---:|---|---|---|---|---|
| 1 | Mercury Drug — Naga City Peñafrancia | Chain (Mercury) | Dinaga | 13.623234, 123.185995 | **High** |
| 2 | Mercury Drug — Naga City Concepcion Grande | Chain (Mercury) | Concepcion Grande | 13.621239, 123.218668 | **High** |
| 3 | Mercury Drug — Naga City Puregold | Chain (Mercury) | Triangulo | 13.615533, 123.190790 | **High** |
| 4 | South Star Drug — SSD Naga 3 | Chain (South Star) | San Francisco | 13.624095, 123.185544 | **High** |
| 5 | South Star Drug — SSD Naga 15 | Chain (South Star) | Concepcion Pequeña | 13.621306, 123.200293 | **Medium** |
| 6 | Generika Drugstore — CMS Naga LCC CBD2 | Chain (Generika) | Triangulo | 13.619626, 123.189712 | **Medium** |
| 7 | Generika Drugstore — CMS Naga San Felipe | Chain (Generika) | San Felipe | 13.642260, 123.204110 | **Medium** |
| 8 | Watsons — SM City Naga | Chain (Watsons) | Triangulo | 13.621578, 123.190288 | **High** |
| 9 | New Nazareno Drugstore | Independent | Concepcion Pequeña | 13.621451, 123.197144 | **Medium** |
| 10 | Nagadrug Corporation | Independent | Triangulo | 13.622110, 123.194400 | **High** |

**Confidence definition**

- **High** — identity, address, and coordinates are confirmed by a primary source and agree with an independent map source within ~30 m; hours and phone are published.
- **Medium** — identity and address are confirmed by a primary source, but the coordinate is inferred from a single map feature, or two sources disagree materially, or the storefront has no independent map pin.
- **Low** — not used in this seed.

## 2. Records

### 1. Mercury Drug — Naga City Peñafrancia

- **Type:** chain (Mercury Drug)
- **Address:** Panganiban St. cor. Peñafrancia St., Naga City, 4400 Camarines Sur
- **Barangay:** Dinaga (inferred from OSM reverse geocode; the official branch page does not state a barangay)
- **Coordinates:** 13.623234, 123.185995
- **Hours:** 24 hours
- **Phone:** (054) 472-3214 / (054) 811-2228 / (0968) 878-7678
- **Source:** <https://www.mercurydrug.com/cgi-bin/branchdetail?id2=624>
- **Coordinate source:** Mercury Drug's official branch page embeds an OpenLayers map with the exact point. OSM node [`642883253`](https://www.openstreetmap.org/node/642883253) is ~2 m away.
- **Confidence:** **High**
- **Verified:** name, type, address, coordinates, hours, phone.
- **Uncertain:** barangay only (not stated by the official page).

### 2. Mercury Drug — Naga City Concepcion Grande

- **Type:** chain (Mercury Drug)
- **Address:** 48 Maharlika Highway, Zone 4, Concepcion Grande, Naga City, 4400 Camarines Sur
- **Barangay:** Concepcion Grande (official address)
- **Coordinates:** 13.621239, 123.218668
- **Hours:** 6:00 AM–10:00 PM
- **Phone:** (054) 884-0823
- **Source:** <https://www.mercurydrug.com/cgi-bin/branchdetail?id2=3104>
- **Coordinate source:** OSM way [`1415534323`](https://www.openstreetmap.org/way/1415534323) ("Mercury Drug (Concepcion Grande)"). Google Maps resolves the branch to 13.621204, 123.218751, within ~10 m.
- **Confidence:** **High**
- **Verified:** name, type, address, coordinates, hours, phone.
- **Note:** the official branch page's map emits `(0, 0)` for this branch, so the coordinate is map-sourced rather than locator-sourced. OSM and Google agree.
- **Barangay note:** OSM reverse geocoding returns "Concepcion Grande, Cararayan"; the official street address is authoritative for Concepcion Grande.

### 3. Mercury Drug — Naga City Puregold

- **Type:** chain (Mercury Drug)
- **Address:** Puregold Naga, ALDP Mall, Diversion Rd., Triangulo, Naga City, 4400 Camarines Sur
- **Barangay:** Triangulo (official address)
- **Coordinates:** 13.615533, 123.190790
- **Hours:** 7:00 AM–10:00 PM
- **Phone:** (054) 881-9919 / (0998) 586-0865
- **Source:** <https://www.mercurydrug.com/cgi-bin/branchdetail?id2=3073>
- **Coordinate source:** Mercury Drug's official branch page map. OSM node [`11997719209`](https://www.openstreetmap.org/node/11997719209) is ~16 m away.
- **Confidence:** **High**
- **Verified:** name, type, address, coordinates, hours, phone.

### 4. South Star Drug — SSD Naga 3

- **Type:** chain (South Star Drug)
- **Address:** Crown Hotel Bldg., E. Angeles St. cor. P. Burgos St., San Francisco, Naga City, Camarines Sur
- **Barangay:** San Francisco (official address)
- **Coordinates:** 13.624095, 123.185544
- **Hours:** 24 hours
- **Phone:** +63 942 669 0337
- **Source:** <https://southstardrug.com.ph/pages/store-locations>
- **Coordinate source:** FDA registry record CDRR-RV-DS-24344 (13.624095, 123.185544). OSM node [`642881374`](https://www.openstreetmap.org/node/642881374) is ~6 m away; NusaList's "New South Star Drug – P. Burgos Street" is ~5 m away; Google Maps is ~12 m away.
- **Confidence:** **High**
- **Verified:** name, type, address, coordinates, hours, phone.
- **Barangay note:** official address says San Francisco; OSM reverse geocoding of the Crown Hotel corner returns Santa Cruz/Lerma. This is a barangay-boundary discrepancy at a corner building, not a location error.

### 5. South Star Drug — SSD Naga 15

- **Type:** chain (South Star Drug)
- **Address:** #77 Concepcion Pequeña, Naga City, Camarines Sur
- **Barangay:** Concepcion Pequeña (official address)
- **Coordinates:** 13.621306, 123.200293
- **Hours:** 7:00 AM–7:00 PM
- **Phone:** +63 923 742 0187
- **Source:** <https://southstardrug.com.ph/pages/store-locations>
- **Coordinate source:** OSM node [`4157403495`](https://www.openstreetmap.org/node/4157403495) — a mapped "South Star Drug" on Panganiban Drive, Concepcion Pequeña. The FDA record for the same branch (CDRR-RV-DS-19955, "Zone 5, #77 Panganiban Drive") gives 13.621393, 123.197710, ~280 m west and only ~35 m from the FDA point for SSD Naga 13 — likely a duplicated/approximate registry point.
- **Confidence:** **Medium**
- **Verified:** name, type, address, hours, phone.
- **Uncertain:** exact coordinates. The branch identity is inferred from the OSM pharmacy node; there is no independent storefront pin. The official locator confirms the branch exists at #77 Concepcion Pequeña.
- **Fallback if phone confirmation fails:** substitute **South Star Naga 13** (McKay Bldg., Panganiban Drive; 24 hours; +63 923 742 1466; FDA record 13.621710, 123.197710), which is an alternate in PRD §11.

### 6. Generika Drugstore — CMS Naga LCC CBD2

- **Type:** chain (Generika Drugstore)
- **Address:** G/F LCC Mall, Bicol Central Station CBD2, Brgy. Triangulo, Naga City, Camarines Sur
- **Barangay:** Triangulo (official address)
- **Coordinates:** 13.619626, 123.189712
- **Hours:** 9:00 AM–8:00 PM
- **Phone:** 0917-871-8924 / (054) 472-8080
- **Source:** <https://www.generika.com.ph/stores/cms-naga-lcc-cbd2/>
- **Coordinate source:** OSM way [`1202549804`](https://www.openstreetmap.org/way/1202549804) ("LCC Naga CBD 2", Ninoy and Cory Avenue, at the Bicol Central Station complex). The official Generika store page emits 13.620470, 123.219240 — ~3.2 km east, next to a Pepsi-Cola plant on Maharlika Highway, which is inconsistent with the Bicol Central Station address.
- **Confidence:** **Medium**
- **Verified:** name, type, address, hours, phone.
- **Uncertain:** exact storefront coordinates. The pin is the LCC Naga CBD 2 building, not a surveyed Generika door. The official locator coordinate is treated as a data error.
- **Barangay note:** official address says Triangulo; the OSM mall polygon is in Lerma, adjacent to Triangulo. The Bicol Central Station complex straddles the boundary.

### 7. Generika Drugstore — CMS Naga San Felipe

- **Type:** chain (Generika Drugstore)
- **Address:** Blk. 1, Lot 16, Parkview Executive Village, San Felipe, Naga City, Camarines Sur
- **Barangay:** San Felipe (official address)
- **Coordinates:** 13.642260, 123.204110
- **Hours:** 7:00 AM–8:30 PM
- **Phone:** not published / unverified
- **Source:** <https://www.generika.com.ph/stores/cms-naga-san-felipe/>
- **Coordinate source:** Generika's official store page (wpslMap). OSM reverse geocoding returns San Felipe; OSM's LCC Supermarket San Felipe node [`11152552034`](https://www.openstreetmap.org/node/11152552034) is ~160 m away. Google's "Parkview Executive Village" geocode is ~800 m east, so the address-level pin is not fully settled.
- **Confidence:** **Medium**
- **Verified:** name, type, address, coordinates (official locator), hours.
- **Uncertain:** phone; exact subdivision/block pin. The FDA record for this branch repeats a default coordinate (13.627880, 123.187510) that is clearly wrong, so it was not used.
- **Note:** the official locator's phone field is empty. Do not fabricate a number; collect it during recruitment.

### 8. Watsons — SM City Naga

- **Type:** chain (Watsons)
- **Address:** GF, SM City Naga Mall Area, Central Business District II, Brgy. Triangulo, Naga City, 4400 Camarines Sur
- **Barangay:** Triangulo (official address)
- **Coordinates:** 13.621578, 123.190288
- **Hours:** 10:00 AM–9:00 PM daily
- **Phone:** +63 54 473 2332
- **Source:** <https://www.watsons.com.ph/store/wtcph_453_EN>
- **Coordinate source:** the official Watsons store page links to Google Maps place "WATSONS SM CITY NAGA" at 13.6215783, 123.1902879. OSM node [`5112522941`](https://www.openstreetmap.org/node/5112522941) is ~110 m south, inside the same SM City Naga footprint.
- **Confidence:** **High**
- **Verified:** name, type, address, coordinates, hours, phone.
- **Note:** this is the main Watsons store, not the SM Department Store or SM Supermarket counters.

### 9. New Nazareno Drugstore

- **Type:** independent
- **Address:** Pav. 5, Panganiban Drive, Naga City, Camarines Sur
- **Barangay:** Concepcion Pequeña (inferred from OSM reverse geocode; neither the FDA record nor the directory states a barangay)
- **Coordinates:** 13.621451, 123.197144
- **Hours:** not published / unverified
- **Phone:** +63 54 811 6300
- **Source:** NusaList listing <https://ph.nusalist.com/pages/new-nazareno-drugstore>; FDA LTO record CDRR-RV-DS-223011 via <https://verification.fda.gov.ph/>
- **Coordinate source:** FDA registry record CDRR-RV-DS-223011 (13.621451192, 123.197144354). OSM reverse geocoding confirms Panganiban Drive, Concepcion Pequeña. NusaList (13.622404, 123.192360) and Google (13.622420, 123.190575) place pins 0.5–0.7 km west, so the FDA point was preferred.
- **Confidence:** **Medium**
- **Verified:** name, type, address, coordinates (FDA), phone (NusaList), LTO status.
- **Uncertain:** hours; barangay (inferred). FDA status: **Active**, LTO valid to **25 February 2031** (accomplished 18 August 2026).
- **Note:** the FDA address is "Pav. 5 Panganiban Drive"; the NusaList phone is the only published contact number found. Confirm both at recruitment.

### 10. Nagadrug Corporation

- **Type:** independent
- **Address:** Door 8, Pav. 1, Panganiban Drive, Triangulo, Naga City, Camarines Sur
- **Barangay:** Triangulo (official FDA address)
- **Coordinates:** 13.622110, 123.194400
- **Hours:** not published / unverified
- **Phone:** not published / unverified
- **Source:** FDA LTO record CDRR-RV-DS-1617544 via <https://verification.fda.gov.ph/>
- **Coordinate source:** FDA registry record (13.622110, 123.194400). OSM node [`6818835769`](https://www.openstreetmap.org/node/6818835769) and Google Maps place the Door 8 Pavilion 1 building at 13.621871, 123.194559, ~27 m south.
- **Confidence:** **High**
- **Verified:** name, type, address, coordinates (FDA), LTO status.
- **Uncertain:** hours; phone. FDA status: **Active**, LTO valid to **21 February 2028** (accomplished 01 March 2026).
- **Barangay note:** FDA address says Triangulo; OSM reverse geocoding of the registry point returns Tinago. The FDA address is authoritative for the seed; flag the boundary discrepancy.

## 3. Substitutions and fallbacks

- **No substitutions were required.** The final mix is 3 Mercury + 2 South Star + 2 Generika + 1 Watsons + 2 independents, as specified in PRD §5.1 / §11.
- **Generika CMS Naga LCC CBD2** is retained, but its official locator coordinate is overridden with the OSM LCC Naga CBD 2 polygon. This is a coordinate correction, not a branch substitution.
- **South Star SSD Naga 15** is retained with a medium-confidence OSM pin. If recruitment or a phone call shows the branch has moved, substitute **South Star Naga 13** (McKay Bldg., Panganiban Drive; 24 hours; +63 923 742 1466; FDA 13.621710, 123.197710).
- Other PRD §11 alternates remain available: **Citi Pharma Co.** (Door 40, Crescini Bldg., CBD II, Triangulo; NusaList phone/coords) and **Mercury J. Miranda** (J. Miranda Ave. cor. Panganiban St.; official page 13.621466, 123.199246; (054) 472-7080 / (0920) 956-1044; 7:00 AM–11:00 PM).

## 4. Method and source quality

1. **Official chain locators first.** Mercury Drug branch-detail pages, the South Star store-locations page, the Generika store pages (including the store-locator AJAX payload), and the Watsons store page supplied addresses, hours, phones, and — for Mercury, Generika, and Watsons — map coordinates.
2. **FDA LTO registry for the independents.** The FDA Verification Portal's public search API (`/api/search?q=...`) returned the LTO number, registered address, status, validity, and coordinates for Nagadrug and New Nazareno. This also let us reject several obviously wrong/default coordinates in the FDA chain records.
3. **Map cross-checks.** OpenStreetMap nodes/ways, Nominatim reverse geocoding, and Google Maps place/address pins were used to confirm each coordinate and to detect locator errors. No coordinate in the JSON was invented; where sources disagreed, the discrepancy is recorded here and the more specific map feature was chosen.
4. **Known limits.** Google Maps results were obtained from public search/embed pages, not the paid Places API; place pins can move slightly. OSM is crowd-sourced and can lag relocations. The two independents' phone/hours are incomplete. No field visit or phone confirmation was possible in this research ticket.

### Fields verified vs uncertain — summary

| Field | Status |
|---|---|
| Name, type, street address | Verified for all 10 from an official locator or FDA record. |
| Coordinates | 6 high-confidence; 4 medium (SSD Naga 15, Generika LCC CBD2, Generika San Felipe, New Nazareno). |
| Hours | Verified for 8; missing for New Nazareno and Nagadrug. |
| Phone | Verified for 8; missing for Generika San Felipe and Nagadrug. |
| Barangay | Stated in the official address for 8; inferred for Mercury Peñafrancia and New Nazareno. Boundary caveats for SSD Naga 3, Generika LCC CBD2, and Nagadrug. |
| LTO status | Verified for both independents (both Active). |

## 5. Sources

| ID | Source | URL | Used for |
|---|---|---|---|
| S1 | Mercury Drug — Naga City Peñafrancia branch page | <https://www.mercurydrug.com/cgi-bin/branchdetail?id2=624> | Address, hours, phone, coordinates |
| S2 | Mercury Drug — Naga City Concepcion Grande branch page | <https://www.mercurydrug.com/cgi-bin/branchdetail?id2=3104> | Address, hours, phone; coordinate field was `(0,0)` |
| S3 | Mercury Drug — Naga City Puregold branch page | <https://www.mercurydrug.com/cgi-bin/branchdetail?id2=3073> | Address, hours, phone, coordinates |
| S4 | South Star Drug — Store Locations | <https://southstardrug.com.ph/pages/store-locations> | Naga branch addresses, hours, phones |
| S5 | Generika Drugstore — CMS Naga LCC CBD2 | <https://www.generika.com.ph/stores/cms-naga-lcc-cbd2/> | Address, phone, hours, locator coordinates |
| S6 | Generika Drugstore — CMS Naga San Felipe | <https://www.generika.com.ph/stores/cms-naga-san-felipe/> | Address, hours, locator coordinates |
| S7 | Generika store-locator AJAX payload | <https://www.generika.com.ph/wp-admin/admin-ajax.php?action=store_search&lat=13.6217&lng=123.1948&max_results=100&search_radius=100> | Phone and hours fields not shown on the public store page |
| S8 | Watsons — Watsons SM City Naga store page | <https://www.watsons.com.ph/store/wtcph_453_EN> | Address, hours, phone, official Google Maps link |
| S9 | Watsons official Google Maps place link | <https://maps.app.goo.gl/pXVtnsbwRyWDUm4e6> | Coordinate cross-check |
| S10 | NusaList — New Nazareno Drugstore | <https://ph.nusalist.com/pages/new-nazareno-drugstore> | Phone, address |
| S11 | FDA Verification Portal — Nagadrug Corporation, LTO CDRR-RV-DS-1617544 | <https://verification.fda.gov.ph/> (API query: `?q=Nagadrug`) | Registered address, coordinates, Active status, validity to 21 Feb 2028 |
| S12 | FDA Verification Portal — New Nazareno Drug Store, LTO CDRR-RV-DS-223011 | <https://verification.fda.gov.ph/> (API query: `?q=Nazareno Drug Store`) | Registered address, coordinates, Active status, validity to 25 Feb 2031 |
| S13 | OpenStreetMap — Mercury Peñafrancia node | <https://www.openstreetmap.org/node/642883253> | Coordinate cross-check |
| S14 | OpenStreetMap — Mercury Concepcion Grande way | <https://www.openstreetmap.org/way/1415534323> | Coordinate source |
| S15 | OpenStreetMap — Mercury Puregold node | <https://www.openstreetmap.org/node/11997719209> | Coordinate cross-check |
| S16 | OpenStreetMap — South Star Naga 3 node | <https://www.openstreetmap.org/node/642881374> | Coordinate cross-check |
| S17 | OpenStreetMap — South Star Naga 15 node | <https://www.openstreetmap.org/node/4157403495> | Coordinate source |
| S18 | OpenStreetMap — LCC Naga CBD 2 way | <https://www.openstreetmap.org/way/1202549804> | Coordinate source for Generika LCC CBD2 |
| S19 | OpenStreetMap — LCC Supermarket San Felipe node | <https://www.openstreetmap.org/node/11152552034> | Proximity cross-check for Generika San Felipe |
| S20 | OpenStreetMap — Watsons SM City Naga node | <https://www.openstreetmap.org/node/5112522941> | Coordinate cross-check |
| S21 | OpenStreetMap — Door 8 Pavilion 1 (Amanse Children's Clinic) node | <https://www.openstreetmap.org/node/6818835769> | Building cross-check for Nagadrug |

All sources accessed **21 October 2026**.

## 6. JSON shape

`data/naga-pharmacies.json` contains a `meta` object and a `pharmacies` array. Each pharmacy has:

- `id`, `name`, `brand`, `type` (`chain` or `independent`)
- `address`, `barangay`, `barangay_source`
- `latitude`, `longitude` (WGS84 decimal degrees)
- `coordinate_source`, `coordinate_source_url`
- `hours`, `phone` (`null` when unverified)
- `source_url`, `source_type`
- `confidence` (`high` / `medium` / `low`)
- `verified_fields`, `unverified_fields`, `notes`
- `license` (FDA LTO number/status/validity, independents only)
