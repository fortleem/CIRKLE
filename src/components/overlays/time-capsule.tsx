"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Lock, Hourglass, Sparkles, Calendar, User, Users, ChevronRight,
  LockKeyhole, Mail, Eye, EyeOff, Loader2, Check,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Recipient = "Self" | "Friend" | "Circle";
type Mood = "Nostalgic" | "Hopeful" | "Grateful" | "Playful";

const MOODS: { k: Mood; emoji: string; tint: string }[] = [
  { k: "Nostalgic", emoji: "🍂", tint: "from-secondary/30 to-secondary/5 border-secondary/40" },
  { k: "Hopeful", emoji: "🌱", tint: "from-primary/30 to-primary/5 border-primary/40" },
  { k: "Grateful", emoji: "🙏", tint: "from-accent/30 to-accent/5 border-accent/40" },
  { k: "Playful", emoji: "🎉", tint: "from-steel/30 to-steel/5 border-steel/40" },
];

const RECIPIENTS: { k: Recipient; icon: typeof User; desc: string }[] = [
  { k: "Self", icon: User, desc: "A letter to your future self" },
  { k: "Friend", icon: Mail, desc: "Hand to a Circle contact" },
  { k: "Circle", icon: Users, desc: "Open in a private Circle" },
];

interface Capsule {
  id: string;
  recipient: Recipient;
  mood: Mood;
  dateISO: string;
  message: string;
  opened: boolean;
  ready: boolean;
}

const INITIAL_CAPSULES: Capsule[] = [
  {
    id: "cap1",
    recipient: "Self",
    mood: "Hopeful",
    dateISO: "2025-01-01",
    message:
      "Dear future me — if you're reading this, you made it through another year. Remember the sunset at AlUla. Remember how loved you felt. Don't lose that.",
    opened: false,
    ready: true,
  },
  {
    id: "cap2",
    recipient: "Friend",
    mood: "Grateful",
    dateISO: "2026-03-14",
    message:
      "Sample message — your time capsule message will appear here.",
    opened: false,
    ready: false,
  },
  {
    id: "cap3",
    recipient: "Circle",
    mood: "Playful",
    dateISO: "2026-08-22",
    message:
      "To the Riyadh chapter — when this unlocks, we'll be celebrating three years of the Design Workspace. Drinks at Café Bateel. First round on me.",
    opened: false,
    ready: false,
  },
];

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function daysUntil(iso: string): number {
  const target = new Date(iso + "T00:00:00");
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatISO(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function TimeCapsule({ open, onClose }: Props) {
  const [letter, setLetter] = useState("");
  const [date, setDate] = useState<string>(tomorrowISO());
  const [recipient, setRecipient] = useState<Recipient>("Self");
  const [mood, setMood] = useState<Mood>("Hopeful");
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [capsules, setCapsules] = useState<Capsule[]>(INITIAL_CAPSULES);
  const [openedId, setOpenedId] = useState<string | null>(null);

  const min = tomorrowISO();
  const days = useMemo(() => Math.max(0, daysUntil(date)), [date]);
  const moodMeta = MOODS.find((m) => m.k === mood)!;

  const seal = () => {
    if (!letter.trim()) {
      toast.error("Write a letter first");
      return;
    }
    if (!date) {
      toast.error("Pick a future date");
      return;
    }
    setSealing(true);
    setSealed(false);
    setTimeout(() => {
      setSealing(false);
      setSealed(true);
      const newCap: Capsule = {
        id: `cap${Date.now()}`,
        recipient,
        mood,
        dateISO: date,
        message: letter,
        opened: false,
        ready: false,
      };
      setCapsules((c) => [newCap, ...c]);
      toast.success("Time Capsule sealed", {
        description: `Will unlock on ${formatISO(date)}.`,
      });
      setTimeout(() => {
        setLetter("");
        setSealed(false);
        onClose();
      }, 700);
    }, 2000);
  };

  const openCapsule = (c: Capsule) => {
    setCapsules((cs) => cs.map((x) => (x.id === c.id ? { ...x, opened: true } : x)));
    setOpenedId(c.id);
    toast.success("Capsule unlocked", { description: `${formatISO(c.dateISO)} · sealed ${daysUntil(c.dateISO) < 0 ? Math.abs(daysUntil(c.dateISO)) : 0} days ago` });
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
            role="dialog" aria-label="Time Capsule"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <motion.div
                animate={sealing ? { rotate: [0, -8, 8, -8, 0], scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.2, repeat: sealing ? Infinity : 0 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0"
              >
                <Hourglass className="w-5 h-5 text-secondary" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Time Capsule</div>
                <div className="text-[11px] text-muted-foreground">Letters to the future · sealed on-device</div>
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
              {/* Composer */}
              <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="w-3 h-3 text-secondary" /> Write your letter
                </div>
                <textarea
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  placeholder="Dear future me… What do you want to remember about today? What hopes do you want to send forward?"
                  rows={4}
                  className="w-full bg-muted/40 rounded-xl p-3 text-sm outline-none resize-none border border-border/50 focus:border-secondary/60 transition"
                  maxLength={800}
                />
                <div className="flex justify-end text-[10px] text-muted-foreground">{letter.length}/800</div>

                {/* Date + Recipient */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
                      <Calendar className="w-3 h-3" /> Unlock date
                    </span>
                    <input
                      type="date"
                      value={date}
                      min={min}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-muted/40 rounded-xl px-3 py-2 text-sm outline-none border border-border/50 focus:border-secondary/60 transition"
                    />
                  </label>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">Recipient</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {RECIPIENTS.map((r) => (
                        <button
                          key={r.k}
                          onClick={() => setRecipient(r.k)}
                          className={cn(
                            "rounded-xl px-2 py-2 text-[11px] flex flex-col items-center gap-1 border transition",
                            recipient === r.k
                              ? "bg-secondary/15 border-secondary/60 text-secondary"
                              : "bg-muted/30 border-border/50 hover:bg-muted/60"
                          )}
                        >
                          <r.icon className="w-4 h-4" />
                          {r.k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">Mood</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {MOODS.map((m) => (
                      <button
                        key={m.k}
                        onClick={() => setMood(m.k)}
                        className={cn(
                          "rounded-xl px-2 py-2 text-[11px] flex items-center justify-center gap-1 border transition",
                          mood === m.k
                            ? cn("bg-gradient-to-br", m.tint)
                            : "bg-muted/30 border-border/50 hover:bg-muted/60"
                        )}
                      >
                        <span>{m.emoji}</span> {m.k}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Preview capsule card */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <LockKeyhole className="w-3 h-3" /> Preview
                </div>
                <motion.div
                  animate={sealing ? { boxShadow: ["0 0 0px hsl(var(--secondary) / 0)", "0 0 60px hsl(var(--secondary) / 0.7)", "0 0 0px hsl(var(--secondary) / 0)"] } : {}}
                  transition={{ duration: 2, repeat: sealing ? Infinity : 0 }}
                  className={cn(
                    "relative rounded-2xl border bg-gradient-to-br p-5 overflow-hidden",
                    moodMeta.tint
                  )}
                >
                  <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-secondary/20 blur-3xl" />
                  <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-accent/20 blur-3xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={sealing ? { scale: [1, 0.9, 1], rotate: [0, -10, 10, 0] } : {}}
                        transition={{ duration: 1.4, repeat: sealing ? Infinity : 0 }}
                        className="w-10 h-10 rounded-xl glass flex items-center justify-center"
                      >
                        {sealing ? <Loader2 className="w-4 h-4 text-secondary animate-spin" /> : <Lock className="w-4 h-4 text-secondary" />}
                      </motion.div>
                      <div>
                        <div className="font-display text-lg leading-tight">
                          {sealed ? "Sealed" : "Sealing…"}
                          {sealing && <Loader2 className="w-3 h-3 ml-1 inline animate-spin" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">To: {recipient} · {moodMeta.emoji} {mood}</div>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-foreground/10">{days > 0 ? `${days}d` : "Today"}</span>
                  </div>
                  <div className="relative mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Unlocks</div>
                      <div className="font-medium">{formatISO(date)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Countdown</div>
                      <div className="font-medium gradient-text-gold">Unlocks in {days} day{days === 1 ? "" : "s"}</div>
                    </div>
                  </div>
                  <div className="relative mt-3 rounded-xl bg-foreground/5 px-3 py-2 text-[11px] text-muted-foreground italic">
                    {letter ? `"${letter.slice(0, 80)}${letter.length > 80 ? "…" : ""}"` : "Your sealed words will appear here…"}
                  </div>
                  <button
                    onClick={seal}
                    disabled={sealing || !letter.trim()}
                    className="relative mt-4 w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                  >
                    {sealing ? <><Loader2 className="w-4 h-4 animate-spin" /> Sealing…</> : sealed ? <><Check className="w-4 h-4" /> Sealed</> : <><LockKeyhole className="w-4 h-4" /> Seal &amp; Schedule</>}
                  </button>
                </motion.div>
              </section>

              {/* Existing capsules */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Hourglass className="w-3 h-3" /> Your capsules
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {capsules.map((c) => {
                    const meta = MOODS.find((m) => m.k === c.mood)!;
                    const daysLeft = daysUntil(c.dateISO);
                    const isOpen = openedId === c.id && c.opened;
                    return (
                      <motion.div
                        key={c.id}
                        layout
                        className={cn(
                          "rounded-2xl border p-3 transition",
                          c.opened
                            ? "bg-card border-secondary/30"
                            : c.ready
                              ? cn("bg-gradient-to-br", meta.tint)
                              : "bg-muted/30 border-border/60"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", c.opened ? "bg-secondary/15" : "glass")}>
                              {c.opened ? <Mail className="w-3.5 h-3.5 text-secondary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate">To {c.recipient} · {meta.emoji} {c.mood}</div>
                              <div className="text-[10px] text-muted-foreground">{formatISO(c.dateISO)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.ready && !c.opened ? (
                              <button
                                onClick={() => openCapsule(c)}
                                className="text-[10px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition"
                              >
                                Open
                              </button>
                            ) : c.opened ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary flex items-center gap-1">
                                <Check className="w-3 h-3" /> Opened
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> {daysLeft}d
                              </span>
                            )}
                          </div>
                        </div>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-border/40">
                                <div className="rounded-xl bg-foreground/5 px-3 py-2 text-xs italic leading-relaxed">
                                  {c.message}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* Privacy note */}
              <section className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                <LockKeyhole className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Encrypted on-device. Stored on IPFS. Only unlocks on the scheduled date — not even Cirkle can open it early.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
