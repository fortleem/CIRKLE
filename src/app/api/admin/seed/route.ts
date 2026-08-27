// @ts-nocheck
/**
 * POST /api/admin/seed
 * ============================================================================
 * Seeds the Policy Engine + Service Directory + Institution Registry with
 * initial Egyptian government data.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { seedSovereignDefaults } from "@/lib/sovereign-seed";

export const dynamic = "force-dynamic";

export async function POST() {
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
