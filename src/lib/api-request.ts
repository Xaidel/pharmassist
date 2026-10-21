const DEFAULT_MAX_BODY_BYTES = 32 * 1024

/** The outcome of reading a JSON request body within the accepted size. */
export type JsonBodyResult = { ok: true; value: unknown } | { ok: false }

/** Read a JSON body, rejecting malformed and oversized payloads. */
export async function readJsonBody(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<JsonBodyResult> {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    return { ok: false }
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false }
  }

  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false }
  }
}
