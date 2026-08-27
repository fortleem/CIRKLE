// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { requestAccess, recordAIOutput } from "@/lib/ai-data-access-broker";

/**
 * POST /api/ai/access-broker
 *
 * AI requests access to ACA / institutional data. The broker evaluates:
 * institution, policy, case, clearance, purpose, requested data — and returns
 * ONLY the authorized scope. The AI CANNOT access the unrestricted database.
 *
 * Body:
 *   { institution, aiModel, modelVersion?, purpose, requestedData: string[],
 *     policy, caseRef?, clearance?, requesterId }
 * Optional second body shape for recording AI output after access:
 *   { requestId, output, reviewer? }  — calls recordAIOutput instead.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    // If `requestId` + `output` present, record the AI output for an existing
    // request (reproducibility audit per §115).
    if (body.requestId && typeof body.output === "string") {
      recordAIOutput(body.requestId, body.output, body.reviewer);
      return NextResponse.json({ recorded: true });
    }

    if (!body.institution || !body.aiModel || !body.purpose || !Array.isArray(body.requestedData)) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: institution, aiModel, purpose, requestedData (string[])",
        },
        { status: 400 },
      );
    }

    const decision = await requestAccess({
      institution: body.institution,
      aiModel: body.aiModel,
      modelVersion: body.modelVersion,
      purpose: body.purpose,
      requestedData: body.requestedData,
      policy: body.policy ?? "default",
      caseRef: body.caseRef,
      clearance: body.clearance,
      requesterId: body.requesterId ?? body.aiModel,
    });

    return NextResponse.json(decision, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
