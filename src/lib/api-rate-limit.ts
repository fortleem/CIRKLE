/**
 * CIRKLE — API Rate Limiting Middleware (Production Recommendation #5)
 * ============================================================================
 * A wrapper that applies rate-limiting to an API route handler using the
 * existing distributed limiter in `src/lib/rate-limit.ts`.
 *
 * Usage:
 *   import { withRateLimit } from "@/lib/api-rate-limit";
 *
 *   export const POST = withRateLimit(handler, {
 *     maxRequests: 20,
 *     windowMs: 60_000,
 *     keyBy: "ip",
 *   });
 *
 * When the limit is exceeded the wrapper returns `429 Too Many Requests`
 * with a `Retry-After` header (seconds) and the standard
 * `X-RateLimit-{Limit,Remaining,Reset}` headers. On success, those same
 * headers are attached to the underlying handler's response so clients can
 * throttle themselves.
 *
 * `keyBy`:
 *   - `"ip"` (default) — bucket by client IP from `x-forwarded-for` /
 *     `x-real-ip` (via `getClientIP`).
 *   - `"userId"` — bucket by `x-cirkle-user-id` header (set by the
 *     authenticated proxy in production). Falls back to IP when the header
 *     is missing so the route is never unprotected.
 *
 * Generic over `R extends Request` so handlers typed with `NextRequest`
 * compose without `strictFunctionTypes` errors.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import {
  rateLimit,
  getClientIP,
  getRateLimitHeaders,
  type RateLimitResult,
} from "@/lib/rate-limit";

export interface RateLimitOptions {
  /** Max requests allowed in the window. */
  maxRequests: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Bucket key: by client IP (default) or by user id. */
  keyBy?: "ip" | "userId";
  /** Optional scope prefix so different routes with the same limits
   *  don't share buckets. Defaults to the request URL pathname. */
  scope?: string;
}

/** Determine the rate-limit key for the incoming request. */
function resolveKey(req: Request, options: RateLimitOptions): string {
  const scope = options.scope ?? new URL(req.url).pathname;
  if (options.keyBy === "userId") {
    const userId = req.headers.get("x-cirkle-user-id")?.trim();
    if (userId) return `${scope}:user:${userId}`;
    // Fall back to IP when no user id is present (unauthenticated caller).
    return `${scope}:ip:${getClientIP(req)}`;
  }
  return `${scope}:ip:${getClientIP(req)}`;
}

/** Attach the standard rate-limit headers to a Response. */
function attachHeaders(
  res: Response | NextResponse,
  result: RateLimitResult,
): Response | NextResponse {
  const headers = getRateLimitHeaders(result);
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}

/**
 * Wrap an API route handler with rate-limiting. Any extra args (e.g. the
 * App Router `ctx` for dynamic routes) are forwarded to the underlying
 * handler so it remains a drop-in replacement.
 */
export function withRateLimit<
  R extends Request,
  Args extends unknown[],
>(
  handler: (req: R, ...rest: Args) => Promise<Response | NextResponse> | Response | NextResponse,
  options: RateLimitOptions,
): (req: R, ...rest: Args) => Promise<Response | NextResponse> {
  return async function rateLimited(req: R, ...rest: Args): Promise<Response | NextResponse> {
    const key = resolveKey(req, options);
    const result = rateLimit(key, options.maxRequests, options.windowMs);

    if (!result.ok) {
      const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "too many requests, please retry later",
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            ...getRateLimitHeaders(result),
          },
        },
      );
    }

    const response = await handler(req, ...rest);
    return attachHeaders(response, result);
  };
}

/**
 * Convenience presets for the CIRKLE platform — match the production
 * recommendation matrix in the task brief.
 */
export const RATE_LIMIT_PRESETS = {
  /** AI is expensive — 20 req/min. */
  ai: { maxRequests: 20, windowMs: 60_000, keyBy: "ip" as const },
  /** News search — 30 req/min. */
  newsSearch: { maxRequests: 30, windowMs: 60_000, keyBy: "ip" as const },
  /** Post creation — 10 req/min (anti-spam). */
  posts: { maxRequests: 10, windowMs: 60_000, keyBy: "ip" as const },
  /** News read — 60 req/min. */
  news: { maxRequests: 60, windowMs: 60_000, keyBy: "ip" as const },
} as const;
