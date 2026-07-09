"use client"

import * as React from "react"
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from "react-map-gl/mapbox"
import type { Map as MapboxMap } from "mapbox-gl"
import {
  Beer,
  Camera,
  FerrisWheel,
  IceCreamBowl,
  Landmark,
  Plane,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { AttractionMarkerKind } from "@/lib/trip/category"
import { createGreatCircleRouteCoordinates } from "@/lib/trip/geo"
import { createAttractionMarkerPlacements } from "@/lib/trip/markers"
import type { Attraction, AttractionCoordinates } from "@/lib/trip/types"

const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11"
const TPE_COORDINATES = { lat: 25.0777, lng: 121.2328 }
const OKA_COORDINATES = { lat: 26.1958, lng: 127.6459 }

type TripMapProps = {
  attractions: Attraction[]
  selectedAttractionId: string | null
  onSelectAttraction: (attractionId: string) => void
}

type RouteFeature = {
  type: "Feature"
  properties: { id: string }
  geometry: {
    type: "LineString"
    coordinates: [number, number][]
  }
}

type RouteFeatureCollection = {
  type: "FeatureCollection"
  features: RouteFeature[]
}

function createRouteFeatureCollection(
  attractions: Attraction[],
): RouteFeatureCollection {
  return {
    type: "FeatureCollection",
    features: attractions
      .filter((attraction) => attraction.route)
      .map((attraction) => ({
        type: "Feature",
        properties: { id: attraction.id },
        geometry: {
          type: "LineString",
          coordinates: createGreatCircleRouteCoordinates(
            attraction.route!.from,
            attraction.route!.to,
          ),
        },
      })),
  }
}

function getFocusPadding() {
  if (typeof window === "undefined") {
    return { top: 96, bottom: 96, left: 96, right: 420 }
  }

  return window.innerWidth >= 768
    ? { top: 96, bottom: 96, left: 96, right: 420 }
    : { top: 96, bottom: 220, left: 48, right: 48 }
}

const ROUTE_LINE_COLORS = {
  selected: "#fafafa",
  default: "#a3a3a3",
} as const

const MARKER_KIND_CONFIG = {
  airport: Plane,
  flight: Plane,
  marine: Waves,
  culture: Landmark,
  food: Utensils,
  drink: Beer,
  dessert: IceCreamBowl,
  activity: FerrisWheel,
  place: Camera,
} satisfies Record<AttractionMarkerKind, LucideIcon>

function focusAttraction(map: MapboxMap, attraction: Attraction) {
  if (attraction.route) {
    const { from, to } = attraction.route
    const bounds: [[number, number], [number, number]] = [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ]

    map.fitBounds(bounds, {
      padding: getFocusPadding(),
      duration: 900,
      maxZoom: 7.8,
    })
    return
  }

  map.flyTo({
    center: [attraction.coordinates.lng, attraction.coordinates.lat],
    zoom: 12.5,
    duration: 900,
  })
}

function AttractionMarker({
  attractionId,
  coordinates,
  markerKind,
  offset,
  isSelected,
  onSelect,
}: {
  attractionId: string
  coordinates: AttractionCoordinates
  markerKind: AttractionMarkerKind
  offset: [number, number]
  isSelected: boolean
  onSelect: (attractionId: string) => void
}) {
  const MarkerIcon = MARKER_KIND_CONFIG[markerKind]

  return (
    <Marker
      latitude={coordinates.lat}
      longitude={coordinates.lng}
      anchor="bottom"
      offset={offset}
    >
      <button
        type="button"
        aria-label="聚焦景點"
        onClick={() => onSelect(attractionId)}
        className={cn(
          "rounded-full border border-border bg-card p-2 text-foreground shadow-md transition hover:scale-105 hover:bg-accent",
          isSelected && "border-primary bg-primary text-primary-foreground",
        )}
      >
        <MarkerIcon className="size-4" />
      </button>
    </Marker>
  )
}

export function TripMap({
  attractions,
  selectedAttractionId,
  onSelectAttraction,
}: TripMapProps) {
  const mapRef = React.useRef<MapRef>(null)
  const [mapRenderKey] = React.useState(() => `trip-map-${crypto.randomUUID()}`)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

  const selectedAttraction =
    attractions.find((attraction) => attraction.id === selectedAttractionId) ?? null

  const routeData = React.useMemo(
    () => createRouteFeatureCollection(attractions),
    [attractions],
  )
  const markerPlacements = React.useMemo(
    () => createAttractionMarkerPlacements(attractions),
    [attractions],
  )

  React.useEffect(() => {
    if (!selectedAttractionId) {
      return
    }

    const attraction = attractions.find((item) => item.id === selectedAttractionId)
    const map = mapRef.current?.getMap()

    if (!attraction || !map) {
      return
    }

    focusAttraction(map, attraction)
  }, [attractions, selectedAttractionId])

  if (!mapboxToken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6 text-center text-sm text-muted-foreground">
        請設定 <code className="text-foreground">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code>{" "}
        以載入 Mapbox 深色地圖。
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <Map
        ref={mapRef}
        key={mapRenderKey}
        reuseMaps={false}
        mapboxAccessToken={mapboxToken}
        mapStyle={MAPBOX_DARK_STYLE}
        projection="globe"
        initialViewState={{
          latitude: 26.45,
          longitude: 127.83,
          zoom: 8.7,
        }}
        minZoom={0}
        maxZoom={15}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-left" showCompass={false} />

        {routeData.features.length > 0 ? (
          <Source id="trip-routes" type="geojson" data={routeData}>
            <Layer
              id="trip-route-lines"
              type="line"
              paint={{
                "line-color": [
                  "case",
                  ["==", ["get", "id"], selectedAttractionId ?? ""],
                  ROUTE_LINE_COLORS.selected,
                  ROUTE_LINE_COLORS.default,
                ],
                "line-width": [
                  "case",
                  ["==", ["get", "id"], selectedAttractionId ?? ""],
                  3,
                  2,
                ],
                "line-dasharray": [2, 2],
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
          </Source>
        ) : null}

        {markerPlacements.map((placement) => (
            <AttractionMarker
              key={placement.key}
              attractionId={placement.attractionId}
              coordinates={placement.coordinates}
              markerKind={placement.markerKind}
              offset={placement.offset}
              isSelected={placement.attractionId === selectedAttractionId}
              onSelect={onSelectAttraction}
            />
        ))}

        {selectedAttraction && !selectedAttraction.route ? (
          <Popup
            latitude={selectedAttraction.coordinates.lat}
            longitude={selectedAttraction.coordinates.lng}
            anchor="top"
            offset={20}
            closeButton={false}
            onClose={() => onSelectAttraction(selectedAttraction.id)}
            className="[&_.mapboxgl-popup-content]:rounded-2xl [&_.mapboxgl-popup-content]:border [&_.mapboxgl-popup-content]:border-border [&_.mapboxgl-popup-content]:bg-popover [&_.mapboxgl-popup-content]:px-4 [&_.mapboxgl-popup-content]:py-3 [&_.mapboxgl-popup-content]:text-popover-foreground [&_.mapboxgl-popup-content]:shadow-lg [&_.mapboxgl-popup-tip]:border-t-popover"
          >
            <div className="min-w-52 space-y-1">
              <p className="text-sm font-semibold">{selectedAttraction.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedAttraction.area} · {selectedAttraction.visitWindow}
              </p>
            </div>
          </Popup>
        ) : null}
      </Map>
    </div>
  )
}

export { TPE_COORDINATES, OKA_COORDINATES }
