// @ts-nocheck
/**
 * POST /api/aca/signals/[id]/convert
 * ============================================================================
 * HUMAN DECISION — converts a reviewed signal into a formal ACA case.
 *
 * The AI evaluation (signalProcessor.evaluateSignal) recommends; this endpoint
 * is what actually opens the case. The decision is recorded on both the
 * signal (status → converted_to_case) and the new case (createdFromSignal set).
 *
 * CRITICAL: This endpoint is sovereign to ACA agents. The AI never calls it.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAca` clearance on the session (in addition to the existing
 * `x-aca-session-id` ACA-session check). Returns 401 / 403 otherwise.
 *
 * Body:
 *   { caseTitle, caseDescription, casePriority?, department?, service?,
 *     geography?, assignedAgentId?, assignedAgentName?, rationale? }
 *
 * Returns: { signalId, caseId, caseNumber, status }
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { validateAcaSession } from "@/lib/aca-agent-store";
import {
  getSignal, evaluateSignal, markSignalConverted, persistSignal,
} from "@/lib/aca-signal-processor";
import {
  createCase, persistCase, type AcaCasePriority,
} from "@/lib/aca-case-manager";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function getSessionId(req: Request): string | null {
  const h = req.headers.get("x-aca-session-id");
  if (h) return h.trim();
  const url = new URL(req.url);
  return url.searchParams.get("sessionId");
}

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  // ── P0 FIX: auth-gate (Circle session + isAca clearance) ───────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAca) {
    return NextResponse.json({ error: "forbidden", details: "ACA clearance required" }, { status: 403 });
  }

  const sessionId = getSessionId(req);
  const { agent } = sessionId ? validateAcaSession(sessionId) : { agent: null };

  const s = getSignal(id);
  if (!s) {
    return NextResponse.json({ error: "signal_not_found" }, { status: 404 });
  }
  if (s.status === "dismissed") {
    return NextResponse.json(
      { error: "signal_dismissed", details: "Cannot convert a dismissed signal." },
      { status: 409 },
    );
  }
  if (s.status === "converted_to_case") {
    return NextResponse.json({
      signalId: s.signalId,
      caseId: s.convertedToCaseId,
      notice: "Signal has already been converted.",
      devMode: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  // If the signal has not been evaluated yet, run the evaluation now.
  if (s.status === "pending") {
    evaluateSignal({
      signalId: id,
      evaluatedBy: agent?.agentId ?? "system:dev",
      evaluatedByName: agent?.displayName ?? "DEV Agent",
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const decidedBy = agent?.agentId ?? body.decidedBy ?? "system:dev";
  const decidedByName = agent?.displayName ?? body.decidedByName ?? "DEV Agent";

  const caseTitle = body.caseTitle ?? `Case from signal ${s.signalNumber}`;
  const caseDescription = body.caseDescription ??
    `Converted from signal ${s.signalNumber}. Source: ${s.source}. Pattern: ${s.pattern}. Referral reason: ${s.reasonForReferral.referralReason}`;

  // Create the formal case
  const c = createCase({
    title: caseTitle,
    description: caseDescription,
    priority: (body.casePriority ?? s.evaluation?.suggestedPriority ?? "medium") as AcaCasePriority,
    assignedAgent: body.assignedAgentId,
    assignedAgentName: body.assignedAgentName,
    supportingAgents: body.supportingAgents,
    createdFromSignal: s.signalId,
    department: body.department ?? s.evaluation?.suggestedDepartment ?? "Field Investigation",
    service: body.service ?? s.service,
    geography: body.geography ?? s.geography,
    creatorAgentId: decidedBy,
    creatorDisplayName: decidedByName,
  });

  await persistCase(c);

  // Mark the signal as converted
  markSignalConverted({
    signalId: s.signalId,
    caseId: c.caseId,
    convertedBy: decidedBy,
    convertedByName: decidedByName,
  });
  await persistSignal(s);

  return NextResponse.json({
    signalId: s.signalId,
    signalNumber: s.signalNumber,
    caseId: c.caseId,
    caseNumber: c.caseNumber,
    caseStatus: c.status,
    convertedBy: decidedBy,
    convertedByName: decidedByName,
    rationale: body.rationale ?? s.evaluation?.rationale ?? "No rationale provided.",
    notice: "Signal converted to formal ACA case. The case is now in the investigation pipeline.",
    devMode: true,
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
