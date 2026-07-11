/**
 * POST /api/account/propose-fix
 *
 * Get proposed fixes for a diagnosed problem (without executing them).
 * Returns the fixes ranked by confidence, with governance status.
 *
 * Body: { problemId }
 * Returns: { problem, fixes }
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.problemId) {
      return NextResponse.json({ error: "problemId is required" }, { status: 400 });
    }

    const { globalFixEngine } = await import("@/lib/ahg");
    const problem = globalFixEngine.getProblem(body.problemId);
    if (!problem) {
      return NextResponse.json({ error: "Problem not found", problemId: body.problemId }, { status: 404 });
    }

    return NextResponse.json({
      problem: {
        problemId: problem.problemId,
        type: problem.type,
        severity: problem.severity,
        status: problem.status,
        description: problem.description,
        rootCause: problem.rootCause,
      },
      fixes: problem.proposedFixes || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get proposed fixes", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}
