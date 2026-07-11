// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Prediction Engine
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * The Prediction Engine forecasts what the user will need next, across
 * multiple horizons:
 *
 *   - next_destination (where they will travel next)
 *   - next_restaurant (where they will eat)
 *   - next_payment (what they will pay for)
 *   - next_contact (who they will message)
 *   - next_search (what they will search)
 *   - next_event (what event they will join)
 *   - next_transport (how they will move)
 *   - next_reminder (what they need to be reminded of)
 *   - next_purchase (what they will buy)
 *   - next_travel (their next trip)
 *   - next_action (their next platform action)
 *
 * Predictions are derived from:
 *   - Journey patterns (from Experience Replay)
 *   - User history in the knowledge graph (edge weights + observation counts)
 *
 * Predictions are evaluated retroactively: when the predicted event
 * actually happens, evaluatePrediction() marks it correct/incorrect,
 * which feeds back into the engine's accuracy model per type.
 * ============================================================================
 */

import "server-only";

import type { Prediction, PredictionType, PlatformEvent, KnowledgeEdgeType } from "./types";

import { globalKnowledgeGraph } from "./knowledge-graph";
import { globalExperienceReplay } from "./experience-replay";
import { globalEventLearningEngine } from "./event-learning-engine";

// ── Prediction Engine ────────────────────────────────────────────────────

export class PredictionEngine {
  /** All predictions keyed by id. */
  private predictions = new Map<string, Prediction>();
  /** Predictions indexed by user id. */
  private byUser = new Map<string, string[]>();
  /** Predictions indexed by type. */
  private byType = new Map<PredictionType, string[]>();
  /** Accuracy stats per prediction type. */
  private accuracy = new Map<PredictionType, { correct: number; total: number }>();

  /**
   * Generate predictions for a user + type. Returns up to `limit`
   * predictions, sorted by confidence. Side-effect: each returned
   * prediction is stored for later evaluation.
   */
  async predict(userId: string, type: PredictionType, limit = 5): Promise<Prediction[]> {
    try {
      const candidates = await this.generateCandidates(userId, type);
      const ranked = candidates.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
      for (const p of ranked) this.indexPrediction(p);
      return ranked;
    } catch {
      return [];
    }
  }

  /** Predict the user's next single action (across all types). */
  async predictNextAction(userId: string): Promise<Prediction[]> {
    try {
      const userEvents = globalEventLearningEngine.getEventsByUser(userId, 20);
      if (userEvents.length === 0) return [];
      const stepTypes = userEvents.map((e) => e.type);
      const recs = globalExperienceReplay.recommendNextStep(stepTypes, { topK: 5 });
      const out: Prediction[] = [];
      for (const r of recs) {
        const p: Prediction = {
          predictionId: `pred_act_${userId}_${Date.now().toString(36)}_${out.length}`,
          userId,
          type: "next_action",
          predicted: { action: r.type },
          confidence: r.probability,
          timeHorizon: "next_session",
          reasoning: `Based on ${r.observedCount} prior journey transitions ending in ${r.type}`,
          evidence: [`journey_pattern:${r.type}`],
          createdAt: new Date().toISOString(),
        };
        this.indexPrediction(p);
        out.push(p);
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Predict the user's next destination (based on travel history). */
  async predictNextDestination(userId: string): Promise<Prediction[]> {
    try {
      const travelEdges = globalKnowledgeGraph.queryNeighbors(`user:${userId}`, {
        type: "travels_to",
        direction: "out",
        minWeight: 0.1,
      });
      const tally = new Map<string, { name: string; score: number; obs: number }>();
      for (const e of travelEdges.edges) {
        const node = globalKnowledgeGraph.getNode(e.toNodeId);
        if (!node) continue;
        const cur = tally.get(e.toNodeId) || { name: node.name, score: 0, obs: 0 };
        cur.score += e.weight * (1 + Math.log(1 + e.observationCount));
        cur.obs += e.observationCount;
        tally.set(e.toNodeId, cur);
      }
      // Also count booking edges (booked) as destination signal.
      const bookedEdges = globalKnowledgeGraph.queryNeighbors(`user:${userId}`, {
        type: "booked",
        direction: "out",
        minWeight: 0.1,
      });
      for (const e of bookedEdges.edges) {
        const node = globalKnowledgeGraph.getNode(e.toNodeId);
        if (!node) continue;
        if (node.type !== "place" && node.type !== "hotel" && node.type !== "flight") continue;
        const cur = tally.get(e.toNodeId) || { name: node.name, score: 0, obs: 0 };
        cur.score += e.weight * 1.5;
        cur.obs += e.observationCount;
        tally.set(e.toNodeId, cur);
      }
      const sorted = Array.from(tally.entries())
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5);
      const out: Prediction[] = [];
      for (const [nodeId, c] of sorted) {
        const p: Prediction = {
          predictionId: `pred_dest_${userId}_${Date.now().toString(36)}_${out.length}`,
          userId,
          type: "next_destination",
          predicted: { destination: c.name, nodeId },
          confidence: Math.min(1, c.score / 10),
          timeHorizon: "next_30_days",
          reasoning: `User has traveled to ${c.name} (or related) ${c.obs} times before`,
          evidence: [`graph:${nodeId}`],
          createdAt: new Date().toISOString(),
        };
        this.indexPrediction(p);
        out.push(p);
      }
      return out;
    } catch {
      return [];
    }
  }

  /**
   * Evaluate a past prediction as correct or incorrect. Updates the
   * engine's accuracy model so future predictions of the same type can
   * be calibrated. Idempotent — re-evaluation of the same prediction
   * is a no-op.
   */
  evaluatePrediction(predictionId: string, correct: boolean): void {
    try {
      const p = this.predictions.get(predictionId);
      if (!p) return;
      if (p.fulfilledAt) return;
      p.fulfilledAt = new Date().toISOString();
      p.correct = correct;
      const stats = this.accuracy.get(p.type) || { correct: 0, total: 0 };
      stats.total += 1;
      if (correct) stats.correct += 1;
      this.accuracy.set(p.type, stats);
    } catch {
      // best-effort
    }
  }

  /** Return accuracy stats per prediction type. */
  getAccuracyStats(): Array<{ type: PredictionType; correct: number; total: number; accuracy: number }> {
    const out: Array<{ type: PredictionType; correct: number; total: number; accuracy: number }> = [];
    for (const [type, s] of this.accuracy) {
      out.push({ type, correct: s.correct, total: s.total, accuracy: s.total === 0 ? 0 : s.correct / s.total });
    }
    return out.sort((a, b) => b.total - a.total);
  }

  /** Get all predictions for a user (most-recent first). */
  getPredictionsForUser(userId: string, limit = 50): Prediction[] {
    try {
      const ids = this.byUser.get(userId) || [];
      const out: Prediction[] = [];
      for (let i = ids.length - 1; i >= 0 && out.length < limit; i--) {
        const p = this.predictions.get(ids[i]);
        if (p) out.push(p);
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Get a single prediction by id. */
  getPrediction(predictionId: string): Prediction | undefined {
    return this.predictions.get(predictionId);
  }

  /** Stats for monitoring. */
  stats(): Record<string, unknown> {
    const byTypeCount: Record<string, number> = {};
    for (const [k, v] of this.byType) byTypeCount[k] = v.length;
    return {
      total: this.predictions.size,
      byType: byTypeCount,
      accuracy: this.getAccuracyStats(),
    };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async generateCandidates(userId: string, type: PredictionType): Promise<Prediction[]> {
    switch (type) {
      case "next_destination":
      case "next_travel":
        return this.predictNextDestination(userId);
      case "next_action":
        return this.predictNextAction(userId);
      case "next_restaurant":
        return this.predictFromGraph(userId, "next_restaurant", "restaurant", "booked");
      case "next_payment":
        return this.predictFromGraph(userId, "next_payment", "payment", "paid_for");
      case "next_contact":
        return this.predictFromGraph(userId, "next_contact", "user", "related_to");
      case "next_search":
        return this.predictFromGraph(userId, "next_search", "topic", "searched");
      case "next_event":
        return this.predictFromGraph(userId, "next_event", "event", "joined");
      case "next_transport":
        return this.predictFromGraph(userId, "next_transport", "place", "navigated_to");
      case "next_purchase":
        return this.predictFromGraph(userId, "next_purchase", "product", "purchased");
      case "next_reminder":
      case "next_module":
      default:
        return [];
    }
  }

  private async predictFromGraph(
    userId: string,
    type: PredictionType,
    nodeFilter: string,
    edgeType: KnowledgeEdgeType
  ): Promise<Prediction[]> {
    try {
      const neighbors = globalKnowledgeGraph.queryNeighbors(`user:${userId}`, {
        type: edgeType,
        direction: "out",
        minWeight: 0.1,
      });
      const tally = new Map<string, { name: string; score: number; obs: number }>();
      for (const e of neighbors.edges) {
        const node = globalKnowledgeGraph.getNode(e.toNodeId);
        if (!node || node.type !== nodeFilter) continue;
        const cur = tally.get(e.toNodeId) || { name: node.name, score: 0, obs: 0 };
        cur.score += e.weight * (1 + Math.log(1 + e.observationCount));
        cur.obs += e.observationCount;
        tally.set(e.toNodeId, cur);
      }
      const sorted = Array.from(tally.entries())
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5);
      const out: Prediction[] = [];
      for (const [nodeId, c] of sorted) {
        const p: Prediction = {
          predictionId: `pred_${type}_${userId}_${Date.now().toString(36)}_${out.length}`,
          userId,
          type,
          predicted: { name: c.name, nodeId },
          confidence: Math.min(1, c.score / 10),
          timeHorizon: "next_7_days",
          reasoning: `User has previously interacted with ${c.name} (${c.obs} times)`,
          evidence: [`graph:${nodeId}`],
          createdAt: new Date().toISOString(),
        };
        out.push(p);
      }
      return out;
    } catch {
      return [];
    }
  }

  private indexPrediction(p: Prediction): void {
    this.predictions.set(p.predictionId, p);
    if (p.userId) {
      const list = this.byUser.get(p.userId) || [];
      list.push(p.predictionId);
      if (list.length > 1000) list.shift();
      this.byUser.set(p.userId, list);
    }
    const typeList = this.byType.get(p.type) || [];
    typeList.push(p.predictionId);
    if (typeList.length > 1000) typeList.shift();
    this.byType.set(p.type, typeList);
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalPredictionEngine = new PredictionEngine();
