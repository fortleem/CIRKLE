import { NextRequest, NextResponse } from "next/server";
import { postBullet, getBullets } from "@/lib/bullet-comments";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Bullet Comments — list + post. Blueprint §26.10.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/posts/[id]/bullets?at=<seconds>
 * Lists bullets for a video, optionally truncated to a video position.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;
    if (!postId) return NextResponse.json({ error: "post id is required" }, { status: 400 });

    const atRaw = req.nextUrl.searchParams.get("at");
    const at = atRaw !== null ? Number(atRaw) : undefined;
    const bullets = await getBullets(postId, typeof at === "number" && isFinite(at) ? at : undefined);
    return NextResponse.json({ bullets });
  } catch (err) {
    logger.error("[/api/posts/[id]/bullets GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list bullets" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/posts/[id]/bullets
 * Body: { username, text, color?, timestamp }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;
    if (!postId) return NextResponse.json({ error: "post id is required" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const username = normalizeUsername(body.username);
    if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

    const text = typeof body.text === "string" ? body.text : "";
    const color = typeof body.color === "string" ? body.color : undefined;
    const timestamp = typeof body.timestamp === "number" ? body.timestamp : 0;

    const bullet = await postBullet({ postId, username, text, color, timestamp });
    return NextResponse.json({ bullet }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to post bullet";
    logger.error("[/api/posts/[id]/bullets POST] error", { error: msg });
    const isUserError =
      msg.includes("must be") || msg.includes("required") || msg.includes("not found");
    return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 });
  }
}
