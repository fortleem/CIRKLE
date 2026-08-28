// @ts-nocheck
/**
 * GET  /api/admin/features  — list all platform features with current state
 * PUT  /api/admin/features  — toggle a feature on/off
 *      body: { id: string, enabled: boolean }
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAdmin` clearance on the session. Returns 401 / 403 otherwise.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PLATFORM_FEATURES, resolveFeatureStates } from "@/lib/platform-features";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    let dbToggles: Array<{ id: string; enabled: boolean }> = [];
    try {
      dbToggles = await db.platformFeatureToggle.findMany({
        select: { id: true, enabled: true, updatedAt: true, updatedBy: true },
      });
    } catch {
      // table not yet seeded
    }

    const features = resolveFeatureStates(dbToggles);
    const enabledCount = features.filter(f => f.enabled).length;
    const byCategory = {
      tab: features.filter(f => f.category === "tab"),
      capability: features.filter(f => f.category === "capability"),
      overlay: features.filter(f => f.category === "overlay"),
    };

    return NextResponse.json(
      {
        total: features.length,
        enabledCount,
        disabledCount: features.length - enabledCount,
        features,
        byCategory,
        coreFeatureIds: PLATFORM_FEATURES.filter(f => f.defaultEnabled).map(f => f.id),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_features", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { id, enabled } = body;

    if (typeof id !== "string" || !id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });
    }

    // Validate the feature id exists in our registry.
    const def = PLATFORM_FEATURES.find(f => f.id === id);
    if (!def) {
      return NextResponse.json({ error: `unknown feature: ${id}` }, { status: 400 });
    }

    // Upsert the toggle state in the DB.
    try {
      await db.platformFeatureToggle.upsert({
        where: { id },
        create: {
          id,
          label: def.label,
          description: def.description,
          category: def.category,
          enabled,
        },
        update: { enabled },
      });
    } catch (dbErr) {
      return NextResponse.json(
        { error: "db_update_failed", details: String(dbErr).slice(0, 200) },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { id, enabled, label: def.label, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_toggle_feature", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
