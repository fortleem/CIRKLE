"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, MessageSquare, Play, Pause, FastForward, Download, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface ThreadPost {
  id: number; author: string; handle: string; initial: string;
  body: string; mood: string; tint: string; gradient: string;
}

const THREAD: ThreadPost[] = [
  { id: 1, author: "User", handle: "@layla", initial: "L",
    body: "Friday ride along the Corniche. The wind smelled like salt and cardamom. Three of us, no plan, just pedals.",
    mood: "Serene", tint: "from-secondary/40 to-secondary/10 border-secondary/40", gradient: "linear-gradient(135deg, hsl(39 45% 57% / 0.4), hsl(351 41% 56% / 0.2))" },
  { id: 2, author: "User", handle: "@omar", initial: "O",
    body: "We stopped at the old lighthouse. User told us her grandfather used to keep the lamp lit. He'd row out every storm.",
    mood: "Nostalgic", tint: "from-primary/40 to-primary/10 border-primary/40", gradient: "linear-gradient(135deg, hsl(195 56% 33% / 0.4), hsl(39 45% 57% / 0.2))" },
  { id: 3, author: "User", handle: "@sara", initial: "S",
    body: "Then the rain came — sudden, warm, the kind that smells of dust. We huddled under the awning of a closed kiosk.",
    mood: "Calm", tint: "from-accent/40 to-accent/10 border-accent/40", gradient: "linear-gradient(135deg, hsl(351 41% 56% / 0.4), hsl(211 30% 42% / 0.2))" },
  { id: 4, author: "User", handle: "@khalid", initial: "K",
    body: "User pulled out a thermos. Cardamom coffee, still warm. We passed it around. No one spoke for a full minute.",
    mood: "Warm", tint: "from-steel/40 to-steel/10 border-steel/40", gradient: "linear-gradient(135deg, hsl(211 30% 42% / 0.4), hsl(39 45% 57% / 0.2))" },
  { id: 5, author: "User", handle: "@layla", initial: "L",
    body: "And then the sky cleared, just like that. We rode home wet, smiling, full of coffee. Best Friday of the year.",
    mood: "Joyful", tint: "from-secondary/40 to-accent/10 border-secondary/40", gradient: "linear-gradient(135deg, hsl(39 45% 67% / 0.5), hsl(351 41% 56% / 0.3))" },
];

const SPEEDS = [0.5, 1, 1.5, 2];

export function ThreadTheatre({ open, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (playing) {
        setProgress((p) => {
          const np = p + 1 * speed;
          if (np >= 100) {
            setIdx((i) => {
              if (i >= THREAD.length - 1) { setPlaying(false); return i; }
              return i + 1;
            });
            return 0;
          }
          return np;
        });
      }
    }, 60);
    return () => clearInterval(id);
  }, [playing, speed, open]);

  const goNext = () => { setIdx((i) => Math.min(THREAD.length - 1, i + 1)); setProgress(0); };
  const goPrev = () => { setIdx((i) => Math.max(0, i - 1)); setProgress(0); };

  const post = THREAD[idx];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.75)", backdropFilter: "blur(14px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Thread Theatre"
            className="dark fixed inset-0 z-[150] shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
            style={{ background: post.gradient, transition: "background 1s ease" }}
          >
            <header className="px-4 py-3 border-b border-foreground/10 flex items-center gap-3 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl glass-strong border border-foreground/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-cream" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg leading-tight text-cream">Thread Theatre</div>
                <div className="text-[11px] text-cream/70">{idx + 1} of {THREAD.length} · {post.mood}</div>
              </div>
              <button onClick={() => toast.success("Thread exported as 30s video")} className="w-9 h-9 rounded-full hover:bg-foreground/10 flex items-center justify-center" aria-label="Export"><Download className="w-4 h-4 text-cream" /></button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-foreground/10 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4 text-cream" /></button>
            </header>

            {/* Stage */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {/* progress dots */}
              <div className="flex gap-1.5 mb-6">
                {THREAD.map((_, i) => (
                  <button key={i} onClick={() => { setIdx(i); setProgress(0); }}
                    className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-8 bg-cream" : "w-1.5 bg-cream/40")}
                    aria-label={`Post ${i + 1}`} />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={post.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full max-w-lg text-center space-y-4">
                  <div className="inline-flex items-center gap-2 glass-strong rounded-full px-3 py-1.5 border border-foreground/10">
                    <div className="w-7 h-7 rounded-full bg-gradient-mesh text-primary-foreground flex items-center justify-center text-xs">{post.initial}</div>
                    <span className="text-sm font-medium text-cream">{post.author}</span>
                    <span className="text-[11px] text-cream/70">{post.handle}</span>
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, staggerChildren: 0.01 }}
                    className="font-display text-2xl sm:text-3xl leading-relaxed text-cream"
                    style={{ textShadow: "0 2px 20px hsl(60 8% 9% / 0.4)" }}>
                    {post.body}
                  </motion.p>
                  <div className="text-[10px] uppercase tracking-widest text-cream/60 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> {post.mood}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="px-4 py-3 border-t border-foreground/10 backdrop-blur-sm">
              <div className="h-1 rounded-full bg-foreground/20 overflow-hidden mb-3">
                <div className="h-full bg-cream transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={goPrev} disabled={idx === 0}
                  className="w-10 h-10 rounded-full glass-strong border border-foreground/10 flex items-center justify-center disabled:opacity-40" aria-label="Previous"><ChevronLeft className="w-5 h-5 text-cream" /></button>
                <button onClick={() => setPlaying((p) => !p)}
                  className="w-14 h-14 rounded-full bg-cream text-charcoal flex items-center justify-center hover:scale-105 transition" aria-label={playing ? "Pause" : "Play"}>
                  {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <button onClick={goNext} disabled={idx === THREAD.length - 1}
                  className="w-10 h-10 rounded-full glass-strong border border-foreground/10 flex items-center justify-center disabled:opacity-40" aria-label="Next"><ChevronRight className="w-5 h-5 text-cream" /></button>
              </div>
              {/* Speed controls */}
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <span className="text-[10px] uppercase tracking-widest text-cream/70 mr-1 flex items-center gap-1"><FastForward className="w-3 h-3" /> Speed</span>
                {SPEEDS.map((s) => (
                  <button key={s} onClick={() => setSpeed(s)}
                    className={cn("px-2.5 py-1 rounded-full text-[10px] font-mono transition",
                      speed === s ? "bg-cream text-charcoal" : "glass-strong text-cream/80 border border-foreground/10")}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
