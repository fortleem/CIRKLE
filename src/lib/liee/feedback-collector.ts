// @ts-nocheck
/**
 * CIRKLE Brain AI — LIEE Feedback Collector
 * Persists feedback to DB + loads from DB on each request (Vercel serverless safe).
 */

import type { FeedbackSignal, FeedbackPipeline, FeedbackValence } from "./types";

function normalize(pipeline: FeedbackPipeline, raw: Record<string, unknown>): { score: number; valence: FeedbackValence } {
  switch (pipeline) {
    case "explicit": {
      const rating = Number(raw.rating || 0);
      const score = Math.max(0, Math.min(1, rating / 5));
      const valence: FeedbackValence = score >= 0.7 ? "positive" : score <= 0.3 ? "negative" : "neutral";
      return { score, valence };
    }
    case "implicit": {
      const action = String(raw.action || "");
      if (action === "accepted" || action === "booked" || action === "purchased") return { score: 1.0, valence: "positive" };
      if (action === "ignored") return { score: 0.5, valence: "neutral" };
      if (action === "rejected") return { score: 0.0, valence: "negative" };
      return { score: 0.5, valence: "neutral" };
    }
    case "behavioral": {
      const dwellMs = Number(raw.dwellMs || 0);
      const clickDepth = Number(raw.clickDepth || 0);
      const score = Math.min(1, (dwellMs / 30000) * 0.5 + (clickDepth / 5) * 0.5);
      const valence: FeedbackValence = score >= 0.6 ? "positive" : score <= 0.2 ? "negative" : "neutral";
      return { score, valence };
    }
    case "operational": {
      const latencyMs = Number(raw.latencyMs || 1000);
      const errorRate = Number(raw.errorRate || 0);
      const latencyScore = Math.max(0, 1 - latencyMs / 5000);
      const score = latencyScore * (1 - errorRate);
      const valence: FeedbackValence = score >= 0.7 ? "positive" : score <= 0.3 ? "negative" : "neutral";
      return { score, valence };
    }
    case "execution": {
      const state = String(raw.state || "");
      if (state === "completed") return { score: 1.0, valence: "positive" };
      if (state === "timed-out" || state === "cancelled") return { score: 0.3, valence: "negative" };
      if (state === "failed") return { score: 0.0, valence: "negative" };
      return { score: 0.5, valence: "neutral" };
    }
    case "satisfaction": {
      const satisfaction = Number(raw.satisfaction || 3);
      const score = Math.max(0, Math.min(1, satisfaction / 5));
      const valence: FeedbackValence = score >= 0.7 ? "positive" : score <= 0.3 ? "negative" : "neutral";
      return { score, valence };
    }
    default:
      return { score: 0.5, valence: "neutral" };
  }
}

export class FeedbackCollector {
  private maxSignals = 10000;

  async ingest(params: {
    pipeline: FeedbackPipeline;
    sourcePhase: string;
    userId?: string;
    targetEntityId?: string;
    targetType: FeedbackSignal["targetType"];
    raw: Record<string, unknown>;
    consentGranted: boolean;
  }): Promise<FeedbackSignal | null> {
    if (!params.consentGranted) return null;

    const { score, valence } = normalize(params.pipeline, params.raw);
    const signal: FeedbackSignal = {
      feedbackId: `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      pipeline: params.pipeline,
      sourcePhase: params.sourcePhase,
      userId: params.userId,
      targetEntityId: params.targetEntityId,
      targetType: params.targetType,
      valence,
      normalizedScore: score,
      timestamp: new Date().toISOString(),
      raw: params.raw,
      consentGranted: true,
    };

    // Persist to database (best-effort, non-blocking)
    await this.persistToDB(signal);
    return signal;
  }

  async ingestExecutionOutcome(params: {
    executionId: string;
    planId: string;
    state: string;
    stepsSucceeded: number;
    stepsFailed: number;
    totalDurationMs: number;
    totalRetries: number;
    userId?: string;
    consentGranted: boolean;
  }): Promise<void> {
    if (!params.consentGranted) return;

    await this.ingest({
      pipeline: "execution",
      sourcePhase: "tee",
      userId: params.userId,
      targetEntityId: params.executionId,
      targetType: "plan",
      raw: { state: params.state, executionId: params.executionId, planId: params.planId },
      consentGranted: params.consentGranted,
    });

    await this.ingest({
      pipeline: "operational",
      sourcePhase: "tee",
      userId: params.userId,
      targetEntityId: params.executionId,
      targetType: "plan",
      raw: {
        latencyMs: params.totalDurationMs,
        errorRate: params.stepsSucceeded + params.stepsFailed > 0 ? params.stepsFailed / (params.stepsSucceeded + params.stepsFailed) : 0,
        retries: params.totalRetries,
      },
      consentGranted: params.consentGranted,
    });
  }

  async ingestRecommendationOutcome(params: {
    recommendationId: string;
    action: "accepted" | "rejected" | "ignored" | "booked" | "purchased";
    userId?: string;
    consentGranted: boolean;
  }): Promise<void> {
    await this.ingest({
      pipeline: "implicit",
      sourcePhase: "irde",
      userId: params.userId,
      targetEntityId: params.recommendationId,
      targetType: "recommendation",
      raw: { action: params.action },
      consentGranted: params.consentGranted,
    });
  }

  async ingestExplicitFeedback(params: {
    targetEntityId: string;
    targetType: FeedbackSignal["targetType"];
    rating: number;
    userId?: string;
    consentGranted: boolean;
  }): Promise<void> {
    await this.ingest({
      pipeline: "explicit",
      sourcePhase: "user",
      userId: params.userId,
      targetEntityId: params.targetEntityId,
      targetType: params.targetType,
      raw: { rating: params.rating },
      consentGranted: params.consentGranted,
    });
  }

  /**
   * Load signals from DB (Vercel serverless safe — no in-memory state).
   */
  async getSignals(): Promise<FeedbackSignal[]> {
    try {
      const { loadFeedback } = await import("@/lib/ai-persistence");
      const dbSignals = await loadFeedback(1000);
      return dbSignals.map((s: any) => ({
        feedbackId: s.feedbackId,
        pipeline: s.pipeline,
        sourcePhase: s.sourcePhase,
        userId: s.userId || undefined,
        targetEntityId: s.targetEntityId || undefined,
        targetType: s.targetType,
        valence: s.valence,
        normalizedScore: s.normalizedScore,
        timestamp: s.createdAt?.toISOString() || new Date().toISOString(),
        raw: s.raw || {},
        consentGranted: s.consentGranted,
      }));
    } catch {
      return [];
    }
  }

  async getSignalsByPipeline(pipeline: FeedbackPipeline): Promise<FeedbackSignal[]> {
    const signals = await this.getSignals();
    return signals.filter((s) => s.pipeline === pipeline);
  }

  async getSignalsByPhase(phase: string): Promise<FeedbackSignal[]> {
    const signals = await this.getSignals();
    return signals.filter((s) => s.sourcePhase === phase);
  }

  async getStats(): Promise<{
    total: number;
    byPipeline: Record<string, number>;
    byPhase: Record<string, number>;
    byValence: Record<string, number>;
    averageScore: number;
  }> {
    const signals = await this.getSignals();
    const byPipeline: Record<string, number> = {};
    const byPhase: Record<string, number> = {};
    const byValence: Record<string, number> = {};
    let totalScore = 0;

    for (const s of signals) {
      byPipeline[s.pipeline] = (byPipeline[s.pipeline] || 0) + 1;
      byPhase[s.sourcePhase] = (byPhase[s.sourcePhase] || 0) + 1;
      byValence[s.valence] = (byValence[s.valence] || 0) + 1;
      totalScore += s.normalizedScore;
    }

    return {
      total: signals.length,
      byPipeline,
      byPhase,
      byValence,
      averageScore: signals.length > 0 ? totalScore / signals.length : 0,
    };
  }

  private async persistToDB(signal: FeedbackSignal): Promise<void> {
    try {
      const { persistFeedback } = await import("@/lib/ai-persistence");
      await persistFeedback({
        feedbackId: signal.feedbackId,
        pipeline: signal.pipeline,
        sourcePhase: signal.sourcePhase,
        userId: signal.userId,
        targetEntityId: signal.targetEntityId,
        targetType: signal.targetType,
        valence: signal.valence,
        normalizedScore: signal.normalizedScore,
        raw: signal.raw,
        consentGranted: signal.consentGranted,
      });
    } catch {
      // DB persistence is best-effort.
    }
  }
}

export const globalFeedbackCollector = new FeedbackCollector();
