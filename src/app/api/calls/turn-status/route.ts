// @ts-nocheck
/**
 * GET /api/calls/turn-status
 * ============================================================================
 * Returns the current STUN/TURN configuration so the UI can warn the
 * user that calls may fail behind restrictive networks (symmetric NAT,
 * carrier-grade NAT, corporate firewalls) when no TURN server is
 * configured.
 *
 * Response:
 *   200 {
 *     success: true,
 *     stun: true,
 *     turn: boolean,
 *     turnUrl?: string,
 *     turnSecure?: boolean,
 *     turnTimeLimited?: boolean,
 *     warning?: string,         // present when TURN is not configured
 *     servers: Array<{ urls, source }>,
 *     serverCount: number,
 *   }
 *
 * Auth: anonymous — this is a status endpoint. We don't leak the TURN
 * credentials (only the URL), so a pre-auth check isn't necessary.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import {
  getTurnStatus,
  getIceDiagnostics,
} from "@/lib/webrtc-turn-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = getTurnStatus();
    const diag = getIceDiagnostics();
    const warning = !status.turn
      ? "Calls may fail behind restrictive networks. Configure a TURN server for reliable calls."
      : undefined;

    return NextResponse.json({
      success: true,
      ...status,
      warning,
      servers: diag.servers,
      serverCount: diag.serverCount,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        stun: true,
        turn: false,
        error: "turn_status_failed",
        details: String((err as Error)?.message || err),
      },
      { status: 500 },
    );
  }
}
