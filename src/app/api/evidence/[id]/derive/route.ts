// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createDerivedCopy } from "@/lib/evidence-immutability";

/**
 * POST /api/evidence/[id]/derive
 *
 * Create a derived copy (redaction / transcription / translation /
 * enhancement) linked to the immutable original. NEVER alters the original.
 *
 * Body:
 *   { derivationKind, title, payloadRef, payloadBytes?, mime?, derivedBy,
 *     notes?, redactionPolicy?, targetLanguage? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!body || !body.derivationKind || !body.payloadRef || !body.derivedBy) {
      return NextResponse.json(
        { error: "Missing required fields: derivationKind, payloadRef, derivedBy" },
        { status: 400 },
      );
    }
    const validKinds = ["redaction", "transcription", "translation", "enhancement"];
    if (!validKinds.includes(body.derivationKind)) {
      return NextResponse.json(
        { error: `Invalid derivationKind. Must be one of: ${validKinds.join(", ")}` },
        { status: 400 },
      );
    }
    const derived = await createDerivedCopy({
      evidenceId: id,
      derivationKind: body.derivationKind,
      title: body.title ?? `Derived copy of ${id}`,
      payloadRef: body.payloadRef,
      payloadBytes: body.payloadBytes,
      mime: body.mime,
      derivedBy: body.derivedBy,
      notes: body.notes,
      redactionPolicy: body.redactionPolicy,
      targetLanguage: body.targetLanguage,
    });
    return NextResponse.json({ evidence: derived, derived: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    const status = msg.includes("not found") ? 404 : msg.includes("must be sealed") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
