import type { protos } from '@google-cloud/vision'
import { describe, expect, it } from 'vitest'

import {
  createCloudVisionScanProvider,
  linesFromAnnotation,
} from './scan.cloud-vision.server'

type TextAnnotation = protos.google.cloud.vision.v1.ITextAnnotation
type Word = protos.google.cloud.vision.v1.IWord

function word(text: string, y: number, x: number, confidence: number): Word {
  return {
    symbols: [{ text, confidence }],
    confidence,
    boundingBox: {
      vertices: [
        { x, y },
        { x: x + 10, y },
        { x: x + 10, y: y + 10 },
        { x, y: y + 10 },
      ],
    },
  }
}

function annotation(words: Word[]): TextAnnotation {
  return { pages: [{ blocks: [{ paragraphs: [{ words }] }] }] }
}

describe('linesFromAnnotation', () => {
  it('groups words on the same vertical line and splits separate lines', () => {
    const result = linesFromAnnotation(
      annotation([
        word('Amlodipine', 100, 0, 0.95),
        word('5mg', 101, 120, 0.9),
        word('Paracetamol', 300, 0, 0.85),
        word('500mg', 301, 130, 0.8),
      ]),
    )

    expect(result).toHaveLength(2)
    expect(result[0]?.text).toBe('Amlodipine 5mg')
    expect(result[1]?.text).toBe('Paracetamol 500mg')
  })

  it('averages word confidence into line confidence', () => {
    const result = linesFromAnnotation(
      annotation([word('Amlodipine', 100, 0, 0.5), word('5mg', 100, 120, 0.3)]),
    )

    expect(result[0]?.confidence).toBeCloseTo(0.4, 2)
  })
})

describe('createCloudVisionScanProvider', () => {
  it('reports its name and returns recognized lines', async () => {
    const provider = createCloudVisionScanProvider({
      detectText: () =>
        Promise.resolve(annotation([word('Amlodipine', 100, 0, 0.9)])),
    })

    expect(provider.name).toBe('cloud-vision')
    const result = await provider.recognize(new Uint8Array([1]), 'image/png')
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0]?.text).toBe('Amlodipine')
    expect(result.warnings).toEqual([])
  })

  it('returns no lines when no annotation is recognized', async () => {
    const provider = createCloudVisionScanProvider({
      detectText: () => Promise.resolve(null),
    })

    const result = await provider.recognize(new Uint8Array([1]), 'image/png')
    expect(result.lines).toEqual([])
    expect(result.warnings).toEqual([])
  })
})
