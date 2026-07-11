/**
 * CIRKLE Brain AI — AI Response Cache (Upgrade 9)
 * ============================================================================
 * Caches AI provider responses to reduce costs + latency.
 * Cache key = hash of (query + context). TTL-based expiration.
 * ============================================================================
 */

import { getCachedResponse, setCachedResponse, cleanExpiredCache } from "@/lib/ai-persistence";

// ── Cache key generation ─────────────────────────────────────────────────

function generateCacheKey(query: string, context?: Record<string, unknown>): string {
  const contextStr = context ? JSON.stringify(context) : "";
  // Simple hash (production: use crypto.createHash).
  let hash = 0;
  const str = `${query}:${contextStr}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = Math.abs(hash);
  }
  return `aicache_${hash.toString(36)}`;
}

// ── TTL recommendations by query type ────────────────────────────────────

const TTL_BY_TYPE: Record<string, number> = {
  news: 300,        // 5 minutes (news changes frequently)
  weather: 600,     // 10 minutes
  general: 1800,    // 30 minutes
  knowledge: 3600,  // 1 hour (factual knowledge doesn't change)
  personal: 0,      // 0 = never cache (user-specific)
};

// ── Cache wrapper ────────────────────────────────────────────────────────

export class AICache {
  /**
   * Try to get a cached response. Returns null if not cached or expired.
   */
  async get(query: string, context?: Record<string, unknown>): Promise<unknown | null> {
    const key = generateCacheKey(query, context);
    return getCachedResponse(key);
  }

  /**
   * Store a response in the cache.
   */
  async set(params: {
    query: string;
    context?: Record<string, unknown>;
    response: unknown;
    provider: string;
    confidence: number;
    queryType?: keyof typeof TTL_BY_TYPE;
    customTtlSeconds?: number;
  }): Promise<void> {
    const ttl = params.customTtlSeconds ?? TTL_BY_TYPE[params.queryType || "general"] ?? 1800;
    if (ttl === 0) return; // Don't cache personal queries.

    const key = generateCacheKey(params.query, params.context);
    await setCachedResponse({
      cacheKey: key,
      query: params.query,
      response: params.response,
      provider: params.provider,
      confidence: params.confidence,
      ttlSeconds: ttl,
    });
  }

  /**
   * Execute a function with caching. If cached, returns the cached response.
   * Otherwise, executes the function and caches the result.
   */
  async withCache<T>(params: {
    query: string;
    context?: Record<string, unknown>;
    queryType?: keyof typeof TTL_BY_TYPE;
    customTtlSeconds?: number;
    fn: () => Promise<{ result: T; provider: string; confidence: number }>;
  }): Promise<T> {
    // Try cache first.
    const cached = await this.get(params.query, params.context);
    if (cached) {
      return cached as T;
    }

    // Execute + cache.
    const { result, provider, confidence } = await params.fn();
    await this.set({
      query: params.query,
      context: params.context,
      response: result,
      provider,
      confidence,
      queryType: params.queryType,
      customTtlSeconds: params.customTtlSeconds,
    });
    return result;
  }

  /**
   * Clean expired cache entries (call periodically).
   */
  async cleanExpired(): Promise<number> {
    return cleanExpiredCache();
  }
}

export const globalAICache = new AICache();
