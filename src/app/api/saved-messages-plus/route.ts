// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  createCollection, getOrCreateFavoritesCollection, listCollections, deleteCollection,
  createTag, listTags, deleteTag,
  assignToCollection, applyTags, toggleFavorite, setColorLabel,
  listWithMeta, exportAll, toMarkdown,
  type FilterOptions,
} from "@/lib/saved-messages-plus";
import { logger } from "@/lib/logger";

/**
 * GET /api/saved-messages-plus
 *   ?userId=...                            → list collections + tags + saved (with meta)
 *   ?userId=...&collections=1              → just collections
 *   ?userId=...&tags=1                     → just tags
 *   ?userId=...&collectionId=...           → filter saved by collection
 *   ?userId=...&favorites=1                → favorites only
 *   ?userId=...&export=md|json             → export payload
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId") || "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    if (sp.get("collections") === "1") {
      const collections = await listCollections(userId);
      return NextResponse.json({ collections });
    }
    if (sp.get("tags") === "1") {
      const tags = await listTags(userId);
      return NextResponse.json({ tags });
    }
    const exportFmt = sp.get("export");
    if (exportFmt) {
      const payload = await exportAll(userId);
      if (exportFmt === "md") {
        return new NextResponse(toMarkdown(payload), {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="saved-messages.md"`,
          },
        });
      }
      return NextResponse.json(payload);
    }
    const filter: FilterOptions = {};
    if (sp.get("collectionId")) filter.collectionId = sp.get("collectionId")!;
    if (sp.get("favorites") === "1") filter.favoritesOnly = true;
    if (sp.get("color")) filter.color = sp.get("color")!;
    const [collections, tags, items] = await Promise.all([
      listCollections(userId),
      listTags(userId),
      listWithMeta(userId, filter),
    ]);
    return NextResponse.json({
      collections,
      tags,
      items,
      total: items.length,
    });
  } catch (err) {
    logger.error("[/api/saved-messages-plus GET]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to fetch" }, { status: 500 });
  }
}

/**
 * POST /api/saved-messages-plus
 *   { action: 'createCollection', userId, name, emoji?, color? }
 *   { action: 'deleteCollection', collectionId }
 *   { action: 'createTag', userId, label, color? }
 *   { action: 'deleteTag', tagId }
 *   { action: 'assignToCollection', userId, savedMessageId, collectionId }
 *   { action: 'applyTags', userId, savedMessageId, tagIds[] }
 *   { action: 'toggleFavorite', userId, savedMessageId }
 *   { action: 'setColor', userId, savedMessageId, color }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "createCollection") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const name = typeof body.name === "string" ? body.name : "";
      const emoji = typeof body.emoji === "string" ? body.emoji : undefined;
      const color = typeof body.color === "string" ? body.color : undefined;
      if (!userId || !name) return NextResponse.json({ error: "userId + name required" }, { status: 400 });
      const c = await createCollection({ userId, name, emoji, color });
      return NextResponse.json({ collection: c }, { status: 201 });
    }
    if (action === "deleteCollection") {
      const cid = typeof body.collectionId === "string" ? body.collectionId : "";
      if (!cid) return NextResponse.json({ error: "collectionId required" }, { status: 400 });
      const ok = await deleteCollection(cid);
      return NextResponse.json({ deleted: ok });
    }
    if (action === "createTag") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const label = typeof body.label === "string" ? body.label : "";
      const color = typeof body.color === "string" ? body.color : undefined;
      if (!userId || !label) return NextResponse.json({ error: "userId + label required" }, { status: 400 });
      const t = await createTag({ userId, label, color });
      return NextResponse.json({ tag: t }, { status: 201 });
    }
    if (action === "deleteTag") {
      const tid = typeof body.tagId === "string" ? body.tagId : "";
      if (!tid) return NextResponse.json({ error: "tagId required" }, { status: 400 });
      const ok = await deleteTag(tid);
      return NextResponse.json({ deleted: ok });
    }
    if (action === "assignToCollection") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const savedMessageId = typeof body.savedMessageId === "string" ? body.savedMessageId : "";
      const collectionId = typeof body.collectionId === "string" ? body.collectionId : null;
      if (!userId || !savedMessageId) {
        return NextResponse.json({ error: "userId + savedMessageId required" }, { status: 400 });
      }
      const meta = await assignToCollection(userId, savedMessageId, collectionId);
      return NextResponse.json({ meta });
    }
    if (action === "applyTags") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const savedMessageId = typeof body.savedMessageId === "string" ? body.savedMessageId : "";
      const tagIds = Array.isArray(body.tagIds) ? body.tagIds as string[] : [];
      if (!userId || !savedMessageId) {
        return NextResponse.json({ error: "userId + savedMessageId required" }, { status: 400 });
      }
      const meta = await applyTags(userId, savedMessageId, tagIds);
      return NextResponse.json({ meta });
    }
    if (action === "toggleFavorite") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const savedMessageId = typeof body.savedMessageId === "string" ? body.savedMessageId : "";
      if (!userId || !savedMessageId) {
        return NextResponse.json({ error: "userId + savedMessageId required" }, { status: 400 });
      }
      // Ensure favorites collection exists
      await getOrCreateFavoritesCollection(userId);
      const meta = await toggleFavorite(userId, savedMessageId);
      return NextResponse.json({ meta });
    }
    if (action === "setColor") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const savedMessageId = typeof body.savedMessageId === "string" ? body.savedMessageId : "";
      const color = typeof body.color === "string" ? body.color : "#94a3b8";
      if (!userId || !savedMessageId) {
        return NextResponse.json({ error: "userId + savedMessageId required" }, { status: 400 });
      }
      const meta = await setColorLabel(userId, savedMessageId, color);
      return NextResponse.json({ meta });
    }

    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    logger.error("[/api/saved-messages-plus POST]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to mutate" }, { status: 500 });
  }
}
