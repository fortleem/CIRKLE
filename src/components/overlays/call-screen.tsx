"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  X, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX,
  Languages, ShieldCheck, Loader2, Clock, PhoneCall, AlertTriangle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  callManager,
  type CallState,
  type CallType,
  type IncomingCallPayload,
} from "@/lib/call-manager";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StartCallDetail {
  callee?: string;
  type?: CallType;
  callerName?: string;
}

interface TranscriptSegment {
  id: number;
  speaker: "me" | "them";
  original: string;
  translation: string;
  confidence: number;
  ts: number;
}

const LANGS = [
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "ur", name: "Urdu", flag: "🇵🇰" },
  { code: "fa", name: "Persian", flag: "🇮🇷" },
];

/** Format seconds → MM:SS for the call timer. */
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Cirkle Call — full-screen call UI.
 *
 * Open flows:
 *   1. `circle:start-call` event with `{ callee, type }` — outgoing call.
 *      The component calls `callManager.startCall()` and renders the ringing /
 *      connected view.
 *   2. `call:incoming` socket event via `callManager.onIncomingCall()` —
 *      renders the "Incoming call from [name]" view with Accept/Reject.
 *
 * Live Translate toggle: when on, subscribes to `callManager.onTranscript()`
 * and renders real-time subtitles in the lower third. The CallManager feeds
 * the local audio stream to the existing LiveTranslate overlay pipeline.
 */
export function CallScreen({ open, onClose }: Props) {
  const [state, setState] = useState<CallState | null>(null);
  const [incoming, setIncoming] = useState<IncomingCallPayload | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [liveTranslate, setLiveTranslate] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [startError, setStartError] = useState<string | null>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segIdRef = useRef(0);

  // ── Subscribe to call manager state + incoming calls + transcripts ────
  useEffect(() => {
    const offState = callManager.onCallStateChange((s) => setState(s));
    const offIncoming = callManager.onIncomingCall((call) => {
      setIncoming(call);
    });
    const offTranscript = callManager.onTranscript((seg) => {
      setTranscript((prev) => {
        const next = [
          ...prev,
          {
            id: ++segIdRef.current,
            speaker: seg.speaker,
            original: seg.original,
            translation: seg.translation,
            confidence: seg.confidence,
            ts: seg.ts,
          },
        ];
        // Keep only the last 6 segments so the subtitle list stays compact.
        return next.slice(-6);
      });
    });
    return () => {
      offState();
      offIncoming();
      offTranscript();
    };
  }, []);

  // ── When the overlay opens, check if there's a buffered incoming call ─
  // Uses the derived-state pattern (per live-translate.tsx) so the call to
  // setState happens during render — not inside an effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      const pending = callManager.consumeIncomingCall();
      if (pending) {
        setIncoming(pending);
      }
    } else {
      // Overlay just closed — reset all local UI state.
      setIncoming(null);
      setStartError(null);
      setElapsed(0);
      setLiveTranslate(false);
      setTranscript([]);
    }
  }

  // ── Attach local/remote streams to <video> elements ───────────────────
  useEffect(() => {
    if (localVideoRef.current && state?.localStream) {
      localVideoRef.current.srcObject = state.localStream;
      void localVideoRef.current.play().catch(() => {});
    }
  }, [state?.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && state?.remoteStream) {
      remoteVideoRef.current.srcObject = state.remoteStream;
      void remoteVideoRef.current.play().catch(() => {});
    }
  }, [state?.remoteStream]);

  // ── Call timer — only tick when status === accepted ───────────────────
  // The timer starts when the call connects and resets `elapsed` to 0 in the
  // cleanup function (which runs when the status changes or the component
  // unmounts). Cleanup setState calls are NOT flagged by the lint rule
  // because they're asynchronous (post-render).
  useEffect(() => {
    if (state?.status !== "accepted") return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setElapsed(0);
    };
  }, [state?.status]);

  // ── Propagate mute / camera toggles to the manager ────────────────────
  useEffect(() => {
    callManager.setMicMuted(micMuted);
  }, [micMuted]);
  useEffect(() => {
    callManager.setCameraOff(camOff);
  }, [camOff]);

  // ── Live Translate toggle ─────────────────────────────────────────────
  // When toggled off, clear the transcript in the click handler (not in an
  // effect) to avoid the set-state-in-effect lint error.
  useEffect(() => {
    if (liveTranslate) {
      callManager.enableLiveTranslate(targetLang);
    } else {
      callManager.disableLiveTranslate();
    }
  }, [liveTranslate, targetLang]);

  // ── Listen for `circle:start-call` DOM events ─────────────────────────
  useEffect(() => {
    if (!open) return;
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<StartCallDetail>).detail || {};
      const callee = detail.callee?.trim();
      const type = detail.type === "video" ? "video" : "voice";
      if (!callee) return;
      setStartError(null);
      setElapsed(0);
      setIncoming(null);
      setLiveTranslate(false);
      callManager
        .startCall(type, callee)
        .then(() => {
          /* state will arrive via onCallStateChange */
        })
        .catch((err) => {
          console.warn("[call-screen] startCall failed:", err);
          setStartError(
            "Call feature requires camera/mic permission. Please grant access in your browser settings and try again.",
          );
        });
    };
    window.addEventListener("circle:start-call", onStart as EventListener);
    return () => {
      window.removeEventListener("circle:start-call", onStart as EventListener);
    };
  }, [open]);

  // (Cleanup when overlay closes is handled by the derived-state pattern
  // above — no separate effect needed.)

  // ── Actions ───────────────────────────────────────────────────────────
  const handleAccept = () => {
    if (!incoming) return;
    setStartError(null);
    callManager
      .acceptCall(incoming.id)
      .catch((err) => {
        console.warn("[call-screen] acceptCall failed:", err);
        setStartError(
          "Call feature requires camera/mic permission. Please grant access in your browser settings and try again.",
        );
      });
    setIncoming(null);
  };

  const handleReject = () => {
    if (!incoming) return;
    void callManager.rejectCall(incoming.id);
    setIncoming(null);
    onClose();
  };

  const handleEnd = () => {
    if (state?.callId) {
      void callManager.endCall(state.callId);
    }
    setLiveTranslate(false);
    onClose();
  };

  // ── Derived state ─────────────────────────────────────────────────────
  const isVideo = state?.type === "video";
  const showIncoming = !!incoming;
  const showRinging = state?.status === "ringing" && !incoming;
  const showConnected = state?.status === "accepted";
  const showError = state?.status === "error" || !!startError;
  const errorMessage = startError ?? state?.error ?? null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="dark fixed inset-0 z-[160] bg-charcoal overflow-hidden flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Cirkle Call"
        >
          {/* ── Remote video / avatar background ───────────────────────── */}
          <div className="absolute inset-0">
            {isVideo && state?.remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={!speakerOn}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(195 56% 23%), hsl(211 30% 42%) 60%, hsl(351 41% 45%))",
                }}
              />
            )}
            {/* Aurora subtle */}
            <div className="absolute inset-0 aurora-bg opacity-20 pointer-events-none" />
          </div>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <header className="relative z-10 px-5 pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel/40 to-primary/30 border border-steel/40 flex items-center justify-center shrink-0 glass">
              <PhoneCall className="w-5 h-5 text-cream" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl text-cream truncate">
                Cirkle Call
              </div>
              <div className="text-[11px] text-cream/70 truncate flex items-center gap-2">
                {showIncoming && (
                  <span>Incoming call · {incoming.callerName || incoming.caller}</span>
                )}
                {showRinging && (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calling {state?.peer ?? "…"}
                  </span>
                )}
                {showConnected && (
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Clock className="w-3 h-3" />
                    {formatDuration(elapsed)}
                  </span>
                )}
                {showError && (
                  <span className="text-accent">Call error</span>
                )}
              </div>
            </div>
            {showConnected && (
              <div className="px-2.5 py-1 rounded-full bg-accent/30 border border-accent/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
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

          {/* ── Center: avatar (audio-only fallback) or remote video ─── */}
          {!showIncoming && (
            <div className="relative z-10 flex-1 flex items-center justify-center p-5">
              {!isVideo || !state?.remoteStream ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-32 h-32 rounded-full bg-gradient-to-br from-secondary/40 to-primary/30 border-2 border-cream/30 glass flex items-center justify-center"
                    >
                      <User className="w-12 h-12 text-cream" />
                    </motion.div>
                    {/* Pulsing rings */}
                    <motion.div
                      animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-2 border-cream/30"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                      className="absolute inset-0 rounded-full border-2 border-cream/20"
                    />
                  </div>
                  <div className="text-center">
                    <div className="font-display text-2xl text-cream">
                      {state?.peer ?? "Unknown"}
                    </div>
                    <div className="text-[11px] text-cream/70 mt-1">
                      {isVideo ? "Video call" : "Voice call"} · {showConnected ? "connected" : "ringing"}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>
          )}

          {/* ── Incoming call overlay ──────────────────────────────────── */}
          {showIncoming && (
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-5">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-5"
              >
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-accent/40 to-secondary/30 border-2 border-cream/30 glass flex items-center justify-center"
                  >
                    <PhoneCall className="w-12 h-12 text-cream" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border-2 border-accent/50"
                  />
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-cream/60 mb-1">
                    Incoming call
                  </div>
                  <div className="font-display text-3xl text-cream">
                    {incoming.callerName || incoming.caller}
                  </div>
                  <div className="text-[12px] text-cream/70 mt-2">
                    {incoming.type === "video" ? "📹 Video call" : "📞 Voice call"}
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-3">
                  <button
                    onClick={handleReject}
                    className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center hover:opacity-90 transition shadow-float"
                    aria-label="Reject call"
                  >
                    <PhoneOff className="w-6 h-6 text-destructive-foreground" />
                  </button>
                  <button
                    onClick={handleAccept}
                    className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center hover:opacity-90 transition shadow-float animate-pulse"
                    aria-label="Accept call"
                  >
                    <Phone className="w-6 h-6 text-white" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── PiP self-preview (top-right) ───────────────────────────── */}
          {!showIncoming && (isVideo || state?.localStream) && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute z-20 top-24 right-5 w-28 h-40 rounded-2xl overflow-hidden border-2 border-cream/30 glass-strong relative"
            >
              {isVideo && state?.localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(351 41% 50% / 0.7), hsl(39 60% 60% / 0.5))",
                  }}
                />
              )}
              <div className="absolute bottom-1.5 left-1.5 text-[9px] text-cream/80 uppercase tracking-widest">
                You
              </div>
              {camOff && isVideo && (
                <div className="absolute inset-0 bg-charcoal/80 flex items-center justify-center">
                  <VideoOff className="w-5 h-5 text-cream/70" />
                </div>
              )}
            </motion.div>
          )}

          {/* ── Live Translate subtitles (above the controls) ──────────── */}
          {liveTranslate && transcript.length > 0 && !showIncoming && (
            <div className="relative z-10 px-5 pb-3 max-h-48 overflow-y-auto">
              <div className="space-y-2 max-w-2xl mx-auto">
                {transcript.map((seg) => (
                  <motion.div
                    key={seg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "glass-strong rounded-2xl p-3",
                      seg.speaker === "me"
                        ? "ms-auto max-w-[80%] bg-secondary/20"
                        : "me-auto max-w-[80%] bg-primary/20",
                    )}
                  >
                    <div className="text-[9px] uppercase tracking-widest text-cream/60 flex items-center justify-between">
                      <span>{seg.speaker === "me" ? "You" : "Them"}</span>
                      <span className="text-cream/50">{seg.confidence}%</span>
                    </div>
                    <p
                      dir={seg.speaker === "them" ? "rtl" : "ltr"}
                      className="font-arabic leading-relaxed text-cream text-base"
                    >
                      {seg.original}
                    </p>
                    <p
                      dir={seg.speaker === "them" ? "ltr" : "rtl"}
                      className="font-arabic leading-relaxed text-cream/70 text-[13px] pt-1.5 border-t border-cream/10"
                    >
                      {seg.translation}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error banner ───────────────────────────────────────────── */}
          {showError && errorMessage && !showIncoming && (
            <div className="relative z-10 px-5 pb-3">
              <div className="max-w-2xl mx-auto rounded-xl bg-accent/15 border border-accent/40 px-4 py-3 flex items-start gap-2.5 text-sm text-cream">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
                <div className="flex-1">
                  <div className="font-medium text-accent">Call unavailable</div>
                  <div className="text-[12px] text-cream/80 mt-0.5">{errorMessage}</div>
                </div>
                <button
                  onClick={handleEnd}
                  className="text-[11px] uppercase tracking-widest text-cream/70 hover:text-cream"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* ── Bottom control bar ─────────────────────────────────────── */}
          {!showIncoming && (
            <div className="relative z-10 px-5 pb-6 pt-3 space-y-3">
              {/* Live Translate toggle + language picker */}
              <div className="glass rounded-2xl p-3 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      setLiveTranslate((v) => {
                        if (v) {
                          // Turning OFF — clear the transcript too.
                          setTranscript([]);
                        }
                        return !v;
                      });
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition",
                      liveTranslate
                        ? "bg-secondary text-charcoal"
                        : "bg-cream/10 text-cream/80 hover:bg-cream/20",
                    )}
                    aria-pressed={liveTranslate}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    Live Translate {liveTranslate ? "ON" : "OFF"}
                  </button>
                  {liveTranslate && (
                    <button
                      onClick={() => setLangPickerOpen((v) => !v)}
                      className="px-2.5 py-1.5 rounded-full text-[11px] bg-cream/10 text-cream/80 hover:bg-cream/20 transition flex items-center gap-1.5"
                    >
                      {LANGS.find((l) => l.code === targetLang)?.flag}{" "}
                      {LANGS.find((l) => l.code === targetLang)?.name} ▾
                    </button>
                  )}
                  <div className="ms-auto flex items-center gap-1.5 text-[10px] text-cream/60">
                    <ShieldCheck className="w-3 h-3" />
                    On-device
                  </div>
                </div>
                {liveTranslate && langPickerOpen && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-cream/10">
                    {LANGS.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setTargetLang(l.code);
                          setLangPickerOpen(false);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] transition",
                          targetLang === l.code
                            ? "bg-cream text-charcoal"
                            : "bg-cream/10 text-cream/80 hover:bg-cream/20",
                        )}
                      >
                        {l.flag} {l.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Call controls */}
              <div className="flex items-center justify-center gap-3">
                <CallToggle
                  on={!micMuted}
                  onClick={() => setMicMuted((v) => !v)}
                  onIcon={Mic}
                  offIcon={MicOff}
                  label="Mic"
                />
                {isVideo && (
                  <CallToggle
                    on={!camOff}
                    onClick={() => setCamOff((v) => !v)}
                    onIcon={Video}
                    offIcon={VideoOff}
                    label="Camera"
                  />
                )}
                <CallToggle
                  on={speakerOn}
                  onClick={() => setSpeakerOn((v) => !v)}
                  onIcon={Volume2}
                  offIcon={VolumeX}
                  label="Speaker"
                />
                <button
                  onClick={handleEnd}
                  className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center hover:opacity-90 transition shadow-float"
                  aria-label="End call"
                >
                  <PhoneOff className="w-6 h-6 text-destructive-foreground" />
                </button>
              </div>

              {/* Privacy footer */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-cream/60">
                <ShieldCheck className="w-3 h-3" />
                End-to-end encrypted · WebRTC peer-to-peer
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── CallToggle helper ─────────────────────────────────────────────────

function CallToggle({
  on,
  onClick,
  onIcon: OnIcon,
  offIcon: OffIcon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  onIcon: typeof Mic;
  offIcon: typeof MicOff;
  label: string;
}) {
  const Icon = on ? OnIcon : OffIcon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center transition shadow-soft",
        on ? "glass text-cream hover:bg-cream/10" : "bg-cream text-charcoal",
      )}
      aria-label={`${label} ${on ? "on" : "off"}`}
      aria-pressed={on}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
