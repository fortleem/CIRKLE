// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createStory, getStories, pruneExpired } from "@/lib/story-status";
import { logger } from "@/lib/logger";

/**
 * GET /api/stories?viewerId=...&authorIds=...&includeExpired=false
 * Returns stories visible to the viewer.
 */
export async function GET(req: NextRequest) {
  try {
    const viewerId = req.nextUrl.searchParams.get("viewerId") || "";
    if (!viewerId) return NextResponse.json({ error: "viewerId is required" }, { status: 400 });
    const authorIdsRaw = req.nextUrl.searchParams.get("authorIds") || "";
    const authorIds = authorIdsRaw ? authorIdsRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const includeExpired = req.nextUrl.searchParams.get("includeExpired") === "true";
    // GC expired stories opportunistically
    await pruneExpired();
    const stories = await getStories({ viewerId, authorIds, includeExpired });
    return NextResponse.json({ stories });
  } catch (err) {
    logger.error("[/api/stories GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list stories" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/stories
 * Body: { authorId, type?: 'photo'|'video'|'text', mediaUrl?, caption?, bgColor? }
 * Creates a new story (auto-expires after 24h).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const story = await createStory({
      authorId: typeof body.authorId === "string" ? body.authorId : "",
      type: typeof body.type === "string" ? (body.type as any) : "text",
      mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : null,
      caption: typeof body.caption === "string" ? body.caption : null,
      bgColor: typeof body.bgColor === "string" ? body.bgColor : null,
    });
    logger.info("[/api/stories POST] created", { id: story.id, authorId: story.authorId });
    return NextResponse.json({ story }, { status: 201 });
  } catch (err) {
    logger.error("[/api/stories POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create story" },
      { status: 500 },
    );
  }
}
