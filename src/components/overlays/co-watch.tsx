// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Users, Play, Pause, Send, MessageCircle, Sparkles, Phone,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Reaction { id: number; user: string; emoji: string; at: string; }
interface Comment { id: number; user: string; text: string; at: string; }

const FRIENDS = [
  
  
  
];

const SEED_COMMENTS: Comment[] = [];

export function CoWatch({ open, onClose }: Props) {
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>(SEED_COMMENTS);
  const [text, setText] = useState("");
  const [idc, setIdc] = useState(100);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const DURATION = 30;

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (playing) {
        setTime((t) => {
          const nt = t + 1;
          if (nt === 8) setReactions((r) => [...r, { id: Date.now(), user: "User", emoji: "🔥", at: "0:08" }]);
          if (nt === 14) setReactions((r) => [...r, { id: Date.now() + 1, user: "User", emoji: "😍", at: "0:14" }]);
          if (nt === 22) setReactions((r) => [...r, { id: Date.now() + 2, user: "User", emoji: "👏", at: "0:22" }]);
          if (nt >= DURATION) { setPlaying(false); return DURATION; }
          return nt;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [playing, open]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [comments]);

  const fmt = (s: number) => `0:${String(s).padStart(2, "0")}`;

  const send = () => {
    if (!text.trim()) return;
    const id = idc + 1; setIdc(id);
    setComments((c) => [...c, { id, user: "You", text: text.trim(), at: fmt(time) }]);
    setText("");
  };

  const react = (emoji: string) => {
    setReactions((r) => [...r, { id: Date.now(), user: "You", emoji, at: fmt(time) }]);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.7)", backdropFilter: "blur(12px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Co-Watch"
            className="fixed inset-0 z-[150] glass-strong shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg leading-tight">Co-Watch</div>
                <div className="text-[11px] text-muted-foreground">{FRIENDS.length + 1} viewers · synced playback</div>
              </div>
              <div className="flex -space-x-2">
                {FRIENDS.map((f) => (
                  <div key={f.name} className={cn("w-7 h-7 rounded-full border-2 border-background bg-gradient-to-br flex items-center justify-center text-[10px] text-foreground", f.color)}>{f.name[0]}</div>
                ))}
                <div className="w-7 h-7 rounded-full border-2 border-background bg-gradient-gold flex items-center justify-center text-[10px] text-charcoal">Y</div>
              </div>
              <button onClick={() => { toast.success("Co-watch ended · highlights saved to Lamahat"); onClose(); }}
                className="ml-1 w-9 h-9 rounded-full bg-destructive/15 hover:bg-destructive/25 text-destructive flex items-center justify-center" aria-label="End call"><Phone className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Video stage */}
              <div className="rounded-2xl aspect-video relative overflow-hidden bg-gradient-hero shadow-float">
                <div className="absolute inset-0 bg-gradient-aurora opacity-50" />
                <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 8, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-mesh opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button onClick={() => setPlaying((p) => !p)} className="w-16 h-16 rounded-full glass-strong flex items-center justify-center hover:scale-105 transition" aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                  </button>
                </div>
                {/* Live badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/80 text-destructive-foreground text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-cream animate-pulse" /> LIVE SYNC
                </div>
                {/* Floating reactions */}
                <AnimatePresence>
                  {reactions.slice(-6).map((r) => (
                    <motion.div key={r.id}
                      initial={{ opacity: 0, y: 0, scale: 0.6, x: Math.random() * 120 - 60 }}
                      animate={{ opacity: 1, y: -120, scale: 1.4 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.4 }}
                      className="absolute bottom-16 left-1/2 text-3xl pointer-events-none">
                      {r.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div className="absolute bottom-0 inset-x-0 px-3 py-2 flex items-center gap-2 text-xs" style={{ color: "hsl(var(--cream))" }}>
                  <span className="font-mono">{fmt(time)}</span>
                  <div className="flex-1 h-1 rounded-full bg-foreground/20 overflow-hidden">
                    <div className="h-full bg-secondary transition-all" style={{ width: `${(time / DURATION) * 100}%` }} />
                  </div>
                  <span className="font-mono opacity-70">0:{DURATION}</span>
                </div>
              </div>

              {/* Reaction buttons */}
              <div className="flex justify-center gap-2">
                {["❤️", "🔥", "😂", "😍", "👏", "😮"].map((e) => (
                  <button key={e} onClick={() => react(e)} className="w-11 h-11 rounded-full glass hover:bg-muted/60 flex items-center justify-center text-xl transition hover:scale-110 active:scale-90">
                    {e}
                  </button>
                ))}
              </div>

              {/* Live chat */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <MessageCircle className="w-3 h-3" /> Live chat
                </div>
                <div ref={chatRef} className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-xl border p-3 flex items-start gap-2", c.user === "You" ? "border-secondary/40 bg-secondary/5" : "border-border/60 bg-card")}>
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0", c.user === "You" ? "bg-gradient-gold text-charcoal" : "bg-gradient-mesh text-primary-foreground")}>{c.user[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] flex items-center gap-1">
                          <span className="font-medium">{c.user}</span>
                          <span className="text-muted-foreground">· {c.at}</span>
                        </div>
                        <div className="text-sm">{c.text}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </div>

            <div className="border-t border-border/40 px-3 py-2.5">
              <div className="glass-strong rounded-full px-3 py-2 flex items-center gap-2 shadow-float">
                <Sparkles className="w-4 h-4 text-secondary" />
                <input
                  value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  className="flex-1 bg-transparent outline-none text-sm py-1.5"
                  placeholder="Comment in sync…"
                  aria-label="Comment"
                />
                <button onClick={send} disabled={!text.trim()} className="w-9 h-9 rounded-full bg-gradient-hero text-cream flex items-center justify-center disabled:opacity-40" aria-label="Send">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
