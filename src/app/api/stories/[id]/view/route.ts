// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { viewStory } from "@/lib/story-status";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/stories/[id]/view
 * Body: { viewerId }
 * Marks the story as viewed by the viewer (idempotent).
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { viewerId?: string };
    const viewerId = typeof body.viewerId === "string" ? body.viewerId : "";
    if (!viewerId) return NextResponse.json({ error: "viewerId is required" }, { status: 400 });
    const story = await viewStory(id, viewerId);
    if (!story) return NextResponse.json({ error: "story not found" }, { status: 404 });
    return NextResponse.json({ story });
  } catch (err) {
    logger.error("[/api/stories/[id]/view POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to mark story as viewed" },
      { status: 500 },
    );
  }
}
