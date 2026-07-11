import { NextRequest, NextResponse } from "next/server";
import { getPollResults } from "@/lib/polls";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Polls — live results. Returns the full tally + the requesting user's vote
// (if any). Blueprint §9.3.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/polls/[id]/results?username=<handle>
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: pollId } = await params;
    if (!pollId) return NextResponse.json({ error: "poll id is required" }, { status: 400 });

    const viewer = normalizeUsername(req.nextUrl.searchParams.get("username")) ?? undefined;
    const poll = await getPollResults(pollId, viewer);
    return NextResponse.json({ poll });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to get poll results";
    logger.error("[/api/polls/[id]/results GET] error", { error: msg });
    const isUserError = msg.includes("not found");
    return NextResponse.json({ error: msg }, { status: isUserError ? 404 : 500 });
  }
}
