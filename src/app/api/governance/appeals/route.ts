import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createAppeal,
  getAppeals,
  type AppealStatus,
} from "@/lib/governance-service";

// ─────────────────────────────────────────────────────────────────────────────
// /api/governance/appeals — GET list appeals, POST create a new appeal.
//
// GET  /api/governance/appeals?status=open
// POST /api/governance/appeals  body: { contentId, contentType, appellant, reason, originalAction? }
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const status = (sp.get("status") || undefined) as AppealStatus | undefined;
    const appeals = await getAppeals(status);
    return NextResponse.json({ appeals });
  } catch (err) {
    logger.error("[/api/governance/appeals GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load appeals" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      contentId?: string;
      contentType?: string;
      appellant?: string;
      reason?: string;
      originalAction?: string;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    const appeal = await createAppeal(
      body.contentId || "",
      body.contentType || "post",
      body.appellant || "",
      body.reason || "",
      body.originalAction,
    );
    return NextResponse.json({ ok: true, appeal }, { status: 201 });
  } catch (err) {
    logger.error("[/api/governance/appeals POST] error", {
      error: (err as Error).message,
    });
    const msg = err instanceof Error ? err.message : "failed to create appeal";
    const status = msg.includes("required") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
