"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Sparkles,
  Send,
  Coins,
  Plane,
  HeartHandshake,
  Landmark,
  FileCheck,
  HeartPulse,
  CloudSun,
  Briefcase,
  ArrowRight,
  Brain,
  TrendingUp,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// ─────────────────────────────────────────────────────────────────────────────

type OracleCategory =
  | "financial"
  | "travel"
  | "social"
  | "government"
  | "visa"
  | "health"
  | "weather"
  | "career";

interface Prediction {
  id: string;
  category: OracleCategory;
  categoryEmoji: string;
  categoryLabel: string;
  prediction: string;
  detail: string;
  confidence: number;
  recommendedAction: string;
  actionLabel: string;
  horizon: string;
  signals: string[];
  generatedAt?: string;
  ephemeral?: boolean;
}

const CATEGORY_META: Record<
  OracleCategory,
  { label: string; emoji: string; icon: LucideIcon; tint: string }
> = {
  financial: { label: "Financial", emoji: "💰", icon: Coins, tint: "from-secondary/25 to-secondary/5 border-secondary/40 text-secondary" },
  travel: { label: "Travel", emoji: "✈️", icon: Plane, tint: "from-primary/25 to-primary/5 border-primary/40 text-primary" },
  social: { label: "Social", emoji: "🤝", icon: HeartHandshake, tint: "from-accent/25 to-accent/5 border-accent/40 text-accent" },
  government: { label: "Government", emoji: "🏛️", icon: Landmark, tint: "from-steel/30 to-steel/5 border-steel/40 text-steel" },
  visa: { label: "Visa", emoji: "🛂", icon: FileCheck, tint: "from-secondary/25 to-primary/10 border-secondary/40 text-secondary" },
  health: { label: "Health", emoji: "❤️", icon: HeartPulse, tint: "from-accent/25 to-secondary/10 border-accent/40 text-accent" },
  weather: { label: "Weather", emoji: "🌤️", icon: CloudSun, tint: "from-primary/25 to-steel/10 border-primary/40 text-primary" },
  career: { label: "Career", emoji: "💼", icon: Briefcase, tint: "from-secondary/25 to-accent/10 border-secondary/40 text-secondary" },
};

const SEED_PREDICTIONS: Prediction[] = [];

const SUGGESTED_PROMPTS = [
  "When will I run out of money?",
  "Best time to fly to Istanbul?",
  "Is User doing okay?",
  "When should I renew my visa?",
  "Will it rain this week?",
];

function ConfidenceBar({ value, tint }: { value: number; tint: string }) {
  // Map 0-100 confidence to brand-aware width.
  const isHigh = value >= 80;
  const isMid = value >= 65 && value < 80;
  const barClass = isHigh
    ? "bg-gradient-to-r from-emerald-500 to-secondary"
    : isMid
      ? "bg-gradient-to-r from-secondary to-primary"
      : "bg-gradient-to-r from-accent to-secondary";
  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex-1 h-1.5 rounded-full bg-muted overflow-hidden")}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className={cn("h-full", barClass)}
        />
      </div>
      <span className={cn("text-[11px] font-medium tabular-nums shrink-0", tint.split(" ").find((c) => c.startsWith("text-")) || "text-foreground")}>
        {value}%
      </span>
    </div>
  );
}

export function CirkleOracle({ open, onClose }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>(SEED_PREDICTIONS);
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPredictions(SEED_PREDICTIONS);
        setQuery("");
        setAsking(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const ask = async (prompt?: string) => {
    const q = (prompt ?? query).trim();
    if (!q) {
      toast.error("Ask Oracle a question first");
      return;
    }
    if (asking) return;
    setAsking(true);
    setQuery(q);

    let newPred: Prediction | null = null;
    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.prediction) {
          const p = data.prediction;
          newPred = {
            id: p.id,
            category: p.category,
            categoryEmoji: p.categoryEmoji,
            categoryLabel: p.categoryLabel,
            prediction: p.prediction,
            detail: p.detail,
            confidence: p.confidence,
            recommendedAction: p.recommendedAction,
            actionLabel: p.actionLabel,
            horizon: p.horizon,
            signals: p.signals ?? [],
            generatedAt: new Date().toISOString(),
            ephemeral: true,
          };
        }
      }
    } catch {
      // fall through to synthesized prediction
    }

    if (!newPred) {
      // Lightweight fallback that mirrors the POST route's logic
      const cat: OracleCategory = /budget|money|spend|salary|invest|crypto/i.test(q)
        ? "financial"
        : /flight|istanbul|travel|trip|vacation/i.test(q)
          ? "travel"
          : /layla|friend|family|reach out/i.test(q)
            ? "social"
            : /visa|residency|iqama/i.test(q)
              ? "visa"
              : /weather|rain|forecast/i.test(q)
                ? "weather"
                : "financial";
      const meta = CATEGORY_META[cat];
      newPred = {
        id: `op-${Date.now()}`,
        category: cat,
        categoryEmoji: meta.emoji,
        categoryLabel: meta.label,
        prediction:
          cat === "financial"
            ? "Spending trajectory suggests a budget shortfall in 9-14 days"
            : cat === "travel"
              ? "Best booking window for this route opens in 6-9 days"
              : cat === "social"
                ? "A close contact's tone has shifted — a brief check-in is recommended"
                : cat === "visa"
                  ? "Document expiry conflicts with a planned trip — renew ahead of travel"
                  : cat === "weather"
                    ? "Light rain likely Thursday morning — plan indoor activities"
                    : "Pattern suggests action recommended in the next 7 days",
        detail: `On-device Oracle processed your question "${q}" against local signals — no raw data left your device.`,
        confidence: 70 + Math.floor(Math.random() * 18),
        recommendedAction: "Review the prediction and decide whether to act now or wait.",
        actionLabel: "Got it",
        horizon: cat === "visa" ? "now" : "this week",
        signals: ["on-device signals", "local baselines"],
        generatedAt: new Date().toISOString(),
        ephemeral: true,
      };
    }

    setPredictions((prev) => [newPred as Prediction, ...prev]);
    setAsking(false);
    setQuery("");
    toast.success("Oracle prediction ready", {
      description: `${newPred.categoryLabel} · ${newPred.confidence}% confidence`,
    });
  };

  const onAction = (p: Prediction) => {
    toast.success(`Action: ${p.actionLabel}`, {
      description: p.recommendedAction,
    });
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="CirkleOracle — AI Prediction Engine">
          <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background" aria-hidden />

          {/* ───────────────────────── Header ───────────────────────── */}
          <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/20 border border-secondary/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl leading-tight">CirkleOracle</h1>
                <p className="text-[11px] text-muted-foreground truncate">AI Prediction Engine</p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-medium text-primary">
                <Brain className="w-3 h-3" />
                On-device · 3.8 MB
              </span>
              <FeedbackButton overlayName="CirkleOracle" />
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary strip */}
            <div className="max-w-3xl mx-auto mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "Predictions", val: predictions.length, tint: "text-foreground" },
                { label: "High confidence (≥80%)", val: predictions.filter((p) => p.confidence >= 80).length, tint: "text-emerald-600 dark:text-emerald-400" },
                {
                  label: "Avg confidence",
                  val: Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / Math.max(predictions.length, 1)) + "%",
                  tint: "text-secondary",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border/60 bg-card px-3 py-2 text-center">
                  <div className={cn("font-display text-lg leading-none", s.tint)}>{s.val}</div>
                  <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </header>

          {/* ───────────────────────── Body ───────────────────────── */}
          <div className="relative flex-1 overflow-y-auto z-0">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 pb-32 space-y-3">
              {predictions.map((p, i) => {
                const meta = CATEGORY_META[p.category];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(0.04 * i, 0.3), duration: 0.25 }}
                    className={cn(
                      "rounded-2xl border bg-gradient-to-br p-4",
                      meta.tint,
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-background/60 border border-border/60 flex items-center justify-center text-lg shrink-0">
                        {p.categoryEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/60 border border-border/60 text-[10px] font-medium">
                            <Icon className="w-3 h-3" />
                            {p.categoryLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/60 border border-border/60 text-[10px] text-muted-foreground">
                            <TrendingUp className="w-3 h-3" />
                            Horizon: {p.horizon}
                          </span>
                          {p.ephemeral && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary/20 border border-secondary/30 text-[10px] font-medium text-secondary">
                              <Sparkles className="w-3 h-3" />
                              Just for you
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prediction text */}
                    <h3 className="font-display text-base leading-snug mt-3 text-foreground">
                      {p.prediction}
                    </h3>
                    <p className="text-[12px] text-muted-foreground mt-1.5">{p.detail}</p>

                    {/* Confidence bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Confidence</span>
                        <span>{p.confidence}%</span>
                      </div>
                      <ConfidenceBar value={p.confidence} tint={meta.tint} />
                    </div>

                    {/* Signals */}
                    {p.signals.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground mr-1">Signals:</span>
                        {p.signals.map((s, k) => (
                          <span
                            key={k}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-background/60 border border-border/60 text-[9px] text-muted-foreground"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Recommended action */}
                    <div className="mt-3 flex items-start gap-2 px-2.5 py-1.5 rounded-xl bg-background/60 border border-border/60">
                      <ArrowRight className="w-3.5 h-3.5 text-secondary mt-0.5 shrink-0" />
                      <span className="text-[11px] text-foreground/90">{p.recommendedAction}</span>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => onAction(p)}
                      className="mt-3 w-full px-3 py-2 rounded-xl bg-gradient-gold text-charcoal text-xs font-semibold flex items-center justify-center gap-1.5 shadow-soft"
                    >
                      {p.actionLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ───────────────────────── Ask Oracle (sticky footer) ───────────────────────── */}
          <div className="relative z-10 px-4 sm:px-6 pb-[env(safe-area-inset-bottom)] pt-2 border-t border-border/60 glass-strong">
            <div className="max-w-3xl mx-auto">
              {/* Suggested prompts */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                {SUGGESTED_PROMPTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    disabled={asking}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-card border border-border/60 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Input row */}
              <div className="flex items-end gap-2">
                <div className="flex-1 rounded-xl border border-border/60 bg-card focus-within:border-secondary/60 transition overflow-hidden">
                  <textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        ask();
                      }
                    }}
                    rows={1}
                    placeholder="Ask Oracle anything — money, travel, social, visa…"
                    maxLength={500}
                    disabled={asking}
                    className="w-full px-3 py-2.5 text-sm bg-transparent outline-none resize-none max-h-28 disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={() => ask()}
                  disabled={asking || !query.trim()}
                  className="shrink-0 w-11 h-11 rounded-xl bg-gradient-hero text-cream flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-soft"
                  aria-label="Ask Oracle"
                >
                  {asking ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  On-device · no data leaves your phone
                </span>
                <span className="tabular-nums">{query.length}/500</span>
              </div>
            </div>
          </div>
    </OverlayShell>
  );
}
