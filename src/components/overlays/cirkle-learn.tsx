"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  GraduationCap,
  Languages,
  Code2,
  BookOpen,
  Globe2,
  Palette,
  TrendingUp,
  Play,
  Send,
  Flame,
  Target,
  Clock,
  Sparkles,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";

interface Props {
  open: boolean;
  onClose: () => void;
}

type SubjectId =
  | "languages"
  | "coding"
  | "exam"
  | "cultural"
  | "creative"
  | "business";

interface Subject {
  id: SubjectId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  emoji: string;
  tint: string;
  accent: string;
}

const SUBJECTS: Subject[] = [
  {
    id: "languages",
    name: "Languages",
    tagline: "Arabic · English · French · more",
    icon: Languages,
    emoji: "🗣️",
    tint: "from-teal/30 to-transparent",
    accent: "text-teal",
  },
  {
    id: "coding",
    name: "Coding",
    tagline: "Python, JS, SQL, web",
    icon: Code2,
    emoji: "💻",
    tint: "from-steel/30 to-transparent",
    accent: "text-steel",
  },
  {
    id: "exam",
    name: "Exam Prep",
    tagline: "Qudrat, SAT, IELTS",
    icon: BookOpen,
    emoji: "📚",
    tint: "from-gold/30 to-transparent",
    accent: "text-gold",
  },
  {
    id: "cultural",
    name: "Cultural",
    tagline: "History, art, heritage",
    icon: Globe2,
    emoji: "🌍",
    tint: "from-rose/30 to-transparent",
    accent: "text-rose",
  },
  {
    id: "creative",
    name: "Creative",
    tagline: "Writing, design, music",
    icon: Palette,
    emoji: "🎨",
    tint: "from-rose/30 to-transparent",
    accent: "text-rose",
  },
  {
    id: "business",
    name: "Business",
    tagline: "Marketing, finance, leadership",
    icon: TrendingUp,
    emoji: "📈",
    tint: "from-gold/30 to-transparent",
    accent: "text-gold",
  },
];

interface Course {
  title: string;
  subject: SubjectId;
  progress: number; // 0-100
  lesson: string;
  emoji: string;
}

const SAMPLE_COURSES: Course[] = [
  {
    title: "Arabic for Beginners",
    subject: "languages",
    progress: 64,
    lesson: "Lesson 12 · Greetings & polite forms",
    emoji: "📖",
  },
  {
    title: "Python Basics",
    subject: "coding",
    progress: 38,
    lesson: "Lesson 7 · Loops & list comprehensions",
    emoji: "🐍",
  },
  {
    title: "Saudi Culture 101",
    subject: "cultural",
    progress: 82,
    lesson: "Lesson 9 · Diriyah & the first Saudi state",
    emoji: "🕌",
  },
];

export function CirkleLearn({ open, onClose }: Props) {
  const [active, setActive] = useState<SubjectId | null>(null);
  const [level, setLevel] = useState<"Beginner" | "Intermediate" | "Advanced">(
    "Beginner"
  );
  const [goal, setGoal] = useState<10 | 15 | 30>(15);
  const [ask, setAsk] = useState("");
  const subject = SUBJECTS.find((s) => s.id === active);
  const streak = 12;

  const startLesson = () => {
    toast.success("Lesson started", {
      description: `${subject?.name} · ${level} · ${goal} min daily goal.`,
    });
  };

  const askTutor = () => {
    if (!ask.trim()) {
      toast("Ask anything", { description: "Type your question for the tutor." });
      return;
    }
    toast.success("Tutor is thinking…", {
      description: "I'll walk you through it step by step.",
    });
    setAsk("");
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="CirkleLearn — AI Personal Tutor">
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              {active && (
                <button
                  onClick={() => setActive(null)}
                  aria-label="Back"
                  className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal to-steel flex items-center justify-center shrink-0 shadow-soft">
                <GraduationCap className="w-5 h-5 text-cream" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  CirkleLearn
                </div>
                <div className="font-display text-xl truncate">
                  {subject ? subject.name : "AI Personal Tutor"}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-24">
              {/* Streak strip */}
              <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-teal/15 to-transparent p-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose" />
                  <div>
                    <div className="font-display text-2xl gradient-text-gold leading-none">
                      {streak}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      day streak
                    </div>
                  </div>
                </div>
                <div className="h-8 w-px bg-border/60" />
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-steel" />
                  <div>
                    <div className="font-display text-2xl gradient-text-gold leading-none">
                      148
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      min this week
                    </div>
                  </div>
                </div>
                <div className="h-8 w-px bg-border/60" />
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal" />
                  <div>
                    <div className="font-display text-2xl gradient-text-gold leading-none">
                      3
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      courses active
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue learning */}
              {!active && (
                <section className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Continue learning
                  </div>
                  <div className="space-y-2">
                    {SAMPLE_COURSES.map((c, i) => (
                      <motion.button
                        key={c.title}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setActive(c.subject)}
                        className="w-full text-start rounded-2xl border border-border/60 bg-card p-3 flex items-center gap-3 hover:scale-[1.01] transition"
                      >
                        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                          {c.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{c.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {c.lesson}
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${c.progress}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                              className="h-full rounded-full bg-gradient-to-r from-teal to-steel"
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display text-sm gradient-text-gold">
                            {c.progress}%
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground ms-auto mt-1" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </section>
              )}

              <AnimatePresence mode="wait">
                {!active ? (
                  <motion.div
                    key="subjects"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-2"
                  >
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Explore subjects
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {SUBJECTS.map((s, i) => (
                        <motion.button
                          key={s.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => setActive(s.id)}
                          className={`relative text-start rounded-2xl border border-border/50 bg-gradient-to-br ${s.tint} p-4 min-h-[130px] hover:scale-[1.02] transition overflow-hidden`}
                        >
                          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-foreground/5 blur-2xl" />
                          <div className="relative flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                              <s.icon className={`w-5 h-5 ${s.accent}`} />
                            </div>
                            <span className="text-2xl" aria-hidden>
                              {s.emoji}
                            </span>
                          </div>
                          <div className="relative mt-3">
                            <div className="font-display text-base leading-tight">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                              {s.tagline}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <SubjectDetail
                    key="detail"
                    subject={subject!}
                    level={level}
                    setLevel={setLevel}
                    goal={goal}
                    setGoal={setGoal}
                    streak={streak}
                    onStart={startLesson}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Ask tutor (sticky bottom) */}
            <div className="border-t border-border/50 p-3">
              <div className="glass rounded-full px-3 py-2 flex items-center gap-2 shadow-soft">
                <Sparkles className="w-4 h-4 text-gold shrink-0" />
                <input
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") askTutor();
                  }}
                  placeholder="Ask your tutor anything…"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  aria-label="Ask tutor"
                />
                <button
                  onClick={askTutor}
                  disabled={!ask.trim()}
                  className="w-9 h-9 rounded-full bg-gradient-to-r from-teal to-steel text-cream flex items-center justify-center disabled:opacity-40"
                  aria-label="Send question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
    </OverlayShell>
  );
}

function SubjectDetail({
  subject,
  level,
  setLevel,
  goal,
  setGoal,
  streak,
  onStart,
}: {
  subject: Subject;
  level: "Beginner" | "Intermediate" | "Advanced";
  setLevel: (l: "Beginner" | "Intermediate" | "Advanced") => void;
  goal: 10 | 15 | 30;
  setGoal: (g: 10 | 15 | 30) => void;
  streak: number;
  onStart: () => void;
}) {
  const levels = ["Beginner", "Intermediate", "Advanced"] as const;
  const goals: (typeof goal)[] = [10, 15, 30];
  const courseProgress = 64;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-4"
    >
      {/* Hero */}
      <div
        className={`rounded-3xl border border-border/60 bg-gradient-to-br ${subject.tint} p-5 relative overflow-hidden`}
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-foreground/5 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl glass-strong flex items-center justify-center text-3xl shrink-0">
            {subject.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-2xl leading-tight">{subject.name}</div>
            <div className="text-sm text-muted-foreground mt-1">{subject.tagline}</div>
          </div>
        </div>
      </div>

      {/* Course progress */}
      <section className="rounded-3xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Current course
          </div>
          <div className="font-display text-sm gradient-text-gold">{courseProgress}%</div>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${courseProgress}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`h-full rounded-full bg-gradient-to-r ${tintByAccent(subject.accent)}`}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Lesson 12 of 19 · keep the streak alive 🔥
        </div>
      </section>

      {/* Level + Goal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Target className="w-3.5 h-3.5" /> Current level
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                  level === l
                    ? "border-teal/60 bg-teal/15 text-teal"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> Daily goal
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {goals.map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                  goal === g
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {g} min
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Streak */}
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-rose/15 to-transparent p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose/15 flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6 text-rose" />
        </div>
        <div className="flex-1">
          <div className="font-display text-lg">{streak}-day streak</div>
          <div className="text-xs text-muted-foreground">
            You&apos;re on fire — 3 more days and you set a personal record.
          </div>
        </div>
      </section>

      <button
        onClick={onStart}
        className={`w-full rounded-2xl bg-gradient-to-r ${tintByAccent(subject.accent, true)} text-cream py-3 text-sm font-medium flex items-center justify-center gap-2 shadow-float hover:opacity-90 transition`}
      >
        <Play className="w-4 h-4" /> Start today&apos;s lesson
      </button>
    </motion.div>
  );
}

function tintByAccent(accent: string, solid = false): string {
  switch (accent) {
    case "text-teal":
      return solid ? "from-teal to-steel" : "from-teal to-steel";
    case "text-steel":
      return solid ? "from-steel to-teal" : "from-steel to-teal";
    case "text-gold":
      return solid ? "from-gold to-rose" : "from-gold to-rose";
    case "text-rose":
      return solid ? "from-rose to-gold" : "from-rose to-gold";
    default:
      return solid ? "from-teal to-steel" : "from-teal to-steel";
  }
}
