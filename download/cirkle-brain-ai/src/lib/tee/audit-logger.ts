/**
 * CIRKLE Brain AI — TEE Audit Logger
 * ============================================================================
 *
 * Phase 6 — Trusted Execution Engine — Observability
 *
 * Runtime auditing + telemetry + execution traces.
 *
 * Every execution event is recorded as an AuditEntry. The audit trail is:
 *   - Tamper-evident: entries are append-only and timestamped.
 *   - Complete: every state transition, step, retry, compensation, and
 *     permission event is logged.
 *   - Explainable: the audit trail IS the explanation of what happened at
 *     runtime.
 *
 * Telemetry aggregates the audit trail into performance metrics:
 *   - Total duration, per-step durations
 *   - Retry counts, compensation counts
 *   - Steps succeeded/failed/skipped
 *   - Peak parallelism
 *
 * Integrates with the existing Observability service (proxy.ts + dev.log).
 * ============================================================================
 */

import type { AuditEntry, AuditEventType, ExecutionTelemetry, RuntimeStep } from "./types";

// ── Audit Logger ─────────────────────────────────────────────────────────

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private executionId: string;

  constructor(executionId: string) {
    this.executionId = executionId;
  }

  /**
   * Record an audit entry.
   */
  log(eventType: AuditEventType, description: string, stepId?: string, data?: Record<string, unknown>): void {
    const entry: AuditEntry = {
      auditId: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType,
      executionId: this.executionId,
      stepId,
      description,
      data,
    };
    this.entries.push(entry);

    // Also log to the console for observability integration (proxy.ts/dev.log).
    const prefix = stepId ? `[TEE:${this.executionId}:${stepId}]` : `[TEE:${this.executionId}]`;
    console.log(`${prefix} ${eventType}: ${description}`);
  }

  /**
   * Get the full audit trail.
   */
  getTrail(): AuditEntry[] {
    return [...this.entries];
  }

  /**
   * Compute telemetry from the audit trail + runtime steps.
   */
  computeTelemetry(steps: RuntimeStep[], totalDurationMs: number): ExecutionTelemetry {
    const stepDurations: Record<string, number> = {};
    let totalRetries = 0;
    let totalCompensations = 0;
    let stepsSucceeded = 0;
    let stepsFailed = 0;
    let stepsSkipped = 0;

    for (const step of steps) {
      if (step.startedAt && step.completedAt) {
        stepDurations[step.stepId] = new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime();
      }
      if (step.attempt > 1) totalRetries += step.attempt - 1;
      if (step.state === "completed") stepsSucceeded++;
      else if (step.state === "failed" || step.state === "timed-out") stepsFailed++;
      else if (step.state === "cancelled") stepsSkipped++;
    }

    totalCompensations = this.entries.filter((e) => e.eventType === "compensation-triggered").length;

    // Peak parallelism: max number of steps running concurrently.
    const intervals: { start: number; end: number }[] = [];
    for (const step of steps) {
      if (step.startedAt && step.completedAt) {
        intervals.push({
          start: new Date(step.startedAt).getTime(),
          end: new Date(step.completedAt).getTime(),
        });
      }
    }
    const peakParallelism = this.computePeakParallelism(intervals);

    return {
      totalDurationMs,
      stepDurations,
      totalRetries,
      totalCompensations,
      stepsSucceeded,
      stepsFailed,
      stepsSkipped,
      peakParallelism,
    };
  }

  /**
   * Compute peak parallelism from step time intervals.
   */
  private computePeakParallelism(intervals: { start: number; end: number }[]): number {
    if (intervals.length === 0) return 0;
    const events: { time: number; delta: number }[] = [];
    for (const i of intervals) {
      events.push({ time: i.start, delta: 1 });
      events.push({ time: i.end, delta: -1 });
    }
    events.sort((a, b) => a.time - b.time || b.delta - a.delta);
    let current = 0;
    let peak = 0;
    for (const e of events) {
      current += e.delta;
      peak = Math.max(peak, current);
    }
    return peak;
  }
}

// ── Global factory ───────────────────────────────────────────────────────

export function createAuditLogger(executionId: string): AuditLogger {
  return new AuditLogger(executionId);
}
