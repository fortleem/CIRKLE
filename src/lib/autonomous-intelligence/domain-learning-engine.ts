// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Domain Learning Engine
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Coordinates all 15 domain trainers:
 *
 *   travel, payments, messaging, feed, maps, shopping, government, health,
 *   jobs, creator, circle, mail, identity, education, media
 *
 * Each trainer is implemented in its own file under trainers/ and registered
 * here at startup. This engine is the COORDINATOR — it does NOT contain
 * domain logic itself. It:
 *   - Maintains the registry of trainers.
 *   - Routes events to the appropriate trainer(s) by category.
 *   - Triggers trainAll() / trainDomain() as part of the nightly pipeline.
 *   - Caches each domain's DomainKnowledge snapshot.
 *   - Allows the orchestrator to update a trainer's recommendation or
 *     prediction model directly.
 *
 * Constitutional role:
 *   - NEVER bypasses a registered trainer's train/predict/recommend methods.
 *   - If a domain has no trainer registered, calls fall back to a safe
 *     FallbackTrainer that returns empty results and zero-confidence
 *     knowledge — never throws.
 *   - Training is async + idempotent — retraining with the same events is
 *     safe (trainers dedupe internally).
 * ============================================================================
 */

import "server-only";

import type {
  DomainTrainerType,
  DomainKnowledge,
  DomainModel,
  PlatformEvent,
  Prediction,
} from "./types";

// ── DomainTrainer interface (implemented by trainers/*.ts) ───────────────

export interface DomainTrainer {
  /** Domain this trainer handles. */
  domain: DomainTrainerType;
  /** Train on a batch of events. Idempotent. */
  train(events: PlatformEvent[]): Promise<void>;
  /** Get the trainer's current knowledge snapshot. */
  getKnowledge(): Promise<DomainKnowledge>;
  /** Generate predictions for an input. */
  predict(input: unknown): Promise<Prediction[]>;
  /** Recommend items for an input. */
  recommend(input: unknown): Promise<unknown[]>;
}

// ── Default fallback trainer (used when no real trainer is registered) ───

class FallbackTrainer implements DomainTrainer {
  constructor(public readonly domain: DomainTrainerType) {}

  async train(_events: PlatformEvent[]): Promise<void> {
    // No-op: fallback trainer cannot learn.
  }

  async getKnowledge(): Promise<DomainKnowledge> {
    const now = new Date().toISOString();
    return {
      domain: this.domain,
      facts: [],
      patterns: [],
      recommendationModel: { type: "weighted_features", weights: {}, features: [], updatedAt: now },
      predictionModel: { type: "weighted_features", weights: {}, features: [], updatedAt: now },
      ranking: { factors: {}, diversityPenalty: 0, freshnessBoost: 0, personalizationWeight: 0 },
      confidence: 0,
      lastTrainedAt: now,
      freshness: 0,
    };
  }

  async predict(_input: unknown): Promise<Prediction[]> {
    return [];
  }

  async recommend(_input: unknown): Promise<unknown[]> {
    return [];
  }
}

// ── Domain Learning Engine ───────────────────────────────────────────────

export class DomainLearningEngine {
  /** Registered trainers keyed by domain. */
  private trainers = new Map<DomainTrainerType, DomainTrainer>();
  /** Cached DomainKnowledge per domain (refreshed on train). */
  private knowledgeCache = new Map<DomainTrainerType, DomainKnowledge>();
  /** Events queued per domain for the next training run (retry buffer). */
  private pendingEvents = new Map<DomainTrainerType, PlatformEvent[]>();
  /** Per-domain stats. Named `trainStats` to avoid colliding with the public `stats()` method. */
  private trainStats = new Map<DomainTrainerType, { trainRuns: number; lastTrainAt?: string; lastError?: string }>();

  /** All 15 supported domains. */
  static readonly SUPPORTED_DOMAINS: DomainTrainerType[] = [
    "travel", "payments", "messaging", "feed", "maps", "shopping",
    "government", "health", "jobs", "creator", "circle", "mail",
    "identity", "education", "media",
  ];

  /**
   * Register a trainer for a domain. If a trainer is already registered,
   * it is replaced (used for hot-swapping during development).
   */
  registerTrainer(domain: DomainTrainerType, trainer: DomainTrainer): void {
    try {
      this.trainers.set(domain, trainer);
      if (!this.trainStats.has(domain)) this.trainStats.set(domain, { trainRuns: 0 });
      // Invalidate cache so the next getDomainKnowledge fetches fresh.
      this.knowledgeCache.delete(domain);
    } catch {
      // best-effort
    }
  }

  /** Get the trainer for a domain. Returns a FallbackTrainer if none. */
  getTrainer(domain: DomainTrainerType): DomainTrainer {
    return this.trainers.get(domain) || new FallbackTrainer(domain);
  }

  /** Train ALL registered domains with their pending events. */
  async trainAll(): Promise<Array<{ domain: DomainTrainerType; trained: boolean; events: number; error?: string }>> {
    const results: Array<{ domain: DomainTrainerType; trained: boolean; events: number; error?: string }> = [];
    for (const domain of DomainLearningEngine.SUPPORTED_DOMAINS) {
      const events = this.pendingEvents.get(domain) || [];
      if (events.length === 0) {
        results.push({ domain, trained: false, events: 0 });
        continue;
      }
      try {
        await this.trainDomain(domain, events);
        // Clear pending after a successful train.
        this.pendingEvents.set(domain, []);
        results.push({ domain, trained: true, events: events.length });
      } catch (err) {
        results.push({ domain, trained: false, events: events.length, error: (err as Error).message });
      }
    }
    return results;
  }

  /**
   * Train a single domain. If `events` is omitted, trains on the domain's
   * pending events. On failure, events are queued for retry on the next
   * trainAll() call.
   */
  async trainDomain(domain: DomainTrainerType, events?: PlatformEvent[]): Promise<void> {
    try {
      const evs = events ?? (this.pendingEvents.get(domain) || []);
      if (evs.length === 0) return;
      const trainer = this.getTrainer(domain);
      await trainer.train(evs);
      const knowledge = await trainer.getKnowledge();
      this.knowledgeCache.set(domain, knowledge);
      const stats = this.trainStats.get(domain) || { trainRuns: 0 };
      stats.trainRuns += 1;
      stats.lastTrainAt = new Date().toISOString();
      stats.lastError = undefined;
      this.trainStats.set(domain, stats);
      // If we trained on pending events (no explicit events arg), clear them.
      if (!events) this.pendingEvents.set(domain, []);
    } catch (err) {
      const stats = this.trainStats.get(domain) || { trainRuns: 0 };
      stats.lastError = (err as Error).message;
      this.trainStats.set(domain, stats);
      // Queue for retry.
      this.queueEvents(domain, events || []);
    }
  }

  /** Queue events for a domain's next training run. Bounded to 10000. */
  queueEvents(domain: DomainTrainerType, events: PlatformEvent[]): void {
    try {
      const list = this.pendingEvents.get(domain) || [];
      for (const e of events) list.push(e);
      if (list.length > 10000) list.splice(0, list.length - 10000);
      this.pendingEvents.set(domain, list);
    } catch {
      // best-effort
    }
  }

  /** Get the cached DomainKnowledge for a domain (fetches if cache miss). */
  async getDomainKnowledge(domain: DomainTrainerType): Promise<DomainKnowledge | null> {
    try {
      const cached = this.knowledgeCache.get(domain);
      if (cached) return cached;
      const trainer = this.getTrainer(domain);
      const knowledge = await trainer.getKnowledge();
      this.knowledgeCache.set(domain, knowledge);
      return knowledge;
    } catch {
      return null;
    }
  }

  /** Update a trainer's recommendation OR prediction model directly. */
  async updateDomainModel(
    domain: DomainTrainerType,
    model: DomainModel,
    which: "recommendation" | "prediction" = "recommendation"
  ): Promise<boolean> {
    try {
      const knowledge = await this.getDomainKnowledge(domain);
      if (!knowledge) return false;
      if (which === "recommendation") {
        knowledge.recommendationModel = model;
      } else {
        knowledge.predictionModel = model;
      }
      this.knowledgeCache.set(domain, knowledge);
      return true;
    } catch {
      return false;
    }
  }

  /** Delegate prediction to a domain's trainer. */
  async predict(domain: DomainTrainerType, input: unknown): Promise<Prediction[]> {
    try {
      return await this.getTrainer(domain).predict(input);
    } catch {
      return [];
    }
  }

  /** Delegate recommendation to a domain's trainer. */
  async recommend(domain: DomainTrainerType, input: unknown): Promise<unknown[]> {
    try {
      return await this.getTrainer(domain).recommend(input);
    } catch {
      return [];
    }
  }

  /** Stats for monitoring. */
  stats(): Record<string, unknown> {
    const perDomain: Record<string, unknown> = {};
    for (const [domain, s] of this.trainStats) {
      perDomain[domain] = s;
    }
    const pending: Record<string, number> = {};
    for (const [domain, evs] of this.pendingEvents) {
      pending[domain] = evs.length;
    }
    return {
      registeredDomains: Array.from(this.trainers.keys()),
      cachedDomains: Array.from(this.knowledgeCache.keys()),
      pendingEvents: pending,
      perDomain,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalDomainLearningEngine = new DomainLearningEngine();
