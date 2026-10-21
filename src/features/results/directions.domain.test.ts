import { describe, expect, it } from 'vitest'

import { isRoutingTimeout, parseDirectionsQuery } from './directions.domain'
import { directionsResponseSchema } from './directions.schema'

describe('parseDirectionsQuery', () => {
  it('accepts a complete device origin', () => {
    expect(
      parseDirectionsQuery(
        new URLSearchParams({
          pharmacy_id: 'generika-lcc-cbd2',
          origin_latitude: '13.6215',
          origin_longitude: '123.1945',
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        pharmacyId: 'generika-lcc-cbd2',
        origin: { latitude: 13.6215, longitude: 123.1945 },
      },
    })
  })

  it('requires a device origin instead of a fallback', () => {
    expect(
      parseDirectionsQuery(
        new URLSearchParams({ pharmacy_id: 'generika-lcc-cbd2' }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_ORIGIN' })
    expect(
      parseDirectionsQuery(
        new URLSearchParams({
          pharmacy_id: 'generika-lcc-cbd2',
          origin_latitude: '13.6215',
        }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_ORIGIN' })
  })

  it('rejects an out-of-range origin and a malformed pharmacy ID', () => {
    expect(
      parseDirectionsQuery(
        new URLSearchParams({
          pharmacy_id: 'generika-lcc-cbd2',
          origin_latitude: '91',
          origin_longitude: '123.1945',
        }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_ORIGIN' })
    expect(
      parseDirectionsQuery(
        new URLSearchParams({
          pharmacy_id: 'Not A Pharmacy',
          origin_latitude: '13.6215',
          origin_longitude: '123.1945',
        }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_REQUEST' })
  })
})

describe('directionsResponseSchema', () => {
  it('accepts a GeoJSON route with distance and duration', () => {
    expect(
      directionsResponseSchema.parse({
        pharmacy_id: 'generika-lcc-cbd2',
        origin: { latitude: 13.6215, longitude: 123.1945 },
        route: {
          type: 'LineString',
          coordinates: [
            [123.1945, 13.6215],
            [123.189712, 13.619626],
          ],
        },
        distance_m: 1234,
        duration_s: 456,
        provider: 'osrm',
        generated_at: '2026-10-21T10:00:00Z',
      }),
    ).toMatchObject({ distance_m: 1234, duration_s: 456 })
  })

  it('rejects a route with fewer than two points or the wrong type', () => {
    const base = {
      pharmacy_id: 'generika-lcc-cbd2',
      origin: { latitude: 13.6215, longitude: 123.1945 },
      distance_m: 1234,
      duration_s: 456,
      provider: 'osrm',
      generated_at: '2026-10-21T10:00:00Z',
    }
    expect(
      directionsResponseSchema.safeParse({
        ...base,
        route: { type: 'LineString', coordinates: [[123.1945, 13.6215]] },
      }).success,
    ).toBe(false)
    expect(
      directionsResponseSchema.safeParse({
        ...base,
        route: {
          type: 'Point',
          coordinates: [[123.1945, 13.6215]],
        },
      }).success,
    ).toBe(false)
  })
})

describe('isRoutingTimeout', () => {
  it('recognizes timeout and abort DOM exceptions only', () => {
    expect(isRoutingTimeout(new DOMException('timeout', 'TimeoutError'))).toBe(
      true,
    )
    expect(isRoutingTimeout(new DOMException('aborted', 'AbortError'))).toBe(
      true,
    )
    expect(isRoutingTimeout(new Error('network'))).toBe(false)
  })
})
