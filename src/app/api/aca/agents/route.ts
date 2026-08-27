// @ts-nocheck
/**
 * GET /api/aca/agents       — list agents (admin / director only)
 * POST /api/aca/agents      — provision a new agent
 * ============================================================================
 * Per CIRKLE-ACA-BLUEPRINT §2, §3: ACA agents are provisioned BY ACA ONLY —
 * NOT created from regular Circle accounts. There is no public sign-up path.
 *
 * HEADERS:
 *   x-aca-session-id  — current agent's session id (for authorization)
 *
 * BUILDING PHASE — authorization is mock-permissive. A future iteration will
 * enforce the `agent.provision` permission via step-up re-authentication.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import {
  acaAgentStore, createAcaAgent, provisionAgent,
  validateAcaSession, type AcaRole, type AcaClearance,
} from "@/lib/aca-agent-store";

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
  const { agent: requester } = sessionId ? validateAcaSession(sessionId) : { agent: null };

  // BUILDING PHASE — return all agents even if no session, but flag dev mode.
  const agents = Object.values(acaAgentStore.agents);
  return NextResponse.json({
    devMode: true,
    authorized: Boolean(requester),
    total: agents.length,
    agents: agents.map((a) => ({
      agentId: a.agentId,
      institutionalIdentity: a.institutionalIdentity,
      displayName: a.displayName,
      role: a.role,
      department: a.department,
      unit: a.unit,
      clearance: a.clearance,
      sessionStatus: a.sessionStatus,
      permissions: a.permissions,
      assignmentsCount: a.assignments.length,
      devicesCount: a.devices.length,
      certificationsCount: a.certifications.length,
      createdAt: a.createdAt,
      revokedAt: a.revokedAt,
      revokedReason: a.revokedReason,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const sessionId = getSessionId(req);
  const { agent: requester } = sessionId ? validateAcaSession(sessionId) : { agent: null };

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const required = ["institutionalIdentity", "displayName", "role", "department", "clearance"];
  for (const f of required) {
    if (!body?.[f]) {
      return NextResponse.json({ error: `missing_${f}` }, { status: 400 });
    }
  }

  const createdBy = requester?.agentId ?? "system:dev";
  const agent = createAcaAgent({
    institutionalIdentity: body.institutionalIdentity,
    displayName: body.displayName,
    role: body.role as AcaRole,
    department: body.department,
    unit: body.unit,
    clearance: body.clearance as AcaClearance,
    createdBy,
    permissions: body.permissions,
    device: body.device,
  });

  if (body.device) {
    provisionAgent({
      agentId: agent.agentId,
      device: body.device,
      certification: body.certification,
      provisionedBy: createdBy,
    });
  }

  return NextResponse.json({
    agentId: agent.agentId,
    agent: {
      agentId: agent.agentId,
      institutionalIdentity: agent.institutionalIdentity,
      displayName: agent.displayName,
      role: agent.role,
      department: agent.department,
      unit: agent.unit,
      clearance: agent.clearance,
      permissions: agent.permissions,
    },
    devMode: true,
    notice: "DEV MODE — NO AUTH. Agent provisioned without identity proofing.",
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
