"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Sparkles,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Wallet,
  Gavel,
  Mountain,
  CheckCircle2,
  Users,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Metric {
  label: string;
  value: number; // 1-10
  icon: typeof TrendingUp;
}

interface CoFounder {
  name: string;
  role: string;
  skills: string[];
  match: number;
}

interface ActionStep {
  step: number;
  title: string;
  detail: string;
}

type Verdict = "Promising" | "Risky" | "Needs refinement";

interface Analysis {
  verdict: Verdict;
  metrics: Metric[];
  coFounders: CoFounder[];
  actionPlan: ActionStep[];
}

const SAMPLE_IDEAS = [
  {
    label: "Food Delivery",
    pitch:
      "A hyperlocal food delivery service focused on home-cooked Saudi meals for office workers, with same-day delivery and a weekly subscription.",
  },
  {
    label: "Tutoring Service",
    pitch:
      "An online tutoring platform matching university students with high-schoolers for affordable, peer-to-peer help in math, physics, and English.",
  },
  {
    label: "Handmade Crafts",
    pitch:
      "A marketplace for Saudi artisans to sell handmade pottery, calligraphy, and woven goods to local and international buyers.",
  },
];

function evaluateIdea(pitch: string): Analysis {
  const p = pitch.toLowerCase();
  const has = (k: string[]) => k.some((x) => p.includes(x));

  let verdict: Verdict = "Needs refinement";
  let market = 5;
  let competition = 5;
  let capital = 5;
  let legal = 5;
  let difficulty = 5;

  if (has(["delivery", "food", "marketplace", "tutoring"])) {
    market = 8;
    competition = 8;
    capital = 6;
    legal = 6;
    difficulty = 6;
    verdict = "Promising";
  }
  if (has(["handmade", "craft", "artisan", "pottery", "calligraphy"])) {
    market = 6;
    competition = 4;
    capital = 3;
    legal = 4;
    difficulty = 5;
    verdict = "Promising";
  }
  if (has(["crypto", "token", "lending", "loan", "gambling"])) {
    market = 6;
    competition = 7;
    capital = 8;
    legal = 9;
    difficulty = 9;
    verdict = "Risky";
  }
  if (pitch.trim().length < 25) {
    verdict = "Needs refinement";
    market = 4;
    competition = 5;
    capital = 4;
    legal = 3;
    difficulty = 5;
  }

  return {
    verdict,
    metrics: [
      { label: "Market size", value: market, icon: TrendingUp },
      { label: "Competition level", value: competition, icon: Users },
      { label: "Required capital", value: capital, icon: Wallet },
      { label: "Legal requirements", value: legal, icon: Gavel },
      { label: "Difficulty", value: difficulty, icon: Mountain },
    ],
    coFounders: [
      {
        name: "User",
        role: "Product & growth",
        skills: ["Marketing", "User research", "Branding"],
        match: 92,
      },
      {
        name: "User",
        role: "Engineering",
        skills: ["React", "Node.js", "Cloud"],
        match: 87,
      },
      {
        name: "Noura Al-Saud",
        role: "Operations",
        skills: ["Logistics", "Finance", "Legal"],
        match: 78,
      },
    ],
    actionPlan: [
      {
        step: 1,
        title: "Validate demand",
        detail:
          "Interview 20 potential customers and run a landing-page smoke test for 7 days to gauge real intent.",
      },
      {
        step: 2,
        title: "Build the MVP",
        detail:
          "Ship the simplest version that delivers the core promise in 4–6 weeks — no extra features.",
      },
      {
        step: 3,
        title: "Register & comply",
        detail:
          "Open a commercial registration, file for VAT, and confirm any sector-specific licences required.",
      },
      {
        step: 4,
        title: "Launch to your Circle",
        detail:
          "Soft-launch to verified Cirkle contacts for honest feedback and your first paying customers.",
      },
      {
        step: 5,
        title: "Iterate & raise",
        detail:
          "Use 4 weeks of usage data to refine pricing, then decide: bootstrap longer or raise a pre-seed round.",
      },
    ],
  };
}

export function CirkleSpark({ open, onClose }: Props) {
  const [pitch, setPitch] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const runEvaluation = (text?: string) => {
    const p = (text ?? pitch).trim();
    if (!p) {
      toast("Pitch is empty", {
        description: "Describe your idea first — even a sentence is enough.",
      });
      return;
    }
    setLoading(true);
    setAnalysis(null);
    window.setTimeout(() => {
      setAnalysis(evaluateIdea(p));
      setLoading(false);
      toast.success("AI evaluation ready", {
        description: "Verdict, metrics, and a 5-step plan generated.",
      });
    }, 1100);
  };

  const loadSample = (idea: (typeof SAMPLE_IDEAS)[number]) => {
    setPitch(idea.pitch);
    setAnalysis(null);
    toast(`Loaded: ${idea.label}`, {
      description: "Tap “Evaluate with AI” to see the full analysis.",
    });
  };

  const saveIdea = () => {
    toast.success("Idea saved", {
      description: "Stored in your CirkleSpark notebook.",
    });
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="CirkleSpark — AI Idea Incubator">
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0 shadow-soft">
                <Lightbulb className="w-5 h-5 text-charcoal" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  CirkleSpark
                </div>
                <div className="font-display text-xl truncate">AI Idea Incubator</div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-28">
              {/* Pitch input */}
              <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Pitch your idea
                  </div>
                </div>
                <textarea
                  value={pitch}
                  onChange={(e) => {
                    setPitch(e.target.value);
                    setAnalysis(null);
                  }}
                  placeholder="Describe the problem you're solving, who it's for, and how it makes money…"
                  className="w-full bg-transparent outline-none text-sm leading-relaxed min-h-[110px] resize-none placeholder:text-muted-foreground"
                />
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => runEvaluation()}
                    disabled={loading}
                    className="rounded-full bg-gradient-gold text-charcoal text-sm font-medium px-4 py-2 flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {loading ? "Evaluating…" : "Evaluate with AI"}
                  </button>
                </div>
              </section>

              {/* Sample ideas (only before analysis) */}
              {!analysis && (
                <section className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Or start from a sample
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {SAMPLE_IDEAS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => loadSample(s)}
                        className="text-start rounded-2xl border border-border/60 bg-gradient-to-br from-gold/15 to-transparent p-3 hover:scale-[1.02] transition"
                      >
                        <div className="text-sm font-medium">{s.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                          {s.pitch}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Analysis */}
              <AnimatePresence>
                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <VerdictCard verdict={analysis.verdict} />

                    {/* Metrics */}
                    <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        AI analysis · 1–10 scale
                      </div>
                      <div className="space-y-3">
                        {analysis.metrics.map((m, i) => (
                          <MetricBar key={m.label} metric={m} delay={i * 0.06} />
                        ))}
                      </div>
                    </section>

                    {/* Co-founders */}
                    <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-steel" />
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Co-founders in your Circle
                        </div>
                      </div>
                      <div className="space-y-2">
                        {analysis.coFounders.map((c) => (
                          <div
                            key={c.name}
                            className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-mesh shrink-0 flex items-center justify-center text-cream text-xs font-medium">
                              {c.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{c.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {c.role} · {c.skills.join(" · ")}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-display text-sm gradient-text-gold">
                                {c.match}%
                              </div>
                              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                                match
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Action plan */}
                    <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-gold" />
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          AI Action Plan
                        </div>
                      </div>
                      <ol className="relative space-y-4 ms-2">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
                        {analysis.actionPlan.map((s) => (
                          <li key={s.step} className="relative ps-7">
                            <div className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-gradient-gold text-charcoal text-[9px] font-bold flex items-center justify-center">
                              {s.step}
                            </div>
                            <div className="text-sm font-medium">{s.title}</div>
                            <div className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                              {s.detail}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>

                    <button
                      onClick={saveIdea}
                      className="w-full rounded-2xl bg-gradient-hero text-cream py-3 text-sm font-medium flex items-center justify-center gap-2 shadow-float hover:opacity-90 transition"
                    >
                      <Save className="w-4 h-4" /> Save idea to notebook
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
    </OverlayShell>
  );
}

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const cfg = {
    Promising: {
      icon: CheckCircle2,
      tint: "from-gold/25 to-transparent",
      color: "text-gold",
      ring: "border-gold/40",
      label: "Strong signal — green light to validate.",
    },
    Risky: {
      icon: AlertTriangle,
      tint: "from-rose/25 to-transparent",
      color: "text-rose",
      ring: "border-rose/40",
      label: "High uncertainty — proceed with caution.",
    },
    "Needs refinement": {
      icon: RefreshCw,
      tint: "from-steel/20 to-transparent",
      color: "text-steel",
      ring: "border-steel/40",
      label: "Not enough clarity — sharpen the pitch.",
    },
  }[verdict];

  return (
    <div
      className={`rounded-3xl border ${cfg.ring} bg-gradient-to-br ${cfg.tint} p-4 flex items-center gap-3`}
    >
      <div
        className={`w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shrink-0 ${cfg.color}`}
      >
        <cfg.icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          AI verdict
        </div>
        <div className={`font-display text-xl ${cfg.color}`}>{verdict}</div>
        <div className="text-[12px] text-muted-foreground">{cfg.label}</div>
      </div>
    </div>
  );
}

function MetricBar({ metric, delay }: { metric: Metric; delay: number }) {
  const pct = metric.value * 10;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-sm">
          <metric.icon className="w-3.5 h-3.5 text-muted-foreground" />
          {metric.label}
        </div>
        <div className="font-display text-sm tabular-nums gradient-text-gold">
          {metric.value}/10
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-gold"
        />
      </div>
    </div>
  );
}
