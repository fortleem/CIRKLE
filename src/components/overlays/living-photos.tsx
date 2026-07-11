"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, ImagePlus, Sparkles, Loader2, Play, Wand2, Download,
} from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

type AnimKey = "parallax" | "particles" | "breathing" | "petals" | "ripple";

interface Card {
  id: number; title: string; anim: AnimKey; tint: string;
  desc: string;
}

const CARDS: Card[] = [
  { id: 1, title: "Dune Walk", anim: "parallax", tint: "from-secondary/40 to-secondary/10 border-secondary/40", desc: "Foreground drifts against background" },
  { id: 2, title: "Starfield", anim: "particles", tint: "from-primary/40 to-primary/10 border-primary/40", desc: "Generative particles drift upward" },
  { id: 3, title: "Quiet Breath", anim: "breathing", tint: "from-accent/40 to-accent/10 border-accent/40", desc: "Subtle in/out scale on a 4s loop" },
  { id: 4, title: "Petals", anim: "petals", tint: "from-rose/40 to-rose/10 border-rose/40", desc: "Soft petals fall diagonally" },
  { id: 5, title: "Oasis", anim: "ripple", tint: "from-steel/40 to-steel/10 border-steel/40", desc: "Ripples radiate from center" },
];

export function LivingPhotos({ open, onClose }: Props) {
  const [selected, setSelected] = useState<number>(0);
  const [intensity, setIntensity] = useState(60);
  const [animating, setAnimating] = useState(false);
  const [done, setDone] = useState(false);

  const animate = () => {
    setAnimating(true); setDone(false);
    setTimeout(() => {
      setAnimating(false); setDone(true);
      toast.success("Living Photo ready", { description: `${CARDS[selected].title} · 6s loop` });
    }, 1400);
  };

  const card = CARDS[selected];
  const intensityFactor = intensity / 100;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Living Photos"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/20 border border-secondary/40 flex items-center justify-center shrink-0">
                <ImagePlus className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Living Photos</div>
                <div className="text-[11px] text-muted-foreground">5 cards · 5 animations · on-device</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* 5 cards — each a different animation */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Pick a card · each animates differently</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {CARDS.map((c) => (
                    <button key={c.id} onClick={() => { setSelected(c.id); setDone(false); }}
                      className={cn("rounded-xl px-2 py-2.5 text-[10px] flex flex-col items-center gap-1 border transition",
                        selected === c.id ? cn("bg-gradient-to-br", c.tint) : "bg-muted/30 border-border/50 hover:bg-muted/60")}>
                      <span className="text-sm">{c.anim === "parallax" ? "🌄" : c.anim === "particles" ? "✨" : c.anim === "breathing" ? "🫁" : c.anim === "petals" ? "🌸" : "💧"}</span>
                      {c.title}
                    </button>
                  ))}
                </div>
              </section>

              {/* Preview canvas */}
              <section className="rounded-2xl border border-border/60 bg-card p-4">
                <div className={cn("aspect-video rounded-xl overflow-hidden relative bg-gradient-to-br border", card.tint)}>
                  <div className="absolute inset-0 bg-gradient-aurora opacity-40" />

                  {/* parallax: two layers drift in opposite directions */}
                  {card.anim === "parallax" && (
                    <>
                      <motion.div
                        animate={done ? { x: [0, 14 * intensityFactor, 0] } : {}}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-mesh opacity-30" />
                      <motion.div
                        animate={done ? { x: [0, -10 * intensityFactor, 0] } : {}}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-aurora opacity-50" />
                    </>
                  )}

                  {/* particles */}
                  {card.anim === "particles" && done && (
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <motion.div key={i}
                          initial={{ y: "100%", x: `${(i * 37) % 100}%`, opacity: 0 }}
                          animate={{ y: "-20%", opacity: [0, 1, 0] }}
                          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.2, ease: "easeOut" }}
                          className="absolute w-1 h-1 rounded-full bg-cream" />
                      ))}
                    </div>
                  )}

                  {/* breathing */}
                  {card.anim === "breathing" && (
                    <motion.div
                      animate={done ? { scale: [1, 1 + 0.08 * intensityFactor, 1] } : {}}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-mesh opacity-40" />
                  )}

                  {/* petals */}
                  {card.anim === "petals" && done && (
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <motion.div key={i}
                          initial={{ y: "-10%", x: `${(i * 23) % 100}%`, rotate: 0, opacity: 0 }}
                          animate={{ y: "110%", x: `${((i * 23) + 30) % 100}%`, rotate: 360, opacity: [0, 1, 0.6, 0] }}
                          transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.3, ease: "easeIn" }}
                          className="absolute w-2 h-2 rounded-full bg-rose/70" />
                      ))}
                    </div>
                  )}

                  {/* ripple */}
                  {card.anim === "ripple" && done && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i}
                          initial={{ scale: 0, opacity: 0.8 }}
                          animate={{ scale: 4 * intensityFactor, opacity: 0 }}
                          transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
                          className="absolute w-16 h-16 rounded-full border-2 border-steel" />
                      ))}
                    </div>
                  )}

                  <div className="absolute top-2 left-2 text-[10px] uppercase tracking-widest text-foreground/60">{card.title}</div>
                  <div className="absolute bottom-2 right-2 text-[10px] text-foreground/60">{card.desc}</div>

                  {!done && (
                    <div className="absolute inset-0 flex items-center justify-center bg-charcoal/40">
                      {animating ? <Loader2 className="w-7 h-7 animate-spin text-cream" /> : <Play className="w-8 h-8 text-cream" />}
                    </div>
                  )}
                </div>

                {/* Intensity slider */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">Intensity</span>
                  <Slider value={[intensity]} onValueChange={(v) => setIntensity(v[0])} max={100} step={5} aria-label="Animation intensity" className="flex-1" />
                  <span className="text-[11px] text-secondary font-mono w-10 text-right">{intensity}%</span>
                </div>

                <button onClick={animate} disabled={animating}
                  className="mt-3 w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50">
                  {animating ? <><Loader2 className="w-4 h-4 animate-spin" /> Animating…</> : <><Wand2 className="w-4 h-4" /> Animate</>}
                </button>
              </section>

              {done && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-transparent p-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-secondary flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Living Photo ready · 6s loop</div>
                  <button onClick={() => toast.success("Saved to Lamahat")} className="px-3 py-1.5 rounded-full bg-gradient-gold text-charcoal text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Save</button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
