import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { reseedAll } from "@/lib/circle/seed";
import { db } from "@/lib/db";

/**
 * GET /api/seed
 * Returns the current per-table row counts (non-destructive read).
 * The destructive reset is triggered by POST.
 */
export async function GET() {
  try {
    let counts: Record<string, number> = {};
    try {
      counts = {
        users: await db.user.count(),
        conversations: await db.conversation.count(),
        conversationMembers: await db.conversationMember.count(),
        messages: await db.message.count(),
        posts: await db.post.count(),
        transactions: await db.transaction.count(),
        verifyClaims: await db.verifyClaim.count(),
      };
    } catch (err) {
      // Likely not yet seeded / migration gap — report the error but keep 200.
      return NextResponse.json({
        ok: true,
        counts,
        seeded: false,
        hint: "POST to /api/seed to wipe every table and re-seed from mock-data.",
        error: err instanceof Error ? err.message : "count failed",
      });
    }
    return NextResponse.json({
      ok: true,
      counts,
      seeded: counts.conversations > 0,
      hint: "POST to /api/seed to wipe every table and re-seed from mock-data.",
    });
  } catch (err) {
    logger.error("[/api/seed GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "seed status failed" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/seed
 * Wipe every table and re-seed from mock-data.
 * Used by the frontend "Reset demo" button.
 */
export async function POST() {
  try {
    const counts = await reseedAll();
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    logger.error("[/api/seed] error", { error: (err as Error).message });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "seed failed" },
      { status: 500 },
    );
  }
}
