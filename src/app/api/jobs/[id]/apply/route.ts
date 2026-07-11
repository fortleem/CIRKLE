import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { applyToJob, normalizeUsername } from "@/lib/pro-network";

// ─────────────────────────────────────────────────────────────────────────────
// /api/jobs/[id]/apply — POST to apply to a job.
// Idempotent: a second apply from the same user updates the cover letter.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/jobs/[id]/apply
 * Body: { username: string, coverLetter?: string }
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "job id is required" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const username = normalizeUsername(body.username);
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    const coverLetter =
      typeof body.coverLetter === "string" ? body.coverLetter : undefined;

    const application = await applyToJob(id, username, coverLetter);
    return NextResponse.json({ ok: true, application }, { status: 201 });
  } catch (err) {
    logger.error("[/api/jobs/[id]/apply POST] error", {
      error: (err as Error).message,
    });
    const msg = err instanceof Error ? err.message : "failed to apply";
    const status = msg.includes("not found") ? 404 : msg.includes("required") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
