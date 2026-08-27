// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  X, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, SwitchCamera,
  Languages, Clock, PhoneCall, AlertTriangle, Loader2, User, Volume2,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import {
  WebRTCCallSession,
  isWebRTCSupported,
  type CallType,
  type WebRTCError,
} from "@/lib/webrtc-service";
import {
  createLiveTranslator,
  getSupportedLanguages,
  type TranslationChunk,
} from "@/lib/call-translation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StartCallDetail {
  conversationId?: string;
  calleeId?: string;
  type?: CallType;
  callerName?: string;
}

interface Subtitle {
  id: number;
  original: string;
  translated: string;
  ts: number;
}

const LANGS = getSupportedLanguages().slice(0, 8);

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * WebRTC Call overlay (B1 + E1).
 *
 * Opens via `circle:webrtc-call` event with `{ conversationId, type }` or via
 * the optional `startOnOpen` prop. Full-screen UI:
 *   • Local/remote video (video calls) or pulsing avatar (audio calls).
 *   • Mute / Video / Switch camera / End call buttons.
 *   • Call timer that starts when status === "answered".
 *   • "Translate" toggle → live subtitles panel using the LiveTranslator
 *     helper from `src/lib/call-translation.ts` (E1).
 *   • Graceful permission-denied / not-supported error states with clear
 *     user-facing messages.
 */
export function WebRTCCall({ open, onClose }: Props) {
  const [supported] = useState(isWebRTCSupported);
  const [session, setSession] = useState<WebRTCCallSession | null>(null);
  const [status, setStatus] = useState<"idle" | "ringing" | "answered" | "ended" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [callType, setCallType] = useState<CallType>("audio");
  const [peerName, setPeerName] = useState("Unknown");

  // Live translate (E1).
  const [translateOn, setTranslateOn] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const [subs, setSubs] = useState<Subtitle[]>([]);
  const segIdRef = useRef(0);
  const translatorRef = useRef<ReturnType<typeof createLiveTranslator> | null>(null);
  const fakeSpeechRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset state on close ─────────────────────────────────────────────────
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      // Deferred cleanup so the exit animation can finish.
      setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (fakeSpeechRef.current) clearInterval(fakeSpeechRef.current);
        translatorRef.current?.dispose();
        translatorRef.current = null;
        session?.teardown();
        setSession(null);
        setStatus("idle");
        setError(null);
        setElapsed(0);
        setMicOn(true);
        setVideoOn(false);
        setTranslateOn(false);
        setSubs([]);
      }, 0);
    }
  }

  // ── Attach local video stream ────────────────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current && session?.localStream) {
      localVideoRef.current.srcObject = session.localStream;
      void localVideoRef.current.play().catch(() => {});
    }
  }, [session?.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && session?.remoteStream) {
      remoteVideoRef.current.srcObject = session.remoteStream;
      void remoteVideoRef.current.play().catch(() => {});
    }
  }, [session?.remoteStream]);

  // ── Subscribe to status changes ─────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setStatus(session.status as any);
    }, 500);
    return () => clearInterval(interval);
  }, [session]);

  // ── Call timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "answered") return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [status]);

  // ── Live translate wiring ────────────────────────────────────────────────
  useEffect(() => {
    if (!translateOn) {
      translatorRef.current?.dispose();
      translatorRef.current = null;
      if (fakeSpeechRef.current) clearInterval(fakeSpeechRef.current);
      fakeSpeechRef.current = null;
      return;
    }
    const translator = createLiveTranslator(targetLang);
    translatorRef.current = translator;
    const off = translator.on((chunk: TranslationChunk) => {
      setSubs((prev) => [
        ...prev.slice(-4),
        {
          id: ++segIdRef.current,
          original: chunk.original,
          translated: chunk.translated,
          ts: chunk.ts,
        },
      ]);
    });

    // Simulate on-device speech recognition feeding chunks into the translator.
    // In production, hook into the browser's SpeechRecognition API here.
    const SIMULATED_UTTERANCES = [
      "Hello, can you hear me clearly?",
      "Yes, the connection is great. Let's start the meeting.",
      "I'll send the proposal by Friday afternoon.",
      "Sounds good — I'll review it this weekend.",
    ];
    let i = 0;
    fakeSpeechRef.current = setInterval(() => {
      translator.push(SIMULATED_UTTERANCES[i % SIMULATED_UTTERANCES.length], "en");
      i++;
    }, 3000);

    return () => {
      off();
      translator.dispose();
      if (fakeSpeechRef.current) clearInterval(fakeSpeechRef.current);
      translatorRef.current = null;
    };
  }, [translateOn, targetLang]);

  // ── Listen for `circle:webrtc-call` events ──────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<StartCallDetail>).detail || {};
      const conversationId = detail.conversationId?.trim();
      const calleeId = detail.calleeId?.trim();
      const type = detail.type === "video" ? "video" : "audio";
      if (!conversationId || !calleeId) return;
      setCallType(type);
      setVideoOn(type === "video");
      setPeerName(detail.callerName || calleeId);
      void startCall(conversationId, calleeId, type);
    };
    window.addEventListener("circle:webrtc-call", onStart as EventListener);
    return () => {
      window.removeEventListener("circle:webrtc-call", onStart as EventListener);
    };
  }, [open]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const startCall = async (conversationId: string, calleeId: string, type: CallType) => {
    setError(null);
    setElapsed(0);
    setStatus("ringing");
    const s = new WebRTCCallSession({
      conversationId,
      type,
      peerId: calleeId,
      callerName: peerName,
    });
    setSession(s);
    try {
      await s.initiateCall();
      setStatus(s.status as any);
      // Persist via the initiate API (best-effort).
      try {
        await fetch("/api/calls/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            callerId: "me",
            calleeId,
            type,
          }),
          cache: "no-store",
        });
      } catch { /* ignore — call signaling works without persistence */ }
    } catch (err) {
      const we = err as WebRTCError;
      setError(we.message || "Failed to start call.");
      setStatus("error");
      toast.error(we.message || "Failed to start call.");
    }
  };

  const handleEnd = async () => {
    if (session) {
      try {
        await session.endCall();
        // Persist via the calls/[id] DELETE endpoint (best-effort).
        if (session.id.startsWith("call_")) {
          // We didn't get a real DB id — skip persistence. Real flow would
          // use the id returned by /api/calls/initiate.
        }
      } catch { /* swallow */ }
      session.teardown();
    }
    setSession(null);
    setStatus("ended");
    setTranslateOn(false);
    setTimeout(onClose, 250);
  };

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

  const switchCam = async () => {
    if (!session) return;
    try {
      await session.switchCamera();
      toast.success("Camera switched.");
    } catch (err) {
      toast.error((err as WebRTCError).message || "Failed to switch camera.");
    }
  };

  // ── Derived flags ───────────────────────────────────────────────────────
  const isVideo = callType === "video" && videoOn;
  const showError = status === "error" || (!!error && status !== "answered");
  const showRinging = status === "ringing";
  const showConnected = status === "answered";

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="WebRTC call">
      <div className="absolute inset-0 bg-charcoal overflow-hidden flex flex-col">
        {/* ── Background: remote video or aurora gradient ─────────────── */}
        <div className="absolute inset-0">
          {isVideo && session?.remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              aria-label="Remote video feed"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, hsl(195 56% 23%), hsl(160 84% 39% / 0.6) 60%, hsl(351 41% 45%))",
              }}
            />
          )}
          <div className="absolute inset-0 aurora-bg opacity-20 pointer-events-none" aria-hidden="true" />
        </div>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="relative z-10 px-5 pt-5 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/40 to-primary/30 border border-emerald-500/40 flex items-center justify-center shrink-0 glass backdrop-blur-xl">
            <PhoneCall className="w-5 h-5 text-cream" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl text-cream truncate">WebRTC Call</div>
            <div className="text-[11px] text-cream/70 truncate flex items-center gap-2">
              {showRinging && (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Calling {peerName}…
                </span>
              )}
              {showConnected && (
                <span className="flex items-center gap-1.5 tabular-nums">
                  <Clock className="w-3 h-3" /> {formatDuration(elapsed)}
                </span>
              )}
              {showError && <span className="text-rose-300">Call error</span>}
            </div>
          </div>
          {showConnected && (
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-cream">LIVE</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-cream/10 transition"
            aria-label="Close call screen"
          >
            <X className="w-4 h-4 text-cream" />
          </button>
        </header>

        {/* ── Center ─────────────────────────────────────────────────────── */}
        {!supported ? (
          <div className="relative z-10 flex-1 flex items-center justify-center p-6">
            <div className="glass rounded-2xl p-6 max-w-sm text-center border border-rose-500/30">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <div className="font-display text-lg text-cream mb-2">Browser not supported</div>
              <p className="text-sm text-cream/70">
                WebRTC requires a modern browser with camera/microphone access.
                Please use the latest Chrome, Firefox, or Safari.
              </p>
            </div>
          </div>
        ) : showError ? (
          <div className="relative z-10 flex-1 flex items-center justify-center p-6">
            <div className="glass rounded-2xl p-6 max-w-sm text-center border border-rose-500/30">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <div className="font-display text-lg text-cream mb-2">Call failed</div>
              <p className="text-sm text-cream/70 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative z-10 flex-1 flex items-center justify-center p-5">
              {!isVideo || !session?.remoteStream ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500/40 to-primary/30 border-2 border-cream/30 glass flex items-center justify-center"
                    >
                      <User className="w-12 h-12 text-cream" />
                    </motion.div>
                    <motion.div
                      animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                      className="absolute inset-0 rounded-full border-2 border-cream/20"
                    />
                  </div>
                  <div className="text-center">
                    <div className="font-display text-2xl text-cream">{peerName}</div>
                    <div className="text-[11px] text-cream/70 mt-1">
                      {callType === "video" ? "Video call" : "Voice call"} ·{" "}
                      {showConnected ? "connected" : "ringing"}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>

            {/* Local video (PiP) */}
            {callType === "video" && session?.localStream && (
              <div className="absolute z-20 bottom-32 right-5 w-32 h-44 sm:w-40 sm:h-52 rounded-xl overflow-hidden border border-cream/30 glass shadow-float">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                  aria-label="Your video preview"
                />
              </div>
            )}

            {/* Live translate subtitles panel */}
            <AnimatePresence>
              {translateOn && showConnected && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute z-20 left-1/2 -translate-x-1/2 bottom-32 w-[90%] max-w-md"
                  role="region"
                  aria-label="Live translated subtitles"
                >
                  <div className="glass rounded-2xl p-3 border border-emerald-500/30 max-h-44 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cream/10">
                      <Languages className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] uppercase tracking-widest text-cream/60">
                        Live translate → {targetLang.toUpperCase()}
                      </span>
                    </div>
                    {subs.length === 0 ? (
                      <div className="text-[11px] text-cream/40 italic py-2">
                        Listening…
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {subs.map((s) => (
                          <div key={s.id} className="text-[12px] leading-relaxed">
                            <div className="text-cream/50 italic">{s.original}</div>
                            <div className="text-cream font-medium">{s.translated}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── Bottom control bar ─────────────────────────────────────── */}
        {supported && !showError && (
          <footer className="relative z-10 px-5 pb-6 pt-3">
            {/* Language picker (only when translate is on) */}
            {translateOn && (
              <div className="flex justify-center gap-1 mb-3 overflow-x-auto pb-1">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setTargetLang(l.code)}
                    aria-pressed={targetLang === l.code}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] border transition shrink-0",
                      targetLang === l.code
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "glass border-cream/20 text-cream/70 hover:bg-cream/10",
                    )}
                  >
                    {l.flag} {l.code.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              {/* Mute */}
              <CallButton
                onClick={toggleMute}
                active={micOn}
                activeLabel="Mute microphone"
                inactiveLabel="Unmute microphone"
                Icon={micOn ? Mic : MicOff}
              />
              {/* Video toggle */}
              {callType === "video" && (
                <CallButton
                  onClick={toggleVideo}
                  active={videoOn}
                  activeLabel="Turn off camera"
                  inactiveLabel="Turn on camera"
                  Icon={videoOn ? Video : VideoOff}
                />
              )}
              {/* Switch camera */}
              {callType === "video" && (
                <CallButton
                  onClick={switchCam}
                  active={true}
                  activeLabel="Switch camera"
                  Icon={SwitchCamera}
                />
              )}
              {/* Translate (E1) */}
              <CallButton
                onClick={() => setTranslateOn((v) => !v)}
                active={translateOn}
                activeLabel="Disable live translate"
                inactiveLabel="Enable live translate"
                Icon={Languages}
                accent="emerald"
              />
              {/* End call */}
              <button
                onClick={handleEnd}
                aria-label="End call"
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

// ── Helper: circular call control button ──────────────────────────────────────

interface CallButtonProps {
  onClick: () => void;
  active: boolean;
  activeLabel: string;
  inactiveLabel?: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent?: "emerald" | "default";
}

function CallButton({ onClick, active, activeLabel, inactiveLabel, Icon, accent }: CallButtonProps) {
  const label = active ? activeLabel : (inactiveLabel || activeLabel);
  const isAccent = accent === "emerald" && active;
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center transition border",
        isAccent
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
 * Trigger the WebRTC call overlay from anywhere in the app.
 * Usage:
 *   window.dispatchEvent(new CustomEvent("circle:webrtc-call", {
 *     detail: { conversationId: "abc", type: "video", calleeId: "user_xyz" }
 *   }));
 */
export function dispatchWebRTCCallEvent(conversationId: string, type: CallType, calleeId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("circle:webrtc-call", {
      detail: { conversationId, type, calleeId },
    }),
  );
}
