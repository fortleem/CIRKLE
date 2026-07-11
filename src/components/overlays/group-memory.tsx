"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, BookHeart, Sparkles, ChevronRight, Share2, Hourglass, Play,
  MessageCircle, Heart, Mic, BarChart3, Camera, Calendar, ShieldCheck,
  Loader2, Check,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Memory {
  id: string;
  title: string;
  caption: string;
  date: string;
  photos: number;
  swatches: string[];
  stats: { label: string; value: string; icon: typeof MessageCircle }[];
}

const CIRCLES = ["Cairo Book Club", "Yassin Family", "Cairo Cyclists"];

const MEMORIES: Memory[] = [
  {
    id: "m1",
    title: "The Friday Ride",
    caption: "12 of you rode to the Pyramids at sunrise. 47 messages.",
    date: "Mar 14",
    photos: 3,
    swatches: ["from-secondary/60 to-accent/30", "from-primary/60 to-steel/30", "from-accent/60 to-secondary/30"],
    stats: [
      { label: "Riders", value: "12", icon: MessageCircle },
      { label: "Messages", value: "47", icon: MessageCircle },
      { label: "Photos", value: "3", icon: Camera },
    ],
  },
  {
    id: "m2",
    title: "Book Club: The Queue",
    caption: "Deep discussion. 89 messages, 4 voice notes, 1 poll.",
    date: "Feb 28",
    photos: 2,
    swatches: ["from-primary/60 to-steel/30", "from-steel/60 to-primary/30"],
    stats: [
      { label: "Messages", value: "89", icon: MessageCircle },
      { label: "Voice notes", value: "4", icon: Mic },
      { label: "Polls", value: "1", icon: BarChart3 },
    ],
  },
  {
    id: "m3",
    title: "User's Birthday Surprise",
    caption: "Surprise party at Maadi. 156 reactions, 23 voice notes.",
    date: "Feb 09",
    photos: 4,
    swatches: [
      "from-accent/60 to-secondary/30",
      "from-secondary/60 to-accent/30",
      "from-rose/60 to-secondary/30",
      "from-primary/60 to-accent/30",
    ],
    stats: [
      { label: "Reactions", value: "156", icon: Heart },
      { label: "Voice notes", value: "23", icon: Mic },
      { label: "Photos", value: "4", icon: Camera },
    ],
  },
  {
    id: "m4",
    title: "First Meetup",
    caption: "8 of you met at Café Bateel. The beginning.",
    date: "Jan 04",
    photos: 1,
    swatches: ["from-secondary/60 to-primary/30"],
    stats: [
      { label: "Members", value: "8", icon: MessageCircle },
      { label: "Messages", value: "12", icon: MessageCircle },
    ],
  },
];

export function GroupMemory({ open, onClose }: Props) {
  const [circle, setCircle] = useState(CIRCLES[0]);
  const [autoCreate, setAutoCreate] = useState(true);
  const [reliving, setReliving] = useState<string | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);

  const startRelive = (m: Memory) => {
    setReliving(m.id);
    setSlideIdx(0);
    const id = setInterval(() => {
      setSlideIdx((i) => {
        if (i + 1 >= m.photos) {
          clearInterval(id);
          setTimeout(() => setReliving(null), 800);
          return i;
        }
        return i + 1;
      });
    }, 900);
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
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Group Memory"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0"
              >
                <BookHeart className="w-5 h-5 text-secondary" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Group Memory</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  AI-curated timeline of your Circle's best moments
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Circle selector */}
              <section className="rounded-2xl border border-border/60 bg-card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    Circle
                  </div>
                  <Select value={circle} onValueChange={setCircle}>
                    <SelectTrigger className="w-full h-9 bg-muted/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CIRCLES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Members</div>
                  <div className="font-display text-lg">14</div>
                </div>
              </section>

              {/* AI insight */}
              <section className="rounded-2xl border border-secondary/40 bg-gradient-to-br from-secondary/15 to-accent/5 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-secondary">
                  <Sparkles className="w-3 h-3" /> AI Insight
                </div>
                <p className="text-sm leading-relaxed">
                  Your Circle's vibe: <span className="font-medium text-secondary">Thoughtful &amp; Active</span>.
                  Most active on <span className="font-medium">Fridays</span>. Loves: <span className="font-medium">books, sunsets, food</span>.
                </p>
              </section>

              {/* Memory timeline */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Memory timeline
                </div>
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-[10px] top-1 bottom-1 w-px bg-gradient-to-b from-secondary/60 via-border to-transparent" />
                  <div className="space-y-4">
                    {MEMORIES.map((m, i) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="relative"
                      >
                        {/* Node */}
                        <div className="absolute -left-6 top-3 w-5 h-5 rounded-full bg-secondary border-2 border-background flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-background" />
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-display text-base leading-tight">{m.title}</div>
                              <div className="text-[11px] text-muted-foreground">{m.date}</div>
                            </div>
                            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                              Memory
                            </span>
                          </div>

                          {/* Photo grid */}
                          <div
                            className={cn(
                              "grid gap-1.5",
                              m.photos === 1 ? "grid-cols-1" : m.photos === 2 ? "grid-cols-2" : m.photos === 3 ? "grid-cols-3" : "grid-cols-2"
                            )}
                          >
                            {m.swatches.map((s, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "relative rounded-xl overflow-hidden bg-gradient-to-br",
                                  s,
                                  m.photos === 1 ? "aspect-video" : "aspect-square"
                                )}
                              >
                                {reliving === m.id && slideIdx === idx && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 flex items-center justify-center bg-charcoal/40"
                                  >
                                    <Loader2 className="w-4 h-4 animate-spin text-cream" />
                                  </motion.div>
                                )}
                                {reliving === m.id && slideIdx === idx && (
                                  <motion.div
                                    layoutId={`relive-${m.id}`}
                                    className="absolute inset-0 border-2 border-secondary"
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          {/* AI caption */}
                          <div className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2">
                            <Sparkles className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                            <p className="text-[12px] italic leading-relaxed">{m.caption}</p>
                          </div>

                          {/* Stats */}
                          <div className="flex flex-wrap items-center gap-2">
                            {m.stats.map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground flex items-center gap-1"
                              >
                                <s.icon className="w-3 h-3" />
                                <span className="font-medium text-foreground">{s.value}</span> {s.label}
                              </span>
                            ))}
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              onClick={() => startRelive(m)}
                              disabled={reliving === m.id}
                              className="text-[11px] px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1 hover:opacity-90 transition disabled:opacity-60"
                            >
                              {reliving === m.id ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> Reliving…</>
                              ) : (
                                <><Play className="w-3 h-3" /> Relive</>
                              )}
                            </button>
                            <button
                              onClick={() => toast.success("Shared to Midan", { description: m.title })}
                              className="text-[11px] px-3 py-1.5 rounded-full bg-muted/40 border border-border/50 flex items-center gap-1 hover:bg-muted/60 transition"
                            >
                              <Share2 className="w-3 h-3" /> Share to Midan
                            </button>
                            <button
                              onClick={() => toast.success("Added to Time Capsule", { description: `${m.title} · unlocks in 1 year` })}
                              className="text-[11px] px-3 py-1.5 rounded-full bg-muted/40 border border-border/50 flex items-center gap-1 hover:bg-muted/60 transition"
                            >
                              <Hourglass className="w-3 h-3" /> Add to Time Capsule
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Auto-create toggle */}
              <section className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">AI auto-creates memories weekly</div>
                  <div className="text-[11px] text-muted-foreground">
                    Cirkle AI reviews activity and crafts a memory every Sunday.
                  </div>
                </div>
                <Switch checked={autoCreate} onCheckedChange={(v) => {
                  setAutoCreate(v);
                  if (v) toast.success("Weekly memories enabled", { description: "Next review this Sunday." });
                }} aria-label="Toggle weekly auto-create" />
              </section>

              {/* Privacy */}
              <section className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Memories are generated on-device from your Circle's activity.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
