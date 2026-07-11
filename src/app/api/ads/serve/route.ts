import { NextRequest, NextResponse } from "next/server";
import { serveAd, trackImpression } from "@/lib/ad-engine";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ads/serve?country=EG&city=Cairo&category=food
// Serves ONE ad for the given local context (no user profiling).
// Privacy posture (§30.4): only country + city + category are read.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const country = req.nextUrl.searchParams.get("country") || "";
    const city = req.nextUrl.searchParams.get("city") || undefined;
    const category = req.nextUrl.searchParams.get("category") || undefined;

    if (!country || country.length < 2) {
      return NextResponse.json({ ad: null });
    }

    const ad = await serveAd(country, city, category);
    if (!ad) {
      return NextResponse.json({ ad: null });
    }

    // Best-effort: record the impression asynchronously so the viewer's
    // request isn't blocked. We `await` it because the engine itself
    // catches its own errors (best-effort contract).
    void trackImpression(ad.id).catch(() => {});

    return NextResponse.json({ ad });
  } catch (err) {
    logger.error("[/api/ads/serve GET] error", { error: (err as Error).message });
    // Never block UX on ad failures — return null ad.
    return NextResponse.json({ ad: null });
  }
}
