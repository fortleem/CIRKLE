// @ts-nocheck
/**
 * GET  /api/aca/evidence      — list evidence for a case
 * POST /api/aca/evidence      — submit new evidence (unsealed)
 * ============================================================================
 * Submits a new piece of evidence to the ACA evidence vault. Newly submitted
 * evidence is UNSEALED — it can be edited/derived-from but NOT yet exported
 * or used to support a finding. Sealing is a separate, deliberate action
 * (POST /api/aca/evidence/[id]/seal) that makes the evidence immutable.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAca` clearance on the session (in addition to the existing
 * `x-aca-session-id` ACA-session check). Returns 401 / 403 otherwise.
 *
 * Body (POST):
 *   { caseId, label, type, captureMethod, capturedBy, capturedByName,
 *     capturedAt?, location?, deviceIdentity, payloadRef, payloadSizeBytes,
 *     mimeType, payload?, integrityHashOverride?, metadata? }
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { validateAcaSession } from "@/lib/aca-agent-store";
import { submitEvidence, listEvidenceForCase, persistEvidence } from "@/lib/aca-evidence-manager";
import { addEvidence } from "@/lib/aca-case-manager";
import { getSessionFromRequest } from "@/lib/server-auth";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

function getSessionId(req: Request): string | null {
  const h = req.headers.get("x-aca-session-id");
  if (h) return h.trim();
  const url = new URL(req.url);
  return url.searchParams.get("sessionId");
}

async function getEvidenceHandler(req: Request) {
  // ── P0 FIX: auth-gate (Circle session + isAca clearance) ───────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAca) {
    return NextResponse.json({ error: "forbidden", details: "ACA clearance required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");
  if (!caseId) {
    return NextResponse.json({ error: "missing_caseId" }, { status: 400 });
  }
  const evidence = listEvidenceForCase(caseId);
  return NextResponse.json({
    caseId,
    total: evidence.length,
    sealedCount: evidence.filter((e) => e.sealed).length,
    unsealedCount: evidence.filter((e) => !e.sealed).length,
    evidence: evidence.map((e) => ({
      evidenceId: e.evidenceId,
      caseId: e.caseId,
      label: e.label,
      type: e.type,
      captureMethod: e.captureMethod,
      capturedBy: e.capturedBy,
      capturedByName: e.capturedByName,
      capturedAt: e.capturedAt,
      uploadedAt: e.uploadedAt,
      location: e.location,
      deviceIdentity: e.deviceIdentity,
      payloadRef: e.payloadRef,
      payloadSizeBytes: e.payloadSizeBytes,
      mimeType: e.mimeType,
      integrityHash: e.integrityHash,
      hashAlgorithm: e.hashAlgorithm,
      sealed: e.sealed,
      sealedAt: e.sealedAt,
      sealedBy: e.sealedBy,
      sealedByName: e.sealedByName,
      sealingAnchor: e.sealingAnchor,
      derivedCopiesCount: e.derivedCopies.length,
      chainOfCustodyLength: e.chainOfCustody.length,
    })),
    devMode: true,
  }, { headers: { "Cache-Control": "no-store" } });
}

async function postEvidenceHandler(req: Request) {
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const required = ["caseId", "label", "type", "captureMethod", "deviceIdentity", "payloadRef", "mimeType"];
  for (const f of required) {
    if (body?.[f] === undefined || body?.[f] === null || body?.[f] === "") {
      return NextResponse.json({ error: `missing_${f}` }, { status: 400 });
    }
  }

  const capturedBy = body.capturedBy ?? agent?.agentId ?? "system:dev";
  const capturedByName = body.capturedByName ?? agent?.displayName ?? "DEV Agent";

  const ev = await submitEvidence({
    caseId: body.caseId,
    assignmentId: body.assignmentId,
    label: body.label,
    type: body.type,
    captureMethod: body.captureMethod,
    capturedBy,
    capturedByName,
    capturedAt: body.capturedAt,
    location: body.location,
    deviceIdentity: body.deviceIdentity,
    payloadRef: body.payloadRef,
    payloadSizeBytes: body.payloadSizeBytes ?? 0,
    mimeType: body.mimeType,
    payload: body.payload,
    integrityHashOverride: body.integrityHashOverride,
    metadata: body.metadata,
  });

  await persistEvidence(ev);

  // link evidence to the case timeline
  addEvidence({
    caseId: body.caseId,
    evidenceId: ev.evidenceId,
    label: ev.label,
    type: ev.type,
    sealed: false,
    actorAgentId: capturedBy,
    actorDisplayName: capturedByName,
  });

  return NextResponse.json({
    evidenceId: ev.evidenceId,
    caseId: ev.caseId,
    integrityHash: ev.integrityHash,
    hashAlgorithm: ev.hashAlgorithm,
    sealed: ev.sealed,
    chainOfCustodyLength: ev.chainOfCustody.length,
    devMode: true,
    notice: "Evidence submitted UNSEALED. Use POST /api/aca/evidence/[id]/seal to make it immutable.",
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

// P1 FIX: Rate-limited to prevent abuse (evidence list — 20 req/min)
export const GET = withRateLimit(getEvidenceHandler, {
  maxRequests: 20,
  windowMs: 60_000,
  keyBy: "ip",
});

// P1 FIX: Rate-limited to prevent abuse (evidence submission — 20 req/min)
export const POST = withRateLimit(postEvidenceHandler, {
  maxRequests: 20,
  windowMs: 60_000,
  keyBy: "ip",
});
