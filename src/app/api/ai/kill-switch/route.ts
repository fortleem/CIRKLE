// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  disableAll,
  disableFeature,
  disableIntegration,
  disableModel,
  disableWorkflow,
  enableFeature,
  enableModel,
  listAllStates,
} from "@/lib/ai-kill-switch";
import { withRateLimit } from "@/lib/api-rate-limit";

/**
 * GET /api/ai/kill-switch — list all kill switch states.
 * POST /api/ai/kill-switch — disable/enable a single model/feature/integration/workflow.
 *   Body: { action: "disable"|"enable", featureId, by, reason, authorization?, scope? }
 * DELETE /api/ai/kill-switch — emergency disable ALL AI capabilities.
 *   Query: ?by=<actor>&reason=<reason>
 */
async function getKillSwitchHandler(req: NextRequest) {
  const states = listAllStates();
  return NextResponse.json(
    { states, count: states.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function postKillSwitchHandler(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.action || !body.featureId || !body.by) {
      return NextResponse.json(
        { error: "Missing required fields: action, featureId, by" },
        { status: 400 },
      );
    }
    const { action, featureId, by, reason, authorization, scope } = body;

    if (action === "disable") {
      let state;
      switch (scope) {
        case "model":
          state = disableModel(featureId.replace(/^model:/, ""), by, reason ?? "No reason provided");
          break;
        case "integration":
          state = disableIntegration(featureId, by, reason ?? "No reason provided");
          break;
        case "workflow":
          state = disableWorkflow(featureId, by, reason ?? "No reason provided");
          break;
        case "feature":
        default:
          state = disableFeature(featureId, by, reason ?? "No reason provided");
      }
      return NextResponse.json({ state, disabled: true });
    }

    if (action === "enable") {
      if (!authorization) {
        return NextResponse.json(
          { error: "Re-enabling a disabled AI capability requires explicit authorization." },
          { status: 403 },
        );
      }
      if (scope === "model" || featureId.startsWith("model:")) {
        const state = enableModel(
          featureId.replace(/^model:/, ""),
          by,
          authorization,
        );
        return NextResponse.json({ state, enabled: true });
      }
      const state = enableFeature(featureId, by, authorization);
      return NextResponse.json({ state, enabled: true });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function deleteKillSwitchHandler(req: NextRequest) {
  try {
    const by = req.nextUrl.searchParams.get("by");
    const reason = req.nextUrl.searchParams.get("reason");
    if (!by || !reason) {
      return NextResponse.json(
        { error: "Emergency disable requires both `by` and `reason` query parameters." },
        { status: 400 },
      );
    }
    const result = disableAll(by, reason);
    return NextResponse.json(
      { disabled: result.disabled, states: result.states, emergency: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// P1 FIX: Rate-limited to prevent abuse (kill-switch read — 5 req/min)
export const GET = withRateLimit(getKillSwitchHandler, {
  maxRequests: 5,
  windowMs: 60_000,
  keyBy: "ip",
});

// P1 FIX: Rate-limited to prevent abuse (critical AI control — 5 req/min)
export const POST = withRateLimit(postKillSwitchHandler, {
  maxRequests: 5,
  windowMs: 60_000,
  keyBy: "ip",
});

// P1 FIX: Rate-limited to prevent abuse (emergency disable ALL — 5 req/min)
export const DELETE = withRateLimit(deleteKillSwitchHandler, {
  maxRequests: 5,
  windowMs: 60_000,
  keyBy: "ip",
});
