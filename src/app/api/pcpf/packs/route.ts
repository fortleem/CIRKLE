/**
 * GET /api/pcpf/packs
 *
 * List installed capability packs. Supports filtering by category + state.
 *
 * Query params:
 *   category — filter by category
 *   state    — filter by lifecycle state
 *
 * POST /api/pcpf/packs
 *
 * Install a capability pack. Body: { pack: CapabilityPack }
 */
import { NextRequest, NextResponse } from "next/server";
import type { CapabilityPack } from "@/lib/pcpf";

export async function GET(req: NextRequest) {
  const { globalPCPFFramework } = await import("@/lib/pcpf");
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const state = searchParams.get("state");

  let packs = globalPCPFFramework.listPacks();
  if (category) packs = packs.filter((p) => p.manifest.category === category);
  if (state) packs = packs.filter((p) => p.manifest.lifecycleState === state);

  return NextResponse.json({
    count: packs.length,
    packs: packs.map((p) => ({
      packId: p.manifest.packId,
      name: p.manifest.name,
      description: p.manifest.description,
      version: p.manifest.version,
      category: p.manifest.category,
      lifecycleState: p.manifest.lifecycleState,
      supportedRegions: p.manifest.supportedRegions,
      permissions: p.manifest.permissions,
      consentPurposes: p.manifest.consentPurposes,
      dependencies: p.manifest.dependencies,
      entryPoints: p.manifest.entryPoints,
      signed: p.manifest.signed,
      installedAt: p.installedAt,
      capabilities: p.capabilities.map((c) => ({
        capabilityId: c.capabilityId,
        name: c.name,
        description: c.description,
        permissions: c.permissions,
        requiresConfirmation: c.requiresConfirmation,
      })),
      workflowTemplates: p.workflowTemplates.length,
      policies: p.policies.length,
      localization: p.localization.length,
      adapters: p.adapters.length,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { globalPCPFFramework, samplePacks } = await import("@/lib/pcpf");

    let pack: CapabilityPack;

    if (body.packId) {
      // Install a sample pack by id.
      const sample = samplePacks.find((p) => p.manifest.packId === body.packId);
      if (!sample) {
        return NextResponse.json({ error: `Sample pack "${body.packId}" not found. Available: ${samplePacks.map((p) => p.manifest.packId).join(", ")}` }, { status: 404 });
      }
      pack = sample;
    } else if (body.pack) {
      // Install a provided pack.
      pack = body.pack as CapabilityPack;
    } else {
      return NextResponse.json({ error: "Either { packId } (for a sample) or { pack } (custom) is required" }, { status: 400 });
    }

    const result = await globalPCPFFramework.install(pack);

    return NextResponse.json({
      success: result.success,
      packId: result.packId,
      version: result.version,
      lifecycleState: result.lifecycleState,
      registeredCapabilities: result.registeredCapabilities,
      registeredAdapters: result.registeredAdapters,
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "PCPF installation failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}
