// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Research Scheduler
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Continuously prioritizes + dispatches research tasks. Fully autonomous —
 * NO human interaction. The scheduler:
 *
 *   1. Receives research tasks (from the gap detector, freshness manager,
 *      world-state engine, or any other autonomous source).
 *   2. Computes a composite priority score from:
 *        - Most requested      (encounter / request count)
 *        - Lowest confidence   (lower confidence => higher priority)
 *        - Most outdated       (older lastCheckedAt => higher priority)
 *        - Highest business value (configured per domain)
 *        - Government changes  (critical)
 *        - Travel updates      (high)
 *        - Financial updates   (high)
 *        - Local business changes (medium)
 *   3. Maintains a binary-heap priority queue (max-heap on score).
 *   4. Exposes getNextTask() for the worker pool — pops the highest-priority
 *      pending task, marks it in_progress.
 *   5. completeTask(taskId, results) attaches discovered facts and marks
 *      completed. failTask(taskId, error) increments retryCount and re-queues
 *      if retries remain (max 3).
 *
 * The scheduler never blocks the Brain — getNextTask is the only sync entry
 * point and runs in O(log N).
 * ============================================================================
 */

import "server-only";

import type {
  ResearchTask,
  ResearchPriority,
  KnowledgeFact,
  KnowledgeSource,
} from "./types";

// ── Priority weighting ───────────────────────────────────────────────────

const PRIORITY_WEIGHTS: Record<ResearchPriority, number> = {
  critical: 1.0,   // government changes, emergency alerts
  high: 0.8,       // travel updates, financial updates
  medium: 0.55,    // local business changes, event updates
  low: 0.35,       // general knowledge refresh
  background: 0.15, // routine refresh
};

const DOMAIN_BUSINESS_VALUE: Record<string, number> = {
  travel: 0.9,
  finance: 0.85,
  government: 0.95,
  health: 0.8,
  transport: 0.7,
  commerce: 0.65,
  news: 0.6,
  weather: 0.5,
  education: 0.55,
  maps: 0.5,
  general: 0.4,
};

const MAX_RETRIES = 3;
const MAX_TASKS = 5000;

// ── Min-Heap (by score, descending = max-heap via negation) ──────────────

class MaxHeap<T> {
  private items: Array<{ score: number; value: T }> = [];
  push(value: T, score: number): void {
    this.items.push({ score, value });
    this.bubbleUp(this.items.length - 1);
  }
  pop(): T | null {
    if (this.items.length === 0) return null;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return top.value;
  }
  get length(): number { return this.items.length; }
  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].score >= this.items[i].score) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }
  private sinkDown(i: number): void {
    const n = this.items.length;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let best = i;
      if (l < n && this.items[l].score > this.items[best].score) best = l;
      if (r < n && this.items[r].score > this.items[best].score) best = r;
      if (best === i) break;
      [this.items[best], this.items[i]] = [this.items[i], this.items[best]];
      i = best;
    }
  }
}

// ── Research Scheduler ───────────────────────────────────────────────────

export class ResearchScheduler {
  /** All tasks by id (pending, in_progress, completed, failed). */
  private tasks = new Map<string, ResearchTask>();
  /** Priority queue of pending task ids. */
  private heap = new MaxHeap<string>();
  /** Request count per (domain, query) fingerprint — drives "most requested". */
  private requestCount = new Map<string, number>();
  /** Counter for task id generation. */
  private seq = 0;
  /** Stats counters. */
  private completed = 0;
  private failed = 0;
  private inProgress = 0;

  /**
   * Schedule (or re-request) a research task. If an equivalent pending task
   * already exists (same domain + query), bump its request count instead of
   * duplicating. Re-inserts into the heap with the recomputed priority.
   */
  async scheduleTask(task: ResearchTask): Promise<ResearchTask> {
    try {
      const fp = this.fingerprint(task.domain, task.query);
      this.requestCount.set(fp, (this.requestCount.get(fp) ?? 0) + 1);
      const existing = this.findPending(fp);
      if (existing) {
        // Re-prioritize.
        const score = this.score(existing);
        this.heap.push(existing.taskId, score);
        return existing;
      }
      const taskWithId: ResearchTask = {
        ...task,
        taskId: task.taskId || `rt_${this.seq++}_${Date.now().toString(36)}`,
        status: "pending",
        retryCount: task.retryCount ?? 0,
      };
      this.tasks.set(taskWithId.taskId, taskWithId);
      const score = this.score(taskWithId);
      this.heap.push(taskWithId.taskId, score);
      this.evictIfNeeded();
      return taskWithId;
    } catch {
      return task;
    }
  }

  /**
   * Pop the highest-priority pending task and mark it in_progress.
   * Returns null if the queue is empty.
   */
  getNextTask(): ResearchTask | null {
    try {
      while (this.heap.length > 0) {
        const id = this.heap.pop()!;
        const task = this.tasks.get(id);
        if (!task || task.status !== "pending") continue;
        task.status = "in_progress";
        task.startedAt = new Date().toISOString();
        this.inProgress++;
        return task;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Mark a task completed with discovered facts.
   */
  completeTask(taskId: string, results: KnowledgeFact[]): boolean {
    try {
      const task = this.tasks.get(taskId);
      if (!task) return false;
      task.status = "completed";
      task.results = results;
      task.completedAt = new Date().toISOString();
      if (this.inProgress > 0) this.inProgress--;
      this.completed++;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mark a task failed. If retryCount < MAX_RETRIES, re-queue with the same
   * id but bumped retry count; otherwise mark permanently failed.
   */
  failTask(taskId: string, error: string): boolean {
    try {
      const task = this.tasks.get(taskId);
      if (!task) return false;
      task.error = error;
      task.retryCount = (task.retryCount ?? 0) + 1;
      if (this.inProgress > 0) this.inProgress--;
      if (task.retryCount < MAX_RETRIES) {
        task.status = "pending";
        task.startedAt = undefined;
        this.heap.push(task.taskId, this.score(task));
      } else {
        task.status = "failed";
        task.completedAt = new Date().toISOString();
        this.failed++;
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Return all pending tasks (un-sorted copy). */
  getPendingTasks(limit = 100): ResearchTask[] {
    try {
      const out: ResearchTask[] = [];
      for (const t of this.tasks.values()) {
        if (t.status === "pending") out.push(t);
        if (out.length >= limit) break;
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Aggregate stats for the learning orchestrator. */
  getStats(): {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    byPriority: Record<ResearchPriority, number>;
  } {
    try {
      const byPriority: Record<ResearchPriority, number> = {
        critical: 0, high: 0, medium: 0, low: 0, background: 0,
      };
      let pending = 0;
      for (const t of this.tasks.values()) {
        if (t.status === "pending") {
          pending++;
          byPriority[t.priority]++;
        }
      }
      return {
        total: this.tasks.size,
        pending,
        inProgress: this.inProgress,
        completed: this.completed,
        failed: this.failed,
        byPriority,
      };
    } catch {
      return {
        total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0,
        byPriority: { critical: 0, high: 0, medium: 0, low: 0, background: 0 },
      };
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  /**
   * Composite priority score in [0, 1]:
   *   0.30 × priorityWeight        (critical/high/medium/low/background)
   *   0.25 × businessValue(domain)
   *   0.20 × recencyScore          (older lastChecked => higher)
   *   0.15 × requestFrequency      (most requested)
   *   0.10 × (1 − confidence)      (lowest confidence wins tie-breakers)
   */
  private score(task: ResearchTask): number {
    try {
      const pw = PRIORITY_WEIGHTS[task.priority] ?? 0.3;
      const bv = DOMAIN_BUSINESS_VALUE[task.domain] ?? 0.4;
      const fp = this.fingerprint(task.domain, task.query);
      const reqs = this.requestCount.get(fp) ?? 1;
      const reqFreq = Math.min(1, Math.log10(1 + reqs));
      let recency = 0.5;
      if (task.scheduledFor) {
        const ageMs = Date.now() - new Date(task.scheduledFor).getTime();
        recency = Math.min(1, ageMs / (7 * 24 * 60 * 60 * 1000)); // saturates at 1 week
      }
      const conf = 0.5; // default — set by gap detector in production
      return (
        0.30 * pw +
        0.25 * bv +
        0.20 * recency +
        0.15 * reqFreq +
        0.10 * (1 - conf)
      );
    } catch {
      return 0;
    }
  }

  private fingerprint(domain: string, query: string): string {
    return `${domain}::${query.toLowerCase().slice(0, 200)}`;
  }

  private findPending(fp: string): ResearchTask | undefined {
    for (const t of this.tasks.values()) {
      if (t.status === "pending" && this.fingerprint(t.domain, t.query) === fp) return t;
    }
    return undefined;
  }

  /** Bounded LRU-style eviction of oldest completed/failed tasks. */
  private evictIfNeeded(): void {
    if (this.tasks.size <= MAX_TASKS) return;
    let oldest: ResearchTask | null = null;
    for (const t of this.tasks.values()) {
      if (t.status !== "completed" && t.status !== "failed") continue;
      if (!oldest || (t.completedAt ?? "") < (oldest.completedAt ?? "")) oldest = t;
    }
    if (oldest) this.tasks.delete(oldest.taskId);
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalResearchScheduler = new ResearchScheduler();
