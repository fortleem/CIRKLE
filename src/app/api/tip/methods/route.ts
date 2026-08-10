// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getTippingOptions } from "@/lib/tipping-service";

/**
 * GET /api/tip/methods?country=SA&user=<handle>
 * Returns the tipping methods available in the user's country.
 *
 * Privacy posture: this endpoint only reads `country` (no user id
 * needed for the catalogue — the user param is accepted for forward
 * compat with per-creator-method preferences).
 */
export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country") || "US";
  const user = req.nextUrl.searchParams.get("user") || null;
  const options = getTippingOptions(user, country);
  return NextResponse.json(options, { headers: { "Cache-Control": "public, max-age=300" } });
}
