// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  createNestedFolder, getNestedFolders, getFolderTree, moveFolder,
  createSmartFilter, listSmartFilters, listSmartFiltersForFolder, deleteSmartFilter,
  applySmartFilters,
  createShareLink, getShareLink, listShareLinks, revokeShareLink,
  bulkAssignConversations,
  getFolderStats,
  type ConversationSignal,
} from "@/lib/chat-folders-plus";
import { logger } from "@/lib/logger";

/**
 * GET /api/chat-folders-plus
 *   ?userId=...                 → flat list of nested folders
 *   ?userId=...&tree=1          → tree structure
 *   ?userId=...&shares=1        → list of share links
 *   ?userId=...&filters=1       → list of smart filters
 *   ?folderId=...&stats=1&userId=... → folder stats
 *   ?shareCode=...&view=1       → public share view
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId") || "";
    const folderId = sp.get("folderId") || "";
    const shareCode = sp.get("shareCode") || "";

    if (shareCode && sp.get("view") === "1") {
      const link = await getShareLink(shareCode);
      if (!link) return NextResponse.json({ error: "share link not found" }, { status: 404 });
      return NextResponse.json({ share: link });
    }

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    if (sp.get("shares") === "1") {
      const shares = await listShareLinks(userId);
      return NextResponse.json({ shares });
    }
    if (sp.get("filters") === "1") {
      const filters = await listSmartFilters(userId);
      return NextResponse.json({ filters });
    }
    if (folderId && sp.get("stats") === "1") {
      const stats = await getFolderStats(folderId, userId);
      return NextResponse.json({ stats });
    }
    if (sp.get("tree") === "1") {
      const tree = await getFolderTree(userId);
      return NextResponse.json({ tree });
    }
    const folders = await getNestedFolders(userId);
    return NextResponse.json({ folders });
  } catch (err) {
    logger.error("[/api/chat-folders-plus GET]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to fetch" }, { status: 500 });
  }
}

/**
 * POST /api/chat-folders-plus
 *   { action: 'create', userId, name, icon?, color?, parentId? }
 *   { action: 'move', folderId, newParentId }
 *   { action: 'bulkAssign', folderId, conversationIds[], userId }
 *   { action: 'createFilter', folderId, userId, rule, param }
 *   { action: 'deleteFilter', filterId }
 *   { action: 'applyFilters', userId, signals: ConversationSignal[] }
 *   { action: 'createShare', folderId, ownerId, expiresInHours? }
 *   { action: 'revokeShare', shareId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "create") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const name = typeof body.name === "string" ? body.name : "";
      const icon = typeof body.icon === "string" ? body.icon : undefined;
      const color = typeof body.color === "string" ? body.color : undefined;
      const parentId = typeof body.parentId === "string" ? body.parentId : null;
      if (!userId || !name) {
        return NextResponse.json({ error: "userId + name required" }, { status: 400 });
      }
      const folder = await createNestedFolder({ userId, name, icon, color, parentId });
      return NextResponse.json({ folder }, { status: 201 });
    }

    if (action === "move") {
      const folderId = typeof body.folderId === "string" ? body.folderId : "";
      const newParentId = typeof body.newParentId === "string" ? body.newParentId : null;
      if (!folderId) return NextResponse.json({ error: "folderId required" }, { status: 400 });
      const folder = await moveFolder(folderId, newParentId);
      return NextResponse.json({ folder });
    }

    if (action === "bulkAssign") {
      const folderId = typeof body.folderId === "string" ? body.folderId : "";
      const userId = typeof body.userId === "string" ? body.userId : "";
      const conversationIds = Array.isArray(body.conversationIds) ? body.conversationIds as string[] : [];
      if (!folderId || !userId) {
        return NextResponse.json({ error: "folderId + userId required" }, { status: 400 });
      }
      const result = await bulkAssignConversations(folderId, conversationIds, userId);
      return NextResponse.json(result);
    }

    if (action === "createFilter") {
      const folderId = typeof body.folderId === "string" ? body.folderId : "";
      const userId = typeof body.userId === "string" ? body.userId : "";
      const rule = (body.rule as "unread_gt" | "mention_eq" | "type_eq" | "last_activity_within") || "unread_gt";
      const param = typeof body.param === "string" ? body.param : "0";
      if (!folderId || !userId) {
        return NextResponse.json({ error: "folderId + userId required" }, { status: 400 });
      }
      const filter = await createSmartFilter({ folderId, userId, rule, param });
      return NextResponse.json({ filter }, { status: 201 });
    }

    if (action === "deleteFilter") {
      const filterId = typeof body.filterId === "string" ? body.filterId : "";
      if (!filterId) return NextResponse.json({ error: "filterId required" }, { status: 400 });
      const ok = await deleteSmartFilter(filterId);
      return NextResponse.json({ deleted: ok });
    }

    if (action === "applyFilters") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const signals = Array.isArray(body.signals) ? body.signals as ConversationSignal[] : [];
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const result = await applySmartFilters(userId, signals);
      return NextResponse.json({ applied: result });
    }

    if (action === "createShare") {
      const folderId = typeof body.folderId === "string" ? body.folderId : "";
      const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
      const expiresInHours = typeof body.expiresInHours === "number" ? body.expiresInHours : undefined;
      if (!folderId || !ownerId) {
        return NextResponse.json({ error: "folderId + ownerId required" }, { status: 400 });
      }
      const share = await createShareLink({ folderId, ownerId, expiresInHours });
      return NextResponse.json({ share }, { status: 201 });
    }

    if (action === "revokeShare") {
      const shareId = typeof body.shareId === "string" ? body.shareId : "";
      if (!shareId) return NextResponse.json({ error: "shareId required" }, { status: 400 });
      const ok = await revokeShareLink(shareId);
      return NextResponse.json({ revoked: ok });
    }

    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    logger.error("[/api/chat-folders-plus POST]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to mutate" }, { status: 500 });
  }
}
