import { NextRequest, NextResponse } from "next/server";
import { votePoll } from "@/lib/polls";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Polls — cast a vote. One vote per user per poll (enforced by the
// @@unique([pollId, username]) on PollVote). Blueprint §9.3.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * POST /api/polls/[id]/vote
 * Body: { optionId: string, username: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: pollId } = await params;
    if (!pollId) return NextResponse.json({ error: "poll id is required" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const optionId = typeof body.optionId === "string" ? body.optionId.trim() : "";
    if (!optionId) return NextResponse.json({ error: "optionId is required" }, { status: 400 });

    const username = normalizeUsername(body.username);
    if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

    await votePoll(pollId, optionId, username);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to cast vote";
    logger.error("[/api/polls/[id]/vote POST] error", { error: msg });
    // Distinguish user errors (already voted, expired, invalid option) from
    // server errors so the UI can show the right message.
    const isUserError =
      msg.includes("already voted") ||
      msg.includes("closed") ||
      msg.includes("Invalid option") ||
      msg.includes("not found");
    return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 });
  }
}
