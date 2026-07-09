import type { Attraction } from "./types"

const UNGROUPED_SECTION = "其他"

export type AttractionSection = {
  title: string
  attractions: Attraction[]
}

export function groupAttractionsByPlan(attractions: Attraction[]) {
  const sections: AttractionSection[] = []
  const sectionIndexes = new Map<string, number>()

  for (const attraction of attractions) {
    const title = attraction.planGroup ?? UNGROUPED_SECTION
    const sectionIndex = sectionIndexes.get(title)

    if (sectionIndex === undefined) {
      sectionIndexes.set(title, sections.length)
      sections.push({ title, attractions: [attraction] })
      continue
    }

    sections[sectionIndex].attractions.push(attraction)
  }

  return sections
}
