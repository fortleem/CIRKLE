// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  AutomationLevel,
  canAutoExecute,
  describeLevel,
  getAutomationConfig,
  getAutomationLevel,
  listAllConfigs,
  requireHumanApproval,
  setAutomationLevel,
} from "@/lib/ai-automation-levels";

/**
 * GET /api/ai/automation-level?featureId=<>&institution=<>&action=<>
 *   Returns the automation level for the feature, plus canAutoExecute and
 *   requireHumanApproval flags if `action` is provided.
 *
 * POST /api/ai/automation-level  (admin)
 *   Body: { featureId, level, setBy, reason, institution? }
 *   Sets the automation level for a feature / institution.
 */
export async function GET(req: NextRequest) {
  try {
    const featureId = req.nextUrl.searchParams.get("featureId");
    const institution = req.nextUrl.searchParams.get("institution") ?? "global";
    const action = req.nextUrl.searchParams.get("action") ?? undefined;

    if (featureId) {
      const level = getAutomationLevel(featureId, institution);
      const cfg = getAutomationConfig(featureId, institution);
      const description = describeLevel(level);
      const payload: Record<string, unknown> = {
        featureId,
        institution,
        level,
        levelLabel: description.label,
        levelDescription: description.description,
        config: cfg,
      };
      if (action) {
        const exec = canAutoExecute(featureId, action, institution);
        const approval = requireHumanApproval(featureId, action, institution);
        payload.action = action;
        payload.canAutoExecute = exec.canExecute;
        payload.requireHumanApproval = approval.required;
        payload.reason = exec.reason;
      }
      return NextResponse.json(payload, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // No featureId — return all configs.
    const configs = listAllConfigs();
    return NextResponse.json(
      {
        configs: configs.map((c) => ({
          ...c,
          levelLabel: describeLevel(c.level).label,
          levelDescription: describeLevel(c.level).description,
        })),
        count: configs.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.featureId || body.level === undefined || !body.setBy || !body.reason) {
      return NextResponse.json(
        { error: "Missing required fields: featureId, level, setBy, reason" },
        { status: 400 },
      );
    }
    const levelNum = typeof body.level === "number" ? body.level : Number(body.level);
    if (!Object.values(AutomationLevel).includes(levelNum)) {
      return NextResponse.json(
        {
          error:
            "Invalid level. Must be 0 (info), 1 (recommend), 2 (approval), 3 (low-risk auto), or 4 (prohibited).",
        },
        { status: 400 },
      );
    }
    const cfg = setAutomationLevel(
      body.featureId,
      levelNum as AutomationLevel,
      body.setBy,
      body.reason,
      body.institution ?? "global",
    );
    return NextResponse.json({ config: cfg, set: true }, { status: 201 });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
