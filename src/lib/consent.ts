/**
 * Cirkle — Consent Management Service
 *
 * Central registry of every data-processing purpose Cirkle uses. Each purpose
 * can be granted or withdrawn independently by the user. The choice is
 * persisted in `localStorage` under `cirkle-consent-v1` and is honoured by
 * both client-side features (federated learning, push notifications) and
 * server-side AI calls (the client reads consent and passes it through API
 * requests; server-side gates additionally call `hasConsent` as defense in
 * depth — on the server it defaults to `true` since `localStorage` is not
 * available there, but the client is expected to gate the request itself).
 *
 * Design rules:
 *  - "Necessary" is always granted (cannot be withdrawn — required for auth,
 *    security, and basic app function).
 *  - All other purposes default to `false` until the user explicitly opts in
 *    via the cookie consent banner or the privacy settings panel.
 *  - Withdrawing consent does NOT delete already-collected data — it only
 *    stops future processing. Deletion is handled via the DSR flow.
 */

export type ConsentPurpose =
  | "necessary"
  | "functional"
  | "analytics"
  | "ai_personalization"
  | "federated_learning"
  | "push_notif"
  | "shield_anon"
  | "marketing";

export interface ConsentState {
  [purpose: string]: boolean;
}

/**
 * Bump this whenever the consent policy changes materially — users will be
 * re-prompted with the cookie banner when their stored version doesn't match.
 */
export const CONSENT_VERSION = 1;
const STORAGE_KEY = `cirkle-consent-v${CONSENT_VERSION}`;

/** The canonical purpose list (used by settings UIs to render rows). */
export const ALL_PURPOSES: ConsentPurpose[] = [
  "necessary",
  "functional",
  "analytics",
  "ai_personalization",
  "federated_learning",
  "push_notif",
  "shield_anon",
  "marketing",
];

/** Human-readable metadata for each purpose (EN — UI may localize as needed). */
export const PURPOSE_META: Record<ConsentPurpose, { title: string; description: string; required?: boolean }> = {
  necessary: {
    title: "Strictly Necessary",
    description: "Authentication, security, and core app function. Cannot be disabled.",
    required: true,
  },
  functional: {
    title: "Functional",
    description: "Remembering your theme, language, and region settings across sessions.",
  },
  analytics: {
    title: "Analytics",
    description: "Aggregate, anonymized usage stats so we can improve Cirkle.",
  },
  ai_personalization: {
    title: "AI Personalization",
    description: "Let the on-device Brain tailor AI replies using your past interactions.",
  },
  federated_learning: {
    title: "Federated Learning",
    description: "Contribute anonymized model weights to improve Cirkle AI for everyone.",
  },
  push_notif: {
    title: "Push Notifications",
    description: "Receive alerts for messages, payments, and shield events.",
  },
  shield_anon: {
    title: "Anonymous Shield Reports",
    description: "Allow Citizen Shield to attest anonymous reports with zero-knowledge proofs.",
  },
  marketing: {
    title: "Marketing",
    description: "Occasional product updates and offers (max 1/month).",
  },
};

/** Default state: only `necessary` is granted. */
export const DEFAULT_CONSENT: ConsentState = ALL_PURPOSES.reduce((acc, p) => {
  acc[p] = p === "necessary";
  return acc;
}, {} as ConsentState);

/* ------------------------------------------------------------------ */
/* Storage helpers (SSR-safe — no-op on the server)                    */
/* ------------------------------------------------------------------ */

function isClient(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStore(): { state: ConsentState; version: number } | null {
  if (!isClient()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: ConsentState; version?: number };
    if (!parsed || typeof parsed !== "object" || !parsed.state) return null;
    return { state: parsed.state, version: parsed.version ?? CONSENT_VERSION };
  } catch {
    return null;
  }
}

function writeStore(state: ConsentState): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state, version: CONSENT_VERSION, updatedAt: Date.now() }),
    );
  } catch {
    /* localStorage may be unavailable (private mode, quota). No-op. */
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Returns the full consent state, merged with defaults so any newly-added
 * purpose shows up with its default value. On the server, returns the
 * default state (necessary=true, all else false).
 */
export function getConsent(): ConsentState {
  const stored = readStore();
  if (!stored) return { ...DEFAULT_CONSENT };
  // Merge with defaults so new purposes (added after CONSENT_VERSION bump)
  // get their default value rather than silently being absent.
  return { ...DEFAULT_CONSENT, ...stored.state, necessary: true };
}

/**
 * Grant or withdraw consent for a single purpose. `necessary` is always
 * granted and cannot be changed (no-op). Emits a `circle:consent-change`
 * event so subscribed features can react in real time.
 */
export function setConsent(purpose: ConsentPurpose, granted: boolean): void {
  if (purpose === "necessary") return; // immutably granted
  const next = getConsent();
  next[purpose] = !!granted;
  writeStore(next);
  if (isClient()) {
    window.dispatchEvent(
      new CustomEvent("circle:consent-change", { detail: { purpose, granted: !!granted } }),
    );
  }
}

/**
 * Replace the entire consent state in one shot (used by the cookie banner's
 * Accept All / Reject All buttons).
 */
export function setConsentBulk(state: Partial<ConsentState>): void {
  const next: ConsentState = { ...DEFAULT_CONSENT, ...state, necessary: true };
  writeStore(next);
  if (isClient()) {
    window.dispatchEvent(
      new CustomEvent("circle:consent-change", { detail: { bulk: true, state: next } }),
    );
  }
}

/**
 * Returns true iff the user has granted `purpose`. `necessary` always
 * returns true. On the server (no localStorage) returns `true` for
 * non-required purposes — the client is expected to gate the request
 * itself before calling server-side code.
 */
export function hasConsent(purpose: ConsentPurpose): boolean {
  if (purpose === "necessary") return true;
  // SSR / non-browser context: default to granted so server-side code paths
  // don't crash. Real gating is done client-side before the request fires.
  if (!isClient()) return true;
  return !!getConsent()[purpose];
}

/**
 * Withdraw consent for every non-necessary purpose. Used by account-deletion
 * pre-flight and by "Clear personalization" actions in the profile screen.
 */
export function withdrawAllConsent(): void {
  const cleared: ConsentState = { ...DEFAULT_CONSENT };
  // Set every non-necessary purpose to false explicitly.
  for (const p of ALL_PURPOSES) cleared[p] = p === "necessary";
  writeStore(cleared);
  if (isClient()) {
    window.dispatchEvent(
      new CustomEvent("circle:consent-change", { detail: { withdrawn: true, state: cleared } }),
    );
  }
}

/**
 * True iff the user has completed the cookie consent flow at the current
 * policy version. Used by the banner to decide whether to show itself.
 */
export function hasRecordedConsent(): boolean {
  return readStore() !== null;
}

/** Reset consent back to the un-recorded state (forces the banner to show). */
export function resetConsent(): void {
  if (!isClient()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
  window.dispatchEvent(new CustomEvent("circle:consent-change", { detail: { reset: true } }));
}
