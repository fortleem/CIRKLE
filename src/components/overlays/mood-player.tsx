"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Music, Play, Pause, Heart, SkipBack, SkipForward, Sparkles, Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Mood {
  k: string; label: string; emoji: string;
  bg: string; ring: string; accent: string;
  animations: { spin: number; float: number; pulse: number };
  tracks: { title: string; artist: string; duration: string }[];
}

const MOODS: Mood[] = [
  {
    k: "ember", label: "Ember", emoji: "🔥",
    bg: "from-accent/40 via-accent/10 to-background", ring: "border-accent/50", accent: "text-accent",
    animations: { spin: 8, float: 1.6, pulse: 1.2 },
    tracks: [
      { title: "Boulevard Beat", artist: "Riyadh Pulse", duration: "2:48" },
      { title: "Neon Dunes", artist: "Cirkle Mix", duration: "3:21" },
      
    ],
  },
  {
    k: "oasis", label: "Oasis", emoji: "🌙",
    bg: "from-primary/40 via-primary/10 to-background", ring: "border-primary/50", accent: "text-primary",
    animations: { spin: 24, float: 4, pulse: 3 },
    tracks: [
      { title: "Desert Lullaby", artist: "Cirkle Ambient", duration: "3:42" },
      { title: "Slow Tide", artist: "Sahara Sessions", duration: "4:18" },
      
    ],
  },
  {
    k: "harvest", label: "Harvest", emoji: "🍂",
    bg: "from-secondary/40 via-secondary/10 to-background", ring: "border-secondary/50", accent: "text-secondary",
    animations: { spin: 16, float: 2.5, pulse: 2 },
    tracks: [
      { title: "Old Tapes", artist: "Memory FM", duration: "4:30" },
      { title: "Tuwaiq Wind", artist: "Heritage", duration: "5:12" },
      
    ],
  },
];

export function MoodPlayer({ open, onClose }: Props) {
  const [moodKey, setMoodKey] = useState(MOODS[0].k);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [intensity, setIntensity] = useState(70);
  const [showBuilder, setShowBuilder] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmoji, setCustomEmoji] = useState("✨");

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (playing) setProgress((p) => (p >= 100 ? 0 : p + 1));
    }, 300);
    return () => clearInterval(id);
  }, [playing, open]);

  const mood = MOODS.find((m) => m.k === moodKey)!;
  const track = mood.tracks[idx];
  const intensityFactor = intensity / 100;

  const pickMood = (k: string) => {
    setMoodKey(k); setIdx(0); setProgress(0); setLiked(false);
    toast.success(`Mood: ${MOODS.find((m) => m.k === k)!.label}`, { description: "Overlay & playlist reshuffled on-device" });
  };
  const next = () => { setIdx((i) => (i + 1) % mood.tracks.length); setProgress(0); setLiked(false); };
  const prev = () => { setIdx((i) => (i - 1 + mood.tracks.length) % mood.tracks.length); setProgress(0); setLiked(false); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Mood Player"
            className={cn("fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto transition-colors duration-700 bg-gradient-to-b", mood.bg)}
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <motion.div
                animate={{ rotate: playing ? 360 : 0 }}
                transition={{ duration: mood.animations.spin, repeat: playing ? Infinity : 0, ease: "linear" }}
                className={cn("w-10 h-10 rounded-full border flex items-center justify-center shrink-0 text-xl", mood.ring)}>
                {mood.emoji}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Mood Player</div>
                <div className="text-[11px] text-muted-foreground">{mood.emoji} {mood.label} · tap a card to transform</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* 3 mood cards */}
              <div className="grid grid-cols-3 gap-2">
                {MOODS.map((m) => (
                  <motion.button key={m.k} onClick={() => pickMood(m.k)}
                    whileTap={{ scale: 0.94 }}
                    className={cn("rounded-2xl px-2 py-3 text-[11px] flex flex-col items-center gap-2 border transition",
                      moodKey === m.k ? cn("bg-gradient-to-b", m.bg, m.ring) : "bg-muted/30 border-border/50 hover:bg-muted/60")}>
                    <motion.span animate={moodKey === m.k && playing ? { y: [-2, 2, -2] } : {}}
                      transition={{ duration: m.animations.float, repeat: Infinity }}
                      className="text-2xl">{m.emoji}</motion.span>
                    {m.label}
                  </motion.button>
                ))}
              </div>

              {/* Custom mood builder */}
              <section className="rounded-2xl border border-border/60 bg-card p-3">
                <button onClick={() => setShowBuilder((s) => !s)} className="w-full flex items-center justify-between text-start">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Plus className="w-3 h-3 text-secondary" /> Custom mood
                  </span>
                  <span className="text-[10px] text-muted-foreground">{showBuilder ? "Hide" : "Build"}</span>
                </button>
                <AnimatePresence>
                  {showBuilder && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pt-3 space-y-3">
                        <div className="flex gap-2">
                          <input value={customEmoji} onChange={(e) => setCustomEmoji(e.target.value.slice(0, 2))} maxLength={2}
                            className="w-12 text-center bg-muted/40 rounded-xl px-2 py-2 text-lg outline-none border border-border/50" />
                          <input value={customName} onChange={(e) => setCustomName(e.target.value)} maxLength={20} placeholder="Mood name (e.g. Rainy Day)"
                            className="flex-1 bg-muted/40 rounded-xl px-3 py-2 text-sm outline-none border border-border/50" />
                          <button onClick={() => {
                            if (!customName.trim()) { toast.error("Name your mood"); return; }
                            toast.success(`Custom mood "${customName}" built`, { description: "Saved to your library" });
                            setShowBuilder(false);
                          }} className="px-3 rounded-xl bg-gradient-gold text-charcoal text-xs font-medium">Save</button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {["🌧️", "☕", "📚", "🚲", "🌅", "🕌", "🌊", "🍃"].map((e) => (
                            <button key={e} onClick={() => setCustomEmoji(e)} className="w-8 h-8 rounded-lg bg-muted/40 hover:bg-muted/70 text-lg">{e}</button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Now playing */}
              <motion.section key={track.title + moodKey} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className={cn("rounded-2xl border bg-gradient-to-br p-5 relative overflow-hidden", mood.bg, mood.ring)}>
                <motion.div
                  animate={{ scale: playing ? [1, 1 + 0.05 * intensityFactor, 1] : 1 }}
                  transition={{ duration: mood.animations.pulse, repeat: playing ? Infinity : 0, ease: "easeInOut" }}
                  className="relative aspect-square rounded-xl bg-gradient-hero flex items-center justify-center mb-3 max-w-[200px] mx-auto overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-aurora opacity-50 rounded-xl" />
                  <motion.div animate={{ rotate: playing ? 360 : 0 }}
                    transition={{ duration: mood.animations.spin * 1.5, repeat: playing ? Infinity : 0, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-mesh opacity-30 rounded-xl" />
                  <Music className="relative w-12 h-12 text-cream/60" />
                </motion.div>
                <div className="relative text-center">
                  <div className="font-display text-xl">{track.title}</div>
                  <div className="text-xs text-muted-foreground">{track.artist}</div>
                </div>
                <div className="relative mt-4">
                  <div className="h-1.5 rounded-full bg-foreground/15 overflow-hidden">
                    <motion.div animate={{ width: `${progress}%` }} className={cn("h-full", mood.accent.replace("text-", "bg-"))} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{Math.floor(progress * 0.04)}:{String(Math.floor((progress * 2.4) % 60)).padStart(2, "0")}</span>
                    <span>{track.duration}</span>
                  </div>
                </div>
                <div className="relative mt-4 flex items-center justify-center gap-6">
                  <button onClick={() => { setLiked((l) => !l); toast(liked ? "Unliked" : "Added to favorites ❤"); }}
                    className="w-10 h-10 rounded-full hover:bg-foreground/10 flex items-center justify-center" aria-label="Like">
                    <Heart className={cn("w-5 h-5", liked && "fill-current text-accent")} />
                  </button>
                  <button onClick={prev} className="w-10 h-10 rounded-full hover:bg-foreground/10 flex items-center justify-center" aria-label="Previous"><SkipBack className="w-5 h-5" /></button>
                  <button onClick={() => setPlaying((p) => !p)} className="w-14 h-14 rounded-full bg-gradient-gold text-charcoal flex items-center justify-center hover:scale-105 transition" aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </button>
                  <button onClick={next} className="w-10 h-10 rounded-full hover:bg-foreground/10 flex items-center justify-center" aria-label="Next"><SkipForward className="w-5 h-5" /></button>
                  <button onClick={() => toast.success("Mixed on-device · added to your library")} className="w-10 h-10 rounded-full hover:bg-foreground/10 flex items-center justify-center" aria-label="AI Mix"><Sparkles className="w-5 h-5" /></button>
                </div>
              </motion.section>

              {/* Intensity slider */}
              <section className="rounded-2xl border border-border/60 bg-card p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  <span>Animation intensity</span>
                  <span className={mood.accent}>{intensity}%</span>
                </div>
                <Slider value={[intensity]} onValueChange={(v) => setIntensity(v[0])} max={100} step={5} aria-label="Intensity" />
              </section>

              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Up next · {mood.label}</div>
                <div className="space-y-1">
                  {mood.tracks.map((t, i) => (
                    <button key={t.title} onClick={() => { setIdx(i); setProgress(0); setLiked(false); }}
                      className={cn("w-full rounded-xl px-3 py-2 flex items-center gap-3 text-start hover:bg-muted/40 transition", i === idx && "bg-secondary/10")}>
                      <span className="text-[10px] w-5 text-muted-foreground">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{t.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{t.artist}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{t.duration}</span>
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
