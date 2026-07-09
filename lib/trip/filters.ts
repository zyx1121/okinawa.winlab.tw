import type { Attraction, AttractionFilters } from "./types"

function matchesSearch(attraction: Attraction, search: string) {
  if (!search.trim()) {
    return true
  }

  const haystack = [
    attraction.name,
    attraction.category,
    attraction.area,
    attraction.visitWindow,
    attraction.notes,
    ...attraction.tags,
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(search.trim().toLowerCase())
}

export function applyAttractionFilters(
  attractions: Attraction[],
  filters: AttractionFilters,
) {
  return attractions.filter((attraction) => {
    if (!matchesSearch(attraction, filters.search)) {
      return false
    }

    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(attraction.category)
    ) {
      return false
    }

    if (filters.areas.length > 0 && !filters.areas.includes(attraction.area)) {
      return false
    }

    if (
      filters.priorities.length > 0 &&
      !filters.priorities.includes(attraction.priority)
    ) {
      return false
    }

    return true
  })
}

export function createDefaultFilters(): AttractionFilters {
  return {
    search: "",
    categories: [],
    areas: [],
    priorities: [],
  }
}
