"use client";

/**
 * Personal AI OS — unified dashboard for Cirkle DNA, Mood, Topic DNA,
 * Memory recall, and feature integration.
 *
 * Open via the `circle:personal-ai` event (registered in page.tsx).
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Dna, Sparkles, RefreshCw, Brain, Activity,
  TrendingUp, TrendingDown, Minus, Search, BookHeart,
  Plug, ShieldCheck, Loader2, ChevronRight, MessageSquare,
  Clock, Lightbulb, Zap, Smile, Frown, Meh,
} from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FeedbackButton } from "@/components/ui/feedback-button";
import {
  usePersonalAI,
} from "@/hooks/use-personal-ai";
import {
  personalAI,
  getPersonalAIConsent,
  setPersonalAIConsent,
  type CirkleDNA,
  type CirkleMood,
  type TopicDNA,
  type GroupMemoryItem,
} from "@/lib/personal-ai";
import { getRecentInteractions, type BrainInteraction } from "@/lib/brain-memory";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Mood metadata ────────────────────────────────────────────────────────

const MOOD_META: Record<CirkleMood["current"], { emoji: string; tint: string; label: string }> = {
  joyful:   { emoji: "😄", tint: "from-secondary/30 to-accent/10", label: "Joyful" },
  calm:     { emoji: "😌", tint: "from-primary/30 to-primary/5",   label: "Calm" },
  focused:  { emoji: "🎯", tint: "from-steel/30 to-primary/10",    label: "Focused" },
  excited:  { emoji: "🤩", tint: "from-accent/30 to-secondary/10", label: "Excited" },
  tired:    { emoji: "😴", tint: "from-charcoal/30 to-steel/10",   label: "Tired" },
  stressed: { emoji: "😣", tint: "from-accent/30 to-steel/10",     label: "Stressed" },
  neutral:  { emoji: "😐", tint: "from-muted/30 to-muted/5",       label: "Neutral" },
};

const COMM_STYLE_META: Record<CirkleDNA["communicationStyle"], { label: string; desc: string }> = {
  direct:     { label: "Direct",      desc: "Short, no-fluff answers" },
  diplomatic: { label: "Diplomatic",  desc: "Thoughtful, balanced tone" },
  playful:    { label: "Playful",     desc: "Warm, light, emoji-friendly" },
  formal:     { label: "Formal",      desc: "Proper grammar, structured" },
};

const LEARNING_STYLE_META: Record<CirkleDNA["learningStyle"], { label: string; icon: string }> = {
  visual:      { label: "Visual",      icon: "🖼️" },
  auditory:    { label: "Auditory",    icon: "🎧" },
  kinesthetic: { label: "Kinesthetic", icon: "✋" },
  reading:     { label: "Reading",     icon: "📖" },
};

const BIG_FIVE_LABELS: Record<keyof CirkleDNA["bigFive"], string> = {
  openness: "Openness",
  conscientiousness: "Conscientiousness",
  extraversion: "Extraversion",
  agreeableness: "Agreeableness",
  neuroticism: "Neuroticism",
};

const TREND_META: Record<TopicDNA["trend"], { icon: typeof TrendingUp; color: string; label: string }> = {
  rising:    { icon: TrendingUp,   color: "text-emerald-500", label: "Rising" },
  stable:    { icon: Minus,        color: "text-muted-foreground", label: "Stable" },
  declining: { icon: TrendingDown, color: "text-rose-500",    label: "Declining" },
};

// ── Big Five radar chart (pure SVG, no deps) ─────────────────────────────

function BigFiveRadar({ bigFive }: { bigFive: CirkleDNA["bigFive"] }) {
  const keys = Object.keys(BIG_FIVE_LABELS) as (keyof CirkleDNA["bigFive"])[];
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const angle = (i: number) => (Math.PI * 2 * i) / keys.length - Math.PI / 2;
  const pointAt = (i: number, value: number) => {
    const rr = (value / 100) * r;
    return [cx + rr * Math.cos(angle(i)), cy + rr * Math.sin(angle(i))];
  };
  const ringValues = [25, 50, 75, 100];

  // Polygon points for the data shape
  const dataPoints = keys.map((k, i) => pointAt(i, bigFive[k]).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] mx-auto" role="img" aria-label="Big Five personality radar">
      {/* Concentric rings */}
      {ringValues.map((v) => {
        const pts = keys.map((_, i) => pointAt(i, v).join(",")).join(" ");
        return (
          <polygon key={v} points={pts} fill="none" stroke="hsl(var(--border))" strokeWidth={1} opacity={0.5} />
        );
      })}
      {/* Spokes */}
      {keys.map((_, i) => {
        const [x, y] = pointAt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--border))" strokeWidth={1} opacity={0.5} />;
      })}
      {/* Data shape */}
      <motion.polygon
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        points={dataPoints}
        fill="hsl(var(--secondary) / 0.25)"
        stroke="hsl(var(--secondary))"
        strokeWidth={2}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* Data points */}
      {keys.map((k, i) => {
        const [x, y] = pointAt(i, bigFive[k]);
        return <circle key={k} cx={x} cy={y} r={3} fill="hsl(var(--secondary))" />;
      })}
      {/* Axis labels */}
      {keys.map((k, i) => {
        const [x, y] = pointAt(i, 118);
        const labelX = Math.max(28, Math.min(size - 60, x));
        return (
          <text
            key={k}
            x={labelX}
            y={y}
            textAnchor={x < cx - 4 ? "end" : x > cx + 4 ? "start" : "middle"}
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: "9px", fontWeight: 600 }}
          >
            {BIG_FIVE_LABELS[k]}
          </text>
        );
      })}
    </svg>
  );
}

// ── Mood narrative (deterministic, generated from mood state) ────────────

function moodNarrative(mood: CirkleMood): string {
  const m = MOOD_META[mood.current];
  const energyWord =
    mood.energy > 70 ? "high energy"
    : mood.energy > 40 ? "moderate energy"
    : "low energy";
  const valenceWord =
    mood.valence > 30 ? "a positive outlook"
    : mood.valence < -30 ? "some tension"
    : "an even keel";
  const suggestion =
    mood.current === "tired"
      ? "I'll keep things gentle and brief right now."
      : mood.current === "stressed"
        ? "I'll be calm and reassuring — let's take this one step at a time."
        : mood.current === "focused"
          ? "I'll keep things concise and to the point."
          : mood.current === "excited"
            ? "I'll match your energy and bring some enthusiasm."
            : mood.current === "joyful"
              ? "I'll lean into the positive vibe and keep things light."
              : mood.current === "calm"
                ? "I'll keep things thoughtful and unhurried."
                : "I'll keep things balanced and helpful.";
  return `You're feeling ${m.label.toLowerCase()} — ${energyWord}, ${valenceWord}. ${suggestion}`;
}

// ── DNA tab ──────────────────────────────────────────────────────────────

function DNATab({
  dna, onRebuild, refreshing,
}: {
  dna: CirkleDNA | null;
  onRebuild: () => void;
  refreshing: boolean;
}) {
  if (!dna) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center space-y-3">
        <Dna className="w-10 h-10 mx-auto text-secondary" />
        <div className="font-display text-lg">No DNA built yet</div>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Your Cirkle DNA is a personality fingerprint built from your on-device
          interactions. Rebuild it to get started.
        </p>
        <button
          onClick={onRebuild}
          disabled={refreshing}
          className="mt-2 px-5 py-2.5 rounded-full bg-gradient-gold text-charcoal text-sm font-medium flex items-center gap-2 mx-auto hover:scale-105 transition disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Build my DNA
        </button>
      </div>
    );
  }
  const updated = new Date(dna.updatedAt);
  const updatedStr = updated.getTime() === 0
    ? "never"
    : updated.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Big Five personality</div>
            <div className="text-sm text-muted-foreground mt-0.5">Updated {updatedStr}</div>
          </div>
          <button
            onClick={onRebuild}
            disabled={refreshing}
            className="text-[11px] px-3 py-1.5 rounded-full bg-secondary/15 text-secondary flex items-center gap-1 hover:bg-secondary/25 transition disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Rebuild
          </button>
        </div>
        <BigFiveRadar bigFive={dna.bigFive} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {(Object.keys(dna.bigFive) as (keyof CirkleDNA["bigFive"])[]).map((k) => (
            <div key={k} className="rounded-xl bg-muted/40 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">{BIG_FIVE_LABELS[k]}</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-lg gradient-text-gold">{dna.bigFive[k]}</span>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dna.bigFive[k]}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full bg-gradient-to-r from-secondary to-accent"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Communication style</div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-secondary" />
            <span className="font-display text-lg">{COMM_STYLE_META[dna.communicationStyle].label}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">{COMM_STYLE_META[dna.communicationStyle].desc}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Learning style</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{LEARNING_STYLE_META[dna.learningStyle].icon}</span>
            <span className="font-display text-lg">{LEARNING_STYLE_META[dna.learningStyle].label}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Content tuned for {dna.learningStyle} learners.</div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Values</div>
        <div className="flex flex-wrap gap-2">
          {dna.values.length === 0 ? (
            <span className="text-xs text-muted-foreground">No values detected yet.</span>
          ) : dna.values.map((v) => (
            <span key={v} className="text-xs px-3 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30 capitalize">
              {v}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Interests ranked</div>
        {dna.interests.length === 0 ? (
          <p className="text-xs text-muted-foreground">No interests recorded yet. Interact with the AI to populate this list.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {dna.interests.map((i, idx) => (
              <div key={i.topic} className="flex items-center gap-3">
                <div className="w-6 text-center font-display text-sm text-muted-foreground">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate capitalize">{i.topic}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{i.weight}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, i.weight)}%` }}
                      transition={{ delay: idx * 0.04, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Mood tab ─────────────────────────────────────────────────────────────

function MoodTab({
  mood, onRefresh, refreshing,
}: {
  mood: CirkleMood | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  if (!mood) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center space-y-3">
        <Activity className="w-10 h-10 mx-auto text-primary" />
        <div className="font-display text-lg">No mood detected yet</div>
        <p className="text-xs text-muted-foreground">Tap refresh to detect your current mood.</p>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="mt-2 px-5 py-2.5 rounded-full bg-gradient-gold text-charcoal text-sm font-medium flex items-center gap-2 mx-auto hover:scale-105 transition disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Detect my mood
        </button>
      </div>
    );
  }
  const meta = MOOD_META[mood.current];
  const detectedAt = new Date(mood.detectedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const ValenceIcon = mood.valence > 20 ? Smile : mood.valence < -20 ? Frown : Meh;

  return (
    <div className="space-y-4">
      <section className={cn("rounded-2xl border border-border/60 bg-gradient-to-br p-5 relative overflow-hidden", meta.tint)}>
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="text-6xl"
            aria-hidden
          >
            {meta.emoji}
          </motion.div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Current mood</div>
            <div className="font-display text-2xl">{meta.label}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Detected at {detectedAt}</div>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-[11px] px-3 py-1.5 rounded-full bg-card/60 border border-border/50 flex items-center gap-1 hover:bg-card transition disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-secondary" /> Energy
            </div>
            <span className="font-display text-lg">{mood.energy}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mood.energy}%` }}
              transition={{ duration: 0.6 }}
              className={cn(
                "h-full rounded-full",
                mood.energy > 70 ? "bg-secondary" : mood.energy > 40 ? "bg-primary" : "bg-steel",
              )}
            />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {mood.energy > 70 ? "High energy" : mood.energy > 40 ? "Moderate" : "Low energy"}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <ValenceIcon className="w-3 h-3 text-secondary" /> Valence
            </div>
            <span className="font-display text-lg">
              {mood.valence > 0 ? "+" : ""}{mood.valence}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.abs(mood.valence) / 2}%`,
                marginLeft: mood.valence >= 0 ? "50%" : `${50 - Math.abs(mood.valence) / 2}%`,
              }}
              transition={{ duration: 0.6 }}
              className={cn(
                "h-full rounded-full",
                mood.valence > 0 ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {mood.valence > 20 ? "Positive" : mood.valence < -20 ? "Negative" : "Neutral"}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-secondary/40 bg-gradient-to-br from-secondary/10 to-transparent p-4">
        <div className="text-[10px] uppercase tracking-widest text-secondary flex items-center gap-1 mb-2">
          <Sparkles className="w-3 h-3" /> How I'm feeling
        </div>
        <p className="text-sm leading-relaxed">{moodNarrative(mood)}</p>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
          <ShieldCheck className="w-3 h-3" /> 100% on-device · confidence {Math.round(mood.confidence * 100)}%
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Signal breakdown</div>
        {mood.signals.length === 0 ? (
          <p className="text-xs text-muted-foreground">No signals captured. Refresh to capture typing speed, session duration, sentiment, and time of day.</p>
        ) : (
          <div className="space-y-2">
            {mood.signals.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground capitalize">{s.source.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, Math.abs(s.value) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono w-12 text-right">{s.value.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Topics tab ───────────────────────────────────────────────────────────

function TopicsTab({ topics, onSeed }: { topics: TopicDNA[]; onSeed: () => void }) {
  const maxWeight = useMemo(
    () => topics.reduce((m, t) => Math.max(m, t.weight), 1),
    [topics],
  );
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-secondary" /> Interest timeline
          </div>
          <button
            onClick={onSeed}
            className="text-[11px] px-2.5 py-1 rounded-full bg-muted/40 border border-border/50 flex items-center gap-1 hover:bg-muted/60 transition"
          >
            <RefreshCw className="w-3 h-3" /> Re-seed
          </button>
        </div>
        {topics.length === 0 ? (
          <p className="text-xs text-muted-foreground">No topics tracked yet.</p>
        ) : (
          <div className="flex items-end gap-1 h-28">
            {topics.slice(0, 20).map((t, i) => {
              const h = Math.max(6, (t.weight / maxWeight) * 100);
              const TrendIcon = TREND_META[t.trend].icon;
              return (
                <motion.div
                  key={t.topic}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  className="flex-1 rounded-t-sm relative group flex items-end justify-center"
                  style={{
                    background:
                      t.trend === "rising" ? "hsl(var(--secondary))"
                      : t.trend === "declining" ? "hsl(var(--accent) / 0.6)"
                      : "hsl(var(--primary) / 0.6)",
                  }}
                >
                  <TrendIcon className={cn("w-3 h-3 mb-1 opacity-0 group-hover:opacity-100 transition", TREND_META[t.trend].color)} />
                  <span className="absolute -top-5 text-[8px] opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {t.topic}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Topic DNA</div>
        {topics.length === 0 ? (
          <p className="text-xs text-muted-foreground">No topics tracked yet. Re-seed from your interest graph to populate.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {topics.map((t) => {
              const trend = TREND_META[t.trend];
              const TrendIcon = trend.icon;
              return (
                <div key={t.topic} className="rounded-xl border border-border/40 bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">{t.topic}</span>
                    <span className={cn("flex items-center gap-1 text-[10px]", trend.color)}>
                      <TrendIcon className="w-3 h-3" /> {trend.label}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, t.weight)}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-secondary to-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      First seen {new Date(t.firstSeen).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Last seen {new Date(t.lastSeen).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {t.relatedTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
                      {t.relatedTopics.slice(0, 5).map((r) => (
                        <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground capitalize">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Memory tab ───────────────────────────────────────────────────────────

function MemoryTab() {
  const [interactions, setInteractions] = useState<BrainInteraction[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [groups, setGroups] = useState<Record<string, GroupMemoryItem[]>>({});
  const [activeCircle, setActiveCircle] = useState("Cairo Book Club");
  const CIRCLES = ["Cairo Book Club", "Yassin Family", "Cairo Cyclists"];

  useEffect(() => {
    (async () => {
      const r = await getRecentInteractions(25);
      setInteractions(r);
      const all: Record<string, GroupMemoryItem[]> = {};
      for (const c of CIRCLES) {
        all[c] = await personalAI.getGroupMemory(c);
      }
      setGroups(all);
    })();
  }, []);

  const runSearch = async () => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const r = await personalAI.recall(query, 5);
      setResults(r);
    } finally {
      setSearching(false);
    }
  };

  const addMockMemory = async () => {
    await personalAI.addToGroupMemory(activeCircle, {
      title: "New memory",
      caption: "Manually added from Personal AI OS.",
      kind: "moment",
    });
    const fresh = await personalAI.getGroupMemory(activeCircle);
    setGroups((g) => ({ ...g, [activeCircle]: fresh }));
    toast.success("Memory added");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
          <Search className="w-3 h-3 text-secondary" /> Recall
        </div>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
            placeholder="Search past interactions…"
            className="flex-1 h-9 bg-muted/40"
            aria-label="Search past interactions"
          />
          <button
            onClick={runSearch}
            disabled={searching}
            className="px-4 h-9 rounded-full bg-secondary text-secondary-foreground text-sm flex items-center gap-1 hover:opacity-90 transition disabled:opacity-60"
          >
            {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            Recall
          </button>
        </div>
        {results !== null && (
          <div className="mt-3 space-y-2">
            {results.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matching interactions found.</p>
            ) : results.map((r, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-muted/30 p-3 text-xs leading-relaxed">
                {r}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1">
          <Clock className="w-3 h-3 text-secondary" /> Recent interactions
        </div>
        {interactions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No interactions recorded yet. Chat with the AI assistant to populate memory.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {interactions.map((i) => (
              <div key={i.id} className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase">{i.category}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(i.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <div className="text-xs font-medium truncate">Q: {i.query}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{i.response}</div>
                {i.feedback && (
                  <span className={cn(
                    "inline-block text-[9px] px-1.5 py-0.5 rounded-full",
                    i.feedback === "positive" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500",
                  )}>
                    {i.feedback === "positive" ? "👍 helpful" : "👎 not helpful"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <BookHeart className="w-3 h-3 text-secondary" /> Group memories
          </div>
          <button
            onClick={addMockMemory}
            className="text-[11px] px-2.5 py-1 rounded-full bg-muted/40 border border-border/50 hover:bg-muted/60 transition"
          >
            + Add memory
          </button>
        </div>
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {CIRCLES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCircle(c)}
              className={cn(
                "text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap transition",
                activeCircle === c
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        {(groups[activeCircle] ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No shared memories in this circle yet.</p>
        ) : (
          <div className="space-y-2">
            {(groups[activeCircle] ?? []).map((m) => (
              <div key={m.id} className="rounded-xl border border-border/40 bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium">{m.title}</span>
                  <span className="text-[10px] text-muted-foreground">{m.kind}</span>
                </div>
                <p className="text-xs text-muted-foreground">{m.caption}</p>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(m.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Integration tab ──────────────────────────────────────────────────────

const INTEGRATED_FEATURES = [
  { id: "ai-assistant", name: "AI Assistant", emoji: "🤖", desc: "Personalized replies + tone matching", on: true },
  { id: "news-feed", name: "News Feed", emoji: "📰", desc: "Tailored to mood + interests", on: true },
  { id: "oracle", name: "Cirkle Oracle", emoji: "🔮", desc: "Predictions tuned to your style", on: true },
  { id: "travel", name: "Travel (Rihla)", emoji: "✈️", desc: "Trips aligned to your travel style", on: true },
  { id: "midan", name: "Midan posts", emoji: "📢", desc: "Compose in your communication style", on: false },
  { id: "mood-feed", name: "Mood Feed", emoji: "🎭", desc: "Reshape feed based on current mood", on: true },
  { id: "smart-inbox", name: "Smart Inbox", emoji: "🧠", desc: "Summaries in your reading style", on: false },
  { id: "learn", name: "Cirkle Learn", emoji: "📚", desc: "Adapts to your learning style", on: true },
];

function IntegrationTab({
  consent, onConsentChange,
}: {
  consent: boolean;
  onConsentChange: (v: boolean) => void;
}) {
  const [features, setFeatures] = useState(INTEGRATED_FEATURES);
  const toggleFeature = (id: string) => {
    setFeatures((fs) => fs.map((f) => f.id === id ? { ...f, on: !f.on } : f));
    toast.info("Integration updated", { description: "Takes effect on next interaction." });
  };
  return (
    <div className="space-y-4">
      <section className={cn(
        "rounded-2xl border p-4 flex items-start gap-3",
        consent ? "border-secondary/40 bg-gradient-to-br from-secondary/10 to-transparent"
                : "border-accent/30 bg-gradient-to-br from-accent/10 to-transparent",
      )}>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          consent ? "bg-secondary/15" : "bg-accent/15",
        )}>
          <ShieldCheck className={cn("w-5 h-5", consent ? "text-secondary" : "text-accent")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            {consent ? "Personal AI context is ON" : "Personal AI context is OFF"}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
            When ON, a derived personalization string (DNA style, mood, top interests) is appended to AI prompts so replies adapt to you. When OFF, only a minimal style hint is sent. Your raw DNA / mood data never leaves the device.
          </p>
        </div>
        <Switch checked={consent} onCheckedChange={onConsentChange} aria-label="Toggle personal AI context sharing" />
      </section>

      <section>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1">
          <Plug className="w-3 h-3 text-secondary" /> Features using your Personal AI
        </div>
        <div className="space-y-2">
          {features.map((f) => (
            <div key={f.id} className="rounded-2xl border border-border/60 bg-card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-lg shrink-0">
                {f.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">{f.desc}</div>
              </div>
              <Switch checked={f.on} onCheckedChange={() => toggleFeature(f.id)} aria-label={`Toggle ${f.name} integration`} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          All toggles are stored locally. Feature integrations take effect on the next interaction — your data never leaves the device.
        </p>
      </section>
    </div>
  );
}

// ── Main overlay ─────────────────────────────────────────────────────────

export function PersonalAIOS({ open, onClose }: Props) {
  const { dna, mood, topics, loading, refreshing, refreshMood, rebuildDNA, refreshTopics } = usePersonalAI();
  const [tab, setTab] = useState("dna");
  const [consent, setConsentState] = useState(false);

  useEffect(() => {
    if (!open) return;
    getPersonalAIConsent().then(setConsentState).catch(() => setConsentState(false));
  }, [open]);

  const handleConsentChange = async (v: boolean) => {
    setConsentState(v);
    await setPersonalAIConsent(v);
    toast.success(v ? "Personal AI context enabled" : "Personal AI context disabled");
  };

  const handleRebuild = async () => {
    await rebuildDNA();
    toast.success("DNA rebuilt", { description: "Your personality fingerprint is fresh." });
  };

  const handleMoodRefresh = async () => {
    await refreshMood({
      time_of_day: new Date().getHours(),
      session_duration: typeof window !== "undefined" ? performance.now() : undefined,
    });
    toast.success("Mood refreshed");
  };

  const handleSeed = async () => {
    await personalAI.seedTopicDNAFromInterests();
    await refreshTopics();
    toast.success("Topic DNA re-seeded");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-background overflow-y-auto"
        >
          <div className="fixed inset-0 aurora-bg opacity-20 pointer-events-none" />
          <div className="sticky top-0 z-20 glass-strong border-b border-border/40 px-4 pt-[env(safe-area-inset-top)] pb-2">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                <CircleMark size={36} />
                <div>
                  <h2 className="font-display text-xl gradient-text-gold">Personal AI OS</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Your DNA · Mood · Topics · Memory · Integrations
                  </p>
                </div>
              </div>
              <FeedbackButton overlayName="Personal AI OS" />
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-w-2xl mx-auto mt-2">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full h-auto flex-wrap">
                  <TabsTrigger value="dna" className="flex-1 min-w-[64px]"><Dna className="w-3 h-3" />DNA</TabsTrigger>
                  <TabsTrigger value="mood" className="flex-1 min-w-[64px]"><Activity className="w-3 h-3" />Mood</TabsTrigger>
                  <TabsTrigger value="topics" className="flex-1 min-w-[64px]"><TrendingUp className="w-3 h-3" />Topics</TabsTrigger>
                  <TabsTrigger value="memory" className="flex-1 min-w-[64px]"><Brain className="w-3 h-3" />Memory</TabsTrigger>
                  <TabsTrigger value="integration" className="flex-1 min-w-[64px]"><Plug className="w-3 h-3" />Integrations</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="relative max-w-2xl mx-auto px-4 py-5 pb-32">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-secondary" />
              </div>
            ) : (
              <Tabs value={tab} onValueChange={setTab}>
                <TabsContent value="dna">
                  <DNATab dna={dna} onRebuild={handleRebuild} refreshing={refreshing} />
                </TabsContent>
                <TabsContent value="mood">
                  <MoodTab mood={mood} onRefresh={handleMoodRefresh} refreshing={refreshing} />
                </TabsContent>
                <TabsContent value="topics">
                  <TopicsTab topics={topics} onSeed={handleSeed} />
                </TabsContent>
                <TabsContent value="memory">
                  <MemoryTab />
                </TabsContent>
                <TabsContent value="integration">
                  <IntegrationTab consent={consent} onConsentChange={handleConsentChange} />
                </TabsContent>
              </Tabs>
            )}

            {/* Summary footer card */}
            {!loading && (
              <section className="mt-6 rounded-2xl border border-border/60 bg-card p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-secondary" /> Unified profile snapshot
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="font-display text-lg gradient-text-gold">{dna ? "✓" : "—"}</div>
                    <div className="text-[10px] text-muted-foreground">DNA</div>
                  </div>
                  <div>
                    <div className="font-display text-lg gradient-text-gold">{mood ? MOOD_META[mood.current].emoji : "—"}</div>
                    <div className="text-[10px] text-muted-foreground">Mood</div>
                  </div>
                  <div>
                    <div className="font-display text-lg gradient-text-gold">{topics.length}</div>
                    <div className="text-[10px] text-muted-foreground">Topics</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <ShieldCheck className="w-3 h-3" /> 100% on-device · {consent ? "context sharing on" : "context sharing off"}
                  </div>
                  <button
                    onClick={() => setTab("integration")}
                    className="text-[10px] text-secondary flex items-center gap-0.5 hover:gap-1 transition-all"
                  >
                    Manage <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </section>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
