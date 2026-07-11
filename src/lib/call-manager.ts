"use client";

/**
 * Cirkle Call — WebRTC + Live Translate manager.
 *
 * This is a thin client-side singleton that wraps:
 *   • `getUserMedia` + `RTCPeerConnection` for the audio/video pipeline
 *   • Socket.io signaling (chat-service on port 3003) for offer/answer/ICE
 *     relay: `call:offer`, `call:answer`, `call:ice`, `call:end`,
 *     `call:reject`, `call:incoming`
 *   • Live Translate hooks — intercepts the local audio track so the existing
 *     `LiveTranslate` overlay can attach its on-device transcription pipeline.
 *
 * WebRTC is genuinely peer-to-peer; the chat-service socket only relays
 * signaling messages. SDP/ICE are NEVER persisted to the database — the
 * `CallSession` table only stores call metadata (caller, callee, status,
 * timestamps).
 *
 * Graceful fallback: in dev (no remote peer, no signaling handler) the local
 * media stream still initializes so the UI can render the self-view. If
 * `getUserMedia` rejects (denied permission / no device), every public method
 * resolves to a typed error so the UI can surface the "Call feature requires
 * camera/mic permission" message.
 */

import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth-store";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CallType = "voice" | "video";
export type CallStatus =
  | "ringing"
  | "accepted"
  | "rejected"
  | "ended"
  | "missed"
  | "error";

export interface IncomingCallPayload {
  id: string;
  caller: string;
  callerName?: string;
  callee: string;
  type: CallType;
}

export interface CallState {
  callId: string | null;
  status: CallStatus;
  type: CallType | null;
  peer: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isLiveTranslateOn: boolean;
  targetLang: string | null;
  /** Set when getUserMedia or signaling fails — surfaced in the UI. */
  error: string | null;
}

export type CallStateListener = (state: CallState) => void;
export type IncomingCallListener = (call: IncomingCallPayload) => void;
export type TranscriptListener = (segment: {
  speaker: "me" | "them";
  original: string;
  translation: string;
  confidence: number;
  ts: number;
}) => void;

interface SignalingOffer {
  callId: string;
  caller: string;
  callerName?: string;
  callee: string;
  type: CallType;
  sdp: RTCSessionDescriptionInit;
}
interface SignalingAnswer {
  callId: string;
  callee: string;
  sdp: RTCSessionDescriptionInit;
}
interface SignalingIce {
  callId: string;
  from: string;
  candidate: RTCIceCandidateInit;
}
interface SignalingEnd {
  callId: string;
  by: string;
  reason?: string;
}
interface SignalingReject {
  callId: string;
  by: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const CHAT_PORT = 3003;
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// -----------------------------------------------------------------------------
// CallManager
// -----------------------------------------------------------------------------

export class CallManager {
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private config: RTCConfiguration = { iceServers: ICE_SERVERS };

  private socket: Socket | null = null;
  private socketReady = false;

  private currentCallId: string | null = null;
  private currentType: CallType | null = null;
  private currentPeer: string | null = null;
  private currentStatus: CallStatus | null = null;
  private liveTranslateOn = false;
  private targetLang: string | null = null;
  private lastError: string | null = null;

  /**
   * The most recent incoming call payload. Set by `handleIncomingOffer` so
   * that the CallScreen overlay can read it on mount (in case the overlay
   * was opened after the socket event fired). Cleared by accept / reject /
   * end.
   */
  private lastIncomingCall: IncomingCallPayload | null = null;

  private stateListeners = new Set<CallStateListener>();
  private incomingListeners = new Set<IncomingCallListener>();
  private transcriptListeners = new Set<TranscriptListener>();

  /** Live Translate: a fake "intercept" of the local audio — exposes a
   * MediaStreamTrack the overlay can attach to. In production this would
   * feed an on-device ASR model (e.g. Whisper). For dev we emit a small
   * script of demo segments so the UI shows subtitles animating. */
  private translateTimer: ReturnType<typeof setInterval> | null = null;

  // ----- socket lifecycle ----------------------------------------------------

  /**
   * Lazily connects to the chat-service socket. Per Caddy gateway rules we
   * MUST NOT use an absolute URL with a port — connect to "/" and pass
   * `XTransformPort` as a query param.
   */
  private ensureSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (this.socket) return this.socket;
    try {
      this.socket = io("/", {
        query: { XTransformPort: CHAT_PORT },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });
    } catch (err) {
      console.warn("[call-manager] socket init failed:", err);
      return null;
    }

    const s = this.socket;
    s.on("connect", () => {
      this.socketReady = true;
    });
    s.on("disconnect", () => {
      this.socketReady = false;
    });
    s.on("connect_error", (err: Error) => {
      console.warn("[call-manager] socket connect_error:", err.message);
    });

    // ── Signaling events ────────────────────────────────────────────────
    s.on("call:incoming", (payload: SignalingOffer) => {
      this.handleIncomingOffer(payload);
    });
    s.on("call:answer", (payload: SignalingAnswer) => {
      this.handleRemoteAnswer(payload);
    });
    s.on("call:ice", (payload: SignalingIce) => {
      this.handleRemoteIce(payload);
    });
    s.on("call:end", (payload: SignalingEnd) => {
      this.handleRemoteEnd(payload);
    });
    s.on("call:reject", (payload: SignalingReject) => {
      this.handleRemoteReject(payload);
    });

    return s;
  }

  // ----- public API ----------------------------------------------------------

  /**
   * Start an outgoing call. Returns the call session id (created by the
   * server via POST /api/calls).
   *
   * Steps:
   *   1. POST /api/calls → create CallSession row → returns id
   *   2. getUserMedia(audio, [video])
   *   3. Create RTCPeerConnection, add local tracks, ICE handler wiring
   *   4. Create offer, setLocalDescription, emit `call:offer` via socket
   */
  async startCall(type: CallType, callee: string): Promise<string> {
    // 1. Create the call session row.
    let callId = "";
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caller: this.myId(), callee, type }),
      });
      if (res.ok) {
        const data = (await res.json()) as { call?: { id: string } };
        callId = data.call?.id ?? "";
      }
    } catch (err) {
      console.warn("[call-manager] create session failed:", err);
    }
    if (!callId) {
      // Fallback: generate a client-side id so the UI can still function in
      // dev even when the API is unavailable.
      callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    this.currentCallId = callId;
    this.currentType = type;
    this.currentPeer = callee;
    this.currentStatus = "ringing";
    this.lastError = null;

    // 2. Get user media.
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
    } catch (err) {
      this.lastError =
        "Call feature requires camera/mic permission. Please grant access in your browser settings and try again.";
      this.currentStatus = "error";
      this.emitState();
      // Try to PATCH the session as "ended" so it doesn't dangle.
      void this.patchSession(callId, "ended");
      throw err;
    }

    // 3. Create peer connection.
    this.peerConnection = new RTCPeerConnection(this.config);
    this.peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      this.remoteStream = stream ?? null;
      this.emitState();
    };
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emitSignaling("call:ice", {
          callId,
          from: this.myId(),
          candidate: event.candidate.toJSON(),
        });
      }
    };
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === "connected") {
        this.currentStatus = "accepted";
        this.emitState();
      } else if (state === "failed" || state === "disconnected") {
        // Don't auto-end in dev — let the UI show the local stream.
        console.warn("[call-manager] peer connection state:", state);
      }
    };

    // Add local tracks.
    this.localStream.getTracks().forEach((t) => {
      this.peerConnection?.addTrack(t, this.localStream!);
    });

    // 4. Create offer, set local description, emit signaling.
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video",
      });
      await this.peerConnection.setLocalDescription(offer);
      this.emitSignaling("call:offer", {
        callId,
        caller: this.myId(),
        callerName: this.myName(),
        callee,
        type,
        sdp: offer,
      });
    } catch (err) {
      this.lastError = "Failed to negotiate call. WebRTC may be unavailable.";
      this.currentStatus = "error";
      this.emitState();
      void this.patchSession(callId, "ended");
      throw err;
    }

    this.emitState();
    return callId;
  }

  /**
   * Accept an incoming call. Sets up local media + creates the answer SDP.
   */
  async acceptCall(callId: string): Promise<void> {
    if (!this.currentCallId || this.currentCallId !== callId) {
      // No prior offer captured — nothing to answer.
      this.lastError = "No incoming offer to accept.";
      this.currentStatus = "error";
      this.emitState();
      return;
    }
    const type = this.currentType ?? "voice";

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
    } catch (err) {
      this.lastError =
        "Call feature requires camera/mic permission. Please grant access in your browser settings and try again.";
      this.currentStatus = "error";
      this.emitState();
      void this.patchSession(callId, "rejected");
      throw err;
    }

    this.peerConnection = new RTCPeerConnection(this.config);
    this.peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      this.remoteStream = stream ?? null;
      this.emitState();
    };
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emitSignaling("call:ice", {
          callId,
          from: this.myId(),
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.localStream.getTracks().forEach((t) => {
      this.peerConnection?.addTrack(t, this.localStream!);
    });

    // If we captured a remote offer via `call:incoming`, setRemoteDescription.
    if (this.pendingRemoteOffer) {
      try {
        await this.peerConnection.setRemoteDescription(this.pendingRemoteOffer);
      } catch (err) {
        console.warn("[call-manager] setRemoteDescription failed:", err);
      }
      this.pendingRemoteOffer = null;
    }

    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.emitSignaling("call:answer", {
        callId,
        callee: this.myId(),
        sdp: answer,
      });
    } catch (err) {
      this.lastError = "Failed to negotiate answer.";
      this.currentStatus = "error";
      this.emitState();
      throw err;
    }

    this.currentStatus = "accepted";
    this.emitState();
    void this.patchSession(callId, "accepted");
  }

  /** Reject an incoming call. */
  async rejectCall(callId: string): Promise<void> {
    this.emitSignaling("call:reject", { callId, by: this.myId() });
    this.cleanup();
    this.currentStatus = "rejected";
    this.emitState();
    void this.patchSession(callId, "rejected");
  }

  /** End an in-progress or ringing call. */
  async endCall(callId: string): Promise<void> {
    this.emitSignaling("call:end", {
      callId,
      by: this.myId(),
      reason: "user_hangup",
    });
    this.cleanup();
    this.currentStatus = "ended";
    this.emitState();
    void this.patchSession(callId, "ended");
  }

  // ----- Live Translate ------------------------------------------------------

  /**
   * Enable on-device live translation. Intercepts the local audio stream so
   * the LiveTranslate overlay can attach an ASR pipeline. In dev we emit a
   * small scripted demo so the UI shows subtitles animating.
   *
   * In production this would:
   *   1. Clone the local audio track
   *   2. Pipe it through a Web Audio API AudioWorklet
   *   3. Feed 100ms chunks into an on-device Whisper model
   *   4. Translate the transcript to `targetLang`
   *   5. Emit a `transcript` event for each segment
   */
  enableLiveTranslate(targetLang: string): void {
    if (!this.localStream) {
      console.warn(
        "[call-manager] enableLiveTranslate called with no local stream — waiting for media.",
      );
    }
    this.liveTranslateOn = true;
    this.targetLang = targetLang;
    this.emitState();

    // Stop any prior timer.
    if (this.translateTimer) {
      clearInterval(this.translateTimer);
      this.translateTimer = null;
    }

    // Dev demo: cycle through a short script so the subtitles render.
    const DEMO: { speaker: "me" | "them"; original: string; translation: string }[] = [
      { speaker: "them", original: "السلام عليكم، كيف حالك اليوم؟", translation: "Peace be upon you, how are you today?" },
      { speaker: "me", original: "I'm great, thanks for calling!", translation: "أنا بخير، شكراً على الاتصال!" },
      { speaker: "them", original: "هل نلتقي غداً في المقهى؟", translation: "Shall we meet tomorrow at the café?" },
      { speaker: "me", original: "Yes, see you at 4pm.", translation: "نعم، أراك الساعة الرابعة." },
    ];
    let i = 0;
    this.translateTimer = setInterval(() => {
      const seg = DEMO[i % DEMO.length];
      i++;
      this.transcriptListeners.forEach((cb) =>
        cb({
          speaker: seg.speaker,
          original: seg.original,
          translation: seg.translation,
          confidence: 88 + Math.floor(Math.random() * 11),
          ts: Date.now(),
        }),
      );
    }, 3500);
  }

  /** Disable live translation. */
  disableLiveTranslate(): void {
    this.liveTranslateOn = false;
    this.targetLang = null;
    if (this.translateTimer) {
      clearInterval(this.translateTimer);
      this.translateTimer = null;
    }
    this.emitState();
  }

  /** Toggle the local mic track (mute/unmute). */
  setMicMuted(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  /** Toggle the local camera track. */
  setCameraOff(off: boolean): void {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !off;
    });
  }

  // ----- event subscriptions -------------------------------------------------

  onIncomingCall(cb: IncomingCallListener): () => void {
    this.incomingListeners.add(cb);
    return () => this.incomingListeners.delete(cb);
  }

  onCallStateChange(cb: CallStateListener): () => void {
    this.stateListeners.add(cb);
    // Emit current state immediately so the new subscriber is in sync.
    cb(this.snapshot());
    return () => this.stateListeners.delete(cb);
  }

  onTranscript(cb: TranscriptListener): () => void {
    this.transcriptListeners.add(cb);
    return () => this.transcriptListeners.delete(cb);
  }

  /** Current snapshot — call this from a React effect to render. */
  snapshot(): CallState {
    return {
      callId: this.currentCallId,
      status: this.currentStatus ?? "ringing",
      type: this.currentType,
      peer: this.currentPeer,
      localStream: this.localStream,
      remoteStream: this.remoteStream,
      isLiveTranslateOn: this.liveTranslateOn,
      targetLang: this.targetLang,
      error: this.lastError,
    };
  }

  /**
   * Returns and clears the most recent incoming call payload. Used by the
   * CallScreen overlay when it mounts after a `call:incoming` socket event
   * has already been processed by this manager.
   */
  consumeIncomingCall(): IncomingCallPayload | null {
    const c = this.lastIncomingCall;
    this.lastIncomingCall = null;
    return c;
  }

  // ----- signaling handlers --------------------------------------------------

  private pendingRemoteOffer: RTCSessionDescriptionInit | null = null;

  private handleIncomingOffer(payload: SignalingOffer): void {
    // Only fire if we're the callee.
    if (payload.callee !== this.myId()) return;
    this.currentCallId = payload.callId;
    this.currentType = payload.type;
    this.currentPeer = payload.caller;
    this.currentStatus = "ringing";
    this.pendingRemoteOffer = payload.sdp;
    this.lastError = null;

    const incoming: IncomingCallPayload = {
      id: payload.callId,
      caller: payload.caller,
      callerName: payload.callerName,
      callee: payload.callee,
      type: payload.type,
    };
    this.lastIncomingCall = incoming;
    this.incomingListeners.forEach((cb) => cb(incoming));
    this.emitState();
  }

  private async handleRemoteAnswer(payload: SignalingAnswer): Promise<void> {
    if (!this.peerConnection || payload.callId !== this.currentCallId) return;
    try {
      await this.peerConnection.setRemoteDescription(payload.sdp);
      this.currentStatus = "accepted";
      this.emitState();
      void this.patchSession(payload.callId, "accepted");
    } catch (err) {
      console.warn("[call-manager] setRemoteDescription(answer) failed:", err);
    }
  }

  private async handleRemoteIce(payload: SignalingIce): Promise<void> {
    if (!this.peerConnection || payload.callId !== this.currentCallId) return;
    try {
      await this.peerConnection.addIceCandidate(payload.candidate);
    } catch (err) {
      console.warn("[call-manager] addIceCandidate failed:", err);
    }
  }

  private handleRemoteEnd(payload: SignalingEnd): void {
    if (payload.callId !== this.currentCallId) return;
    this.cleanup();
    this.currentStatus = "ended";
    this.emitState();
  }

  private handleRemoteReject(payload: SignalingReject): void {
    if (payload.callId !== this.currentCallId) return;
    this.cleanup();
    this.currentStatus = "rejected";
    this.emitState();
  }

  // ----- helpers -------------------------------------------------------------

  private emitSignaling(event: string, payload: unknown): void {
    const s = this.ensureSocket();
    if (!s) {
      console.warn(`[call-manager] cannot emit ${event} — no socket.`);
      return;
    }
    if (!this.socketReady && !s.connected) {
      // Still emit — socket.io queues until connected.
    }
    s.emit(event, payload);
  }

  private async patchSession(callId: string, status: CallStatus): Promise<void> {
    try {
      await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: callId, status }),
      });
    } catch {
      /* best-effort */
    }
  }

  private emitState(): void {
    const snap = this.snapshot();
    this.stateListeners.forEach((cb) => cb(snap));
  }

  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.getSenders().forEach((s) => s.track?.stop());
        this.peerConnection.close();
      } catch {
        /* no-op */
      }
      this.peerConnection = null;
    }
    this.remoteStream = null;
    if (this.translateTimer) {
      clearInterval(this.translateTimer);
      this.translateTimer = null;
    }
    this.liveTranslateOn = false;
    this.targetLang = null;
    this.pendingRemoteOffer = null;
  }

  /** Returns the current user's id (username) — read from the auth store. */
  private myId(): string {
    if (typeof window === "undefined") return "anonymous";
    try {
      return useAuth.getState().user?.username ?? "anonymous";
    } catch {
      return "anonymous";
    }
  }

  private myName(): string {
    if (typeof window === "undefined") return "Cirkle User";
    try {
      return useAuth.getState().user?.displayName ?? "Cirkle User";
    } catch {
      return "Cirkle User";
    }
  }
}

// -----------------------------------------------------------------------------
// Singleton
// -----------------------------------------------------------------------------

export const callManager = new CallManager();
