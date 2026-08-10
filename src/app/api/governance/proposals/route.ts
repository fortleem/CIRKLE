import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createProposal,
  getProposals,
  type ProposalStatus,
  type ProposalType,
} from "@/lib/governance-service";

// ─────────────────────────────────────────────────────────────────────────────
// /api/governance/proposals — GET list proposals, POST create a new one.
//
// GET  /api/governance/proposals?status=voting&type=covenant
// POST /api/governance/proposals  body: { title, description, type, author }
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const status = (sp.get("status") || undefined) as ProposalStatus | undefined;
    const type = (sp.get("type") || undefined) as ProposalType | undefined;
    const limitRaw = parseInt(sp.get("limit") || "50", 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 200 ? limitRaw : 50;
    const proposals = await getProposals(status, type, limit);
    return NextResponse.json({ proposals });
  } catch (err) {
    logger.error("[/api/governance/proposals GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load proposals" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      title?: string;
      description?: string;
      type?: string;
      author?: string;
      closesAt?: string;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    let closesAt: Date | undefined;
    if (body.closesAt) {
      const t = Date.parse(body.closesAt);
      if (Number.isFinite(t)) closesAt = new Date(t);
    }
    const proposal = await createProposal(
      body.title || "",
      body.description || "",
      body.type || "other",
      body.author || "",
      closesAt,
    );
    return NextResponse.json({ ok: true, proposal }, { status: 201 });
  } catch (err) {
    logger.error("[/api/governance/proposals POST] error", {
      error: (err as Error).message,
    });
    const msg = err instanceof Error ? err.message : "failed to create proposal";
    const status = msg.includes("required") || msg.includes("long") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
