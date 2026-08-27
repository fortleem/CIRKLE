// @ts-nocheck
/**
 * Synced Playback (F8) — group video player with synchronized controls.
 *
 * A "watch party" for groups: one member starts a video, others join.
 * Play/pause/seek actions are broadcast and synced. Each playback session
 * tracks the current time + last-action timestamp.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, all, update, parseArray, stringifyArray, nowISO } from "@/lib/feature-store";

export interface SyncedPlayback {
  id: string;
  videoId: string;
  conversationId: string;
  startedBy: string;
  state: "playing" | "paused" | "ended";
  currentTimeSec: number;
  /** When the state was last updated — used to project current time. */
  updatedAt: string;
  participants: string; // JSON array of userIds
  createdAt: string;
}

const STORE = "syncedPlayback";

export interface StartPlaybackInput {
  videoId: string;
  conversationId: string;
  startedBy: string;
}

export async function startSyncedPlayback(input: StartPlaybackInput): Promise<SyncedPlayback> {
  const videoId = (input.videoId || "").trim();
  if (!videoId) throw new Error("videoId is required");
  const conversationId = (input.conversationId || "").trim();
  if (!conversationId) throw new Error("conversationId is required");
  const startedBy = (input.startedBy || "").trim().toLowerCase().replace(/^@/, "");
  if (!startedBy) throw new Error("startedBy is required");
  const rec: SyncedPlayback = {
    id: `play_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    videoId,
    conversationId,
    startedBy,
    state: "playing",
    currentTimeSec: 0,
    updatedAt: nowISO(),
    participants: stringifyArray([startedBy]),
    createdAt: nowISO(),
  };
  put(STORE, rec);
  return rec;
}

export interface SyncInput {
  playbackId: string;
  state?: "playing" | "paused" | "ended";
  currentTimeSec?: number;
  userId: string; // who initiated the sync
}

export async function syncPlaybackTime(input: SyncInput): Promise<SyncedPlayback | null> {
  const cur = get<SyncedPlayback>(STORE, input.playbackId);
  if (!cur) return null;
  const patch: Partial<SyncedPlayback> = { updatedAt: nowISO() };
  if (input.state) patch.state = input.state;
  if (typeof input.currentTimeSec === "number" && input.currentTimeSec >= 0) {
    patch.currentTimeSec = Math.round(input.currentTimeSec * 100) / 100;
  }
  // Re-sync participants — the syncing user must be a participant
  const uid = (input.userId || "").trim().toLowerCase().replace(/^@/, "");
  if (uid) {
    const parts = parseArray<string>(cur.participants);
    if (!parts.includes(uid)) parts.push(uid);
    patch.participants = stringifyArray(parts);
  }
  return update<SyncedPlayback>(STORE, input.playbackId, patch);
}

export async function joinPlayback(
  playbackId: string,
  userId: string,
): Promise<SyncedPlayback | null> {
  const cur = get<SyncedPlayback>(STORE, playbackId);
  if (!cur) return null;
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!uid) throw new Error("userId is required");
  const parts = parseArray<string>(cur.participants);
  if (!parts.includes(uid)) parts.push(uid);
  return update<SyncedPlayback>(STORE, playbackId, { participants: stringifyArray(parts), updatedAt: nowISO() });
}

export async function leavePlayback(
  playbackId: string,
  userId: string,
): Promise<SyncedPlayback | null> {
  const cur = get<SyncedPlayback>(STORE, playbackId);
  if (!cur) return null;
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  const parts = parseArray<string>(cur.participants).filter((u) => u !== uid);
  return update<SyncedPlayback>(STORE, playbackId, { participants: stringifyArray(parts), updatedAt: nowISO() });
}

export async function getPlayback(playbackId: string): Promise<SyncedPlayback | null> {
  const cur = get<SyncedPlayback>(STORE, playbackId);
  if (!cur) return null;
  // Project current time if state is playing
  if (cur.state === "playing") {
    const elapsedSec = (Date.now() - new Date(cur.updatedAt).getTime()) / 1000;
    return {
      ...cur,
      currentTimeSec: Math.round((cur.currentTimeSec + elapsedSec) * 100) / 100,
    };
  }
  return cur;
}

export async function getPlaybackByConversation(conversationId: string): Promise<SyncedPlayback[]> {
  const cid = (conversationId || "").trim();
  return find<SyncedPlayback>(STORE, (p) => p.conversationId === cid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Projected "current time" — accounts for elapsed time since last update. */
export function projectedTime(playback: SyncedPlayback): number {
  if (playback.state !== "playing") return playback.currentTimeSec;
  const elapsedSec = (Date.now() - new Date(playback.updatedAt).getTime()) / 1000;
  return Math.round((playback.currentTimeSec + elapsedSec) * 100) / 100;
}

export function parseParticipants(playback: SyncedPlayback): string[] {
  return parseArray<string>(playback.participants);
}

export async function listAllPlaybacks(): Promise<SyncedPlayback[]> {
  return all<SyncedPlayback>(STORE);
}
