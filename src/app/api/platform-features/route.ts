// @ts-nocheck
/**
 * GET /api/platform-features
 * ============================================================================
 * Returns the set of platform features that are currently enabled. This is
 * a PUBLIC endpoint (no auth) consumed by the client on app load to decide
 * which tabs / overlays / capabilities to show.
 *
 * Response:
 *   { enabled: string[], features: [...], generatedAt }
 *
 * The client caches this in localStorage with a 5-minute TTL.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PLATFORM_FEATURES, resolveFeatureStates } from "@/lib/platform-features";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let dbToggles: Array<{ id: string; enabled: boolean }> = [];
    try {
      dbToggles = await db.platformFeatureToggle.findMany({
        select: { id: true, enabled: true },
      });
    } catch {
      // Table might not exist yet during initial setup — use defaults.
    }

    const features = resolveFeatureStates(dbToggles);
    const enabled = features.filter(f => f.enabled).map(f => f.id);

    return NextResponse.json(
      {
        enabled,
        features,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
      },
    );
  } catch (err) {
    // Fallback: return only the core features.
    const enabled = PLATFORM_FEATURES.filter(f => f.defaultEnabled).map(f => f.id);
    return NextResponse.json(
      { enabled, features: PLATFORM_FEATURES, error: String(err).slice(0, 200) },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
