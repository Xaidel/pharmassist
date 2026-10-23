import { isLowConfidence } from './scan.domain'
import type { MedicineMatcher, ScanCandidate, ScanProvider } from './scan.port'

/** The collaborators the recognition use case receives from the composition root. */
export type RecognizeDeps = {
  provider: ScanProvider
  matcher: MedicineMatcher
}

/** The minimized image the use case recognizes. */
export type RecognizeInput = {
  image: Uint8Array
  mimeType: string
}

/** The recognized-and-matched result the response envelope wraps. */
export type RecognitionResult = {
  candidates: ScanCandidate[]
  warnings: string[]
  scriptId?: string
}

/**
 * Recognize a prescription image and resolve each line against the catalog.
 *
 * The OCR provider only returns text and confidence; the matcher turns each
 * line into a suggested medicine. Low-confidence lines and lines with no match
 * are flagged so the confirm screen asks the user instead of auto-adding.
 */
export async function recognizePrescription(
  deps: RecognizeDeps,
  input: RecognizeInput,
): Promise<RecognitionResult> {
  const recognized = await deps.provider.recognize(input.image, input.mimeType)
  const warnings = new Set<string>(recognized.warnings)

  const candidates: ScanCandidate[] = []
  for (let index = 0; index < recognized.lines.length; index += 1) {
    const line = recognized.lines[index]
    if (line === undefined) {
      continue
    }
    const match = await deps.matcher.match(line.text)
    if (match.suggested === null) {
      warnings.add('NO_MATCH')
    }
    if (isLowConfidence(line.confidence)) {
      warnings.add('LOW_CONFIDENCE_ITEM')
    }
    candidates.push({
      line_no: index + 1,
      suggested_medicine: match.suggested,
      confidence: line.confidence,
      low_confidence: isLowConfidence(line.confidence),
      other_matches: match.other,
    })
  }

  return {
    candidates,
    warnings: [...warnings],
    ...(recognized.scriptId === undefined
      ? {}
      : { scriptId: recognized.scriptId }),
  }
}
