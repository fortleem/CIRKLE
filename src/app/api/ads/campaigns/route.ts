import { NextRequest, NextResponse } from "next/server";
import {
  createCampaign,
  listCampaigns,
  getAdvertiserStats,
  AD_CATEGORIES,
  type AdCategory,
} from "@/lib/ad-engine";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ads/campaigns?advertiser=<name>
// Returns the advertiser's campaigns + aggregate stats.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const advertiser = req.nextUrl.searchParams.get("advertiser");
    if (!advertiser) {
      return NextResponse.json({ error: "advertiser is required" }, { status: 400 });
    }
    const [campaigns, stats] = await Promise.all([
      listCampaigns(advertiser),
      getAdvertiserStats(advertiser),
    ]);
    return NextResponse.json({ campaigns, stats });
  } catch (err) {
    logger.error("[/api/ads/campaigns GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list campaigns" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ads/campaigns
// Body: { advertiser, title, body, cta, url, targetCountry, targetCity?,
//         category, budget, cpm, startDate, endDate }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    // Validate category early so we get a clear 400 instead of an engine error.
    if (typeof body.category !== "string" || !(AD_CATEGORIES as readonly string[]).includes(body.category)) {
      return NextResponse.json(
        { error: `category must be one of: ${AD_CATEGORIES.join(", ")}` },
        { status: 400 },
      );
    }

    const campaign = await createCampaign({
      advertiser: String(body.advertiser || ""),
      title: String(body.title || ""),
      body: String(body.body || ""),
      cta: String(body.cta || ""),
      url: String(body.url || ""),
      targetCountry: String(body.targetCountry || ""),
      targetCity: body.targetCity ? String(body.targetCity) : null,
      category: body.category as AdCategory,
      budget: Number(body.budget),
      cpm: Number(body.cpm),
      startDate: String(body.startDate || new Date().toISOString()),
      endDate: String(body.endDate || new Date(Date.now() + 30 * 86400000).toISOString()),
    });

    return NextResponse.json({ ok: true, campaign }, { status: 201 });
  } catch (err) {
    logger.error("[/api/ads/campaigns POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create campaign" },
      { status: 500 },
    );
  }
}
