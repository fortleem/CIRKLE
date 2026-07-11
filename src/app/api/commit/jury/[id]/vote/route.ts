import { NextRequest, NextResponse } from "next/server";
import { castVote, getCase, type JuryVote } from "@/lib/commit-jury";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U11 — Community Jury · cast vote
//   POST /api/commit/jury/[id]/vote
//   body: { jurorUsername, vote: "party_a"|"party_b"|"split", reasoning }
// Auto-resolves the case when every juror has voted.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_VOTES: JuryVote[] = ["party_a", "party_b", "split"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "case id is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { jurorUsername, vote, reasoning = "" } = body as Record<string, unknown>;

    if (typeof jurorUsername !== "string" || !jurorUsername.trim()) {
      return NextResponse.json({ error: "jurorUsername is required" }, { status: 400 });
    }
    if (typeof vote !== "string" || !VALID_VOTES.includes(vote as JuryVote)) {
      return NextResponse.json({ error: `vote must be one of: ${VALID_VOTES.join(", ")}` }, { status: 400 });
    }

    const existing = await getCase(id);
    if (!existing) {
      return NextResponse.json({ error: "Jury case not found" }, { status: 404 });
    }
    if (existing.status === "resolved") {
      return NextResponse.json({ error: "Case already resolved", case: existing }, { status: 409 });
    }
    if (existing.status === "expired") {
      return NextResponse.json({ error: "Case expired — voting closed", case: existing }, { status: 410 });
    }

    const updated = await castVote(
      id,
      jurorUsername,
      vote as JuryVote,
      typeof reasoning === "string" ? reasoning.slice(0, 500) : "",
    );

    return NextResponse.json({ ok: true, case: updated });
  } catch (err) {
    return NextResponse.json({ error: "Failed to cast vote", details: String(err) }, { status: 500 });
  }
}
