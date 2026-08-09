import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getCouncilMembers } from "@/lib/governance-service";

// ─────────────────────────────────────────────────────────────────────────────
// /api/governance/council — GET list the current council members.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const members = await getCouncilMembers();
    return NextResponse.json({ members });
  } catch (err) {
    logger.error("[/api/governance/council GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load council" },
      { status: 500 },
    );
  }
}
