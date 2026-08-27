// @ts-nocheck
/**
 * GET    /api/aca/cases/[id]   — case detail (full timeline, evidence refs, findings, recommendations, corrective actions, audit trail)
 * PATCH  /api/aca/cases/[id]   — update status / assignment (one-person actions)
 * DELETE /api/aca/cases/[id]    — close case (REQUIRES TWO-PERSON AUTHORIZATION)
 * ============================================================================
 * Closing a case is the most sensitive lifecycle action and is gated behind
 * two-person authorization. The flow is:
 *
 *   1. Agent A initiates closure (initiateClosure) — recorded as pending.
 *   2. Agent B (different agent, with `case.close` permission) confirms
 *      (confirmClosure) — only then does the status flip to `closed`.
 *
 * The DELETE endpoint accepts both styles:
 *   - Body { action: "initiate", reason }          → records pending closure
 *   - Body { action: "confirm", confirmingAgentId, confirmingAgentName, reason }
 *                                                   → confirms & closes
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { validateAcaSession } from "@/lib/aca-agent-store";
import {
  getCase, updateCaseStatus, assignAgent, initiateClosure, confirmClosure,
  persistCase, type AcaCaseStatus,
} from "@/lib/aca-case-manager";
import { listEvidenceForCase } from "@/lib/aca-evidence-manager";
import { calculateCaseHealth, getNextBestAction, getOrCreateWorkspace } from "@/lib/aca-investigation-workspace";

export const dynamic = "force-dynamic";

function getSessionId(req: Request): string | null {
  const h = req.headers.get("x-aca-session-id");
  if (h) return h.trim();
  const url = new URL(req.url);
  return url.searchParams.get("sessionId");
}

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  const c = getCase(id);
  if (!c) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  const evidence = listEvidenceForCase(c.caseId);
  const ws = getOrCreateWorkspace(c.caseId);
  // recalculate case health on each detail fetch — cheap heuristic
  const health = calculateCaseHealth({ caseId: c.caseId, acase: c, evidence });
  const nba = getNextBestAction({
    caseId: c.caseId,
    acase: c,
    evidence,
    requestingAgentId: "system",
    requestingAgentName: "System",
  });
  return NextResponse.json({
    ...c,
    evidenceCount: c.evidence.length,
    caseHealth: health,
    caseReadiness: ws.caseReadiness,
    nextBestAction: nba,
    workspace: {
      hypothesesCount: ws.hypotheses.length,
      openHypotheses: ws.hypotheses.filter((h) => h.status === "open").length,
      contradictionsCount: ws.contradictions.length,
      openContradictions: ws.contradictions.filter((c2) => c2.status === "open").length,
      evidenceGapsCount: ws.evidenceGaps.length,
      openGaps: ws.evidenceGaps.filter((g) => g.status === "open").length,
      blockingGaps: ws.evidenceGaps.filter((g) => g.blocksFinding && g.status === "open").length,
      lastRecalculatedAt: ws.lastRecalculatedAt,
    },
    devMode: true,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  const sessionId = getSessionId(req);
  const { agent } = sessionId ? validateAcaSession(sessionId) : { agent: null };

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const actorAgentId = agent?.agentId ?? body.actorAgentId ?? "system:dev";
  const actorDisplayName = agent?.displayName ?? body.actorDisplayName ?? "DEV Agent";

  const c = getCase(id);
  if (!c) return NextResponse.json({ error: "case_not_found" }, { status: 404 });

  if (body.newStatus) {
    const updated = updateCaseStatus({
      caseId: id,
      newStatus: body.newStatus as AcaCaseStatus,
      actorAgentId,
      actorDisplayName,
      reason: body.reason,
    });
    if (!updated) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    await persistCase(updated);
    return NextResponse.json({
      caseId: updated.caseId,
      status: updated.status,
      twoPersonState: updated.twoPersonState ?? null,
      devMode: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  if (body.assignAgentId) {
    const updated = assignAgent({
      caseId: id,
      agentId: body.assignAgentId,
      agentName: body.assignAgentName ?? body.assignAgentId,
      role: body.assignRole || "support",
      actorAgentId,
      actorDisplayName,
    });
    if (!updated) {
      return NextResponse.json({ error: "assign_failed" }, { status: 500 });
    }
    await persistCase(updated);
    return NextResponse.json({
      caseId: updated.caseId,
      assignedAgent: updated.assignedAgent,
      assignedAgentName: updated.assignedAgentName,
      supportingAgents: updated.supportingAgents,
      devMode: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ error: "no_action_specified" }, { status: 400 });
}

export async function DELETE(req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  const sessionId = getSessionId(req);
  const { agent } = sessionId ? validateAcaSession(sessionId) : { agent: null };

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const actorAgentId = agent?.agentId ?? body.actorAgentId ?? "system:dev";
  const actorDisplayName = agent?.displayName ?? body.actorDisplayName ?? "DEV Agent";

  const action = body.action || "initiate";
  const reason = body.reason || "No reason provided.";

  if (action === "initiate") {
    const updated = initiateClosure({
      caseId: id,
      reason,
      actorAgentId,
      actorDisplayName,
    });
    if (!updated) {
      return NextResponse.json({ error: "case_not_found" }, { status: 404 });
    }
    await persistCase(updated);
    return NextResponse.json({
      caseId: updated.caseId,
      status: updated.status,
      twoPersonState: updated.twoPersonState,
      notice: "Two-person authorization required. A different agent must confirm closure.",
      devMode: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  if (action === "confirm") {
    const confirmingAgentId = body.confirmingAgentId ?? actorAgentId;
    const confirmingAgentName = body.confirmingAgentName ?? actorDisplayName;
    if (confirmingAgentId === actorAgentId) {
      return NextResponse.json(
        { error: "self_confirmation_not_allowed", details: "The confirming agent must be different from the initiating agent." },
        { status: 403 },
      );
    }
    const updated = confirmClosure({
      caseId: id,
      confirmingAgentId,
      confirmingAgentName,
      reason,
    });
    if (!updated) {
      return NextResponse.json(
        { error: "closure_not_pending_or_not_found" },
        { status: 404 },
      );
    }
    await persistCase(updated);
    return NextResponse.json({
      caseId: updated.caseId,
      status: updated.status,
      closedAt: updated.closedAt,
      closedBy: updated.closedBy,
      closureReason: updated.closureReason,
      devMode: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  if (action === "deny") {
    const c = getCase(id);
    if (!c) return NextResponse.json({ error: "case_not_found" }, { status: 404 });
    if (c.twoPersonState) {
      c.twoPersonState.deniedBy = actorAgentId;
      c.twoPersonState.deniedAt = new Date().toISOString();
    }
    return NextResponse.json({
      caseId: c.caseId,
      status: c.status,
      twoPersonState: c.twoPersonState,
      devMode: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
