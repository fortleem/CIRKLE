import { NextRequest, NextResponse } from "next/server";
import { globalProviderRegistry } from "@/lib/location-intelligence";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "";
  const country = searchParams.get("country") || "";
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const categories = (searchParams.get("categories") || "").split(",").filter(Boolean);
  const limit = parseInt(searchParams.get("limit") || "10");
  const language = searchParams.get("language") || "en";

  const events = await globalProviderRegistry.searchAllEvents({
    lat: lat || undefined, lng: lng || undefined, city, country,
    radiusMeters: 10000, categories: categories.length > 0 ? categories : undefined,
    limit, language,
  });

  return NextResponse.json({ events, count: events.length, city, country });
}
