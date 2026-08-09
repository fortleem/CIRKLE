import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/mesh/status
 *
 * Returns server-side metadata for the local mesh network (P2.7 / ADR-001).
 *
 * The actual peer list + offline queue live entirely on the client
 * (`src/lib/mesh-network.ts` → `localMesh.getMeshStatus()`), since the
 * server is OPINION-FREE about mesh traffic — it only relays opaque
 * signaling messages and never sees the encrypted payload.
 *
 * This endpoint returns the server-known configuration (signaling endpoint,
 * transport, ICE servers, uptime) plus zero-valued client fields that the
 * frontend augments with the live values from `localMesh.getMeshStatus()`
 * before rendering the dashboard.
 *
 * Response shape:
 *   {
 *     service: "cirkle-local-mesh",
 *     enabled: true,
 *     transport: "webrtc-datachannel",
 *     signaling: { port: 3003, path: "/", query: "XTransformPort=3003" },
 *     iceServers: [...],
 *     peers: [],            // client augments
 *     queueDepth: 0,        // client augments
 *     signalStrength: 0,    // client augments
 *     serverUptime: <seconds>,
 *     timestamp: <iso>,
 *   }
 */
export async function GET() {
  try {
    return NextResponse.json({
      service: "cirkle-local-mesh",
      enabled: true,
      transport: "webrtc-datachannel",
      signaling: {
        // Per gateway rules, the frontend connects to "/" with XTransformPort.
        port: 3003,
        path: "/",
        query: "XTransformPort=3003",
        events: ["mesh:announce", "mesh:discover", "mesh:signal", "mesh:leave"],
      },
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
      // Client-side fields — augmented by `localMesh.getMeshStatus()`:
      peers: [],
      peerCount: 0,
      connectedPeerCount: 0,
      queueDepth: 0,
      signalStrength: 0,
      discovering: false,
      // Server-known fields:
      serverUptime: process.uptime(),
      timestamp: new Date().toISOString(),
      // ADR-002 covenant: the server NEVER has access to plaintext mesh
      // messages or private keys. Reaffirm this for the dashboard.
      serverKnowsPlaintext: false,
      serverKnowsPrivateKeys: false,
    });
  } catch (err) {
    logger.error("[/api/mesh/status GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch mesh status" },
      { status: 500 },
    );
  }
}
