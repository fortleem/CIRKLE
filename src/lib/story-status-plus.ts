// @ts-nocheck
/**
 * Story-Style Status — PLUS (F9+).
 *
 * Polish layer on top of `story-status.ts`.
 * Adds: story highlights (permanent collections of past stories),
 * multi-frame stories (post a carousel of up to 10 frames),
 * story reactions (emoji reactions by viewers), story replies
 * (viewer → author private message reply), and a story archive
 * (auto-archive expired stories for the author to highlight later).
 *
 * Storage: in-memory feature-store (Prisma schema frozen for this task).
 */
import "server-only";
import { get, put, find, findOne, remove, update, nowISO } from "@/lib/feature-store";
import { createStory as baseCreateStory, getStory as baseGetStory, STORY_DURATION_MS, type Story, type StoryType } from "@/lib/story-status";

export interface StoryHighlight {
  id: string;
  authorId: string;
  name: string;
  emoji: string;
  coverColor: string;
  storyIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryFrame {
  id: string;
  storyGroupId: string;
  authorId: string;
  order: number;
  type: StoryType;
  mediaUrl: string | null;
  caption: string | null;
  bgColor: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface StoryReaction {
  id: string;
  storyFrameId: string;
  reactorId: string;
  emoji: string;
  createdAt: string;
}

export interface StoryReply {
  id: string;
  storyFrameId: string;
  authorId: string; // story author
  reactorId: string; // reply sender
  body: string;
  createdAt: string;
}

export interface StoryArchiveEntry {
  id: string;
  storyId: string;
  authorId: string;
  type: StoryType;
  mediaUrl: string | null;
  caption: string | null;
  bgColor: string | null;
  archivedAt: string;
  originalCreatedAt: string;
}

const HIGHLIGHTS = "storyHighlight";
const FRAMES = "storyFrame";
const GROUPS = "storyGroup";
const REACTIONS = "storyReaction";
const REPLIES = "storyReply";
const ARCHIVE = "storyArchive";

function normalizeUser(u: string): string {
  return (u || "").trim().toLowerCase().replace(/^@/, "");
}

// ---------- Multi-frame stories (carousel) ----------

export interface CreateMultiFrameInput {
  authorId: string;
  frames: Array<{
    type: StoryType;
    mediaUrl?: string | null;
    caption?: string | null;
    bgColor?: string | null;
  }>;
}

export async function createMultiFrameStory(input: CreateMultiFrameInput): Promise<{
  groupId: string;
  frames: StoryFrame[];
}> {
  const authorId = normalizeUser(input.authorId);
  if (!authorId) throw new Error("authorId is required");
  if (input.frames.length === 0) throw new Error("at least 1 frame required");
  if (input.frames.length > 10) throw new Error("max 10 frames per story");
  const groupId = `grp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();
  const expiresAt = new Date(now + STORY_DURATION_MS).toISOString();
  const frames: StoryFrame[] = input.frames.map((f, i) => {
    if (!["photo", "video", "text"].includes(f.type)) {
      throw new Error(`invalid frame type at index ${i}`);
    }
    if (f.type !== "text" && !f.mediaUrl) {
      throw new Error(`mediaUrl required for ${f.type} frame at index ${i}`);
    }
    return {
      id: `frm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}_${i}`,
      storyGroupId: groupId,
      authorId,
      order: i,
      type: f.type,
      mediaUrl: f.mediaUrl ?? null,
      caption: f.caption ? f.caption.trim().slice(0, 280) : null,
      bgColor: f.bgColor ?? null,
      createdAt: nowISO(),
      expiresAt,
    };
  });
  for (const f of frames) put(FRAMES, f);
  put(GROUPS, { id: groupId, authorId, createdAt: nowISO(), expiresAt });
  // Also create a base Story for the first frame so existing UI keeps working
  await baseCreateStory({
    authorId,
    type: frames[0].type,
    mediaUrl: frames[0].mediaUrl,
    caption: frames[0].caption,
    bgColor: frames[0].bgColor,
  }).catch(() => null);
  return { groupId, frames };
}

export async function getStoryGroup(groupId: string): Promise<{ group: { id: string; authorId: string; createdAt: string; expiresAt: string } | null; frames: StoryFrame[] }> {
  const group = get<{ id: string; authorId: string; createdAt: string; expiresAt: string }>(GROUPS, groupId);
  const frames = find<StoryFrame>(FRAMES, (f) => f.storyGroupId === groupId)
    .sort((a, b) => a.order - b.order);
  return { group, frames };
}

export async function listUserStoryGroups(authorId: string): Promise<{ id: string; createdAt: string; expiresAt: string; frameCount: number }[]> {
  const uid = normalizeUser(authorId);
  if (!uid) return [];
  const groups = find<{ id: string; authorId: string; createdAt: string; expiresAt: string }>(GROUPS, (g) => g.authorId === uid);
  return groups.map((g) => ({
    ...g,
    frameCount: find<StoryFrame>(FRAMES, (f) => f.storyGroupId === g.id).length,
  }));
}

// ---------- Reactions ----------

export async function reactToStoryFrame(
  frameId: string,
  reactorId: string,
  emoji: string,
): Promise<StoryReaction> {
  const frame = get<StoryFrame>(FRAMES, frameId);
  if (!frame) throw new Error("frame not found");
  const rid = normalizeUser(reactorId);
  if (!rid) throw new Error("reactorId is required");
  if (!emoji || emoji.length === 0) throw new Error("emoji is required");
  // Idempotent: one reaction per user per frame (replace existing)
  const existing = findOne<StoryReaction>(REACTIONS, (r) => r.storyFrameId === frameId && r.reactorId === rid);
  if (existing) {
    return update<StoryReaction>(REACTIONS, existing.id, { emoji }) as StoryReaction;
  }
  const reaction: StoryReaction = {
    id: `react_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    storyFrameId: frameId,
    reactorId: rid,
    emoji,
    createdAt: nowISO(),
  };
  put(REACTIONS, reaction);
  return reaction;
}

export async function listReactions(frameId: string): Promise<StoryReaction[]> {
  return find<StoryReaction>(REACTIONS, (r) => r.storyFrameId === frameId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getReactionSummary(frameId: string): Promise<{ emoji: string; count: number; users: string[] }[]> {
  const reactions = await listReactions(frameId);
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    if (!map.has(r.emoji)) map.set(r.emoji, []);
    map.get(r.emoji)!.push(r.reactorId);
  }
  return Array.from(map.entries()).map(([emoji, users]) => ({ emoji, count: users.length, users }));
}

// ---------- Replies ----------

export async function replyToStoryFrame(
  frameId: string,
  senderId: string,
  body: string,
): Promise<StoryReply> {
  const frame = get<StoryFrame>(FRAMES, frameId);
  if (!frame) throw new Error("frame not found");
  const sid = normalizeUser(senderId);
  if (!sid) throw new Error("senderId is required");
  if (sid === frame.authorId) throw new Error("cannot reply to your own story");
  const trimmed = (body || "").trim().slice(0, 500);
  if (!trimmed) throw new Error("body is required");
  const reply: StoryReply = {
    id: `reply_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    storyFrameId: frameId,
    authorId: frame.authorId,
    reactorId: sid,
    body: trimmed,
    createdAt: nowISO(),
  };
  put(REPLIES, reply);
  return reply;
}

export async function listRepliesForAuthor(authorId: string): Promise<StoryReply[]> {
  const uid = normalizeUser(authorId);
  if (!uid) return [];
  return find<StoryReply>(REPLIES, (r) => r.authorId === uid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listRepliesForFrame(frameId: string): Promise<StoryReply[]> {
  return find<StoryReply>(REPLIES, (r) => r.storyFrameId === frameId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ---------- Highlights (permanent collections) ----------

export async function createHighlight(input: {
  authorId: string;
  name: string;
  emoji?: string;
  coverColor?: string;
  storyIds?: string[];
}): Promise<StoryHighlight> {
  const uid = normalizeUser(input.authorId);
  if (!uid) throw new Error("authorId is required");
  const name = (input.name || "").trim();
  if (!name) throw new Error("name is required");
  const existing = find<StoryHighlight>(HIGHLIGHTS, (h) => h.authorId === uid);
  if (existing.length >= 20) throw new Error("max 20 highlights per user");
  const highlight: StoryHighlight = {
    id: `hl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    authorId: uid,
    name,
    emoji: input.emoji || "⭐",
    coverColor: input.coverColor || "#10b981",
    storyIds: input.storyIds ?? [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  put(HIGHLIGHTS, highlight);
  return highlight;
}

export async function listHighlights(authorId: string): Promise<StoryHighlight[]> {
  const uid = normalizeUser(authorId);
  if (!uid) return [];
  return find<StoryHighlight>(HIGHLIGHTS, (h) => h.authorId === uid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addStoryToHighlight(highlightId: string, storyId: string): Promise<StoryHighlight | null> {
  const h = get<StoryHighlight>(HIGHLIGHTS, highlightId);
  if (!h) return null;
  if (h.storyIds.includes(storyId)) return h;
  const next = { ...h, storyIds: [...h.storyIds, storyId], updatedAt: nowISO() };
  return update<StoryHighlight>(HIGHLIGHTS, highlightId, { storyIds: next.storyIds, updatedAt: next.updatedAt });
}

export async function removeStoryFromHighlight(highlightId: string, storyId: string): Promise<StoryHighlight | null> {
  const h = get<StoryHighlight>(HIGHLIGHTS, highlightId);
  if (!h) return null;
  const next = h.storyIds.filter((s) => s !== storyId);
  return update<StoryHighlight>(HIGHLIGHTS, highlightId, { storyIds: next, updatedAt: nowISO() });
}

export async function deleteHighlight(highlightId: string): Promise<boolean> {
  return remove(HIGHLIGHTS, highlightId);
}

// ---------- Archive (auto-archive expired stories) ----------

export async function archiveStory(storyId: string): Promise<StoryArchiveEntry | null> {
  // Find the story in the base store
  const story = await baseGetStory(storyId);
  if (!story) return null;
  const existing = findOne<StoryArchiveEntry>(ARCHIVE, (a) => a.storyId === storyId);
  if (existing) return existing;
  const entry: StoryArchiveEntry = {
    id: `arc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    storyId,
    authorId: story.authorId,
    type: story.type,
    mediaUrl: story.mediaUrl,
    caption: story.caption,
    bgColor: story.bgColor,
    archivedAt: nowISO(),
    originalCreatedAt: story.createdAt,
  };
  put(ARCHIVE, entry);
  return entry;
}

export async function listArchive(authorId: string): Promise<StoryArchiveEntry[]> {
  const uid = normalizeUser(authorId);
  if (!uid) return [];
  return find<StoryArchiveEntry>(ARCHIVE, (a) => a.authorId === uid)
    .sort((a, b) => (a.originalCreatedAt < b.originalCreatedAt ? 1 : -1));
}

export async function deleteArchiveEntry(entryId: string): Promise<boolean> {
  return remove(ARCHIVE, entryId);
}

// ---------- Stats ----------

export interface StoryStats {
  totalStories: number;
  totalFrames: number;
  totalHighlights: number;
  totalReactions: number;
  totalReplies: number;
  archivedCount: number;
}

export async function getStoryStats(authorId: string): Promise<StoryStats> {
  const uid = normalizeUser(authorId);
  if (!uid) {
    return { totalStories: 0, totalFrames: 0, totalHighlights: 0, totalReactions: 0, totalReplies: 0, archivedCount: 0 };
  }
  const frames = find<StoryFrame>(FRAMES, (f) => f.authorId === uid);
  const frameIds = new Set(frames.map((f) => f.id));
  const reactions = find<StoryReaction>(REACTIONS, (r) => frameIds.has(r.storyFrameId));
  const replies = find<StoryReply>(REPLIES, (r) => r.authorId === uid);
  return {
    totalStories: find<{ id: string; authorId: string }>(GROUPS, (g) => g.authorId === uid).length,
    totalFrames: frames.length,
    totalHighlights: find<StoryHighlight>(HIGHLIGHTS, (h) => h.authorId === uid).length,
    totalReactions: reactions.length,
    totalReplies: replies.length,
    archivedCount: find<StoryArchiveEntry>(ARCHIVE, (a) => a.authorId === uid).length,
  };
}
