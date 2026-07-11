"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Compass, RefreshCw, Sparkles, ChevronRight, Plus,
} from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

const YOUR_VIEWS = [
  { k: "remote", label: "Remote work", tint: "bg-secondary" },
  { k: "fps", label: "FPS games", tint: "bg-accent" },
  { k: "ai", label: "Optimistic on AI", tint: "bg-primary" },
  { k: "cycling", label: "Cycling > driving", tint: "bg-steel" },
];

const OPPOSING = [
  { k: "office", label: "Office-first voices", why: "5 recent posts argue hallway chats beat Zoom.", tint: "from-secondary/15 to-transparent border-secondary/40", count: 12 },
  { k: "story", label: "Single-player games", why: "Slow narrative games get more love than you'd expect.", tint: "from-accent/15 to-transparent border-accent/40", count: 8 },
  { k: "caution", label: "AI-cautious voices", why: "A nuanced thread on AI safety just went under-shared.", tint: "from-primary/15 to-transparent border-primary/40", count: 15 },
];

export function EchoBreaker({ open, onClose }: Props) {
  const [optIn, setOptIn] = useState(true);
  const [diversity, setDiversity] = useState(58);
  const [followed, setFollowed] = useState<string[]>([]);

  const follow = (k: string, label: string) => {
    setFollowed((f) => f.includes(k) ? f : [...f, k]);
    toast.success(`Followed ${label}`, { description: "Their posts will now appear in your feed" });
  };

  const rerun = () => {
    toast.success("Re-scanning your feed", { description: "Reading 142 posts · building diversity map" });
    setTimeout(() => setDiversity((d) => Math.min(100, d + 7)), 1200);
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
            role="dialog" aria-label="Echo Breaker"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel/30 to-accent/20 border border-steel/40 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5 text-steel" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Echo Breaker</div>
                <div className="text-[11px] text-muted-foreground">Break out of your bubble · see the other side</div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Opt-in</span>
                <Switch checked={optIn} onCheckedChange={(v) => { setOptIn(v); toast(v ? "Echo-breaking on" : "Echo-breaking off"); }} aria-label="Opt-in" />
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Diversity score circle */}
              <section className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-4">
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <motion.circle cx="50" cy="50" r="42" fill="none"
                      stroke={diversity < 40 ? "hsl(var(--destructive))" : diversity < 70 ? "hsl(var(--secondary))" : "hsl(var(--primary))"}
                      strokeWidth="8" strokeLinecap="round"
                      initial={{ strokeDasharray: "264" }}
                      animate={{ strokeDasharray: `${(diversity / 100) * 264} 264` }}
                      transition={{ duration: 1, ease: "easeOut" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-display">{diversity}%</div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Diversity</div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {diversity < 40 ? "Echo chamber detected" : diversity < 70 ? "Some diversity · room to grow" : "Healthy mix of views"}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Your feed is dominated by {YOUR_VIEWS[0].label.toLowerCase()} and {YOUR_VIEWS[1].label.toLowerCase()}. 3 opposing voices would enrich it.
                  </p>
                  <button onClick={rerun} className="mt-2 text-[11px] px-2.5 py-1 rounded-full glass flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Re-scan
                  </button>
                </div>
              </section>

              {/* Your current views */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Your current views (top of feed)</div>
                <div className="flex flex-wrap gap-1.5">
                  {YOUR_VIEWS.map((v) => (
                    <span key={v.k} className={cn("text-[11px] px-2.5 py-1 rounded-full text-secondary-foreground font-medium", v.tint)}>
                      {v.label}
                    </span>
                  ))}
                </div>
              </section>

              {/* 3 opposing suggestions */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-accent" /> 3 opposing voices to follow
                </div>
                <div className="space-y-2">
                  {OPPOSING.map((o) => {
                    const isFollowed = followed.includes(o.k);
                    return (
                      <motion.div key={o.k} layout
                        className={cn("rounded-2xl border bg-gradient-to-br p-3 flex items-center gap-3", o.tint)}>
                        <div className="w-10 h-10 rounded-xl glass flex items-center justify-center shrink-0">
                          <Compass className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{o.label}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">{o.why}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">{o.count} posts this week</div>
                        </div>
                        <button onClick={() => follow(o.k, o.label)} disabled={isFollowed}
                          className={cn("shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1 transition",
                            isFollowed ? "bg-secondary/20 text-secondary" : "bg-gradient-gold text-charcoal")}>
                          {isFollowed ? <><Sparkles className="w-3 h-3" /> Following</> : <><Plus className="w-3 h-3" /> Follow</>}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* Daily opposing post */}
              <section className="rounded-2xl border border-border/60 bg-card p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Compass className="w-3 h-3" /> Today's opposing post
                </div>
                <div className="rounded-xl bg-foreground/5 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-mesh text-primary-foreground flex items-center justify-center text-[10px]">N</div>
                    <span className="text-xs font-medium">Noura</span>
                    <span className="text-[10px] text-muted-foreground">@noura</span>
                  </div>
                  <p className="text-xs leading-relaxed italic">"Counterpoint: hybrid work only works if you trust your team. Most managers don't."</p>
                </div>
              </section>

              <button onClick={() => { toast.success("Echo-breaking enabled for your feed"); onClose(); }}
                className="w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                Enable for my feed <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
