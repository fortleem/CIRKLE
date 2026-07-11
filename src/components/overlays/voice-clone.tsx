"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Mic, Play, Pause, Loader2, Check, Sparkles, ShieldCheck, AudioWaveform,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }
type Step = "record" | "test" | "enabled";

const TEST_PHRASES = [
  "Hey — this is my voice clone speaking.",
  "Reading this back to you in my exact tone. Wild, right?",
  "Welcome to Cirkle. This message was AI-spoken.",
];

// Deterministic pseudo-waveform from a string (no external assets).
function fingerprint(seed: string, bars = 48): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    out.push(0.2 + (h % 1000) / 1000 * 0.8);
  }
  return out;
}

export function VoiceClone({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("record");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [building, setBuilding] = useState(false);
  const [phrase, setPhrase] = useState(TEST_PHRASES[0]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("record"); setRecording(false); setBuilding(false); setSeconds(0); setPlaying(false); setProgress(0);
        if (timerRef.current) clearInterval(timerRef.current);
        if (playRef.current) clearInterval(playRef.current);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const startRec = () => {
    setRecording(true); setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    toast("Recording your voice sample…");
  };

  const stopRec = () => {
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (seconds < 5) {
      toast.error("Need at least 5 seconds of clean audio");
      return;
    }
    setBuilding(true);
    setTimeout(() => {
      setBuilding(false);
      setStep("test");
      toast.success("Voice sample captured", { description: "5s · on-device · never uploaded" });
    }, 1600);
  };

  const play = () => {
    setPlaying(true); setProgress(0);
    playRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (playRef.current) clearInterval(playRef.current);
          setPlaying(false);
          return 100;
        }
        return p + 4;
      });
    }, 100);
  };

  const pause = () => {
    setPlaying(false);
    if (playRef.current) clearInterval(playRef.current);
  };

  const enable = () => {
    setStep("enabled");
    toast.success("Voice clone enabled", { description: "Stored encrypted · on-device only" });
  };

  const fingerprintBars = fingerprint(phrase + seconds);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Voice Clone"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/20 border border-secondary/40 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Voice Clone</div>
                <div className="text-[11px] text-muted-foreground">3 steps · on-device · never uploaded</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            {/* Stepper */}
            <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
              {(["record", "test", "enabled"] as Step[]).map((s, i) => {
                const done = (["record", "test", "enabled"] as Step[]).indexOf(step) > i;
                const active = step === s;
                return (
                  <div key={s} className="flex-1 flex items-center gap-2">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border transition",
                      done ? "bg-secondary text-secondary-foreground border-secondary" :
                      active ? "bg-secondary/15 text-secondary border-secondary/60" :
                      "bg-muted/40 text-muted-foreground border-border/50")}>
                      {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={cn("text-[11px] capitalize", active ? "text-secondary font-medium" : "text-muted-foreground")}>{s}</span>
                    {i < 2 && <div className="flex-1 h-0.5 bg-border/50" />}
                  </div>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Step 1: record 5s */}
              {step === "record" && (
                <section className="rounded-2xl border border-border/60 bg-card p-6 text-center space-y-4">
                  <div className="text-[10px] uppercase tracking-widest text-secondary flex items-center justify-center gap-1.5">
                    <AudioWaveform className="w-3 h-3" /> Step 1 — Record 5s
                  </div>
                  <p className="text-sm text-muted-foreground">Read this clearly. 5 seconds is enough.</p>
                  <div className="rounded-xl bg-muted/40 px-3 py-3 text-sm italic">&quot;The golden dunes stretch to the horizon, where the sky meets the desert in a single quiet breath.&quot;</div>

                  <button
                    onClick={recording ? stopRec : startRec}
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center mx-auto transition",
                      recording ? "bg-accent text-accent-foreground animate-pulse" : "bg-gradient-hero text-cream hover:scale-105",
                    )}
                    aria-label={recording ? "Stop" : "Record"}
                  >
                    {recording ? <Loader2 className="w-7 h-7 animate-spin" /> : <Mic className="w-7 h-7" />}
                  </button>
                  <div className="text-xs text-muted-foreground">
                    {recording ? `Recording… ${seconds}s / 5s minimum` : building ? "Building voice model on-device…" : "Tap to start"}
                  </div>

                  {building && (
                    <div className="rounded-xl bg-secondary/10 border border-secondary/30 p-3 text-xs flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" /> Generating your voice fingerprint…
                    </div>
                  )}
                </section>
              )}

              {/* Step 2: test */}
              {step === "test" && (
                <>
                  <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Step 2 — Type &amp; test</div>
                    <textarea
                      value={phrase} onChange={(e) => setPhrase(e.target.value)} rows={3} maxLength={200}
                      className="w-full bg-muted/40 rounded-xl p-3 text-sm outline-none resize-none border border-border/50 focus:border-secondary/60 transition"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1.5">
                        {TEST_PHRASES.map((p, i) => (
                          <button key={i} onClick={() => setPhrase(p)} className="text-[10px] px-2 py-1 rounded-full glass hover:bg-muted/60 transition">Sample {i + 1}</button>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{phrase.length}/200</span>
                    </div>
                  </section>

                  {/* Voice fingerprint waveform */}
                  <section className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-widest text-secondary flex items-center gap-1.5">
                        <AudioWaveform className="w-3 h-3" /> Voice fingerprint
                      </div>
                      <span className="text-[10px] text-muted-foreground">{fingerprintBars.length} bars · on-device</span>
                    </div>
                    <div className="h-12 flex items-center gap-0.5">
                      {fingerprintBars.map((h, i) => {
                        const reached = playing && (i / fingerprintBars.length) * 100 <= progress;
                        return (
                          <motion.div
                            key={i}
                            initial={false}
                            animate={{ height: `${Math.max(8, h * 100)}%` }}
                            transition={{ duration: 0.3 }}
                            className={cn("flex-1 rounded-full transition-colors", reached ? "bg-secondary" : "bg-secondary/30")}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                      <span>0:00</span>
                      <span>{Math.round(progress * 0.04)}s / 4s</span>
                    </div>
                    <button
                      onClick={playing ? pause : play}
                      className="mt-3 w-full rounded-full bg-gradient-hero text-cream py-2 text-xs font-medium flex items-center justify-center gap-2"
                    >
                      {playing ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Test voice clone</>}
                    </button>
                  </section>

                  <button
                    onClick={enable}
                    className="w-full rounded-xl bg-gradient-gold text-brand-charcoal py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
                  >
                    <Check className="w-4 h-4" /> Continue to enable
                  </button>
                </>
              )}

              {/* Step 3: enabled */}
              {step === "enabled" && (
                <>
                  <section className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-transparent p-4 flex items-center gap-3 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center"><Sparkles className="w-5 h-5 text-brand-charcoal" /></div>
                    <div className="relative flex-1">
                      <div className="font-display text-lg">Voice clone enabled</div>
                      <div className="text-xs text-muted-foreground">Stored encrypted on this device only.</div>
                    </div>
                    <span className="relative text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary flex items-center gap-1"><Check className="w-3 h-3" /> Active</span>
                  </section>

                  <section className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Your voice model never leaves your phone. Cirkle servers cannot read it, replay it, or share it.
                    </p>
                  </section>

                  <button
                    onClick={() => { setStep("record"); setSeconds(0); }}
                    className="w-full rounded-xl glass py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/60 transition"
                  >
                    <Mic className="w-4 h-4" /> Re-record voice sample
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
