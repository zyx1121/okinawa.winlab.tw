import { TripDashboard } from "@/components/trip/trip-dashboard"
import { listTripAttractions } from "@/lib/trip/data"

export default async function Page() {
  const attractions = listTripAttractions()
  const mapboxAccessToken =
    process.env.MAPBOX_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null

  return <TripDashboard attractions={attractions} mapboxAccessToken={mapboxAccessToken} />
}
