import tripFile from "@/data/trip-attractions.json"

import { sortAttractionsByTime } from "./sort"
import type { Attraction } from "./types"

type TripFile = {
  attractions: Attraction[]
}

const attractions = (tripFile as TripFile).attractions

export function listTripAttractions() {
  return sortAttractionsByTime(attractions)
}
