import { NextRequest, NextResponse } from "next/server";
import { globalProviderRegistry, rankPlaces, ALL_PLACE_TYPES, type PlaceType } from "@/lib/location-intelligence";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radius = parseInt(searchParams.get("radius") || "2000");
  const types = (searchParams.get("types") || "").split(",").filter(Boolean) as PlaceType[];
  const limit = parseInt(searchParams.get("limit") || "20");
  const language = searchParams.get("language") || "en";
  const userId = searchParams.get("userId") || "anonymous";

  if (!lat || !lng) return NextResponse.json({ error: "lat and lng required" }, { status: 400 });

  const validTypes = types.length > 0 ? types : ALL_PLACE_TYPES.slice(0, 10);
  const places = await globalProviderRegistry.searchAll({ lat, lng, radiusMeters: radius, types: validTypes, limit, language });
  const ranked = rankPlaces(places, lat, lng);

  return NextResponse.json({
    places: ranked.slice(0, limit),
    count: ranked.length,
    radius,
    types: validTypes,
    providers: globalProviderRegistry.getAvailable().map(p => p.name),
  });
}
