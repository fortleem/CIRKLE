"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Clapperboard, Film, Loader2, Sparkles, Wand2, ChevronRight,
  Upload, Scissors, Palette, AudioLines, Download, Check,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

type StepKey = "import" | "analyze" | "cut" | "color" | "audio" | "export";

interface Step { k: StepKey; label: string; icon: typeof Upload; }

const STEPS: Step[] = [
  { k: "import", label: "Import", icon: Upload },
  { k: "analyze", label: "Analyze", icon: Sparkles },
  { k: "cut", label: "Cut", icon: Scissors },
  { k: "color", label: "Color", icon: Palette },
  { k: "audio", label: "Audio", icon: AudioLines },
  { k: "export", label: "Export", icon: Download },
];

const PRESETS = [
  { k: "cinematic", label: "Cinematic", emoji: "🎬", tint: "from-secondary/30 to-secondary/5 border-secondary/40", grade: "Teal shadows · gold highlights" },
  { k: "doc", label: "Documentary", emoji: "🎞️", tint: "from-primary/30 to-primary/5 border-primary/40", grade: "Natural · neutral contrast" },
  { k: "reels", label: "Reels", emoji: "📱", tint: "from-accent/30 to-accent/5 border-accent/40", grade: "Punchy · warm midtones" },
  { k: "vintage", label: "Vintage", emoji: "📼", tint: "from-steel/30 to-steel/5 border-steel/40", grade: "Faded · film grain · sepia" },
  { k: "mv", label: "Music Video", emoji: "🎤", tint: "from-secondary/30 to-accent/10 border-secondary/40", grade: "Beat-cut · high saturation" },
];

export function AiDirector({ open, onClose }: Props) {
  const [preset, setPreset] = useState("cinematic");
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [showAfter, setShowAfter] = useState(false);

  const startPipeline = () => {
    setRunning(true); setDone(false); setStep(0); setShowAfter(false);
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= STEPS.length) {
        setStep(STEPS.length - 1);
        setRunning(false); setDone(true);
        setShowAfter(true);
        toast.success("AI edit complete", { description: `${PRESETS.find((p) => p.k === preset)!.label} · 4m 12s runtime` });
        return;
      }
      setStep(i);
      setTimeout(tick, 700);
    };
    setTimeout(tick, 700);
  };

  const presetMeta = PRESETS.find((p) => p.k === preset)!;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="AI Director"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <motion.div animate={running ? { rotate: [0, -6, 6, 0] } : {}}
                transition={{ duration: 1.4, repeat: running ? Infinity : 0 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-secondary/20 border border-accent/40 flex items-center justify-center shrink-0">
                <Clapperboard className="w-5 h-5 text-accent" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">AI Director</div>
                <div className="text-[11px] text-muted-foreground">Auto-edits raw footage · 6-step pipeline · on-device</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Source clip */}
              <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Film className="w-3 h-3 text-secondary" /> Raw footage
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center shrink-0">
                    <Film className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">desert_trip_4k.mov</div>
                    <div className="text-[11px] text-muted-foreground">12 min 38 s · 4K · 60 fps · 1.2 GB</div>
                  </div>
                  <button onClick={() => toast("Pick another clip from your camera roll")} className="text-[11px] px-2.5 py-1 rounded-full glass">Change</button>
                </div>
              </section>

              {/* Style presets */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-secondary" /> Style preset
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PRESETS.map((p) => (
                    <button key={p.k} onClick={() => { setPreset(p.k); setDone(false); }}
                      className={cn("rounded-xl px-2 py-2.5 text-[11px] flex flex-col items-center gap-1 border transition",
                        preset === p.k ? cn("bg-gradient-to-br", p.tint) : "bg-muted/30 border-border/50 hover:bg-muted/60")}>
                      <span className="text-lg">{p.emoji}</span> {p.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground italic">{presetMeta.grade}</div>
              </section>

              {/* Pipeline */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">6-step pipeline</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {STEPS.map((s, i) => {
                    const state = i < step ? "done" : i === step && running ? "active" : i === step && done ? "done" : "todo";
                    return (
                      <div key={s.k} className="flex flex-col items-center gap-1">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border transition",
                          state === "done" ? "bg-secondary/15 border-secondary/50 text-secondary"
                            : state === "active" ? "bg-accent/15 border-accent/60 text-accent"
                            : "bg-muted/30 border-border/50 text-muted-foreground")}>
                          {state === "done" ? <Check className="w-4 h-4" /> : state === "active" ? <Loader2 className="w-4 h-4 animate-spin" /> : <s.icon className="w-4 h-4" />}
                        </div>
                        <span className="text-[9px] text-center leading-tight">{s.label}</span>
                      </div>
                    );
                  })}
                </div>
                <button onClick={startPipeline} disabled={running}
                  className="mt-3 w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50">
                  {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Editing — {STEPS[step].label}…</> : <><Wand2 className="w-4 h-4" /> {done ? "Re-run edit" : "Run AI edit"}</>}
                </button>
              </section>

              {/* Before / After */}
              {done && (
                <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Before / After</div>
                    <button onClick={() => setShowAfter((s) => !s)}
                      className="text-[10px] px-2.5 py-1 rounded-full glass">
                      {showAfter ? "Show original" : "Show edit"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-charcoal/40 to-charcoal/10 border border-border/60">
                      <div className="absolute inset-0 bg-gradient-aurora opacity-30" />
                      <div className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-charcoal/70 text-cream">RAW</div>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-foreground/40">ungraded · shaky</div>
                    </div>
                    <motion.div key={preset}
                      initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}
                      className={cn("relative aspect-video rounded-xl overflow-hidden border bg-gradient-to-br", presetMeta.tint)}>
                      <div className="absolute inset-0 bg-gradient-aurora opacity-50" />
                      <div className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-charcoal/70 text-cream">EDIT</div>
                      <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 6, repeat: Infinity }}
                        className="absolute inset-0 bg-gradient-mesh opacity-40" />
                    </motion.div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="rounded-lg bg-muted/40 py-1.5">
                      <div className="text-muted-foreground">Cuts</div>
                      <div className="text-secondary font-medium">42</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 py-1.5">
                      <div className="text-muted-foreground">Music</div>
                      <div className="text-secondary font-medium">Auto</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 py-1.5">
                      <div className="text-muted-foreground">Runtime</div>
                      <div className="text-secondary font-medium">4:12</div>
                    </div>
                  </div>
                  <button onClick={() => { toast.success("Exported to Mashahd Studio"); onClose(); }}
                    className="w-full rounded-xl bg-gradient-gold text-charcoal py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                    Open in Mashahd Studio <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.section>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
