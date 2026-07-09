import { describe, expect, it } from "vitest"

import { listTripAttractions } from "../lib/trip/data"

describe("listTripAttractions", () => {
  it("loads the checked-in trip data in itinerary order", () => {
    expect(listTripAttractions().map((item) => item.id)).toEqual([
      "tpe-airport",
      "flight-outbound",
      "oka-airport",
      "kerama-snorkeling",
      "churaumi-aquarium",
      "churaumi-inoh-ocean-blue",
      "bise-fukugi",
      "kouri-island",
      "blue-cave-maeda",
      "cape-manzamo",
      "american-village",
      "gurume-sushi-mihama",
      "blue-seal-depot-island",
      "shurijo-castle",
      "shuri-soba",
      "kokusai-dori",
      "makishi-market",
      "potama-makishi",
      "kokusai-yatai-mura",
      "yunangi",
      "dachibin-kumoji",
      "warayui-live-izakaya",
      "jacks-steak-house",
      "sefa-utaki",
      "okinawa-world-gyokusendo",
      "himeyuri-peace-museum",
      "churasun6",
      "king-tacos-kin",
      "flight-return",
    ])
  })
})
