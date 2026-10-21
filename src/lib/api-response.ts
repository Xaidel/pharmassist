/** The API response headers every POC endpoint must carry. */
function apiHeaders(init: ResponseInit = {}): Headers {
  const headers = new Headers(init.headers)
  headers.set('cache-control', 'no-store')
  headers.set('x-robots-tag', 'noindex')
  return headers
}

/** Render a JSON API response with the POC's privacy headers. */
export function apiJson(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, { ...init, headers: apiHeaders(init) })
}

/** Render the shared API error envelope. */
export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const error: { code: string; message: string; details?: unknown } = {
    code,
    message,
  }
  if (details !== undefined) {
    error.details = details
  }
  return apiJson({ error }, { status })
}

/** Render the shared method-not-allowed response for an endpoint. */
export function apiMethodNotAllowed(allowed: readonly string[]): Response {
  const response = apiError(
    405,
    'METHOD_NOT_ALLOWED',
    `Only ${allowed.join(', ')} is allowed for this endpoint.`,
  )
  response.headers.set('allow', allowed.join(', '))
  return response
}
