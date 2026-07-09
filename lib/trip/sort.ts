import type { Attraction } from "./types"

function getSortKey(attraction: Attraction) {
  if (typeof attraction.sortOrder === "number") {
    return attraction.sortOrder
  }

  if (attraction.sortAt) {
    return new Date(attraction.sortAt).getTime()
  }

  return Number.MAX_SAFE_INTEGER
}

export function sortAttractionsByTime(attractions: Attraction[]) {
  return [...attractions].sort((left, right) => {
    const order = getSortKey(left) - getSortKey(right)

    if (order !== 0) {
      return order
    }

    return left.name.localeCompare(right.name, "zh-Hant")
  })
}
