import type { Attraction } from "./types"

export type AttractionMarkerKind =
  | "airport"
  | "flight"
  | "marine"
  | "culture"
  | "food"
  | "drink"
  | "dessert"
  | "activity"
  | "place"

export function getAttractionMarkerKind(
  category: Attraction["category"],
): AttractionMarkerKind {
  switch (category) {
    case "機場":
      return "airport"
    case "航班":
      return "flight"
    case "海上活動":
      return "marine"
    case "文化":
      return "culture"
    case "美食":
      return "food"
    case "居酒屋":
      return "drink"
    case "點心":
      return "dessert"
    case "行程":
      return "activity"
    default:
      return "place"
  }
}
