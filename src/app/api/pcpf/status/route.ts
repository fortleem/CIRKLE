/**
 * GET /api/pcpf/status
 *
 * PCPF health + observability. Read-only, cacheable.
 * Heavy modules are lazy-loaded to avoid OOM in memory-constrained environments.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const { globalPCPFFramework } = await import("@/lib/pcpf");
  const status = globalPCPFFramework.status();
  return NextResponse.json(
    {
      phase: "PCPF",
      name: "Platform Capability Pack Framework",
      frameworkVersion: status.frameworkVersion,
      status: "operational",
      installedPacks: status.installedPacks,
      activePacks: status.activePacks,
      totalCapabilities: status.totalCapabilities,
      packs: status.packs,
      principles: [
        "One AI model (packs don't add AI)",
        "One reasoning pipeline (CRIE — packs don't reason)",
        "One orchestration engine (UOB — packs don't plan)",
        "One execution engine (TEE — packs don't execute autonomously)",
        "One learning engine (LIEE — packs don't learn)",
        "Capability Packs are declarative extensions, not independent AI agents",
      ],
      integrationModel: {
        packCapabilities: "registered into Capability Registry (Phase 4.5) → UOB discovers",
        packAdapters: "registered into TEE Capability Executor Registry (Phase 6) → TEE invokes",
        lifecycle: "managed by PCPF Lifecycle Manager",
        policies: "evaluated by UOB (planning) + TEE (enforcement)",
        localization: "country-specific extensions via Localization Model",
      },
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
