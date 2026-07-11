import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { endorseUser, listEndorsements, normalizeUsername } from "@/lib/pro-network";

// ─────────────────────────────────────────────────────────────────────────────
// /api/pro/endorse — POST to endorse a user for a skill (idempotent).
// GET  ?target=<username>  →  list endorsements received by the target.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/pro/endorse?target=<username>
 * Returns endorsements grouped by skill: `[{ skill, count, endorsers[] }]`.
 * Endorsements are public — anyone can see who endorsed whom.
 */
export async function GET(req: NextRequest) {
  try {
    const target = normalizeUsername(req.nextUrl.searchParams.get("target"));
    if (!target) {
      return NextResponse.json({ error: "target is required" }, { status: 400 });
    }
    const endorsements = await listEndorsements(target);
    return NextResponse.json({ target, endorsements });
  } catch (err) {
    logger.error("[/api/pro/endorse GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list endorsements" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pro/endorse
 * Body: { target: string, skill: string, endorser: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const target = normalizeUsername(body.target);
    const endorser = normalizeUsername(body.endorser);
    const skill =
      typeof body.skill === "string" ? body.skill.trim().toLowerCase() : "";

    if (!target) {
      return NextResponse.json({ error: "target is required" }, { status: 400 });
    }
    if (!endorser) {
      return NextResponse.json({ error: "endorser is required" }, { status: 400 });
    }
    if (!skill) {
      return NextResponse.json({ error: "skill is required" }, { status: 400 });
    }

    const endorsement = await endorseUser(target, skill, endorser);
    return NextResponse.json({ ok: true, endorsement }, { status: 201 });
  } catch (err) {
    logger.error("[/api/pro/endorse POST] error", {
      error: (err as Error).message,
    });
    const msg = err instanceof Error ? err.message : "failed to endorse";
    const status = msg.includes("required") || msg.includes("yourself")
      ? 400
      : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
