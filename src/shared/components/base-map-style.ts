import type {
  LayerSpecification,
  Map as MapLibreMap,
  StyleSpecification,
} from 'maplibre-gl'

// OpenFreeMap's Positron basemap, recoloured below.
const BASE_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

// A cool grey palette, so the warm cream sheets and cards read as surfaces
// sitting on the map rather than part of it.
const PALETTE = {
  land: '#e2e6eb',
  residential: '#dce1e7',
  building: '#d3d9e0',
  buildingOutline: '#c8cfd8',
  park: '#d3dfd8',
  wood: '#cfdcd4',
  water: '#b3c4d3',
  waterway: '#a7bacb',
  road: '#ffffff',
  roadMinor: '#f7f9fb',
  path: '#eef1f5',
  casing: '#c3cad3',
  subtle: 'rgba(195, 202, 211, 0.6)',
  rail: '#c3cad3',
  boundary: '#aab2bc',
  roadText: '#5b6470',
  waterText: '#4d6580',
  placeText: '#2f363e',
  halo: '#edf0f4',
} as const

function sourceLayer(layer: LayerSpecification): string {
  return 'source-layer' in layer ? (layer['source-layer'] ?? '') : ''
}

function fillColor(layer: LayerSpecification): string | undefined {
  switch (sourceLayer(layer)) {
    case 'park':
      return PALETTE.park
    case 'water':
      return PALETTE.water
    case 'landcover':
      return layer.id.includes('wood') ? PALETTE.wood : undefined
    case 'landuse':
      return PALETTE.residential
    case 'building':
      return PALETTE.building
    case 'aeroway':
      return PALETTE.path
    case 'transportation':
      return PALETTE.land
    default:
      return undefined
  }
}

function lineColor(layer: LayerSpecification): string | undefined {
  const id = layer.id
  switch (sourceLayer(layer)) {
    case 'waterway':
      return PALETTE.waterway
    case 'boundary':
      return PALETTE.boundary
    case 'aeroway':
      return id.includes('casing') || id.includes('taxiway')
        ? PALETTE.casing
        : PALETTE.road
    case 'transportation':
      if (id.includes('dashline')) {
        return PALETTE.path
      }
      if (id.includes('casing') || id.includes('railway')) {
        return id.includes('railway') ? PALETTE.rail : PALETTE.casing
      }
      if (id.includes('subtle')) {
        return PALETTE.subtle
      }
      if (id.includes('pier')) {
        return PALETTE.land
      }
      if (id.includes('path')) {
        return PALETTE.path
      }
      return id.includes('minor') ? PALETTE.roadMinor : PALETTE.road
    default:
      return undefined
  }
}

function textColor(layer: LayerSpecification): string | undefined {
  switch (sourceLayer(layer)) {
    case 'transportation_name':
      return PALETTE.roadText
    case 'water_name':
    case 'waterway':
      return PALETTE.waterText
    case 'place':
    case 'aerodrome_label':
      return PALETTE.placeText
    default:
      return undefined
  }
}

// Layers are matched by type and source layer, not exact id, so a renamed
// layer upstream keeps its stock colour instead of breaking the map.
function recolour(layer: LayerSpecification): LayerSpecification {
  switch (layer.type) {
    case 'background':
      return {
        ...layer,
        paint: { ...layer.paint, 'background-color': PALETTE.land },
      }
    case 'fill': {
      const color = fillColor(layer)
      if (color === undefined) {
        return layer
      }
      return {
        ...layer,
        paint: {
          ...layer.paint,
          'fill-color': color,
          ...(sourceLayer(layer) === 'building'
            ? { 'fill-outline-color': PALETTE.buildingOutline }
            : {}),
        },
      }
    }
    case 'line': {
      const color = lineColor(layer)
      return color === undefined
        ? layer
        : { ...layer, paint: { ...layer.paint, 'line-color': color } }
    }
    case 'symbol': {
      if (layer.paint?.['text-color'] === undefined) {
        return layer
      }
      const color = textColor(layer)
      return {
        ...layer,
        paint: {
          ...layer.paint,
          ...(color === undefined ? {} : { 'text-color': color }),
          'text-halo-color': PALETTE.halo,
        },
      }
    }
    default:
      return layer
  }
}

/** Return the basemap style with the app's cool grey palette applied. */
export function tuneBaseMapStyle(
  style: StyleSpecification,
): StyleSpecification {
  return { ...style, layers: style.layers.map(recolour) }
}

/**
 * Load the recoloured basemap into a map created without a style. The palette
 * applies before the first frame, so the stock colours never flash.
 */
export function loadBaseMapStyle(map: MapLibreMap): void {
  map.setStyle(BASE_MAP_STYLE_URL, {
    transformStyle: (_previous, next) => tuneBaseMapStyle(next),
  })
}
