// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  X, Mic, MicOff, Video, VideoOff, PhoneOff, Hand, Users, Loader2,
  AlertTriangle, Crown, Volume2, MoreVertical,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GroupCallSession,
  isWebRTCSupported,
  type WebRTCError,
  type Participant,
  type CallType,
} from "@/lib/webrtc-service";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StartDetail {
  conversationId?: string;
  type?: CallType;
  hostId?: string;
  hostName?: string;
}

const AVATAR_COLORS = [
  "from-emerald-500/40 to-teal-500/30",
  "from-rose-500/40 to-pink-500/30",
  "from-amber-500/40 to-orange-500/30",
  "from-sky-500/40 to-indigo-500/30",
  "from-violet-500/40 to-purple-500/30",
  "from-lime-500/40 to-green-500/30",
  "from-cyan-500/40 to-blue-500/30",
  "from-fuchsia-500/40 to-pink-500/30",
];

function colorFor(id: string, i: number): string {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

function initials(name: string): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

/**
 * Group Video Call overlay (B9).
 *
 * Opens via `circle:group-video-call` event with `{ conversationId }`.
 *
 * Layout:
 *   • 2×N grid for up to 8 participants (responsive: 2 cols mobile, 4 desktop).
 *   • Active speaker = green ring + larger tile (mock: the host is always
 *     the active speaker until real SFU level detection is wired in).
 *   • Bottom control bar: mute, video, raise hand, mute-all (host only),
 *     end call.
 *
 * Implementation:
 *   • Uses the `GroupCallSession` class from webrtc-service.ts.
 *   • Real audio/video is mesh-networked (each peer connects to every other)
 *     which works for ≤8 participants. Production needs a real SFU
 *     (mediasoup / janus / livekit) — see webrtc-service.ts header.
 */
export function GroupVideoCall({ open, onClose }: Props) {
  const supported = isWebRTCSupported();
  const [session, setSession] = useState<GroupCallSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [callType, setCallType] = useState<CallType>("video");
  const [conversationId, setConversationId] = useState("");
  const [hostName, setHostName] = useState("Host");
  const [isHost, setIsHost] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset on close ──────────────────────────────────────────────────────
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setTimeout(() => {
        session?.teardown();
        setSession(null);
        setError(null);
        setParticipants([]);
        setMicOn(true);
        setVideoOn(false);
        setHandRaised(false);
      }, 0);
    }
  }

  // ── Attach local video ───────────────────────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current && session?.localStream) {
      localVideoRef.current.srcObject = session.localStream;
      void localVideoRef.current.play().catch(() => {});
    }
  }, [session?.localStream]);

  // ── Poll participant list ─────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    pollRef.current = setInterval(() => {
      setParticipants([...session.participants.values()]);
      setActiveSpeaker(session.hostId);
    }, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session]);

  // ── Listen for events ─────────────────────────────────────────────────────
  // (Moved below `startCall` declaration — see "Start call" section.)

  // ── Start call ────────────────────────────────────────────────────────────
  const startCall = async (cid: string, type: CallType, host: string) => {
    setError(null);
    if (!supported) {
      setError("WebRTC is not supported in this browser.");
      return;
    }
    const s = new GroupCallSession({
      conversationId: cid,
      type,
      hostId: "me",
      maxParticipants: 8,
    });
    setSession(s);
    try {
      await s.initiateGroupCall(host);
      setParticipants([...s.participants.values()]);
      // Persist (best-effort).
      try {
        await fetch("/api/calls/group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: cid,
            type,
            hostId: "me",
            hostName: host,
            maxParticipants: 8,
          }),
          cache: "no-store",
        });
      } catch { /* ignore */ }
    } catch (err) {
      setError((err as WebRTCError).message || "Failed to start group call.");
      toast.error((err as WebRTCError).message || "Failed to start group call.");
    }
  };

  // ── Listen for events (after startCall is declared) ────────────────────────
  useEffect(() => {
    if (!open) return;
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<StartDetail>).detail || {};
      const cid = detail.conversationId?.trim();
      if (!cid) return;
      setConversationId(cid);
      setCallType(detail.type === "audio" ? "audio" : "video");
      setHostName(detail.hostName || "Host");
      setIsHost(true);
      setVideoOn(detail.type !== "audio");
      void startCall(cid, detail.type === "audio" ? "audio" : "video", detail.hostName || "Host");
    };
    window.addEventListener("circle:group-video-call", onStart as EventListener);
    return () => {
      window.removeEventListener("circle:group-video-call", onStart as EventListener);
    };
  }, [open]);

  const toggleMute = () => {
    if (!session) return;
    const next = session.toggleMute();
    setMicOn(next);
  };

  const toggleVideo = () => {
    if (!session) return;
    const next = session.toggleVideo();
    setVideoOn(next);
  };

  const toggleHand = () => {
    if (!session) return;
    const next = session.raiseHand();
    setHandRaised(next);
    toast.success(next ? "Hand raised." : "Hand lowered.");
  };

  const muteAll = () => {
    if (!session) return;
    session.muteAll();
    setParticipants([...session.participants.values()]);
    toast.success("All non-host participants muted.");
  };

  const handleEnd = () => {
    if (session) {
      session.leave();
      session.teardown();
    }
    setSession(null);
    setTimeout(onClose, 250);
  };

  const showable = participants.slice(0, 8);

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="Group video call">
      <div className="absolute inset-0 bg-charcoal flex flex-col">
        {/* Header */}
        <header className="relative z-10 px-5 pt-5 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-primary/20 border border-emerald-500/30 flex items-center justify-center shrink-0 glass backdrop-blur-xl">
            <Users className="w-5 h-5 text-cream" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl text-cream truncate">Group Call</div>
            <div className="text-[11px] text-cream/70 truncate flex items-center gap-2">
              <Users className="w-3 h-3" />
              {participants.length} / 8 participants
              {conversationId && <span className="text-cream/40">· {conversationId.slice(0, 10)}…</span>}
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-cream">LIVE</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close group call"
            className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-cream/10 transition"
          >
            <X className="w-4 h-4 text-cream" />
          </button>
        </header>

        {/* Body */}
        {!supported ? (
          <div className="relative z-10 flex-1 flex items-center justify-center p-6">
            <div className="glass rounded-2xl p-6 max-w-sm text-center border border-rose-500/30">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <div className="font-display text-lg text-cream mb-2">Browser not supported</div>
              <p className="text-sm text-cream/70">
                Group video calls require WebRTC. Please use a modern browser.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="relative z-10 flex-1 flex items-center justify-center p-6">
            <div className="glass rounded-2xl p-6 max-w-sm text-center border border-rose-500/30">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <div className="font-display text-lg text-cream mb-2">Call failed</div>
              <p className="text-sm text-cream/70 mb-4">{error}</p>
              <Button onClick={onClose} variant="outline" size="sm">Close</Button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex-1 overflow-y-auto px-3 sm:px-5 pb-32">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
              {showable.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-cream/50">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-sm">Connecting…</span>
                </div>
              )}
              {showable.map((p, i) => {
                const isLocal = p.id === "me";
                const isActive = p.id === activeSpeaker;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "relative aspect-video rounded-2xl overflow-hidden glass border-2 flex items-center justify-center",
                      isActive
                        ? "border-emerald-400 ring-2 ring-emerald-400/40"
                        : "border-cream/10",
                    )}
                    aria-label={`${p.displayName}${p.isHost ? " (host)" : ""}${isActive ? " — speaking" : ""}`}
                  >
                    {videoOn && isLocal && session?.localStream ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                        aria-label="Your video preview"
                      />
                    ) : (
                      <div className={cn("absolute inset-0 bg-gradient-to-br flex items-center justify-center", colorFor(p.id, i))}>
                        <div className="w-14 h-14 rounded-full bg-charcoal/40 backdrop-blur flex items-center justify-center text-cream font-display text-lg">
                          {initials(p.displayName)}
                        </div>
                      </div>
                    )}
                    {/* Name + indicators */}
                    <div className="absolute left-2 bottom-2 right-2 flex items-center justify-between gap-1">
                      <span className="text-[11px] text-cream truncate bg-charcoal/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                        {p.isHost && <Crown className="w-3 h-3 text-amber-300" />}
                        {p.displayName}{isLocal && " (you)"}
                      </span>
                      <div className="flex items-center gap-1">
                        {p.muted && <MicOff className="w-3 h-3 text-rose-400 bg-charcoal/60 rounded-full p-0.5 box-content" />}
                        {p.videoOff && <VideoOff className="w-3 h-3 text-cream/60 bg-charcoal/60 rounded-full p-0.5 box-content" />}
                        {p.handRaised && <Hand className="w-3 h-3 text-amber-300 bg-charcoal/60 rounded-full p-0.5 box-content" />}
                        {isActive && <Volume2 className="w-3 h-3 text-emerald-400 bg-charcoal/60 rounded-full p-0.5 box-content animate-pulse" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {/* Empty tiles */}
              {showable.length < 8 && showable.length > 0 && (
                Array.from({ length: Math.min(4, 8 - showable.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="aspect-video rounded-2xl border-2 border-dashed border-cream/10 flex items-center justify-center text-cream/30 text-xs"
                  >
                    Empty slot
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Bottom control bar */}
        {supported && !error && (
          <footer className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-6 pt-3 bg-gradient-to-t from-charcoal via-charcoal/80 to-transparent">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <GroupCallButton
                onClick={toggleMute}
                active={micOn}
                activeLabel="Mute microphone"
                inactiveLabel="Unmute microphone"
                Icon={micOn ? Mic : MicOff}
              />
              <GroupCallButton
                onClick={toggleVideo}
                active={videoOn}
                activeLabel="Turn off camera"
                inactiveLabel="Turn on camera"
                Icon={videoOn ? Video : VideoOff}
              />
              <GroupCallButton
                onClick={toggleHand}
                active={handRaised}
                activeLabel="Lower hand"
                inactiveLabel="Raise hand"
                Icon={Hand}
                accent="amber"
              />
              {isHost && (
                <GroupCallButton
                  onClick={muteAll}
                  active={false}
                  activeLabel="Mute all participants"
                  Icon={MicOff}
                />
              )}
              <button
                onClick={handleEnd}
                aria-label="Leave call"
                className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center hover:opacity-90 transition shadow-float"
              >
                <PhoneOff className="w-6 h-6 text-destructive-foreground" />
              </button>
            </div>
          </footer>
        )}
      </div>
    </OverlayShell>
  );
}

interface BtnProps {
  onClick: () => void;
  active: boolean;
  activeLabel: string;
  inactiveLabel?: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent?: "emerald" | "amber" | "default";
}

function GroupCallButton({ onClick, active, activeLabel, inactiveLabel, Icon, accent }: BtnProps) {
  const label = active ? activeLabel : (inactiveLabel || activeLabel);
  const isAccent = (accent === "emerald" && active) || (accent === "amber" && active);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center transition border",
        accent === "amber" && active
          ? "bg-amber-500 border-amber-400 text-white"
          : isAccent
            ? "bg-emerald-500 border-emerald-400 text-white"
            : active
              ? "glass border-cream/20 text-cream hover:bg-cream/10"
              : "bg-cream/15 border-cream/20 text-cream hover:bg-cream/25",
      )}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

/**
 * Trigger the group video call overlay from anywhere.
 * Usage:
 *   window.dispatchEvent(new CustomEvent("circle:group-video-call", {
 *     detail: { conversationId: "abc", type: "video" }
 *   }));
 */
export function dispatchGroupVideoCallEvent(conversationId: string, type: CallType = "video") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("circle:group-video-call", { detail: { conversationId, type } }),
  );
}
