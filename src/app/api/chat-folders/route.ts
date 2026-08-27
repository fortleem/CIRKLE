// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createFolder, getFolders, getFolderAssignments } from "@/lib/chat-folders";
import { logger } from "@/lib/logger";

/**
 * GET /api/chat-folders?userId=...
 * Returns the user's folders + their assignments.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const [folders, assignments] = await Promise.all([
      getFolders(userId),
      getFolderAssignments(userId),
    ]);
    return NextResponse.json({ folders, assignments });
  } catch (err) {
    logger.error("[/api/chat-folders GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list folders" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chat-folders
 * Body: { userId, name, icon?, color? }
 * Creates a new folder.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const folder = await createFolder({
      userId: typeof body.userId === "string" ? body.userId : "",
      name: typeof body.name === "string" ? body.name : "",
      icon: typeof body.icon === "string" ? body.icon : "📁",
      color: typeof body.color === "string" ? body.color : "teal",
    });
    logger.info("[/api/chat-folders POST] created", { id: folder.id, userId: folder.userId });
    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    logger.error("[/api/chat-folders POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create folder" },
      { status: 500 },
    );
  }
}
