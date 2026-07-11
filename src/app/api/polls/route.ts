import { NextRequest, NextResponse } from "next/server";
import { createPoll, listPollsByUser, POLL_DURATIONS } from "@/lib/polls";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Polls — list + create. Blueprint §9.3.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/polls?username=<handle>
 * Lists polls created by a user, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const username = normalizeUsername(req.nextUrl.searchParams.get("username"));
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    const polls = await listPollsByUser(username);
    return NextResponse.json({ polls });
  } catch (err) {
    logger.error("[/api/polls GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list polls" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/polls
 * Body: {
 *   question: string,
 *   options: string[],          // 2–6 labels
 *   createdBy: string,
 *   duration?: string|number,   // "1h"|"6h"|"24h"|"3d"|"7d" or seconds
 *   postId?: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const question = typeof body.question === "string" ? body.question : "";
    const opts = Array.isArray(body.options)
      ? (body.options as unknown[]).filter((o): o is string => typeof o === "string")
      : [];
    const createdBy = normalizeUsername(body.createdBy);
    if (!createdBy) return NextResponse.json({ error: "createdBy is required" }, { status: 400 });

    let duration: number;
    if (typeof body.duration === "number") {
      duration = body.duration;
    } else if (typeof body.duration === "string" && POLL_DURATIONS[body.duration]) {
      duration = POLL_DURATIONS[body.duration];
    } else {
      duration = POLL_DURATIONS["24h"];
    }

    const postId = typeof body.postId === "string" && body.postId.trim() ? body.postId.trim() : null;

    const poll = await createPoll({
      question,
      options: opts,
      createdBy,
      duration,
      postId,
    });
    return NextResponse.json({ poll }, { status: 201 });
  } catch (err) {
    logger.error("[/api/polls POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create poll" },
      { status: 500 },
    );
  }
}
