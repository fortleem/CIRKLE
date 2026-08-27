// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { requestVerification, getVerificationStatus } from "@/lib/verified-badge";
import { logger } from "@/lib/logger";

/**
 * GET /api/verify/institution?institutionId=...
 * Returns the latest verification record for the institution (or null).
 */
export async function GET(req: NextRequest) {
  try {
    const institutionId = req.nextUrl.searchParams.get("institutionId") || "";
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
    }
    const rec = await getVerificationStatus(institutionId);
    return NextResponse.json({ verification: rec });
  } catch (err) {
    logger.error("[/api/verify/institution GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch verification" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/verify/institution
 * Body: { institutionId, tier: 'basic'|'silver'|'gold', currency?, docsUploaded?[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const institutionId = typeof body.institutionId === "string" ? body.institutionId : "";
    const tier = typeof body.tier === "string" ? body.tier : "basic";
    const currency = typeof body.currency === "string" ? body.currency : "USD";
    const docsUploaded = Array.isArray(body.docsUploaded) ? body.docsUploaded : [];
    if (!institutionId) return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
    const rec = await requestVerification({ institutionId, tier: tier as any, currency, docsUploaded });
    logger.info("[/api/verify/institution POST] verification requested", { id: rec.id, institutionId, tier });
    return NextResponse.json({ verification: rec }, { status: 201 });
  } catch (err) {
    logger.error("[/api/verify/institution POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to request verification" },
      { status: 500 },
    );
  }
}
