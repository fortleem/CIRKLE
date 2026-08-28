// @ts-nocheck
/**
 * CIRKLE — Rate Limit Expansion (Production Recommendation #5 Phase 2)
 * ============================================================================
 * A comprehensive rate-limiting utility built on top of the existing
 * `withRateLimit` wrapper in `@/lib/api-rate-limit.ts`. Adds new presets
 * covering every common API class and a `applyRateLimitToRoute` helper for
 * wrapping existing route handlers without touching their internals.
 *
 * Presets (per the task brief):
 *   • AUTH        — 5  req/min   (login / signup / password reset / OTP)
 *   • DESTRUCTIVE — 3  req/min   (delete account / revoke all sessions /
 *                                  purge data / factory reset)
 *   • SENSITIVE   — 10 req/min   (mark-read / settings update / payment
 *                                  initiation / export data / follow /
 *                                  verification apply)
 *   • STANDARD    — 30 req/min   (most read/write endpoints)
 *   • PUBLIC      — 60 req/min   (anonymous / discovery / public feed)
 *
 * Usage:
 *   import { withRateLimitAll, RATE_LIMIT_PRESETS_ALL } from "@/lib/rate-limit-all";
 *
 *   export const GET = withRateLimitAll(handler, RATE_LIMIT_PRESETS_ALL.PUBLIC);
 *   export const POST = withRateLimitAll(handler, RATE_LIMIT_PRESETS_ALL.SENSITIVE);
 *   export const DELETE = withRateLimitAll(handler, RATE_LIMIT_PRESETS_ALL.DESTRUCTIVE);
 *
 * Or for an existing route handler that already exports a function:
 *   import { applyRateLimitToRoute } from "@/lib/rate-limit-all";
 *   export const GET = applyRateLimitToRoute(originalGetHandler, "PUBLIC");
 * ============================================================================
 */

import { NextResponse } from "next/server";
import {
  withRateLimit,
  type RateLimitOptions,
} from "@/lib/api-rate-limit";
import {
  rateLimit,
  getClientIP,
  getRateLimitHeaders,
  type RateLimitResult,
} from "@/lib/rate-limit";

// ─────────────────────────────────────────────────────────────────────────────
// Presets — match the task brief exactly
// ─────────────────────────────────────────────────────────────────────────────

export type RateLimitPresetName =
  | "AUTH"
  | "DESTRUCTIVE"
  | "SENSITIVE"
  | "STANDARD"
  | "PUBLIC";

export type RateLimitPreset = RateLimitOptions;

export const RATE_LIMIT_PRESETS_ALL: Record<
  RateLimitPresetName,
  RateLimitPreset
> = {
  /** Auth — login / signup / password reset / OTP — 5/min. */
  AUTH: {
    maxRequests: 5,
    windowMs: 60_000,
    keyBy: "ip",
    scope: "auth",
  },
  /** Destructive — account deletion / revoke-all / data purge — 3/min. */
  DESTRUCTIVE: {
    maxRequests: 3,
    windowMs: 60_000,
    keyBy: "ip",
    scope: "destructive",
  },
  /** Sensitive — settings update / mark-read / payment / export — 10/min. */
  SENSITIVE: {
    maxRequests: 10,
    windowMs: 60_000,
    keyBy: "ip",
    scope: "sensitive",
  },
  /** Standard — most read/write endpoints — 30/min. */
  STANDARD: {
    maxRequests: 30,
    windowMs: 60_000,
    keyBy: "ip",
    scope: "standard",
  },
  /** Public — anonymous / discovery / public feed — 60/min. */
  PUBLIC: {
    maxRequests: 60,
    windowMs: 60_000,
    keyBy: "ip",
    scope: "public",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// withRateLimitAll — same signature as `withRateLimit` but with our presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap an API route handler with one of the comprehensive presets.
 *
 * Accepts either a preset name (string) or a full `RateLimitOptions` object
 * (so callers can override `scope` / `keyBy` per-route while inheriting the
 * preset's `maxRequests` / `windowMs`).
 *
 * On rate-limit exceeded, returns 429 with `Retry-After` and the standard
 * `X-RateLimit-{Limit,Remaining,Reset}` headers, mirroring `withRateLimit`.
 */
export function withRateLimitAll<
  R extends Request,
  Args extends unknown[],
>(
  handler: (req: R, ...rest: Args) => Promise<Response | NextResponse> | Response | NextResponse,
  options: RateLimitOptions | RateLimitPresetName,
): (req: R, ...rest: Args) => Promise<Response | NextResponse> {
  const resolved: RateLimitOptions =
    typeof options === "string"
      ? { ...RATE_LIMIT_PRESETS_ALL[options] }
      : { ...options };

  return withRateLimit(handler, resolved);
}

// ─────────────────────────────────────────────────────────────────────────────
// applyRateLimitToRoute — quick wrapper for existing exported route handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap an existing route handler with a named preset, WITHOUT touching the
 * handler's internals. Useful for retrofitting rate-limiting onto routes
 * that already have `export const GET = someHandler`.
 *
 * Usage:
 *   import { applyRateLimitToRoute } from "@/lib/rate-limit-all";
 *
 *   // before:
 *   // export const GET = myHandler;
 *   // after:
 *   export const GET = applyRateLimitToRoute(myHandler, "PUBLIC");
 *
 * The wrapper preserves the original handler's HTTP method signature and
 * forwards all args (including the App Router `ctx` for dynamic routes).
 */
export function applyRateLimitToRoute<
  R extends Request,
  Args extends unknown[],
>(
  route: (req: R, ...rest: Args) => Promise<Response | NextResponse> | Response | NextResponse,
  preset: RateLimitPresetName,
): (req: R, ...rest: Args) => Promise<Response | NextResponse> {
  return withRateLimitAll(route, preset);
}

// ─────────────────────────────────────────────────────────────────────────────
// checkRateLimit — imperative check (for use outside route handlers)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Imperatively check rate-limit for a given request + preset. Returns the
 * `RateLimitResult` and, when exceeded, a ready-made 429 `NextResponse`.
 *
 * Useful for routes that need to check multiple limits (e.g. IP-based +
 * user-based) and merge the results, or for non-route code (e.g. server
 * actions) that still wants to honour the same limits.
 */
export function checkRateLimit(
  req: Request,
  preset: RateLimitPresetName,
  scopeOverride?: string,
): { result: RateLimitResult; response: NextResponse | null } {
  const presetCfg = RATE_LIMIT_PRESETS_ALL[preset];
  const scope =
    scopeOverride ??
    presetCfg.scope ??
    new URL(req.url).pathname;
  const ip = getClientIP(req);
  const key = `${scope}:ip:${ip}`;
  const result = rateLimit(key, presetCfg.maxRequests, presetCfg.windowMs);

  if (!result.ok) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((result.resetAt - Date.now()) / 1000),
    );
    const response = NextResponse.json(
      {
        error: "rate_limit_exceeded",
        message: "too many requests, please retry later",
        retryAfter: retryAfterSec,
        preset,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          ...getRateLimitHeaders(result),
        },
      },
    );
    return { result, response };
  }

  return { result, response: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE_PRESET_MAP — a static map of route-path patterns to presets, for
// future auto-discovery / middleware use. Not yet consumed by anything in
// this file, but exposed so a future middleware / audit task can read it.
// ─────────────────────────────────────────────────────────────────────────────

export const ROUTE_PRESET_MAP: Array<{
  pattern: RegExp;
  preset: RateLimitPresetName;
  description: string;
}> = [
  // AUTH — login / signup / OTP / password reset
  { pattern: /\/api\/auth(\/|$)/, preset: "AUTH", description: "Authentication endpoints" },
  { pattern: /\/api\/login(\/|$)/, preset: "AUTH", description: "Login" },
  { pattern: /\/api\/signup(\/|$)/, preset: "AUTH", description: "Signup" },
  { pattern: /\/api\/otp(\/|$)/, preset: "AUTH", description: "OTP issuance / verification" },
  { pattern: /\/api\/password-reset(\/|$)/, preset: "AUTH", description: "Password reset" },
  { pattern: /\/api\/verify(\/|$)/, preset: "AUTH", description: "Verification apply" },

  // DESTRUCTIVE — account / data deletion
  { pattern: /\/api\/account\/delete(\/|$)/, preset: "DESTRUCTIVE", description: "Account deletion" },
  { pattern: /\/api\/data\/purge(\/|$)/, preset: "DESTRUCTIVE", description: "Data purge" },
  { pattern: /\/api\/sessions\/revoke-all(\/|$)/, preset: "DESTRUCTIVE", description: "Revoke all sessions" },
  { pattern: /\/api\/vault\/purge(\/|$)/, preset: "DESTRUCTIVE", description: "Vault purge" },
  { pattern: /\/api\/factory-reset(\/|$)/, preset: "DESTRUCTIVE", description: "Factory reset" },

  // SENSITIVE — settings / payments / mark-read / follow / export
  { pattern: /\/api\/settings(\/|$)/, preset: "SENSITIVE", description: "Settings update" },
  { pattern: /\/api\/notifications\/(unified|ranked)/, preset: "SENSITIVE", description: "Mark as read" },
  { pattern: /\/api\/payments(\/|$)/, preset: "SENSITIVE", description: "Payment initiation" },
  { pattern: /\/api\/export(\/|$)/, preset: "SENSITIVE", description: "Data export" },
  { pattern: /\/api\/follow(\/|$)/, preset: "SENSITIVE", description: "Follow / unfollow" },
  { pattern: /\/api\/dsr(\/|$)/, preset: "SENSITIVE", description: "DSR request" },
  { pattern: /\/api\/inter-agency-referral(\/|$)/, preset: "SENSITIVE", description: "Inter-agency referral" },

  // STANDARD — most read/write endpoints
  { pattern: /\/api\/posts(\/|$)/, preset: "STANDARD", description: "Post create / update" },
  { pattern: /\/api\/messages(\/|$)/, preset: "STANDARD", description: "Send message" },
  { pattern: /\/api\/comments(\/|$)/, preset: "STANDARD", description: "Comments" },
  { pattern: /\/api\/circles(\/|$)/, preset: "STANDARD", description: "Circle management" },
  { pattern: /\/api\/mail(\/|$)/, preset: "STANDARD", description: "Mail operations" },
  { pattern: /\/api\/jobs(\/|$)/, preset: "STANDARD", description: "Job applications" },
  { pattern: /\/api\/ai(\/|$)/, preset: "STANDARD", description: "AI endpoint" },
  { pattern: /\/api\/calls(\/|$)/, preset: "STANDARD", description: "Call management" },

  // PUBLIC — anonymous / discovery / public feed
  { pattern: /\/api\/news(\/|$)/, preset: "PUBLIC", description: "News read" },
  { pattern: /\/api\/search(\/|$)/, preset: "PUBLIC", description: "Universal search" },
  { pattern: /\/api\/trust-center(\/|$)/, preset: "PUBLIC", description: "Trust center read" },
  { pattern: /\/api\/service-directory(\/|$)/, preset: "PUBLIC", description: "Service directory" },
  { pattern: /\/api\/health(\/|$)/, preset: "PUBLIC", description: "Health check" },
];

/**
 * Look up the recommended preset for a given URL path. Returns `null` when
 * no preset matches — callers should fall back to `STANDARD`.
 */
export function presetForRoute(pathname: string): RateLimitPresetName | null {
  for (const entry of ROUTE_PRESET_MAP) {
    if (entry.pattern.test(pathname)) return entry.preset;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 20-route expansion recommendation — these are the routes that currently
// lack rate limiting and should adopt the wrapper. Listed here as
// documentation; the actual wrapping must be done per-route to honour the
// "create-only" constraint of this task.
// ─────────────────────────────────────────────────────────────────────────────

export const RECOMMENDED_ROUTES_TO_WRAP: Array<{
  route: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  preset: RateLimitPresetName;
  reason: string;
}> = [
  { route: "/api/auth/login", method: "POST", preset: "AUTH", reason: "Login brute-force prevention" },
  { route: "/api/auth/signup", method: "POST", preset: "AUTH", reason: "Signup flood prevention" },
  { route: "/api/auth/otp", method: "POST", preset: "AUTH", reason: "OTP issuance" },
  { route: "/api/password-reset", method: "POST", preset: "AUTH", reason: "Password reset flood" },
  { route: "/api/account/delete", method: "DELETE", preset: "DESTRUCTIVE", reason: "Account deletion" },
  { route: "/api/sessions/revoke-all", method: "POST", preset: "DESTRUCTIVE", reason: "Revoke all sessions" },
  { route: "/api/data/purge", method: "POST", preset: "DESTRUCTIVE", reason: "Data purge" },
  { route: "/api/vault/purge", method: "DELETE", preset: "DESTRUCTIVE", reason: "Vault purge" },
  { route: "/api/settings", method: "PUT", preset: "SENSITIVE", reason: "Settings update" },
  { route: "/api/payments", method: "POST", preset: "SENSITIVE", reason: "Payment initiation" },
  { route: "/api/payments/send", method: "POST", preset: "SENSITIVE", reason: "Send payment" },
  { route: "/api/export", method: "POST", preset: "SENSITIVE", reason: "Data export" },
  { route: "/api/follow", method: "POST", preset: "SENSITIVE", reason: "Follow / unfollow" },
  { route: "/api/dsr", method: "POST", preset: "SENSITIVE", reason: "DSR request intake" },
  { route: "/api/inter-agency-referral", method: "POST", preset: "SENSITIVE", reason: "Inter-agency referral" },
  { route: "/api/posts", method: "POST", preset: "STANDARD", reason: "Post creation" },
  { route: "/api/messages", method: "POST", preset: "STANDARD", reason: "Send message" },
  { route: "/api/comments", method: "POST", preset: "STANDARD", reason: "Comments" },
  { route: "/api/news", method: "GET", preset: "PUBLIC", reason: "News read" },
  { route: "/api/search", method: "GET", preset: "PUBLIC", reason: "Universal search" },
];
