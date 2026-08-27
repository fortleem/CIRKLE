// @ts-nocheck
/**
 * App Lock (F10) — biometric + auto-lock settings.
 *
 * Per-user setting: when enabled, the app auto-locks after `lockAfterSec`
 * seconds of inactivity. Biometric (WebAuthn) is opt-in. The actual unlock
 * prompt is rendered by the overlay; this lib persists the settings.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, update, nowISO } from "@/lib/feature-store";

export interface AppLockSetting {
  id: string; // "default" — single-row-per-user
  userId: string;
  enabled: boolean;
  lockAfterSec: number; // 60 | 300 | 1800 default
  biometricEnabled: boolean;
  updatedAt: string;
}

const STORE = "appLockSetting";

export const LOCK_AFTER_OPTIONS: { value: number; label: string }[] = [
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 1800, label: "30 minutes" },
  { value: 3600, label: "1 hour" },
];

/** Returns whether the user has app lock enabled. */
export async function isAppLockEnabled(userId: string): Promise<boolean> {
  const s = await getSettings(userId);
  return s.enabled;
}

export async function getSettings(userId: string): Promise<AppLockSetting> {
  const id = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!id) throw new Error("userId is required");
  const existing = find<AppLockSetting>(STORE, (s) => s.userId === id)[0];
  if (existing) return existing;
  // Default settings
  const rec: AppLockSetting = {
    id: `lock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    userId: id,
    enabled: false,
    lockAfterSec: 300,
    biometricEnabled: false,
    updatedAt: nowISO(),
  };
  put(STORE, rec);
  return rec;
}

export interface UpdateSettingsInput {
  userId: string;
  enabled?: boolean;
  lockAfterSec?: number;
  biometricEnabled?: boolean;
}

export async function updateSettings(input: UpdateSettingsInput): Promise<AppLockSetting> {
  const cur = await getSettings(input.userId);
  const patch: Partial<AppLockSetting> = {};
  if (typeof input.enabled === "boolean") patch.enabled = input.enabled;
  if (typeof input.lockAfterSec === "number") {
    const allowed = LOCK_AFTER_OPTIONS.map((o) => o.value);
    if (!allowed.includes(input.lockAfterSec)) {
      throw new Error(`lockAfterSec must be one of: ${allowed.join(", ")}`);
    }
    patch.lockAfterSec = input.lockAfterSec;
  }
  if (typeof input.biometricEnabled === "boolean") {
    patch.biometricEnabled = input.biometricEnabled;
    if (input.biometricEnabled && !cur.enabled) {
      // enabling biometric implies enabling app lock
      patch.enabled = true;
    }
  }
  patch.updatedAt = nowISO();
  return update<AppLockSetting>(STORE, cur.id, patch);
}

export async function lockApp(userId: string): Promise<AppLockSetting> {
  // Setting `enabled=true` doesn't itself lock the app — the client checks
  // `shouldRequireUnlock()` on every navigation. This is a marker.
  return updateSettings({ userId, enabled: true });
}

export async function unlockApp(userId: string): Promise<AppLockSetting> {
  // The unlock happens in the client (WebAuthn or PIN). This lib just
  // returns current settings so the client can clear its "locked" state.
  return getSettings(userId);
}

export interface ShouldUnlockResult {
  shouldUnlock: boolean;
  reason?: "app_lock_enabled" | "biometric_required" | "disabled";
  settings?: AppLockSetting;
}

/**
 * Checks whether the app should require an unlock prompt given the user's
 * settings and whether biometric (WebAuthn) is available on the device.
 *
 * `webAuthnAvailable` should be passed by the client (window.PublicKeyCredential).
 */
export async function shouldRequireUnlock(
  userId: string,
  webAuthnAvailable: boolean,
): Promise<ShouldUnlockResult> {
  const s = await getSettings(userId);
  if (!s.enabled) return { shouldUnlock: false, reason: "disabled", settings: s };
  if (s.biometricEnabled && !webAuthnAvailable) {
    // User enabled biometric but the device doesn't support WebAuthn — fall
    // back to PIN. The overlay handles this.
    return { shouldUnlock: true, reason: "biometric_required", settings: s };
  }
  return { shouldUnlock: true, reason: "app_lock_enabled", settings: s };
}
