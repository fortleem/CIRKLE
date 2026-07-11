import { NextRequest, NextResponse } from "next/server";
import { globalProviderRegistry, rankPlaces, ALL_PLACE_TYPES, CONTEXT_INTELLIGENCE } from "@/lib/location-intelligence";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const city = searchParams.get("city") || "";
  const country = searchParams.get("country") || "";
  const language = searchParams.get("language") || "en";
  const limit = parseInt(searchParams.get("limit") || "10");

  if (!lat || !lng) return NextResponse.json({ error: "lat and lng required" }, { status: 400 });

  // Search places + events in parallel
  const [places, events] = await Promise.all([
    globalProviderRegistry.searchAll({ lat, lng, radiusMeters: 2000, types: ALL_PLACE_TYPES.slice(0, 15), limit, language }),
    globalProviderRegistry.searchAllEvents({ lat, lng, city, country, radiusMeters: 5000, limit, language }),
  ]);

  const ranked = rankPlaces(places, lat, lng);

  // Determine context (what type of area is the user in?)
  const topType = ranked[0]?.type || "restaurant";
  const context = CONTEXT_INTELLIGENCE[topType];

  return NextResponse.json({
    location: { lat, lng, city, country },
    context: context ? {
      areaType: topType,
      understands: context.understands,
      nearbyTypes: context.understands.nearbyTypes,
    } : null,
    places: ranked.slice(0, limit),
    events: events.slice(0, limit),
    summary: `${ranked.length} places and ${events.length} events found near ${city || "your location"}`,
    providers: globalProviderRegistry.getAvailable().map(p => p.name),
  });
}
