// @ts-nocheck
/**
 * GET  /api/aca/cases       — list cases (filtered by agent's assignments)
 * POST /api/aca/cases       — create a case from a signal (or from intake)
 * ============================================================================
 * Case-based access control: an agent sees only cases assigned to them (or,
 * with department-scope permission, cases in their department).
 *
 * POST creates a formal ACA case. When `fromSignalId` is provided, the case
 * is recorded as having been converted from that signal — but the signal→case
 * conversion is owned by /api/aca/signals/[id]/convert.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { validateAcaSession } from "@/lib/aca-agent-store";
import {
  createCase, listCasesForAgent, listAllCases, persistCase,
  type AcaCasePriority,
} from "@/lib/aca-case-manager";

export const dynamic = "force-dynamic";

function getSessionId(req: Request): string | null {
  const h = req.headers.get("x-aca-session-id");
  if (h) return h.trim();
  const url = new URL(req.url);
  const q = url.searchParams.get("sessionId");
  return q ? q.trim() : null;
}

export async function GET(req: Request) {
  const sessionId = getSessionId(req);
  const { agent } = sessionId ? validateAcaSession(sessionId) : { agent: null };
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const departmentScope = url.searchParams.get("departmentScope") === "true";

  let cases: any[];
  if (agent) {
    cases = listCasesForAgent(agent.agentId, {
      department: agent.department,
      departmentScope,
    });
  } else {
    // DEV MODE — no session: return all cases.
    cases = listAllCases();
  }
  if (status) cases = cases.filter((c) => c.status === status);

  return NextResponse.json({
    devMode: true,
    authorized: Boolean(agent),
    total: cases.length,
    cases: cases.map((c) => ({
      caseId: c.caseId,
      caseNumber: c.caseNumber,
      title: c.title,
      status: c.status,
      priority: c.priority,
      assignedAgent: c.assignedAgent,
      assignedAgentName: c.assignedAgentName,
      department: c.department,
      service: c.service,
      geography: c.geography,
      evidenceCount: c.evidence.length,
      findingsCount: c.findings.length,
      recommendationsCount: c.recommendations.length,
      correctiveActionsCount: c.correctiveActions.length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      closedAt: c.closedAt,
      twoPersonPending: Boolean(c.twoPersonState && !c.twoPersonState.confirmedBy && !c.twoPersonState.deniedBy),
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const sessionId = getSessionId(req);
  const { agent } = sessionId ? validateAcaSession(sessionId) : { agent: null };

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.title || !body?.department) {
    return NextResponse.json(
      { error: "missing_required", details: "title and department are required." },
      { status: 400 },
    );
  }

  const creatorAgentId = agent?.agentId ?? body.creatorAgentId ?? "system:dev";
  const creatorDisplayName = agent?.displayName ?? body.creatorDisplayName ?? "DEV Agent";

  const c = createCase({
    title: body.title,
    description: body.description || "",
    priority: body.priority as AcaCasePriority | undefined,
    assignedAgent: body.assignedAgent,
    assignedAgentName: body.assignedAgentName,
    supportingAgents: body.supportingAgents,
    createdFromSignal: body.fromSignalId,
    department: body.department,
    service: body.service,
    geography: body.geography,
    creatorAgentId,
    creatorDisplayName,
  });

  await persistCase(c);

  return NextResponse.json({
    caseId: c.caseId,
    caseNumber: c.caseNumber,
    status: c.status,
    createdAt: c.createdAt,
    devMode: true,
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
