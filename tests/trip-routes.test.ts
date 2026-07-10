import { describe, expect, it } from "vitest"

import {
  buildGoogleMapsNavigationUrl,
  buildGoogleMapsRouteSegments,
  chunkRouteStops,
  createDailyRouteStops,
  type RouteStop,
} from "../lib/trip/routes"
import type { Attraction } from "../lib/trip/types"

function createAttraction(
  id: string,
  lat: number,
  lng: number,
  overrides: Partial<Attraction> = {}
): Attraction {
  return {
    id,
    name: id,
    category: "景點",
    area: "Naha",
    coordinates: { lat, lng },
    visitWindow: "Morning",
    priority: "must-see",
    tags: [],
    notes: "",
    ...overrides,
  }
}

function createStops(count: number): RouteStop[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `stop-${index + 1}`,
    name: `Stop ${index + 1}`,
    coordinates: { lat: 26 + index / 100, lng: 127 + index / 100 },
  }))
}

function getCoordinateIds(chunks: RouteStop[][]) {
  return chunks.map((chunk) => chunk.map((stop) => stop.id))
}

describe("createDailyRouteStops", () => {
  it("keeps itinerary order while excluding routes, flights, and airports", () => {
    const attractions = [
      createAttraction("first", 26.1, 127.1),
      createAttraction("flight", 26.2, 127.2, { category: "航班" }),
      createAttraction("airport", 26.3, 127.3, { category: "機場" }),
      createAttraction("route", 26.4, 127.4, {
        route: {
          from: { lat: 26.4, lng: 127.4 },
          to: { lat: 26.5, lng: 127.5 },
        },
      }),
      createAttraction("last", 26.6, 127.6),
    ]

    expect(createDailyRouteStops(attractions).map((stop) => stop.id)).toEqual([
      "first",
      "last",
    ])
  })

  it("merges only adjacent stops with exactly matching coordinates", () => {
    const attractions = [
      createAttraction("first", 26.1, 127.1),
      createAttraction("adjacent-duplicate", 26.1, 127.1),
      createAttraction("middle", 26.2, 127.2),
      createAttraction("revisit", 26.1, 127.1),
    ]

    expect(createDailyRouteStops(attractions).map((stop) => stop.id)).toEqual([
      "first",
      "middle",
      "revisit",
    ])
  })
})

describe("chunkRouteStops", () => {
  it("handles zero and one stop without inventing coordinates", () => {
    const [onlyStop] = createStops(1)
    expect(chunkRouteStops([])).toEqual([])
    expect(chunkRouteStops([onlyStop])).toEqual([[onlyStop]])
  })

  it("overlaps adjacent endpoints without dropping order", () => {
    expect(getCoordinateIds(chunkRouteStops(createStops(7), 4))).toEqual([
      ["stop-1", "stop-2", "stop-3", "stop-4"],
      ["stop-4", "stop-5", "stop-6", "stop-7"],
    ])
  })

  it("rejects coordinate limits that cannot make a route", () => {
    expect(() => chunkRouteStops(createStops(2), 1)).toThrow(RangeError)
  })
})

describe("Google Maps route URLs", () => {
  it("splits 13 stops into 1-5, 5-9, and 9-13 with ordered waypoints", () => {
    const urls = buildGoogleMapsRouteSegments(createStops(13)).map(
      (value) => new URL(value)
    )

    expect(urls).toHaveLength(3)
    expect(
      urls.map((url) => [
        url.searchParams.get("origin"),
        url.searchParams.get("waypoints")?.split("|"),
        url.searchParams.get("destination"),
      ])
    ).toEqual([
      [
        "26,127",
        ["26.01,127.01", "26.02,127.02", "26.03,127.03"],
        "26.04,127.04",
      ],
      [
        "26.04,127.04",
        ["26.05,127.05", "26.06,127.06", "26.07,127.07"],
        "26.08,127.08",
      ],
      [
        "26.08,127.08",
        ["26.09,127.09", "26.1,127.1", "26.11,127.11"],
        "26.12,127.12",
      ],
    ])
    for (const url of urls) {
      expect(url.searchParams.get("api")).toBe("1")
      expect(url.searchParams.get("travelmode")).toBe("driving")
    }
  })

  it("builds active-stop navigation without an origin", () => {
    const url = new URL(buildGoogleMapsNavigationUrl(createStops(1)[0]))
    expect(url.searchParams.get("origin")).toBeNull()
    expect(url.searchParams.get("destination")).toBe("26,127")
    expect(url.searchParams.get("travelmode")).toBe("driving")
    expect(url.searchParams.get("dir_action")).toBe("navigate")
  })
})
