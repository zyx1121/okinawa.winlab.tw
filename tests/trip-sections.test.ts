import { describe, expect, it } from "vitest"

import { listTripAttractions } from "../lib/trip/data"
import { groupAttractionsByPlan } from "../lib/trip/sections"

describe("groupAttractionsByPlan", () => {
  it("groups checked-in attractions by itinerary section order", () => {
    expect(groupAttractionsByPlan(listTripAttractions()).map((section) => section.title)).toEqual([
      "9/6 抵達日",
      "9/7 海線",
      "9/8 北部線",
      "9/9 恩納 / 北谷",
      "9/10 那霸 / 南部",
      "可調整夜間",
      "可調整中部",
      "9/11 回程日",
    ])
  })
})
