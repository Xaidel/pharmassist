import type { ImageAnnotatorClient } from '@google-cloud/vision'
import type { protos } from '@google-cloud/vision'

import type { ScanLine, ScanProvider } from './scan.port'

type Vertex = protos.google.cloud.vision.v1.IVertex
type Word = protos.google.cloud.vision.v1.IWord
type TextAnnotation = protos.google.cloud.vision.v1.ITextAnnotation

/** How long the OCR call may run before the endpoint reports a timeout. */
export const CLOUD_VISION_TIMEOUT_MS = 15_000

/** The OCR call the adapter drives; injected for tests so no live call is made. */
export type DetectText = (image: Uint8Array) => Promise<TextAnnotation | null>

/** The configuration the Cloud Vision adapter factory accepts. */
export type CloudVisionScanConfig = {
  timeoutMs?: number
  languageHints?: string[]
  detectText?: DetectText
}

type FlatWord = {
  text: string
  centerY: number
  minX: number
  confidence: number | null
}

function verticesOf(word: Word): readonly Vertex[] {
  return word.boundingBox?.vertices ?? []
}

function numberOrZero(value: number | null | undefined): number {
  return typeof value === 'number' ? value : 0
}

function wordConfidence(word: Word): number | null {
  if (typeof word.confidence === 'number' && word.confidence > 0) {
    return word.confidence
  }
  const confidences = (word.symbols ?? [])
    .map((symbol) => symbol.confidence)
    .filter(
      (confidence): confidence is number =>
        typeof confidence === 'number' && confidence > 0,
    )
  if (confidences.length === 0) {
    return null
  }
  return (
    confidences.reduce((total, confidence) => total + confidence, 0) /
    confidences.length
  )
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 1
  }
  return values.reduce((total, value) => total + value, 0) / values.length
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted.at(middle) ?? 0
  }
  const lower = sorted.at(middle - 1)
  const upper = sorted.at(middle)
  if (lower === undefined || upper === undefined) {
    return 0
  }
  return (lower + upper) / 2
}

function roundConfidence(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000
}

function flatWords(annotation: TextAnnotation): FlatWord[] {
  const words: FlatWord[] = []
  for (const page of annotation.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const word of paragraph.words ?? []) {
          const text = (word.symbols ?? [])
            .map((symbol) => symbol.text ?? '')
            .join('')
            .trim()
          if (text === '') {
            continue
          }
          const vertices = verticesOf(word)
          const ys = vertices.map((vertex) => numberOrZero(vertex.y))
          const xs = vertices.map((vertex) => numberOrZero(vertex.x))
          const centerY = ys.length === 0 ? 0 : average(ys)
          const minX = xs.length === 0 ? 0 : Math.min(...xs)
          words.push({
            text,
            centerY,
            minX,
            confidence: wordConfidence(word),
          })
        }
      }
    }
  }
  return words
}

/**
 * Group recognized words into lines by their vertical position.
 *
 * `DOCUMENT_TEXT_DETECTION` returns words with bounding boxes but no line
 * breaks. Words whose vertical centers sit within half a median word height of
 * each other are read left-to-right as one line, which is the shape the scan
 * feature's confirm screen consumes.
 */
export function linesFromAnnotation(annotation: TextAnnotation): ScanLine[] {
  const words = flatWords(annotation)

  const spans: number[] = []
  for (const page of annotation.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const word of paragraph.words ?? []) {
          const vertices = verticesOf(word)
          const ys = vertices.map((vertex) => numberOrZero(vertex.y))
          if (ys.length === 0) {
            continue
          }
          spans.push(Math.max(...ys) - Math.min(...ys))
        }
      }
    }
  }
  const tolerance = Math.max(median(spans) / 2, 8)

  const sorted = [...words].sort(
    (left, right) => left.centerY - right.centerY || left.minX - right.minX,
  )

  type LineGroup = { centerY: number; texts: string[]; confidences: number[] }
  const lines: LineGroup[] = []
  for (const word of sorted) {
    const current = lines.at(-1)
    if (
      current !== undefined &&
      Math.abs(word.centerY - current.centerY) <= tolerance
    ) {
      current.texts.push(word.text)
      if (word.confidence !== null) {
        current.confidences.push(word.confidence)
      }
      continue
    }
    lines.push({
      centerY: word.centerY,
      texts: [word.text],
      confidences: word.confidence === null ? [] : [word.confidence],
    })
  }

  return lines.map((line) => ({
    text: line.texts.join(' '),
    confidence: roundConfidence(average(line.confidences)),
  }))
}

/** The default detector, calling the Cloud Vision API over a live client. */
function createGoogleDetector(
  timeoutMs: number,
  languageHints: readonly string[],
): DetectText {
  // The SDK is loaded on first use so the mock-only POC never pays its cost.
  let clientPromise: Promise<ImageAnnotatorClient> | null = null
  const getClient = (): Promise<ImageAnnotatorClient> => {
    clientPromise ??= import('@google-cloud/vision').then(
      (module) => new module.ImageAnnotatorClient(),
    )
    return clientPromise
  }

  return async (image) => {
    const client = await getClient()
    const [response] = await client.batchAnnotateImages(
      {
        requests: [
          {
            image: { content: Buffer.from(image) },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: { languageHints: [...languageHints] },
          },
        ],
      },
      { timeout: timeoutMs },
    )
    return response.responses?.[0]?.fullTextAnnotation ?? null
  }
}

/**
 * Build the Cloud Vision adapter behind the provider-neutral scan port.
 *
 * The adapter is the only module that imports the Cloud Vision SDK. It reads
 * the image bytes in memory, never writes them to disk, never logs the body or
 * filename, and returns recognized lines with confidence only. Credentials are
 * read by the SDK from `GOOGLE_APPLICATION_CREDENTIALS`, not from this module.
 */
export function createCloudVisionScanProvider(
  config: CloudVisionScanConfig = {},
): ScanProvider {
  const timeoutMs = config.timeoutMs ?? CLOUD_VISION_TIMEOUT_MS
  const languageHints = config.languageHints ?? ['en', 'fil']
  const detectText =
    config.detectText ?? createGoogleDetector(timeoutMs, languageHints)

  return {
    name: 'cloud-vision',
    async recognize(image) {
      const annotation = await detectText(image)
      if (annotation === null) {
        return { lines: [], warnings: [] }
      }
      return { lines: linesFromAnnotation(annotation), warnings: [] }
    },
  }
}
