"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Ghost, Mic, Play, Pause, Send, Lock, Eye, EyeOff, Timer,
  Loader2, Check, Volume2, Sparkles, ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = "idle" | "recording" | "review" | "sent";
type Lifespan = "10s" | "1m" | "5m" | "1h" | "listened";

const LIFESPANS: { k: Lifespan; label: string; secs: number }[] = [
  { k: "10s", label: "After 10 seconds", secs: 10 },
  { k: "1m", label: "After 1 minute", secs: 60 },
  { k: "5m", label: "After 5 minutes", secs: 300 },
  { k: "1h", label: "After 1 hour", secs: 3600 },
  { k: "listened", label: "After listened once", secs: -1 },
];

const TRANSCRIPT = "Hey, just wanted to say the sunset at Diriyah was incredible tonight. Wish you were here 🌅";
const TRANSLATION = "مرحبًا، أردت فقط أن أقول إن غروب الشمس في الدرعية كان رائعًا الليلة. تمنيت لو كنت هنا 🌅";

interface SentWhisper {
  id: string;
  from: string;
  initials: string;
  tint: string;
  preview: string;
  duration: string;
  remaining: number; // seconds, -1 = after listened, 0 = expired
  listened: boolean;
}

const INITIAL_SENT: SentWhisper[] = [
  {
    id: "w1",
    from: "User",
    initials: "L",
    tint: "from-accent/40 to-accent/10",
    preview: "Quick voice memo about tomorrow's meetup — should I bring…",
    duration: "0:42",
    remaining: 240,
    listened: false,
  },
  {
    id: "w2",
    from: "User",
    initials: "K",
    tint: "from-secondary/40 to-secondary/10",
    preview: "Couldn't text, easier to say it — the deal closed today!",
    duration: "0:18",
    remaining: -1,
    listened: false,
  },
  {
    id: "w3",
    from: "Noura",
    initials: "N",
    tint: "from-primary/40 to-primary/10",
    preview: "Expired whisper — content self-destructed.",
    duration: "0:09",
    remaining: 0,
    listened: true,
  },
];

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtRemaining(s: number): string {
  if (s === -1) return "After listened";
  if (s <= 0) return "Expired";
  if (s < 60) return `${s}s left`;
  const m = Math.floor(s / 60);
  return `${m}m left`;
}

export function WhisperMode({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [lifespan, setLifespan] = useState<Lifespan>("1m");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<string | null>(null);
  const [sent, setSent] = useState<SentWhisper[]>(INITIAL_SENT);
  const [revealedPreview, setRevealedPreview] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived-state pattern: reset transient state when the sheet opens.
  // (Avoids set-state-in-effect — same pattern as mashahd-player.tsx.)
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setPhase("idle");
      setElapsed(0);
      setRevealedPreview(false);
    }
  }

  // Countdown timer for sent whispers
  useEffect(() => {
    if (!open) return;
    tickRef.current = setInterval(() => {
      setSent((cs) =>
        cs.map((w) =>
          w.remaining > 0 ? { ...w, remaining: w.remaining - 1 } : w
        )
      );
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [open]);

  // Recording timer
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e >= 5) {
          clearInterval(id);
          setPhase("review");
          return 5;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const startRecording = () => {
    setElapsed(0);
    setPhase("recording");
  };
  const stopRecording = () => setPhase("review");

  const sendWhisper = () => {
    const meta = LIFESPANS.find((l) => l.k === lifespan)!;
    const newW: SentWhisper = {
      id: `w${Date.now()}`,
      from: "You",
      initials: "Y",
      tint: "from-steel/40 to-steel/10",
      preview: TRANSCRIPT,
      duration: fmtTime(Math.max(elapsed, 1)),
      remaining: meta.secs === -1 ? -1 : meta.secs,
      listened: false,
    };
    setSent((cs) => [newW, ...cs]);
    setPhase("sent");
    toast.success("Whisper sent", {
      description: `Will self-destruct ${meta.k === "listened" ? "after one listen" : meta.label.toLowerCase()}.`,
    });
    setTimeout(() => {
      setPhase("idle");
      setElapsed(0);
      setRevealedPreview(false);
      onClose();
    }, 900);
  };

  const togglePlay = (id: string) => {
    setPlaying((p) => (p === id ? null : id));
    setSent((cs) => cs.map((w) => (w.id === id ? { ...w, listened: true } : w)));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Whisper Mode"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <motion.div
                animate={{ y: [0, -3, 0], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center shrink-0"
              >
                <Ghost className="w-5 h-5 text-primary" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Whisper Mode</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Self-destructing voice notes · transcribed + translated on-device
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Recorder stage */}
              <section className="rounded-3xl border border-border/60 bg-card p-6 flex flex-col items-center gap-4">
                {phase === "idle" && (
                  <>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Hold the mic to whisper
                    </div>
                    <motion.button
                      onClick={startRecording}
                      whileTap={{ scale: 0.92 }}
                      className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 border-2 border-primary/40 flex items-center justify-center hover:shadow-glow transition"
                      aria-label="Start recording"
                    >
                      <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
                      <Mic className="w-9 h-9 text-primary" />
                    </motion.button>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      Up to 60 seconds. Whisper self-destructs after the lifespan you choose.
                    </p>
                  </>
                )}

                {phase === "recording" && (
                  <>
                    <div className="text-[10px] uppercase tracking-widest text-accent flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      Recording
                    </div>
                    <div className="font-display text-4xl tabular-nums">{fmtTime(elapsed)}</div>
                    {/* Animated waveform */}
                    <div className="flex items-end gap-1 h-16">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: [
                              `${10 + ((i * 7) % 30)}%`,
                              `${50 + ((i * 13) % 50)}%`,
                              `${15 + ((i * 11) % 25)}%`,
                            ],
                          }}
                          transition={{
                            duration: 0.6 + (i % 4) * 0.12,
                            repeat: Infinity,
                            repeatType: "mirror",
                            ease: "easeInOut",
                          }}
                          className="w-1.5 rounded-full bg-gradient-to-t from-primary to-secondary"
                        />
                      ))}
                    </div>
                    <button
                      onClick={stopRecording}
                      className="mt-2 px-5 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition"
                    >
                      <span className="w-2.5 h-2.5 rounded-sm bg-accent-foreground" />
                      Stop
                    </button>
                  </>
                )}

                {phase === "review" && (
                  <>
                    <div className="text-[10px] uppercase tracking-widest text-secondary flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Review &amp; send
                    </div>
                    {/* Playback bar */}
                    <div className="w-full rounded-2xl bg-muted/40 border border-border/50 p-4 flex items-center gap-3">
                      <button
                        onClick={() => setRevealedPreview((v) => !v)}
                        className="w-11 h-11 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 hover:opacity-90 transition"
                        aria-label={revealedPreview ? "Pause" : "Play"}
                      >
                        {revealedPreview ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-end gap-0.5 h-8">
                          {Array.from({ length: 32 }).map((_, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-full bg-secondary/60"
                              style={{ height: `${20 + ((i * 17) % 80)}%` }}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{fmtTime(elapsed || 1)}</span>
                    </div>

                    {/* Transcription */}
                    <div className="w-full rounded-2xl border border-border/50 bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <Sparkles className="w-3 h-3 text-secondary" /> On-device transcription
                      </div>
                      <p className="text-sm leading-relaxed">{TRANSCRIPT}</p>
                      <div className="pt-2 border-t border-border/40 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <LanguagesGlyph /> Arabic translation
                      </div>
                      <p dir="rtl" className="text-sm leading-relaxed font-arabic">{TRANSLATION}</p>
                    </div>

                    {/* Lifespan picker */}
                    <div className="w-full">
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1.5">
                        <Timer className="w-3 h-3" /> Self-destruct
                      </label>
                      <Select value={lifespan} onValueChange={(v) => setLifespan(v as Lifespan)}>
                        <SelectTrigger className="w-full h-10 bg-muted/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIFESPANS.map((l) => (
                            <SelectItem key={l.k} value={l.k}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <button
                      onClick={sendWhisper}
                      className="w-full rounded-xl bg-gradient-hero text-cream py-3 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
                    >
                      <Send className="w-4 h-4" /> Send Whisper
                    </button>
                  </>
                )}

                {phase === "sent" && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-3 py-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-secondary/15 border border-secondary/40 flex items-center justify-center">
                      <Check className="w-7 h-7 text-secondary" />
                    </div>
                    <div className="font-display text-lg">Whisper sent</div>
                    <div className="text-[11px] text-muted-foreground">It will self-destruct on schedule.</div>
                  </motion.div>
                )}
              </section>

              {/* Sent whispers list */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Ghost className="w-3 h-3" /> Incoming whispers
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {sent.map((w) => {
                    const expired = w.remaining === 0;
                    const isListened = w.listened;
                    return (
                      <motion.div
                        key={w.id}
                        layout
                        className={cn(
                          "rounded-2xl border p-3 transition",
                          expired
                            ? "bg-muted/20 border-border/60 opacity-70"
                            : isListened
                              ? "bg-card border-secondary/30"
                              : "bg-card border-border/60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center font-medium text-sm shrink-0",
                            w.tint
                          )}>
                            {w.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium truncate">From {w.from}</div>
                              <span className="text-[10px] text-muted-foreground">{w.duration}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {expired ? (
                                <span className="flex items-center gap-1 text-muted-foreground/80">
                                  <Lock className="w-3 h-3" /> Expired
                                </span>
                              ) : revealed[w.id] ? (
                                w.preview
                              ) : (
                                <span className="blur-[3px] select-none">{w.preview}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {expired ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Expired
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary flex items-center gap-1">
                                <Timer className="w-3 h-3" /> {fmtRemaining(w.remaining)}
                              </span>
                            )}
                            {!expired && (
                              <button
                                onClick={() => {
                                  setRevealed((r) => ({ ...r, [w.id]: !r[w.id] }));
                                  togglePlay(w.id);
                                }}
                                className="text-[10px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1 hover:opacity-90 transition"
                              >
                                {playing === w.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                {revealed[w.id] ? "Pause" : "Play"}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* Privacy note */}
              <section className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Whispers are transcribed + translated on-device. Audio never leaves your phone.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function LanguagesGlyph() {
  return (
    <span className="inline-flex items-center justify-center w-3 h-3 rounded-sm bg-secondary/40 text-[8px] font-bold text-secondary-foreground">
      ع
    </span>
  );
}
