/**
 * POST /api/account/diagnose
 *
 * The CIRKLE Brain AI auto-diagnoses an account problem.
 * Instead of users sending for help, the Brain detects, diagnoses, and
 * proposes fixes. The user then consents to a fix (via /api/account/consent-fix).
 *
 * Body:
 *   { userId, problemDescription, problemTypeHint?, country?, city?,
 *     userPermissions?, consentScope?, errorContext? }
 *
 * Returns: DiagnosticResult { problem, diagnosed, fixes, nextSteps }
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.userId || !body.problemDescription) {
      return NextResponse.json(
        { error: "userId and problemDescription are required" },
        { status: 400 },
      );
    }

    const { globalAHGEngine } = await import("@/lib/ahg");
    const result = await globalAHGEngine.diagnose({
      userId: body.userId,
      problemDescription: body.problemDescription,
      problemTypeHint: body.problemTypeHint,
      country: body.country,
      city: body.city,
      userPermissions: body.userPermissions,
      consentScope: body.consentScope,
      errorContext: body.errorContext,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "AHG diagnosis failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}
