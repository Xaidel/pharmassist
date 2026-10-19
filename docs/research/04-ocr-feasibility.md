# 04 — OCR feasibility for Philippine handwritten prescriptions

- **Ticket:** `issues/04-ocr-feasibility.md`
- **Date:** 19 October 2026
- **Scope:** Photo-based OCR of handwritten Philippine prescriptions, including brand and generic medicine names, abbreviations, and Latin sig codes.
- **Evidence standard:** Primary vendor documentation, pricing pages, and Philippine law. Claims are marked **Confirmed** when a primary source states them directly, and **Inference** when they are this note's judgement. No Philippine-specific handwriting accuracy benchmark was found; this note does not invent one.

## Bottom line

**Handwriting OCR is feasible only as a suggestion engine, not as an autopilot.** The product rule already assumes this: OCR suggests, the user confirms every item, and the image is discarded immediately. Under that rule, the metric that matters is not character-perfect transcription but whether the correct medicine appears in a short, clearly-labelled candidate list.

**Recommended v1 approach:** use **Google Cloud Vision `DOCUMENT_TEXT_DETECTION`** through a minimal stateless backend, on a cropped and de-identified image, with no image persistence, no request-body logging, mandatory user confirmation, and manual search as the fallback. It is the best fit among the compared options that are PWA-compatible and explicitly documented for handwriting. It costs effectively nothing at pilot volume (first 1,000 units/month free, then US$1.50 per 1,000 images) and its online endpoint is documented as processing images in memory without persisting them to disk.

**Do not use Tesseract for handwriting.** The Tesseract project itself says it is designed for printed text and "won't work very well" on handwriting. **Do not use Amazon Textract by default** for this use: its handwriting support is English/ASCII only, and its default data handling permits storage and use of inputs to improve the service, with possible storage in another region unless the account opts out. **Azure AI Vision Read** is a credible fallback, but its handwriting language list does not include Filipino and it offers no material price advantage. **Google ML Kit** is the best privacy and offline option, but it is an Android SDK, not a PWA API, and Google does not document handwriting support for it.

**The open question is local accuracy, not vendor capability.** None of the vendor documentation reviewed publishes handwriting accuracy figures, and no Philippine-specific prescription OCR benchmark was found. The test plan at the end is therefore the deciding step. If cloud top-3 medicine-name recall is below 50%, OCR should be removed from v1 rather than shipped with a misleading promise.

## 1. What "feasible" means for this product

The PRD rule is:

1. OCR suggests medicine names.
2. The user confirms every item.
3. The image is discarded immediately.

That changes the accuracy target. A raw character error rate (CER) is a poor proxy for product quality because one wrong character can turn one medicine into another (look-alike/sound-alike names), while a noisy line can still rank the correct medicine first after fuzzy matching against the seeded catalog. The useful measures are:

- **Top-k medicine-name recall** after matching OCR text against the 50-medicine v1 catalog plus a small Naga-relevant brand/generic synonym list.
- **Dangerous top-1 error rate**: the top suggestion is a different medicine and is presented with high confidence.
- **Field accuracy** for strength, form, and sig/frequency, because the confirmation screen needs to show something meaningful.
- **Latency and failure rate** on a low-end Android phone over a typical mobile connection.
- **Whether any image is retained**, by Pharmassist or by the OCR processor.

This is an inference from the product rule, not a vendor claim.

## 2. Confirmed vendor capabilities

| Engine | Deployment | Handwriting claim | Language position | PWA-compatible? | Metered cost |
|---|---|---|---|---|---|
| Google ML Kit Text Recognition v2 | On-device Android SDK | **Not documented**; docs describe text in images/video and list scripts, not handwriting | Latin script model; Filipino supported; Bikol Naga mapped to Latin; Cebuano experimental | **No**, not from a browser; requires native Android shell/plugin | No metered OCR fee documented; on-device compute |
| Tesseract 5 | Native C++ library; Tesseract.js is a browser/WASM port | Vendor FAQ: handwriting "won't work very well"; designed for printed text | 100+ languages; printed text focus | Native: no. Tesseract.js: yes, in browser | Open source, Apache-2.0; device compute |
| Google Cloud Vision | Cloud REST API | **Explicit**: `DOCUMENT_TEXT_DETECTION` is documented for detecting handwriting | OCR language list includes Filipino and Tagalog; no separate handwriting accuracy by language | **Yes**, HTTPS from PWA via backend | First 1,000 units/month free; then US$1.50/1,000 for Document Text Detection |
| Amazon Textract | Cloud API | **Explicit**, but only "Standard English alphabet and ASCII symbols"; handwriting processing is English only | Printed: English, German, French, Spanish, Italian, Portuguese; handwriting: English only | **Yes**, HTTPS from PWA via backend | First 1,000 pages/month free for 3 months; then US$0.0015/page to 1M pages |
| Azure AI Vision Read | Cloud API | **Explicit**: handwritten text supported for English, French, German, Italian, Portuguese, Spanish, Chinese Simplified, Japanese, Korean | Filipino appears in the printed-text list, not the handwritten list | **Yes**, HTTPS from PWA via backend | F0: 5,000 free transactions/month where available; Read is Image Analysis Group 2 at US$1.50/1,000 in Southeast Asia |

### 2.1 Google ML Kit

**Confirmed:**

- ML Kit Text Recognition v2 recognizes text in Chinese, Devanagari, Japanese, Korean, and Latin scripts; it segments text into blocks, lines, elements, and symbols and returns bounding boxes and confidence scores. It does **not** advertise handwriting recognition on its overview page. [1]
- The Android guide requires Android API level 23 or above, offers bundled and unbundled models, and says the Latin model is "real-time on most devices." Bundled size is about 4 MB per script per architecture; unbundled is about 260 KB per script architecture and downloads via Google Play Services. [3][5]
- Processing happens on-device; ML Kit "does not send that data and the resultant outputs to Google servers." It does send performance/utilization metrics, and the developer is responsible for disclosing that. [4]
- Supported languages include Filipino; Cebuano is experimental; Bikol Naga is mapped to the Latin model. [2]

**Inference:**

- Because Google does not claim handwriting support, ML Kit's accuracy on cursive Philippine prescriptions is unproven. It may work on neat print handwriting and fail on cursive or doctor-specific shorthand.
- ML Kit cannot be called from a PWA. Using it means a native Android wrapper or a Capacitor/Cordova plugin, which changes the delivery model the PRD currently assumes.

### 2.2 Tesseract

**Confirmed:**

- Tesseract is an open-source OCR engine with an LSTM engine focused on line recognition; it is licensed Apache-2.0. [19]
- Its FAQ answers "Can I use Tesseract for handwriting recognition?" with: "You can, but it won't work very well, as Tesseract is designed for printed text. Look for projects focused on handwriting recognition." [18]
- Tesseract.js is a pure JavaScript port that can run in a browser or Node.js. [20]

**Inference:**

- Tesseract is a useful baseline to quantify the gap, not a candidate for handwritten prescriptions. Running the full engine in a low-end browser via WebAssembly also adds model download, memory, and CPU cost, which is the opposite of what a low-end Android PWA needs.

### 2.3 Google Cloud Vision

**Confirmed:**

- The Vision API can detect and extract text; `DOCUMENT_TEXT_DETECTION` is "optimized for dense text and documents," and "one specific use ... is to detect handwriting in an image." [6]
- Document Text Detection is priced at the same rate as Text Detection: first 1,000 units/month free, then US$1.50 per 1,000 units up to 5,000,000 units/month, then US$0.60 per 1,000. [7]
- For online (immediate-response) operations, "the image data is processed in memory and not persisted to disk." Google says it does not use content to train or improve Cloud Vision, does not share it publicly, and does not claim ownership; it does temporarily log request metadata such as time and size to improve the service and combat abuse. [8]
- The OCR language list includes Filipino and Tagalog (both Latin script); the same page links language hints to both text and handwriting detection. [9]

**Inference:**

- Cloud Vision is the strongest capability fit for a PWA: no native SDK, explicit handwriting support, usable language coverage for English/Taglish/Latin-script medicine names, and a price that is negligible at pilot scale.
- It is still a cross-border transfer of health data to a processor. "Not persisted to disk" is not the same as "never leaves the device," and metadata logs still exist. The privacy notice must say this accurately.

### 2.4 Amazon Textract

**Confirmed:**

- Textract detects printed text and handwriting, but "handwriting ... from the Standard English alphabet and ASCII symbols"; handwriting processing is "in English only." Printed text, forms, and tables support English, German, French, Spanish, Italian, and Portuguese. [11]
- Detect Document Text is US$0.0015 per page for the first 1 million pages/month, then US$0.0006 per page. New AWS customers get 1,000 pages/month free for three months. [12]
- Textract is available in Asia Pacific (Singapore), among other regions. [11]
- By default, Textract "may store and use document and image inputs ... solely to provide and maintain the service and to improve and develop the quality" of Textract and other AWS ML/AI technologies. Some content may be stored in another AWS region for that purpose unless the customer opts out via an AWS Organizations AI services opt-out policy. Deletion of inputs can be requested through AWS Support. [11]

**Inference:**

- Textract's default data handling is incompatible with a literal "discard immediately" promise. An opt-out policy avoids use for service improvement and cross-region storage, but content is still stored at rest in the region where it is processed, and deletion is requested through support. Even with those controls, its English-only handwriting support is a worse fit for Taglish/Filipino prescriptions than Cloud Vision's broader language list.
- Textract's structured features (forms, tables, queries) are irrelevant for a short prescription; paying for them would add complexity without addressing the hard part, which is handwriting.

### 2.5 Azure AI Vision Read

**Confirmed:**

- Azure Vision's Read OCR extracts printed or handwritten text from images in a synchronous API. [13]
- Handwritten text is supported for English, French, German, Italian, Portuguese, Spanish, Chinese Simplified, Japanese, and Korean. Filipino is listed for printed text, not for handwritten text. [14]
- Azure Vision pricing: F0 gives 5,000 free transactions/month where available at 20 transactions/minute; Read is in Image Analysis Group 2. The Azure Retail Prices API lists Image Analysis Group 2 at US$1.50 per 1,000 transactions for the first 1M in Southeast Asia, then US$0.60. [15][16]

**Inference:**

- Azure Read is a credible technical fallback if Google Cloud is unavailable or if the local test shows better accuracy. It has no material price advantage over Cloud Vision, and its handwriting language list is a worse fit for Filipino/Taglish than Cloud Vision's.
- This review did not verify a product-specific Azure Vision retention statement equivalent to Cloud Vision's online in-memory statement. Microsoft's data processing addendum and the product's retention behavior would need review before use with prescription images.

## 3. Accuracy on Philippine handwritten prescriptions

### 3.1 What is confirmed

- Cloud Vision, Textract, and Azure explicitly support handwriting; ML Kit does not document it; Tesseract explicitly says it is poor at it. [1][6][11][13][18]
- Textract's handwriting support is English-only; Azure's handwritten list excludes Filipino; Cloud Vision's OCR language list includes Filipino/Tagalog but does not publish handwriting accuracy. [9][11][14]
- None of the vendor documentation reviewed publishes a handwriting accuracy benchmark, let alone one for Philippine prescriptions, brand names, or Latin sig codes. The claims are capability claims, not accuracy guarantees.

### 3.2 What is not available

**No Philippine-specific handwriting OCR accuracy data was found.** A search of Europe PMC for handwritten-prescription OCR literature returned studies on online/stylus handwriting and on non-Philippine settings, but no vendor benchmark or Philippine photo-OCR dataset. One 2022 study used stylus/tablet writing and a 24-medicine, 9-user dataset; it is not a photo-OCR benchmark and cannot be transferred to this problem. [23]

This absence is itself a finding: the PRD cannot honestly promise a given scan success rate until the local test is run.

### 3.3 Why Philippine prescriptions are hard (inference)

- **Brand names are out-of-vocabulary.** Philippine brands such as Biogesic, Neozep, Alaxan, Medicol, and many local generics are not common English words; OCR models trained on natural language have no reason to prefer them.
- **Generic names are long and similar.** Losartan versus Losartan + hydrochlorothiazide, amlodipine versus amlodipine + valsartan, and similar-looking endings create look-alike errors that matter more than ordinary word errors.
- **Handwriting is mixed.** Prescriptions may be cursive, print, or a doctor-specific shorthand; some are written while standing or in a hurry.
- **Abbreviations and Latin sig codes are punctuation-sensitive.** Examples include `q.d.`, `b.i.d.`, `t.i.d.`, `q.i.d.`, `p.r.n.`, `h.s.`, `a.c.`, `p.c.`, and `stat`. OCR may drop periods, merge letters, or read `q.d.` as `qd`; the confirmation UI must expand and display these in plain language, not act on them.
- **The image is not a document scan.** It is a phone photo with perspective, shadows, creases, and variable focus.
- **The catalog is small but ambiguous.** A 50-medicine catalog improves fuzzy matching, but it also increases the chance that a wrong OCR string lands near a real medicine. Top-k ranking and confidence thresholds matter.

### 3.4 What this means

Raw CER is not the acceptance criterion. The test should measure whether the correct medicine is in the top 1-3 suggestions after normalization and fuzzy matching, and whether any wrong medicine is suggested with dangerous confidence. A system that reads 80% of characters correctly but ranks the right medicine first 80% of the time is more useful than one that reads 95% of characters but buries the right medicine. (Inference)

## 4. Cost

Prices are list prices in USD, accessed 19 October 2026, and exclude tax, egress, support, and any negotiated discount. One prescription photo = one image/page/transaction.

| Volume/month | Google Cloud Vision | Amazon Textract | Azure AI Vision Read |
|---|---:|---:|---:|
| 1,000 | $0 (free tier) | $0 for first 3 months; then $1.50 | $0 (F0 free tier, where available) |
| 10,000 | $13.50 | $15.00 | $7.50 (5,000 F0 free) |
| 100,000 | $148.50 | $150.00 | $142.50 (5,000 F0 free) |

Sources: Cloud Vision pricing [7]; Textract pricing [12]; Azure pricing [15][16].

**Inference:** At pilot volume (hundreds to a few thousand scans), OCR cost is not a decision factor. The real cost is pharmacist/annotator time to build ground truth, plus engineering time for the stateless proxy and privacy controls. ML Kit and Tesseract have no per-call fee, but they shift cost to device compute, model distribution, and native-wrapper maintenance.

## 5. Latency and low-end Android

### 5.1 Confirmed

- ML Kit says the Latin model is "real-time on most devices"; the model can be bundled (about 4 MB per script per architecture) or downloaded via Google Play Services (about 260 KB per script architecture), and the unbundled model may need a first-use download. [3][5]
- Textract offers synchronous single-page operations with "near real-time responses." [10]
- Azure Vision's Read OCR is described as a "fast, synchronous API" for near-real-time experiences. [13]
- Cloud Vision's online operation is synchronous; its data-usage FAQ distinguishes online immediate-response operations from asynchronous batch operations. [8]
- None of the vendor documentation reviewed publishes p50/p95 latency figures for handwriting images from Philippine mobile networks.

### 5.2 Inference

- On-device ML Kit should be the fastest option after the model is loaded, and it works offline. The first scan can be slower if the unbundled model must download.
- Cloud OCR adds a mobile uplink, a network round trip to the nearest region (Singapore is the nearest common region for all three providers), and the OCR processing time. A stateless backend in Singapore reduces one hop; the PWA itself should not call the vendor directly because that would expose the API key.
- Tesseract on a low-end phone is CPU- and memory-bound; Tesseract.js adds a large WebAssembly/model download. It is unlikely to be acceptable on a 2 GB RAM Android device, but this should be measured rather than assumed.
- Low-end Android support for cloud OCR is mostly a browser/camera/upload problem, not an OCR-model problem. The test should include a real low-end device and a throttled 3G/4G profile.

## 6. Privacy under the Data Privacy Act

### 6.1 The legal frame (confirmed)

- A prescription contains health information. Under RA 10173, "sensitive personal information" includes personal information "about an individual's health." [21][22]
- Processing of sensitive personal information is prohibited except in listed cases; the relevant case for a consumer price-comparison app is likely specific prior consent, not the medical-treatment exception (which is limited to medical practitioners/treatment institutions). [21][22]
- The law requires transparency, legitimate purpose, proportionality, adequacy, and retention only as long as necessary. [21][22]
- A personal information controller remains accountable for information transferred to a third party, domestic or international, and must use contractual or other reasonable means to provide comparable protection. [21][22]
- The controller must implement reasonable organizational, physical, and technical security measures and notify the Commission and affected data subjects of certain breaches involving sensitive personal information. [21][22]

This is a summary, not legal advice. Ticket 01 owns the full regulatory analysis; the OCR decision should be checked against it and against counsel.

### 6.2 Engine-by-engine

**ML Kit (on-device):** Input images and outputs are processed on-device and are not sent to Google; Google receives performance/utilization metrics. [4] This is the strongest privacy position among the viable handwriting options and is compatible with a literal "the image never leaves your phone" promise. Its cost is the native Android wrapper.

**Cloud Vision:** Online images are processed in memory and not persisted to disk; Google does not use the content to train Cloud Vision, does not share it publicly, and logs request metadata. [8] This is compatible with "no server-side prescription storage" if Pharmassist's proxy is also stateless and does not log the image. It is not compatible with "never leaves the device." The processor transfer still requires a lawful basis, a privacy notice naming the recipient, a data processing addendum, and a DPIA.

**Textract:** By default, AWS may store and use inputs to improve Textract and other AWS ML services, and may store some content in another region unless the account opts out. Deletion is by support request. [11] That is not "discard immediately" by default. It can be made acceptable with an opt-out policy and deletion process, but that is additional contractual and operational work for no accuracy advantage here.

**Azure:** Images are uploaded to the cloud service. [13] Microsoft's data processing terms would need to be reviewed, and this review did not verify a product-specific no-retention statement. Treat it as a processor transfer requiring the same DPA/DPIA work as Cloud Vision.

### 6.3 What the product may say

- If Cloud Vision is used: "Your photo is sent securely for text recognition. It is not stored by Pharmassist or used to train models." Do **not** say "your photo never leaves your phone."
- If ML Kit is used in a native wrapper: "Your photo is read on your phone and is not uploaded." That claim must be true end-to-end, including crash reporting and analytics.
- In both cases: "OCR suggests; you confirm every medicine." No auto-add, no dosage advice, no diagnosis.

### 6.4 Open questions

- Does Cloud Vision's handwriting accuracy hold on Filipino/Taglish and on Philippine brand names? The vendor does not publish this; the test must answer it.
- Does ML Kit handle any handwriting at all well enough to justify a native wrapper? Google does not claim it; treat it as unproven.
- Will DPA counsel accept a cross-border processor transfer for a no-account, no-storage scan flow? If not, the on-device path is the only OCR option.
- How stable are the vendors' prices and free tiers? Re-check before launch; the figures here are dated.
- How will the 50-medicine catalog handle brand/generic synonyms and look-alike names? That is a separate data-quality task, but it directly affects top-k recall.

## 7. Recommendation

### 7.1 Primary: Cloud Vision behind a stateless proxy, for the v1 PWA pilot

Use Google Cloud Vision `DOCUMENT_TEXT_DETECTION` with these guardrails:

1. **Crop and mask on-device.** Ask the user to frame only the medicine lines; mask the patient name, address, age, and any diagnosis before upload. Send one cropped image per scan.
2. **Minimize the payload.** JPEG/WebP, long edge about 1,200-1,600 px, quality about 80, no EXIF, no original retained.
3. **Stateless backend.** A minimal proxy (for example, Cloud Run in Singapore) holds the API key, forwards the image in memory, writes nothing to disk, and disables request-body logging. No Cloud Storage bucket, no async batch, no queue that persists the image.
4. **Delete client-side immediately.** Revoke the object URL, clear the file input/camera buffer, and delete any temporary blob after the response. Do not attach images to crash reports or analytics.
5. **Vendor settings.** Use the online synchronous endpoint, not asynchronous batch. Keep the project separate, least-privilege, with budget alerts and audit logs that do not contain image content.
6. **Consent and notice.** Just-in-time consent before the first scan; privacy notice naming Google Cloud as the OCR processor, the purpose, the no-retention design, and the cross-border transfer; DPIA and processor terms under RA 10173. Confirm with counsel and issue #1.
7. **Confirmation UX.** Show top-3 candidates with confidence labels; require an explicit tap for each medicine; allow "none of these" and manual search; never auto-add; never interpret or advise on sig/dosage.
8. **Fallback.** If OCR fails, times out, or returns low confidence, go straight to manual search. The scan path must not block the price comparison.

**Why this fits the rule:** Cloud Vision explicitly supports handwriting, works in a PWA, costs little at pilot scale, and its online endpoint is documented as in-memory with no disk persistence. The user confirms every item. The image is discarded immediately by Pharmassist, even though it is transmitted to a processor. The remaining privacy risk is the transfer, which is manageable with consent, a DPA, minimization, and a DPIA.

**When this recommendation is wrong:** If the product's privacy promise is literally "the image never leaves your phone," cloud OCR is disqualified. In that case, defer OCR to a post-v1 native Android wrapper using ML Kit, or do not ship OCR in v1.

### 7.2 Fallback and post-v1 path

- **Azure AI Vision Read:** viable fallback if Google Cloud is unavailable or if the local test shows better accuracy. Same privacy work; no material cost advantage; weaker Filipino handwriting coverage.
- **ML Kit:** the post-v1 on-device path if a native Android shell is acceptable and the test shows adequate handwriting accuracy. It is free, offline, and private, but it is not a PWA API and Google does not document handwriting support.
- **Textract:** not recommended for this use as configured by default. English-only handwriting and default data use/storage are both poor fits.
- **Tesseract:** not recommended for handwriting. Use it only as a baseline in the test to quantify the gap.

### 7.3 Decision gates for the test

These are proposed product thresholds, not industry standards:

| Result | Decision |
|---|---|
| Cloud top-3 medicine-name recall **≥ 70%**, dangerous top-1 error **≤ 2%**, p95 latency **≤ 8 s** on 4G | Ship OCR as an experimental assist, with mandatory confirmation |
| Top-3 recall **50-70%**, or p95 **> 8 s** | Keep OCR optional and off by default; manual search is the primary path; do not show confident auto-suggestions |
| Top-3 recall **< 50%**, or dangerous top-1 error **> 2%** | Remove OCR from v1; ship manual search only |

If ML Kit is within about 10 percentage points of Cloud Vision on top-3 recall, a native wrapper becomes worth considering for the privacy and offline benefits. If it is far behind, defer it.

## 8. Test plan: de-identified sample prescriptions

### 8.1 Objective

Measure whether any engine can put the correct medicine in the top 3 suggestions often enough to save the user time, without dangerous wrong suggestions, on realistic Naga prescriptions and low-end hardware.

### 8.2 Sample

- **120 prescriptions** (30 for pipeline shakedown, 90 for measurement), targeting **300+ line items**.
- Sources: 3-5 community pharmacies and 1-2 clinics in Naga City, with permission. Include at least 5 prescribers with different handwriting styles.
- Stratify:
  - 50% brand-name prescriptions, 30% generic, 20% mixed.
  - 20% printed/typed prescriptions as a control.
  - 10% deliberately poor images (low light, handheld, shadow) to test the failure mode.
  - Mix of short (1-3 items) and long (5+ items) prescriptions.
- **De-identify at capture:** place an opaque card over the patient name, address, age, and any diagnosis before taking the photo; photograph only the medicine lines. Do not photograph faces, IDs, or the pharmacy's patient record screen. Assign a sample ID; never store the patient's name with the image.
- **Consent:** pharmacy/clinic permission and a short information sheet; if any patient-level data is unavoidable, obtain consent consistent with RA 10173 and the issue #1 analysis. Store images encrypted; delete raw images after annotation unless the participant explicitly agrees to retain de-identified crops for the benchmark.

### 8.3 Ground truth

- Two licensed pharmacists independently transcribe each item into a structured form: raw line text, medicine name as written, normalized brand/generic name, strength, form, sig code as written, expanded frequency, and quantity.
- A third pharmacist adjudicates disagreements. Record the adjudication, not just the final label.
- Expand Latin sig codes to plain language in a separate field; do not "correct" the prescriber's intent beyond what is legible.

### 8.4 Capture protocol

- Use the actual PWA camera flow, not a gallery of clean scans. Test:
  - A low-end Android phone (about 2 GB RAM, Android 10 or older) and a mid-range Android phone.
  - Good light/flat surface vs low light/handheld.
  - Auto-crop vs manual crop.
  - 4G/Wi-Fi vs a throttled 3G profile.
- Record device, OS, camera resolution, lighting condition, and network profile with each sample.

### 8.5 Engines and run matrix

| Engine | How to run | Notes |
|---|---|---|
| Google Cloud Vision | Backend proxy, `DOCUMENT_TEXT_DETECTION`, language hints `en` and `en`+`fil` | Primary candidate |
| Azure AI Vision Read | Backend proxy, synchronous Read | Fallback candidate |
| Amazon Textract | Backend proxy, `DetectDocumentText` | Expect English-only handwriting; include to verify |
| ML Kit | Small native Android harness, bundled Latin model | On-device; measure cold and warm |
| Tesseract 5 | Native harness on the low-end device, and/or Tesseract.js in the PWA | Baseline only; 30 scripts is enough |

Run all engines on the same de-identified images. For cloud engines, run at least twice to separate cold and warm behavior. For on-device engines, run cold (first use/model load) and warm.

### 8.6 Metrics

- **CER** = (substitutions + deletions + insertions) / ground-truth characters, on raw line text.
- **WER** = word-level edit distance / ground-truth words.
- **Exact medicine-name match** after normalization (case, punctuation, whitespace, salt/form).
- **Top-1 and top-3 medicine-name recall** after fuzzy matching against the v1 catalog plus brand/generic synonyms.
- **Field accuracy** for strength, form, and sig/frequency.
- **Image-level all-items-correct rate.**
- **Dangerous top-1 error rate**: top suggestion is a different medicine with a high match/confidence score. Review these manually.
- **Latency** p50/p95 from shutter tap to suggestions, split by device and network.
- **Failure/timeout rate** and fallback-to-manual-search rate.
- **Cost per 1,000 scans** at list price, including retries.

### 8.7 Analysis

- Report 95% confidence intervals (Wilson) for proportions; with 300 items, a 70% top-3 recall has a roughly ±5-point interval.
- Stratify by handwriting quality, printed vs handwritten, brand vs generic, device, lighting, and number of items.
- Publish a small confusion table of the most common medicine-name errors, especially look-alike/sound-alike pairs.
- Compare OCR+confirm time against manual search time for the same items; the product only wins if it saves time.

### 8.8 Timeline and cost

- **Week 1:** permissions, consent materials, capture 30 prescriptions, build the annotation sheet, run the pipeline shakedown.
- **Week 2:** refine the crop/mask flow, collect the remaining 90, double-annotate.
- **Week 3:** run all engines, adjudicate, analyze, write the decision memo.
- **API cost:** under US$10 at list prices for 120 scripts × 5 engines; the free tiers likely cover most of it.
- **People:** roughly 20-30 hours of pharmacist annotation/adjudication, plus 3-5 days of engineering.

### 8.9 What would invalidate the test

- Using clean scans or gallery images instead of real phone photos.
- Letting the annotator see the OCR output before writing ground truth.
- Failing to mask patient identifiers at capture.
- Reporting only CER and not top-k medicine recall.
- Treating a vendor's handwriting capability claim as an accuracy result.

## Sources

All URLs accessed 19 October 2026. Dates in parentheses are the page's own last-updated date where shown.

1. Google for Developers, **"Text recognition v2"** (last updated 2024-07-10). https://developers.google.com/ml-kit/vision/text-recognition
2. Google for Developers, **"Text recognition v2: supported languages"** (last updated 2024-07-10). https://developers.google.com/ml-kit/vision/text-recognition/v2/languages
3. Google for Developers, **"Recognize text in images with ML Kit on Android"** (last updated 2026-10-16). https://developers.google.com/ml-kit/vision/text-recognition/v2/android
4. Google for Developers, **"ML Kit Terms & Privacy"** (last modified 2025-05-14). https://developers.google.com/ml-kit/terms
5. Google for Developers, **"ML Kit model installation paths on Android"** (last updated 2026-10-16). https://developers.google.com/ml-kit/tips/installation-paths
6. Google Cloud, **"Detect handwriting in images"** (Cloud Vision API). https://cloud.google.com/vision/docs/handwriting
7. Google Cloud, **"Cloud Vision pricing"**. https://cloud.google.com/vision/pricing
8. Google Cloud, **"Data Usage FAQ"** (Cloud Vision API, last updated 2026-10-13). https://cloud.google.com/vision/docs/data-usage
9. Google Cloud, **"OCR language support"** (Cloud Vision API). https://cloud.google.com/vision/docs/languages
10. Amazon Web Services, **"Identifying Your Amazon Textract Use Case"** (Amazon Textract Developer Guide). https://docs.aws.amazon.com/textract/latest/dg/how-it-works.html
11. Amazon Web Services, **"Amazon Textract FAQs"**. https://aws.amazon.com/textract/faqs/
12. Amazon Web Services, **"Amazon Textract pricing"**. https://aws.amazon.com/textract/pricing/
13. Microsoft Learn, **"OCR for images - Azure Vision in Foundry Tools"** (ms.date 2025-09-26). https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/concept-ocr
14. Microsoft Learn, **"Language support - Azure Vision in Foundry Tools"** (ms.date 2025-09-26). https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/language-support
15. Microsoft Azure, **"Azure Vision in Foundry Tools pricing"**. https://azure.microsoft.com/en-us/pricing/details/cognitive-services/computer-vision/
16. Microsoft Azure, **Azure Retail Prices API**, filter for `armRegionName eq 'southeastasia'`, `productName eq 'Azure Vision'`, `skuName eq 'Image Analysis Group 2'`; meter "Image Analysis Group 2 Transactions" at US$1.50 and US$0.60 per 1,000. https://prices.azure.com/api/retail/prices
17. Tesseract OCR, **"Tesseract documentation"**. https://tesseract-ocr.github.io/
18. Tesseract OCR, **"FAQ"** (Tesseract 4.0.0 and later). https://tesseract-ocr.github.io/tessdoc/FAQ.html
19. Tesseract OCR, **GitHub repository README and Apache-2.0 license**. https://github.com/tesseract-ocr/tesseract
20. Tesseract.js, **"Pure Javascript Multilingual OCR"**. https://tesseract.projectnaptha.com/
21. Republic of the Philippines, **"Republic Act No. 10173"** (Data Privacy Act of 2012), LawPhil. https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html
22. National Privacy Commission, **"Republic Act 10173 - Data Privacy Act of 2012"**. https://www.privacy.gov.ph/data-privacy-act/
23. Rani S, Rehman AU, Yousaf B, Rauf HT, Nasr EA, Kadry S. **"Recognition of Handwritten Medical Prescription Using Signature Verification Techniques."** *Comput Math Methods Med.* 2022;2022:9297548. https://pmc.ncbi.nlm.nih.gov/articles/PMC9509260/
