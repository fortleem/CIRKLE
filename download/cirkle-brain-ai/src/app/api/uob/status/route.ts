/**
 * GET /api/uob/status
 *
 * UOB health + observability. Read-only, cacheable.
 */
import { NextResponse } from "next/server";
import { globalUOBEngine } from "@/lib/uob";
import { globalCapabilityRegistry, ensureCapabilitiesSeeded } from "@/lib/cognitive";

export async function GET() {
  ensureCapabilitiesSeeded();
  const uobStatus = globalUOBEngine.status();
  const registryStats = globalCapabilityRegistry.stats();
  return NextResponse.json(
    {
      ...uobStatus,
      name: "Universal Orchestration Brain",
      cognitiveMaturityLevel: 5,
      cognitiveMaturityName: "Platform Awareness",
      capabilityRegistry: registryStats,
      planningPipeline: [
        "Goal Analysis",
        "Goal Decomposition",
        "Capability Discovery",
        "Capability Selection",
        "Dependency Resolution",
        "Permission Validation",
        "Constraint Validation",
        "Workflow Planning",
        "Parallelization Analysis",
        "Sequential Ordering",
        "Alternative Planning",
        "Fallback Planning",
        "Compensation Planning",
        "Execution Graph Generation",
        "Execution Plan Generation",
        "Explainability Package",
      ],
      ownsPlatformContextSection: true,
      neverExecutes: true,
      backwardCompatible: true,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
