import { TripDashboard } from "@/components/trip/trip-dashboard"
import { listTripAttractions } from "@/lib/trip/data"

export default async function Page() {
  const attractions = listTripAttractions()

  return <TripDashboard attractions={attractions} />
}
