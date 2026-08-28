// @ts-nocheck
/**
 * GET /api/admin/overlays
 * ============================================================================
 * Overlay registry + feature flag data for the admin panel.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAdmin` clearance on the session. Returns 401 / 403 otherwise.
 *
 * Pulls from:
 *   - src/lib/overlay-registry.ts (OVERLAY_REGISTRY — 71 overlays)
 *   - src/lib/tabs.ts (PRIMARY_TABS + SECONDARY_TABS)
 *
 * Returns:
 *   { totalOverlays, byCategory: [...], overlays: [...],
 *     primaryTabs, secondaryTabs, quickActions }
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { OVERLAY_REGISTRY, getCommandEntries } from "@/lib/overlay-registry";
import { PRIMARY_TABS, SECONDARY_TABS } from "@/lib/tabs";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // ── Group by category ──────────────────────────────────────────────────
  const byCategory: Record<string, number> = {};
  for (const o of OVERLAY_REGISTRY) {
    byCategory[o.category] = (byCategory[o.category] || 0) + 1;
  }

  const byCategoryArr = Object.entries(byCategory)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // ── Group by event prefix (e.g. circle:, tab:, act:) ───────────────────
  const byEventPrefix: Record<string, number> = {};
  for (const o of OVERLAY_REGISTRY) {
    const prefix = o.event.split(":")[0] || "other";
    byEventPrefix[prefix] = (byEventPrefix[prefix] || 0) + 1;
  }

  const commandEntries = getCommandEntries();

  return NextResponse.json(
    {
      totalOverlays: OVERLAY_REGISTRY.length,
      totalCommands: commandEntries.length,
      quickActionsCount: commandEntries.filter(c => c.type === "action").length,
      primaryTabs: PRIMARY_TABS.map(t => ({
        id: t.id,
        label: t.label,
        primary: true,
      })),
      secondaryTabs: SECONDARY_TABS.map(t => ({
        id: t.id,
        label: t.label,
        primary: false,
      })),
      byCategory: byCategoryArr,
      byEventPrefix: Object.entries(byEventPrefix).map(([prefix, count]) => ({ prefix, count })),
      overlays: OVERLAY_REGISTRY.map(o => ({
        id: o.id,
        name: o.name,
        description: o.description,
        emoji: o.emoji,
        category: o.category,
        event: o.event,
        keywordsCount: o.keywords?.length || 0,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
