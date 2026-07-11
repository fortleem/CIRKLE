/**
 * GET /api/cognitive/capabilities
 *
 * Capability Registry discovery API for the future UOB (Phase 5) and
 * developer tooling.
 *
 * Query params:
 *   q          — full-text search (name/description/id/tags)
 *   category   — filter by category (payments, travel, ai, ...)
 *   module     — filter by owner module (pay, rihla, news, ...)
 *   tag        — filter by tag
 *   available  — "1" to return only active+available capabilities
 *   id         — lookup a single capability by id or alias
 *   deps       — "1" + id to resolve transitive dependencies
 *   limit      — max results (default 50, max 200)
 */
import { NextRequest, NextResponse } from "next/server";
import { ensureCapabilitiesSeeded, globalCapabilityRegistry } from "@/lib/cognitive";

export async function GET(req: NextRequest) {
  ensureCapabilitiesSeeded();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const deps = searchParams.get("deps") === "1";

  // Single lookup / dependency resolution.
  if (id) {
    const cap = globalCapabilityRegistry.lookup(id);
    if (!cap) return NextResponse.json({ error: "Capability not found", id }, { status: 404 });
    if (deps) {
      try {
        const dependencies = globalCapabilityRegistry.resolveDependencies(id);
        return NextResponse.json({ capability: cap, dependencies });
      } catch (err) {
        return NextResponse.json({ error: "Dependency resolution failed", detail: String(err).slice(0, 200), capability: cap }, { status: 422 });
      }
    }
    return NextResponse.json({ capability: cap });
  }

  // Search.
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const results = globalCapabilityRegistry.search({
    text: searchParams.get("q") || undefined,
    category: (searchParams.get("category") || undefined) as never,
    ownerModule: searchParams.get("module") || undefined,
    tag: searchParams.get("tag") || undefined,
    availableOnly: searchParams.get("available") === "1",
    limit,
  });

  return NextResponse.json({
    count: results.length,
    categories: globalCapabilityRegistry.listCategories(),
    capabilities: results,
  });
}
