export type AttractionPriority = "must-see" | "nice-to-have" | "optional"

export type AttractionCoordinates = {
  lat: number
  lng: number
}

export type AttractionRoute = {
  from: AttractionCoordinates
  to: AttractionCoordinates
}

export type Attraction = {
  id: string
  name: string
  category: string
  area: string
  coordinates: AttractionCoordinates
  visitWindow: string
  priority: AttractionPriority
  tags: string[]
  notes: string
  planGroup?: string
  timeBlock?: string
  sortAt?: string | null
  sortOrder?: number
  route?: AttractionRoute
  address?: string
  recommendedDuration?: string
  links?: Array<{
    label: string
    href: string
  }>
}

export type AttractionFilters = {
  search: string
  categories: string[]
  areas: string[]
  priorities: AttractionPriority[]
}
