import { NextRequest, NextResponse } from "next/server";
import { getEvents, getNearbyVenues, getLocationSummary, getFeaturedEvents } from "@/lib/egypt-knowledge";

/**
 * GET /api/brain/location?city=Cairo&neighborhood=Zamalek&type=events
 * 
 * Returns location-aware recommendations from the Brain's trained knowledge:
 * - Events (sports, cultural, fairs, tech, entertainment)
 * - Malls, hotels, restaurants, cafes by neighborhood
 * - Location summary for Brain context
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "Cairo";
  const neighborhood = searchParams.get("neighborhood") || undefined;
  const type = searchParams.get("type") || undefined; // events | malls | hotels | restaurants | cafes | summary | featured
  const category = searchParams.get("category") || undefined;

  try {
    if (type === "summary") {
      return NextResponse.json({ summary: getLocationSummary(city, neighborhood) });
    }

    if (type === "events" || type === "featured") {
      const events = type === "featured"
        ? getFeaturedEvents(city, 4)
        : getEvents(city, category || undefined);
      return NextResponse.json({ events, count: events.length, city, neighborhood });
    }

    if (type === "malls" || type === "hotels" || type === "restaurants" || type === "cafes") {
      // Convert plural to singular for the venue type filter
      const singularType = type.endsWith("s") ? type.slice(0, -1) : type;
      const venues = getNearbyVenues(city, neighborhood, singularType);
      return NextResponse.json({ venues, count: venues.length, city, neighborhood, type });
    }

    // Default: return everything
    const events = getFeaturedEvents(city, 4);
    const malls = getNearbyVenues(city, neighborhood, "mall").slice(0, 3);
    const restaurants = getNearbyVenues(city, neighborhood, "restaurant").slice(0, 3);
    const cafes = getNearbyVenues(city, neighborhood, "cafe").slice(0, 3);
    const summary = getLocationSummary(city, neighborhood);

    return NextResponse.json({
      city,
      neighborhood,
      summary,
      events,
      malls,
      restaurants,
      cafes,
      counts: {
        events: getEvents(city).length,
        malls: getNearbyVenues(city, neighborhood, "mall").length,
        hotels: getNearbyVenues(city, neighborhood, "hotel").length,
        restaurants: getNearbyVenues(city, neighborhood, "restaurant").length,
        cafes: getNearbyVenues(city, neighborhood, "cafe").length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Location query failed" }, { status: 500 });
  }
}
