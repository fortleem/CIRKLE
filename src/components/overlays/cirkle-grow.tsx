"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  TrendingUp,
  PiggyBank,
  BookOpen,
  Dumbbell,
  Plus,
  Sparkles,
  Calendar,
  Flag,
  Brain,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Category = "Finance" | "Health" | "Learning" | "Habit" | "Career";

interface Goal {
  id: string;
  emoji: string;
  icon: LucideIcon;
  title: string;
  progressLabel: string;
  pct: number;
  daysLeft: number;
  tip: string;
  accent: string;
}

const SEED_GOALS: Goal[] = [];

const CATEGORIES: { id: Category; emoji: string; tint: string }[] = [
  { id: "Finance", emoji: "💰", tint: "from-gold/30 to-transparent" },
  { id: "Health", emoji: "🩺", tint: "from-rose/30 to-transparent" },
  { id: "Learning", emoji: "📚", tint: "from-teal/30 to-transparent" },
  { id: "Habit", emoji: "🔁", tint: "from-steel/30 to-transparent" },
  { id: "Career", emoji: "💼", tint: "from-gold/30 to-transparent" },
];

export function CirkleGrow({ open, onClose }: Props) {
  const [goals, setGoals] = useState<Goal[]>(SEED_GOALS);
  const [creating, setCreating] = useState(false);

  const addGoal = (g: {
    category: Category;
    description: string;
    date: string;
  }) => {
    const newGoal: Goal = {
      id: `g-${Date.now()}`,
      emoji:
        CATEGORIES.find((c) => c.id === g.category)?.emoji ?? "🎯",
      icon: Flag,
      title: g.description || `New ${g.category} goal`,
      progressLabel: "Just started",
      pct: 0,
      daysLeft: daysUntil(g.date),
      tip: "AI will track and nudge you weekly — small consistent steps beat heroic bursts.",
      accent: "text-steel",
    };
    setGoals((s) => [newGoal, ...s]);
    setCreating(false);
    toast.success("Goal created", {
      description: `I'll keep an eye on "${newGoal.title}" and motivate you weekly.`,
    });
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="CirkleGrow — AI Life Coach">
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              {creating && (
                <button
                  onClick={() => setCreating(false)}
                  aria-label="Back"
                  className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel to-teal flex items-center justify-center shrink-0 shadow-soft">
                <TrendingUp className="w-5 h-5 text-cream" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  CirkleGrow
                </div>
                <div className="font-display text-xl truncate">
                  {creating ? "Create a goal" : "AI Life Coach"}
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
              <AnimatePresence mode="wait">
                {!creating ? (
                  <motion.div
                    key="goals"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-5"
                  >
                    {/* Active goals */}
                    <section className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Active goals
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-steel">
                          {goals.length} tracking
                        </span>
                      </div>
                      <div className="space-y-3">
                        {goals.map((g, i) => (
                          <GoalCard key={g.id} goal={g} delay={i * 0.05} />
                        ))}
                      </div>
                    </section>

                    {/* Weekly AI review */}
                    <WeeklyReview />

                    {/* Create new goal */}
                    <button
                      onClick={() => setCreating(true)}
                      className="w-full rounded-2xl border-2 border-dashed border-steel/40 bg-steel/5 py-4 text-sm font-medium flex items-center justify-center gap-2 text-steel hover:bg-steel/10 transition"
                    >
                      <Plus className="w-4 h-4" /> Create new goal
                    </button>
                  </motion.div>
                ) : (
                  <CreateGoalForm key="form" onCreate={addGoal} />
                )}
              </AnimatePresence>
            </div>
    </OverlayShell>
  );
}

function GoalCard({ goal, delay }: { goal: Goal; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl border border-border/60 bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center text-2xl shrink-0">
          {goal.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-tight">{goal.title}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className={goal.accent + " font-medium"}>{goal.progressLabel}</span>
            <span aria-hidden>·</span>
            {goal.daysLeft > 0 ? (
              <span>{goal.daysLeft} days left</span>
            ) : (
              <span>ongoing habit</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-lg gradient-text-gold">{goal.pct}%</div>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${goal.pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-steel to-teal"
        />
      </div>

      <div className="mt-3 rounded-2xl bg-muted/40 p-3 flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">AI tip · </span>
          {goal.tip}
        </div>
      </div>
    </motion.div>
  );
}

function WeeklyReview() {
  const insights = [
    {
      icon: TrendingUp,
      label: "Overall momentum",
      value: "Strong",
      detail: "You completed 6 of 7 tracked actions this week — best in 5 weeks.",
      tint: "from-gold/20 to-transparent",
      color: "text-gold",
    },
    {
      icon: BookOpen,
      label: "Reading pace",
      value: "+0.4 books",
      detail: "Picking up speed vs last month. Keep the morning-pages streak.",
      tint: "from-teal/20 to-transparent",
      color: "text-teal",
    },
    {
      icon: PiggyBank,
      label: "Spending",
      value: "−12%",
      detail: "Discretionary spend down vs the 4-week rolling average.",
      tint: "from-steel/20 to-transparent",
      color: "text-steel",
    },
  ];

  return (
    <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-steel/15 via-teal/8 to-transparent p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-steel" />
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Weekly AI review
        </div>
      </div>
      <div className="space-y-2">
        {insights.map((ins, i) => (
          <motion.div
            key={ins.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br ${ins.tint} border border-border/40 p-3`}
          >
            <div className="w-9 h-9 rounded-xl glass flex items-center justify-center shrink-0">
              <ins.icon className={`w-4 h-4 ${ins.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium">{ins.label}</div>
                <div className={`text-xs font-display ${ins.color}`}>{ins.value}</div>
              </div>
              <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                {ins.detail}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground text-center pt-1">
        Review generated Sunday 06:00 · next refresh in 4 days
      </div>
    </section>
  );
}

function CreateGoalForm({
  onCreate,
}: {
  onCreate: (g: { category: Category; description: string; date: string }) => void;
}) {
  const [category, setCategory] = useState<Category>("Finance");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const submit = () => {
    if (!description.trim()) {
      toast("Describe your goal", {
        description: "Even one sentence is enough — I'll help you sharpen it.",
      });
      return;
    }
    if (!date) {
      toast("Pick a target date", {
        description: "Give the goal a deadline — I'll back-plan from there.",
      });
      return;
    }
    onCreate({ category, description: description.trim(), date });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-4"
    >
      {/* Category */}
      <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Category
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-2xl border px-3 py-2.5 flex items-center gap-2 text-sm font-medium transition ${
                category === c.id
                  ? "border-steel/60 bg-steel/15 text-steel"
                  : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {c.emoji}
              </span>
              {c.id}
            </button>
          ))}
        </div>
      </section>

      {/* Description */}
      <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Goal description
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Run a half-marathon by March, building up from 5k."
          className="w-full bg-transparent outline-none text-sm leading-relaxed min-h-[80px] resize-none placeholder:text-muted-foreground"
        />
      </section>

      {/* Target date */}
      <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" /> Target date
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent outline-none text-sm border border-border/60 rounded-xl px-3 py-2"
        />
      </section>

      {/* AI note */}
      <div className="rounded-2xl border border-steel/30 bg-gradient-to-br from-steel/10 to-transparent p-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-gold shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">AI will track and motivate you.</span>{" "}
          I'll break your goal into weekly milestones, nudge you when momentum dips, and
          celebrate every win.
        </div>
      </div>

      <button
        onClick={submit}
        className="w-full rounded-2xl bg-gradient-to-r from-steel to-teal text-cream py-3 text-sm font-medium flex items-center justify-center gap-2 shadow-float hover:opacity-90 transition"
      >
        <Flag className="w-4 h-4" /> Create goal
      </button>
    </motion.div>
  );
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}
