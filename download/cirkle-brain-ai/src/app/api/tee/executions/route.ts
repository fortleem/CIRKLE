/**
 * GET /api/tee/executions
 *
 * List recent TEE executions or get a specific execution by id.
 *
 * Query params:
 *   id    — get a specific execution by id
 *   limit — max results (default 20)
 */
import { NextRequest, NextResponse } from "next/server";
import { globalTEEEngine } from "@/lib/tee";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  if (id) {
    const execution = globalTEEEngine.getExecution(id);
    if (!execution) {
      return NextResponse.json({ error: "Execution not found", id }, { status: 404 });
    }
    return NextResponse.json({ execution });
  }

  const executions = globalTEEEngine.listExecutions(limit);
  return NextResponse.json({
    count: executions.length,
    executions: executions.map((e) => ({
      executionId: e.executionId,
      planId: e.planId,
      state: e.state,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      totalDurationMs: e.totalDurationMs,
      dryRun: e.dryRun,
      summary: e.summary,
      stepsSucceeded: e.telemetry.stepsSucceeded,
      stepsFailed: e.telemetry.stepsFailed,
      stepsSkipped: e.telemetry.stepsSkipped,
      totalRetries: e.telemetry.totalRetries,
      totalCompensations: e.telemetry.totalCompensations,
    })),
  });
}
