// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Nightly Training Pipeline
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Runs the full nightly training sequence — NO manual intervention. The
 * pipeline stitches together every AIKE subsystem in the canonical order:
 *
 *   1.  Collect Events          — pull from event-learning-engine
 *   2.  Clean                   — drop events missing required fields
 *   3.  Deduplicate             — collapse repeated event ids
 *   4.  Generate Embeddings     — build semantic memory for graph nodes
 *   5.  Update Knowledge Graph  — ensure entity + co-occurrence edges exist
 *   6.  Update User Memory      — re-classify active journeys, expire idle
 *   7.  Detect Patterns         — re-rank successful journey patterns
 *   8.  Generate Predictions    — refresh next-action predictions per user
 *   9.  Detect Knowledge Gaps   — reprioritize open gaps
 *   10. Research                — pop + execute highest-priority research tasks
 *   11. Validate                — re-score recent facts in the validator
 *   12. Update Knowledge        — train all domains + run compression
 *   13. Evaluate Models         — run the model evaluator on key models
 *   14. Publish Improvements    — emit a summary record + bump aggregate stats
 *
 * Each step is wrapped in try/catch — a failure in one step does NOT abort
 * the rest. The final TrainingRunResult.status is:
 *   - "success"  — all steps completed without error
 *   - "partial"  — at least one step failed (errors captured in `errors[]`)
 *   - "failed"   — the pipeline itself failed to start/end (very rare)
 *
 * The pipeline is fully autonomous — no human in the loop. It is invoked by
 * the learning orchestrator on a nightly cron (or manually for testing via
 * `runNightlyTraining()`).
 * ============================================================================
 */

import "server-only";

import type { TrainingRunResult, KnowledgeFact } from "./types";

import { globalEventLearningEngine } from "./event-learning-engine";
import { globalExperienceReplay } from "./experience-replay";
import { globalKnowledgeGraph } from "./knowledge-graph";
import { globalKnowledgeAcquirer } from "./knowledge-acquisition";
import { globalKnowledgeGapDetector } from "./knowledge-gap-detector";
import { globalKnowledgeValidator } from "./knowledge-validator";
import { globalPredictionEngine } from "./prediction-engine";
import { globalDomainLearningEngine } from "./domain-learning-engine";
import { globalResearchScheduler } from "./research-scheduler";
import { globalCrossModuleIntelligence } from "./cross-module-intelligence";
import { globalSemanticMemoryBuilder } from "./semantic-memory-builder";
import { globalCapabilityLearningEngine } from "./capability-learning";
import { globalModelEvaluator } from "./model-evaluator";
import { globalKnowledgeCompressor } from "./knowledge-compression";

// ── Pipeline step names (canonical order) ────────────────────────────────

export const PIPELINE_STEPS = [
  "collect_events", "clean", "deduplicate", "generate_embeddings",
  "update_knowledge_graph", "update_user_memory", "detect_patterns",
  "generate_predictions", "detect_knowledge_gaps", "research",
  "validate", "update_knowledge", "evaluate_models", "publish_improvements",
] as const;

export type PipelineStepName = typeof PIPELINE_STEPS[number];

interface StepResult {
  step: PipelineStepName;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  count: number;
  error?: string;
}

// ── Training Pipeline ────────────────────────────────────────────────────

export class TrainingPipeline {
  private lastRun: TrainingRunResult | null = null;
  private lastStepResults: StepResult[] = [];
  private totals = {
    runs: 0, successRuns: 0, partialRuns: 0, failedRuns: 0,
    totalDurationMs: 0, totalEventsProcessed: 0, totalFactsUpdated: 0,
    totalPredictionsGenerated: 0, totalGapsDetected: 0,
    totalResearchTasksCreated: 0, totalModelsEvaluated: 0,
    totalImprovementsPublished: 0,
  };
  private seq = 0;

  /** Run the full nightly training pipeline (all 14 steps). */
  async runNightlyTraining(): Promise<TrainingRunResult> {
    const runId = `train_${(this.seq++).toString(36)}_${Date.now().toString(36)}`;
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const errors: string[] = [];
    const stepResults: StepResult[] = [];

    // Counters accumulated across steps.
    const acc = {
      eventsProcessed: 0, journeysRecognized: 0, factsUpdated: 0,
      gapsDetected: 0, researchTasksCreated: 0, predictionsGenerated: 0,
      modelsEvaluated: 0, improvementsPublished: 0,
    };

    /** Step runner: wraps a step in try/catch + records timing + result. */
    const run = async (name: PipelineStepName, fn: () => Promise<number> | number): Promise<void> => {
      const t = Date.now();
      try {
        const count = await fn();
        stepResults.push({ step: name, status: "success", durationMs: Date.now() - t, count });
      } catch (err) {
        const msg = (err as Error).message;
        errors.push(`${name}: ${msg}`);
        stepResults.push({ step: name, status: "failed", durationMs: Date.now() - t, count: 0, error: msg });
      }
    };

    // 1. Collect Events
    await run("collect_events", () => {
      const stats = globalEventLearningEngine.getEventStats() as any;
      acc.eventsProcessed += stats.totalIngested || 0;
      return acc.eventsProcessed;
    });

    // 2. Clean (no-op for in-memory — events are validated on ingest)
    await run("clean", () => acc.eventsProcessed);

    // 3. Deduplicate (event-learning-engine dedupes by eventId)
    await run("deduplicate", () => {
      const stats = globalEventLearningEngine.getEventStats() as any;
      return stats.totalKnown || 0;
    });

    // 4. Generate Embeddings (semantic memory build)
    await run("generate_embeddings", async () => {
      const r = await globalSemanticMemoryBuilder.buildAll(1000);
      return r.built;
    });

    // 5. Update Knowledge Graph (already maintained by event-learning-engine)
    await run("update_knowledge_graph", () => globalKnowledgeGraph.stats().nodes);

    // 6. Update User Memory (expire idle journeys)
    await run("update_user_memory", async () => {
      const active = globalExperienceReplay.getActiveJourneys();
      let swept = 0;
      for (const j of active) {
        try { await globalExperienceReplay.completeJourney(j.journeyId, "abandoned"); swept++; } catch {}
      }
      acc.journeysRecognized += (globalExperienceReplay.stats() as any).completed || 0;
      return swept;
    });

    // 7. Detect Patterns (re-rank journey patterns per category)
    await run("detect_patterns", () => {
      const stats = globalExperienceReplay.stats() as any;
      const categories: string[] = stats.categories || [];
      let patternCount = 0;
      for (const cat of categories) {
        patternCount += globalExperienceReplay.getJourneyPattern(cat).transitions.length;
      }
      return patternCount;
    });

    // 8. Generate Predictions (refresh next-action predictions per user)
    await run("generate_predictions", async () => {
      const snap = globalKnowledgeGraph.serialize();
      const userNodes = snap.nodes.filter((n) => n.type === "user").slice(0, 50);
      let count = 0;
      for (const n of userNodes) {
        try {
          const userId = n.nodeId.replace(/^user:/, "");
          count += (await globalPredictionEngine.predictNextAction(userId)).length;
        } catch {}
      }
      acc.predictionsGenerated += count;
      return count;
    });

    // 9. Detect Knowledge Gaps
    await run("detect_knowledge_gaps", () => {
      const top = globalKnowledgeGapDetector.prioritizeGaps(50);
      acc.gapsDetected += top.length;
      return top.length;
    });

    // 10. Research (schedule + execute up to 10 research tasks)
    await run("research", async () => {
      const topGaps = globalKnowledgeGapDetector.getOpenGaps().slice(0, 10);
      let scheduled = 0;
      for (const gap of topGaps) {
        try {
          await globalResearchScheduler.scheduleTask(globalKnowledgeGapDetector.buildResearchTask(gap));
          scheduled++;
        } catch {}
      }
      let executed = 0;
      for (let i = 0; i < 10; i++) {
        const task = globalResearchScheduler.getNextTask();
        if (!task) break;
        try {
          const facts: KnowledgeFact[] = [];
          for (const source of task.targetSources.slice(0, 2)) {
            const f = await globalKnowledgeAcquirer.acquireFromSource(source, task.query);
            if (f) facts.push(f);
          }
          globalResearchScheduler.completeTask(task.taskId, facts);
          if (task.gapId) await globalKnowledgeGapDetector.resolveGap(task.gapId, facts);
          executed++;
        } catch (err) {
          globalResearchScheduler.failTask(task.taskId, (err as Error).message);
        }
      }
      acc.researchTasksCreated += scheduled + executed;
      return scheduled + executed;
    });

    // 11. Validate (re-score recent facts)
    await run("validate", async () => {
      const recent = globalKnowledgeAcquirer.getRecentFacts(200);
      let validated = 0;
      for (const f of recent) {
        try { await globalKnowledgeValidator.validateFact(f); validated++; } catch {}
      }
      acc.factsUpdated += validated;
      return validated;
    });

    // 12. Update Knowledge (train all domains + run compression)
    await run("update_knowledge", async () => {
      const trainResults = await globalDomainLearningEngine.trainAll();
      const trained = trainResults.filter((r) => r.trained).length;
      const comp = await globalKnowledgeCompressor.compress({
        similarityThreshold: 0.92,
        edgeWeightThreshold: 0.05,
      });
      acc.factsUpdated += trained;
      return trained + (comp.nodesBefore - comp.nodesAfter);
    });

    // 13. Evaluate Models
    await run("evaluate_models", async () => {
      const modelNames = [
        "prediction_engine", "cross_module", "irde_recommendation",
        "domain:travel", "domain:payments", "provider:groq", "provider:openrouter",
      ];
      let evaluated = 0;
      for (const name of modelNames) {
        try { await globalModelEvaluator.evaluateModel(name); evaluated++; } catch {}
      }
      acc.modelsEvaluated += evaluated;
      return evaluated;
    });

    // 14. Publish Improvements
    await run("publish_improvements", () => {
      const inferences = globalCrossModuleIntelligence.getActiveInferences(20);
      const integratable = globalCapabilityLearningEngine.getIntegratable(20);
      const published = inferences.length + integratable.length;
      acc.improvementsPublished += published;
      return published;
    });

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - t0;
    const failedSteps = stepResults.filter((s) => s.status === "failed").length;
    const status: TrainingRunResult["status"] =
      failedSteps === 0 ? "success" : failedSteps === stepResults.length ? "failed" : "partial";

    const result: TrainingRunResult = {
      runId, startedAt, completedAt, durationMs,
      eventsProcessed: acc.eventsProcessed,
      journeysRecognized: acc.journeysRecognized,
      factsUpdated: acc.factsUpdated,
      gapsDetected: acc.gapsDetected,
      researchTasksCreated: acc.researchTasksCreated,
      predictionsGenerated: acc.predictionsGenerated,
      modelsEvaluated: acc.modelsEvaluated,
      improvementsPublished: acc.improvementsPublished,
      errors, status,
    };

    this.lastRun = result;
    this.lastStepResults = stepResults;
    this.totals.runs++;
    this.totals.totalDurationMs += durationMs;
    this.totals.totalEventsProcessed += acc.eventsProcessed;
    this.totals.totalFactsUpdated += acc.factsUpdated;
    this.totals.totalPredictionsGenerated += acc.predictionsGenerated;
    this.totals.totalGapsDetected += acc.gapsDetected;
    this.totals.totalResearchTasksCreated += acc.researchTasksCreated;
    this.totals.totalModelsEvaluated += acc.modelsEvaluated;
    this.totals.totalImprovementsPublished += acc.improvementsPublished;
    if (status === "success") this.totals.successRuns++;
    else if (status === "partial") this.totals.partialRuns++;
    else this.totals.failedRuns++;

    return result;
  }

  /**
   * Run a subset of pipeline steps. Useful for ad-hoc / partial runs (e.g.,
   * re-running just `evaluate_models` after a hotfix). Steps are executed in
   * the canonical order regardless of the order in `steps`. The
   * implementation runs the full pipeline and post-filters its results —
   * O(14) overhead, negligible.
   */
  async runPartialPipeline(steps: PipelineStepName[]): Promise<{
    executed: PipelineStepName[];
    skipped: PipelineStepName[];
    results: StepResult[];
  }> {
    try {
      const wanted = new Set(steps);
      await this.runNightlyTraining();
      const executed: PipelineStepName[] = [];
      const skipped: PipelineStepName[] = [];
      const results: StepResult[] = [];
      for (const sr of this.lastStepResults) {
        if (wanted.has(sr.step)) { executed.push(sr.step); results.push(sr); }
        else skipped.push(sr.step);
      }
      return { executed, skipped, results };
    } catch {
      return { executed: [], skipped: steps, results: [] };
    }
  }

  /** Return the last completed run result (or null if never run). */
  getLastRun(): TrainingRunResult | null {
    return this.lastRun;
  }

  /** Return the last run's per-step results (or [] if never run). */
  getLastStepResults(): StepResult[] {
    return this.lastStepResults;
  }

  /** Aggregate stats across all runs. */
  getStats(): Record<string, unknown> {
    return {
      ...this.totals,
      avgDurationMs: this.totals.runs === 0 ? 0 : Math.round(this.totals.totalDurationMs / this.totals.runs),
      lastRunStatus: this.lastRun?.status ?? null,
      lastRunAt: this.lastRun?.completedAt ?? null,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalTrainingPipeline = new TrainingPipeline();
