/**
 * POST /api/pcpf/install
 *
 * Install a capability pack (alias for POST /api/pcpf/packs).
 * Also supports lifecycle actions: upgrade, deprecate, disable, enable, rollback, remove.
 *
 * Body:
 *   { action: "install", packId: "cirkle.travel" }  — install a sample pack
 *   { action: "install", pack: CapabilityPack }       — install a custom pack
 *   { action: "upgrade", pack: CapabilityPack }       — upgrade a pack
 *   { action: "deprecate", packId: "cirkle.travel" }  — deprecate
 *   { action: "disable", packId }                     — disable
 *   { action: "enable", packId }                      — enable
 *   { action: "rollback", packId }                    — rollback to previous version
 *   { action: "remove", packId }                      — remove entirely
 */
import { NextRequest, NextResponse } from "next/server";
import type { CapabilityPack } from "@/lib/pcpf";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "install";
    const { globalPCPFFramework, samplePacks } = await import("@/lib/pcpf");

    switch (action) {
      case "install": {
        let pack: CapabilityPack;
        if (body.packId) {
          const sample = samplePacks.find((p) => p.manifest.packId === body.packId);
          if (!sample) {
            return NextResponse.json({ error: `Sample pack "${body.packId}" not found. Available: ${samplePacks.map((p) => p.manifest.packId).join(", ")}` }, { status: 404 });
          }
          pack = sample;
        } else if (body.pack) {
          pack = body.pack as CapabilityPack;
        } else {
          return NextResponse.json({ error: "Either { packId } or { pack } is required" }, { status: 400 });
        }
        const result = await globalPCPFFramework.install(pack);
        return NextResponse.json(result);
      }

      case "upgrade": {
        if (!body.pack) return NextResponse.json({ error: "{ pack } is required for upgrade" }, { status: 400 });
        const result = await globalPCPFFramework.upgrade(body.pack as CapabilityPack);
        return NextResponse.json(result);
      }

      case "deprecate": {
        if (!body.packId) return NextResponse.json({ error: "{ packId } is required" }, { status: 400 });
        const success = globalPCPFFramework.deprecate(body.packId);
        return NextResponse.json({ success, packId: body.packId, action: "deprecate" });
      }

      case "disable": {
        if (!body.packId) return NextResponse.json({ error: "{ packId } is required" }, { status: 400 });
        const success = globalPCPFFramework.disable(body.packId);
        return NextResponse.json({ success, packId: body.packId, action: "disable" });
      }

      case "enable": {
        if (!body.packId) return NextResponse.json({ error: "{ packId } is required" }, { status: 400 });
        const success = globalPCPFFramework.enable(body.packId);
        return NextResponse.json({ success, packId: body.packId, action: "enable" });
      }

      case "rollback": {
        if (!body.packId) return NextResponse.json({ error: "{ packId } is required" }, { status: 400 });
        const result = await globalPCPFFramework.rollback(body.packId);
        return NextResponse.json(result);
      }

      case "remove": {
        if (!body.packId) return NextResponse.json({ error: "{ packId } is required" }, { status: 400 });
        const success = await globalPCPFFramework.remove(body.packId);
        return NextResponse.json({ success, packId: body.packId, action: "remove" });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "PCPF action failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}
