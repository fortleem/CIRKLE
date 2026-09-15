// @ts-nocheck
/**
 * GET  /api/moderation/queue?status=pending&limit=50
 * POST /api/moderation/queue
 * ============================================================================
 * The moderation queue endpoint — moderator-facing.
 *
 * GET returns the queue of flagged content awaiting review. The status
 * filter accepts "pending" (default), "approved", "removed", "blurred",
 * "dismissed", or "all".
 *
 * POST is the approve / reject endpoint:
 *   Body: { flagId: string, decision: "approve" | "remove" | "blur" | "dismiss", note?: string }
 *   Returns 200 { ok: true, flag } on success.
 *   Returns 400 on missing/invalid body.
 *   Returns 401 when no session is present (moderation is a privileged action).
 *   Returns 403 when the session user is not in the admin list.
 *   Returns 404 when the flag id doesn't exist.
 *   Returns 409 when the flag has already been reviewed.
 *
 * Auth: requires a valid `cirkle-session` cookie + `isAdmin: true`. The
 * `requireAdmin` wrapper enforces this — handlers below it can assume the
 * session is present + cleared.
 * ============================================================================
 */
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getModerationQueue, reviewContent } from "@/lib/moderation-service";
import {
  requireAdmin,
  type AuthedHandler,
} from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/moderation/queue?status=pending&limit=50
 * Returns the moderation queue for moderator review.
 *
 * Status filter: "pending" (default), "approved", "removed", "blurred",
 * "dismissed", or "all".
 *
 * Public — currently NOT auth-gated so the queue preview can render for
 * moderators-in-training. The POST handler below IS admin-gated.
 */
export async function GET(req: NextRequest) {
  try {
    const status = (req.nextUrl.searchParams.get("status") || "pending") as any;
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "50");
    const limit = isFinite(limitRaw) ? limitRaw : 50;
    const items = await getModerationQueue(status, limit);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("[/api/moderation/queue GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load queue" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/moderation/queue — approve / reject a flagged item.
 *
 * Body:
 *   {
 *     flagId: string,
 *     decision: "approve" | "remove" | "blur" | "dismiss",
 *     note?: string
 *   }
 *
 * Returns:
 *   200 { ok: true, flag } on success.
 *   400 on missing/invalid body.
 *   401 / 403 when the caller is not an admin.
 *   404 when the flag id doesn't exist.
 *   409 when the flag has already been reviewed.
 *
 * Wrapped in `requireAdmin` — moderators must be logged in + cleared.
 * The reviewer's username is recorded on the flag row.
 */
const postHandler: AuthedHandler<NextRequest, { params: Record<string, string> }> = async (
  req,
  _ctx,
  session,
) => {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON body" },
      { status: 400 },
    );
  }

  const flagId = typeof body?.flagId === "string" ? body.flagId.trim() : "";
  const decision = typeof body?.decision === "string" ? body.decision.trim().toLowerCase() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : null;

  if (!flagId) {
    return NextResponse.json(
      { ok: false, error: "flagId is required" },
      { status: 400 },
    );
  }
  const validDecisions = ["approve", "remove", "blur", "dismiss"];
  if (!validDecisions.includes(decision)) {
    return NextResponse.json(
      { ok: false, error: `decision must be one of: ${validDecisions.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const flag = await reviewContent({
      flagId,
      decision: decision as any,
      reviewer: session.username,
      note,
    });
    logger.info("[/api/moderation/queue POST] reviewed", {
      flagId,
      decision,
      reviewer: session.username,
    });
    return NextResponse.json(
      { ok: true, flag },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[/api/moderation/queue POST] error", { error: msg, flagId });
    // Map service errors to HTTP codes.
    if (msg.includes("not found")) {
      return NextResponse.json({ ok: false, error: msg }, { status: 404 });
    }
    if (msg.includes("already reviewed")) {
      return NextResponse.json({ ok: false, error: msg }, { status: 409 });
    }
    return NextResponse.json(
      { ok: false, error: msg || "failed to review flag" },
      { status: 500 },
    );
  }
};

export const POST = requireAdmin(postHandler);
