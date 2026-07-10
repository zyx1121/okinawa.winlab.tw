import type { Attraction, AttractionCoordinates } from "./types"

export type RouteStop = {
  id: string
  name: string
  coordinates: AttractionCoordinates
}

const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/"
const GOOGLE_MAPS_MAX_COORDINATES = 5

function haveSameCoordinates(
  first: AttractionCoordinates,
  second: AttractionCoordinates
) {
  return first.lat === second.lat && first.lng === second.lng
}

function formatCoordinates({ lat, lng }: AttractionCoordinates) {
  return `${lat},${lng}`
}

export function createDailyRouteStops(attractions: Attraction[]): RouteStop[] {
  return attractions.reduce<RouteStop[]>((stops, attraction) => {
    if (
      attraction.route ||
      attraction.category === "航班" ||
      attraction.category === "機場"
    ) {
      return stops
    }

    const previousStop = stops.at(-1)
    if (
      previousStop &&
      haveSameCoordinates(previousStop.coordinates, attraction.coordinates)
    ) {
      return stops
    }

    stops.push({
      id: attraction.id,
      name: attraction.name,
      coordinates: attraction.coordinates,
    })

    return stops
  }, [])
}

export function chunkRouteStops(
  stops: RouteStop[],
  maxCoordinates = 25
): RouteStop[][] {
  if (!Number.isInteger(maxCoordinates) || maxCoordinates < 2) {
    throw new RangeError("maxCoordinates must be an integer of at least 2")
  }

  if (stops.length <= maxCoordinates) {
    return stops.length === 0 ? [] : [stops.slice()]
  }

  const chunks: RouteStop[][] = []
  let startIndex = 0

  while (startIndex < stops.length - 1) {
    const chunk = stops.slice(startIndex, startIndex + maxCoordinates)
    chunks.push(chunk)
    startIndex += chunk.length - 1
  }

  return chunks
}

function buildRouteUrl(stops: RouteStop[]) {
  const url = new URL(GOOGLE_MAPS_DIRECTIONS_URL)
  const origin = stops[0]
  const destination = stops.at(-1)

  if (!origin || !destination) {
    throw new RangeError("A Google Maps route requires at least two stops")
  }

  url.searchParams.set("api", "1")
  url.searchParams.set("travelmode", "driving")
  url.searchParams.set("origin", formatCoordinates(origin.coordinates))
  url.searchParams.set(
    "destination",
    formatCoordinates(destination.coordinates)
  )

  const waypoints = stops.slice(1, -1)
  if (waypoints.length > 0) {
    url.searchParams.set(
      "waypoints",
      waypoints.map((stop) => formatCoordinates(stop.coordinates)).join("|")
    )
  }

  return url.toString()
}

export function buildGoogleMapsRouteSegments(stops: RouteStop[]): string[] {
  if (stops.length < 2) {
    return []
  }

  return chunkRouteStops(stops, GOOGLE_MAPS_MAX_COORDINATES).map(buildRouteUrl)
}

export function buildGoogleMapsNavigationUrl(
  destination: Pick<Attraction, "coordinates"> | RouteStop
) {
  const url = new URL(GOOGLE_MAPS_DIRECTIONS_URL)
  url.searchParams.set("api", "1")
  url.searchParams.set("travelmode", "driving")
  url.searchParams.set(
    "destination",
    formatCoordinates(destination.coordinates)
  )
  url.searchParams.set("dir_action", "navigate")

  return url.toString()
}
