import type { AttractionCoordinates } from "./types"

const DEFAULT_ROUTE_SEGMENTS = 64
const DEGREES_TO_RADIANS = Math.PI / 180
const RADIANS_TO_DEGREES = 180 / Math.PI

type Vector3 = {
  x: number
  y: number
  z: number
}

function toRadians(value: number) {
  return value * DEGREES_TO_RADIANS
}

function toDegrees(value: number) {
  return value * RADIANS_TO_DEGREES
}

function toVector({ lat, lng }: AttractionCoordinates): Vector3 {
  const latRadians = toRadians(lat)
  const lngRadians = toRadians(lng)
  const cosLat = Math.cos(latRadians)

  return {
    x: cosLat * Math.cos(lngRadians),
    y: cosLat * Math.sin(lngRadians),
    z: Math.sin(latRadians),
  }
}

function toCoordinates({ x, y, z }: Vector3): [number, number] {
  const hypotenuse = Math.hypot(x, y)

  return [toDegrees(Math.atan2(y, x)), toDegrees(Math.atan2(z, hypotenuse))]
}

function interpolateGreatCircle(
  from: AttractionCoordinates,
  to: AttractionCoordinates,
  fraction: number,
) {
  const start = toVector(from)
  const end = toVector(to)
  const dot = Math.max(-1, Math.min(1, start.x * end.x + start.y * end.y + start.z * end.z))
  const angle = Math.acos(dot)
  const sinAngle = Math.sin(angle)

  if (sinAngle < 1e-6) {
    return [
      from.lng + (to.lng - from.lng) * fraction,
      from.lat + (to.lat - from.lat) * fraction,
    ] satisfies [number, number]
  }

  const startWeight = Math.sin((1 - fraction) * angle) / sinAngle
  const endWeight = Math.sin(fraction * angle) / sinAngle

  return toCoordinates({
    x: start.x * startWeight + end.x * endWeight,
    y: start.y * startWeight + end.y * endWeight,
    z: start.z * startWeight + end.z * endWeight,
  })
}

export function createGreatCircleRouteCoordinates(
  from: AttractionCoordinates,
  to: AttractionCoordinates,
  segments = DEFAULT_ROUTE_SEGMENTS,
) {
  const steps = Math.max(1, Math.floor(segments))
  const coordinates = Array.from({ length: steps + 1 }, (_, index) =>
    interpolateGreatCircle(from, to, index / steps),
  )

  coordinates[0] = [from.lng, from.lat]
  coordinates[coordinates.length - 1] = [to.lng, to.lat]

  return coordinates
}
