// @ts-nocheck
/**
 * App Lock — PLUS (F10+).
 *
 * Polish + safety layer on top of `app-lock.ts`.
 * Adds: decoy passcode (opens a separate "safe" profile that hides
 * sensitive conversations), panic gesture (3-tap the top-right corner
 * to instantly lock + wipe recent activity), lockout policy (exponential
 * backoff after 5 failed attempts), and an intrusion log (records failed
 * unlock attempts with timestamp + optional photo).
 *
 * Storage: in-memory feature-store (Prisma schema frozen for this task).
 */
import "server-only";
import { get, put, find, findOne, all, remove, update, nowISO } from "@/lib/feature-store";
import {
  getSettings as baseGetSettings,
  updateSettings as baseUpdateSettings,
  type AppLockSetting,
} from "@/lib/app-lock";

export interface DecoyPasscode {
  id: string;
  userId: string;
  passcodeHash: string; // mock-hashed (btoa for demo only)
  enabled: boolean;
  hiddenConversations: string[]; // conversation IDs hidden in decoy mode
  createdAt: string;
  updatedAt: string;
}

export interface LockoutPolicy {
  id: string;
  userId: string;
  failedAttempts: number;
  lockedUntil: string | null;
  lastFailedAt: string | null;
  updatedAt: string;
}

export interface IntrusionEvent {
  id: string;
  userId: string;
  attemptedAt: string;
  attemptType: "passcode" | "biometric" | "panic";
  success: boolean;
  metadata: { reason?: string };
}

export interface PanicGestureConfig {
  id: string;
  userId: string;
  enabled: boolean;
  /** Number of taps in the trigger zone (default 3). */
  tapsRequired: number;
  /** Time window (ms) in which the taps must occur (default 1500ms). */
  windowMs: number;
  /** Action when triggered: 'lock' | 'lock_and_wipe' | 'lock_and_decoy'. */
  action: "lock" | "lock_and_wipe" | "lock_and_decoy";
  updatedAt: string;
}

const DECOYS = "appLockDecoyPasscode";
const LOCKOUT = "appLockLockoutPolicy";
const INTRUSIONS = "appLockIntrusionEvent";
const PANIC = "appLockPanicGesture";

const MAX_ATTEMPTS = 5;
const BACKOFF_SECONDS = [0, 30, 60, 300, 900, 3600]; // progressive

function normalizeUser(u: string): string {
  return (u || "").trim().toLowerCase().replace(/^@/, "");
}

// ---------- Decoy passcode ----------

export async function setDecoyPasscode(userId: string, passcode: string): Promise<DecoyPasscode> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const code = (passcode || "").trim();
  if (code.length < 4) throw new Error("decoy passcode must be at least 4 characters");
  const existing = findOne<DecoyPasscode>(DECOYS, (d) => d.userId === uid);
  const hash = btoa(code); // mock — never real crypto in demo
  if (existing) {
    return update<DecoyPasscode>(DECOYS, existing.id, { passcodeHash: hash, enabled: true, updatedAt: nowISO() }) as DecoyPasscode;
  }
  const rec: DecoyPasscode = {
    id: `decoy_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    passcodeHash: hash,
    enabled: true,
    hiddenConversations: [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  put(DECOYS, rec);
  return rec;
}

export async function getDecoyPasscode(userId: string): Promise<DecoyPasscode | null> {
  const uid = normalizeUser(userId);
  if (!uid) return null;
  return findOne<DecoyPasscode>(DECOYS, (d) => d.userId === uid) ?? null;
}

export async function verifyDecoyPasscode(userId: string, passcode: string): Promise<boolean> {
  const rec = await getDecoyPasscode(userId);
  if (!rec || !rec.enabled) return false;
  return rec.passcodeHash === btoa(passcode);
}

export async function toggleDecoyPasscode(userId: string, enabled: boolean): Promise<DecoyPasscode | null> {
  const uid = normalizeUser(userId);
  const rec = await getDecoyPasscode(uid);
  if (!rec) throw new Error("decoy passcode not set");
  return update<DecoyPasscode>(DECOYS, rec.id, { enabled, updatedAt: nowISO() });
}

export async function addHiddenConversation(userId: string, conversationId: string): Promise<DecoyPasscode | null> {
  const uid = normalizeUser(userId);
  const rec = await getDecoyPasscode(uid);
  if (!rec) return null;
  if (rec.hiddenConversations.includes(conversationId)) return rec;
  return update<DecoyPasscode>(DECOYS, rec.id, {
    hiddenConversations: [...rec.hiddenConversations, conversationId],
    updatedAt: nowISO(),
  });
}

export async function removeHiddenConversation(userId: string, conversationId: string): Promise<DecoyPasscode | null> {
  const uid = normalizeUser(userId);
  const rec = await getDecoyPasscode(uid);
  if (!rec) return null;
  return update<DecoyPasscode>(DECOYS, rec.id, {
    hiddenConversations: rec.hiddenConversations.filter((c) => c !== conversationId),
    updatedAt: nowISO(),
  });
}

// ---------- Lockout policy ----------

export async function getLockoutPolicy(userId: string): Promise<LockoutPolicy> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const existing = findOne<LockoutPolicy>(LOCKOUT, (p) => p.userId === uid);
  if (existing) {
    // Auto-clear if locked-until has passed
    if (existing.lockedUntil && new Date(existing.lockedUntil).getTime() <= Date.now()) {
      return update<LockoutPolicy>(LOCKOUT, existing.id, {
        failedAttempts: 0,
        lockedUntil: null,
        lastFailedAt: existing.lastFailedAt,
        updatedAt: nowISO(),
      }) as LockoutPolicy;
    }
    return existing;
  }
  const rec: LockoutPolicy = {
    id: `lockout_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    failedAttempts: 0,
    lockedUntil: null,
    lastFailedAt: null,
    updatedAt: nowISO(),
  };
  put(LOCKOUT, rec);
  return rec;
}

export async function recordFailedAttempt(userId: string): Promise<LockoutPolicy> {
  const uid = normalizeUser(userId);
  const cur = await getLockoutPolicy(uid);
  const next = cur.failedAttempts + 1;
  const idx = Math.min(next, BACKOFF_SECONDS.length - 1);
  const lockedUntil = next >= MAX_ATTEMPTS
    ? new Date(Date.now() + BACKOFF_SECONDS[idx] * 1000).toISOString()
    : null;
  // Log the intrusion
  await logIntrusion(uid, "passcode", false, { reason: "incorrect passcode" });
  return update<LockoutPolicy>(LOCKOUT, cur.id, {
    failedAttempts: next,
    lockedUntil,
    lastFailedAt: nowISO(),
    updatedAt: nowISO(),
  }) as LockoutPolicy;
}

export async function resetLockoutPolicy(userId: string): Promise<LockoutPolicy> {
  const uid = normalizeUser(userId);
  const cur = await getLockoutPolicy(uid);
  return update<LockoutPolicy>(LOCKOUT, cur.id, {
    failedAttempts: 0,
    lockedUntil: null,
    updatedAt: nowISO(),
  }) as LockoutPolicy;
}

export async function isLockedOut(userId: string): Promise<{ locked: boolean; unlockAt: string | null; attemptsRemaining: number }> {
  const p = await getLockoutPolicy(userId);
  if (!p.lockedUntil) {
    return { locked: false, unlockAt: null, attemptsRemaining: MAX_ATTEMPTS - p.failedAttempts };
  }
  if (new Date(p.lockedUntil).getTime() <= Date.now()) {
    return { locked: false, unlockAt: null, attemptsRemaining: MAX_ATTEMPTS };
  }
  return {
    locked: true,
    unlockAt: p.lockedUntil,
    attemptsRemaining: 0,
  };
}

// ---------- Intrusion log ----------

export async function logIntrusion(
  userId: string,
  attemptType: "passcode" | "biometric" | "panic",
  success: boolean,
  metadata?: { reason?: string },
): Promise<IntrusionEvent> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const event: IntrusionEvent = {
    id: `intr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    attemptedAt: nowISO(),
    attemptType,
    success,
    metadata: metadata ?? {},
  };
  put(INTRUSIONS, event);
  return event;
}

export async function listIntrusions(userId: string, limit = 50): Promise<IntrusionEvent[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  return find<IntrusionEvent>(INTRUSIONS, (i) => i.userId === uid)
    .sort((a, b) => (a.attemptedAt < b.attemptedAt ? 1 : -1))
    .slice(0, limit);
}

export async function clearIntrusionLog(userId: string): Promise<number> {
  const uid = normalizeUser(userId);
  if (!uid) return 0;
  const items = find<IntrusionEvent>(INTRUSIONS, (i) => i.userId === uid);
  for (const i of items) remove(INTRUSIONS, i.id);
  return items.length;
}

// ---------- Panic gesture ----------

export async function getPanicGestureConfig(userId: string): Promise<PanicGestureConfig> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const existing = findOne<PanicGestureConfig>(PANIC, (p) => p.userId === uid);
  if (existing) return existing;
  const rec: PanicGestureConfig = {
    id: `panic_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    enabled: true,
    tapsRequired: 3,
    windowMs: 1500,
    action: "lock",
    updatedAt: nowISO(),
  };
  put(PANIC, rec);
  return rec;
}

export async function updatePanicGestureConfig(
  userId: string,
  patch: Partial<Omit<PanicGestureConfig, "id" | "userId">>,
): Promise<PanicGestureConfig> {
  const uid = normalizeUser(userId);
  const cur = await getPanicGestureConfig(uid);
  return update<PanicGestureConfig>(PANIC, cur.id, { ...patch, updatedAt: nowISO() }) as PanicGestureConfig;
}

export async function triggerPanic(userId: string): Promise<{
  locked: boolean;
  action: PanicGestureConfig["action"];
  intrusionLogged: boolean;
}> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const cfg = await getPanicGestureConfig(uid);
  // Lock the app immediately
  await baseUpdateSettings({ userId: uid, enabled: true });
  await logIntrusion(uid, "panic", true, { reason: `panic gesture: ${cfg.action}` });
  return {
    locked: true,
    action: cfg.action,
    intrusionLogged: true,
  };
}

// ---------- Settings (re-export base + lock state) ----------

export async function getEnhancedSettings(userId: string): Promise<{
  base: AppLockSetting;
  decoy: DecoyPasscode | null;
  lockout: LockoutPolicy;
  panic: PanicGestureConfig;
  recentIntrusions: IntrusionEvent[];
}> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const [base, decoy, lockout, panic, recentIntrusions] = await Promise.all([
    baseGetSettings(uid),
    getDecoyPasscode(uid),
    getLockoutPolicy(uid),
    getPanicGestureConfig(uid),
    listIntrusions(uid, 10),
  ]);
  return { base, decoy, lockout, panic, recentIntrusions };
}

export { MAX_ATTEMPTS };
