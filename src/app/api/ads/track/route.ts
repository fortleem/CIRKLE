import { NextRequest, NextResponse } from "next/server";
import { trackClick, trackImpression } from "@/lib/ad-engine";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ads/track
// Body: { adId: string, event: "impression" | "click" }
//
// Best-effort: returns 200 even on internal failures so client retries
// don't pile up. The engine itself swallows non-fatal errors.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const adId = typeof body.adId === "string" ? body.adId : "";
    const event = typeof body.event === "string" ? body.event : "";

    if (!adId) return NextResponse.json({ error: "adId is required" }, { status: 400 });
    if (event !== "impression" && event !== "click") {
      return NextResponse.json({ error: "event must be 'impression' or 'click'" }, { status: 400 });
    }

    if (event === "impression") {
      await trackImpression(adId);
    } else {
      await trackClick(adId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[/api/ads/track POST] error", { error: (err as Error).message });
    return NextResponse.json({ ok: true }); // best-effort
  }
}
