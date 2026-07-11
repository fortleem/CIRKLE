"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Waves, Loader2, Play, Download, Sparkles, Shuffle, ChevronRight,
  ChevronLeft, Mic, Music, AudioLines, Layers, Check,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

const STAGES = [
  { k: "source", label: "Source", icon: Music },
  { k: "style", label: "Style", icon: Sparkles },
  { k: "sync", label: "Sync", icon: AudioLines },
  { k: "preview", label: "Preview", icon: Play },
  { k: "publish", label: "Publish", icon: Check },
];

const STYLES = [
  { k: "lofi", label: "Lo-Fi", emoji: "🎧", tint: "from-secondary/30 to-secondary/5 border-secondary/40" },
  { k: "ambient", label: "Ambient", emoji: "🌌", tint: "from-primary/30 to-primary/5 border-primary/40" },
  { k: "vaporwave", label: "Vaporwave", emoji: "🌴", tint: "from-accent/30 to-accent/5 border-accent/40" },
  { k: "trap", label: "Trap", emoji: "🔥", tint: "from-steel/30 to-steel/5 border-steel/40" },
  { k: "orchestral", label: "Orchestral", emoji: "🎻", tint: "from-secondary/30 to-accent/10 border-secondary/40" },
];

const SOURCES = [
  { id: "voice", title: "voice_memo_001.m4a", meta: "0:42 · recorded yesterday", tint: "from-accent/30 to-accent/5 border-accent/40" },
  { id: "oud", title: "oud_loop.wav", meta: "0:08 · solo instrument", tint: "from-secondary/30 to-secondary/5 border-secondary/40" },
  { id: "field", title: "cairo_street.m4a", meta: "1:24 · field recording", tint: "from-primary/30 to-primary/5 border-primary/40" },
];

const SYNC_MARKERS = [
  { at: "0:04", label: "Beat drop", tint: "bg-accent" },
  { at: "0:08", label: "Vocal in", tint: "bg-secondary" },
  { at: "0:14", label: "Layer 2", tint: "bg-primary" },
  { at: "0:22", label: "Breakdown", tint: "bg-steel" },
];

const GALLERY = [
  { title: "Desert Echo", author: "@layla", style: "Ambient", tint: "from-primary/30 to-primary/5 border-primary/40" },
  { title: "Cairo Nights", author: "@omar", style: "Lo-Fi", tint: "from-secondary/30 to-secondary/5 border-secondary/40" },
  { title: "Tuwaiq Pulse", author: "@sara", style: "Trap", tint: "from-accent/30 to-accent/5 border-accent/40" },
];

export function EchoRemix({ open, onClose }: Props) {
  const [stage, setStage] = useState(0);
  const [source, setSource] = useState(SOURCES[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [remixing, setRemixing] = useState(false);
  const [done, setDone] = useState(false);
  const [bars, setBars] = useState<number[]>(Array(48).fill(3));

  const next = () => {
    if (stage === STAGES.length - 1) return;
    if (stage === 2) {
      // Run remix on entering preview
      setRemixing(true); setDone(false);
      setTimeout(() => {
        setRemixing(false); setDone(true);
        setBars(Array.from({ length: 48 }).map(() => Math.floor(Math.random() * 28) + 4));
        toast.success("Echo Remix ready", { description: "On-device · 30s preview" });
      }, 1500);
    }
    setStage((s) => s + 1);
  };
  const prev = () => setStage((s) => Math.max(0, s - 1));
  const reroll = () => {
    setBars(Array.from({ length: 48 }).map(() => Math.floor(Math.random() * 28) + 4));
    toast("Re-rolled mix");
  };

  const Stage = STAGES[stage];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Echo Remix"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-primary/20 border border-accent/40 flex items-center justify-center shrink-0">
                <Waves className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Echo Remix</div>
                <div className="text-[11px] text-muted-foreground">Step {stage + 1} of {STAGES.length} · {Stage.label}</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            {/* Stage progress */}
            <div className="px-5 py-2 border-b border-border/40 flex items-center gap-1">
              {STAGES.map((s, i) => (
                <div key={s.k} className="flex-1 flex items-center gap-1">
                  <div className={cn("flex-1 h-1 rounded-full transition", i <= stage ? "bg-accent" : "bg-muted/60")} />
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Split-screen: source on top, your camera/mic on bottom */}
              <div className="rounded-2xl border border-border/60 overflow-hidden">
                <div className="grid grid-rows-2">
                  <div className={cn("aspect-video bg-gradient-to-br relative flex items-center justify-center", source.tint)}>
                    <Music className="w-7 h-7 text-foreground/40" />
                    <div className="absolute bottom-1.5 left-2 text-[10px] uppercase tracking-widest text-foreground/70">Source · {source.title}</div>
                  </div>
                  <div className="aspect-video bg-gradient-hero relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-aurora opacity-50" />
                    <Mic className="w-7 h-7 text-cream/60" />
                    <div className="absolute bottom-1.5 left-2 text-[10px] uppercase tracking-widest text-cream/70">Your layer</div>
                  </div>
                </div>
              </div>

              {/* Stage content */}
              <AnimatePresence mode="wait">
                <motion.div key={stage} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  className="space-y-4">
                  {stage === 0 && (
                    <section>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Pick source audio</div>
                      <div className="space-y-2">
                        {SOURCES.map((s) => (
                          <button key={s.id} onClick={() => setSource(s)}
                            className={cn("w-full rounded-xl border bg-gradient-to-br p-3 text-start transition flex items-center gap-3",
                              s.tint, source.id === s.id && "ring-2 ring-secondary/60")}>
                            <div className="w-9 h-9 rounded-lg glass flex items-center justify-center"><Music className="w-4 h-4" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{s.title}</div>
                              <div className="text-[11px] text-muted-foreground">{s.meta}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {stage === 1 && (
                    <section>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Pick a style</div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {STYLES.map((s) => (
                          <button key={s.k} onClick={() => setStyle(s)}
                            className={cn("rounded-xl px-2 py-2.5 text-[11px] flex flex-col items-center gap-1 border transition",
                              style.k === s.k ? cn("bg-gradient-to-br", s.tint) : "bg-muted/30 border-border/50 hover:bg-muted/60")}>
                            <span className="text-lg">{s.emoji}</span> {s.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {stage === 2 && (
                    <section>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">AI sync markers</div>
                      <div className="rounded-2xl border border-border/60 bg-card p-3">
                        <div className="h-12 rounded-lg bg-foreground/5 relative overflow-hidden flex items-end gap-0.5 p-1">
                          {bars.map((h, i) => (
                            <div key={i} className="flex-1 rounded-sm bg-accent/60" style={{ height: `${h * 2}px` }} />
                          ))}
                          {SYNC_MARKERS.map((m, i) => (
                            <div key={i} className="absolute top-0 bottom-0 w-0.5" style={{ left: `${(i + 1) * 22}%` }}>
                              <div className={cn("absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full", m.tint)} />
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 space-y-1.5">
                          {SYNC_MARKERS.map((m) => (
                            <div key={m.at} className="flex items-center gap-2 text-xs">
                              <span className={cn("w-2 h-2 rounded-full", m.tint)} />
                              <span className="font-mono text-muted-foreground">{m.at}</span>
                              <span className="flex-1">{m.label}</span>
                              <Layers className="w-3 h-3 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {stage === 3 && (
                    <section>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Remix preview · 30s</div>
                      {remixing ? (
                        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-2 text-xs">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" /> Generating waveform · transposing · layering beats…
                        </div>
                      ) : done ? (
                        <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-transparent p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toast("Playing remix…")} className="w-12 h-12 rounded-full bg-gradient-hero text-cream flex items-center justify-center" aria-label="Play"><Play className="w-5 h-5 ml-0.5" /></button>
                            <div className="flex-1 h-12 flex items-center gap-0.5">
                              {bars.map((h, i) => (
                                <motion.div key={i} initial={{ height: 3 }} animate={{ height: h }}
                                  transition={{ delay: i * 0.02, type: "spring" }} className="flex-1 rounded-full bg-accent" />
                              ))}
                            </div>
                          </div>
                          <button onClick={reroll} className="w-full px-3 py-2 rounded-full glass text-xs flex items-center justify-center gap-1"><Shuffle className="w-3.5 h-3.5" /> Re-roll mix</button>
                        </div>
                      ) : null}
                    </section>
                  )}

                  {stage === 4 && (
                    <section className="space-y-3">
                      <div className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-4 text-center">
                        <Check className="w-8 h-8 mx-auto text-secondary mb-2" />
                        <div className="font-display text-lg">Echo Remix ready</div>
                        <div className="text-xs text-muted-foreground">{source.title} · {style.label} · 30s</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => toast.success("Remix downloaded · .mp3")} className="px-3 py-2 rounded-full glass text-xs flex items-center justify-center gap-1"><Download className="w-3.5 h-3.5" /> Download</button>
                        <button onClick={() => { toast.success("Published to Mashahd"); onClose(); }} className="px-3 py-2 rounded-full bg-gradient-gold text-charcoal text-xs flex items-center justify-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Publish</button>
                      </div>
                    </section>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Stage nav */}
              <div className="flex items-center gap-2">
                <button onClick={prev} disabled={stage === 0}
                  className="px-3 py-2 rounded-full glass text-xs flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /> Back</button>
                {stage < STAGES.length - 1 ? (
                  <button onClick={next} disabled={remixing}
                    className="flex-1 rounded-full bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    {remixing ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <>Next <ChevronRight className="w-4 h-4" /></>}
                  </button>
                ) : (
                  <button onClick={onClose} className="flex-1 rounded-full bg-gradient-hero text-cream py-2.5 text-sm font-medium">Done</button>
                )}
              </div>

              {/* Echo gallery */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Echo gallery · from your circle</div>
                <div className="grid grid-cols-3 gap-2">
                  {GALLERY.map((g) => (
                    <button key={g.title} onClick={() => toast(`Playing ${g.title} by ${g.author}`)}
                      className={cn("rounded-xl border bg-gradient-to-br p-3 text-start transition hover:scale-[1.02]", g.tint)}>
                      <Waves className="w-4 h-4 mb-2" />
                      <div className="text-[11px] font-medium truncate">{g.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{g.author}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{g.style}</div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
