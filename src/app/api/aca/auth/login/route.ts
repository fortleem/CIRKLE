// @ts-nocheck
/**
 * POST /api/aca/auth/login
 * ============================================================================
 * ACA institutional login — SEPARATE from Circle auth.
 *
 * Body: { agentId, credentials, mfaCode }
 *   - agentId          — ACA-issued agent identifier (NOT a Circle user id)
 *   - credentials      — passphrase or hardware-bound challenge response
 *                        (mock-passphrase in the building phase)
 *   - mfaCode          — 6-digit TOTP-style code (MOCK — see aca-agent-store)
 *
 * Returns: { sessionId, agent, expiresAt }
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAca` clearance on the session (in addition to the existing mock
 * MFA check). Returns 401 / 403 otherwise. The caller must be a Circle user
 * with `isAca` clearance BEFORE they can perform ACA login.
 *
 * BUILDING PHASE — NO REAL AUTH (mock MFA):
 *   - A prominent amber "DEV MODE — NO AUTH" banner is shown by the ACA login
 *     overlay. Credentials are NOT verified against a real identity provider.
 *   - The mock MFA accepts any 6-digit numeric code.
 *   - Production MUST replace this with PKI / hardware-key challenge-response
 *     per CIRKLE-ACA-BLUEPRINT Chapter 5 (Zero-Trust ACA Architecture).
 *
 * This endpoint is sovereign to the ACA layer — it does NOT touch the public
 * Circle auth surface. A Circle citizen account has no path to ACA login
 * (the `isAca` clearance flag must be granted out-of-band).
 * ============================================================================
 */
import { NextResponse } from "next/server";
import {
  acaAgentStore, startSession, auditFingerprint, verifyMfaMock,
  type AcaRole, type AcaClearance,
} from "@/lib/aca-agent-store";
import { getSessionFromRequest } from "@/lib/server-auth";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

interface LoginBody {
  agentId?: string;
  credentials?: string;
  mfaCode?: string;
  institutionalIdentity?: string;
  displayName?: string;
  role?: AcaRole;
  department?: string;
  unit?: string;
  clearance?: AcaClearance;
}

async function loginHandler(req: Request) {
  // ── P0 FIX: auth-gate (Circle session + isAca clearance) ───────────────────
  // A Circle citizen must be authenticated AND flagged `isAca` before they
  // can do the ACA-specific MFA login.
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAca) {
    return NextResponse.json({ error: "forbidden", details: "ACA clearance required" }, { status: 403 });
  }

  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", details: "Body must be valid JSON." },
      { status: 400 },
    );
  }

  const agentId = body.agentId?.trim();
  const credentials = body.credentials ?? "";
  const mfaCode = body.mfaCode ?? "";

  if (!agentId) {
    return NextResponse.json(
      { error: "missing_agent_id" },
      { status: 400 },
    );
  }
  if (!credentials) {
    return NextResponse.json(
      { error: "missing_credentials" },
      { status: 400 },
    );
  }
  const mfa = verifyMfaMock(mfaCode);
  if (!mfa.ok) {
    return NextResponse.json(
      { error: `mfa_${mfa.reason ?? "rejected"}` },
      { status: 401 },
    );
  }

  // DEV MODE — auto-provision the agent if it doesn't exist (NO REAL AUTH).
  // Production MUST look up the agent in the institutional identity store and
  // verify the credential against a hardware-bound challenge.
  let agent = acaAgentStore.getAgentProfile(agentId);
  if (!agent) {
    agent = acaAgentStore.createAcaAgent({
      institutionalIdentity: body.institutionalIdentity || agentId,
      displayName: body.displayName || agentId,
      role: body.role || "investigator",
      department: body.department || "Field Investigation",
      unit: body.unit,
      clearance: body.clearance || "L3",
      createdBy: "system:dev-auto-provision",
    });
  }

  const { ipHash, userAgentHash } = auditFingerprint(req);
  const result = startSession({
    agentId,
    mfaCode,
    ipHash,
    userAgentHash,
  });

  if (!result.session || result.error) {
    return NextResponse.json(
      { error: result.error ?? "session_failed" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    sessionId: result.session.sessionId,
    agent: {
      agentId: agent.agentId,
      institutionalIdentity: agent.institutionalIdentity,
      displayName: agent.displayName,
      role: agent.role,
      department: agent.department,
      unit: agent.unit,
      clearance: agent.clearance,
      permissions: agent.permissions,
      sessionStatus: agent.sessionStatus,
    },
    expiresAt: result.session.expiresAt,
    devMode: true,
    notice: "DEV MODE — NO AUTH. MFA is a mock. Production must use PKI / hardware keys.",
  }, { headers: { "Cache-Control": "no-store" } });
}

// P1 FIX: Rate-limited to prevent abuse (brute-force protection on login — 5 req/min)
export const POST = withRateLimit(loginHandler, {
  maxRequests: 5,
  windowMs: 60_000,
  keyBy: "ip",
});
