import type { AddLayerObject, Map as MapLibreMap } from 'maplibre-gl'

import { NAGA_CITY_RING } from './naga-boundary'

/** The tilted camera's pitch in degrees. */
export const MAP_PITCH_3D = 45
/** The flat camera's pitch in degrees. */
export const MAP_PITCH_2D = 0
/** The lowest map zoom that can show building geometry. */
export const MAP_BUILDING_MIN_ZOOM = 13

const EXTRUSION_LAYER_ID = 'naga-building-extrusions'
const EXTRUSION_COLOR = '#b9c3cf'
const EXTRUSION_FADE_MS = 200
const FALLBACK_BUILDING_HEIGHT_M = 30
const CAMERA_ANIMATION_MS = 400
const BOUNDARY_EPSILON = 1e-7

type ScreenPoint = {
  x: number
  y: number
}

/** What the building gate needs to know about the current view. */
export type BuildingGateOptions = {
  /** True while the camera is in its 3D mode. */
  is3d: boolean
  /** Pixels the floating top bar covers at the top of the map. */
  coveredTop: number
  /** Share of the map height the bottom sheet covers. */
  coveredBottomRatio: number
  /** True when the user asks for reduced motion. */
  reducedMotion: boolean
}

/**
 * Add extruded buildings above the flat building fill and below every label.
 * The zoom-13 tiles carry footprints without heights, so those use a modest
 * fallback; zoom 14 and later use the tileset's real heights.
 * Call after the map style has loaded; safe to call more than once.
 */
export function addBuildingExtrusions(map: MapLibreMap): void {
  if (map.getLayer(EXTRUSION_LAYER_ID) !== undefined) {
    return
  }

  const layer: AddLayerObject = {
    id: EXTRUSION_LAYER_ID,
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'building',
    minzoom: MAP_BUILDING_MIN_ZOOM,
    paint: {
      'fill-extrusion-color': EXTRUSION_COLOR,
      'fill-extrusion-height': [
        'to-number',
        ['get', 'render_height'],
        FALLBACK_BUILDING_HEIGHT_M,
      ],
      'fill-extrusion-base': ['to-number', ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': 0,
      'fill-extrusion-opacity-transition': { duration: 0, delay: 0 },
      'fill-extrusion-vertical-gradient': false,
    },
  }

  const firstLabel = map
    .getStyle()
    .layers.find((styleLayer) => styleLayer.type === 'symbol')

  if (firstLabel === undefined) {
    map.addLayer(layer)
  } else {
    map.addLayer(layer, firstLabel.id)
  }
}

/**
 * Animate the camera to a 2D or 3D mode without changing its centre or zoom.
 * The home map calls this only on creation; the results map also toggles it.
 */
export function setMapPitchMode(
  map: MapLibreMap,
  is3d: boolean,
  reducedMotion: boolean,
): void {
  const pitch = is3d ? MAP_PITCH_3D : MAP_PITCH_2D
  if (map.getPitch() === pitch && map.getBearing() === 0) {
    return
  }
  map.easeTo({
    pitch,
    bearing: 0,
    duration: reducedMotion ? 0 : CAMERA_ANIMATION_MS,
  })
}

/**
 * Show the extrusions only while 3D is on and the centre of the visible,
 * uncovered map area is inside Naga City. The layer fades rather than popping
 * at the edge; the camera itself is never confined.
 */
export function applyBuildingGate(
  map: MapLibreMap,
  options: BuildingGateOptions,
): void {
  if (map.getLayer(EXTRUSION_LAYER_ID) === undefined) {
    return
  }

  const container = map.getContainer()
  const visible =
    options.is3d &&
    visibleCentreInsideNaga(map, options.coveredTop, options.coveredBottomRatio)
  const next = visible ? 'visible' : 'hidden'

  container.dataset.pitch = String(Math.round(map.getPitch()))
  container.dataset.bearing = String(Math.round(map.getBearing()))
  container.dataset.zoom = map.getZoom().toFixed(2)

  if (container.dataset.buildings === next) {
    return
  }

  map.setPaintProperty(
    EXTRUSION_LAYER_ID,
    'fill-extrusion-opacity-transition',
    {
      duration: options.reducedMotion ? 0 : EXTRUSION_FADE_MS,
      delay: 0,
    },
  )
  map.setPaintProperty(
    EXTRUSION_LAYER_ID,
    'fill-extrusion-opacity',
    visible ? 1 : 0,
  )
  container.dataset.buildings = next
}

function visibleCentreInsideNaga(
  map: MapLibreMap,
  coveredTop: number,
  coveredBottomRatio: number,
): boolean {
  const container = map.getContainer()
  const width = container.clientWidth
  const height = container.clientHeight
  const top = Math.max(0, coveredTop)
  const bottom = height - Math.round(height * coveredBottomRatio)

  if (
    width <= 0 ||
    height <= 0 ||
    bottom - top < 2 ||
    map.getZoom() < MAP_BUILDING_MIN_ZOOM
  ) {
    return false
  }

  const centre = {
    x: width / 2,
    y: (top + bottom) / 2,
  }
  const ring = NAGA_CITY_RING.map(([longitude, latitude]) =>
    map.project([longitude, latitude]),
  )

  return ring.length >= 3 && pointInRing(centre, ring)
}

function pointInRing(
  point: ScreenPoint,
  ring: readonly ScreenPoint[],
): boolean {
  let inside = false
  for (const [index, start] of ring.entries()) {
    const end = ring[(index + 1) % ring.length]
    if (end === undefined) {
      continue
    }
    if (pointOnSegment(point, start, end)) {
      return false
    }
    const crosses =
      start.y > point.y !== end.y > point.y &&
      point.x <
        ((end.x - start.x) * (point.y - start.y)) / (end.y - start.y) + start.x
    if (crosses) {
      inside = !inside
    }
  }
  return inside
}

function pointOnSegment(
  point: ScreenPoint,
  start: ScreenPoint,
  end: ScreenPoint,
): boolean {
  return (
    Math.abs(orientation(start, end, point)) <= BOUNDARY_EPSILON &&
    point.x >= Math.min(start.x, end.x) - BOUNDARY_EPSILON &&
    point.x <= Math.max(start.x, end.x) + BOUNDARY_EPSILON &&
    point.y >= Math.min(start.y, end.y) - BOUNDARY_EPSILON &&
    point.y <= Math.max(start.y, end.y) + BOUNDARY_EPSILON
  )
}

function orientation(
  start: ScreenPoint,
  end: ScreenPoint,
  point: ScreenPoint,
): number {
  return (
    (end.x - start.x) * (point.y - start.y) -
    (end.y - start.y) * (point.x - start.x)
  )
}
