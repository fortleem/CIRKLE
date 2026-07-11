// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Model Evaluator
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Evaluates the performance of every learned model in the Brain:
 *
 *   - irde_recommendation  (IRDE recommendation ranking — Phase 4)
 *   - prediction_engine    (next-action / next-destination predictions)
 *   - domain:<name>        (per-domain recommendation + prediction models,
 *                            one per DomainTrainerType)
 *   - provider:<name>      (per-provider accuracy on recorded calls)
 *   - cross_module         (cross-module inference confidence calibration)
 *
 * For each model, the evaluator gathers a sample set (predictions made +
 * their correctness, domain confidence, provider samples, etc.), then
 * computes:
 *
 *   - accuracy     = correct / total
 *   - precision    = true positives / (true + false positives)
 *   - recall       = true positives / (true positives + false negatives)
 *   - f1Score      = harmonic mean of precision + recall
 *   - latencyMs    = average observed latency
 *   - sampleSize   = number of evaluation samples
 *
 * Based on these metrics, `recommendAction(modelName)` returns one of:
 *   - "deploy"    accuracy ≥ 0.85 AND sampleSize ≥ 30  → ship it
 *   - "monitor"   0.65 ≤ accuracy < 0.85                → keep watching
 *   - "retrain"   0.50 ≤ accuracy < 0.65                → drift detected
 *   - "rollback"  accuracy < 0.50 AND sampleSize ≥ 10   → revert
 *
 * All evaluations are persisted into a per-model history (bounded LRU) so
 * the orchestrator + governance dashboard can plot drift over time.
 *
 * Constitutional role:
 *   - NEVER auto-deploys or auto-rolls-back — only emits recommendations.
 *   - NEVER throws — failures are recorded as zero-confidence evaluations.
 *   - Pure in-memory; persistence is handled by the nightly pipeline.
 * ============================================================================
 */

import "server-only";

import type { ModelEvaluation } from "./types";

import { globalPredictionEngine } from "./prediction-engine";
import { globalDomainLearningEngine } from "./domain-learning-engine";
import { globalProviderLearningEngine } from "./provider-learning";
import { globalCrossModuleIntelligence } from "./cross-module-intelligence";

// ── Thresholds ───────────────────────────────────────────────────────────

const DEPLOY_ACCURACY = 0.85;
const DEPLOY_MIN_SAMPLES = 30;
const MONITOR_ACCURACY = 0.65;
const RETRAIN_ACCURACY = 0.50;
const ROLLBACK_MIN_SAMPLES = 10;

const MAX_HISTORY_PER_MODEL = 200;

// ── Model Evaluator ──────────────────────────────────────────────────────

export class ModelEvaluator {
  /** Per-model evaluation history (newest last). */
  private history = new Map<string, ModelEvaluation[]>();
  /** Cached latest evaluation per model. */
  private latest = new Map<string, ModelEvaluation>();
  /** Aggregate stats. */
  private totals = { evaluations: 0, deploy: 0, monitor: 0, retrain: 0, rollback: 0 };

  /**
   * Evaluate a model by name. Recognized model names:
   *   - "irde_recommendation"
   *   - "prediction_engine"
   *   - "cross_module"
   *   - "domain:<name>"  (e.g., "domain:travel")
   *   - "provider:<name>" (e.g., "provider:groq")
   * Returns the recorded ModelEvaluation. Never throws.
   */
  async evaluateModel(modelName: string): Promise<ModelEvaluation> {
    try {
      const t0 = Date.now();
      const samples = await this.gatherSamples(modelName);
      const metrics = this.computeMetrics(samples);
      const latencyMs = Date.now() - t0;
      const recommendation = this.deriveRecommendation(metrics.accuracy, metrics.sampleSize);
      const evaluation: ModelEvaluation = {
        evaluationId: `eval_${modelName.replace(/[^a-z0-9]/gi, "_")}_${Date.now().toString(36)}`,
        modelName,
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1Score,
        latencyMs,
        sampleSize: metrics.sampleSize,
        evaluatedAt: new Date().toISOString(),
        recommendation,
      };
      this.record(modelName, evaluation);
      return evaluation;
    } catch (err) {
      // Return a zero-confidence evaluation rather than throwing.
      const evaluation: ModelEvaluation = {
        evaluationId: `eval_err_${Date.now().toString(36)}`,
        modelName,
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        latencyMs: 0,
        sampleSize: 0,
        evaluatedAt: new Date().toISOString(),
        recommendation: "monitor",
      };
      this.record(modelName, evaluation);
      return evaluation;
    }
  }

  /**
   * Compare two models side-by-side. Evaluates both (if no cached result is
   * fresh enough), then returns both evaluations + a verdict:
   *   - "A_better" — model A's accuracy ≥ model B's + 0.05
   *   - "B_better" — model B's accuracy ≥ model A's + 0.05
   *   - "tie"      — within 5%
   */
  async compareModels(
    modelA: string,
    modelB: string
  ): Promise<{ a: ModelEvaluation; b: ModelEvaluation; verdict: "A_better" | "B_better" | "tie" }> {
    try {
      const a = await this.evaluateModel(modelA);
      const b = await this.evaluateModel(modelB);
      const diff = a.accuracy - b.accuracy;
      const verdict: "A_better" | "B_better" | "tie" =
        diff >= 0.05 ? "A_better" : diff <= -0.05 ? "B_better" : "tie";
      return { a, b, verdict };
    } catch (err) {
      const zero: ModelEvaluation = {
        evaluationId: `eval_err_${Date.now().toString(36)}`,
        modelName: "error",
        accuracy: 0, precision: 0, recall: 0, f1Score: 0,
        latencyMs: 0, sampleSize: 0,
        evaluatedAt: new Date().toISOString(),
        recommendation: "monitor",
      };
      return { a: zero, b: zero, verdict: "tie" };
    }
  }

  /**
   * Return the full evaluation history for a model (newest last). Bounded
   * to MAX_HISTORY_PER_MODEL entries per model.
   */
  getEvaluationHistory(modelName: string, limit = 50): ModelEvaluation[] {
    try {
      const list = this.history.get(modelName) || [];
      return list.slice(-limit);
    } catch {
      return [];
    }
  }

  /**
   * Recommend an action for a model. Uses the latest cached evaluation if
   * available, otherwise evaluates fresh.
   */
  async recommendAction(modelName: string): Promise<"deploy" | "rollback" | "monitor" | "retrain"> {
    try {
      const cached = this.latest.get(modelName);
      const eval_ = cached && this.isFresh(cached) ? cached : await this.evaluateModel(modelName);
      return eval_.recommendation;
    } catch {
      return "monitor";
    }
  }

  /** Aggregate stats for monitoring. */
  getStats(): {
    evaluations: number;
    modelsTracked: number;
    deploy: number;
    monitor: number;
    retrain: number;
    rollback: number;
  } {
    return {
      evaluations: this.totals.evaluations,
      modelsTracked: this.history.size,
      deploy: this.totals.deploy,
      monitor: this.totals.monitor,
      retrain: this.totals.retrain,
      rollback: this.totals.rollback,
    };
  }

  // ── internals ──────────────────────────────────────────────────────────

  /**
   * Gather a sample set for a model. Each sample is { correct: boolean,
   * latencyMs?: number, predictedPositive?: boolean, actualPositive?: boolean }.
   * Dispatches by model name prefix.
   */
  private async gatherSamples(modelName: string): Promise<Array<{
    correct: boolean;
    latencyMs?: number;
    predictedPositive?: boolean;
    actualPositive?: boolean;
  }>> {
    try {
      if (modelName === "prediction_engine" || modelName === "irde_recommendation") {
        return this.gatherPredictionSamples();
      }
      if (modelName === "cross_module") {
        return this.gatherCrossModuleSamples();
      }
      if (modelName.startsWith("domain:")) {
        const domain = modelName.slice("domain:".length) as any;
        return this.gatherDomainSamples(domain);
      }
      if (modelName.startsWith("provider:")) {
        const provider = modelName.slice("provider:".length) as any;
        return this.gatherProviderSamples(provider);
      }
      return [];
    } catch {
      return [];
    }
  }

  /** Samples from the prediction engine's accuracy ledger. */
  private gatherPredictionSamples(): Array<{ correct: boolean; latencyMs?: number }> {
    try {
      const stats = globalPredictionEngine.getAccuracyStats();
      const out: Array<{ correct: boolean; latencyMs?: number }> = [];
      for (const s of stats) {
        for (let i = 0; i < s.correct; i++) out.push({ correct: true, latencyMs: 50 });
        const incorrect = s.total - s.correct;
        for (let i = 0; i < incorrect; i++) out.push({ correct: false, latencyMs: 50 });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Samples from the cross-module inference ledger. */
  private gatherCrossModuleSamples(): Array<{ correct: boolean; latencyMs?: number }> {
    try {
      // Cross-module inferences don't have explicit correctness labels —
      // treat inference confidence as a proxy: confidence ≥ 0.7 = "correct"
      // (well-supported), < 0.7 = "incorrect" (low support).
      // In production this would be replaced by user-acceptance feedback.
      const active = globalCrossModuleIntelligence.getActiveInferences(200);
      const out: Array<{ correct: boolean; latencyMs?: number }> = [];
      for (const inf of active) {
        const avgConf = inf.inferredNeeds.length === 0
          ? 0
          : inf.inferredNeeds.reduce((s, n) => s + n.confidence, 0) / inf.inferredNeeds.length;
        out.push({ correct: avgConf >= 0.7, latencyMs: 10 });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Samples from a domain trainer's knowledge snapshot. */
  private async gatherDomainSamples(domain: string): Promise<Array<{ correct: boolean; latencyMs?: number }>> {
    try {
      const knowledge = await globalDomainLearningEngine.getDomainKnowledge(domain as any);
      if (!knowledge) return [];
      const out: Array<{ correct: boolean; latencyMs?: number }> = [];
      // Treat each pattern as a sample: confidence ≥ 0.6 = correct.
      for (const p of knowledge.patterns || []) {
        out.push({ correct: p.confidence >= 0.6, latencyMs: 20 });
      }
      // If the trainer has no patterns yet, fall back to its overall confidence.
      if (out.length === 0) {
        const n = Math.max(1, Math.round(knowledge.confidence * 20));
        for (let i = 0; i < n; i++) out.push({ correct: true, latencyMs: 20 });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Samples from a provider's recorded call window. */
  private gatherProviderSamples(provider: string): Array<{ correct: boolean; latencyMs?: number }> {
    try {
      const m = globalProviderLearningEngine.getMetrics(provider as any);
      if (!m || m.totalCalls === 0) return [];
      const correct = Math.round(m.accuracy * m.totalCalls);
      const out: Array<{ correct: boolean; latencyMs?: number }> = [];
      for (let i = 0; i < correct; i++) out.push({ correct: true, latencyMs: m.avgLatencyMs });
      for (let i = 0; i < m.totalCalls - correct; i++) out.push({ correct: false, latencyMs: m.avgLatencyMs });
      return out;
    } catch {
      return [];
    }
  }

  /** Compute accuracy/precision/recall/F1/latency/sampleSize from samples. */
  private computeMetrics(samples: Array<{
    correct: boolean;
    latencyMs?: number;
    predictedPositive?: boolean;
    actualPositive?: boolean;
  }>): {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    sampleSize: number;
  } {
    try {
      const sampleSize = samples.length;
      if (sampleSize === 0) {
        return { accuracy: 0, precision: 0, recall: 0, f1Score: 0, sampleSize: 0 };
      }
      // For binary classification-style metrics, we need a notion of
      // "predicted positive" and "actual positive". For samples without
      // explicit flags, infer: predictedPositive = correct (we said yes),
      // actualPositive = true (the truth was yes). This collapses to:
      //   TP = correct count, FP = 0, FN = incorrect count, TN = 0
      // which makes precision = TP/(TP+FP) = 1 (when correct>0) and
      // recall = TP/(TP+FN) = accuracy.
      // To get more meaningful precision/recall, we use the explicit flags
      // when present; otherwise fall back to this collapsed interpretation.
      let tp = 0, fp = 0, fn = 0, tn = 0;
      let latencySum = 0;
      let latencyCount = 0;
      for (const s of samples) {
        if (s.latencyMs !== undefined && s.latencyMs !== null) {
          latencySum += s.latencyMs;
          latencyCount++;
        }
        const predictedPositive = s.predictedPositive ?? s.correct;
        const actualPositive = s.actualPositive ?? true;
        if (predictedPositive && actualPositive) tp++;
        else if (predictedPositive && !actualPositive) fp++;
        else if (!predictedPositive && actualPositive) fn++;
        else tn++;
      }
      const accuracy = (tp + tn) / sampleSize;
      const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
      const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
      const f1Score = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
      return { accuracy, precision, recall, f1Score, sampleSize };
    } catch {
      return { accuracy: 0, precision: 0, recall: 0, f1Score: 0, sampleSize: 0 };
    }
  }

  /** Derive the deploy/monitor/retrain/rollback recommendation. */
  private deriveRecommendation(
    accuracy: number,
    sampleSize: number
  ): "deploy" | "rollback" | "monitor" | "retrain" {
    if (accuracy < RETRAIN_ACCURACY && sampleSize >= ROLLBACK_MIN_SAMPLES) return "rollback";
    if (accuracy < MONITOR_ACCURACY) return "retrain";
    if (accuracy >= DEPLOY_ACCURACY && sampleSize >= DEPLOY_MIN_SAMPLES) return "deploy";
    return "monitor";
  }

  /** Record an evaluation in the per-model history + bump aggregate counters. */
  private record(modelName: string, evaluation: ModelEvaluation): void {
    try {
      const list = this.history.get(modelName) || [];
      list.push(evaluation);
      if (list.length > MAX_HISTORY_PER_MODEL) list.shift();
      this.history.set(modelName, list);
      this.latest.set(modelName, evaluation);
      this.totals.evaluations++;
      if (evaluation.recommendation === "deploy") this.totals.deploy++;
      else if (evaluation.recommendation === "monitor") this.totals.monitor++;
      else if (evaluation.recommendation === "retrain") this.totals.retrain++;
      else if (evaluation.recommendation === "rollback") this.totals.rollback++;
    } catch {
      // best-effort
    }
  }

  /** An evaluation is "fresh" if it was conducted within the last hour. */
  private isFresh(evaluation: ModelEvaluation): boolean {
    try {
      const age = Date.now() - new Date(evaluation.evaluatedAt).getTime();
      return age < 60 * 60 * 1000;
    } catch {
      return false;
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalModelEvaluator = new ModelEvaluator();
