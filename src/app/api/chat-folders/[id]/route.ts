// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  addConversationToFolder,
  removeConversationFromFolder,
  getConversationsInFolder,
  deleteFolder,
  renameFolder,
} from "@/lib/chat-folders";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chat-folders/[id]
 * Returns the list of conversationIds in the folder.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const convs = await getConversationsInFolder(id);
    return NextResponse.json({ folderId: id, conversations: convs });
  } catch (err) {
    logger.error("[/api/chat-folders/[id] GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list folder conversations" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chat-folders/[id]
 * Body: { conversationId, userId, action?: 'add'|'remove'|'rename', name? }
 * Adds (default) or removes a conversation from the folder, or renames the folder.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "add";
    if (action === "rename") {
      const name = typeof body.name === "string" ? body.name : "";
      const folder = await renameFolder(id, name);
      if (!folder) return NextResponse.json({ error: "folder not found" }, { status: 404 });
      return NextResponse.json({ folder });
    }
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!conversationId) return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    if (action === "remove") {
      const ok = await removeConversationFromFolder(id, conversationId);
      return NextResponse.json({ removed: ok });
    }
    const assignment = await addConversationToFolder(id, conversationId, userId);
    logger.info("[/api/chat-folders/[id] POST] added", { folderId: id, conversationId });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    logger.error("[/api/chat-folders/[id] POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update folder" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/chat-folders/[id]?conversationId=...
 * - With conversationId: removes the conversation from the folder.
 * - Without: deletes the folder entirely (and all its assignments).
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    if (conversationId) {
      const ok = await removeConversationFromFolder(id, conversationId);
      return NextResponse.json({ removed: ok });
    }
    const ok = await deleteFolder(id);
    logger.info("[/api/chat-folders/[id] DELETE]", { folderId: id, deleted: ok });
    return NextResponse.json({ deleted: ok });
  } catch (err) {
    logger.error("[/api/chat-folders/[id] DELETE]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to delete folder" },
      { status: 500 },
    );
  }
}
