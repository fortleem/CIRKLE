/**
 * GET /api/cognitive/status
 *
 * Health + observability for the Shared Cognitive Foundation (Phase 4.5).
 * Returns Context Manager + Capability Registry status. Read-only, cacheable.
 */
import { NextResponse } from "next/server";
import { ensureCapabilitiesSeeded, globalCapabilityRegistry } from "@/lib/cognitive";

export async function GET() {
  ensureCapabilitiesSeeded();
  const stats = globalCapabilityRegistry.stats();
  return NextResponse.json(
    {
      phase: "4.5",
      name: "Shared Cognitive Foundation",
      status: "operational",
      contextManager: {
        schemaVersion: 1,
        lifecycleApis: ["create", "read", "enrich", "validate", "freeze", "clone", "serialize", "deserialize", "trace", "debug"],
        ownershipEnforced: true,
        immutable: true,
      },
      capabilityRegistry: {
        ...stats,
        aliasesSupported: true,
        dependencyResolution: "transitive-closure",
      },
      architecturalLayer: "Shared Cognitive Services",
      backwardCompatible: true,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
