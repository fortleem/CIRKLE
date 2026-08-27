// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createSponsoredPost, getSponsoredFeed } from "@/lib/sponsored-posts";
import { logger } from "@/lib/logger";

/**
 * GET /api/ads/sponsored?country=EG&interests=crypto,ai&limit=5
 * Returns the sponsored feed targeted at the viewer.
 */
export async function GET(req: NextRequest) {
  try {
    const country = req.nextUrl.searchParams.get("country") || "";
    const interestsRaw = req.nextUrl.searchParams.get("interests") || "";
    const limitStr = req.nextUrl.searchParams.get("limit") || "5";
    const interests = interestsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const limit = parseInt(limitStr, 10) || 5;
    const posts = await getSponsoredFeed({
      viewerCountry: country,
      viewerInterests: interests,
      limit,
    });
    return NextResponse.json({ posts, sponsored: true });
  } catch (err) {
    logger.error("[/api/ads/sponsored GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch sponsored feed" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ads/sponsored
 * Body: { advertiserId, body, targetCountries?: string[], targetInterests?: string[], budget, currency? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const post = await createSponsoredPost({
      advertiserId: typeof body.advertiserId === "string" ? body.advertiserId : "",
      body: typeof body.body === "string" ? body.body : "",
      targetCountries: Array.isArray(body.targetCountries) ? (body.targetCountries as string[]) : [],
      targetInterests: Array.isArray(body.targetInterests) ? (body.targetInterests as string[]) : [],
      budget: typeof body.budget === "number" ? body.budget : 0,
      currency: typeof body.currency === "string" ? body.currency : "USD",
    });
    logger.info("[/api/ads/sponsored POST] created", { id: post.id, advertiserId: post.advertiserId });
    return NextResponse.json({ post, sponsored: true }, { status: 201 });
  } catch (err) {
    logger.error("[/api/ads/sponsored POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create sponsored post" },
      { status: 500 },
    );
  }
}
