// @ts-nocheck
/**
 * POST /api/admin/seed
 * ============================================================================
 * Seeds the Policy Engine + Service Directory + Institution Registry with
 * initial Egyptian government data.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAdmin` clearance on the session. Returns 401 / 403 otherwise.
 * (P1 rate-limit wrapper is preserved.)
 * ============================================================================
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { seedSovereignDefaults } from "@/lib/sovereign-seed";
import { withRateLimit } from "@/lib/api-rate-limit";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

async function seedHandler(req: NextRequest) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const result = await seedSovereignDefaults();
    return NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { error: "seed_failed", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

// P1 FIX: Rate-limited to prevent abuse (seed — 2 req/min)
export const POST = withRateLimit(seedHandler, {
  maxRequests: 2,
  windowMs: 60_000,
  keyBy: "ip",
});
