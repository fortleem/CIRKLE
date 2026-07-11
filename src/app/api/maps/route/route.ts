import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { route, type RouteMode, formatDistance, formatDuration } from "@/lib/cirkle-maps";

// ─────────────────────────────────────────────────────────────────────────────
// /api/maps/route — GET routing via OSRM (free, public demo server).
// GET /api/maps/route?from=lat,lon&to=lat,lon&mode=driving
// Returns { distance, duration, distanceLabel, durationLabel, geometry }
// ─────────────────────────────────────────────────────────────────────────────

const VALID_MODES: readonly RouteMode[] = ["driving", "walking", "cycling"];

function parseLatLng(raw: string | null): { lat: number; lon: number } | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || parts.some((v) => !isFinite(v))) return null;
  return { lat: parts[0], lon: parts[1] };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const from = parseLatLng(sp.get("from"));
    const to = parseLatLng(sp.get("to"));
    const modeRaw = sp.get("mode") || "driving";
    const mode = (VALID_MODES as readonly string[]).includes(modeRaw)
      ? (modeRaw as RouteMode)
      : "driving";

    if (!from) {
      return NextResponse.json(
        { error: "from=lat,lon is required" },
        { status: 400 },
      );
    }
    if (!to) {
      return NextResponse.json(
        { error: "to=lat,lon is required" },
        { status: 400 },
      );
    }

    const result = await route(from, to, mode);
    if (!result) {
      return NextResponse.json(
        { error: "no route found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      mode,
      from,
      to,
      distance: result.distance,
      duration: result.duration,
      distanceLabel: formatDistance(result.distance),
      durationLabel: formatDuration(result.duration),
      geometry: result.geometry,
    });
  } catch (err) {
    logger.error("[/api/maps/route GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "routing failed" },
      { status: 500 },
    );
  }
}
