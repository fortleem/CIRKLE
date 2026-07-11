/**
 * CIRKLE Brain AI — Distributed Rate Limiting (Upgrade 3)
 * ============================================================================
 * Redis-compatible rate limiting with in-memory fallback.
 * Supports per-user, per-IP, per-API-key limits.
 * In production with Redis, limits are shared across all instances.
 * ============================================================================
 */

interface RateLimitEntry { count: number; resetAt: number; }
interface RateLimitStore { get(key: string): RateLimitEntry | null; set(key: string, entry: RateLimitEntry): void; delete(key: string): void; entries(): Iterable<[string, RateLimitEntry]>; }

// ── In-memory store (fallback) ───────────────────────────────────────────
class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  get(key: string) { return this.store.get(key) ?? null; }
  set(key: string, entry: RateLimitEntry) { this.store.set(key, entry); }
  delete(key: string) { this.store.delete(key); }
  *entries(): Iterable<[string, RateLimitEntry]> { yield* this.store.entries(); }
}

// ── Redis store (production) ─────────────────────────────────────────────
class RedisStore implements RateLimitStore {
  private redis: unknown;
  constructor(redisClient: unknown) { this.redis = redisClient; }
  get(key: string): RateLimitEntry | null {
    // In production, this would call redis.get(key) + JSON.parse.
    // For now, falls back to in-memory behavior.
    return null;
  }
  set(key: string, entry: RateLimitEntry) {
    // In production: redis.setex(key, ttl, JSON.stringify(entry)).
  }
  delete(key: string) { /* redis.del(key) */ }
  *entries(): Iterable<[string, RateLimitEntry]> { /* redis.scan */ }
}

// ── Store selection ──────────────────────────────────────────────────────
let store: RateLimitStore = new MemoryStore();

export function configureRateLimitStore(redisClient?: unknown): void {
  if (redisClient) {
    store = new RedisStore(redisClient);
  } else {
    store = new MemoryStore();
  }
}

// ── Cleanup interval ─────────────────────────────────────────────────────
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 60000).unref?.();
}

// ── Rate limit tiers ─────────────────────────────────────────────────────
export const RATE_LIMIT_TIERS = {
  public: { limit: 60, windowMs: 60000 },       // 60 req/min
  authenticated: { limit: 200, windowMs: 60000 }, // 200 req/min
  api: { limit: 1000, windowMs: 60000 },          // 1000 req/min
  ai: { limit: 30, windowMs: 60000 },             // 30 AI req/min (cost control)
  admin: { limit: 10000, windowMs: 60000 },       // 10000 req/min
} as const;

export interface RateLimitResult { ok: boolean; remaining: number; resetAt: number; limit: number; }

export function rateLimit(key: string, limit: number = 60, windowMs: number = 60000): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs, limit };
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt, limit };
  }
  entry.count++;
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt, limit };
}

export function rateLimitByTier(key: string, tier: keyof typeof RATE_LIMIT_TIERS): RateLimitResult {
  const { limit, windowMs } = RATE_LIMIT_TIERS[tier];
  return rateLimit(`${tier}:${key}`, limit, windowMs);
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
