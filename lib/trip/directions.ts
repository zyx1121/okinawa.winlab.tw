import { chunkRouteStops, type RouteStop } from "./routes"

export type LineStringGeometry = {
  type: "LineString"
  coordinates: [number, number][]
}

export type DrivingRoute = {
  geometry: LineStringGeometry
  distanceMeters: number
  durationSeconds: number
}

type RequestDrivingRouteOptions = {
  accessToken: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

type MapboxRoute = {
  geometry?: unknown
  distance?: unknown
  duration?: unknown
}

function buildDirectionsUrl(stops: RouteStop[], accessToken: string) {
  const coordinates = stops
    .map(({ coordinates: { lat, lng } }) => `${lng},${lat}`)
    .join(";")
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`
  )
  url.searchParams.set("geometries", "geojson")
  url.searchParams.set("overview", "full")
  url.searchParams.set("steps", "false")
  url.searchParams.set("access_token", accessToken)

  return url.toString()
}

function normalizeMetric(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Mapbox route has an invalid ${label}`)
  }

  return value
}

function normalizeGeometry(value: unknown): LineStringGeometry {
  if (!value || typeof value !== "object") {
    throw new Error("Mapbox route has malformed LineString coordinates")
  }

  const geometry = value as { type?: unknown; coordinates?: unknown }
  if (
    geometry.type !== "LineString" ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2
  ) {
    throw new Error("Mapbox route has malformed LineString coordinates")
  }

  const coordinates = geometry.coordinates.map((position) => {
    if (
      !Array.isArray(position) ||
      position.length < 2 ||
      typeof position[0] !== "number" ||
      typeof position[1] !== "number" ||
      !Number.isFinite(position[0]) ||
      !Number.isFinite(position[1])
    ) {
      throw new Error("Mapbox route has malformed LineString coordinates")
    }

    return [position[0], position[1]] as [number, number]
  })

  return { type: "LineString", coordinates }
}

async function requestRouteChunk(
  stops: RouteStop[],
  options: Required<
    Pick<RequestDrivingRouteOptions, "accessToken" | "fetchImpl">
  > &
    Pick<RequestDrivingRouteOptions, "signal">
): Promise<DrivingRoute> {
  const response = await options.fetchImpl(
    buildDirectionsUrl(stops, options.accessToken),
    { signal: options.signal }
  )

  if (!response.ok) {
    throw new Error(
      `Mapbox Directions request failed with HTTP ${response.status}`
    )
  }

  const payload = (await response.json()) as {
    code?: unknown
    routes?: unknown
  }

  if (payload.code !== "Ok") {
    throw new Error(`Mapbox Directions returned code ${String(payload.code)}`)
  }

  if (!Array.isArray(payload.routes) || payload.routes.length === 0) {
    throw new Error("Mapbox Directions returned no routes")
  }

  const route = payload.routes[0] as MapboxRoute
  return {
    geometry: normalizeGeometry(route.geometry),
    distanceMeters: normalizeMetric(route.distance, "distance"),
    durationSeconds: normalizeMetric(route.duration, "duration"),
  }
}

export async function requestDrivingRoute(
  stops: RouteStop[],
  options: RequestDrivingRouteOptions
): Promise<DrivingRoute> {
  if (stops.length < 2) {
    throw new RangeError("A driving route requires at least two stops")
  }

  if (!options.accessToken) {
    throw new Error("A Mapbox access token is required")
  }

  const fetchImpl = options.fetchImpl ?? fetch
  const chunks = chunkRouteStops(stops)
  const routes: DrivingRoute[] = []

  for (const chunk of chunks) {
    routes.push(
      await requestRouteChunk(chunk, {
        accessToken: options.accessToken,
        signal: options.signal,
        fetchImpl,
      })
    )
  }

  return routes.reduce<DrivingRoute>(
    (aggregate, route, index) => {
      aggregate.distanceMeters += route.distanceMeters
      aggregate.durationSeconds += route.durationSeconds
      aggregate.geometry.coordinates.push(
        ...(index === 0
          ? route.geometry.coordinates
          : route.geometry.coordinates.slice(1))
      )
      return aggregate
    },
    {
      geometry: { type: "LineString", coordinates: [] },
      distanceMeters: 0,
      durationSeconds: 0,
    }
  )
}
