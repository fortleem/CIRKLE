// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  setDisappearingTimer,
  getDisappearingSetting,
  DURATION_OPTIONS,
  isValidDuration,
} from "@/lib/disappearing-messages";

/**
 * /api/conversations/[id]/disappearing
 *
 *   POST { duration, setBy }   → set / update the disappearing-message timer
 *   GET                        → fetch the current setting
 *
 * Path param `id` is the Conversation.id.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params;
    const { duration, setBy } = await req.json();
    if (!duration || !setBy) {
      return NextResponse.json(
        { error: "duration and setBy are required." },
        { status: 400 },
      );
    }
    if (!isValidDuration(duration)) {
      return NextResponse.json(
        { error: `Invalid duration. Allowed: ${DURATION_OPTIONS.join(", ")}` },
        { status: 400 },
      );
    }
    const setting = await setDisappearingTimer(conversationId, duration, setBy);
    return NextResponse.json({ ok: true, setting });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "setDisappearingTimer failed";
    const status = /required|Invalid/.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params;
    const setting = await getDisappearingSetting(conversationId);
    return NextResponse.json({ setting });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
