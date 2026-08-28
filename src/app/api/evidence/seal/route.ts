// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { sealEvidence } from "@/lib/evidence-immutability";
import { withRateLimit } from "@/lib/api-rate-limit";

/**
 * POST /api/evidence/seal
 *
 * Seal an evidence item — makes it immutable (no edit / overwrite / delete).
 * Body:
 *   { type, title, payloadRef, payloadBytes?, mime?, deviceIdentity,
 *     captureTimestamp, location?, agentId, assignmentId?, sealedBy?, metadata? }
 */
async function sealEvidenceHandler(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.payloadRef || !body.deviceIdentity || !body.captureTimestamp || !body.agentId) {
      return NextResponse.json(
        { error: "Missing required fields: payloadRef, deviceIdentity, captureTimestamp, agentId" },
        { status: 400 },
      );
    }
    const sealed = await sealEvidence({
      type: body.type ?? "other",
      title: body.title ?? "Untitled evidence",
      payloadRef: body.payloadRef,
      payloadBytes: body.payloadBytes,
      mime: body.mime,
      deviceIdentity: body.deviceIdentity,
      captureTimestamp: body.captureTimestamp,
      location: body.location,
      agentId: body.agentId,
      assignmentId: body.assignmentId,
      sealedBy: body.sealedBy,
      metadata: body.metadata,
    });
    return NextResponse.json({ evidence: sealed, sealed: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// P1 FIX: Rate-limited to prevent abuse (evidence sealing — 10 req/min)
export const POST = withRateLimit(sealEvidenceHandler, {
  maxRequests: 10,
  windowMs: 60_000,
  keyBy: "ip",
});
