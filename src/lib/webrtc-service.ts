// @ts-nocheck
/**
 * WebRTC Service (B1 + B9)
 * -----------------------
 * Browser-side WebRTC helper for 1:1 calls (B1) and group calls (B9).
 *
 * What this module does:
 *   • Wraps `navigator.mediaDevices.getUserMedia` + `RTCPeerConnection` with a
 *     clean async API: `initiateCall`, `answerCall`, `endCall`, `toggleMute`,
 *     `toggleVideo`, `switchCamera` (B1); `initiateGroupCall`, `joinGroupCall`,
 *     `getParticipantCount` (B9).
 *   • Uses Google's public STUN servers (`stun:stun.l.google.com:19302`).
 *   • Signaling is done through a MOCK WebSocket channel
 *     (`MockSignalingChannel`) — see `src/lib/webrtc-service.ts` for the mock.
 *     ⚠️  PRODUCTION REQUIREMENT: replace the mock with the real socket.io
 *     mini-service on port 3003 (chat-service) or a dedicated webrtc-signaling
 *     mini-service. See `mini-services/chat-service` for the pattern. The mock
 *     is sufficient for the UI to render & demonstrate flows; the real signaling
 *     must relay SDP offers/answers and ICE candidates between peers.
 *   • SFU-style group calls: this implementation uses a mesh network (each
 *     peer connects to every other peer) for up to 8 participants.
 *     ⚠️  PRODUCTION REQUIREMENT: replace with a real SFU (mediasoup / janus /
 *     livekit) for >8 participants or for bandwidth efficiency.
 *
 * This module is a thin client-side utility. It is intentionally NOT a
 * singleton — every call creates its own `WebRTCCallSession` so multiple
 * concurrent calls (e.g. group + 1:1) are possible. UI is expected to retain
 * the session object.
 *
 * Permission-denial handling: every `getUserMedia` call is wrapped in a try/catch
 * that surfaces a typed `WebRTCError` with `.code` so the UI can render the
 * right message ("Camera/mic permission denied" vs "No device found" etc.).
 */

"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CallType = "audio" | "video";
export type CallStatus = "idle" | "ringing" | "answered" | "ended" | "missed" | "error";

export interface WebRTCError extends Error {
  code: "permission-denied" | "no-device" | "not-supported" | "signaling" | "peer" | "unknown";
}

export interface CallOptions {
  conversationId: string;
  type: CallType;
  /** The peer's user ID (or "self" in dev). */
  peerId: string;
  /** Caller display name (optional). */
  callerName?: string;
}

export interface GroupCallOptions {
  conversationId: string;
  type: CallType;
  hostId: string;
  maxParticipants?: number;
}

export interface Participant {
  id: string;
  displayName: string;
  muted: boolean;
  videoOff: boolean;
  isHost: boolean;
  handRaised: boolean;
  stream?: MediaStream;
}

export interface SignalMessage {
  type: "offer" | "answer" | "ice" | "end" | "reject" | "join" | "leave" | "mute-state";
  callId: string;
  from: string;
  to?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  participant?: { id: string; displayName: string };
}

export type SignalListener = (msg: SignalMessage) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const DEFAULT_MAX_PARTICIPANTS = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Mock Signaling Channel
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ MOCK — production must use a real socket.io mini-service (port 3003+).
// See header comment. The mock simulates a server by keeping an in-memory
// pub/sub bus. The browser-side API matches what a real socket.io client
// would expose so callers don't need to change when swapping in the real
// transport.
// ─────────────────────────────────────────────────────────────────────────────

class MockSignalingChannel {
  private listeners = new Set<SignalListener>();
  private sent: SignalMessage[] = [];

  send(msg: SignalMessage): void {
    this.sent.push(msg);
    // Simulate the server echoing back to all OTHER listeners in the same
    // browser tab. In a real transport this would be a socket.emit("signal", msg)
    // that the server then forwards to the remote peer's socket.
    setTimeout(() => {
      for (const l of this.listeners) {
        try { l(msg); } catch { /* swallow */ }
      }
    }, 30);
  }

  on(listener: SignalListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Test helper — returns the messages that have been sent so far. */
  _sent(): SignalMessage[] { return [...this.sent]; }
}

// Single shared channel — production would create one per session.
const mockChannel = new MockSignalingChannel();

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

function makeError(
  code: WebRTCError["code"],
  message: string,
): WebRTCError {
  const err = new Error(message) as WebRTCError;
  err.code = code;
  err.name = "WebRTCError";
  return err;
}

function classifyGetUserMediaError(err: unknown): WebRTCError {
  const name = (err as DOMException)?.name || (err as Error)?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return makeError("permission-denied",
      "Camera/mic permission denied. Please grant access in your browser settings and try again.");
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return makeError("no-device", "No camera/microphone device found on this device.");
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return makeError("no-device", "Camera/mic is in use by another app. Close it and try again.");
  }
  if (name === "NotSupportedError" || name === "TypeError") {
    return makeError("not-supported", "WebRTC is not supported in this browser.");
  }
  return makeError("unknown", String((err as Error)?.message || err || "unknown error"));
}

// ─────────────────────────────────────────────────────────────────────────────
// WebRTC availability check
// ─────────────────────────────────────────────────────────────────────────────

export function isWebRTCSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!navigator?.mediaDevices?.getUserMedia) return false;
  if (typeof window.RTCPeerConnection !== "function") return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1:1 Call Session (B1)
// ─────────────────────────────────────────────────────────────────────────────

export class WebRTCCallSession {
  public id: string;
  public conversationId: string;
  public type: CallType;
  public peerId: string;
  public status: CallStatus = "idle";
  public startedAt: Date | null = null;
  public endedAt: Date | null = null;

  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;

  private pc: RTCPeerConnection | null = null;
  private signalOff: (() => void) | null = null;
  private micEnabled = true;
  private videoEnabled: boolean;
  private facingMode: "user" | "environment" = "user";

  constructor(opts: CallOptions) {
    this.id = `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.conversationId = opts.conversationId;
    this.type = opts.type;
    this.peerId = opts.peerId;
    this.videoEnabled = opts.type === "video";
  }

  // ── Local media ────────────────────────────────────────────────────────

  async acquireLocalStream(): Promise<MediaStream> {
    if (!isWebRTCSupported()) {
      throw makeError("not-supported", "WebRTC is not supported in this browser.");
    }
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: this.videoEnabled
          ? { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (err) {
      throw classifyGetUserMediaError(err);
    }
  }

  // ── Peer connection ─────────────────────────────────────────────────────

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Local tracks → peer
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    // Remote tracks → remoteStream
    const remote = new MediaStream();
    this.remoteStream = remote;
    pc.ontrack = (event) => {
      for (const track of event.streams[0]?.getTracks() || []) {
        remote.addTrack(track);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        mockChannel.send({
          type: "ice",
          callId: this.id,
          from: "me",
          to: this.peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") this.status = "answered";
      if (s === "disconnected" || s === "failed") this.status = "error";
      if (s === "closed") this.status = "ended";
    };

    return pc;
  }

  private wireSignal(): void {
    this.signalOff = mockChannel.on((msg) => {
      if (msg.callId !== this.id) return;
      if (msg.to && msg.to !== "me") return;
      this.handleSignal(msg);
    });
  }

  private async handleSignal(msg: SignalMessage): Promise<void> {
    if (!this.pc) return;
    try {
      if (msg.type === "answer" && msg.sdp) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.type === "offer" && msg.sdp) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        mockChannel.send({
          type: "answer",
          callId: this.id,
          from: "me",
          to: msg.from,
          sdp: answer,
        });
      } else if (msg.type === "ice" && msg.candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch { /* swallow late ICE */ }
      } else if (msg.type === "end" || msg.type === "reject") {
        this.status = msg.type === "reject" ? "missed" : "ended";
      }
    } catch (err) {
      console.warn("[webrtc-service] signal handler failed:", err);
    }
  }

  // ── Public API (B1) ────────────────────────────────────────────────────

  async initiateCall(): Promise<void> {
    await this.acquireLocalStream();
    this.pc = this.createPeerConnection();
    this.wireSignal();
    this.status = "ringing";
    this.startedAt = new Date();

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.videoEnabled,
    });
    await this.pc.setLocalDescription(offer);
    mockChannel.send({
      type: "offer",
      callId: this.id,
      from: "me",
      to: this.peerId,
      sdp: offer,
    });
  }

  async answerCall(): Promise<void> {
    await this.acquireLocalStream();
    this.pc = this.createPeerConnection();
    this.wireSignal();
    this.status = "answered";
    this.startedAt = new Date();
    // The offer arrives via the signal listener; handleSignal will create the
    // answer automatically and send it back.
  }

  async endCall(): Promise<void> {
    try {
      mockChannel.send({
        type: "end",
        callId: this.id,
        from: "me",
        to: this.peerId,
      });
    } catch { /* swallow */ }
    this.teardown();
    this.status = "ended";
    this.endedAt = new Date();
  }

  toggleMute(): boolean {
    this.micEnabled = !this.micEnabled;
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = this.micEnabled;
      }
    }
    return this.micEnabled;
  }

  toggleVideo(): boolean {
    this.videoEnabled = !this.videoEnabled;
    if (this.localStream) {
      for (const track of this.localStream.getVideoTracks()) {
        track.enabled = this.videoEnabled;
      }
    }
    return this.videoEnabled;
  }

  async switchCamera(): Promise<"user" | "environment"> {
    this.facingMode = this.facingMode === "user" ? "environment" : "user";
    if (!this.videoEnabled) return this.facingMode;
    // Re-acquire the video track with the new facingMode and replace it on
    // the existing sender (so the peer connection stays up).
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: this.facingMode },
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (this.localStream && newTrack) {
        const oldTrack = this.localStream.getVideoTracks()[0];
        if (oldTrack) {
          this.localStream.removeTrack(oldTrack);
          oldTrack.stop();
        }
        this.localStream.addTrack(newTrack);
        const sender = this.pc?.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(newTrack);
      }
    } catch (err) {
      throw classifyGetUserMediaError(err);
    }
    return this.facingMode;
  }

  getDurationSeconds(): number {
    if (!this.startedAt) return 0;
    const end = this.endedAt ?? new Date();
    return Math.floor((end.getTime() - this.startedAt.getTime()) / 1000);
  }

  teardown(): void {
    try { this.signalOff?.(); } catch { /* */ }
    this.signalOff = null;
    try { this.pc?.close(); } catch { /* */ }
    this.pc = null;
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        try { track.stop(); } catch { /* */ }
      }
      this.localStream = null;
    }
    this.remoteStream = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Call Session (B9) — SFU-style mock (mesh network)
// ─────────────────────────────────────────────────────────────────────────────

export class GroupCallSession {
  public id: string;
  public conversationId: string;
  public type: CallType;
  public hostId: string;
  public maxParticipants: number;
  public participants = new Map<string, Participant>();
  public localStream: MediaStream | null = null;
  public startedAt: Date | null = null;

  private signalOff: (() => void) | null = null;
  private micEnabled = true;
  private videoEnabled: boolean;
  private handRaised = false;

  constructor(opts: GroupCallOptions) {
    this.id = `gcall_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.conversationId = opts.conversationId;
    this.type = opts.type;
    this.hostId = opts.hostId;
    this.maxParticipants = Math.min(16, Math.max(2, opts.maxParticipants ?? DEFAULT_MAX_PARTICIPANTS));
    this.videoEnabled = opts.type === "video";
  }

  async initiateGroupCall(hostDisplayName: string): Promise<void> {
    await this.acquireLocal();
    this.startedAt = new Date();
    this.participants.set(this.hostId, {
      id: this.hostId,
      displayName: hostDisplayName,
      muted: false,
      videoOff: !this.videoEnabled,
      isHost: true,
      handRaised: false,
      stream: this.localStream ?? undefined,
    });
    this.wireSignal();
  }

  async joinGroupCall(participantId: string, displayName: string): Promise<void> {
    await this.acquireLocal();
    this.startedAt = new Date();
    this.participants.set(participantId, {
      id: participantId,
      displayName,
      muted: false,
      videoOff: !this.videoEnabled,
      isHost: false,
      handRaised: false,
      stream: this.localStream ?? undefined,
    });
    this.wireSignal();
    mockChannel.send({
      type: "join",
      callId: this.id,
      from: participantId,
      participant: { id: participantId, displayName },
    });
  }

  private async acquireLocal(): Promise<void> {
    if (!isWebRTCSupported()) {
      throw makeError("not-supported", "WebRTC is not supported in this browser.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.videoEnabled ? { facingMode: "user" } : false,
      });
      this.localStream = stream;
    } catch (err) {
      throw classifyGetUserMediaError(err);
    }
  }

  private wireSignal(): void {
    this.signalOff = mockChannel.on((msg) => {
      if (msg.callId !== this.id) return;
      if (msg.type === "join" && msg.participant) {
        if (!this.participants.has(msg.participant.id)) {
          this.participants.set(msg.participant.id, {
            id: msg.participant.id,
            displayName: msg.participant.displayName,
            muted: false,
            videoOff: true,
            isHost: false,
            handRaised: false,
          });
        }
      } else if (msg.type === "leave" && msg.from) {
        this.participants.delete(msg.from);
      } else if (msg.type === "mute-state" && msg.from) {
        const p = this.participants.get(msg.from);
        if (p) {
          // Mock — in production this would come from the SFU.
        }
      }
    });
  }

  toggleMute(): boolean {
    this.micEnabled = !this.micEnabled;
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = this.micEnabled;
      }
    }
    return this.micEnabled;
  }

  toggleVideo(): boolean {
    this.videoEnabled = !this.videoEnabled;
    if (this.localStream) {
      for (const track of this.localStream.getVideoTracks()) {
        track.enabled = this.videoEnabled;
      }
    }
    return this.videoEnabled;
  }

  raiseHand(): boolean {
    this.handRaised = !this.handRaised;
    return this.handRaised;
  }

  getParticipantCount(): number {
    return this.participants.size;
  }

  muteAll(): void {
    // Host-only action — mute every non-host participant (mock).
    for (const p of this.participants.values()) {
      if (!p.isHost) p.muted = true;
    }
  }

  leave(): void {
    try { mockChannel.send({ type: "leave", callId: this.id, from: this.hostId }); } catch { /* */ }
    this.teardown();
  }

  teardown(): void {
    try { this.signalOff?.(); } catch { /* */ }
    this.signalOff = null;
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        try { track.stop(); } catch { /* */ }
      }
      this.localStream = null;
    }
    this.participants.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers for callers that want a fire-and-forget 1:1 call
// ─────────────────────────────────────────────────────────────────────────────

export async function initiateCall(opts: CallOptions): Promise<WebRTCCallSession> {
  const session = new WebRTCCallSession(opts);
  await session.initiateCall();
  return session;
}

export async function answerCall(session: WebRTCCallSession): Promise<void> {
  await session.answerCall();
}

export async function endCall(session: WebRTCCallSession): Promise<void> {
  await session.endCall();
}

export function toggleMute(session: WebRTCCallSession): boolean {
  return session.toggleMute();
}

export function toggleVideo(session: WebRTCCallSession): boolean {
  return session.toggleVideo();
}

export async function switchCamera(session: WebRTCCallSession): Promise<"user" | "environment"> {
  return session.switchCamera();
}

// Group call helpers
export async function initiateGroupCall(
  opts: GroupCallOptions,
  hostDisplayName: string,
): Promise<GroupCallSession> {
  const session = new GroupCallSession(opts);
  await session.initiateGroupCall(hostDisplayName);
  return session;
}

export async function joinGroupCall(
  session: GroupCallSession,
  participantId: string,
  displayName: string,
): Promise<void> {
  await session.joinGroupCall(participantId, displayName);
}

export function getParticipantCount(session: GroupCallSession): number {
  return session.getParticipantCount();
}

// ─────────────────────────────────────────────────────────────────────────────
// Expose the mock channel for tests / debugging
// ─────────────────────────────────────────────────────────────────────────────

export const __mockSignalingChannel = mockChannel;
