"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Camera, Sun, Sunset, Moon, Sunrise, Sparkles, Loader2, Save, Clock,
} from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Variant {
  k: string; label: string; icon: typeof Sun; time: string;
  tint: string; grade: string;
}

const VARIANTS: Variant[] = [
  { k: "dawn", label: "Dawn", icon: Sunrise, time: "05:30", tint: "from-secondary/40 via-accent/15 to-background border-secondary/40", grade: "Soft pink · cool shadows · gentle warmth" },
  { k: "noon", label: "Noon", icon: Sun, time: "12:00", tint: "from-secondary/50 via-cream/20 to-background border-secondary/50", grade: "Hard light · high contrast · true colors" },
  { k: "sunset", label: "Sunset", icon: Sunset, time: "17:45", tint: "from-accent/40 via-secondary/20 to-background border-accent/40", grade: "Warm orange · long shadows · rose highlights" },
  { k: "night", label: "Night", icon: Moon, time: "22:30", tint: "from-primary/50 via-steel/30 to-background border-primary/50", grade: "Cool teal · deep blacks · point light sources" },
];

export function TimeShiftCam({ open, onClose }: Props) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [hour, setHour] = useState(12);
  const [selected, setSelected] = useState<string | null>("noon");
  const [savedAll, setSavedAll] = useState(false);

  const generate = () => {
    setGenerating(true); setDone(false);
    setTimeout(() => {
      setGenerating(false); setDone(true);
      toast.success("4 variants generated", { description: "On-device · relit from a single photo" });
    }, 1800);
  };

  const timeLabel = `${String(hour).padStart(2, "0")}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Time-Shift Cam"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Time-Shift Cam</div>
                <div className="text-[11px] text-muted-foreground">Relight any photo across 4 times of day</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Original + variants grid */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Original + 4 variants</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Original */}
                  <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-border bg-gradient-to-br from-charcoal/30 to-charcoal/10">
                    <div className="absolute inset-0 bg-gradient-aurora opacity-30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-foreground/40" />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-charcoal/70 text-cream">ORIGINAL</div>
                  </div>
                  {VARIANTS.map((v) => {
                    const isGen = done || generating;
                    return (
                      <motion.button key={v.k}
                        onClick={() => { if (done) { setSelected(v.k); toast(`Selected ${v.label}`); } }}
                        whileTap={{ scale: 0.96 }}
                        className={cn("relative aspect-square rounded-xl overflow-hidden border-2 bg-gradient-to-br transition",
                          v.tint, selected === v.k ? "ring-2 ring-secondary" : "")}>
                        <motion.div animate={done ? { opacity: [0.4, 0.7, 0.4] } : {}} transition={{ duration: 3, repeat: Infinity }}
                          className="absolute inset-0 bg-gradient-mesh" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          {generating ? <Loader2 className="w-5 h-5 animate-spin text-foreground/70" /> : <v.icon className="w-6 h-6 text-foreground/80" />}
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-charcoal/70 text-cream">{v.label.toUpperCase()}</span>
                          <span className="text-[9px] font-mono text-foreground/70">{v.time}</span>
                        </div>
                        {!isGen && <div className="absolute inset-0 bg-charcoal/40 flex items-center justify-center text-[9px] text-cream">—</div>}
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* Time-lapse slider */}
              <section className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Time-lapse scrub</span>
                  <span className="font-mono text-secondary">{timeLabel}</span>
                </div>
                <Slider value={[hour * 4]} onValueChange={(v) => setHour(v[0] / 4)} min={0} max={95} step={1} aria-label="Hour of day" />
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:45</span>
                </div>
                {/* Live preview tinted by hour */}
                <div className="mt-3 aspect-video rounded-xl overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-charcoal/30 to-charcoal/10" />
                  <div className="absolute inset-0 transition-colors duration-500"
                    style={{
                      background: hour < 6 || hour >= 19
                        ? "radial-gradient(circle at 70% 30%, hsl(195 56% 33% / 0.4), transparent 60%)"
                        : hour < 9 || hour >= 17
                          ? "radial-gradient(circle at 70% 70%, hsl(351 41% 56% / 0.4), transparent 60%)"
                          : "radial-gradient(circle at 70% 30%, hsl(39 45% 67% / 0.5), transparent 60%)",
                    }} />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-foreground/80 uppercase tracking-widest">
                    Preview · {timeLabel}
                  </div>
                </div>
              </section>

              {/* Generate + Save all */}
              <div className="flex gap-2">
                <button onClick={generate} disabled={generating}
                  className="flex-1 rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50">
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> {done ? "Re-generate" : "AI generate"}</>}
                </button>
                <button
                  onClick={() => { setSavedAll(true); toast.success("All 4 variants saved to Lamahat"); }}
                  disabled={!done || savedAll}
                  className="px-4 rounded-xl bg-gradient-gold text-charcoal py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40">
                  <Save className="w-4 h-4" /> Save all
                </button>
              </div>

              {/* Active variant grade */}
              {done && selected && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-transparent p-3">
                  <div className="text-[10px] uppercase tracking-widest text-secondary mb-1">{VARIANTS.find((v) => v.k === selected)!.label} grade</div>
                  <div className="text-xs text-muted-foreground italic">{VARIANTS.find((v) => v.k === selected)!.grade}</div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
