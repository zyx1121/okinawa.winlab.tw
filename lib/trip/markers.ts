import { getAttractionMarkerKind, type AttractionMarkerKind } from "./category"
import type { Attraction, AttractionCoordinates } from "./types"

const DENSITY_GRID_PRECISION = 100
const MARKER_OFFSET_RADIUS = 18

export type AttractionMarkerPlacement = {
  key: string
  attractionId: string
  coordinates: AttractionCoordinates
  markerKind: AttractionMarkerKind
  offset: [number, number]
}

function getDensityKey({ lat, lng }: AttractionCoordinates) {
  return `${Math.round(lat * DENSITY_GRID_PRECISION)}:${Math.round(lng * DENSITY_GRID_PRECISION)}`
}

function createOffset(index: number, total: number): [number, number] {
  if (total <= 1) {
    return [0, 0]
  }

  const angle = (index / total) * Math.PI * 2 - Math.PI / 2

  return [
    Math.round(Math.cos(angle) * MARKER_OFFSET_RADIUS),
    Math.round(Math.sin(angle) * MARKER_OFFSET_RADIUS),
  ]
}

export function createAttractionMarkerPlacements(attractions: Attraction[]) {
  const placements: AttractionMarkerPlacement[] = attractions.flatMap((attraction) => {
    const markerKind = getAttractionMarkerKind(attraction.category)

    if (attraction.route) {
      return [
        {
          key: `${attraction.id}:from`,
          attractionId: attraction.id,
          coordinates: attraction.route.from,
          markerKind,
          offset: [0, 0] satisfies [number, number],
        },
        {
          key: `${attraction.id}:to`,
          attractionId: attraction.id,
          coordinates: attraction.route.to,
          markerKind,
          offset: [0, 0] satisfies [number, number],
        },
      ]
    }

    return [
      {
        key: attraction.id,
        attractionId: attraction.id,
        coordinates: attraction.coordinates,
        markerKind,
        offset: [0, 0] satisfies [number, number],
      },
    ]
  })

  const placementGroups = new Map<string, AttractionMarkerPlacement[]>()

  for (const placement of placements) {
    const key = getDensityKey(placement.coordinates)
    const group = placementGroups.get(key)

    if (group) {
      group.push(placement)
      continue
    }

    placementGroups.set(key, [placement])
  }

  for (const group of placementGroups.values()) {
    group.forEach((placement, index) => {
      placement.offset = createOffset(index, group.length)
    })
  }

  return placements
}
