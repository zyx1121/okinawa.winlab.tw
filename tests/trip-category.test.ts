import { describe, expect, it } from "vitest"

import { getAttractionMarkerKind } from "../lib/trip/category"

describe("getAttractionMarkerKind", () => {
  it("maps itinerary categories to marker icon kinds", () => {
    expect(getAttractionMarkerKind("機場")).toBe("airport")
    expect(getAttractionMarkerKind("航班")).toBe("flight")
    expect(getAttractionMarkerKind("海上活動")).toBe("marine")
    expect(getAttractionMarkerKind("文化")).toBe("culture")
    expect(getAttractionMarkerKind("美食")).toBe("food")
    expect(getAttractionMarkerKind("居酒屋")).toBe("drink")
    expect(getAttractionMarkerKind("點心")).toBe("dessert")
    expect(getAttractionMarkerKind("行程")).toBe("activity")
    expect(getAttractionMarkerKind("景點")).toBe("place")
  })
})
