"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Sparkles, Loader2, Check, RotateCcw, ArrowRight,
  Sunrise, Zap, Brain, Moon, Target, PartyPopper, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Mood {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  tint: string;
  accent: string;
}

const MOODS: Mood[] = [
  { id: "calm", emoji: "🌅", name: "Calm", desc: "Soft photos, slow videos, gentle posts", icon: Sunrise, tint: "from-primary/30 to-primary/5 border-primary/40", accent: "text-primary" },
  { id: "energized", emoji: "⚡", name: "Energized", desc: "Upbeat reels, trending topics, active spaces", icon: Zap, tint: "from-secondary/30 to-secondary/5 border-secondary/40", accent: "text-secondary" },
  { id: "curious", emoji: "🤔", name: "Curious", desc: "Deep dives, long reads, new perspectives", icon: Brain, tint: "from-steel/30 to-steel/5 border-steel/40", accent: "text-steel" },
  { id: "tired", emoji: "😴", name: "Tired", desc: "Easy scrolls, feel-good content, no heavy news", icon: Moon, tint: "from-accent/30 to-accent/5 border-accent/40", accent: "text-accent" },
  { id: "focused", emoji: "💪", name: "Focused", desc: "Productivity tools, learning, minimal noise", icon: Target, tint: "from-secondary/30 to-primary/5 border-secondary/40", accent: "text-secondary" },
  { id: "playful", emoji: "🎉", name: "Playful", desc: "Memes, fun reels, lighthearted chats", icon: PartyPopper, tint: "from-accent/30 to-secondary/5 border-accent/40", accent: "text-accent" },
];

interface FeedItem {
  id: string;
  kind: "photo" | "reel" | "post" | "space";
  title: string;
  meta: string;
  body: string;
  sceneIdx: number;
}

const FEEDS: Record<string, FeedItem[]> = {
  calm: [
    { id: "c1", kind: "photo", title: "Sunset over AlUla", meta: "@dunes.studio · Lamahat", body: "Soft sandstone glowing amber as the light fades — a 9-photo carousel.", sceneIdx: 1 },
    { id: "c2", kind: "reel", title: "Ambient desert soundscape", meta: "@sahara.beats · Mashahd", body: "3-min slow reel with original field recordings — wind, breath, distant birds.", sceneIdx: 3 },
    { id: "c3", kind: "post", title: "Gentle Midan: a gratitude thread", meta: "@noor · Midan", body: "“Three small things that went right today — share yours below.” 218 replies, all kind.", sceneIdx: 0 },
    { id: "c4", kind: "space", title: "Quiet Hours · reading room", meta: "@reads · 412 listening", body: "A silent Space — readers keep each other company while they read.", sceneIdx: 4 },
  ],
  energized: [
    { id: "e1", kind: "reel", title: "Boulevard World drone pass", meta: "@urbanksa · 212K likes", body: "60-second fly-through of tonight's drone show — trending #1 in Riyadh.", sceneIdx: 0 },
    { id: "e2", kind: "space", title: "Riyadh Tech After-Hours", meta: "@majidf · LIVE · 1.4K", body: "Hot takes on the Apple Vision Pro launch in MENA. Join the fray.", sceneIdx: 4 },
    { id: "e3", kind: "post", title: "Tariq's hot take of the day", meta: "@tariq.dev · 1.3K likes", body: "“Cirkle Pay's NFC animation deserves an Oscar 🏆” — 220 reposts and counting.", sceneIdx: 1 },
    { id: "e4", kind: "photo", title: "Live from Formula E paddock", meta: "@fepyk · Lamahat", body: "Behind-the-scenes carousel — 12 photos, all gold.", sceneIdx: 3 },
  ],
  curious: [
    { id: "cu1", kind: "post", title: "Calm tech — a 12-min read", meta: "@reads · Midan", body: "An essay on designing software that respects attention. Cirkle AI queued it for you.", sceneIdx: 1 },
    { id: "cu2", kind: "reel", title: "How Diriyah's lights are mapped", meta: "@dunes.studio · Mashahd", body: "8-min mini-doc on the laser rigging behind the festival.", sceneIdx: 3 },
    { id: "cu3", kind: "photo", title: "Architecture of NEOM's bay", meta: "@arch · Lamahat", body: "24-photo study of lines, reflections, and negative space.", sceneIdx: 5 },
    { id: "cu4", kind: "space", title: "Long Reads · weekly salon", meta: "@reads · 318 listening", body: "This week: “The Mushroom at the End of the World” — chapter 1.", sceneIdx: 4 },
  ],
  tired: [
    { id: "t1", kind: "reel", title: "A cat falls asleep on a sofa", meta: "@cats.of.riyadh · 88K likes", body: "42 seconds. No plot. No news. Just a cat.", sceneIdx: 1 },
    { id: "t2", kind: "post", title: "Tell me something good that happened", meta: "@noor · Midan", body: "Reply-only thread. 1,420 small joys shared so far.", sceneIdx: 2 },
    { id: "t3", kind: "photo", title: "Coffee steam, slow morning", meta: "@chefnoura · Lamahat", body: "One photo. The smell is implied.", sceneIdx: 2 },
    { id: "t4", kind: "space", title: "Lofi Lounge · come and go", meta: "@sahara.beats · 612", body: "Music-only Space. No talking. Stay as long as you like.", sceneIdx: 4 },
  ],
  focused: [
    { id: "f1", kind: "post", title: "Your weekly plan, by Cirkle AI", meta: "@cirkle · Midan", body: "3 priorities, 2 deep-work blocks, 1 thing to drop. Generated on-device.", sceneIdx: 0 },
    { id: "f2", kind: "reel", title: "Notion-class blocks in 90s", meta: "@cirkle.workspace", body: "Quick tour of Workspaces — boards, docs, calls. Free, encrypted.", sceneIdx: 3 },
    { id: "f3", kind: "space", title: "Silent co-working · 8–10pm", meta: "@reads · 218", body: "Cameras off. Mics off. Presence only. We just work, together.", sceneIdx: 4 },
    { id: "f4", kind: "photo", title: "Workspace of the week", meta: "@design.workspace", body: "A clean Riyadh desk — pinned in your workspace mood board.", sceneIdx: 5 },
  ],
  playful: [
    { id: "p1", kind: "reel", title: "Kunafa hack — 3 minutes flat", meta: "@chefnoura · 89K likes", body: "Disclaimer: probably doesn't taste like grandma's. Still funny.", sceneIdx: 2 },
    { id: "p2", kind: "post", title: "Rate my Cirkle avatar 1–10", meta: "@monak · 32 replies", body: "32 people rated. 14 said 11/10. User is taking notes.", sceneIdx: 0 },
    { id: "p3", kind: "reel", title: "POV: you forgot Cirkle Pay exists", meta: "@tariq.dev · Mashahd", body: "15-second skit. Don't take financial advice from Tariq.", sceneIdx: 1 },
    { id: "p4", kind: "space", title: "Meme jury · live verdicts", meta: "@midan.funny · 802", body: "Drop your meme in queue. The audience roasts it. Live.", sceneIdx: 3 },
  ],
};

const KIND_BADGE: Record<FeedItem["kind"], { label: string; color: string }> = {
  photo: { label: "Lamahat", color: "bg-accent/15 text-accent" },
  reel: { label: "Mashahd", color: "bg-secondary/15 text-secondary" },
  post: { label: "Midan", color: "bg-primary/15 text-primary" },
  space: { label: "Live Space", color: "bg-rose/15 text-rose" },
};

export function MoodFeed({ open, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [reshaping, setReshaping] = useState(false);
  const [applied, setApplied] = useState(false);

  const pick = (id: string) => {
    setSelected(id);
    setReshaping(true);
    setApplied(false);
    setTimeout(() => setReshaping(false), 2000);
  };

  const apply = () => {
    if (!selected) return;
    const mood = MOODS.find((m) => m.id === selected)!;
    setApplied(true);
    toast.success(`Feed updated to ${mood.name} mode`, {
      description: `${mood.emoji} ${mood.desc}`,
    });
    setTimeout(() => {
      onClose();
      window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "home" } }));
    }, 500);
  };

  const reset = () => {
    setSelected(null);
    setApplied(false);
    toast("Feed reset to default");
  };

  const feed = selected ? FEEDS[selected] : [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.7)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Mood Feed"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Mood Feed</div>
                <div className="text-[11px] text-muted-foreground">AI reshapes your feed based on how you feel</div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Mood grid */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">How are you feeling?</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {MOODS.map((m, i) => (
                    <motion.button
                      key={m.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      onClick={() => pick(m.id)}
                      className={cn(
                        "relative text-start rounded-2xl border p-3 min-h-[110px] transition overflow-hidden group",
                        selected === m.id
                          ? cn("bg-gradient-to-br", m.tint, "scale-[1.02]")
                          : "bg-card border-border/60 hover:bg-muted/40"
                      )}
                    >
                      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-foreground/5 blur-2xl group-hover:bg-foreground/10 transition" />
                      <div className="relative flex items-start justify-between">
                        <span className="text-2xl">{m.emoji}</span>
                        {selected === m.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center"
                          >
                            <Check className="w-3 h-3" />
                          </motion.div>
                        )}
                      </div>
                      <div className="relative mt-2">
                        <div className="font-display text-base leading-tight">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{m.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* Reshaping + preview */}
              <AnimatePresence mode="wait">
                {selected && (
                  <motion.section
                    key={selected + (reshaping ? "-r" : "-p")}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {reshaping ? (
                      <div className="rounded-2xl border border-border/60 bg-card p-8 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                        <div className="text-sm font-medium">AI is reshaping your feed…</div>
                        <div className="text-[11px] text-muted-foreground">Matching posts, reels, photos &amp; spaces to your mood — on-device.</div>
                        <div className="mt-2 flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-secondary"
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-secondary" /> Curated for {MOODS.find((m) => m.id === selected)!.name}
                        </div>
                        <div className="space-y-2">
                          {feed.map((item, i) => {
                            const badge = KIND_BADGE[item.kind];
                            return (
                              <motion.article
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="rounded-2xl border border-border/60 bg-card overflow-hidden flex"
                              >
                                <div className="relative w-24 shrink-0">
                                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10" />
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/80" />
                                </div>
                                <div className="flex-1 min-w-0 p-3">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className={cn("text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full", badge.color)}>{badge.label}</span>
                                    <span className="text-[10px] text-muted-foreground truncate">{item.meta}</span>
                                  </div>
                                  <div className="font-medium text-sm leading-tight truncate">{item.title}</div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.body}</div>
                                </div>
                              </motion.article>
                            );
                          })}
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={apply}
                            disabled={applied}
                            className="flex-1 rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
                          >
                            {applied ? <><Check className="w-4 h-4" /> Applied</> : <>Apply mood <ArrowRight className="w-4 h-4" /></>}
                          </button>
                          <button
                            onClick={reset}
                            className="rounded-xl glass px-3 py-2.5 text-sm flex items-center gap-1.5 hover:bg-muted/60 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                          </button>
                        </div>
                      </>
                    )}
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Privacy note */}
              <section className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your mood is processed on-device. Cirkle AI never stores how you feel.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
