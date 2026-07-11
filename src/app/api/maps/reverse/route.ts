import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { reverseGeocode } from "@/lib/cirkle-maps";

// ─────────────────────────────────────────────────────────────────────────────
// /api/maps/reverse — GET reverse geocoding via OSM Nominatim.
// GET /api/maps/reverse?lat=24.71&lon=46.67
// Returns { displayName, city?, country?, countryCode?, road?, neighbourhood? }
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const lat = parseFloat(sp.get("lat") || "");
    const lon = parseFloat(sp.get("lon") || "");
    if (!isFinite(lat) || !isFinite(lon)) {
      return NextResponse.json(
        { error: "lat and lon are required" },
        { status: 400 },
      );
    }
    const result = await reverseGeocode(lat, lon);
    return NextResponse.json({ lat, lon, ...result });
  } catch (err) {
    logger.error("[/api/maps/reverse GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "reverse geocode failed" },
      { status: 500 },
    );
  }
}
