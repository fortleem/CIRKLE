// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/calls/signal
 * ----------------------
 * WebRTC signaling relay — accepts SDP offers/answers + ICE candidates and
 * would normally push them to the remote peer via a socket.io server.
 *
 * ⚠️ MOCK: this route simply echoes back the signal so the caller can verify
 * the round-trip. Real signaling must be delivered through a socket.io
 * mini-service (e.g. `mini-services/chat-service` on port 3003) which the
 * existing `call-manager.ts` already connects to.
 *
 * Body:
 *   {
 *     callId: string,
 *     from: string,
 *     to: string,
 *     type: "offer" | "answer" | "ice" | "end" | "reject",
 *     sdp?: RTCSessionDescriptionInit,
 *     candidate?: RTCIceCandidateInit
 *   }
 *
 * Returns:
 *   200 { ok: true, relayed: true }
 *   400 { ok: false, error }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      callId?: string;
      from?: string;
      to?: string;
      type?: string;
      sdp?: any;
      candidate?: any;
    };

    const callId = String(body?.callId || "").trim();
    const from = String(body?.from || "").trim();
    const to = String(body?.to || "").trim();
    const type = String(body?.type || "").trim();

    if (!callId || !from || !to || !type) {
      return NextResponse.json(
        { ok: false, error: "callId, from, to, and type are required." },
        { status: 400 },
      );
    }

    const ALLOWED = new Set(["offer", "answer", "ice", "end", "reject"]);
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { ok: false, error: `type must be one of: ${[...ALLOWED].join(", ")}.` },
        { status: 400 },
      );
    }

    // ⚠️ In production this is where we'd:
    //   1. Look up the target user's active socket via the chat-service.
    //   2. Emit the signal on that socket.
    // For now we just acknowledge receipt so the WebRTC flow doesn't block.
    // The browser-side `webrtc-service.ts` mock channel simulates the round
    // trip locally for demo purposes.

    return NextResponse.json({
      ok: true,
      relayed: true,
      _note: "Mock relay — real signaling must use a socket.io mini-service (port 3003+).",
    });
  } catch (err) {
    console.error("[calls/signal] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to relay signal.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}
