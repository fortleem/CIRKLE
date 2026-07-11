// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Learning Orchestrator
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * The MASTER orchestrator. Owns a priority queue of LearningTask objects
 * and continuously executes them at a configurable cycle rate (default 60s).
 *
 * One handler per LearningTaskType (16 total): event_processing,
 * journey_analysis, knowledge_acquisition, gap_detection, research,
 * validation, freshness_check, world_state_refresh, prediction_generation,
 * domain_training, model_evaluation, provider_evaluation,
 * capability_discovery, graph_update, semantic_memory_build,
 * knowledge_compression.
 *
 * Constitutional role: NEVER blocks the Brain's reasoning loop — runs
 * detached on setInterval. NEVER throws — task errors are caught and
 * recorded on the task. Supports graceful start/stop. Auto-schedules
 * routine background tasks when the queue is empty so the Brain keeps
 * learning autonomously.
 * ============================================================================
 */

import "server-only";

import type { LearningTask, LearningTaskType } from "./types";

import { globalEventLearningEngine } from "./event-learning-engine";
import { globalExperienceReplay } from "./experience-replay";
import { globalKnowledgeGraph } from "./knowledge-graph";
import { globalKnowledgeAcquirer } from "./knowledge-acquisition";
import { globalKnowledgeGapDetector } from "./knowledge-gap-detector";
import { globalKnowledgeValidator } from "./knowledge-validator";
import { globalKnowledgeFreshnessManager } from "./knowledge-freshness";
import { globalWorldStateEngine } from "./world-state-engine";
import { globalPredictionEngine } from "./prediction-engine";
import { globalDomainLearningEngine } from "./domain-learning-engine";
import { globalResearchScheduler } from "./research-scheduler";
import { globalCrossModuleIntelligence } from "./cross-module-intelligence";
import { globalSemanticMemoryBuilder } from "./semantic-memory-builder";
import { globalProviderLearningEngine } from "./provider-learning";
import { globalCapabilityLearningEngine } from "./capability-learning";
import { globalTrustRanker } from "./trust-ranking";
import { globalModelEvaluator } from "./model-evaluator";
import { globalKnowledgeCompressor } from "./knowledge-compression";

const DEFAULT_CYCLE_MS = 60_000;
const MAX_TASKS = 5_000;
const MAX_TASKS_PER_CYCLE = 1;
const MAX_TASKS_PER_PROCESS_QUEUE = 50;

/** Priority comparator: priority DESC, ties broken by scheduledFor ASC. */
function taskCompare(a: LearningTask, b: LearningTask): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.scheduledFor.localeCompare(b.scheduledFor);
}

// ── Learning Orchestrator ────────────────────────────────────────────────

export class LearningOrchestrator {
  private queue: LearningTask[] = [];
  private tasks = new Map<string, LearningTask>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private cycleMs = DEFAULT_CYCLE_MS;
  private seq = 0;
  private stats = {
    totalScheduled: 0, totalExecuted: 0, totalFailed: 0, totalSucceeded: 0,
    lastCycleAt: "", lastTaskType: "" as LearningTaskType | "",
  };

  /** Start the background cycle. Idempotent. Timer is unref'd. */
  start(cycleMs: number = DEFAULT_CYCLE_MS): boolean {
    try {
      if (this.timer) return false;
      this.cycleMs = Math.max(1_000, cycleMs);
      this.timer = setInterval(() => { void this.runCycle(); }, this.cycleMs);
      if (this.timer && typeof this.timer.unref === "function") this.timer.unref();
      return true;
    } catch { return false; }
  }

  /** Stop the background cycle. Idempotent. */
  stop(): boolean {
    try {
      if (!this.timer) return false;
      clearInterval(this.timer);
      this.timer = null;
      return true;
    } catch { return false; }
  }

  /** Schedule a learning task. Picked up once its scheduledFor time passes. */
  async scheduleTask(
    type: LearningTaskType,
    priority: number,
    delayMs: number = 0,
    payload: Record<string, unknown> = {}
  ): Promise<LearningTask> {
    try {
      const taskId = `lt_${(this.seq++).toString(36)}_${Date.now().toString(36)}`;
      const task: LearningTask = {
        taskId, type,
        priority: Math.max(0, Math.min(1, priority)),
        scheduledFor: new Date(Date.now() + Math.max(0, delayMs)).toISOString(),
        status: "queued", payload,
      };
      this.tasks.set(taskId, task);
      this.insertTask(task);
      this.stats.totalScheduled++;
      this.evictIfNeeded();
      return task;
    } catch (err) {
      return {
        taskId: `lt_err_${Date.now().toString(36)}`, type, priority,
        scheduledFor: new Date().toISOString(), status: "failed", payload,
        error: (err as Error).message,
      };
    }
  }

  /** Process all due tasks (up to MAX_TASKS_PER_PROCESS_QUEUE per call). */
  async processQueue(): Promise<number> {
    let n = 0;
    try {
      while (n < MAX_TASKS_PER_PROCESS_QUEUE) {
        const task = this.popDue();
        if (!task) break;
        await this.executeTask(task);
        n++;
      }
    } catch {}
    return n;
  }

  /**
   * Run one orchestrator cycle: pop the highest-priority due task and
   * execute it. If no due task exists, schedule a small batch of routine
   * background tasks so the Brain keeps learning autonomously.
   */
  async runCycle(): Promise<LearningTask | null> {
    try {
      if (this.running) return null;
      this.running = true;
      this.stats.lastCycleAt = new Date().toISOString();
      let executed = 0;
      for (let i = 0; i < MAX_TASKS_PER_CYCLE; i++) {
        const task = this.popDue();
        if (!task) break;
        await this.executeTask(task);
        executed++;
      }
      if (executed === 0) await this.scheduleRoutineTasks();
      this.running = false;
      return null;
    } catch { this.running = false; return null; }
  }

  /** Snapshot status for monitoring (aggregates every AIKE subsystem). */
  getStatus(): Record<string, unknown> {
    return {
      running: this.running, cycleMs: this.cycleMs,
      queueDepth: this.queue.length, totalTasks: this.tasks.size,
      ...this.stats,
      graphStats: globalKnowledgeGraph.stats(),
      freshnessStats: globalKnowledgeFreshnessManager.stats(),
      researchStats: globalResearchScheduler.getStats(),
      worldStats: globalWorldStateEngine.stats(),
      providerStats: globalProviderLearningEngine.stats(),
      capabilityStats: globalCapabilityLearningEngine.stats(),
      domainStats: globalDomainLearningEngine.stats(),
      evaluatorStats: globalModelEvaluator.getStats(),
      compressorStats: globalKnowledgeCompressor.getStats(),
    };
  }

  /** Get a task by id (any status). */
  getTask(taskId: string): LearningTask | undefined { return this.tasks.get(taskId); }

  /** Return up to `limit` most-recent tasks (any status). */
  getRecentTasks(limit = 50): LearningTask[] {
    try { return Array.from(this.tasks.values()).slice(-limit); } catch { return []; }
  }

  // ── Task execution + dispatch ───────────────────────────────────────

  private async executeTask(task: LearningTask): Promise<LearningTask> {
    try {
      task.status = "in_progress";
      task.startedAt = new Date().toISOString();
      task.result = await this.dispatch(task);
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      this.stats.totalExecuted++;
      this.stats.totalSucceeded++;
      this.stats.lastTaskType = task.type;
      return task;
    } catch (err) {
      task.status = "failed";
      task.error = (err as Error).message;
      task.completedAt = new Date().toISOString();
      this.stats.totalExecuted++;
      this.stats.totalFailed++;
      this.stats.lastTaskType = task.type;
      return task;
    }
  }

  /** Dispatch a task to its handler. */
  private async dispatch(task: LearningTask): Promise<Record<string, unknown>> {
    const handlers: Record<LearningTaskType, (t: LearningTask) => Promise<Record<string, unknown>>> = {
      event_processing: async () => ({ step: "event_processing", stats: globalEventLearningEngine.getEventStats() }),
      journey_analysis: async () => {
        const active = globalExperienceReplay.getActiveJourneys();
        let swept = 0;
        for (const j of active) { try { await globalExperienceReplay.completeJourney(j.journeyId, "abandoned"); swept++; } catch {} }
        return { activeBefore: active.length, swept, stats: globalExperienceReplay.stats() };
      },
      knowledge_acquisition: async (t) => {
        const domain = (t.payload.domain as string) || "general";
        const fact = await globalKnowledgeAcquirer.acquireFromSource("wikipedia" as any, `discover:${domain}`);
        let validated = 0;
        if (fact) { try { await globalKnowledgeValidator.validateFact(fact); validated++; } catch {} }
        return { domain, acquired: fact ? 1 : 0, validated };
      },
      gap_detection: async () => {
        const top = globalKnowledgeGapDetector.prioritizeGaps(20);
        let scheduled = 0;
        for (const gap of top.slice(0, 5)) {
          try { await globalResearchScheduler.scheduleTask(globalKnowledgeGapDetector.buildResearchTask(gap)); scheduled++; } catch {}
        }
        return { openGaps: top.length, scheduled };
      },
      research: async () => {
        const rt = globalResearchScheduler.getNextTask();
        if (!rt) return { executed: 0 };
        try {
          const facts: any[] = [];
          for (const src of rt.targetSources.slice(0, 2)) {
            const f = await globalKnowledgeAcquirer.acquireFromSource(src, rt.query);
            if (f) facts.push(f);
          }
          globalResearchScheduler.completeTask(rt.taskId, facts);
          if (rt.gapId) await globalKnowledgeGapDetector.resolveGap(rt.gapId, facts);
          return { executed: 1, taskId: rt.taskId, factsFound: facts.length };
        } catch (err) {
          globalResearchScheduler.failTask(rt.taskId, (err as Error).message);
          return { executed: 0, error: (err as Error).message };
        }
      },
      validation: async () => {
        const recent = globalKnowledgeAcquirer.getRecentFacts(50);
        let validated = 0;
        for (const f of recent) { try { await globalKnowledgeValidator.validateFact(f); validated++; } catch {} }
        return { validated, stats: globalKnowledgeValidator.stats() };
      },
      freshness_check: async () => {
        const stale = globalKnowledgeFreshnessManager.getStale(50);
        for (const r of stale) { try { globalKnowledgeFreshnessManager.markRefreshed(r.nodeId, r.metric); } catch {} }
        return { staleCount: stale.length, stats: globalKnowledgeFreshnessManager.stats() };
      },
      world_state_refresh: async () => {
        const stale = globalWorldStateEngine.checkStale();
        let refreshed = 0;
        for (const e of stale.slice(0, 20)) { try { await globalWorldStateEngine.refresh(e.metric, e.scope); refreshed++; } catch {} }
        return { staleCount: stale.length, refreshed, stats: globalWorldStateEngine.stats() };
      },
      prediction_generation: async (t) => {
        let users = (t.payload.userIds as string[]) || [];
        if (users.length === 0) {
          const snap = globalKnowledgeGraph.serialize();
          users = snap.nodes.filter((n) => n.type === "user").slice(0, 20).map((n) => n.nodeId.replace(/^user:/, ""));
        }
        let total = 0;
        for (const u of users) { try { total += (await globalPredictionEngine.predictNextAction(u)).length; } catch {} }
        return { usersScanned: users.length, predictionsGenerated: total };
      },
      domain_training: async () => {
        const results = await globalDomainLearningEngine.trainAll();
        return { trained: results.filter((r) => r.trained).length, total: results.length, details: results };
      },
      model_evaluation: async (t) => {
        const modelName = (t.payload.modelName as string) || "prediction_engine";
        return { modelName, evaluation: await globalModelEvaluator.evaluateModel(modelName) };
      },
      provider_evaluation: async (t) => {
        const provider = t.payload.provider as any;
        if (!provider) return { recorded: false, error: "missing provider in payload" };
        await globalProviderLearningEngine.recordCall(provider, {
          accuracy: (t.payload.accuracy as number) ?? 0.8,
          latencyMs: (t.payload.latencyMs as number) ?? 1000,
          costPer1k: (t.payload.costPer1k as number) ?? 0.01,
          arabicQuality: (t.payload.arabicQuality as number) ?? 0.7,
          reasoningScore: (t.payload.reasoningScore as number) ?? 0.7,
          codeScore: (t.payload.codeScore as number) ?? 0.7,
          visionScore: (t.payload.visionScore as number) ?? 0.5,
          reliability: (t.payload.reliability as number) ?? 0.95,
          available: (t.payload.available as 0 | 1) ?? 1,
        });
        return { recorded: true, provider };
      },
      capability_discovery: async (t) => {
        const domain = (t.payload.domain as string) || "ai";
        const discovered = await globalCapabilityLearningEngine.discover(domain);
        return { domain, newlyDiscovered: discovered.length, stats: globalCapabilityLearningEngine.stats() };
      },
      graph_update: async (t) => {
        const snap = globalKnowledgeGraph.serialize();
        const minSim = (t.payload.minSimilarity as number) ?? 0.5;
        let edgesAdded = 0;
        const nodes = snap.nodes.filter((n) => n.type !== "user").slice(0, 100);
        for (const node of nodes) {
          try {
            const sims = globalKnowledgeGraph.findSimilar(node.nodeId, { minSimilarity: minSim, topK: 5 });
            for (const s of sims) {
              globalKnowledgeGraph.addEdge({
                edgeId: `e_sim_${node.nodeId}_${s.node.nodeId}`,
                fromNodeId: node.nodeId, toNodeId: s.node.nodeId, type: "similar_to",
                weight: s.similarity, properties: { similarity: s.similarity, inferred: true },
                firstObservedAt: new Date().toISOString(), lastObservedAt: new Date().toISOString(),
                observationCount: 1,
              });
              edgesAdded++;
            }
          } catch {}
        }
        return { nodesScanned: nodes.length, edgesAdded };
      },
      semantic_memory_build: async (t) => {
        const limit = (t.payload.limit as number) ?? 500;
        const result = await globalSemanticMemoryBuilder.buildAll(limit);
        return { built: result.built, skipped: result.skipped, stats: globalSemanticMemoryBuilder.stats() };
      },
      knowledge_compression: async (t) => {
        const result = await globalKnowledgeCompressor.compress({
          similarityThreshold: (t.payload.similarityThreshold as number) ?? 0.9,
          edgeWeightThreshold: (t.payload.edgeWeightThreshold as number) ?? 0.1,
        });
        return { result, stats: globalKnowledgeCompressor.getStats() };
      },
    };
    const handler = handlers[task.type];
    if (!handler) return { note: `Unknown task type: ${task.type}` };
    return await handler(task);
  }

  // ── internals ──────────────────────────────────────────────────────────

  /** Insert a task into the priority queue (binary-search + splice). */
  private insertTask(task: LearningTask): void {
    try {
      let lo = 0, hi = this.queue.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (taskCompare(task, this.queue[mid]) < 0) hi = mid;
        else lo = mid + 1;
      }
      this.queue.splice(lo, 0, task);
    } catch { this.queue.push(task); }
  }

  /** Pop the highest-priority task whose scheduledFor has passed. */
  private popDue(): LearningTask | null {
    try {
      const now = new Date().toISOString();
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        if (task.scheduledFor > now) { this.queue.unshift(task); return null; }
        if (task.status === "queued") return task;
      }
      return null;
    } catch { return null; }
  }

  /** Schedule a small batch of routine background tasks when the queue is empty. */
  private async scheduleRoutineTasks(): Promise<void> {
    try {
      await this.scheduleTask("freshness_check", 0.4, 0, {});
      await this.scheduleTask("world_state_refresh", 0.45, 0, {});
      await this.scheduleTask("gap_detection", 0.5, 0, {});
      await this.scheduleTask("event_processing", 0.3, 0, {});
    } catch {}
  }

  /** Bounded LRU eviction of oldest completed/failed tasks. */
  private evictIfNeeded(): void {
    try {
      if (this.tasks.size <= MAX_TASKS) return;
      let oldest: LearningTask | null = null;
      for (const t of this.tasks.values()) {
        if (t.status !== "completed" && t.status !== "failed") continue;
        if (!oldest || (t.completedAt ?? "") < (oldest.completedAt ?? "")) oldest = t;
      }
      if (oldest) this.tasks.delete(oldest.taskId);
    } catch {}
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalLearningOrchestrator = new LearningOrchestrator();
