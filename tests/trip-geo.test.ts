import { describe, expect, it } from "vitest"

import { createGreatCircleRouteCoordinates } from "../lib/trip/geo"

describe("createGreatCircleRouteCoordinates", () => {
  it("keeps the original route endpoints", () => {
    const coordinates = createGreatCircleRouteCoordinates(
      { lat: 25.0777, lng: 121.2328 },
      { lat: 26.1958, lng: 127.6459 },
      8,
    )

    expect(coordinates[0]).toEqual([121.2328, 25.0777])
    expect(coordinates.at(-1)).toEqual([127.6459, 26.1958])
  })

  it("interpolates along a great-circle path", () => {
    const coordinates = createGreatCircleRouteCoordinates(
      { lat: 0, lng: 0 },
      { lat: 60, lng: 90 },
      2,
    )

    expect(coordinates[1][0]).toBeCloseTo(26.565, 3)
    expect(coordinates[1][1]).toBeCloseTo(37.761, 3)
  })
})
