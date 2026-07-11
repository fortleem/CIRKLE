"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Wand2, Sparkles, Loader2, Copy, RefreshCw, Activity, Zap, Gauge,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

const SAMPLES = [
  "I think we should maybe consider moving the meeting.",
  "That was ok I guess.",
  "Hey can you send the file when you have time.",
];

interface Suggestion { label: string; text: string; tint: string; }

// Lightweight on-device tone/energy/impact estimator (no API).
function analyze(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  const hedges = (text.match(/\b(maybe|think|kind of|sort of|just|ok|guess)\b/gi) || []).length;
  const energy = Math.min(100, Math.max(15, 50 + (wc - 6) * 4 - hedges * 12));
  const impact = Math.min(100, Math.max(15, 60 - hedges * 10 + (text.endsWith("!") ? 18 : 0)));
  const tone = hedges >= 2 ? "Hesitant" : text.endsWith("!") ? "Urgent" : text.endsWith("?") ? "Curious" : wc < 5 ? "Blunt" : "Steady";
  return { wc, hedges, energy, impact, tone };
}

export function WordAura({ open, onClose }: Props) {
  const [text, setText] = useState(SAMPLES[0]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Live aura glow ring — recomputes on every keystroke (no API needed).
  const [metrics, setMetrics] = useState(() => analyze(SAMPLES[0]));

  useEffect(() => { setMetrics(analyze(text)); }, [text]);

  const auraColor =
    metrics.energy > 70 ? "hsl(var(--accent))" :
    metrics.energy > 40 ? "hsl(var(--secondary))" :
    "hsl(var(--primary))";

  const enhance = () => {
    if (!text.trim()) { toast.error("Write something first"); return; }
    setLoading(true); setSuggestions([]);
    setTimeout(() => {
      setLoading(false);
      setSuggestions([
        { label: "More confident", text: "Let's move the meeting — Tuesday works better for everyone.", tint: "from-secondary/30 to-secondary/5 border-secondary/40" },
        { label: "Warmer", text: "Hope your morning's going well — would you mind sending the file when you have a sec?", tint: "from-primary/30 to-primary/5 border-primary/40" },
        { label: "Concise", text: "Meeting moved. File please.", tint: "from-steel/30 to-steel/5 border-steel/40" },
        { label: "Persuasive", text: "Shifting the meeting unlocks 90 minutes of deep work for both of us — Tuesday at 2?", tint: "from-accent/30 to-accent/5 border-accent/40" },
      ]);
      toast.success("4 rephrasings ready");
    }, 1400);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Word Aura"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0">
                <Wand2 className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Word Aura</div>
                <div className="text-[11px] text-muted-foreground">Live glow · rephrase on-device</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Live glow ring */}
              <section className="rounded-2xl border border-border/60 bg-card p-5 flex items-center gap-5">
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* Outer glow */}
                    <motion.circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={auraColor}
                      strokeWidth="3"
                      strokeDasharray={`${metrics.energy * 2.64} 264`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      animate={{ strokeDasharray: `${metrics.energy * 2.64} 264` }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      style={{ filter: `drop-shadow(0 0 6px ${auraColor})` }}
                    />
                    {/* Middle ring (energy) */}
                    <motion.circle
                      cx="50" cy="50" r="32"
                      fill="none"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth="2"
                      strokeDasharray={`${metrics.energy * 2.01} 201`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      animate={{ strokeDasharray: `${metrics.energy * 2.01} 201` }}
                      transition={{ duration: 0.4 }}
                      opacity="0.5"
                    />
                    {/* Inner ring (impact) */}
                    <motion.circle
                      cx="50" cy="50" r="22"
                      fill="none"
                      stroke={auraColor}
                      strokeWidth="2"
                      strokeDasharray={`${metrics.impact * 1.38} 138`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      animate={{ strokeDasharray: `${metrics.impact * 1.38} 138` }}
                      transition={{ duration: 0.4 }}
                    />
                    <text x="50" y="48" textAnchor="middle" fontSize="9" className="fill-foreground font-display">{metrics.tone}</text>
                    <text x="50" y="60" textAnchor="middle" fontSize="6" className="fill-muted-foreground">tone</text>
                  </svg>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted/40 p-2">
                    <Activity className="w-3.5 h-3.5 mx-auto text-secondary mb-1" />
                    <div className="font-display text-base">{metrics.energy}</div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Tone</div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2">
                    <Zap className="w-3.5 h-3.5 mx-auto text-accent mb-1" />
                    <div className="font-display text-base">{metrics.energy}</div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Energy</div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2">
                    <Gauge className="w-3.5 h-3.5 mx-auto text-primary mb-1" />
                    <div className="font-display text-base">{metrics.impact}</div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Impact</div>
                  </div>
                </div>
              </section>

              {/* Input */}
              <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-secondary" /> Your draft
                </div>
                <textarea
                  value={text} onChange={(e) => { setText(e.target.value); setSuggestions([]); }}
                  rows={3} maxLength={300}
                  placeholder="Type a sentence to enhance…"
                  className="w-full bg-muted/40 rounded-xl p-3 text-sm outline-none resize-none border border-border/50 focus:border-secondary/60 transition"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {SAMPLES.map((s, i) => (
                      <button key={i} onClick={() => { setText(s); setSuggestions([]); }} className="text-[10px] px-2 py-1 rounded-full glass hover:bg-muted/60">Sample {i + 1}</button>
                    ))}
                  </div>
                  <button
                    onClick={enhance} disabled={loading}
                    className="px-3 py-1.5 rounded-full bg-gradient-hero text-cream text-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Enhance
                  </button>
                </div>
              </section>

              {/* Word breakdown */}
              <section className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Word breakdown</div>
                <div className="flex flex-wrap gap-1.5">
                  {text.trim().split(/\s+/).filter(Boolean).map((w, i) => {
                    const isHedge = /\b(maybe|think|kind|sort|just|ok|guess)\b/i.test(w);
                    return (
                      <span key={i} className={cn("text-xs px-2 py-1 rounded-md border",
                        isHedge ? "bg-accent/15 border-accent/40 text-accent" : "bg-muted/40 border-border/50")}>
                        {w.replace(/[.,!?;:]+$/, "")}{isHedge && " · hedge"}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {metrics.wc} words · {metrics.hedges} hedge word{metrics.hedges === 1 ? "" : "s"} detected
                </div>
              </section>

              {/* Rephrase suggestions */}
              {loading && (
                <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-2 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" /> Crafting 4 rephrasings…
                </div>
              )}
              {suggestions.length > 0 && (
                <section className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Rephrase suggestions</div>
                  {suggestions.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-2xl border bg-gradient-to-br p-4", s.tint)}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</span>
                        <button
                          onClick={() => { navigator.clipboard?.writeText(s.text); toast.success("Copied"); }}
                          className="w-7 h-7 rounded-full hover:bg-foreground/10 flex items-center justify-center" aria-label="Copy"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed">{s.text}</p>
                    </motion.div>
                  ))}
                </section>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
