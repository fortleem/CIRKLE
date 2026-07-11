/**
 * POST /api/tgse/validate
 * Validate an AI action through the full TGSE governance pipeline.
 * Returns a GovernanceDecision.
 */
import { NextRequest, NextResponse } from "next/server";
import type { GovernanceTarget } from "@/lib/tgse/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { globalTGSEEngine } = await import("@/lib/tgse");

    const decision = globalTGSEEngine.validate({
      target: body.target as GovernanceTarget,
      action: body.action || "(unspecified)",
      country: body.country,
      userPermissions: body.userPermissions || [],
      consentScope: body.consentScope || [],
      amount: body.amount,
      confidence: body.confidence,
      capabilityId: body.capabilityId,
      trustEntityId: body.trustEntityId,
      trustEntityType: body.trustEntityType,
      text: body.text,
      workflow: body.workflow,
      outputData: body.outputData,
      inputData: body.inputData,
      requestedPermissions: body.requestedPermissions,
      impact: body.impact,
      actionContext: body.actionContext,
    });

    return NextResponse.json(decision);
  } catch (err) {
    return NextResponse.json(
      { error: "TGSE validation failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}
