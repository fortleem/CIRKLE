"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, MessageCircle, Heart, Send, Smile, Sparkles, Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

type Mood = "calm" | "playful" | "intense" | "focus" | "warm" | "electric";

const MOODS: { k: Mood; emoji: string; label: string; grad: string; reply: string }[] = [
  { k: "calm", emoji: "🌙", label: "Calm", grad: "from-primary/40 to-primary/10", reply: "Sounds peaceful. I'm here for the slow morning." },
  { k: "playful", emoji: "🎉", label: "Playful", grad: "from-secondary/40 to-secondary/10", reply: "Haha yes! I'm in 🎉" },
  { k: "intense", emoji: "🔥", label: "Intense", grad: "from-accent/40 to-accent/10", reply: "Let's get into it. I have strong feelings here." },
  { k: "focus", emoji: "🎯", label: "Focus", grad: "from-steel/40 to-steel/10", reply: "On it. Outline first?" },
  { k: "warm", emoji: "🤍", label: "Warm", grad: "from-secondary/30 to-accent/20", reply: "Sending you a quiet hug." },
  { k: "electric", emoji: "⚡", label: "Electric", grad: "from-accent/30 to-secondary/30", reply: "Let's GO. Energy matched." },
];

interface Msg { id: number; me: boolean; text: string; mood: Mood; }

const SEED: Msg[] = [
  { id: 1, me: false, text: "Switch the vibe — I'm leaning calm for the rest of the chat 🌙", mood: "calm" },
  { id: 2, me: true, text: "Yes. Same here.", mood: "calm" },
];

export function MoodChat({ open, onClose }: Props) {
  const [mood, setMood] = useState<Mood>("calm");
  const [intensity, setIntensity] = useState(60);
  const [enabled, setEnabled] = useState(true);
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [idc, setIdc] = useState(100);
  const listRef = useRef<HTMLDivElement>(null);

  const moodMeta = MOODS.find((m) => m.k === mood)!;

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setMessages(SEED); setMood("calm"); setInput(""); setIntensity(60); setEnabled(true);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (text: string) => {
    if (!enabled) { toast("Mood Chat is paused — toggle on to send."); return; }
    const t = text.trim();
    if (!t) return;
    const id = idc + 1; setIdc(id);
    // Intensity scales exclamation marks/punctuation playfully.
    const suffix = intensity > 75 ? "!" : intensity > 40 ? "" : "…";
    setMessages((m) => [...m, { id, me: true, text: t + suffix, mood }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: id + 1, me: false, text: moodMeta.reply, mood }]);
    }, 1200);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Mood Chat"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br border border-border/40 flex items-center justify-center shrink-0", moodMeta.grad)}>
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Mood Chat</div>
                <div className="text-[11px] text-muted-foreground">{moodMeta.emoji} {moodMeta.label} · intensity {intensity}%</div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full glass">
                <span className="text-[10px] text-muted-foreground">On</span>
                <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable mood chat" />
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* 6 mood-gradient bubbles */}
            <div className="px-5 py-3 border-b border-border/40 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {MOODS.map((m) => {
                const on = mood === m.k;
                return (
                  <button
                    key={m.k} onClick={() => setMood(m.k)} disabled={!enabled}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-2 text-[11px] flex items-center gap-1 border transition",
                      on ? cn("bg-gradient-to-br text-foreground", m.grad, "border-foreground/20") : "bg-muted/30 border-border/50 hover:bg-muted/60",
                      !enabled && "opacity-50",
                    )}
                  >
                    <span className="text-base">{m.emoji}</span> {m.label}
                  </button>
                );
              })}
            </div>

            {/* Intensity slider */}
            <div className="px-5 py-2 border-b border-border/40 flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">Intensity</span>
              <Slider value={[intensity]} onValueChange={(v) => setIntensity(v[0] ?? 60)} min={0} max={100} step={5} disabled={!enabled} className="flex-1" aria-label="Mood intensity" />
              <span className="text-[11px] text-secondary tabular-nums shrink-0 w-8 text-right">{intensity}%</span>
            </div>

            {/* Message list */}
            <div ref={listRef} className={cn("flex-1 overflow-y-auto px-5 py-4 space-y-3 transition-colors", !enabled && "opacity-50")}>
              {messages.map((m) => {
                const meta = MOODS.find((x) => x.k === m.mood)!;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={cn("max-w-[80%] px-4 py-2.5 rounded-2xl text-sm",
                      m.me
                        ? cn("ms-auto text-foreground bg-gradient-to-br rounded-br-md", meta.grad, "border border-foreground/10")
                        : "me-auto bg-card border border-border/50 rounded-bl-md")}
                  >
                    {m.text}
                  </motion.div>
                );
              })}
              {typing && (
                <div className="me-auto bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  ))}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-border/40 px-3 py-2.5">
              <div className="glass-strong rounded-full px-3 py-2 flex items-center gap-2 shadow-float">
                <button onClick={() => toast("Emoji picker — Coming soon")} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Emoji"><Smile className="w-4 h-4" /></button>
                <input
                  value={input} onChange={(e) => setInput(e.target.value)} disabled={!enabled}
                  onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
                  className="flex-1 bg-transparent outline-none text-sm py-1.5 disabled:opacity-50"
                  placeholder={enabled ? `Message · ${moodMeta.label} mood` : "Mood chat paused"}
                />
                <button onClick={() => send(input)} disabled={!enabled || !input.trim()}
                  className="w-9 h-9 rounded-full bg-gradient-hero text-cream flex items-center justify-center disabled:opacity-40" aria-label="Send">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => { if (enabled) toast.success("Mood reaction sent", { description: `${moodMeta.emoji} ${moodMeta.label}` }); }}
                disabled={!enabled}
                className="mt-2 w-full text-[11px] text-secondary flex items-center justify-center gap-1 py-1 disabled:opacity-50"
              >
                <Heart className="w-3 h-3" /> React with this mood
                <Sparkles className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
