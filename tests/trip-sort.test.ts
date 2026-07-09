import { describe, expect, it } from "vitest"

import { sortAttractionsByTime } from "../lib/trip/sort"
import type { Attraction } from "../lib/trip/types"

const attractions: Attraction[] = [
  {
    id: "flight-return",
    name: "回程航班",
    category: "航班",
    area: "沖繩 → 臺北",
    coordinates: { lat: 26.1958, lng: 127.6459 },
    visitWindow: "9月11日",
    priority: "must-see",
    tags: [],
    notes: "Return flight.",
    sortOrder: 50,
  },
  {
    id: "tpe-airport",
    name: "桃園機場",
    category: "機場",
    area: "桃園",
    coordinates: { lat: 25.0777, lng: 121.2328 },
    visitWindow: "9月6日",
    priority: "must-see",
    tags: [],
    notes: "Departure airport.",
    sortOrder: 10,
  },
  {
    id: "churasun6",
    name: "Churasun6",
    category: "行程",
    area: "那霸",
    coordinates: { lat: 26.2174, lng: 127.6821 },
    visitWindow: "日期待定",
    priority: "nice-to-have",
    tags: [],
    notes: "Show night.",
    sortOrder: 40,
  },
]

describe("sortAttractionsByTime", () => {
  it("orders attractions by sortOrder", () => {
    expect(sortAttractionsByTime(attractions).map((item) => item.id)).toEqual([
      "tpe-airport",
      "churasun6",
      "flight-return",
    ])
  })
})
