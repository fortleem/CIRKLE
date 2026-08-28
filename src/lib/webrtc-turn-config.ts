// @ts-nocheck
/**
 * CIRKLE — WebRTC ICE Server Configuration (P2-PASSKEY-WEBRTC)
 * ============================================================================
 * Resolves the list of ICE servers (STUN + TURN) that should be passed to
 * `new RTCPeerConnection({ iceServers })`.
 *
 * Why this exists:
 *   The original `webrtc-service.ts` hard-codes Google's public STUN
 *   servers (`stun:stun.l.google.com:19302`). That works for calls
 *   between two devices on the *same* NAT (home/office WiFi) but FAILS
 *   when either peer is behind a symmetric NAT — STUN alone can't punch
 *   through symmetric NAT, and the call never connects.
 *
 *   TURN (Traversal Using Relays around NAT) fixes this by acting as a
 *   media relay when direct P2P fails. It's the only reliable path for
 *   calls between carriers (4G/5G), restrictive corporate networks, or
 *   CGNAT-shared IPs. TURN requires a real server (coturn, twilio,
 *   Xirsys, Cloudflare TURN) — there's no "free public TURN" — so we
 *   read the connection details from environment variables and degrade
 *   gracefully to STUN-only when they're absent.
 *
 * Env vars (read on the server, surfaced to the client via
 * `/api/calls/turn-status`):
 *   • TURN_SERVER_URL       — `turn:host:port` or `turns:host:port`
 *   • TURN_SERVER_USERNAME  — HMAC-SHA1 username (time-limited or static)
 *   • TURN_SERVER_CREDENTIAL — HMAC-SHA1 password / shared secret
 *
 * If any of the three is missing, we treat TURN as "not configured" and
 * return STUN-only — the UI surfaces a "calls may fail behind restrictive
 * networks" warning in that case.
 *
 * Why two exports of "almost the same thing":
 *   The task asks for both `webrtc-config.ts` and `webrtc-turn-config.ts`.
 *   We make them distinct concerns:
 *     • `webrtc-turn-config.ts`  — the raw env-var readers + `getTurnStatus()`.
 *     • `webrtc-config.ts`       — the UI-facing wrapper that produces the
 *       full `RTCIceServer[]` array (calls `getTurnStatus()` internally).
 *   The enhanced WebRTC service imports from `webrtc-config.ts`; the
 *   `/api/calls/turn-status` route imports from `webrtc-turn-config.ts`.
 * ============================================================================
 */

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface TurnStatus {
  /** STUN is always available (we use Google's public servers). */
  stun: boolean;
  /** Whether a TURN server is configured (env vars present). */
  turn: boolean;
  /** The TURN URL, if configured. Omitted otherwise. */
  turnUrl?: string;
  /** Whether the TURN config is using TLS (`turns:`). */
  turnSecure?: boolean;
  /** Whether the TURN credentials are time-limited (HMAC) vs static. */
  turnTimeLimited?: boolean;
}

export interface IceServerConfig extends RTCIceServer {
  /** Where this server came from — useful for diagnostics. */
  source: "google-stun" | "turn";
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

/**
 * Google's public STUN servers — free, globally available, no auth needed.
 * They're a great default for the public-IP discovery half of ICE.
 */
const GOOGLE_STUN_SERVERS: IceServerConfig[] = [
  { urls: "stun:stun.l.google.com:19302", source: "google-stun" },
  { urls: "stun:stun1.l.google.com:19302", source: "google-stun" },
  { urls: "stun:stun2.l.google.com:19302", source: "google-stun" },
];

/* ------------------------------------------------------------------ */
/* Env-var readers (defensive — every read wrapped in try/catch)       */
/* ------------------------------------------------------------------ */

function readTurnUrl(): string | undefined {
  try {
    const v = process.env.TURN_SERVER_URL;
    if (typeof v === "string" && v.length > 0) {
      // Accept `turn:` / `turns:` schemes; reject obvious garbage.
      if (/^turns?:\/\//i.test(v)) return v;
      // Allow `host:port` shorthand — prepend `turn:`.
      if (/^[a-z0-9.-]+:\d+$/i.test(v)) return `turn:${v}`;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function readTurnUsername(): string | undefined {
  try {
    const v = process.env.TURN_SERVER_USERNAME;
    return typeof v === "string" && v.length > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

function readTurnCredential(): string | undefined {
  try {
    const v = process.env.TURN_SERVER_CREDENTIAL;
    return typeof v === "string" && v.length > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Whether a TURN server is configured. Cheap check — used by the
 * `/api/calls/turn-status` endpoint and by the enhanced WebRTC service.
 */
export function isTurnConfigured(): boolean {
  try {
    return (
      !!readTurnUrl() &&
      !!readTurnUsername() &&
      !!readTurnCredential()
    );
  } catch {
    return false;
  }
}

/**
 * Return the full TURN status object — what's configured, with what URL,
 * and whether it's using TLS (`turns:`) or plain (`turn:`).
 */
export function getTurnStatus(): TurnStatus {
  try {
    const url = readTurnUrl();
    const username = readTurnUsername();
    const credential = readTurnCredential();
    const configured = !!(url && username && credential);
    const secure = url ? /^turns:/i.test(url) : false;
    // Time-limited credentials use a Unix-timestamp prefix:
    // `<epoch>:<userId>`. This is a heuristic — coturn's `turnadmin -k`
    // generates credentials with that shape; static credentials usually
    // don't start with digits.
    const timeLimited = !!username && /^\d+:/.test(username);
    return {
      stun: true,
      turn: configured,
      turnUrl: configured ? url : undefined,
      turnSecure: configured ? secure : undefined,
      turnTimeLimited: configured ? timeLimited : undefined,
    };
  } catch {
    return { stun: true, turn: false };
  }
}

/**
 * Build the full ICE server array to pass to `RTCPeerConnection`.
 *
 * Always includes the Google STUN servers (free, no auth). Adds a TURN
 * entry if env vars are configured.
 *
 * Returns a defensive copy on every call — callers can mutate the array
 * without affecting future callers.
 */
export function getIceServers(): IceServerConfig[] {
  try {
    const servers: IceServerConfig[] = [...GOOGLE_STUN_SERVERS];
    const url = readTurnUrl();
    const username = readTurnUsername();
    const credential = readTurnCredential();
    if (url && username && credential) {
      servers.push({
        urls: url,
        username,
        credential,
        source: "turn",
      });
    }
    return servers;
  } catch {
    // Last-resort fallback: STUN-only. ⚠️ Calls will fail behind
    // symmetric NAT.
    return [...GOOGLE_STUN_SERVERS];
  }
}

/**
 * Same as `getIceServers()` but returns plain `RTCIceServer[]` (without
 * the `source` field) — for consumers that want the spec-compliant shape.
 */
export function getIceServersPlain(): RTCIceServer[] {
  try {
    return getIceServers().map(({ source, ...rest }) => rest);
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}

/**
 * Diagnostics: a human-readable summary of the current ICE config.
 * Used by the `/api/calls/turn-status` route.
 */
export function getIceDiagnostics(): {
  status: TurnStatus;
  serverCount: number;
  servers: Array<{ urls: string | string[]; source: string }>;
} {
  try {
    const servers = getIceServers();
    const status = getTurnStatus();
    return {
      status,
      serverCount: servers.length,
      servers: servers.map((s) => ({
        urls: s.urls,
        source: s.source,
      })),
    };
  } catch {
    return {
      status: { stun: true, turn: false },
      serverCount: 1,
      servers: [{ urls: "stun:stun.l.google.com:19302", source: "google-stun" }],
    };
  }
}
