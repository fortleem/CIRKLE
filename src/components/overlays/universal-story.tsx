"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Layers, Sparkles, Loader2, Send, Eye, MessageCircle, Image as ImageIcon, Play,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

type PillarId = "midan" | "wasl" | "lamahat" | "mashahd";

interface Pillar {
  id: PillarId;
  name: string;
  icon: typeof MessageCircle;
  desc: string;
  tint: string;
  optimize: (text: string) => string;
}

const PILLARS: Pillar[] = [
  {
    id: "midan",
    name: "Midan",
    icon: MessageCircle,
    desc: "Public square — short, punchy, hook-first.",
    tint: "from-secondary/20 to-transparent border-secondary/40",
    optimize: (t) => t.split(/[.!?]/)[0].slice(0, 90) + (t.length > 90 ? "…" : ""),
  },
  {
    id: "wasl",
    name: "Wasl",
    icon: Send,
    desc: "Chat — direct, warm, conversational tone.",
    tint: "from-primary/20 to-transparent border-primary/40",
    optimize: (t) => "Hey — " + t.toLowerCase().slice(0, 120),
  },
  {
    id: "lamahat",
    name: "Lamahat",
    icon: ImageIcon,
    desc: "Photo moments — visual caption, sensory.",
    tint: "from-accent/20 to-transparent border-accent/40",
    optimize: (t) => "Golden hour · " + t.slice(0, 60),
  },
  {
    id: "mashahd",
    name: "Mashahd",
    icon: Play,
    desc: "Video — teaser with a cliffhanger.",
    tint: "from-steel/20 to-transparent border-steel/40",
    optimize: (t) => "Watch this — " + t.slice(0, 80) + " (wait for it)",
  },
];

export function UniversalStory({ open, onClose }: Props) {
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState<Record<PillarId, boolean>>({
    midan: true, wasl: true, lamahat: false, mashahd: false,
  });
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);

  const toggle = (id: PillarId) => setEnabled((e) => ({ ...e, [id]: !e[id] }));

  const optimize = () => {
    if (!text.trim()) { toast.error("Write your story first"); return; }
    const count = Object.values(enabled).filter(Boolean).length;
    if (count === 0) { toast.error("Pick at least one pillar"); return; }
    setOptimizing(true);
    setOptimized(false);
    setTimeout(() => {
      setOptimizing(false);
      setOptimized(true);
      toast.success(`Story optimized for ${count} pillar${count === 1 ? "" : "s"}`, { description: "On-device · no uploads" });
    }, 1500);
  };

  const publish = () => {
    const count = Object.values(enabled).filter(Boolean).length;
    toast.success(`Published to ${count} pillar${count === 1 ? "" : "s"}`, { description: PILLARS.filter((p) => enabled[p.id]).map((p) => p.name).join(" · ") });
    setText("");
    setOptimized(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Universal Story"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Universal Story</div>
                <div className="text-[11px] text-muted-foreground">Post once · AI optimizes for every pillar</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-secondary" /> Your story
                </div>
                <textarea
                  value={text} onChange={(e) => { setText(e.target.value); setOptimized(false); }}
                  placeholder="Write once. Cirkle AI adapts it for each pillar — Midan punch, Wasl warmth, Lamahat captions, Mashahd teasers."
                  rows={4} maxLength={400}
                  className="w-full bg-muted/40 rounded-xl p-3 text-sm outline-none resize-none border border-border/50 focus:border-secondary/60 transition"
                />
                <div className="flex justify-end text-[10px] text-muted-foreground">{text.length}/400</div>
              </section>

              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Pillars to publish</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PILLARS.map((p) => {
                    const on = enabled[p.id];
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={cn(
                          "rounded-xl border p-3 flex items-start gap-3 text-start transition",
                          on ? cn("bg-gradient-to-br", p.tint) : "bg-muted/30 border-border/50 hover:bg-muted/60",
                        )}
                      >
                        <Checkbox checked={on} className="mt-0.5 pointer-events-none" aria-hidden />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <p.icon className="w-3.5 h-3.5 text-secondary" /> {p.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-snug">{p.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <button
                onClick={optimize} disabled={optimizing || !text.trim()}
                className="w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              >
                {optimizing ? <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing…</> : <><Sparkles className="w-4 h-4" /> Optimize for {Object.values(enabled).filter(Boolean).length} pillars</>}
              </button>

              {optimized && (
                <section className="space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Eye className="w-3 h-3" /> Live previews
                  </div>
                  {PILLARS.filter((p) => enabled[p.id]).map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-2xl border bg-gradient-to-br p-4", p.tint)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <p.icon className="w-3.5 h-3.5 text-secondary" /> {p.name}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10">AI-optimized</span>
                      </div>
                      <p className="text-sm leading-relaxed">{text.trim() ? p.optimize(text.trim()) : "Your optimized post will appear here…"}</p>
                    </motion.div>
                  ))}
                </section>
              )}
            </div>

            <div className="border-t border-border/50 px-5 py-3">
              <button
                onClick={publish} disabled={!optimized}
                className="w-full rounded-xl bg-gradient-gold text-brand-charcoal py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Publish
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
