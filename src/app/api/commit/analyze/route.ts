import { NextRequest, NextResponse } from "next/server";
import { analyzeFairness } from "@/lib/commit-ai";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/commit/analyze
// U1 — Live AI Fairness Audit. Called from the CirkleCommit create-form
// (debounced 1.5s on title+description edits). Returns a FairnessAnalysis
// {score, issues[], marketRange, summary} that the overlay renders inline.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title : "";
    const description = typeof body?.description === "string" ? body.description : "";
    const amount = typeof body?.amount === "number" && body.amount > 0 ? body.amount : undefined;
    const currency = typeof body?.currency === "string" ? body.currency : undefined;
    const type = typeof body?.type === "string" ? body.type : "price";
    const country = typeof body?.country === "string" ? body.country : "SA";

    // Gate: skip the AI round-trip entirely when there's nothing to audit.
    // Saves provider quota and keeps the debounced calls cheap.
    if (!title.trim() && !description.trim()) {
      return NextResponse.json({
        score: 50,
        issues: [],
        summary: "Add a title and description to begin fairness analysis.",
      });
    }

    const result = await analyzeFairness({ title, description, amount, currency, type, country });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        score: 50,
        issues: [],
        summary: "Analysis failed",
        error: String(err),
      },
      { status: 500 },
    );
  }
}
