import { describe, expect, it } from "vitest"

import { applyAttractionFilters } from "../lib/trip/filters"
import type { Attraction } from "../lib/trip/types"

const attractions: Attraction[] = [
  {
    id: "churaumi",
    name: "Churaumi Aquarium",
    category: "Aquarium",
    area: "Motobu",
    coordinates: { lat: 26.6943, lng: 127.8775 },
    visitWindow: "Morning",
    priority: "must-see",
    tags: ["family", "ocean"],
    notes: "Best visited before the afternoon crowds.",
  },
  {
    id: "kokusai",
    name: "Kokusai Dori",
    category: "Shopping",
    area: "Naha",
    coordinates: { lat: 26.2148, lng: 127.6809 },
    visitWindow: "Evening",
    priority: "nice-to-have",
    tags: ["food", "souvenir"],
    notes: "Night market atmosphere with many restaurants.",
  },
  {
    id: "cape-manzamo",
    name: "Cape Manzamo",
    category: "Scenic",
    area: "Onna",
    coordinates: { lat: 26.5014, lng: 127.8447 },
    visitWindow: "Sunset",
    priority: "must-see",
    tags: ["viewpoint", "coast"],
    notes: "Great sunset lookout with coastal cliffs.",
  },
]

describe("applyAttractionFilters", () => {
  it("returns every attraction when filters are empty", () => {
    expect(
      applyAttractionFilters(attractions, {
        search: "",
        categories: [],
        areas: [],
        priorities: [],
      }),
    ).toHaveLength(3)
  })

  it("filters by search text across attraction metadata", () => {
    expect(
      applyAttractionFilters(attractions, {
        search: "sunset",
        categories: [],
        areas: [],
        priorities: [],
      }).map((item) => item.id),
    ).toEqual(["cape-manzamo"])
  })

  it("combines category, area, and priority filters", () => {
    expect(
      applyAttractionFilters(attractions, {
        search: "",
        categories: ["Scenic", "Aquarium"],
        areas: ["Motobu"],
        priorities: ["must-see"],
      }).map((item) => item.id),
    ).toEqual(["churaumi"])
  })
})
