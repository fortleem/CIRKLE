// @ts-nocheck
/**
 * Share Targets (Tier A, A3/A4/A5/A7/A8/A9) — directional cross-module share
 * transformers + dispatchers. Each `shareTo*()` function takes a piece of
 * source content and:
 *   1. Transforms it for the target module's native format.
 *   2. POSTs it to the target module's per-module API endpoint (relative URL,
 *      8s AbortController timeout).
 *   3. Returns the per-target result.
 *
 * This complements `src/lib/cross-module-share.ts` (which is one-to-many). The
 * share-targets lib is **directional** (one source → one target) and includes
 * the new modules Citizen Shield + Commit + Rihla that aren't in the original
 * share hub.
 *
 * Server-safe (uses `fetch` to internal endpoints only). Imported by the
 * `/api/share/to-*` route handlers.
 */
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export type ShareSourceId = "wasl" | "midan" | "lamahat" | "mashahd" | "rihla" | "commit" | "citizen-shield";
export type ShareTargetId = "wasl" | "midan" | "lamahat" | "mashahd" | "rihla" | "citizen-shield" | "commit";

export interface ShareSource {
  /** Where the content came from. */
  module: ShareSourceId;
  /** Stable id of the source content (message id, post id, etc.). */
  contentId: string;
  /** The author of the source content (handle without @, or display name). */
  author: string;
  /** The primary text body (message text / post body / itinerary title). */
  body: string;
  /** Optional caption (used when source is a photo/video). */
  caption?: string;
  /** Optional media URLs (photos / video / audio). */
  media?: string[];
  /** Optional media kind. */
  mediaKind?: "photo" | "video" | "audio" | "none";
  /** Optional location string. */
  location?: string;
  /** Optional link the source references. */
  link?: string;
  /** Optional ISO timestamp of the source content. */
  at?: string;
}

export interface ShareTargetResult {
  target: ShareTargetId;
  ok: boolean;
  /** ID returned by the target module's create endpoint. */
  id?: string;
  /** Transformed payload (echoed back for UI preview). */
  payload: Record<string, unknown>;
  /** Error message when ok === false. */
  error?: string;
  /** Wall-clock ms spent on the dispatch. */
  elapsedMs: number;
}

// ── Target metadata (for the share sheet UI) ─────────────────────────────

export interface ShareTargetMeta {
  id: ShareTargetId;
  label: string;
  emoji: string;
  description: string;
  /** Tailwind tint class for the avatar tile. */
  tint: string;
}

export const SHARE_TARGETS: ShareTargetMeta[] = [
  { id: "wasl", label: "Wasl", emoji: "💬", description: "Send as a chat message", tint: "bg-emerald-500/15 border-emerald-500/30" },
  { id: "midan", label: "Midan", emoji: "📢", description: "Post to the public square", tint: "bg-amber-500/15 border-amber-500/30" },
  { id: "lamahat", label: "Lamahat", emoji: "📸", description: "Share as a photo moment", tint: "bg-rose-500/15 border-rose-500/30" },
  { id: "rihla", label: "Rihla", emoji: "🧭", description: "Add to a travel itinerary", tint: "bg-sky-500/15 border-sky-500/30" },
  { id: "citizen-shield", label: "Citizen Shield", emoji: "🛡️", description: "File a civic report", tint: "bg-violet-500/15 border-violet-500/30" },
  { id: "commit", label: "Commit", emoji: "⚖️", description: "Lock in a formal commitment", tint: "bg-indigo-500/15 border-indigo-500/30" },
];

// ── Helpers ─────────────────────────────────────────────────────────────

async function postJson(url: string, body: unknown, timeoutMs = 8000): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false, error: (data.error as string) ?? `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  } finally {
    clearTimeout(timeout);
  }
}

function elapsed(start: number): number {
  return Date.now() - start;
}

function clip(s: string, max: number): string {
  const t = (s ?? "").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

// ── A3. Share Wasl Message → Midan ──────────────────────────────────────

/**
 * A Wasl chat message becomes a Midan post. The body is preserved verbatim
 * (trimmed to Midan's 4,000-char limit) and the original chat author becomes
 * the post author. A "via Wasl" footer is appended so the post's provenance is
 * visible to the reader.
 */
export async function shareToMidan(source: ShareSource, username = "anonymous"): Promise<ShareTargetResult> {
  const startedAt = Date.now();
  const viaWasl = `\n\n— via Wasl 💬`;
  const body = clip(`${(source.body ?? "").trim()}${viaWasl}`, 4000);
  const payload = {
    module: "midan",
    body,
    content: body,
    author: username,
    visibility: "public",
    mediaKind: source.mediaKind ?? (source.media?.length ? "image" : "none"),
    media: source.media ?? [],
    location: source.location ?? null,
  };
  const r = await postJson("/api/posts", payload);
  return {
    target: "midan",
    ok: r.ok,
    id: r.ok ? ((r.data?.id as string) ?? (r.data?.post?.id as string)) : undefined,
    payload,
    error: r.error,
    elapsedMs: elapsed(startedAt),
  };
}

// ── A4. Share Midan Post → Wasl ─────────────────────────────────────────

/**
 * A Midan post becomes a Wasl chat message draft. Because we can't post a chat
 * message on behalf of a user without a target conversationId (chosen on the
 * client), this function returns a *draft payload* — the actual `/api/conversations/.../messages`
 * POST is performed by the client after the user picks a conversation.
 */
export async function shareToWasl(source: ShareSource): Promise<ShareTargetResult> {
  const startedAt = Date.now();
  const trimmed = (source.body ?? "").trim();
  const summary = clip(trimmed, 280);
  const link = source.link ? `\n\n${source.link}` : "";
  const body = `${summary}${link}\n\n— shared from ${source.module === "midan" ? "Midan" : source.module} 📢`;
  const payload = {
    module: "wasl",
    body,
    draft: true,
    sourceContentId: source.contentId,
    sourceAuthor: source.author,
    media: source.media ?? [],
  };
  return {
    target: "wasl",
    ok: true,
    id: `wasl-draft-${Date.now()}`,
    payload,
    elapsedMs: elapsed(startedAt),
  };
}

// ── A7. Share Rihla Itinerary → Wasl ────────────────────────────────────

/**
 * A Rihla itinerary becomes a Wasl chat message draft with a tidy summary.
 */
export async function shareRihlaToWasl(source: ShareSource): Promise<ShareTargetResult> {
  const startedAt = Date.now();
  const title = source.body?.trim() || "My itinerary";
  const summary = source.caption?.trim() || "";
  const link = source.link ? `\n\n${source.link}` : "";
  const body = `🧭 Trip: ${title}${summary ? `\n${clip(summary, 220)}` : ""}${link}\n\n— shared from Rihla`;
  const payload = {
    module: "wasl",
    body,
    draft: true,
    sourceContentId: source.contentId,
    sourceModule: "rihla",
  };
  return {
    target: "wasl",
    ok: true,
    id: `wasl-rihla-draft-${Date.now()}`,
    payload,
    elapsedMs: elapsed(startedAt),
  };
}

// ── A8. Share Lamahat Photo → Wasl ─────────────────────────────────────

/**
 * A Lamahat photo becomes a Wasl chat message draft with the photo URL
 * attached and the caption preserved.
 */
export async function shareLamahatToWasl(source: ShareSource): Promise<ShareTargetResult> {
  const startedAt = Date.now();
  const caption = (source.caption ?? source.body ?? "").trim();
  const photo = source.media?.[0];
  const body = caption
    ? `📸 ${clip(caption, 280)}\n\n— shared from Lamahat`
    : "📸 Shared from Lamahat";
  const payload = {
    module: "wasl",
    body,
    draft: true,
    sourceContentId: source.contentId,
    sourceModule: "lamahat",
    media: photo ? [photo] : [],
    attachmentKind: photo ? "image" : "none",
    attachmentUrl: photo ?? null,
  };
  return {
    target: "wasl",
    ok: true,
    id: `wasl-lamahat-draft-${Date.now()}`,
    payload,
    elapsedMs: elapsed(startedAt),
  };
}

// ── A5. Citizen Shield Report from Wasl ─────────────────────────────────

export interface ShieldReportDraft {
  category: string;
  title: string;
  description: string;
  evidenceHashes: string[];
  officeName: string;
  officeRegion: string;
  privacyLevel: "identified" | "protected" | "anonymous";
}

/**
 * Transforms a Wasl chat message into a Citizen Shield report draft.
 * Pre-fills:
 *   • category — heuristic ("harassment" / "fraud" / "threats" / "other")
 *   • title — clipped body
 *   • description — full body + sender info
 *   • evidenceHashes — media URLs (the Shield API treats them as opaque hashes
 *     in production; we forward them as-is for the draft stage)
 *   • privacyLevel — "protected" (the user can downgrade to anonymous later)
 */
export function buildShieldReportDraft(source: ShareSource): ShieldReportDraft {
  const body = (source.body ?? "").trim();
  const lower = body.toLowerCase();
  let category = "other";
  if (/threat|kill|hurt|attack|kill you/.test(lower)) category = "threats";
  else if (/scam|fraud|phish|transfer.*money|crypto|invest/.test(lower)) category = "fraud";
  else if (/harass|abuse|insult|slut|whore|bitch|fag/.test(lower)) category = "harassment";
  else if (/stalking|following|watching/.test(lower)) category = "stalking";

  const title = clip(body, 80) || "Reported message";
  const description = [
    `Reported message from ${source.author || "unknown sender"}:`,
    "",
    `"${clip(body, 1500)}"`,
    "",
    source.link ? `Link mentioned: ${source.link}` : "",
    source.at ? `Sent: ${source.at}` : "",
  ].filter(Boolean).join("\n");

  return {
    category,
    title,
    description,
    evidenceHashes: source.media ?? [],
    officeName: "Cirkle Trust & Safety",
    officeRegion: "EG",
    privacyLevel: "protected",
  };
}

/**
 * POSTs a Shield report draft built from a Wasl message to the
 * `/api/shield/report` endpoint (which creates a `ShieldReport` row).
 */
export async function shareToCitizenShield(source: ShareSource): Promise<ShareTargetResult> {
  const startedAt = Date.now();
  const draft = buildShieldReportDraft(source);
  const payload = {
    ...draft,
    sourceContentId: source.contentId,
    sourceModule: source.module,
  };
  const r = await postJson("/api/shield/report", payload);
  return {
    target: "citizen-shield",
    ok: r.ok,
    id: r.ok ? ((r.data?.id as string) ?? (r.data?.caseNumber as string)) : undefined,
    payload,
    error: r.error,
    elapsedMs: elapsed(startedAt),
  };
}

// ── A9. Commit → Midan Public Commitment ───────────────────────────────

export interface PublicCommitmentDraft {
  body: string;
  author: string;
  visibility: "public";
  /** Tags to surface the commitment in Midan search. */
  tags: string[];
}

/**
 * Builds a public Midan post announcing a commitment WITHOUT exposing the
 * private commitment terms (amounts, deadlines, parties). The announcement
 * is intentionally vague: "X just made a commitment via Cirkle Commit ⚖️".
 *
 * If the source body contains sensitive markers (currency, dates), they are
 * stripped before publishing.
 */
export function buildPublicCommitmentDraft(source: ShareSource, username = "anonymous"): PublicCommitmentDraft {
  // Strip obvious sensitive patterns: amounts ($1,200 / 1,200 EGP), dates
  // (Friday, 2024-01-15, etc.), emails, phone numbers.
  let safe = (source.body ?? "").trim();
  safe = safe.replace(/\$?\s?\d[\d,]*(?:\.\d+)?\s?(?:EGP|USD|SAR|AED|EUR)?/gi, "[amount]");
  safe = safe.replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "[day]");
  safe = safe.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "[date]");
  safe = safe.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]");
  safe = safe.replace(/\+?\d[\d\s-]{7,}/g, "[phone]");
  safe = clip(safe, 240);

  const body = [
    `⚖️ ${username} just made a commitment via Cirkle Commit.`,
    safe ? `\n"${safe}"` : "",
    `\n— verified on-chain ⚓`,
  ].filter(Boolean).join("\n");

  return {
    body,
    author: username,
    visibility: "public",
    tags: ["commit", "cirkle-pact", "verified"],
  };
}

/**
 * POSTs a public commitment announcement to `/api/posts` (Midan).
 */
export async function shareCommitToMidan(source: ShareSource, username = "anonymous"): Promise<ShareTargetResult> {
  const startedAt = Date.now();
  const draft = buildPublicCommitmentDraft(source, username);
  const payload = {
    module: "midan",
    body: draft.body,
    content: draft.body,
    author: draft.author,
    visibility: "public",
    mediaKind: "none",
    media: [],
    tags: draft.tags.join(","),
    sourceContentId: source.contentId,
    sourceModule: source.module,
  };
  const r = await postJson("/api/posts", payload);
  return {
    target: "midan",
    ok: r.ok,
    id: r.ok ? ((r.data?.id as string) ?? (r.data?.post?.id as string)) : undefined,
    payload,
    error: r.error,
    elapsedMs: elapsed(startedAt),
  };
}

// ── A7/A8 alt entrypoints: Rihla itinerary share + Lamahat photo share ──

/**
 * Generic share dispatcher — picks the right transformer based on the target.
 * Used by the Universal Share Sheet on the client (via the per-target API
 * routes).
 */
export async function dispatchShare(
  source: ShareSource,
  target: ShareTargetId,
  username = "anonymous",
): Promise<ShareTargetResult> {
  switch (target) {
    case "wasl":
      // Rihla/Lamahat/etc → Wasl use the specialised draft builders when
      // the source is a known module; otherwise fall back to the generic
      // shareToWasl.
      if (source.module === "rihla") return shareRihlaToWasl(source);
      if (source.module === "lamahat") return shareLamahatToWasl(source);
      return shareToWasl(source);
    case "midan":
      return shareToMidan(source, username);
    case "lamahat":
      // No native endpoint for Lamahat photos in this scope — we POST to
      // /api/posts with module: "lamahat" (the existing /api/posts route
      // already routes by module).
      return shareToMidan({ ...source, module: "lamahat" as ShareSourceId }, username);
    case "rihla":
      // Rihla doesn't have a public create endpoint — we record a draft.
      return {
        target: "rihla",
        ok: true,
        id: `rihla-draft-${Date.now()}`,
        payload: {
          module: "rihla",
          body: clip(source.body, 240),
          draft: true,
          sourceContentId: source.contentId,
        },
        elapsedMs: 0,
      };
    case "citizen-shield":
      return shareToCitizenShield(source);
    case "commit":
      return shareCommitToMidan(source, username);
  }
}

// ── Convenience: human-readable label for an error ──────────────────────

export function describeShareError(result: ShareTargetResult): string {
  if (result.ok) return "Shared successfully";
  if (!result.error) return "Unknown error";
  if (result.error.startsWith("HTTP 5")) return "Target module is down — try again later";
  if (result.error.startsWith("HTTP 4")) return "Request rejected by target module";
  if (result.error.includes("abort")) return "Timed out — target module took too long";
  return result.error;
}
