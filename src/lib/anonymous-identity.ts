/**
 * Anonymous Identity (P1.6)
 * ------------------------
 * Per-Circle pseudonymous identity generator. The mapping from a real
 * user to their pseudonym is stored ONLY in localStorage — it is never
 * sent to the server. When a post is published in anonymous mode, the
 * client sends only the pseudonymous identity (handle, avatar color,
 * initials). The server has no way to map that back to the real user.
 *
 * Pseudonym format: `anonymous-{random-word}-{random-number}`
 *   e.g. "anonymous-falcon-42", "anonymous-saffron-17"
 *
 * Avatar: derived from a hash of the pseudonym — gradient color pair +
 * initials (the first two letters of the random word, uppercased).
 *
 * Privacy covenant (§1, §28):
 *   • The localStorage store never leaves the device.
 *   • No real user ID, username, or display name is sent with an
 *     anonymous post.
 *   • A different pseudonym is minted per-Circle so anonymous activity
 *     in one Circle cannot be correlated with another.
 */

"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Pseudonym {
  /** Stable per (circleId, device). Used as the post's authorId. */
  id: string;
  /** Human-readable handle, e.g. "anonymous-falcon-42". */
  handle: string;
  /** Display name, e.g. "Falcon 42" (capitalised). */
  displayName: string;
  /** Two-letter initials derived from the random word. */
  initials: string;
  /** Tailwind gradient identifier — see CIRKLE_GRADIENTS below. */
  color: string;
  /** Gradient stops for the avatar background. */
  gradient: [string, string];
  /** Circle this pseudonym is scoped to. */
  circleId: string;
  /** When the pseudonym was minted (ISO timestamp). */
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Word pool — animals + adjectives (evocative, neutral, region-aware)
// ─────────────────────────────────────────────────────────────────────────────

const ANIMALS = [
  "falcon", "oryx", "gazelle", "leopard", "fennec", "ibex", "dolphin",
  "sparrow", "swallow", "raven", "heron", "pelican", "salmon", "tuna",
  "gecko", "viper", "cobra", "mantis", "scarab", "lotus", "cedar",
  "olive", "palm", "saffron", "jasmine", "amber", "onyx", "obsidian",
  "lapis", "agate", "coral", "pearl",
];

const ADJECTIVES = [
  "wandering", "quiet", "shadowed", "golden", "silver", "silent",
  "distant", "coastal", "desert", "alpine", "velvet", "scarlet",
  "midnight", "twilight", "amber", "copper",
];

// Curated gradient palette — pairs of Tailwind-compatible HSL stops so
// the avatar renders as a soft two-tone circle. The palette deliberately
// avoids indigo/blue per the design system rule.
const CIRKLE_GRADIENTS: { name: string; stops: [string, string] }[] = [
  { name: "teal", stops: ["hsl(172 70% 45%)", "hsl(192 70% 35%)"] },
  { name: "rose", stops: ["hsl(345 75% 55%)", "hsl(15 75% 45%)"] },
  { name: "gold", stops: ["hsl(40 85% 55%)", "hsl(20 75% 45%)"] },
  { name: "steel", stops: ["hsl(210 12% 55%)", "hsl(220 12% 35%)"] },
  { name: "charcoal", stops: ["hsl(220 14% 30%)", "hsl(220 14% 18%)"] },
  { name: "sage", stops: ["hsl(140 30% 50%)", "hsl(120 25% 35%)"] },
  { name: "amber", stops: ["hsl(35 90% 55%)", "hsl(15 80% 45%)"] },
  { name: "plum", stops: ["hsl(320 35% 50%)", "hsl(300 30% 35%)"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// localStorage persistence
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "cirkle-anonymous-pseudonyms";

function readStore(): Record<string, Pseudonym> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, Pseudonym>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage may be unavailable (private mode / quota) — fail
    // silently. The in-memory pseudonym is still usable for the session.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Deterministic 32-bit hash from a string (FNV-1a variant). */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function makeInitials(word: string): string {
  if (!word) return "AN";
  const w = word.trim();
  if (w.length === 1) return w.toUpperCase();
  return (w[0] + w[w.length - 1]).toUpperCase();
}

function makeDisplayName(word: string, num: number): string {
  const cap = word.charAt(0).toUpperCase() + word.slice(1);
  return `${cap} ${num}`;
}

function makeHandle(word: string, num: number): string {
  return `anonymous-${word}-${num}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mint a fresh pseudonym for the given Circle. The Circle ID is mixed
 * into the random seed so two different Circles produce different
 * pseudonyms even on the same device.
 *
 * The pseudonym is persisted to localStorage immediately so it survives
 * page reloads — the user keeps the same anonymous identity inside a
 * Circle for as long as they want.
 */
export function generatePseudonym(circleId: string): Pseudonym {
  const safeCircle = circleId || "default";
  // Combine Circle ID + high-resolution time + Math.random for entropy.
  // The Circle ID is in the seed so different Circles produce different
  // pseudonyms even on the same device; the random components ensure
  // two pseudonyms minted in quick succession on the same Circle still
  // differ. The `>>> 0` cast guarantees an unsigned 32-bit index —
  // without it XOR can return a negative int and `arr[negative]` would
  // be undefined, breaking `pick`.
  const seed = (
    hashString(safeCircle) ^
    Math.floor(Math.random() * 0xffffffff) ^
    Date.now() ^
    (typeof performance !== "undefined" && typeof performance.now === "function"
      ? Math.floor(performance.now() * 1000)
      : 0)
  ) >>> 0;

  const word = pick(ANIMALS, seed);
  const num = (seed % 99) + 1;
  const handle = makeHandle(word, num);
  const id = `${handle}-${safeCircle}`; // stable per (handle, circle)
  // `>>> 4` (unsigned right shift) so the gradient index is always
  // non-negative even when seed is near 2^32.
  const gradient = pick(CIRKLE_GRADIENTS, seed >>> 4);

  const pseudonym: Pseudonym = {
    id,
    handle,
    displayName: makeDisplayName(word, num),
    initials: makeInitials(word),
    color: gradient.name,
    gradient: gradient.stops,
    circleId: safeCircle,
    createdAt: new Date().toISOString(),
  };

  // Persist immediately.
  const store = readStore();
  store[safeCircle] = pseudonym;
  writeStore(store);

  return pseudonym;
}

/**
 * Retrieve the stored pseudonym for a Circle, minting a fresh one on
 * first access. Always returns a usable pseudonym.
 */
export function getPseudonym(circleId: string): Pseudonym {
  const safeCircle = circleId || "default";
  const store = readStore();
  const existing = store[safeCircle];
  if (existing) return existing;
  return generatePseudonym(safeCircle);
}

/**
 * Return ALL stored pseudonyms, keyed by Circle ID. Useful for a
 * "manage anonymous identities" privacy dashboard.
 */
export function getPseudonyms(): Record<string, Pseudonym> {
  return readStore();
}

/**
 * Replace the pseudonym for a Circle with a fresh one. Useful when the
 * user wants to "rotate" their anonymous identity inside a Circle.
 */
export function rotatePseudonym(circleId: string): Pseudonym {
  return generatePseudonym(circleId || "default");
}

/**
 * Forget the pseudonym for a Circle (and therefore break continuity
 * of the anonymous identity inside that Circle).
 */
export function clearPseudonym(circleId: string): void {
  if (typeof window === "undefined") return;
  const safeCircle = circleId || "default";
  const store = readStore();
  delete store[safeCircle];
  writeStore(store);
}

/**
 * Forget ALL stored pseudonyms.
 */
export function clearAllPseudonyms(): void {
  if (typeof window === "undefined") return;
  writeStore({});
}

/**
 * Render an inline-SVG avatar for a pseudonym. Returns a data URL so it
 * can be dropped into <img src> or background-image directly. The
 * gradient + initials approach avoids any external avatar service.
 */
export function pseudonymAvatarDataUrl(p: Pseudonym, size = 96): string {
  const [c1, c2] = p.gradient;
  const initials = p.initials;
  const fontSize = Math.floor(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size / 2}" fill="url(#g)"/>
  <text x="50%" y="50%" dy=".35em" text-anchor="middle"
    font-family="ui-sans-serif, system-ui, sans-serif"
    font-size="${fontSize}" font-weight="600" fill="hsl(0 0% 100%)">${initials}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * The privacy notice shown next to the anonymous toggle. Centralised so
 * every surface reads the exact same covenant.
 */
export const ANONYMOUS_PRIVACY_NOTICE =
  "Your real identity is never linked to your anonymous posts. Pseudonyms are stored only on this device.";
