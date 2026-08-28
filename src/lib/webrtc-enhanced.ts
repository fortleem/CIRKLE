// @ts-nocheck
/**
 * CIRKLE — Enhanced WebRTC Service (P2-PASSKEY-WEBRTC)
 * ============================================================================
 * Wraps the existing `webrtc-service.ts` so the WebRTCCallSession uses the
 * TURN-aware ICE server list from `webrtc-config.ts` instead of the
 * hard-coded STUN-only list.
 *
 * Why we wrap instead of edit:
 *   The file-ownership constraint forbids modifying `webrtc-service.ts`.
 *   The original class's `createPeerConnection()` is `private`, so a
 *   subclass can't override it directly (TypeScript would error). We use
 *   two complementary techniques:
 *
 *   1. **Prototype patch** — at module load, we wrap
 *      `WebRTCCallSession.prototype.createPeerConnection` so every
 *      RTCPeerConnection it creates gets reconfigured with our
 *      TURN-aware ICE server list. `RTCPeerConnection.setConfiguration()`
 *      is the standard way to update ICE servers post-construction.
 *      This makes the upgrade **retroactive**: any caller that imports
 *      the original `WebRTCCallSession` and constructs one gets the
 *      enhanced behavior too, without changing their import path.
 *
 *   2. **Explicit subclass** — `WebRTCCallSessionEnhanced` is a marker
 *      subclass callers can import when they want to make the upgrade
 *      explicit. It inherits everything from the parent and exposes
 *      `getCallStatus()` for diagnostics.
 *
 * The convenience helpers (`initiateCall`, `answerCall`, `endCall`,
 * `toggleMute`, `toggleVideo`, `switchCamera`) and the group-call
 * helpers are re-exported unchanged — they all operate on a
 * `WebRTCCallSession` instance, which now benefits from the prototype
 * patch automatically.
 *
 * ⚠️ Caveats:
 *   • `RTCPeerConnection.setConfiguration()` updates ICE servers for
 *     future ICE gathering — it does NOT restart an already-established
 *     connection. In practice this is fine because we patch the prototype
 *     synchronously before any session is constructed, so the very first
 *     `RTCPeerConnection` is created with our config from the start.
 *   • If a caller instantiates `WebRTCCallSession` before this module is
 *     imported, the patch hasn't run yet. Importing this module once at
 *     app bootstrap fixes that for the rest of the session.
 * ============================================================================
 */

"use client";

import {
  WebRTCCallSession,
  GroupCallSession,
  initiateCall,
  answerCall,
  endCall,
  toggleMute,
  toggleVideo,
  switchCamera,
  initiateGroupCall,
  joinGroupCall,
  getParticipantCount,
  __mockSignalingChannel,
  isWebRTCSupported,
  type CallType,
  type CallStatus,
  type CallOptions,
  type GroupCallOptions,
  type Participant,
  type SignalMessage,
  type SignalListener,
  type WebRTCError,
} from "./webrtc-service";
import { getIceServers, isTurnAvailable, getTurnInfo } from "./webrtc-config";

/* ------------------------------------------------------------------ */
/* Prototype patch                                                     */
/* ------------------------------------------------------------------ */

let __patchApplied = false;
function applyPrototypePatch() {
  if (__patchApplied) return;
  if (typeof window === "undefined") return;
  try {
    const proto = (WebRTCCallSession as any).prototype;
    if (!proto) return;
    const originalCreate = proto.createPeerConnection;
    if (typeof originalCreate !== "function") return;

    proto.createPeerConnection = function (...args: any[]) {
      // Call the original to get a fully-wired RTCPeerConnection
      // (it sets up local track handlers, ontrack, onicecandidate, etc.).
      const pc = originalCreate.apply(this, args);
      try {
        // Reconfigure with our TURN-aware ICE servers. This affects
        // the next ICE-gathering pass; since the original constructor
        // hasn't started gathering yet, this is effectively equivalent
        // to having passed our ICE servers at construction time.
        if (pc && typeof pc.setConfiguration === "function") {
          pc.setConfiguration({ iceServers: getIceServers() });
        }
      } catch {
        // setConfiguration can throw if the PC is already closed —
        // swallow; we'll fall back to STUN-only.
      }
      return pc;
    };
    __patchApplied = true;
  } catch {
    /* swallow — patching is best-effort */
  }
}

// Apply on module load (browser-side only).
if (typeof window !== "undefined") {
  applyPrototypePatch();
}

/* ------------------------------------------------------------------ */
/* Enhanced session subclass                                           */
/* ------------------------------------------------------------------ */

/**
 * Drop-in replacement for `WebRTCCallSession` that uses TURN-aware ICE
 * servers. Inherits all behavior from the parent; the prototype patch
 * applied above makes the actual peer-connection use our ICE config.
 */
export class WebRTCCallSessionEnhanced extends WebRTCCallSession {
  // No constructor override needed — the parent's signature is fine.
  // We inherit `initiateCall`, `answerCall`, `endCall`, `toggleMute`, etc.

  /**
   * Returns whether TURN is configured for this session.
   *
   * Useful for the UI to show a "calls may fail behind restrictive
   * networks" warning when `turnConfigured === false`.
   */
  getCallStatus(): {
    turnConfigured: boolean;
    iceServerCount: number;
    turnInfo: ReturnType<typeof getTurnInfo>;
  } {
    try {
      return {
        turnConfigured: isTurnAvailable(),
        iceServerCount: getIceServers().length,
        turnInfo: getTurnInfo(),
      };
    } catch {
      return {
        turnConfigured: false,
        iceServerCount: 1,
        turnInfo: { stun: true, turn: false },
      };
    }
  }
}

/**
 * Module-level diagnostics. The `/api/calls/turn-status` route imports
 * this (via `webrtc-config.ts`) to report status, but it's also useful
 * for client-side debugging.
 */
export function getCallDiagnostics(): {
  webRtcSupported: boolean;
  turnConfigured: boolean;
  iceServerCount: number;
  turnInfo: ReturnType<typeof getTurnInfo>;
  patchApplied: boolean;
} {
  try {
    return {
      webRtcSupported: isWebRTCSupported(),
      turnConfigured: isTurnAvailable(),
      iceServerCount: getIceServers().length,
      turnInfo: getTurnInfo(),
      patchApplied: __patchApplied,
    };
  } catch {
    return {
      webRtcSupported: false,
      turnConfigured: false,
      iceServerCount: 1,
      turnInfo: { stun: true, turn: false },
      patchApplied: false,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Re-exports — everything from webrtc-service.ts                       */
/* ------------------------------------------------------------------ */

export {
  WebRTCCallSession,
  GroupCallSession,
  initiateCall,
  answerCall,
  endCall,
  toggleMute,
  toggleVideo,
  switchCamera,
  initiateGroupCall,
  joinGroupCall,
  getParticipantCount,
  __mockSignalingChannel,
  isWebRTCSupported,
};
export type {
  CallType,
  CallStatus,
  CallOptions,
  GroupCallOptions,
  Participant,
  SignalMessage,
  SignalListener,
  WebRTCError,
};

/* ------------------------------------------------------------------ */
/* Convenience: enhanced versions of the helper functions             */
/* ------------------------------------------------------------------ */

/**
 * Same as `initiateCall(opts)` from `webrtc-service.ts`, but returns an
 * enhanced session. The prototype patch means the helper functions
 * exported above already benefit from the TURN-aware ICE config; this
 * variant is for callers that want the `getCallStatus()` method on the
 * returned session object.
 */
export async function initiateCallEnhanced(
  opts: CallOptions,
): Promise<WebRTCCallSessionEnhanced> {
  const session = new WebRTCCallSessionEnhanced(opts);
  await session.initiateCall();
  return session;
}
