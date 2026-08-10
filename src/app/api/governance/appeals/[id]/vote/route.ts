import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  voteOnAppeal,
  type AppealVoteChoice,
} from "@/lib/governance-service";

// ─────────────────────────────────────────────────────────────────────────────
// /api/governance/appeals/[id]/vote — POST a jury vote on an appeal.
// body: { voter, vote: "uphold"|"overturn", signature? }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const body = (await req.json().catch(() => null)) as {
      voter?: string;
      vote?: string;
      signature?: string;
    } | null;
    if (!body?.voter || !body.vote) {
      return NextResponse.json(
        { error: "voter and vote are required" },
        { status: 400 },
      );
    }
    const choice = body.vote as AppealVoteChoice;
    const result = await voteOnAppeal(id, body.voter, choice, body.signature);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error("[/api/governance/appeals/[id]/vote POST] error", {
      error: (err as Error).message,
    });
    const msg = err instanceof Error ? err.message : "failed to vote on appeal";
    const status = msg.includes("required") || msg.includes("invalid") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
