/**
 * CIRKLE Brain AI — LIEE Pattern Detection Engine
 * ============================================================================
 *
 * Phase 7 — Learning & Intelligence Evolution Engine
 *
 * Identifies explainable, traceable patterns from collected feedback signals:
 *   - Frequent workflows (commonly used capability sequences)
 *   - Common failures (repeated execution failures)
 *   - Clarification repeats (repeated clarification requests)
 *   - High-performing strategies (orchestration patterns that succeed)
 *   - Usage trends (emerging platform usage)
 *   - Capability adoption (which capabilities are gaining/losing usage)
 *   - Preference evolution (user preference changes)
 *   - Latency patterns (slow capabilities/times)
 *   - Provider performance (AI provider reliability)
 *
 * Patterns are EXPLAINABLE: each pattern references the signal ids that
 * support it. Patterns are TRACEABLE: firstObserved + lastObserved + frequency.
 * ============================================================================
 */

import type { FeedbackSignal, LearningPattern, PatternType } from "./types";

// ── Pattern Detection Engine ──────────────────────────────────────────────

export class PatternDetector {
  /**
   * Detect all pattern types from the collected feedback signals.
   */
  detect(signals: FeedbackSignal[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    patterns.push(...this.detectFrequentWorkflows(signals));
    patterns.push(...this.detectCommonFailures(signals));
    patterns.push(...this.detectClarificationRepeats(signals));
    patterns.push(...this.detectHighPerformingStrategies(signals));
    patterns.push(...this.detectCapabilityAdoption(signals));
    patterns.push(...this.detectLatencyPatterns(signals));
    patterns.push(...this.detectProviderPerformance(signals));

    return patterns;
  }

  // ── Frequent workflows ────────────────────────────────────────────────

  /**
   * Detect commonly used capability sequences (from execution signals).
   */
  private detectFrequentWorkflows(signals: FeedbackSignal[]): LearningPattern[] {
    const executionSignals = signals.filter((s) => s.pipeline === "execution" && s.targetType === "plan");
    if (executionSignals.length < 3) return [];

    // Group by targetEntityId (plan) — each plan represents a workflow.
    const byPlan = new Map<string, FeedbackSignal[]>();
    for (const s of executionSignals) {
      const key = s.targetEntityId || "(unknown)";
      if (!byPlan.has(key)) byPlan.set(key, []);
      byPlan.get(key)!.push(s);
    }

    // Count unique plans with the same capability sequence (from raw data).
    const sequenceCount = new Map<string, { count: number; signals: string[]; firstSeen: string; lastSeen: string }>();
    for (const [planId, sigs] of byPlan) {
      void planId;
      // The capability sequence is in the raw data (if available).
      const capabilities = sigs[0]?.raw?.capabilities as string[] | undefined;
      if (capabilities && capabilities.length > 0) {
        const key = capabilities.join(" → ");
        const existing = sequenceCount.get(key);
        if (existing) {
          existing.count++;
          existing.signals.push(...sigs.map((s) => s.feedbackId));
          existing.lastSeen = sigs[sigs.length - 1].timestamp;
        } else {
          sequenceCount.set(key, {
            count: 1,
            signals: sigs.map((s) => s.feedbackId),
            firstSeen: sigs[0].timestamp,
            lastSeen: sigs[sigs.length - 1].timestamp,
          });
        }
      }
    }

    const patterns: LearningPattern[] = [];
    for (const [sequence, info] of sequenceCount) {
      if (info.count >= 2) {
        patterns.push({
          patternId: `pat_wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          type: "frequent-workflow" as PatternType,
          description: `Workflow sequence "${sequence}" used ${info.count} times`,
          supportingSignals: info.signals,
          frequency: info.count,
          confidence: Math.min(0.95, 0.5 + info.count * 0.1),
          firstObserved: info.firstSeen,
          lastObserved: info.lastSeen,
          data: { sequence, planIds: byPlan.size },
          explainable: true,
        });
      }
    }

    return patterns;
  }

  // ── Common failures ───────────────────────────────────────────────────

  /**
   * Detect repeated execution failures (by capability or plan).
   */
  private detectCommonFailures(signals: FeedbackSignal[]): LearningPattern[] {
    const failureSignals = signals.filter((s) => s.valence === "negative" && s.pipeline === "execution");
    if (failureSignals.length < 2) return [];

    // Group by target entity (capability or plan).
    const byTarget = new Map<string, FeedbackSignal[]>();
    for (const s of failureSignals) {
      const key = s.targetEntityId || s.raw?.capabilityId as string || "(unknown)";
      if (!byTarget.has(key)) byTarget.set(key, []);
      byTarget.get(key)!.push(s);
    }

    const patterns: LearningPattern[] = [];
    for (const [target, sigs] of byTarget) {
      if (sigs.length >= 2) {
        patterns.push({
          patternId: `pat_fail_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          type: "common-failure" as PatternType,
          description: `Capability "${target}" failed ${sigs.length} times`,
          supportingSignals: sigs.map((s) => s.feedbackId),
          frequency: sigs.length,
          confidence: Math.min(0.95, 0.5 + sigs.length * 0.15),
          firstObserved: sigs[0].timestamp,
          lastObserved: sigs[sigs.length - 1].timestamp,
          data: { target, failureCount: sigs.length, errors: sigs.map((s) => s.raw?.error).filter(Boolean) },
          explainable: true,
        });
      }
    }

    return patterns;
  }

  // ── Clarification repeats ─────────────────────────────────────────────

  /**
   * Detect repeated clarification requests (from CRIE signals).
   */
  private detectClarificationRepeats(signals: FeedbackSignal[]): LearningPattern[] {
    const clarifySignals = signals.filter((s) => s.sourcePhase === "crie" && s.raw?.intentType === "clarify");
    if (clarifySignals.length < 2) return [];

    // Group by the subject being clarified.
    const bySubject = new Map<string, FeedbackSignal[]>();
    for (const s of clarifySignals) {
      const key = String(s.raw?.subject || "(unknown)");
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key)!.push(s);
    }

    const patterns: LearningPattern[] = [];
    for (const [subject, sigs] of bySubject) {
      if (sigs.length >= 2) {
        patterns.push({
          patternId: `pat_clarify_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          type: "clarification-repeat" as PatternType,
          description: `Users repeatedly request clarification about "${subject}" (${sigs.length} times)`,
          supportingSignals: sigs.map((s) => s.feedbackId),
          frequency: sigs.length,
          confidence: Math.min(0.9, 0.4 + sigs.length * 0.2),
          firstObserved: sigs[0].timestamp,
          lastObserved: sigs[sigs.length - 1].timestamp,
          data: { subject, count: sigs.length },
          explainable: true,
        });
      }
    }

    return patterns;
  }

  // ── High-performing strategies ────────────────────────────────────────

  /**
   * Detect orchestration strategies that consistently succeed.
   */
  private detectHighPerformingStrategies(signals: FeedbackSignal[]): LearningPattern[] {
    const successSignals = signals.filter((s) => s.valence === "positive" && s.pipeline === "execution");
    if (successSignals.length < 3) return [];

    // Group by workspace (from raw data).
    const byWorkspace = new Map<string, FeedbackSignal[]>();
    for (const s of successSignals) {
      const ws = String(s.raw?.workspace || "general");
      if (!byWorkspace.has(ws)) byWorkspace.set(ws, []);
      byWorkspace.get(ws)!.push(s);
    }

    const patterns: LearningPattern[] = [];
    for (const [workspace, sigs] of byWorkspace) {
      if (sigs.length >= 3) {
        const avgScore = sigs.reduce((sum, s) => sum + s.normalizedScore, 0) / sigs.length;
        patterns.push({
          patternId: `pat_perf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          type: "high-performing-strategy" as PatternType,
          description: `Workspace "${workspace}" has ${sigs.length} successful executions (avg score: ${avgScore.toFixed(2)})`,
          supportingSignals: sigs.map((s) => s.feedbackId),
          frequency: sigs.length,
          confidence: Math.min(0.95, avgScore),
          firstObserved: sigs[0].timestamp,
          lastObserved: sigs[sigs.length - 1].timestamp,
          data: { workspace, successCount: sigs.length, averageScore: avgScore },
          explainable: true,
        });
      }
    }

    return patterns;
  }

  // ── Capability adoption ───────────────────────────────────────────────

  /**
   * Detect which capabilities are gaining or losing usage.
   */
  private detectCapabilityAdoption(signals: FeedbackSignal[]): LearningPattern[] {
    const capabilitySignals = signals.filter((s) => s.targetType === "capability" || s.raw?.capabilityId);
    if (capabilitySignals.length < 3) return [];

    // Count usage per capability.
    const usageCount = new Map<string, number>();
    for (const s of capabilitySignals) {
      const capId = String(s.raw?.capabilityId || s.targetEntityId || "(unknown)");
      usageCount.set(capId, (usageCount.get(capId) || 0) + 1);
    }

    const patterns: LearningPattern[] = [];
    for (const [capId, count] of usageCount) {
      if (count >= 3) {
        patterns.push({
          patternId: `pat_adopt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          type: "capability-adoption" as PatternType,
          description: `Capability "${capId}" used ${count} times`,
          supportingSignals: capabilitySignals.filter((s) => (s.raw?.capabilityId || s.targetEntityId) === capId).map((s) => s.feedbackId),
          frequency: count,
          confidence: Math.min(0.9, 0.3 + count * 0.1),
          firstObserved: capabilitySignals[0].timestamp,
          lastObserved: capabilitySignals[capabilitySignals.length - 1].timestamp,
          data: { capabilityId: capId, usageCount: count },
          explainable: true,
        });
      }
    }

    return patterns;
  }

  // ── Latency patterns ──────────────────────────────────────────────────

  /**
   * Detect slow capabilities or high-latency times.
   */
  private detectLatencyPatterns(signals: FeedbackSignal[]): LearningPattern[] {
    const opSignals = signals.filter((s) => s.pipeline === "operational");
    if (opSignals.length < 3) return [];

    // Find capabilities with consistently low operational scores (high latency).
    const byCapability = new Map<string, FeedbackSignal[]>();
    for (const s of opSignals) {
      const capId = String(s.raw?.capabilityId || s.targetEntityId || "(unknown)");
      if (!byCapability.has(capId)) byCapability.set(capId, []);
      byCapability.get(capId)!.push(s);
    }

    const patterns: LearningPattern[] = [];
    for (const [capId, sigs] of byCapability) {
      if (sigs.length >= 3) {
        const avgScore = sigs.reduce((sum, s) => sum + s.normalizedScore, 0) / sigs.length;
        if (avgScore < 0.4) {
          // Low score = high latency or errors.
          patterns.push({
            patternId: `pat_lat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            type: "latency-pattern" as PatternType,
            description: `Capability "${capId}" has consistently low performance (avg score: ${avgScore.toFixed(2)})`,
            supportingSignals: sigs.map((s) => s.feedbackId),
            frequency: sigs.length,
            confidence: Math.min(0.9, 0.4 + (1 - avgScore) * 0.5),
            firstObserved: sigs[0].timestamp,
            lastObserved: sigs[sigs.length - 1].timestamp,
            data: { capabilityId: capId, averageScore: avgScore, averageLatencyMs: sigs.reduce((sum, s) => sum + Number(s.raw?.latencyMs || 0), 0) / sigs.length },
            explainable: true,
          });
        }
      }
    }

    return patterns;
  }

  // ── Provider performance ──────────────────────────────────────────────

  /**
   * Detect AI provider reliability patterns.
   */
  private detectProviderPerformance(signals: FeedbackSignal[]): LearningPattern[] {
    const providerSignals = signals.filter((s) => s.targetType === "provider" || s.raw?.provider);
    if (providerSignals.length < 3) return [];

    const byProvider = new Map<string, FeedbackSignal[]>();
    for (const s of providerSignals) {
      const provider = String(s.raw?.provider || "(unknown)");
      if (!byProvider.has(provider)) byProvider.set(provider, []);
      byProvider.get(provider)!.push(s);
    }

    const patterns: LearningPattern[] = [];
    for (const [provider, sigs] of byProvider) {
      if (sigs.length >= 3) {
        const avgScore = sigs.reduce((sum, s) => sum + s.normalizedScore, 0) / sigs.length;
        patterns.push({
          patternId: `pat_prov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          type: "provider-performance" as PatternType,
          description: `Provider "${provider}" average performance score: ${avgScore.toFixed(2)} (${sigs.length} signals)`,
          supportingSignals: sigs.map((s) => s.feedbackId),
          frequency: sigs.length,
          confidence: Math.min(0.9, 0.3 + sigs.length * 0.1),
          firstObserved: sigs[0].timestamp,
          lastObserved: sigs[sigs.length - 1].timestamp,
          data: { provider, averageScore: avgScore, signalCount: sigs.length },
          explainable: true,
        });
      }
    }

    return patterns;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalPatternDetector = new PatternDetector();
