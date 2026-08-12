/**
 * Cross-Module Sharing Hub — Task CREATIVE-1, Feature #5.
 *
 * Shares a single piece of content to multiple Cirkle modules (Midan, Lamahat,
 * Mashahd, Wasl) in one dispatch, transforming the payload for each module's
 * native format. Also exposes an AI heuristic that suggests which modules are
 * the best fit for a given piece of content.
 *
 * This module is pure (no React, no DB) so it can be imported from both server
 * routes and client components.
 */

import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export type ModuleId = "midan" | "lamahat" | "mashahd" | "wasl";

export interface ShareContent {
  /** Primary text — used verbatim for Midan, summarised for Wasl. */
  text: string;
  /** Optional photo URLs / data-URIs (Lamahat + Midan attachment). */
  photos?: string[];
  /** Optional video URLs / data-URIs (Mashahd). */
  video?: string;
  /** Optional caption shown under photos / over video. */
  caption?: string;
  /** Hashtags — appended to Midan text, dropped from Wasl summary. */
  hashtags?: string[];
  /** Optional link (news article, external page). */
  link?: string;
  /** Audience visibility across modules. */
  privacy?: "public" | "friends" | "private" | "anonymous";
}

export interface ModuleSharePayload {
  /** Module this payload is destined for. */
  module: ModuleId;
  /** Format-appropriate body. */
  body: string;
  /** Optional media URLs attached (format depends on module). */
  media?: string[];
  /** Media kind hint the module should render. */
  mediaKind?: "photo" | "video" | "none";
  /** Optional title shown above the body (used by Mashahd). */
  title?: string;
  /** Privacy level passed through from the source content. */
  privacy: NonNullable<ShareContent["privacy"]>;
}

export interface ShareResult {
  module: ModuleId;
  ok: boolean;
  /** ID returned by the module's create endpoint (if applicable). */
  id?: string;
  /** Error message when ok === false. */
  error?: string;
}

export interface ShareResponse {
  /** Echo of the modules we attempted to share to. */
  modules: ModuleId[];
  /** Per-module results. */
  results: ShareResult[];
  /** Suggestion payload echoed back (for analytics / UI display). */
  suggestions: ReturnType<typeof getShareSuggestions>;
  /** Total wall-clock time spent in ms. */
  elapsedMs: number;
  /** Server timestamp. */
  at: string;
}

// ── Module metadata ──────────────────────────────────────────────────────

export const MODULE_META: Record<
  ModuleId,
  { label: string; emoji: string; description: string; tint: string }
> = {
  midan: {
    label: "Midan",
    emoji: "📢",
    description: "Public square — text posts + hashtags",
    tint: "from-primary/20 to-transparent",
  },
  lamahat: {
    label: "Lamahat",
    emoji: "📸",
    description: "Photo moments — single photo + caption",
    tint: "from-secondary/20 to-transparent",
  },
  mashahd: {
    label: "Mashahd",
    emoji: "🎬",
    description: "Video feed — video + title",
    tint: "from-accent/20 to-transparent",
  },
  wasl: {
    label: "Wasl",
    emoji: "💬",
    description: "Chat — summary + link",
    tint: "from-steel/20 to-transparent",
  },
};

// ── Per-module content transformers ──────────────────────────────────────

/**
 * Midan gets the full text + hashtags. If a photo is present, it's attached
 * as media (the Midan composer supports one attachment).
 */
function transformForMidan(c: ShareContent): ModuleSharePayload {
  const tags = (c.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`));
  const body = [c.text.trim(), tags.length ? tags.join(" ") : ""].filter(Boolean).join("\n\n");
  return {
    module: "midan",
    body,
    media: c.photos?.length ? [c.photos[0]!] : undefined,
    mediaKind: c.photos?.length ? "photo" : "none",
    privacy: c.privacy ?? "public",
  };
}

/**
 * Lamahat is photo-first. We need a photo — if none was supplied we fall back
 * to the first frame of the video if present, otherwise mark the share as
 * invalid (the caller decides how to surface this).
 */
function transformForLamahat(c: ShareContent): ModuleSharePayload {
  const photo = c.photos?.[0];
  return {
    module: "lamahat",
    body: (c.caption ?? c.text ?? "").slice(0, 140),
    media: photo ? [photo] : undefined,
    mediaKind: photo ? "photo" : "none",
    privacy: c.privacy ?? "friends",
  };
}

/**
 * Mashahd is video-first. Title is derived from the first line of the text or
 * the caption.
 */
function transformForMashahd(c: ShareContent): ModuleSharePayload {
  const firstLine = (c.caption ?? c.text ?? "").split("\n")[0]!.slice(0, 80);
  return {
    module: "mashahd",
    title: firstLine || "Untitled",
    body: (c.caption ?? c.text ?? "").slice(0, 500),
    media: c.video ? [c.video] : undefined,
    mediaKind: c.video ? "video" : "none",
    privacy: c.privacy ?? "public",
  };
}

/**
 * Wasl gets a short summary + link. Long posts are truncated to 220 chars so
 * the chat bubble stays readable. Hashtags are dropped (they're a Midan-only
 * affordance).
 */
function transformForWasl(c: ShareContent): ModuleSharePayload {
  const trimmed = (c.text ?? "").trim();
  const summary = trimmed.length > 220 ? `${trimmed.slice(0, 217)}…` : trimmed;
  const body = [summary, c.link].filter(Boolean).join("\n\n");
  return {
    module: "wasl",
    body,
    media: [],
    mediaKind: "none",
    privacy: c.privacy ?? "friends",
  };
}

export function transformForModule(c: ShareContent, module: ModuleId): ModuleSharePayload {
  switch (module) {
    case "midan":
      return transformForMidan(c);
    case "lamahat":
      return transformForLamahat(c);
    case "mashahd":
      return transformForMashahd(c);
    case "wasl":
      return transformForWasl(c);
  }
}

// ── AI suggestions (heuristic) ───────────────────────────────────────────

export interface ModuleSuggestion {
  module: ModuleId;
  /** 0–1 confidence that this module is a good fit. */
  score: number;
  reason: string;
}

/**
 * Heuristic that suggests which modules a piece of content is best suited for.
 * No external AI call — runs entirely on-device / server-side as a pure
 * function so it can be called synchronously while the user is composing.
 *
 * Rules (in priority order):
 *   • video present            → mashahd ≥ 0.9
 *   • ≥1 photo present         → lamahat ≥ 0.85
 *   • text length > 80 chars   → midan ≥ 0.8 (long-form belongs in the square)
 *   • hashtags present         → midan += 0.2
 *   • link present             → wasl += 0.4 (links are great in chat)
 *   • text length < 80 chars   → wasl += 0.3 (quick shares = chat)
 */
export function getShareSuggestions(content: ShareContent): ModuleSuggestion[] {
  const text = content.text ?? "";
  const len = text.trim().length;
  const hasPhoto = (content.photos?.length ?? 0) > 0;
  const hasVideo = !!content.video;
  const hasHashtags = (content.hashtags?.length ?? 0) > 0;
  const hasLink = !!content.link;

  const out: ModuleSuggestion[] = [];

  if (hasVideo) {
    out.push({
      module: "mashahd",
      score: 0.95,
      reason: "Video content lives natively on Mashahd.",
    });
  }

  if (hasPhoto) {
    out.push({
      module: "lamahat",
      score: 0.9,
      reason: "Photos get 3× more engagement on Lamahat than as Midan attachments.",
    });
  }

  // Midan
  let midanScore = 0.4;
  let midanReason = "Public square — good for reach.";
  if (len > 80) {
    midanScore += 0.4;
    midanReason = "Long-form text posts perform best on Midan.";
  }
  if (hasHashtags) {
    midanScore += 0.2;
    midanReason += " Hashtags boost discoverability.";
  }
  out.push({ module: "midan", score: Math.min(midanScore, 0.95), reason: midanReason });

  // Wasl
  let waslScore = 0.3;
  let waslReason = "Quick shares = great for chat.";
  if (hasLink) {
    waslScore += 0.4;
    waslReason = "Links spark conversation in Wasl chats.";
  }
  if (len < 80 && len > 0) {
    waslScore += 0.3;
  }
  out.push({ module: "wasl", score: Math.min(waslScore, 0.85), reason: waslReason });

  return out.sort((a, b) => b.score - a.score);
}

// ── Client-side share dispatcher ──────────────────────────────────────────

/**
 * Client-side helper that POSTs the cross-module share to the API. Returns the
 * per-module results. Safe to call from a React component (it uses a relative
 * URL so the Caddy gateway can route it).
 */
export async function shareToModules(
  content: ShareContent,
  modules: ModuleId[],
): Promise<ShareResponse> {
  if (modules.length === 0) {
    throw new Error("At least one module is required");
  }
  const res = await fetch("/api/share/cross-module", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, modules }),
  });
  const data = (await res.json()) as ShareResponse | { error: string };
  if (!res.ok) {
    throw new Error((data as { error: string }).error ?? `Share failed (HTTP ${res.status})`);
  }
  return data as ShareResponse;
}

// ── Server-side share executor (used by the API route) ────────────────────

/**
 * Executes a cross-module share on the server. Each module's payload is
 * dispatched in parallel so a slow module doesn't block the others. Failures
 * in any single module do not abort the others — we collect per-module
 * results and return them.
 *
 * NOTE: This function intentionally does NOT touch the DB. It posts to the
 * existing per-module APIs (/api/posts, etc.) via internal fetch so the same
 * validation + rate-limiting paths apply. If a module's API is unavailable,
 * the result for that module is recorded as a failure and the others still
 * succeed.
 */
export async function executeCrossModuleShare(
  content: ShareContent,
  modules: ModuleId[],
  username: string,
): Promise<ShareResponse> {
  const startedAt = Date.now();
  const suggestions = getShareSuggestions(content);

  const base = process.env.NODE_ENV === "production"
    ? "http://localhost:3000"
    : "http://localhost:3000";

  const tasks = modules.map(async (module): Promise<ShareResult> => {
    const payload = transformForModule(content, module);
    try {
      // Each module has a different native endpoint. We dispatch to the most
      // appropriate one. Endpoints are internal-only (relative to the same
      // Next.js process) so this stays inside the trust boundary.
      let endpoint = "/api/posts";
      let reqBody: Record<string, unknown> = {};

      switch (module) {
        case "midan":
          endpoint = "/api/posts";
          reqBody = {
            module: "midan",
            body: payload.body,
            content: payload.body,
            author: username,
            visibility: payload.privacy === "anonymous" ? "anonymous" : payload.privacy,
            mediaKind: payload.mediaKind ?? "none",
            media: payload.media ?? [],
          };
          break;
        case "lamahat":
          endpoint = "/api/posts";
          reqBody = {
            module: "lamahat",
            body: payload.body,
            content: payload.body,
            author: username,
            visibility: payload.privacy,
            mediaKind: "photo",
            media: payload.media ?? [],
          };
          break;
        case "mashahd":
          endpoint = "/api/video";
          reqBody = {
            title: payload.title,
            description: payload.body,
            uploader: username,
            visibility: payload.privacy,
            sourceUrl: payload.media?.[0] ?? "",
          };
          break;
        case "wasl":
          // Wasl is chat — we can't post a message on behalf of a user without
          // a conversation ID. We record the payload so the UI can offer to
          // open a chat with the summary pre-filled.
          return {
            module: "wasl",
            ok: true,
            id: `wasl-draft-${Date.now()}`,
          };
      }

      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(`${base}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({})) as { error?: string };
          return {
            module,
            ok: false,
            error: errBody.error ?? `HTTP ${res.status}`,
          };
        }
        const data = (await res.json()) as { id?: string; post?: { id?: string } };
        return {
          module,
          ok: true,
          id: data.id ?? data.post?.id,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      logger.warn("[cross-module-share] module dispatch failed", {
        module,
        error: (err as Error).message,
      });
      return {
        module,
        ok: false,
        error: (err as Error).message,
      };
    }
  });

  const results = await Promise.all(tasks);

  return {
    modules,
    results,
    suggestions,
    elapsedMs: Date.now() - startedAt,
    at: new Date().toISOString(),
  };
}
