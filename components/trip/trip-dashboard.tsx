"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import { ExternalLink, List, MapPin, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { applyAttractionFilters } from "@/lib/trip/filters"
import type { DrivingRoute } from "@/lib/trip/directions"
import { requestDrivingRoute } from "@/lib/trip/directions"
import {
  buildGoogleMapsNavigationUrl,
  buildGoogleMapsRouteSegments,
  createDailyRouteStops,
} from "@/lib/trip/routes"
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
  }
)

type TripDashboardProps = {
  attractions: Attraction[]
  mapboxAccessToken: string | null
}

type DailyRouteState = {
  key: string
  status: "ready" | "unavailable"
  route: DrivingRoute | null
}

type DailyRouteStatus =
  "idle" | "loading" | "ready" | "not-enough" | "unavailable"

function getPlanGroups(attractions: Attraction[]) {
  return Array.from(
    new Set(
      attractions.flatMap((attraction) =>
        attraction.planGroup ? [attraction.planGroup] : []
      )
    )
  )
}

function formatDistance(distanceMeters: number) {
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: distanceMeters < 10_000 ? 1 : 0,
  }).format(distanceMeters / 1_000)
}

function formatDuration(durationSeconds: number) {
  return Math.max(1, Math.round(durationSeconds / 60))
}

function getAttractionCategories(attractions: Attraction[]) {
  return Array.from(
    new Set(attractions.map((attraction) => attraction.category))
  ).sort((left, right) => left.localeCompare(right, "zh-Hant"))
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

export function TripDashboard({
  attractions: initialAttractions,
  mapboxAccessToken,
}: TripDashboardProps) {
  const attractions = React.useMemo(
    () => sortAttractionsByTime(initialAttractions),
    [initialAttractions]
  )
  const categories = React.useMemo(
    () => getAttractionCategories(attractions),
    [attractions]
  )
  const planGroups = React.useMemo(
    () => getPlanGroups(attractions),
    [attractions]
  )
  const [selectedPlanGroup, setSelectedPlanGroup] = React.useState<
    string | null
  >(null)
  const scopedAttractions = React.useMemo(
    () =>
      selectedPlanGroup
        ? attractions.filter(
            (attraction) => attraction.planGroup === selectedPlanGroup
          )
        : attractions,
    [attractions, selectedPlanGroup]
  )
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    []
  )
  const filteredAttractions = React.useMemo(
    () =>
      applyAttractionFilters(scopedAttractions, {
        search: "",
        categories: selectedCategories,
        areas: [],
        priorities: [],
      }),
    [scopedAttractions, selectedCategories]
  )
  const [selectedAttractionId, setSelectedAttractionId] = React.useState<
    string | null
  >(filteredAttractions[0]?.id ?? null)
  const [mobileListOpen, setMobileListOpen] = React.useState(false)
  const dailyRouteStops = React.useMemo(
    () => (selectedPlanGroup ? createDailyRouteStops(scopedAttractions) : []),
    [scopedAttractions, selectedPlanGroup]
  )
  const dailyRouteKey = React.useMemo(
    () =>
      [
        selectedPlanGroup,
        ...dailyRouteStops.map(
          (stop) => `${stop.id}:${stop.coordinates.lng},${stop.coordinates.lat}`
        ),
      ].join("|"),
    [dailyRouteStops, selectedPlanGroup]
  )
  const [dailyRouteState, setDailyRouteState] =
    React.useState<DailyRouteState | null>(null)
  const routeRequestSequence = React.useRef(0)
  const googleMapsRouteSegments = React.useMemo(
    () => buildGoogleMapsRouteSegments(dailyRouteStops),
    [dailyRouteStops]
  )
  const dailyRouteStatus: DailyRouteStatus = !selectedPlanGroup
    ? "idle"
    : dailyRouteStops.length < 2
      ? "not-enough"
      : !mapboxAccessToken
        ? "unavailable"
        : dailyRouteState?.key === dailyRouteKey
          ? dailyRouteState.status
          : "loading"
  const dailyRoute =
    dailyRouteStatus === "ready" && dailyRouteState?.key === dailyRouteKey
      ? dailyRouteState.route
      : null
  const activeAttractionId =
    filteredAttractions.find(
      (attraction) => attraction.id === selectedAttractionId
    )?.id ??
    filteredAttractions[0]?.id ??
    null
  const activeFilterCount = selectedCategories.length

  const toggleCategory = React.useCallback((category: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((item) => item !== category)
        : [...currentCategories, category]
    )
  }, [])
  const clearCategories = React.useCallback(() => {
    setSelectedCategories([])
  }, [])
  const handleSelectPlanGroup = React.useCallback(
    (planGroup: string | null) => {
      setSelectedPlanGroup(planGroup)
      setDailyRouteState(null)

      const firstAttraction = planGroup
        ? attractions.find((attraction) => attraction.planGroup === planGroup)
        : attractions[0]
      setSelectedAttractionId(firstAttraction?.id ?? null)
    },
    [attractions]
  )
  const handleMapSelectAttraction = React.useCallback(
    (attractionId: string) => {
      setSelectedAttractionId(attractionId)

      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setMobileListOpen(true)
      }
    },
    []
  )

  React.useEffect(() => {
    if (
      !selectedPlanGroup ||
      dailyRouteStops.length < 2 ||
      !mapboxAccessToken
    ) {
      return
    }

    const controller = new AbortController()
    const requestSequence = ++routeRequestSequence.current

    requestDrivingRoute(dailyRouteStops, {
      accessToken: mapboxAccessToken,
      signal: controller.signal,
    })
      .then((route) => {
        if (
          controller.signal.aborted ||
          requestSequence !== routeRequestSequence.current
        ) {
          return
        }

        setDailyRouteState({ key: dailyRouteKey, status: "ready", route })
      })
      .catch(() => {
        if (
          controller.signal.aborted ||
          requestSequence !== routeRequestSequence.current
        ) {
          return
        }

        setDailyRouteState({
          key: dailyRouteKey,
          status: "unavailable",
          route: null,
        })
      })

    return () => {
      controller.abort()
    }
  }, [dailyRouteKey, dailyRouteStops, mapboxAccessToken, selectedPlanGroup])

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0">
        <TripMap
          attractions={filteredAttractions}
          selectedAttractionId={activeAttractionId}
          dailyRoute={dailyRoute}
          mapboxAccessToken={mapboxAccessToken}
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
          planGroups={planGroups}
          selectedPlanGroup={selectedPlanGroup}
          selectedCategories={selectedCategories}
          activeFilterCount={activeFilterCount}
          selectedAttractionId={activeAttractionId}
          dailyRouteStatus={dailyRouteStatus}
          dailyRoute={dailyRoute}
          dailyRouteStopCount={dailyRouteStops.length}
          googleMapsRouteSegments={googleMapsRouteSegments}
          onSelectPlanGroup={handleSelectPlanGroup}
          onToggleCategory={toggleCategory}
          onClearCategories={clearCategories}
          onSelectAttraction={setSelectedAttractionId}
          className="h-full"
        />
      </div>

      <MobileDrawer
        open={mobileListOpen}
        onClose={() => setMobileListOpen(false)}
      >
        <AttractionList
          attractions={filteredAttractions}
          categories={categories}
          planGroups={planGroups}
          selectedPlanGroup={selectedPlanGroup}
          selectedCategories={selectedCategories}
          activeFilterCount={activeFilterCount}
          selectedAttractionId={activeAttractionId}
          dailyRouteStatus={dailyRouteStatus}
          dailyRoute={dailyRoute}
          dailyRouteStopCount={dailyRouteStops.length}
          googleMapsRouteSegments={googleMapsRouteSegments}
          onSelectPlanGroup={handleSelectPlanGroup}
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
  planGroups,
  selectedPlanGroup,
  selectedCategories,
  activeFilterCount,
  selectedAttractionId,
  dailyRouteStatus,
  dailyRoute,
  dailyRouteStopCount,
  googleMapsRouteSegments,
  onSelectPlanGroup,
  onToggleCategory,
  onClearCategories,
  onSelectAttraction,
  onClose,
  className,
  mobile = false,
}: {
  attractions: Attraction[]
  categories: string[]
  planGroups: string[]
  selectedPlanGroup: string | null
  selectedCategories: string[]
  activeFilterCount: number
  selectedAttractionId: string | null
  dailyRouteStatus: DailyRouteStatus
  dailyRoute: DrivingRoute | null
  dailyRouteStopCount: number
  googleMapsRouteSegments: string[]
  onSelectPlanGroup: (planGroup: string | null) => void
  onToggleCategory: (category: string) => void
  onClearCategories: () => void
  onSelectAttraction: (attractionId: string) => void
  onClose?: () => void
  className?: string
  mobile?: boolean
}) {
  const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const sections = React.useMemo(
    () => groupAttractionsByPlan(attractions),
    [attractions]
  )
  const setItemRef = React.useCallback(
    (attractionId: string, element: HTMLButtonElement | null) => {
      itemRefs.current[attractionId] = element
    },
    []
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
        className
      )}
    >
      <CardHeader className="shrink-0 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              WinLab Okinawa Trip Dashboard
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {attractions.length} 筆
              {activeFilterCount > 0 ? ` · ${activeFilterCount} 類已選` : ""}
            </p>
          </div>
          {mobile && onClose ? (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <label className="mt-3 block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            日程
          </span>
          <select
            value={selectedPlanGroup ?? ""}
            onChange={(event) => onSelectPlanGroup(event.target.value || null)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">全部</option>
            {planGroups.map((planGroup) => (
              <option key={planGroup} value={planGroup}>
                {planGroup}
              </option>
            ))}
          </select>
        </label>
        {selectedPlanGroup ? (
          <RouteSummary
            status={dailyRouteStatus}
            route={dailyRoute}
            stopCount={dailyRouteStopCount}
            googleMapsRouteSegments={googleMapsRouteSegments}
          />
        ) : null}
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
                    : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
          "flex-1 space-y-3 overflow-y-auto px-4 pt-0 pb-4",
          mobile
            ? "min-h-0 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            : "min-h-0"
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

function RouteSummary({
  status,
  route,
  stopCount,
  googleMapsRouteSegments,
}: {
  status: DailyRouteStatus
  route: DrivingRoute | null
  stopCount: number
  googleMapsRouteSegments: string[]
}) {
  let summary = `${stopCount} 站`

  if (status === "loading") {
    summary += " · 路線計算中…"
  } else if (status === "ready" && route) {
    summary += ` · ${formatDistance(route.distanceMeters)} km · ${formatDuration(route.durationSeconds)} 分`
  } else if (status === "not-enough") {
    summary += " · 至少需要 2 個可駕車景點"
  } else if (status === "unavailable") {
    summary += " · 路線暫時無法載入"
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/60 p-3">
      <p className="text-xs font-semibold">預估車程</p>
      <p className="mt-1 text-sm text-foreground">{summary}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Directions powered by Mapbox
      </p>
      {googleMapsRouteSegments.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {googleMapsRouteSegments.map((href, index) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 text-xs font-medium transition hover:bg-accent"
            >
              <ExternalLink className="size-3" />
              {googleMapsRouteSegments.length === 1
                ? "Google Maps 導航"
                : `Google Maps 第 ${index + 1} 段`}
            </a>
          ))}
        </div>
      ) : null}
    </div>
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
          : "border-border bg-secondary hover:bg-accent"
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
        <p className="mt-2 text-xs text-muted-foreground">
          {attraction.address}
        </p>
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

      {isActive ? (
        <a
          href={buildGoogleMapsNavigationUrl(attraction)}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          <MapPin className="size-3.5" />
          導航到這裡
        </a>
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
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-[82svh] max-h-[calc(100svh-1rem)] flex-col rounded-t-[2rem] border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {children}
      </div>
    </div>
  )
}
