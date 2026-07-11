import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { geocode } from "@/lib/cirkle-maps";

// ─────────────────────────────────────────────────────────────────────────────
// /api/maps/geocode — GET forward geocoding via OSM Nominatim.
// GET /api/maps/geocode?q=Riyadh
// Returns { results: [{ lat, lon, display_name }] }
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || "";
    if (!q.trim()) {
      return NextResponse.json(
        { error: "q (query) is required" },
        { status: 400 },
      );
    }
    const results = await geocode(q);
    return NextResponse.json({ query: q, results });
  } catch (err) {
    logger.error("[/api/maps/geocode GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "geocode failed" },
      { status: 500 },
    );
  }
}
