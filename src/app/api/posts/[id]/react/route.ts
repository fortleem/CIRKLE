import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/circle/seed";

/**
 * POST /api/posts/:id/react
 * Body: {kind?: "like", type?: "like"}
 *   - `kind` is the canonical field name.
 *   - `type` is accepted as a convenience alias (commonly used by client libs).
 * Toggles like: increment or decrement `likes`.
 * Returns {likes, liked}.
 *
 * Stateless toggle: we infer "liked" from the parity of the current like
 * count (even = not liked, odd = liked). This keeps the demo simple
 * without a per-user reaction ledger.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // ensureSeeded removed — no mock data();
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as { kind?: string; type?: string };
    const kind = body.kind ?? body.type;
    if (kind !== "like") {
      return NextResponse.json(
        { error: "only kind=like is supported" },
        { status: 400 },
      );
    }

    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "post not found" }, { status: 404 });
    }

    const liked = post.likes % 2 === 0; // even → will become liked
    const nextLikes = liked ? post.likes + 1 : Math.max(0, post.likes - 1);

    const updated = await db.post.update({
      where: { id },
      data: { likes: nextLikes },
    });

    return NextResponse.json({ likes: updated.likes, liked });
  } catch (err) {
    logger.error("[/api/posts/:id/react] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to react" },
      { status: 500 },
    );
  }
}
