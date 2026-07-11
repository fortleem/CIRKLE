import { NextRequest, NextResponse } from "next/server";
import { extractAgreementFromText } from "@/lib/commit-import";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U12 — Import API
//   POST /api/commit/import
//   body: { text: string }  (plain text, pasted PDF text, or DocuSign export)
// AI extracts clauses → returns a structured agreement ready to pre-fill the
// create form. Falls back to a regex-based heuristic if every AI provider is
// unavailable so the import flow always returns something usable.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text : "";

    if (!text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (text.length > 12_000) {
      return NextResponse.json({ error: "text too long (max 12,000 chars)" }, { status: 413 });
    }

    const extracted = await extractAgreementFromText(text);
    return NextResponse.json({ ok: true, agreement: extracted });
  } catch (err) {
    return NextResponse.json({ error: "Failed to import", details: String(err) }, { status: 500 });
  }
}
