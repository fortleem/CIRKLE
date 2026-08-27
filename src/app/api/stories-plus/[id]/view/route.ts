// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  reactToStoryFrame,
  replyToStoryFrame,
} from "@/lib/story-status-plus";
import { logger } from "@/lib/logger";

/**
 * POST /api/stories-plus/[id]/view
 * Body: { reactorId?, emoji?, replyBody?, senderId? }
 *   - if emoji present → react to frame {id}
 *   - if replyBody + senderId present → reply to frame {id}
 *   - otherwise → no-op (use the base /api/stories/[id]/view for plain viewing)
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const emoji = typeof body.emoji === "string" ? body.emoji : "";
    const reactorId = typeof body.reactorId === "string" ? body.reactorId : "";
    const replyBody = typeof body.replyBody === "string" ? body.replyBody : "";
    const senderId = typeof body.senderId === "string" ? body.senderId : "";

    if (emoji) {
      if (!reactorId) return NextResponse.json({ error: "reactorId required" }, { status: 400 });
      const reaction = await reactToStoryFrame(id, reactorId, emoji);
      return NextResponse.json({ reaction }, { status: 201 });
    }
    if (replyBody) {
      if (!senderId) return NextResponse.json({ error: "senderId required" }, { status: 400 });
      const reply = await replyToStoryFrame(id, senderId, replyBody);
      return NextResponse.json({ reply }, { status: 201 });
    }

    return NextResponse.json({ error: "specify emoji (react) or replyBody + senderId (reply)" }, { status: 400 });
  } catch (err) {
    logger.error("[/api/stories-plus/[id]/view POST]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to mutate" }, { status: 500 });
  }
}
