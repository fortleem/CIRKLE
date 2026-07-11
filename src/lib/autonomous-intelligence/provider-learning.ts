// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Provider Learning Engine
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Continuously evaluates every AI provider (groq, openrouter, gemini,
 * openai, huggingface) on 9 dimensions:
 *
 *   - accuracy        (user feedback on response quality)
 *   - avgLatencyMs    (response time)
 *   - costPer1k       (token cost)
 *   - arabicQuality   (Arabic-language fidelity)
 *   - reasoningScore  (multi-step reasoning)
 *   - codeScore       (code generation)
 *   - visionScore     (vision / multimodal)
 *   - reliability     (uptime × success rate)
 *   - availability    (recent reachability)
 *
 * Every recorded call updates a rolling window of recent samples
 * (exponential moving average). The engine then maintains a per-task-type
 * ranking and recommends the best provider for each task type.
 *
 * Task types map directly to QueryCapability from brain-router.ts:
 *   text, reasoning, vision, code, arabic, cultural, sensitive.
 *
 * Auto-routing:
 *   The engine computes a recommended priority list per task type and
 *   exposes it via `getRecommendedPriority(taskType)`. The brain-router
 *   (Phase 2) is designed to consult this cache on every route — wrapping
 *   the existing static `routeQuery()` with a learned override when
 *   sufficient samples exist.
 *
 * Constitutional guarantee:
 *   - Never returns a provider with zero samples (falls back to static
 *     routeQuery ordering).
 *   - Never blocks the Brain — recordCall is async and runs detached.
 * ============================================================================
 */

import "server-only";

import type { AIProviderName, ProviderMetrics } from "./types";

// ── Brain-router capability mirror (avoid circular import) ───────────────

type QueryCapability =
  | "text" | "reasoning" | "vision" | "code"
  | "arabic" | "cultural" | "sensitive";

const ALL_PROVIDERS: AIProviderName[] = ["groq", "openrouter", "gemini", "openai", "huggingface"];

// ── Per-task-type weighting of the 9 metrics ─────────────────────────────

const TASK_WEIGHTS: Record<QueryCapability, Partial<Record<keyof ProviderMetrics, number>>> = {
  text:     { accuracy: 0.45, avgLatencyMs: 0.25, costPer1k: 0.15, reliability: 0.15 },
  reasoning:{ reasoningScore: 0.45, accuracy: 0.30, avgLatencyMs: 0.10, reliability: 0.15 },
  vision:   { visionScore: 0.55, accuracy: 0.25, reliability: 0.10, avgLatencyMs: 0.10 },
  code:     { codeScore: 0.45, accuracy: 0.30, avgLatencyMs: 0.10, reliability: 0.15 },
  arabic:   { arabicQuality: 0.55, accuracy: 0.25, reliability: 0.10, avgLatencyMs: 0.10 },
  cultural: { accuracy: 0.40, arabicQuality: 0.30, reliability: 0.15, avgLatencyMs: 0.15 },
  sensitive:{ reliability: 0.40, availability: 0.30, avgLatencyMs: 0.30 },
};

// ── Per-provider rolling sample window ───────────────────────────────────

interface Sample {
  accuracy: number;
  latencyMs: number;
  costPer1k: number;
  arabicQuality: number;
  reasoningScore: number;
  codeScore: number;
  visionScore: number;
  reliability: number;
  available: 0 | 1;
  timestamp: number;
}

const MAX_SAMPLES = 200;
const EMA_ALPHA = 0.3; // exponential moving average decay

// ── Provider Learning Engine ─────────────────────────────────────────────

export class ProviderLearningEngine {
  /** Per-provider rolling sample window (newest first). */
  private samples = new Map<AIProviderName, Sample[]>();
  /** Cached aggregated metrics per provider. */
  private metrics = new Map<AIProviderName, ProviderMetrics>();
  /** Cached recommended priority per task type (invalidated on recordCall). */
  private priorityCache = new Map<QueryCapability, AIProviderName[]>();
  /** Min samples before learned ranking kicks in. */
  private readonly minSamples = 1;

  constructor() {
    for (const p of ALL_PROVIDERS) {
      this.samples.set(p, []);
      this.metrics.set(p, this.emptyMetrics(p));
    }
  }

  /**
   * Record one observed provider call. Updates the rolling window + the
   * aggregated metrics + invalidates the priority cache. Async + non-blocking.
   */
  async recordCall(provider: AIProviderName, sample: Partial<Sample>): Promise<void> {
    try {
      if (!ALL_PROVIDERS.includes(provider)) return;
      const full: Sample = {
        accuracy: clamp01(sample.accuracy ?? 0.8),
        latencyMs: Math.max(0, sample.latencyMs ?? 1000),
        costPer1k: Math.max(0, sample.costPer1k ?? 0),
        arabicQuality: clamp01(sample.arabicQuality ?? 0.7),
        reasoningScore: clamp01(sample.reasoningScore ?? 0.7),
        codeScore: clamp01(sample.codeScore ?? 0.7),
        visionScore: clamp01(sample.visionScore ?? 0.5),
        reliability: clamp01(sample.reliability ?? 0.95),
        available: sample.available ?? 1,
        timestamp: Date.now(),
      };
      const list = this.samples.get(provider)!;
      list.unshift(full);
      if (list.length > MAX_SAMPLES) list.length = MAX_SAMPLES;
      this.recomputeMetrics(provider);
      this.priorityCache.clear();
    } catch {}
  }

  /** Get aggregated metrics for a provider (or null if unknown). */
  getMetrics(provider: AIProviderName): ProviderMetrics | null {
    try {
      return this.metrics.get(provider) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Return the single best provider for a task type, or null if no provider
   * has accumulated enough samples (caller should fall back to static
   * routeQuery ordering).
   */
  getBestProvider(taskType: QueryCapability): AIProviderName | null {
    try {
      const ranked = this.rankProviders(taskType);
      return ranked.length > 0 ? ranked[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Rank all providers for a task type, highest-score first. Providers with
   * fewer than minSamples are excluded. Returns [] if none qualify.
   */
  rankProviders(taskType: QueryCapability): AIProviderName[] {
    try {
      const cached = this.priorityCache.get(taskType);
      if (cached) return cached;
      const weights = TASK_WEIGHTS[taskType];
      const scored: Array<{ p: AIProviderName; s: number }> = [];
      for (const p of ALL_PROVIDERS) {
        const list = this.samples.get(p) ?? [];
        if (list.length < this.minSamples) continue;
        const m = this.metrics.get(p)!;
        const s = this.scoreForTask(m, weights);
        scored.push({ p, s });
      }
      scored.sort((a, b) => b.s - a.s);
      const result = scored.map((x) => x.p);
      this.priorityCache.set(taskType, result);
      return result;
    } catch {
      return [];
    }
  }

  /**
   * Side-by-side comparison of all providers across all 9 metrics.
   * Useful for diagnostics + the TGSE governance dashboard.
   */
  compareProviders(): Array<ProviderMetrics & { sampleCount: number }> {
    try {
      return ALL_PROVIDERS.map((p) => {
        const m = this.metrics.get(p)!;
        return { ...m, sampleCount: this.samples.get(p)?.length ?? 0 };
      });
    } catch {
      return [];
    }
  }

  /**
   * Recommended priority list for a task type. The brain-router is designed
   * to consult this on every route — if non-empty, it overrides the static
   * routeQuery ordering.
   */
  getRecommendedPriority(taskType: QueryCapability): AIProviderName[] {
    return this.rankProviders(taskType);
  }

  /** Stats for the learning orchestrator. */
  stats(): {
    providers: number;
    totalCalls: number;
    taskTypesWithRanking: number;
  } {
    try {
      let totalCalls = 0;
      for (const list of this.samples.values()) totalCalls += list.length;
      let ranked = 0;
      for (const t of Object.keys(TASK_WEIGHTS) as QueryCapability[]) {
        if (this.rankProviders(t).length > 0) ranked++;
      }
      return { providers: ALL_PROVIDERS.length, totalCalls, taskTypesWithRanking: ranked };
    } catch {
      return { providers: 0, totalCalls: 0, taskTypesWithRanking: 0 };
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  /** Recompute the EMA-aggregated metrics for a provider. */
  private recomputeMetrics(provider: AIProviderName): void {
    try {
      const list = this.samples.get(provider);
      if (!list || list.length === 0) return;
      // Use exponential moving average weighted by recency.
      const m: ProviderMetrics = this.emptyMetrics(provider);
      let accAccuracy = 0, accLatency = 0, accCost = 0, accArabic = 0;
      let accReason = 0, accCode = 0, accVision = 0, accReliability = 0, accAvail = 0;
      let wSum = 0;
      for (let i = 0; i < list.length; i++) {
        const w = Math.pow(1 - EMA_ALPHA, i); // newest first
        accAccuracy += list[i].accuracy * w;
        accLatency += list[i].latencyMs * w;
        accCost += list[i].costPer1k * w;
        accArabic += list[i].arabicQuality * w;
        accReason += list[i].reasoningScore * w;
        accCode += list[i].codeScore * w;
        accVision += list[i].visionScore * w;
        accReliability += list[i].reliability * w;
        accAvail += list[i].available * w;
        wSum += w;
      }
      m.accuracy = accAccuracy / wSum;
      m.avgLatencyMs = accLatency / wSum;
      m.costPer1k = accCost / wSum;
      m.arabicQuality = accArabic / wSum;
      m.reasoningScore = accReason / wSum;
      m.codeScore = accCode / wSum;
      m.visionScore = accVision / wSum;
      m.reliability = accReliability / wSum;
      m.availability = accAvail / wSum;
      m.totalCalls = list.length;
      m.updatedAt = new Date().toISOString();
      this.metrics.set(provider, m);
    } catch {}
  }

  /**
   * Score a provider for a task type by combining the metrics with the
   * task's weight vector. Latency and cost are inverted (lower = better).
   * Returns a score in [0, 1].
   */
  private scoreForTask(m: ProviderMetrics, weights: Partial<Record<keyof ProviderMetrics, number>>): number {
    try {
      let score = 0;
      let totalW = 0;
      const norm = (v: number, max: number) => Math.min(1, v / max);
      for (const [key, w] of Object.entries(weights) as Array<[keyof ProviderMetrics, number]>) {
        let contribution = 0;
        switch (key) {
          case "avgLatencyMs": contribution = 1 - norm(m.avgLatencyMs, 5000); break;
          case "costPer1k":    contribution = 1 - norm(m.costPer1k, 0.05); break;
          case "accuracy":     contribution = m.accuracy; break;
          case "arabicQuality":contribution = m.arabicQuality; break;
          case "reasoningScore": contribution = m.reasoningScore; break;
          case "codeScore":    contribution = m.codeScore; break;
          case "visionScore":  contribution = m.visionScore; break;
          case "reliability":  contribution = m.reliability; break;
          case "availability": contribution = m.availability; break;
        }
        score += contribution * w;
        totalW += w;
      }
      return totalW > 0 ? score / totalW : 0;
    } catch {
      return 0;
    }
  }

  private emptyMetrics(provider: AIProviderName): ProviderMetrics {
    return {
      provider,
      accuracy: 0, avgLatencyMs: 0, costPer1k: 0, arabicQuality: 0,
      reasoningScore: 0, codeScore: 0, visionScore: 0, reliability: 0,
      availability: 0, totalCalls: 0, updatedAt: new Date().toISOString(),
    };
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalProviderLearningEngine = new ProviderLearningEngine();
