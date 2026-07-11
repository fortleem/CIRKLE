/**
 * POST /api/account/consent-fix
 *
 * Execute a proposed fix with user consent. The Brain:
 *   1. Checks the user has consented
 *   2. Validates the fix through TGSE (governance)
 *   3. Generates a UOB plan if the fix requires capabilities
 *   4. Executes the plan via TEE
 *   5. Feeds the outcome to LIEE (learning)
 *   6. Returns the result
 *
 * Body:
 *   { problemId, fixId, consented, userNotes?, userId, country?,
 *     userPermissions?, consentScope? }
 *
 * Returns: FixExecutionResult
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.problemId || !body.fixId || body.consented === undefined) {
      return NextResponse.json(
        { error: "problemId, fixId, and consented are required" },
        { status: 400 },
      );
    }

    const { globalAHGEngine } = await import("@/lib/ahg");
    const result = await globalAHGEngine.executeFix({
      problemId: body.problemId,
      fixId: body.fixId,
      consented: body.consented,
      userNotes: body.userNotes,
      userId: body.userId || "anonymous",
      country: body.country,
      userPermissions: body.userPermissions,
      consentScope: body.consentScope,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "AHG fix execution failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}
