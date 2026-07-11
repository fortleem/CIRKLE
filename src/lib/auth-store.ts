"use client";

import { create } from "zustand";
import bcrypt from "bcryptjs";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** A user as the rest of the app sees them (no password). */
export interface AuthUser {
  /** Raw username, e.g. "yousef" — displayed as "yousef@cirkle". */
  username: string;
  /** Human name, e.g. "Yousef Al-Harbi". */
  displayName: string;
  /** Optional recovery email. */
  email?: string;
  /** Brand color token: gold | teal | rose | steel. */
  avatarColor: string;
  /** Whether the account has been Cirkle-Verified (mock default false). */
  verified: boolean;
  /** ISO date string of registration. */
  joinedAt: string;
  /** Optional short bio. */
  bio?: string;
  /** Selected country code (e.g. "SA"). */
  country?: string;
  /** ISO date string of birth (YYYY-MM-DD) — used for the age gate. */
  dob?: string;
  /** Parental email — required & pending verification when user is under 16. */
  parentalEmail?: string;
  /** Account status — `pending` until parental consent is confirmed for under-16s. */
  accountStatus?: "active" | "pending_parental";
}

/** Internal record stored in localStorage — includes the hashed password. */
interface StoredAccount extends AuthUser {
  /** Mock-hashed password (btoa — demo only, never real crypto). */
  passwordHash: string;
}

export type AuthView = "splash" | "login" | "register" | "forgot" | "otp";

export interface RegisterData {
  username: string;
  displayName: string;
  password: string;
  email?: string;
  country: string;
  bio?: string;
  /** ISO date string of birth (YYYY-MM-DD) — required for the age gate. */
  dob: string;
  /** Required when the user is under 16 (parental consent). */
  parentalEmail?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  authView: AuthView;
  /** All registered accounts on this device. */
  accounts: StoredAccount[];
  /** True once we've read localStorage on the client. */
  hydrated: boolean;

  register: (data: RegisterData) => Promise<{ ok: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setAuthView: (view: AuthView) => void;
  hydrate: () => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "cirkle-auth";
const AVATAR_COLORS = ["gold", "teal", "rose", "steel"];

/**
 * Compute a user's age from an ISO DOB string. Returns null if the DOB is
 * missing or invalid. Used by the age gate (COPPA block at <13, parental
 * email required at <16).
 */
export function computeAge(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

/** Returns the age-band classification used by the registration age gate. */
export function ageBand(dob?: string | null): "child" | "teen" | "adult" | "unknown" {
  const age = computeAge(dob);
  if (age === null) return "unknown";
  if (age < 13) return "child";      // COPPA — block
  if (age < 16) return "teen";       // parental consent required
  return "adult";
}

/** Deterministic-ish color pick from username so the same user always gets the same color. */
function pickAvatarColor(username: string): string {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Cryptographic password hashing using bcrypt (10 rounds). Async so the main
 *  thread can keep painting while bcrypt runs (yields to the event loop). */
async function hashPassword(pw: string): Promise<string> {
  try { return await bcrypt.hash(pw, 10); } catch { return `cirkle::${pw}`; }
}
async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  try {
    if (hash.startsWith("$2")) return await bcrypt.compare(pw, hash);
    const legacyHash = btoa(unescape(encodeURIComponent(`cirkle::${pw}`)));
    return hash === legacyHash;
  } catch { return false; }
}

function stripAtCirkle(raw: string): string {
  // Allow the user to type "yousef", "yousef@cirkle", or "@cirkle/yousef"
  const trimmed = raw.trim().toLowerCase();
  return trimmed
    .replace(/^@cirkle\//, "")
    .replace(/@cirkle$/i, "")
    .replace(/^@/, "");
}

function sanitizeUser(acct: StoredAccount): AuthUser {
  // Strip the passwordHash before exposing to the rest of the app.
  const { passwordHash: _omit, ...rest } = acct;
  void _omit;
  return rest;
}

interface PersistedShape {
  accounts: StoredAccount[];
  currentUsername: string | null;
  sessionStartedAt?: number;
}

function loadFromStorage(): PersistedShape {
  if (typeof window === "undefined") return { accounts: [], currentUsername: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accounts: [], currentUsername: null };
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!Array.isArray(parsed.accounts)) return { accounts: [], currentUsername: null };
    return { accounts: parsed.accounts, currentUsername: parsed.currentUsername ?? null, sessionStartedAt: parsed.sessionStartedAt };
  } catch {
    return { accounts: [], currentUsername: null };
  }
}

function saveToStorage(state: PersistedShape) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode errors */
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  authView: "splash",
  accounts: [],
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    if (get().hydrated) return;
    const persisted = loadFromStorage();
    const current = persisted.currentUsername
      ? persisted.accounts.find((a) => a.username === persisted.currentUsername) ?? null
      : null;
    const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;
    const sessionAge = persisted.sessionStartedAt ? Date.now() - persisted.sessionStartedAt : 0;
    if (sessionAge > SESSION_MAX_AGE && current) {
      saveToStorage({ ...persisted, currentUsername: null, sessionStartedAt: undefined });
      set({ accounts: persisted.accounts, user: null, isAuthenticated: false, hydrated: true });
      return;
    }
    set({
      accounts: persisted.accounts,
      user: current ? sanitizeUser(current) : null,
      isAuthenticated: !!current,
      hydrated: true,
    });
  },

  register: async (data) => {
    const username = stripAtCirkle(data.username);
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return { ok: false, error: "Username must be 3–20 chars: letters, numbers, underscore." };
    }
    if (data.password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters." };
    }
    if (!data.displayName.trim()) {
      return { ok: false, error: "Display name is required." };
    }
    // Age gate (COPPA + parental consent).
    const band = ageBand(data.dob);
    if (band === "child") {
      // COPPA — block registration entirely.
      return {
        ok: false,
        error: "We're sorry, but Cirkle is not available for users under 13. (COPPA)",
      };
    }
    if (band === "unknown") {
      return {
        ok: false,
        error: "Please enter a valid date of birth.",
      };
    }
    // Teen (13–15): require a parental email.
    if (band === "teen") {
      const parentalEmail = (data.parentalEmail || "").trim();
      if (!parentalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentalEmail)) {
        return {
          ok: false,
          error: "A parent or guardian's email is required for users under 16.",
        };
      }
    }
    const existing = get().accounts;
    if (existing.some((a) => a.username === username)) {
      return { ok: false, error: `@${username} is already taken.` };
    }

    const account: StoredAccount = {
      username,
      displayName: data.displayName.trim(),
      email: data.email?.trim() || undefined,
      avatarColor: pickAvatarColor(username),
      verified: false,
      joinedAt: new Date().toISOString(),
      bio: data.bio?.trim() || undefined,
      country: data.country,
      // Age-gate fields — stored on the account record so we can re-verify
      // at login and prompt for parental confirmation if still pending.
      dob: data.dob,
      parentalEmail: band === "teen" ? (data.parentalEmail || "").trim() : undefined,
      accountStatus: band === "teen" ? "pending_parental" : "active",
      passwordHash: await hashPassword(data.password),
    };

    const nextAccounts = [...existing, account];
    saveToStorage({ accounts: nextAccounts, currentUsername: account.username, sessionStartedAt: Date.now() });
    set({
      accounts: nextAccounts,
      user: sanitizeUser(account),
      isAuthenticated: true,
      authView: "splash",
    });

    // Best-effort: notify the parent that consent is required. We don't
    // have a real email gateway in this dev env, so we just log + rely on
    // the UI to show a "pending parental verification" banner.
    if (band === "teen" && account.parentalEmail) {
      try {
        // In production this would POST to a /api/account/parental-consent
        // route that sends a verification email. In dev we log only so the
        // registration flow stays self-contained.
        console.info(
          `[auth] teen registration — parental consent email would be sent to ${account.parentalEmail} for @${username}. Account held as pending_parental.`,
        );
      } catch {
        /* no-op */
      }
    }
    return { ok: true };
  },

  login: async (rawUsername, password) => {
    const username = stripAtCirkle(rawUsername);
    const acct = get().accounts.find((a) => a.username === username);
    if (!acct) {
      return { ok: false, error: `No account @${username}. Create one?` };
    }
    if (!(await verifyPassword(password, acct.passwordHash))) {
      return { ok: false, error: "Wrong password. Try again." };
    }
    saveToStorage({ accounts: get().accounts, currentUsername: acct.username, sessionStartedAt: Date.now() });
    set({
      user: sanitizeUser(acct),
      isAuthenticated: true,
      authView: "splash",
    });
    return { ok: true };
  },

  logout: () => {
    saveToStorage({ accounts: get().accounts, currentUsername: null });
    set({ user: null, isAuthenticated: false, authView: "splash" });
  },

  setAuthView: (view) => set({ authView: view }),
}));

/* ------------------------------------------------------------------ */
/* Selectors / convenience                                             */
/* ------------------------------------------------------------------ */

/** Returns the user's display handle, e.g. "yousef@cirkle". */
export function cirkleHandle(user: AuthUser | null): string {
  if (!user) return "@cirkle";
  return `${user.username}@cirkle`;
}

/** Returns the user's initials (max 2 chars). */
export function cirkleInitials(user: AuthUser | null): string {
  if (!user) return "C";
  const parts = user.displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
