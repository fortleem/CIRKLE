// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getGroupInfo, setGroupDescription, setGroupRules, addRule, removeRule } from "@/lib/group-info";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/circles/[id]/info
 * Returns the circle's info (description + rules).
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const info = await getGroupInfo(id);
    return NextResponse.json({ info });
  } catch (err) {
    logger.error("[/api/circles/[id]/info GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch group info" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/circles/[id]/info
 * Body: { description?, rules?, addRule?, removeRuleIndex?, setBy? }
 * Updates the description and/or rules.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    let info;
    if (typeof body.description === "string") {
      info = await setGroupDescription(id, body.description);
    }
    if (Array.isArray(body.rules)) {
      info = await setGroupRules(id, body.rules as string[]);
    }
    if (typeof body.addRule === "string") {
      info = await addRule(id, body.addRule);
    }
    if (typeof body.removeRuleIndex === "number") {
      info = await removeRule(id, body.removeRuleIndex);
    }
    if (!info) {
      info = await getGroupInfo(id);
    }
    logger.info("[/api/circles/[id]/info POST] updated", { circleId: id });
    return NextResponse.json({ info });
  } catch (err) {
    logger.error("[/api/circles/[id]/info POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update group info" },
      { status: 500 },
    );
  }
}
