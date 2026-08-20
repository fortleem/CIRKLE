// @ts-nocheck
/**
 * POST /api/commit/detect
 * ============================================================================
 * AI auto-detection of commit type (price/commodity/agreement/all) from
 * message content. Called when a user presses "Commit" in a chat.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { detectCommitType } from "@/lib/commit-detection";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text : "";
    const senderName = typeof body?.senderName === "string" ? body.senderName : undefined;
    const recipientName = typeof body?.recipientName === "string" ? body.recipientName : undefined;

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const result = await detectCommitType(text, { senderName, recipientName });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "detection_failed", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
