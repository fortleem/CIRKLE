/**
 * CIRKLE Brain AI — Unified Persistence Layer
 * ============================================================================
 *
 * Provides DB-backed persistence for all AI phases (LIEE, TGSE, TEE, CIE,
 * AHG) with automatic in-memory fallback for development.
 *
 * Each phase's in-memory store is mirrored to the database. On server restart,
 * the stores are rehydrated from the database.
 * ============================================================================
 */

import { db } from "@/lib/db";

// ── LIEE: Feedback Signals ───────────────────────────────────────────────

export async function persistFeedback(signal: {
  feedbackId: string;
  pipeline: string;
  sourcePhase: string;
  userId?: string;
  targetEntityId?: string;
  targetType: string;
  valence: string;
  normalizedScore: number;
  raw?: unknown;
  consentGranted: boolean;
}): Promise<void> {
  try {
    await db.aIFeedback.create({
      data: {
        feedbackId: signal.feedbackId,
        pipeline: signal.pipeline,
        sourcePhase: signal.sourcePhase,
        userId: signal.userId,
        targetEntityId: signal.targetEntityId,
        targetType: signal.targetType,
        valence: signal.valence,
        normalizedScore: signal.normalizedScore,
        raw: signal.raw as never,
        consentGranted: signal.consentGranted,
      },
    });
  } catch {
    // DB unavailable — in-memory store is the fallback.
  }
}

export async function loadFeedback(limit = 10000): Promise<unknown[]> {
  try {
    return await db.aIFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

// ── TGSE: Audit Records ──────────────────────────────────────────────────

export async function persistAuditRecord(record: {
  auditId: string;
  eventType: string;
  target: string;
  decision?: string;
  description: string;
  data?: unknown;
  hash: string;
  previousHash?: string;
}): Promise<void> {
  try {
    await db.auditRecord.create({
      data: {
        auditId: record.auditId,
        eventType: record.eventType,
        target: record.target,
        decision: record.decision,
        description: record.description,
        data: record.data as never,
        hash: record.hash,
        previousHash: record.previousHash,
      },
    });
  } catch {
    // DB unavailable — in-memory store is the fallback.
  }
}

// ── TGSE: Governance Decisions ───────────────────────────────────────────

export async function persistGovernanceDecision(decision: {
  decisionId: string;
  target: string;
  decision: string;
  policiesEvaluated?: unknown;
  permissionsChecked?: unknown;
  risksIdentified?: unknown;
  requiresHumanApproval: boolean;
  approvalRequestId?: string;
  explanation: { summary: string; policyReasons?: string[]; permissionReasons?: string[]; riskReasons?: string[]; approvalReasons?: string[] };
  confidence: number;
  actionContext?: unknown;
}): Promise<void> {
  try {
    await db.governanceDecision.create({
      data: {
        decisionId: decision.decisionId,
        target: decision.target,
        decision: decision.decision,
        policiesEvaluated: decision.policiesEvaluated as never,
        permissionsChecked: decision.permissionsChecked as never,
        risksIdentified: decision.risksIdentified as never,
        requiresHumanApproval: decision.requiresHumanApproval,
        approvalRequestId: decision.approvalRequestId,
        explanationSummary: decision.explanation.summary,
        explanationPolicy: decision.explanation.policyReasons as never,
        explanationPermission: decision.explanation.permissionReasons as never,
        explanationRisk: decision.explanation.riskReasons as never,
        explanationApproval: decision.explanation.approvalReasons as never,
        confidence: decision.confidence,
        actionContext: decision.actionContext as never,
      },
    });
  } catch {
    // DB unavailable — in-memory store is the fallback.
  }
}

// ── TEE: Execution Records ───────────────────────────────────────────────

export async function persistExecution(result: {
  executionId: string;
  planId: string;
  state: string;
  startedAt: string;
  completedAt?: string;
  totalDurationMs: number;
  steps?: unknown;
  telemetry?: unknown;
  outputs?: unknown;
  auditTrail?: unknown;
  dryRun: boolean;
  summary: string;
  errors?: unknown;
  userId?: string;
}): Promise<void> {
  try {
    await db.executionRecord.create({
      data: {
        executionId: result.executionId,
        planId: result.planId,
        state: result.state,
        startedAt: new Date(result.startedAt),
        completedAt: result.completedAt ? new Date(result.completedAt) : null,
        totalDurationMs: result.totalDurationMs,
        stepsJson: result.steps as never,
        telemetryJson: result.telemetry as never,
        outputsJson: result.outputs as never,
        auditTrailJson: result.auditTrail as never,
        dryRun: result.dryRun,
        summary: result.summary,
        errorsJson: result.errors as never,
        userId: result.userId,
      },
    });
  } catch {
    // DB unavailable — in-memory store is the fallback.
  }
}

// ── AHG: Account Problems ────────────────────────────────────────────────

export async function persistAccountProblem(problem: {
  problemId: string;
  type: string;
  severity: string;
  status: string;
  userId: string;
  description: string;
  rootCause?: unknown;
  proposedFixes?: unknown;
  consent?: unknown;
  executionResult?: unknown;
  resolvedAt?: string;
  metadata?: unknown;
  detectedAt: string;
}): Promise<void> {
  try {
    await db.accountProblem.create({
      data: {
        problemId: problem.problemId,
        type: problem.type,
        severity: problem.severity,
        status: problem.status,
        userId: problem.userId,
        description: problem.description,
        rootCauseJson: problem.rootCause as never,
        proposedFixesJson: problem.proposedFixes as never,
        consentJson: problem.consent as never,
        executionResultJson: problem.executionResult as never,
        resolvedAt: problem.resolvedAt ? new Date(problem.resolvedAt) : null,
        metadataJson: problem.metadata as never,
        detectedAt: new Date(problem.detectedAt),
      },
    });
  } catch {
    // DB unavailable — in-memory store is the fallback.
  }
}

// ── AI Response Cache (Upgrade 9) ────────────────────────────────────────

export async function getCachedResponse(cacheKey: string): Promise<unknown | null> {
  try {
    const cached = await db.aIResponseCache.findFirst({
      where: {
        cacheKey,
        expiresAt: { gt: new Date() },
      },
    });
    return cached?.response ?? null;
  } catch {
    return null;
  }
}

export async function setCachedResponse(params: {
  cacheKey: string;
  query: string;
  response: unknown;
  provider: string;
  confidence: number;
  ttlSeconds: number;
}): Promise<void> {
  try {
    await db.aIResponseCache.create({
      data: {
        cacheKey: params.cacheKey,
        query: params.query,
        response: params.response as never,
        provider: params.provider,
        confidence: params.confidence,
        expiresAt: new Date(Date.now() + params.ttlSeconds * 1000),
      },
    });
  } catch {
    // DB unavailable — caching is best-effort.
  }
}

export async function cleanExpiredCache(): Promise<number> {
  try {
    return await db.aIResponseCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    }).then((r) => r.count);
  } catch {
    return 0;
  }
}
