/**
 * TURN / STUN server configuration for WebRTC peer connections.
 *
 * Used by the voice/video calling stack (Wasl, Mashahd watch parties,
 * Midan live, etc.) to assemble the `iceServers` array that gets passed
 * to `new RTCPeerConnection({ iceServers })`.
 *
 * Strategy:
 *   1. STUN — always available via Google's free public STUN servers.
 *      STUN lets peers discover their public IP and works for ~80% of
 *      home networks. Free, no auth, no quota concerns for our volume.
 *   2. TURN — relay server for the remaining ~20% of networks that
 *      block direct peer connections (corporate firewalls, CGNAT,
 *      symmetric NATs, hotel Wi-Fi, etc.). TURN requires credentials,
 *      so it is optional — read from environment variables when the
 *      deployment operator provisions a TURN provider (e.g. Twilio,
 *      Coturn self-hosted, Xirsys, Metered).
 *
 * Env vars (all optional):
 *   TURN_SERVER_URL        e.g. "turn:turn.example.com:3478?transport=udp"
 *                          (multiple URLs comma-separated)
 *   TURN_SERVER_USERNAME   HMAC username (time-limited or static)
 *   TURN_SERVER_CREDENTIAL HMAC credential / shared secret
 *
 * If TURN is not configured, callers still get a working STUN-only
 * `iceServers` array, plus a warning they can surface to the user.
 *
 * NOTE: This module is isomorphic — it reads from `process.env` which is
 * available on both server and client (Next.js inlines NEXT_PUBLIC_*
 * vars, but our TURN vars are intentionally server-side only; the
 * caller must fetch them via an API route if they want to expose TURN
 * credentials to the browser. See /api/calls/ice-servers if it exists.)
 */

export interface TurnStatus {
  /** True if at least one STUN server is configured. Always true — Google STUN is the default. */
  stun: boolean;
  /** True if TURN credentials + URL are present in the environment. */
  turn: boolean;
  /** Optional human-readable warning surfaced when TURN is missing. */
  warning?: string;
}

/**
 * The default STUN servers. Always included in `getIceServers()` so
 * peer connections work out of the box on permissive networks.
 *
 * We list two Google STUN servers for redundancy — if one is briefly
 * unavailable, the browser automatically falls back to the next.
 */
const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Parses the TURN environment variables into a list of `RTCIceServer`
 * entries. Returns an empty list when TURN is not configured (so the
 * caller can simply spread the result into its `iceServers` array).
 *
 * Accepts multiple URLs in a single env var (comma-separated) — useful
 * when a TURN provider offers both UDP and TCP transports.
 */
function parseTurnServers(): RTCIceServer[] {
  // Support both server-side (process.env) and client-side (NEXT_PUBLIC_*)
  // call sites. On the client, only NEXT_PUBLIC_* vars are inlined by
  // Next.js; non-prefixed vars are absent and we return an empty list.
  const env = (typeof process !== "undefined" && process.env) || {};
  const urlRaw =
    env.TURN_SERVER_URL ||
    env.NEXT_PUBLIC_TURN_SERVER_URL ||
    "";
  const username =
    env.TURN_SERVER_USERNAME ||
    env.NEXT_PUBLIC_TURN_SERVER_USERNAME ||
    "";
  const credential =
    env.TURN_SERVER_CREDENTIAL ||
    env.NEXT_PUBLIC_TURN_SERVER_CREDENTIAL ||
    "";

  if (!urlRaw.trim()) return [];

  const urls = urlRaw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  if (urls.length === 0) return [];

  const server: RTCIceServer = { urls };
  // Only attach credentials when provided. Some self-hosted Coturn
  // deployments operate in "anonymous" mode and don't require auth.
  if (username) server.username = username;
  if (credential) server.credential = credential;
  return [server];
}

/**
 * Returns the full `iceServers` array suitable for passing to
 * `new RTCPeerConnection({ iceServers })`.
 *
 * Always includes Google STUN. Adds TURN entries when configured.
 *
 *   const pc = new RTCPeerConnection({ iceServers: getIceServers() });
 */
export function getIceServers(): RTCIceServer[] {
  return [...DEFAULT_STUN_SERVERS, ...parseTurnServers()];
}

/**
 * True when TURN credentials + URL are present in the environment.
 * Use this to gate TURN-dependent UI (e.g. show a "Call quality may be
 * reduced on restrictive networks" hint when false).
 */
export function isTurnConfigured(): boolean {
  return parseTurnServers().length > 0;
}

/**
 * Returns a structured status object describing which ICE transport
 * modes are available. When TURN is missing, includes a `warning`
 * string suitable for surfacing to the user.
 *
 *   const s = getTurnStatus();
 *   // { stun: true, turn: false, warning: "Calls may fail behind restrictive networks" }
 */
export function getTurnStatus(): TurnStatus {
  const turn = isTurnConfigured();
  const status: TurnStatus = {
    stun: true, // Google STUN is always available
    turn,
  };
  if (!turn) {
    status.warning =
      "Calls may fail behind restrictive networks (corporate Wi-Fi, CGNAT, symmetric NAT). Configure TURN_SERVER_URL / TURN_SERVER_USERNAME / TURN_SERVER_CREDENTIAL to enable a relay fallback.";
  }
  return status;
}
