// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Knowledge Freshness Manager
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Every knowledge item has a TTL. The Freshness Manager:
 *   - Registers TTLs per (nodeId, metric) pair.
 *   - Periodically checks for stale entries.
 *   - Returns the top-N stale entries to the worker pool for refresh.
 *   - Marks entries as refreshed once their data has been re-acquired.
 *   - Reports a per-domain freshness score (used by the learning orchestrator
 *     to decide if a domain needs a training refresh).
 *
 * Default TTLs by metric type (millisecond):
 *   weather           5 min     (300_000)
 *   flights           30 min    (1_800_000)
 *   exchange_rates    1 hour    (3_600_000)
 *   news              1 hour    (3_600_000)
 *   traffic           5 min     (300_000)
 *   events            1 day     (86_400_000)
 *   restaurants       7 days    (604_800_000)
 *   hotels            7 days    (604_800_000)
 *   businesses        7 days    (604_800_000)
 *   prices            1 day     (86_400_000)
 *   roads             30 days   (2_592_000_000)
 *   government_data   30 days   (2_592_000_000)
 *   laws              90 days   (7_776_000_000)
 *   education         30 days   (2_592_000_000)
 *   health            1 day     (86_400_000)
 *   maps              30 days   (2_592_000_000)
 *
 * Different metrics on the same node can have different TTLs (e.g., a
 * restaurant node might have hours=7d but menu=30d).
 * ============================================================================
 */

import "server-only";

// ── Freshness Manager ────────────────────────────────────────────────────

interface TTLRecord {
  /** Node id this TTL applies to. */
  nodeId: string;
  /** Metric (e.g., "weather", "restaurants", "exchange_rates"). */
  metric: string;
  /** TTL in milliseconds. */
  ttlMs: number;
  /** ISO timestamp when last refreshed. */
  lastRefreshedAt: string;
  /** ISO timestamp when this record expires. */
  expiresAt: string;
  /** Domain (for aggregate freshness scoring). */
  domain: string;
  /** Number of refreshes performed. */
  refreshCount: number;
}

// Default TTL table (milliseconds).
const DEFAULT_TTLS: Record<string, number> = {
  weather: 5 * 60 * 1000,
  flights: 30 * 60 * 1000,
  exchange_rates: 60 * 60 * 1000,
  currency: 60 * 60 * 1000,
  news: 60 * 60 * 1000,
  breaking_news: 15 * 60 * 1000,
  traffic: 5 * 60 * 1000,
  events: 24 * 60 * 60 * 1000,
  restaurants: 7 * 24 * 60 * 60 * 1000,
  hotels: 7 * 24 * 60 * 60 * 1000,
  businesses: 7 * 24 * 60 * 60 * 1000,
  business_openings: 24 * 60 * 60 * 1000,
  prices: 24 * 60 * 60 * 1000,
  fuel_prices: 24 * 60 * 60 * 1000,
  inflation: 24 * 60 * 60 * 1000,
  roads: 30 * 24 * 60 * 60 * 1000,
  road_closures: 60 * 60 * 1000,
  government_data: 30 * 24 * 60 * 60 * 1000,
  government_notices: 60 * 60 * 1000,
  emergency_alerts: 5 * 60 * 1000,
  laws: 90 * 24 * 60 * 60 * 1000,
  education: 30 * 24 * 60 * 60 * 1000,
  health: 24 * 60 * 60 * 1000,
  maps: 30 * 24 * 60 * 60 * 1000,
  airports: 24 * 60 * 60 * 1000,
  sports: 60 * 60 * 1000,
  tourism: 7 * 24 * 60 * 60 * 1000,
  public_holidays: 90 * 24 * 60 * 60 * 1000,
};

export class KnowledgeFreshnessManager {
  /** Primary TTL registry keyed by `${nodeId}|${metric}`. */
  private records = new Map<string, TTLRecord>();
  /** Per-domain index for fast aggregate scoring. */
  private domainIndex = new Map<string, Set<string>>();

  /**
   * Register (or update) a TTL for a node+metric pair. If ttlMs is omitted,
   * fall back to the default for the metric type, then to 24h.
   */
  registerTTL(nodeId: string, metric: string, ttlMs?: number, domain = "general"): TTLRecord {
    try {
      const key = `${nodeId}|${metric}`;
      const ttl = ttlMs ?? DEFAULT_TTLS[metric] ?? 24 * 60 * 60 * 1000;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl).toISOString();
      const existing = this.records.get(key);
      const record: TTLRecord = {
        nodeId,
        metric,
        ttlMs: ttl,
        lastRefreshedAt: existing?.lastRefreshedAt || now.toISOString(),
        expiresAt,
        domain,
        refreshCount: existing?.refreshCount || 0,
      };
      this.records.set(key, record);
      const set = this.domainIndex.get(domain) || new Set();
      set.add(key);
      this.domainIndex.set(domain, set);
      return record;
    } catch {
      const now = new Date().toISOString();
      return { nodeId, metric, ttlMs: ttlMs || 0, lastRefreshedAt: now, expiresAt: now, domain, refreshCount: 0 };
    }
  }

  /**
   * Scan all records and count expired ones. No side effects beyond the
   * count — refresh is performed by the worker pool via getStale().
   */
  checkExpiry(): number {
    try {
      const now = Date.now();
      let stale = 0;
      for (const r of this.records.values()) {
        if (new Date(r.expiresAt).getTime() <= now) stale++;
      }
      return stale;
    } catch {
      return 0;
    }
  }

  /**
   * Return the top-N stale records (most-overdue first) for refresh.
   * Overdue factor = (now - expiresAt) / ttlMs.
   */
  getStale(maxCount = 100): TTLRecord[] {
    try {
      const now = Date.now();
      const stale: Array<{ record: TTLRecord; overdue: number }> = [];
      for (const r of this.records.values()) {
        const exp = new Date(r.expiresAt).getTime();
        if (exp <= now) {
          const overdue = (now - exp) / Math.max(1, r.ttlMs);
          stale.push({ record: r, overdue });
        }
      }
      stale.sort((a, b) => b.overdue - a.overdue);
      return stale.slice(0, maxCount).map((s) => s.record);
    } catch {
      return [];
    }
  }

  /**
   * Mark a node+metric as refreshed. Slides the expiry window forward by
   * the TTL and bumps refreshCount. If metric is omitted, refreshes all
   * metrics for the node.
   */
  markRefreshed(nodeId: string, metric?: string): void {
    try {
      const now = new Date();
      if (metric) {
        const key = `${nodeId}|${metric}`;
        const r = this.records.get(key);
        if (r) {
          r.lastRefreshedAt = now.toISOString();
          r.expiresAt = new Date(now.getTime() + r.ttlMs).toISOString();
          r.refreshCount++;
          this.records.set(key, r);
        }
        return;
      }
      for (const [key, r] of this.records) {
        if (r.nodeId !== nodeId) continue;
        r.lastRefreshedAt = now.toISOString();
        r.expiresAt = new Date(now.getTime() + r.ttlMs).toISOString();
        r.refreshCount++;
        this.records.set(key, r);
      }
    } catch {}
  }

  /**
   * Compute a freshness score 0-1 for a domain.
   *   score = (fresh records) / (total records)
   *   A record is "fresh" if it has >50% of its TTL remaining.
   * Returns 1 if no records exist for the domain (no decay = unknown).
   */
  getFreshnessScore(domain: string): number {
    try {
      const set = this.domainIndex.get(domain);
      if (!set || set.size === 0) return 1;
      const now = Date.now();
      let fresh = 0;
      for (const key of set) {
        const r = this.records.get(key);
        if (!r) continue;
        const exp = new Date(r.expiresAt).getTime();
        const last = new Date(r.lastRefreshedAt).getTime();
        const remaining = exp - now;
        const total = exp - last;
        if (total <= 0) continue;
        if (remaining / total > 0.5) fresh++;
      }
      return fresh / set.size;
    } catch {
      return 0;
    }
  }

  /** Get all TTL records for a node. */
  getNodeTTLs(nodeId: string): TTLRecord[] {
    try {
      const out: TTLRecord[] = [];
      for (const r of this.records.values()) {
        if (r.nodeId === nodeId) out.push(r);
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Stats for diagnostics. */
  stats(): { total: number; stale: number; domains: number } {
    return {
      total: this.records.size,
      stale: this.checkExpiry(),
      domains: this.domainIndex.size,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalKnowledgeFreshnessManager = new KnowledgeFreshnessManager();
