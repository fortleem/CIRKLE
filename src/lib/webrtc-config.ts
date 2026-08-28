// @ts-nocheck
/**
 * CIRKLE — WebRTC ICE Config Wrapper (P2-PASSKEY-WEBRTC)
 * ============================================================================
 * Thin wrapper around `webrtc-turn-config.ts` that exposes the
 * UI-/service-facing shape (`RTCIceServer[]` without the `source` field).
 *
 * Why this exists as a separate file:
 *   The existing `webrtc-service.ts` hard-codes its own ICE server list.
 *   Per the file-ownership constraint, we can't modify it — so the
 *   enhanced service (`webrtc-enhanced.ts`) imports `getIceServers()`
 *   from THIS module. This keeps the layering clean:
 *
 *     webrtc-turn-config.ts  ← raw env-var readers + TurnStatus
 *     webrtc-config.ts       ← UI/service wrapper (this file)
 *     webrtc-enhanced.ts     ← subclasses WebRTCCallSession w/ our ICE
 *
 * Everything is server-side safe (no `window`/`navigator` access at
 * module scope) and falls back to STUN-only when no TURN env vars are
 * set. The dev-mode fallback is intentional: in dev we expect calls
 * between two browsers on the same machine, where STUN is sufficient.
 * ============================================================================
 */
import {
  getIceServersPlain,
  getTurnStatus,
  isTurnConfigured,
  type TurnStatus,
} from "./webrtc-turn-config";

export type { TurnStatus };

/**
 * The full ICE server array to pass to `RTCPeerConnection`.
 *
 * Re-exported here (rather than re-defined) so the enhanced service has
 * a single import path. See `webrtc-turn-config.ts` for the
 * env-var resolution logic.
 */
export function getIceServers(): RTCIceServer[] {
  try {
    return getIceServersPlain();
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}

/**
 * Whether TURN is configured. Re-exported for convenience — the enhanced
 * service uses this to set a `callStatus.turnConfigured` flag.
 */
export function isTurnAvailable(): boolean {
  try {
    return isTurnConfigured();
  } catch {
    return false;
  }
}

/**
 * Re-export the TurnStatus reader. Useful for the API route that wants
 * to mirror the same shape back to the client.
 */
export function getTurnInfo(): TurnStatus {
  try {
    return getTurnStatus();
  } catch {
    return { stun: true, turn: false };
  }
}
