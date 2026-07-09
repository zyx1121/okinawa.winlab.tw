"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import { ExternalLink, List, MapPin, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { applyAttractionFilters } from "@/lib/trip/filters"
import { groupAttractionsByPlan } from "@/lib/trip/sections"
import { sortAttractionsByTime } from "@/lib/trip/sort"
import { cn } from "@/lib/utils"
import type { Attraction, AttractionPriority } from "@/lib/trip/types"

const TripMap = dynamic(
  () => import("./trip-map").then((module) => module.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background text-sm text-muted-foreground">
        地圖載入中…
      </div>
    ),
  },
)

type TripDashboardProps = {
  attractions: Attraction[]
}

function getAttractionCategories(attractions: Attraction[]) {
  return Array.from(new Set(attractions.map((attraction) => attraction.category))).sort(
    (left, right) => left.localeCompare(right, "zh-Hant"),
  )
}

const PRIORITY_LABELS = {
  "must-see": "必排",
  "nice-to-have": "可排",
  optional: "備選",
} satisfies Record<AttractionPriority, string>

function getStatusBadges(attraction: Attraction) {
  return [
    PRIORITY_LABELS[attraction.priority],
    attraction.tags.includes("天氣敏感") ? "天氣敏感" : null,
    attraction.tags.includes("雨天備案") ? "雨天備案" : null,
    attraction.tags.includes("需預約") ? "需預約" : null,
  ].filter((badge): badge is string => Boolean(badge))
}

function isGoogleMapLink(label: string) {
  return label === "Google 地圖"
}

export function TripDashboard({ attractions: initialAttractions }: TripDashboardProps) {
  const attractions = React.useMemo(
    () => sortAttractionsByTime(initialAttractions),
    [initialAttractions],
  )
  const categories = React.useMemo(() => getAttractionCategories(attractions), [attractions])
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
  const filteredAttractions = React.useMemo(
    () =>
      applyAttractionFilters(attractions, {
        search: "",
        categories: selectedCategories,
        areas: [],
        priorities: [],
      }),
    [attractions, selectedCategories],
  )
  const [selectedAttractionId, setSelectedAttractionId] = React.useState<string | null>(
    filteredAttractions[0]?.id ?? null,
  )
  const [mobileListOpen, setMobileListOpen] = React.useState(false)
  const activeAttractionId =
    filteredAttractions.find((attraction) => attraction.id === selectedAttractionId)?.id ??
    filteredAttractions[0]?.id ??
    null
  const activeFilterCount = selectedCategories.length

  const toggleCategory = React.useCallback((category: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((item) => item !== category)
        : [...currentCategories, category],
    )
  }, [])
  const clearCategories = React.useCallback(() => {
    setSelectedCategories([])
  }, [])
  const handleMapSelectAttraction = React.useCallback((attractionId: string) => {
    setSelectedAttractionId(attractionId)

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileListOpen(true)
    }
  }, [])

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0">
        <TripMap
          attractions={filteredAttractions}
          selectedAttractionId={activeAttractionId}
          onSelectAttraction={handleMapSelectAttraction}
        />
      </div>

      <div className="pointer-events-auto absolute top-4 right-4 z-20 md:hidden">
        <Button variant="outline" onClick={() => setMobileListOpen(true)}>
          <List className="size-4" />
          景點
        </Button>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-[390px] p-5 md:block">
        <AttractionList
          attractions={filteredAttractions}
          categories={categories}
          selectedCategories={selectedCategories}
          activeFilterCount={activeFilterCount}
          selectedAttractionId={activeAttractionId}
          onToggleCategory={toggleCategory}
          onClearCategories={clearCategories}
          onSelectAttraction={setSelectedAttractionId}
          className="h-full"
        />
      </div>

      <MobileDrawer open={mobileListOpen} onClose={() => setMobileListOpen(false)}>
        <AttractionList
          attractions={filteredAttractions}
          categories={categories}
          selectedCategories={selectedCategories}
          activeFilterCount={activeFilterCount}
          selectedAttractionId={activeAttractionId}
          onToggleCategory={toggleCategory}
          onClearCategories={clearCategories}
          onSelectAttraction={(id) => {
            setSelectedAttractionId(id)
            setMobileListOpen(false)
          }}
          onClose={() => setMobileListOpen(false)}
          mobile
        />
      </MobileDrawer>
    </div>
  )
}

function AttractionList({
  attractions,
  categories,
  selectedCategories,
  activeFilterCount,
  selectedAttractionId,
  onToggleCategory,
  onClearCategories,
  onSelectAttraction,
  onClose,
  className,
  mobile = false,
}: {
  attractions: Attraction[]
  categories: string[]
  selectedCategories: string[]
  activeFilterCount: number
  selectedAttractionId: string | null
  onToggleCategory: (category: string) => void
  onClearCategories: () => void
  onSelectAttraction: (attractionId: string) => void
  onClose?: () => void
  className?: string
  mobile?: boolean
}) {
  const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const sections = React.useMemo(() => groupAttractionsByPlan(attractions), [attractions])
  const setItemRef = React.useCallback(
    (attractionId: string, element: HTMLButtonElement | null) => {
      itemRefs.current[attractionId] = element
    },
    [],
  )

  React.useEffect(() => {
    if (!selectedAttractionId) {
      return
    }

    itemRefs.current[selectedAttractionId]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    })
  }, [selectedAttractionId])

  return (
    <Card
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden",
        mobile ? "h-full min-h-0 shadow-none" : "h-full",
        className,
      )}
    >
      <CardHeader className="shrink-0 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">WinLab Okinawa Trip Dashboard</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {attractions.length} 筆{activeFilterCount > 0 ? ` · ${activeFilterCount} 類已選` : ""}
            </p>
          </div>
          {mobile && onClose ? (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category)

            return (
              <button
                key={category}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggleCategory(category)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {category}
              </button>
            )
          })}
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={onClearCategories}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              清除
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-0",
          mobile ? "min-h-0 pb-[calc(1rem+env(safe-area-inset-bottom))]" : "min-h-0",
        )}
      >
        {attractions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
            目前沒有景點資料。
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-card/95 px-4 py-2 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    {section.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {section.attractions.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {section.attractions.map((attraction) => (
                  <AttractionListItem
                    key={attraction.id}
                    attraction={attraction}
                    isActive={attraction.id === selectedAttractionId}
                    onSelectAttraction={onSelectAttraction}
                    setItemRef={setItemRef}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function AttractionListItem({
  attraction,
  isActive,
  onSelectAttraction,
  setItemRef,
}: {
  attraction: Attraction
  isActive: boolean
  onSelectAttraction: (attractionId: string) => void
  setItemRef: (attractionId: string, element: HTMLButtonElement | null) => void
}) {
  const badges = getStatusBadges(attraction)

  return (
    <button
      ref={(element) => {
        setItemRef(attraction.id, element)
      }}
      type="button"
      onClick={() => onSelectAttraction(attraction.id)}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition",
        isActive
          ? "border-primary bg-primary/10"
          : "border-border bg-secondary hover:bg-accent",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold">{attraction.name}</h3>
        {badges.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-1">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {attraction.area} · {attraction.timeBlock ?? attraction.visitWindow}
      </p>
      <p className="mt-3 text-sm leading-relaxed">{attraction.notes}</p>

      {attraction.address ? (
        <p className="mt-2 text-xs text-muted-foreground">{attraction.address}</p>
      ) : null}

      {attraction.recommendedDuration ? (
        <p className="mt-2 text-xs text-muted-foreground">
          建議停留：{attraction.recommendedDuration}
        </p>
      ) : null}

      {attraction.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {attraction.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted/70 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {attraction.links && attraction.links.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {attraction.links.map((link) => {
            const LinkIcon = isGoogleMapLink(link.label) ? MapPin : ExternalLink

            return (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                <LinkIcon className="size-3.5" />
                <span className="truncate">{link.label}</span>
              </a>
            )
          })}
        </div>
      ) : null}
    </button>
  )
}

function MobileDrawer({
  open,
  onClose,
  children,
}: React.PropsWithChildren<{
  open: boolean
  onClose: () => void
}>) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-30 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-[82svh] max-h-[calc(100svh-1rem)] flex-col rounded-t-[2rem] border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        {children}
      </div>
    </div>
  )
}
