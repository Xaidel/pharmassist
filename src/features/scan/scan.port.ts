import type { MedicineSummary } from '#/shared/domain/medicine-summary'

/** One recognized text line from an OCR provider, with a confidence score. */
export type ScanLine = {
  text: string
  confidence: number
}

/** The OCR capability the scan feature depends on. */
export type ScanProvider = {
  readonly name: string
  recognize(
    image: Uint8Array,
    mimeType: string,
  ): Promise<{
    lines: ScanLine[]
    warnings: string[]
    /** The template the provider matched, when the provider scripts by template. */
    scriptId?: string
  }>
}

/** One alternative medicine a matcher considers for a line of text. */
export type MedicineMatch = {
  medicine: MedicineSummary
  confidence: number
}

/** Resolves recognized text into catalog medicines. */
export type MedicineMatcher = {
  match(text: string): Promise<{
    suggested: MedicineSummary | null
    other: MedicineMatch[]
  }>
}

/** One recognized-and-matched line the confirm screen reviews. */
export type ScanCandidate = {
  line_no: number
  suggested_medicine: MedicineSummary | null
  confidence: number
  low_confidence: boolean
  other_matches: MedicineMatch[]
}
