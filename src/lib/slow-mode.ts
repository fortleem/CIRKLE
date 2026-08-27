// @ts-nocheck
/**
 * Slow Mode (F7) — per-circle message cooldown.
 *
 * Admins can set a slow-mode interval (30s, 1m, 5m, 15m, 1h) so members
 * can only send one message per interval. `canSendMessage()` checks
 * whether a user is within the cooldown.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, update, nowISO } from "@/lib/feature-store";

export interface SlowModeSetting {
  circleId: string;
  intervalSec: number; // 0 = off
  setBy: string;
  updatedAt: string;
}

export interface SlowModeLastSent {
  id: string; // `${circleId}:${userId}`
  circleId: string;
  userId: string;
  lastSentAt: string;
}

const SETTINGS = "slowModeSetting";
const LAST_SENT = "slowModeLastSent";

export const SLOW_MODE_INTERVALS: { value: number; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 900, label: "15 minutes" },
  { value: 3600, label: "1 hour" },
];

export async function getSlowMode(circleId: string): Promise<SlowModeSetting> {
  const id = (circleId || "").trim();
  if (!id) throw new Error("circleId is required");
  const existing = get<SlowModeSetting>(SETTINGS, id);
  if (existing) return existing;
  const rec: SlowModeSetting = {
    circleId: id,
    intervalSec: 0,
    setBy: "",
    updatedAt: nowISO(),
  };
  put(SETTINGS, rec);
  return rec;
}

export async function setSlowMode(
  circleId: string,
  intervalSec: number,
  setBy: string,
): Promise<SlowModeSetting> {
  const id = (circleId || "").trim();
  if (!id) throw new Error("circleId is required");
  if (!SLOW_MODE_INTERVALS.some((o) => o.value === intervalSec)) {
    throw new Error(`intervalSec must be one of: ${SLOW_MODE_INTERVALS.map((o) => o.value).join(", ")}`);
  }
  const uid = (setBy || "").trim().toLowerCase().replace(/^@/, "");
  const existing = get<SlowModeSetting>(SETTINGS, id);
  if (existing) {
    return update<SlowModeSetting>(SETTINGS, id, { intervalSec, setBy: uid, updatedAt: nowISO() })!;
  }
  const rec: SlowModeSetting = {
    circleId: id,
    intervalSec,
    setBy: uid,
    updatedAt: nowISO(),
  };
  put(SETTINGS, rec);
  return rec;
}

export interface CanSendResult {
  canSend: boolean;
  /** Seconds until the user can send again (0 if canSend=true). */
  retryAfterSec: number;
  intervalSec: number;
}

export async function canSendMessage(
  circleId: string,
  userId: string,
): Promise<CanSendResult> {
  const settings = await getSlowMode(circleId);
  if (settings.intervalSec === 0) {
    return { canSend: true, retryAfterSec: 0, intervalSec: 0 };
  }
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!uid) return { canSend: true, retryAfterSec: 0, intervalSec: settings.intervalSec };
  const key = `${settings.circleId}:${uid}`;
  const lastSent = get<SlowModeLastSent>(LAST_SENT, key);
  if (!lastSent) return { canSend: true, retryAfterSec: 0, intervalSec: settings.intervalSec };
  const elapsedSec = (Date.now() - new Date(lastSent.lastSentAt).getTime()) / 1000;
  if (elapsedSec >= settings.intervalSec) {
    return { canSend: true, retryAfterSec: 0, intervalSec: settings.intervalSec };
  }
  return {
    canSend: false,
    retryAfterSec: Math.ceil(settings.intervalSec - elapsedSec),
    intervalSec: settings.intervalSec,
  };
}

/** Records that the user sent a message — updates the cooldown timer. */
export async function recordMessageSent(
  circleId: string,
  userId: string,
): Promise<SlowModeLastSent> {
  const settings = await getSlowMode(circleId);
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!uid) throw new Error("userId is required");
  if (settings.intervalSec === 0) {
    // No slow mode — still record for potential future audit
  }
  const key = `${settings.circleId}:${uid}`;
  const existing = get<SlowModeLastSent>(LAST_SENT, key);
  if (existing) {
    return update<SlowModeLastSent>(LAST_SENT, key, { lastSentAt: nowISO() })!;
  }
  const rec: SlowModeLastSent = {
    id: key,
    circleId: settings.circleId,
    userId: uid,
    lastSentAt: nowISO(),
  };
  put(LAST_SENT, rec);
  return rec;
}
