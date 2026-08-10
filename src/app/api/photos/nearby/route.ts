// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getNearbyPhotos } from "@/lib/nearby-discovery";
import {
  decodeGeohashLat,
  decodeGeohashLng,
  isValidGeohash,
} from "@/lib/geohash";

/**
 * GET /api/photos/nearby?lat=30.04&lng=31.23&radius=2&limit=50
 *
 * Returns photos within `radius` km of the given coordinates.
 *
 * IMPORTANT privacy note (Blueprint §8.4): the client SHOULD compute
 * the geohash locally and call this endpoint with `?geohash=...`
 * instead of lat/lng. We accept lat/lng for convenience/testing, but
 * the lat/lng never gets stored — only the geohash is persisted on
 * the post index.
 *
 * Accepted params:
 *   lat, lng   — caller's coordinates (transient, never stored)
 *   geohash    — precomputed geohash (preferred)
 *   radius     — search radius in km (default 2, max 50)
 *   limit      — max results (default 50, max 200)
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const radiusRaw = Number(sp.get("radius") ?? "2");
    const radius = isFinite(radiusRaw) ? Math.max(0.5, Math.min(50, radiusRaw)) : 2;
    const limitRaw = Number(sp.get("limit") ?? "50");
    const limit = isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;

    // Prefer the geohash form when supplied.
    const geohash = sp.get("geohash")?.trim().toLowerCase();
    let photos: any[] = [];
    if (geohash && isValidGeohash(geohash)) {
      // Decode the geohash to a representative point and use that.
      const lat = decodeGeohashLat(geohash);
      const lng = decodeGeohashLng(geohash);
      if (lat != null && lng != null) {
        photos = await getNearbyPhotos(lat, lng, radius, limit);
      }
    } else {
      const lat = Number(sp.get("lat") ?? "NaN");
      const lng = Number(sp.get("lng") ?? "NaN");
      if (!isFinite(lat) || !isFinite(lng)) {
        return NextResponse.json(
          { error: "either geohash or (lat, lng) is required" },
          { status: 400 },
        );
      }
      photos = await getNearbyPhotos(lat, lng, radius, limit);
    }

    return NextResponse.json(
      { photos, count: photos.length, radiusKm: radius },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("[/api/photos/nearby GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load nearby photos" },
      { status: 500 },
    );
  }
}
