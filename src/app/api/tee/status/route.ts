/**
 * GET /api/tee/status
 *
 * TEE health + observability. Read-only, cacheable.
 */
import { NextResponse } from "next/server";
import { globalTEEEngine } from "@/lib/tee";
import { globalCapabilityRegistry, ensureCapabilitiesSeeded } from "@/lib/cognitive";

export async function GET() {
  ensureCapabilitiesSeeded();
  const teeStatus = globalTEEEngine.status();
  const recentExecutions = globalTEEEngine.listExecutions(5);
  const registryStats = globalCapabilityRegistry.stats();
  return NextResponse.json(
    {
      ...teeStatus,
      name: "Trusted Execution Engine",
      cognitiveMaturityLevel: 6,
      cognitiveMaturityName: "Execution Awareness",
      executionPipeline: [
        "Execution Validation",
        "Permission Verification",
        "Capability Resolution",
        "Execution Scheduler",
        "Capability Invocation",
        "Progress Tracking",
        "State Synchronization",
        "Retry Management",
        "Compensation (if required)",
        "Completion Validation",
        "Shared Context Update",
        "Execution Report",
      ],
      runtimeStates: ["pending", "running", "waiting", "paused", "retrying", "compensating", "completed", "failed", "cancelled", "timed-out"],
      ownsExecutionContextSection: true,
      neverPlans: true,
      capabilityRegistry: registryStats,
      recentExecutions: recentExecutions.map((e) => ({
        executionId: e.executionId,
        planId: e.planId,
        state: e.state,
        stepsSucceeded: e.telemetry.stepsSucceeded,
        stepsFailed: e.telemetry.stepsFailed,
        dryRun: e.dryRun,
        totalDurationMs: e.totalDurationMs,
      })),
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
