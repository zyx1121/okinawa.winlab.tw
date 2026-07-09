import { describe, expect, it } from "vitest"

import { createAttractionMarkerPlacements } from "../lib/trip/markers"
import type { Attraction } from "../lib/trip/types"

function createAttraction(id: string, lat: number, lng: number): Attraction {
  return {
    id,
    name: id,
    category: "景點",
    area: "area",
    coordinates: { lat, lng },
    visitWindow: "time",
    priority: "nice-to-have",
    tags: [],
    notes: "notes",
  }
}

describe("createAttractionMarkerPlacements", () => {
  it("fans out nearby marker positions", () => {
    const placements = createAttractionMarkerPlacements([
      createAttraction("a", 26.2159, 127.6887),
      createAttraction("b", 26.216, 127.6883),
    ])

    expect(placements.map((placement) => placement.offset)).not.toEqual([
      [0, 0],
      [0, 0],
    ])
  })

  it("creates two selectable placements for a route", () => {
    const placements = createAttractionMarkerPlacements([
      {
        ...createAttraction("flight", 25.0777, 121.2328),
        category: "航班",
        route: {
          from: { lat: 25.0777, lng: 121.2328 },
          to: { lat: 26.1958, lng: 127.6459 },
        },
      },
    ])

    expect(placements.map((placement) => placement.key)).toEqual([
      "flight:from",
      "flight:to",
    ])
    expect(placements.every((placement) => placement.attractionId === "flight")).toBe(true)
  })
})
