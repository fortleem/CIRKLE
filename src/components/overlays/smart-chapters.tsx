"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, ListVideo, Loader2, Sparkles, Play, ChevronRight, RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Chapter {
  id: number; time: string; seconds: number; title: string; mood: string;
  summary: string; tint: string; accent: string;
}

const CHAPTERS: Chapter[] = [
  { id: 1, time: "00:00", seconds: 0, title: "Opening — AlUla dawn", mood: "Serene", summary: "Wide establishing of the dunes. Subject walks into frame from the left. Audio: ambient wind + distant birds.", tint: "from-secondary/30 to-secondary/5 border-secondary/40", accent: "text-secondary" },
  { id: 2, time: "01:12", seconds: 72, title: "First interview", mood: "Curious", summary: "Local guide explains the rock carvings. Two-shot, soft key light. Subject nods, asks follow-up.", tint: "from-primary/30 to-primary/5 border-primary/40", accent: "text-primary" },
  { id: 3, time: "03:40", seconds: 220, title: "B-roll: golden hour", mood: "Awe", summary: "Slow pan across Hegra tombs. Lens flare from the setting sun. No dialogue — score swells.", tint: "from-accent/30 to-accent/5 border-accent/40", accent: "text-accent" },
  { id: 4, time: "05:20", seconds: 320, title: "Hands at work", mood: "Focused", summary: "Tight close-up of pottery being shaped on a wheel. Top-down, natural window light. Audio room tone.", tint: "from-steel/30 to-steel/5 border-steel/40", accent: "text-steel" },
  { id: 5, time: "07:45", seconds: 465, title: "Conversation over tea", mood: "Warm", summary: "Two friends laughing over cardamom tea. Handheld, intimate framing. Natural overlapping dialogue.", tint: "from-secondary/30 to-accent/10 border-secondary/40", accent: "text-secondary" },
  { id: 6, time: "09:30", seconds: 570, title: "Closing reflection", mood: "Bittersweet", summary: "Subject sums up the journey; cut to black on a held breath. Final score note resolves.", tint: "from-primary/30 to-secondary/10 border-primary/40", accent: "text-primary" },
];

const DURATION = 612; // 10:12

export function SmartChapters({ open, onClose }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [autoGen, setAutoGen] = useState(true);
  const [openSummary, setOpenSummary] = useState<number | null>(null);

  const analyze = () => {
    setAnalyzing(true); setChapters([]); setActive(null); setOpenSummary(null);
    setTimeout(() => {
      setAnalyzing(false);
      setChapters(CHAPTERS);
      toast.success("6 chapters detected", { description: "On-device · 10m 12s video" });
    }, 1600);
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
            role="dialog" aria-label="Smart Chapters"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel/30 to-secondary/20 border border-steel/40 flex items-center justify-center shrink-0">
                <ListVideo className="w-5 h-5 text-steel" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Smart Chapters</div>
                <div className="text-[11px] text-muted-foreground">AI breaks your video into jumpable chapters</div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Auto</span>
                <Switch checked={autoGen} onCheckedChange={(v) => { setAutoGen(v); toast(v ? "Auto-generate on" : "Auto-generate off"); }} aria-label="Auto-generate chapters" />
              </div>
              <button onClick={() => { setChapters([]); }} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Reset"><RefreshCw className="w-4 h-4" /></button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {chapters.length === 0 && !analyzing && (
                <section className="rounded-2xl border border-border/60 bg-card p-6 text-center space-y-3">
                  <Sparkles className="w-7 h-7 mx-auto text-secondary" />
                  <div className="font-display text-lg">Drop a video to chapter it</div>
                  <p className="text-sm text-muted-foreground">Cirkle AI watches for scene cuts, topic shifts, and mood swings — then builds a navigable table of contents.</p>
                  <button onClick={analyze} className="px-4 py-2 rounded-full bg-gradient-hero text-cream text-sm flex items-center gap-2 mx-auto">
                    <Sparkles className="w-4 h-4" /> Analyze sample video
                  </button>
                </section>
              )}

              {analyzing && (
                <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-2 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" /> Watching frames… detecting cuts & mood shifts…
                </div>
              )}

              {chapters.length > 0 && (
                <>
                  {/* Mood-colored timeline */}
                  <section>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Mood-colored timeline</div>
                    <div className="rounded-2xl aspect-video relative overflow-hidden bg-gradient-hero">
                      <div className="absolute inset-0 bg-gradient-aurora opacity-50" />
                      {/* Mood segments */}
                      <div className="absolute bottom-0 inset-x-0 h-2 flex">
                        {chapters.map((c, i) => (
                          <div key={c.id}
                            className={cn("flex-1 bg-gradient-to-r border-r border-background/40 last:border-r-0", c.tint)}
                            style={{ flexGrow: i === chapters.length - 1 ? (DURATION - c.seconds) : (chapters[i + 1].seconds - c.seconds) }} />
                        ))}
                      </div>
                      {/* Chapter tick marks */}
                      {chapters.map((c, i) => (
                        <button key={c.id} onClick={() => { setActive(i); toast(`Jumped to ${c.time} · ${c.mood}`); }}
                          className={cn("absolute bottom-2 w-1.5 h-4 rounded-full transition",
                            active === i ? "bg-secondary" : "bg-foreground/50")}
                          style={{ left: `calc(${(c.seconds / DURATION) * 100}% - 3px)` }} aria-label={c.title} />
                      ))}
                      {/* Progress indicator */}
                      {active !== null && (
                        <motion.div
                          className="absolute top-2 text-[10px] px-2 py-0.5 rounded-full glass-strong"
                          style={{ left: `calc(${(chapters[active].seconds / DURATION) * 100}% + 8px)` }}>
                          {chapters[active].time}
                        </motion.div>
                      )}
                      <div className="absolute top-3 left-3 text-[10px] uppercase tracking-widest text-cream/70">10:12 · 6 chapters</div>
                    </div>
                  </section>

                  {/* Chapter list */}
                  <section className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Detected chapters</div>
                    {chapters.map((c, i) => {
                      const isOpen = openSummary === i;
                      return (
                        <motion.div key={c.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className={cn("rounded-2xl border bg-gradient-to-br overflow-hidden transition", c.tint, active === i && "ring-2 ring-secondary/60")}>
                          <button
                            onClick={() => { setActive(i); setOpenSummary(isOpen ? null : i); }}
                            className="w-full p-3 flex items-center gap-3 text-start">
                            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center shrink-0">
                              <Play className={cn("w-4 h-4", c.accent)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.time}</span>
                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full bg-foreground/10", c.accent)}>{c.mood}</span>
                              </div>
                              <div className="text-xs font-medium truncate">{c.title}</div>
                            </div>
                            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition", isOpen && "rotate-90")} />
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }} className="overflow-hidden">
                                <div className="px-3 pb-3 pt-0">
                                  <div className="rounded-xl bg-foreground/5 px-3 py-2 text-xs leading-relaxed italic">{c.summary}</div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </section>

                  <button onClick={() => { toast.success("Chapters exported to Mashahd"); onClose(); }}
                    className="w-full rounded-xl bg-gradient-gold text-charcoal py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                    Save chapters <ChevronRight className="w-4 h-4" />
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
