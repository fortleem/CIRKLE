// @ts-nocheck
/**
 * Contact Online Status (F5) — user presence + last-seen.
 *
 * Each user has an `OnlineStatus` row tracking whether they're online,
 * away, or offline, plus their `lastSeen` timestamp.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, update, nowISO } from "@/lib/feature-store";

export type StatusKind = "online" | "offline" | "away";

export interface OnlineStatus {
  userId: string;
  status: StatusKind;
  lastSeen: string;
}

const STORE = "onlineStatus";

function normalize(userId: string): string {
  return (userId || "").trim().toLowerCase().replace(/^@/, "");
}

export async function getOnlineStatus(userId: string): Promise<OnlineStatus> {
  const id = normalize(userId);
  if (!id) return { userId: "", status: "offline", lastSeen: nowISO() };
  const existing = get<OnlineStatus>(STORE, id);
  if (existing) {
    // Auto-away: if online but lastSeen > 5 min ago, mark away
    if (existing.status === "online") {
      const ageMs = Date.now() - new Date(existing.lastSeen).getTime();
      if (ageMs > 5 * 60 * 1000) {
        const updated = update<OnlineStatus>(STORE, id, { status: "away" });
        return updated ?? existing;
      }
    }
    return existing;
  }
  // Default: offline
  const rec: OnlineStatus = { userId: id, status: "offline", lastSeen: nowISO() };
  put(STORE, rec);
  return rec;
}

export async function setOnline(userId: string): Promise<OnlineStatus> {
  const id = normalize(userId);
  if (!id) throw new Error("userId is required");
  const existing = get<OnlineStatus>(STORE, id);
  if (existing) {
    return update<OnlineStatus>(STORE, id, { status: "online", lastSeen: nowISO() }) ?? existing;
  }
  const rec: OnlineStatus = { userId: id, status: "online", lastSeen: nowISO() };
  put(STORE, rec);
  return rec;
}

export async function setOffline(userId: string): Promise<OnlineStatus> {
  const id = normalize(userId);
  if (!id) throw new Error("userId is required");
  const existing = get<OnlineStatus>(STORE, id);
  if (existing) {
    return update<OnlineStatus>(STORE, id, { status: "offline", lastSeen: nowISO() }) ?? existing;
  }
  const rec: OnlineStatus = { userId: id, status: "offline", lastSeen: nowISO() };
  put(STORE, rec);
  return rec;
}

export async function setAway(userId: string): Promise<OnlineStatus> {
  const id = normalize(userId);
  if (!id) throw new Error("userId is required");
  const existing = get<OnlineStatus>(STORE, id);
  if (existing) {
    return update<OnlineStatus>(STORE, id, { status: "away", lastSeen: nowISO() }) ?? existing;
  }
  const rec: OnlineStatus = { userId: id, status: "away", lastSeen: nowISO() };
  put(STORE, rec);
  return rec;
}

export async function getLastSeen(userId: string): Promise<string> {
  const s = await getOnlineStatus(userId);
  return s.lastSeen;
}

export async function getBulkStatuses(userIds: string[]): Promise<OnlineStatus[]> {
  return Promise.all(userIds.map((u) => getOnlineStatus(u)));
}

export async function listOnlineUsers(limit = 100): Promise<OnlineStatus[]> {
  return find<OnlineStatus>(STORE, (s) => s.status === "online").slice(0, limit);
}
