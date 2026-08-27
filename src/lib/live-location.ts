// @ts-nocheck
/**
 * Live Location Sharing (B10) — time-boxed location sharing in chats.
 *
 * A user starts sharing their location in a conversation. Other members can
 * see the sharer's lat/lng on a map. Shares auto-expire after the chosen
 * duration (15min / 1h / 8h).
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, all, remove, update, nowISO } from "@/lib/feature-store";

export interface LiveLocationShare {
  id: string;
  conversationId: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  expiresAt: string;
  createdAt: string;
}

const STORE = "liveLocationShare";

export const SHARE_DURATIONS: { value: number; label: string }[] = [
  { value: 15 * 60, label: "15 minutes" },
  { value: 60 * 60, label: "1 hour" },
  { value: 8 * 60 * 60, label: "8 hours" },
];

export interface StartShareInput {
  conversationId: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  durationSec?: number;
}

export async function startSharingLocation(input: StartShareInput): Promise<LiveLocationShare> {
  const conversationId = (input.conversationId || "").trim();
  if (!conversationId) throw new Error("conversationId is required");
  const userId = (input.userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!userId) throw new Error("userId is required");
  if (!isFinite(input.lat) || input.lat < -90 || input.lat > 90) {
    throw new Error("lat must be between -90 and 90");
  }
  if (!isFinite(input.lng) || input.lng < -180 || input.lng > 180) {
    throw new Error("lng must be between -180 and 180");
  }
  const dur = input.durationSec ?? 60 * 60;
  if (!SHARE_DURATIONS.some((d) => d.value === dur)) {
    throw new Error(`durationSec must be one of: ${SHARE_DURATIONS.map((d) => d.value).join(", ")}`);
  }
  // Cancel any prior active share by the same user in the same conversation
  const existing = find<LiveLocationShare>(
    STORE,
    (s) => s.conversationId === conversationId && s.userId === userId && new Date(s.expiresAt).getTime() > Date.now(),
  );
  for (const s of existing) remove(STORE, s.id);
  const rec: LiveLocationShare = {
    id: `loc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    userId,
    lat: Math.round(input.lat * 1e6) / 1e6,
    lng: Math.round(input.lng * 1e6) / 1e6,
    accuracy: input.accuracy != null ? Math.max(0, input.accuracy) : null,
    expiresAt: new Date(Date.now() + dur * 1000).toISOString(),
    createdAt: nowISO(),
  };
  put(STORE, rec);
  return rec;
}

export async function stopSharingLocation(
  conversationId: string,
  userId: string,
): Promise<number> {
  const cid = (conversationId || "").trim();
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  const rows = find<LiveLocationShare>(STORE, (s) => s.conversationId === cid && s.userId === uid);
  for (const r of rows) remove(STORE, r.id);
  return rows.length;
}

export async function updateLocation(
  shareId: string,
  lat: number,
  lng: number,
  accuracy?: number,
): Promise<LiveLocationShare | null> {
  const cur = get<LiveLocationShare>(STORE, shareId);
  if (!cur) return null;
  if (new Date(cur.expiresAt).getTime() <= Date.now()) return null;
  return update<LiveLocationShare>(STORE, shareId, {
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    accuracy: accuracy != null ? Math.max(0, accuracy) : null,
  });
}

/** Returns all active (non-expired) shares in a conversation. */
export async function getSharedLocations(conversationId: string): Promise<LiveLocationShare[]> {
  const cid = (conversationId || "").trim();
  const now = Date.now();
  return find<LiveLocationShare>(STORE, (s) => s.conversationId === cid)
    .filter((s) => new Date(s.expiresAt).getTime() > now)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Garbage-collect expired shares. */
export async function pruneExpired(): Promise<number> {
  const now = Date.now();
  const expired = all<LiveLocationShare>(STORE).filter((s) => new Date(s.expiresAt).getTime() <= now);
  for (const s of expired) remove(STORE, s.id);
  return expired.length;
}
