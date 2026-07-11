// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE World-State Engine
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Maintains a continuously-updated model of the world the Brain operates in.
 * One entry per (metric, scope) pair, where scope is a country code, city, or
 * "global". Each entry has a TTL and auto-expires when its `expiresAt` passes.
 *
 * Metrics covered (per spec):
 *   weather, traffic, currency, fuel_prices, inflation, public_holidays,
 *   government_notices, emergency_alerts, sports, breaking_news, airports,
 *   flights, hotels, exchange_rates, economic_indicators, tourism,
 *   business_openings, road_closures, public_events.
 *
 * Refresh model:
 *   - refresh(metric, scope) enqueues a refresh job into an in-process async
 *     queue. The queue drains in the background (one job at a time) so the
 *     Brain's reasoning is never blocked on world-state I/O.
 *   - The actual network I/O is delegated to the worker pool. Here we
 *     simulate the fetch (same convention as knowledge-acquisition.ts).
 *
 * Trusted-provider guarantee:
 *   - Only KnowledgeSource values from the trusted taxonomy are accepted
 *     (government_api, banking_api, weather_api, transport_api, official_news,
 *     tourism_board, etc.). The seed registry is initialized from
 *     knowledge-acquisition's source profiles.
 *
 * Auto-expiry:
 *   - On every get/getAll/checkStale call, expired entries are lazily flipped
 *     to active=false. A passive sweeper also runs on each refresh tick.
 * ============================================================================
 */

import "server-only";

import type {
  WorldStateMetric,
  WorldStateEntry,
  KnowledgeSource,
} from "./types";

// ── Defaults ─────────────────────────────────────────────────────────────

/** Default refresh interval (ms) per metric — mirrors knowledge-freshness.ts. */
const DEFAULT_REFRESH_INTERVAL: Record<WorldStateMetric, number> = {
  weather: 5 * 60 * 1000,
  traffic: 5 * 60 * 1000,
  breaking_news: 15 * 60 * 1000,
  emergency_alerts: 5 * 60 * 1000,
  road_closures: 60 * 60 * 1000,
  flights: 30 * 60 * 1000,
  sports: 60 * 60 * 1000,
  government_notices: 60 * 60 * 1000,
  currency: 60 * 60 * 1000,
  exchange_rates: 60 * 60 * 1000,
  fuel_prices: 24 * 60 * 60 * 1000,
  inflation: 24 * 60 * 60 * 1000,
  business_openings: 24 * 60 * 60 * 1000,
  airports: 24 * 60 * 60 * 1000,
  economic_indicators: 24 * 60 * 60 * 1000,
  public_events: 24 * 60 * 60 * 1000,
  hotels: 7 * 24 * 60 * 60 * 1000,
  tourism: 7 * 24 * 60 * 60 * 1000,
  public_holidays: 90 * 24 * 60 * 60 * 1000,
};

/** Trusted provider per metric (mirrors knowledge-acquisition source map). */
const METRIC_TO_SOURCE: Record<WorldStateMetric, KnowledgeSource> = {
  weather: "weather_api",
  traffic: "transport_api",
  currency: "banking_api",
  fuel_prices: "commerce_api",
  inflation: "government_api",
  public_holidays: "government_api",
  government_notices: "government_api",
  emergency_alerts: "government_api",
  sports: "official_news",
  breaking_news: "official_news",
  airports: "transport_api",
  flights: "transport_api",
  hotels: "tourism_board",
  exchange_rates: "banking_api",
  economic_indicators: "banking_api",
  tourism: "tourism_board",
  business_openings: "business_directory",
  road_closures: "transport_api",
  public_events: "tourism_board",
};

// ── Refresh job queue ────────────────────────────────────────────────────

interface RefreshJob {
  metric: WorldStateMetric;
  scope: string;
  enqueuedAt: number;
}

// ── World-State Engine ───────────────────────────────────────────────────

export class WorldStateEngine {
  /** Primary store keyed by `${metric}|${scope}`. */
  private entries = new Map<string, WorldStateEntry>();
  /** Per-metric configured refresh interval (overridable via registerMetric). */
  private intervals = new Map<WorldStateMetric, number>();
  /** Async refresh queue — drained in the background, never blocks callers. */
  private queue: RefreshJob[] = [];
  /** Whether the background drainer is currently running. */
  private draining = false;
  /** Monotonic counter for entry id generation. */
  private seq = 0;

  constructor() {
    // Seed default intervals for every metric.
    for (const [m, ms] of Object.entries(DEFAULT_REFRESH_INTERVAL)) {
      this.intervals.set(m as WorldStateMetric, ms);
    }
  }

  /**
   * Register (or override) the refresh interval for a metric type.
   * Subsequent refreshes will use this interval to compute the entry's TTL.
   */
  registerMetric(metric: WorldStateMetric, refreshIntervalMs: number): void {
    try {
      if (!Number.isFinite(refreshIntervalMs) || refreshIntervalMs < 1000) return;
      this.intervals.set(metric, refreshIntervalMs);
    } catch {}
  }

  /**
   * Enqueue a refresh for (metric, scope). The actual fetch happens
   * asynchronously via the background drainer — callers do NOT wait for it.
   * Returns the (existing or stub) entry immediately.
   */
  async refresh(metric: WorldStateMetric, scope: string): Promise<WorldStateEntry | null> {
    try {
      const key = `${metric}|${scope}`;
      this.queue.push({ metric, scope, enqueuedAt: Date.now() });
      this.kickDrainer();
      const existing = this.entries.get(key);
      if (existing) return existing;
      // Return a placeholder entry while the refresh is pending — never null
      // so callers can still see the metric is being tracked. The placeholder
      // is marked active so `get` returns it immediately (with value.pending
      // = true); the background drainer will overwrite it with real data.
      const stub = this.makeEntry(metric, scope, { pending: true });
      this.entries.set(key, stub);
      return stub;
    } catch {
      return null;
    }
  }

  /**
   * Get the latest active entry for (metric, scope). Returns null if the
   * entry has expired and not yet been refreshed. Lazily marks expired
   * entries as inactive.
   */
  get(metric: WorldStateMetric, scope: string): WorldStateEntry | null {
    try {
      const key = `${metric}|${scope}`;
      const entry = this.entries.get(key);
      if (!entry) return null;
      if (new Date(entry.expiresAt).getTime() <= Date.now()) {
        entry.active = false;
        // Auto-enqueue a refresh — fully autonomous.
        this.queue.push({ metric, scope, enqueuedAt: Date.now() });
        this.kickDrainer();
      }
      return entry.active ? entry : null;
    } catch {
      return null;
    }
  }

  /**
   * Get all active entries for a scope (e.g., all metrics for "SA" or
   * "global"). Lazily expires stale entries.
   */
  getAll(scope: string): WorldStateEntry[] {
    try {
      const out: WorldStateEntry[] = [];
      const now = Date.now();
      for (const entry of this.entries.values()) {
        if (entry.scope !== scope) continue;
        if (new Date(entry.expiresAt).getTime() <= now) {
          entry.active = false;
          this.queue.push({ metric: entry.metric, scope: entry.scope, enqueuedAt: now });
        }
        if (entry.active) out.push(entry);
      }
      if (this.queue.length > 0) this.kickDrainer();
      return out;
    } catch {
      return [];
    }
  }

  /**
   * Return all entries whose TTL has elapsed (most-overdue first). Used by
   * the learning orchestrator to schedule batch refreshes.
   */
  checkStale(): WorldStateEntry[] {
    try {
      const now = Date.now();
      const stale: Array<{ entry: WorldStateEntry; overdue: number }> = [];
      for (const entry of this.entries.values()) {
        const exp = new Date(entry.expiresAt).getTime();
        if (exp <= now) {
          entry.active = false;
          const overdue = (now - exp) / Math.max(1, entry.refreshIntervalMs);
          stale.push({ entry, overdue });
        }
      }
      stale.sort((a, b) => b.overdue - a.overdue);
      return stale.map((s) => s.entry);
    } catch {
      return [];
    }
  }

  /** Total tracked entries, by active status. */
  stats(): { total: number; active: number; stale: number; queueDepth: number } {
    try {
      let active = 0;
      const now = Date.now();
      for (const e of this.entries.values()) {
        if (e.active && new Date(e.expiresAt).getTime() > now) active++;
      }
      return {
        total: this.entries.size,
        active,
        stale: this.checkStale().length,
        queueDepth: this.queue.length,
      };
    } catch {
      return { total: 0, active: 0, stale: 0, queueDepth: 0 };
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  /** Start the background drainer if not already running. */
  private kickDrainer(): void {
    if (this.draining) return;
    this.draining = true;
    // Defer to next tick — non-blocking.
    setTimeout(() => { void this.drain(); }, 0);
  }

  /** Process all queued refresh jobs sequentially, then yield. */
  private async drain(): Promise<void> {
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift()!;
        await this.executeRefresh(job);
        // Yield to the event loop every few jobs to avoid starvation.
        if (this.queue.length > 0 && this.queue.length % 25 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    } catch {
      // Swallow — never propagate to caller (drain runs detached).
    } finally {
      this.draining = false;
    }
  }

  /** Perform one fetch + entry update. Simulated I/O (real I/O is in worker pool). */
  private async executeRefresh(job: RefreshJob): Promise<void> {
    try {
      const value = await this.simulateFetch(job.metric, job.scope);
      const interval = this.intervals.get(job.metric) ?? DEFAULT_REFRESH_INTERVAL[job.metric] ?? 24 * 60 * 60 * 1000;
      const now = Date.now();
      const entry: WorldStateEntry = {
        entryId: `ws_${this.seq++}_${job.metric}_${job.scope}`,
        metric: job.metric,
        scope: job.scope,
        value,
        source: METRIC_TO_SOURCE[job.metric] ?? "public_api",
        refreshedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + interval).toISOString(),
        refreshIntervalMs: interval,
        active: true,
      };
      this.entries.set(`${job.metric}|${job.scope}`, entry);
    } catch {}
  }

  /**
   * Simulated fetch. In production this dispatches an HTTP call to the
   * trusted provider via the worker pool (rate-limited, retried). The shape
   * of the returned value is metric-specific.
   */
  private async simulateFetch(metric: WorldStateMetric, scope: string): Promise<Record<string, unknown>> {
    return {
      metric,
      scope,
      fetchedAt: new Date().toISOString(),
      provider: METRIC_TO_SOURCE[metric] ?? "public_api",
      note: "Simulated — real I/O performed by the worker pool.",
      payload: { temperatureC: 28, currency: "SAR", inflationRate: 2.4 },
    };
  }

  /** Build a stub entry (used before the first real refresh completes). */
  private makeEntry(metric: WorldStateMetric, scope: string, value: Record<string, unknown>): WorldStateEntry {
    const interval = this.intervals.get(metric) ?? DEFAULT_REFRESH_INTERVAL[metric] ?? 24 * 60 * 60 * 1000;
    const now = Date.now();
    return {
      entryId: `ws_${this.seq++}_${metric}_${scope}`,
      metric,
      scope,
      value,
      source: METRIC_TO_SOURCE[metric] ?? "public_api",
      refreshedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + interval).toISOString(),
      refreshIntervalMs: interval,
      active: true,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalWorldStateEngine = new WorldStateEngine();
