// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  createMultiFrameStory, getStoryGroup, listUserStoryGroups,
  reactToStoryFrame, listReactions, getReactionSummary,
  replyToStoryFrame, listRepliesForAuthor, listRepliesForFrame,
  createHighlight, listHighlights, addStoryToHighlight, removeStoryFromHighlight, deleteHighlight,
  archiveStory, listArchive, deleteArchiveEntry,
  getStoryStats,
} from "@/lib/story-status-plus";
import { logger } from "@/lib/logger";

/**
 * GET /api/stories-plus
 *   ?authorId=...&groups=1                  → multi-frame groups for an author
 *   ?authorId=...&highlights=1              → author's highlights
 *   ?authorId=...&archive=1                 → author's archive
 *   ?authorId=...&stats=1                   → author's story stats
 *   ?frameId=...&reactions=1                → reactions summary
 *   ?frameId=...&replies=1                  → replies for a frame
 *   ?authorId=...&authorReplies=1           → replies to author's stories
 *   ?groupId=...&group=1                    → group details + frames
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const authorId = sp.get("authorId") || "";
    const frameId = sp.get("frameId") || "";
    const groupId = sp.get("groupId") || "";

    if (sp.get("groups") === "1" && authorId) {
      const groups = await listUserStoryGroups(authorId);
      return NextResponse.json({ groups });
    }
    if (sp.get("highlights") === "1" && authorId) {
      const highlights = await listHighlights(authorId);
      return NextResponse.json({ highlights });
    }
    if (sp.get("archive") === "1" && authorId) {
      const archive = await listArchive(authorId);
      return NextResponse.json({ archive });
    }
    if (sp.get("stats") === "1" && authorId) {
      const stats = await getStoryStats(authorId);
      return NextResponse.json({ stats });
    }
    if (sp.get("reactions") === "1" && frameId) {
      const summary = await getReactionSummary(frameId);
      return NextResponse.json({ reactions: summary });
    }
    if (sp.get("replies") === "1" && frameId) {
      const replies = await listRepliesForFrame(frameId);
      return NextResponse.json({ replies });
    }
    if (sp.get("authorReplies") === "1" && authorId) {
      const replies = await listRepliesForAuthor(authorId);
      return NextResponse.json({ replies });
    }
    if (sp.get("group") === "1" && groupId) {
      const result = await getStoryGroup(groupId);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "specify one of groups/highlights/archive/stats/reactions/replies/group" }, { status: 400 });
  } catch (err) {
    logger.error("[/api/stories-plus GET]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to fetch" }, { status: 500 });
  }
}

/**
 * POST /api/stories-plus
 *   { action: 'createMultiFrame', authorId, frames: [{type, mediaUrl?, caption?, bgColor?}] }
 *   { action: 'react',  frameId, reactorId, emoji }
 *   { action: 'reply',  frameId, senderId, body }
 *   { action: 'createHighlight',   authorId, name, emoji?, coverColor?, storyIds? }
 *   { action: 'addToHighlight',    highlightId, storyId }
 *   { action: 'removeFromHighlight', highlightId, storyId }
 *   { action: 'deleteHighlight',   highlightId }
 *   { action: 'archiveStory',      storyId }
 *   { action: 'deleteArchiveEntry', entryId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "createMultiFrame") {
      const authorId = typeof body.authorId === "string" ? body.authorId : "";
      const frames = Array.isArray(body.frames) ? body.frames : [];
      if (!authorId || frames.length === 0) {
        return NextResponse.json({ error: "authorId + at least 1 frame required" }, { status: 400 });
      }
      const result = await createMultiFrameStory({ authorId, frames: frames as any });
      return NextResponse.json(result, { status: 201 });
    }
    if (action === "react") {
      const frameId = typeof body.frameId === "string" ? body.frameId : "";
      const reactorId = typeof body.reactorId === "string" ? body.reactorId : "";
      const emoji = typeof body.emoji === "string" ? body.emoji : "";
      if (!frameId || !reactorId || !emoji) {
        return NextResponse.json({ error: "frameId + reactorId + emoji required" }, { status: 400 });
      }
      const reaction = await reactToStoryFrame(frameId, reactorId, emoji);
      return NextResponse.json({ reaction }, { status: 201 });
    }
    if (action === "reply") {
      const frameId = typeof body.frameId === "string" ? body.frameId : "";
      const senderId = typeof body.senderId === "string" ? body.senderId : "";
      const replyBody = typeof body.body === "string" ? body.body : "";
      if (!frameId || !senderId || !replyBody) {
        return NextResponse.json({ error: "frameId + senderId + body required" }, { status: 400 });
      }
      const reply = await replyToStoryFrame(frameId, senderId, replyBody);
      return NextResponse.json({ reply }, { status: 201 });
    }
    if (action === "createHighlight") {
      const authorId = typeof body.authorId === "string" ? body.authorId : "";
      const name = typeof body.name === "string" ? body.name : "";
      const emoji = typeof body.emoji === "string" ? body.emoji : undefined;
      const coverColor = typeof body.coverColor === "string" ? body.coverColor : undefined;
      const storyIds = Array.isArray(body.storyIds) ? body.storyIds as string[] : [];
      if (!authorId || !name) {
        return NextResponse.json({ error: "authorId + name required" }, { status: 400 });
      }
      const highlight = await createHighlight({ authorId, name, emoji, coverColor, storyIds });
      return NextResponse.json({ highlight }, { status: 201 });
    }
    if (action === "addToHighlight") {
      const highlightId = typeof body.highlightId === "string" ? body.highlightId : "";
      const storyId = typeof body.storyId === "string" ? body.storyId : "";
      if (!highlightId || !storyId) {
        return NextResponse.json({ error: "highlightId + storyId required" }, { status: 400 });
      }
      const h = await addStoryToHighlight(highlightId, storyId);
      return NextResponse.json({ highlight: h });
    }
    if (action === "removeFromHighlight") {
      const highlightId = typeof body.highlightId === "string" ? body.highlightId : "";
      const storyId = typeof body.storyId === "string" ? body.storyId : "";
      if (!highlightId || !storyId) {
        return NextResponse.json({ error: "highlightId + storyId required" }, { status: 400 });
      }
      const h = await removeStoryFromHighlight(highlightId, storyId);
      return NextResponse.json({ highlight: h });
    }
    if (action === "deleteHighlight") {
      const hid = typeof body.highlightId === "string" ? body.highlightId : "";
      if (!hid) return NextResponse.json({ error: "highlightId required" }, { status: 400 });
      const ok = await deleteHighlight(hid);
      return NextResponse.json({ deleted: ok });
    }
    if (action === "archiveStory") {
      const sid = typeof body.storyId === "string" ? body.storyId : "";
      if (!sid) return NextResponse.json({ error: "storyId required" }, { status: 400 });
      const entry = await archiveStory(sid);
      return NextResponse.json({ entry }, { status: 201 });
    }
    if (action === "deleteArchiveEntry") {
      const eid = typeof body.entryId === "string" ? body.entryId : "";
      if (!eid) return NextResponse.json({ error: "entryId required" }, { status: 400 });
      const ok = await deleteArchiveEntry(eid);
      return NextResponse.json({ deleted: ok });
    }

    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    logger.error("[/api/stories-plus POST]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to mutate" }, { status: 500 });
  }
}
