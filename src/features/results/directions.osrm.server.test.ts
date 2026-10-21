import { describe, expect, it } from 'vitest'

import { DirectionsUnavailableError } from './directions.domain'
import { createOsrmDirectionsProvider } from './directions.osrm.server'

const REQUEST = {
  origin: { latitude: 13.6215, longitude: 123.1945 },
  destination: { latitude: 13.619626, longitude: 123.189712 },
}

const OSRM_RESPONSE = {
  code: 'Ok',
  routes: [
    {
      distance: 1234.4,
      duration: 456.2,
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.1945, 13.6215],
          [123.1912, 13.6204],
          [123.189712, 13.619626],
        ],
      },
    },
  ],
}

function createFetch(body: unknown, status = 200): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    )
}

describe('createOsrmDirectionsProvider', () => {
  it('calls the driving route endpoint and maps the first route', async () => {
    let calledUrl = ''
    const fetchMock: typeof fetch = (input, init) => {
      calledUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      return Promise.resolve(
        new Response(JSON.stringify(OSRM_RESPONSE), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    }
    const provider = createOsrmDirectionsProvider(
      'https://routing.test/',
      fetchMock,
    )

    const result = await provider.route(REQUEST, new AbortController().signal)

    expect(calledUrl).toBe(
      'https://routing.test/route/v1/driving/123.1945,13.6215;123.189712,13.619626?overview=simplified&geometries=geojson&steps=false&alternatives=false',
    )
    expect(result).toEqual({
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.1945, 13.6215],
          [123.1912, 13.6204],
          [123.189712, 13.619626],
        ],
      },
      distanceM: 1234,
      durationS: 456,
      provider: 'osrm',
    })
  })

  it('rejects an unavailable, malformed, or no-route response', async () => {
    const provider = createOsrmDirectionsProvider(
      'https://routing.test',
      createFetch({}, 500),
    )
    await expect(
      provider.route(REQUEST, new AbortController().signal),
    ).rejects.toBeInstanceOf(DirectionsUnavailableError)

    const noRoute = createOsrmDirectionsProvider(
      'https://routing.test',
      createFetch({ code: 'NoRoute', routes: [] }),
    )
    await expect(
      noRoute.route(REQUEST, new AbortController().signal),
    ).rejects.toBeInstanceOf(DirectionsUnavailableError)

    const badGeometry = createOsrmDirectionsProvider(
      'https://routing.test',
      createFetch({
        code: 'Ok',
        routes: [
          {
            distance: 1,
            duration: 1,
            geometry: { type: 'LineString', coordinates: [] },
          },
        ],
      }),
    )
    await expect(
      badGeometry.route(REQUEST, new AbortController().signal),
    ).rejects.toBeInstanceOf(DirectionsUnavailableError)
  })

  it('propagates the routing timeout so the server can return 504', async () => {
    const provider = createOsrmDirectionsProvider(
      'https://routing.test',
      () => {
        throw new DOMException('The operation timed out.', 'TimeoutError')
      },
    )

    await expect(
      provider.route(REQUEST, new AbortController().signal),
    ).rejects.toMatchObject({ name: 'TimeoutError' })
  })
})
