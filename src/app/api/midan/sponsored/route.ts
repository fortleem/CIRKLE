// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getSponsoredHashtags, trackSponsoredImpression, trackSponsoredClick } from "@/lib/sponsored-hashtags";

/**
 * GET /api/midan/sponsored?country=SA&city=Riyadh
 * Returns the active sponsored hashtags for the viewer's country/city.
 *
 * Privacy posture (Blueprint §30.4): only country + city are read.
 * No user id, no session, no behavioural targeting.
 */
export async function GET(req: NextRequest) {
  try {
    const country = req.nextUrl.searchParams.get("country") || "";
    const city = req.nextUrl.searchParams.get("city") || undefined;
    if (!country || country.length < 2) {
      return NextResponse.json({ sponsored: [] });
    }
    const sponsored = await getSponsoredHashtags(country, city);
    // Best-effort: record an impression for each served hashtag.
    for (const s of sponsored) {
      void trackSponsoredImpression(s.id).catch(() => {});
    }
    return NextResponse.json({ sponsored }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("[/api/midan/sponsored GET] error", { error: (err as Error).message });
    return NextResponse.json({ sponsored: [] });
  }
}

/**
 * POST /api/midan/sponsored
 * Body: { id, event: "click" }
 * Tracks a click on a sponsored hashtag.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { id?: string; event?: string } | null;
    if (!body?.id || body.event !== "click") {
      return NextResponse.json({ error: "id and event=click are required" }, { status: 400 });
    }
    await trackSponsoredClick(body.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[/api/midan/sponsored POST] error", { error: (err as Error).message });
    return NextResponse.json({ error: "failed to track" }, { status: 500 });
  }
}
