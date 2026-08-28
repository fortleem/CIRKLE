// @ts-nocheck
/**
 * GET  /api/aca/signals       — list signals (filtered by status / source / pattern)
 * POST /api/aca/signals       — create a signal (from Citizen Shield or inter-agency)
 * ============================================================================
 * A SIGNAL is an intelligence object — NOT a case. Signals are produced by:
 *   - the Citizen Shield pipeline (a citizen report whose pattern suggests an
 *     administrative matter)
 *   - service-failure monitors
 *   - cross-case pattern detectors
 *   - systemic-pattern detectors (knowledge graph)
 *   - external inter-agency referrals (with consent boundary enforced)
 *
 * Creating a signal does NOT create a case. A case is opened only when a
 * human ACA agent converts a signal (POST /api/aca/signals/[id]/convert).
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAca` clearance on the session. Returns 401 / 403 otherwise.
 *
 * Body (POST):
 *   { source, pattern, sourceCount?, service?, geography?, timeframe:
 *     { from, to }, evidenceAvailability, repeatedFailures?,
 *     potentialIntegrityIndicators?, reasonForReferral }
 * ============================================================================
 */
import { NextResponse } from "next/server";
import {
  createSignal, listSignals, persistSignal,
  signalSummary,
  type AcaSignalSource, type AcaSignalPattern,
} from "@/lib/aca-signal-processor";
import { getSessionFromRequest } from "@/lib/server-auth";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

async function getSignalsHandler(req: Request) {
  // ── P0 FIX: auth-gate (Circle session + isAca clearance) ───────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAca) {
    return NextResponse.json({ error: "forbidden", details: "ACA clearance required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const source = url.searchParams.get("source") as AcaSignalSource | undefined;
  const pattern = url.searchParams.get("pattern") as AcaSignalPattern | undefined;
  const signals = listSignals({ status, source, pattern });
  const summary = signalSummary();
  return NextResponse.json({
    total: signals.length,
    summary,
    signals: signals.map((s) => ({
      signalId: s.signalId,
      signalNumber: s.signalNumber,
      source: s.source,
      pattern: s.pattern,
      sourceCount: s.sourceCount,
      service: s.service,
      geography: s.geography,
      timeframe: s.timeframe,
      status: s.status,
      hasIntegrityIndicators: s.potentialIntegrityIndicators.length > 0,
      integrityIndicatorCount: s.potentialIntegrityIndicators.length,
      evaluation: s.evaluation
        ? {
            recommendation: s.evaluation.recommendation,
            confidence: s.evaluation.confidence,
            thresholdMet: s.evaluation.thresholdMet,
            suggestedPriority: s.evaluation.suggestedPriority,
            suggestedDepartment: s.evaluation.suggestedDepartment,
            evaluatedAt: s.evaluation.evaluatedAt,
            evaluatedByName: s.evaluation.evaluatedByName,
            rationale: s.evaluation.rationale,
          }
        : null,
      convertedToCaseId: s.convertedToCaseId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      reviewedAt: s.reviewedAt,
      dismissedReason: s.dismissedReason,
    })),
    devMode: true,
  }, { headers: { "Cache-Control": "no-store" } });
}

async function postSignalsHandler(req: Request) {
  // ── P0 FIX: auth-gate (Circle session + isAca clearance) ───────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAca) {
    return NextResponse.json({ error: "forbidden", details: "ACA clearance required" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.source || !body?.pattern || !body?.timeframe || !body?.reasonForReferral) {
    return NextResponse.json(
      { error: "missing_required", details: "source, pattern, timeframe, and reasonForReferral are required." },
      { status: 400 },
    );
  }

  const s = createSignal({
    source: body.source as AcaSignalSource,
    pattern: body.pattern as AcaSignalPattern,
    sourceCount: body.sourceCount,
    service: body.service,
    geography: body.geography,
    timeframe: body.timeframe,
    evidenceAvailability: body.evidenceAvailability ?? {
      hasDirectEvidence: false,
      hasWitnessCorroboration: false,
      hasDocumentaryTrail: false,
      evidenceCount: 0,
    },
    repeatedFailures: body.repeatedFailures,
    potentialIntegrityIndicators: body.potentialIntegrityIndicators,
    reasonForReferral: body.reasonForReferral,
  });

  await persistSignal(s);

  return NextResponse.json({
    signalId: s.signalId,
    signalNumber: s.signalNumber,
    status: s.status,
    createdAt: s.createdAt,
    notice: "Signal created — NOT a case. A human ACA agent must convert it via POST /api/aca/signals/[id]/convert.",
    devMode: true,
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

// P1 FIX: Rate-limited to prevent abuse (signals list — 20 req/min)
export const GET = withRateLimit(getSignalsHandler, {
  maxRequests: 20,
  windowMs: 60_000,
  keyBy: "ip",
});

// P1 FIX: Rate-limited to prevent abuse (signal creation — 20 req/min)
export const POST = withRateLimit(postSignalsHandler, {
  maxRequests: 20,
  windowMs: 60_000,
  keyBy: "ip",
});
