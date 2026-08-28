// @ts-nocheck
/**
 * POST /api/aca/evidence/[id]/seal
 * ============================================================================
 * Seals evidence — makes it IMMUTABLE.
 *
 * After sealing:
 *   - The payload, hash, capture metadata, and device identity CANNOT be
 *     modified by ANYONE — including the system administrator.
 *   - The only mutation permitted is APPENDING to the chain of custody
 *     (viewed, exported [with two-person authorization], derived-copied).
 *   - Deleting sealed evidence is REJECTED unconditionally.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAca` clearance on the session (in addition to the existing
 * `x-aca-session-id` ACA-session check). Returns 401 / 403 otherwise.
 *
 * Body: { sealedByName?, sealedBy? }
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { validateAcaSession } from "@/lib/aca-agent-store";
import {
  sealEvidence, getEvidence, persistEvidence, canModifyEvidence,
} from "@/lib/aca-evidence-manager";
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

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const existing = getEvidence(id);
  if (!existing) {
    return NextResponse.json({ error: "evidence_not_found" }, { status: 404 });
  }

  // Defence-in-depth: if the evidence is already sealed, this is idempotent.
  if (existing.sealed) {
    return NextResponse.json({
      evidenceId: existing.evidenceId,
      sealed: true,
      sealedAt: existing.sealedAt,
      sealedBy: existing.sealedBy,
      notice: "Evidence was already sealed — no change made.",
      devMode: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  // Final immutability guard — sanity check.
  if (!canModifyEvidence(id)) {
    return NextResponse.json(
      { error: "evidence_immutable", details: "Cannot seal: guard check failed." },
      { status: 409 },
    );
  }

  const sealedBy = agent?.agentId ?? body.sealedBy ?? "system:dev";
  const sealedByName = agent?.displayName ?? body.sealedByName ?? "DEV Agent";

  const updated = sealEvidence({
    evidenceId: id,
    sealedBy,
    sealedByName,
  });

  if (!updated) {
    return NextResponse.json({ error: "seal_failed" }, { status: 500 });
  }

  await persistEvidence(updated);

  return NextResponse.json({
    evidenceId: updated.evidenceId,
    sealed: updated.sealed,
    sealedAt: updated.sealedAt,
    sealedBy: updated.sealedBy,
    sealedByName: updated.sealedByName,
    sealingAnchor: updated.sealingAnchor,
    integrityHash: updated.integrityHash,
    hashAlgorithm: updated.hashAlgorithm,
    chainOfCustodyLength: updated.chainOfCustody.length,
    notice: "Evidence is now SEALED and IMMUTABLE. No edit/overwrite/delete is permitted.",
    devMode: true,
  }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
