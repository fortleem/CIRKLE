// @ts-nocheck
/**
 * AI Friendship Health Meter overlay (Tier E, E7).
 *
 * Shows the friendship health score (0-100), a trend chart (up/stable/down),
 * and human-readable alerts ("You haven't talked to X in 2 weeks"). Listens
 * for `circle:ai-friendship-health` events dispatched by the host with
 * `{ contactId, contactName? }`. Fetches `/api/ai/friendship-health` (8s
 * timeout). Dispatches `circle:ai-friendship-health-result` with the result.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Heart, Loader2, RefreshCw, AlertCircle, TrendingUp, TrendingDown,
  Minus, Activity, Clock, MessageSquare, Sparkles,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface HealthRequest {
  contactId: string;
  contactName?: string;
}

interface Breakdown {
  frequency: number;
  sentiment: number;
  responsiveness: number;
  recency: number;
}

interface HealthResult {
  contactId: string;
  contactName: string;
  score: number;
  trend: "up" | "stable" | "down";
  breakdown: Breakdown;
  alerts: string[];
  sentimentDistribution?: { positive: number; neutral: number; negative: number };
  provider: string;
  elapsedMs: number;
  fallback: boolean;
}

const TREND_META = {
  up: { label: "Improving", icon: TrendingUp, tint: "text-emerald-300 border-emerald-500/40" },
  stable: { label: "Stable", icon: Minus, tint: "text-sky-300 border-sky-500/40" },
  down: { label: "Cooling", icon: TrendingDown, tint: "text-rose-300 border-rose-500/40" },
} as const;

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-300";
  if (score >= 30) return "text-orange-400";
  return "text-rose-400";
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Thriving";
  if (score >= 70) return "Healthy";
  if (score >= 50) return "Steady";
  if (score >= 30) return "Drifting";
  return "At risk";
}

function Ring({ score }: { score: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div className="relative w-36 h-36" role="img" aria-label={`Health score ${score} out of 100`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64" cy="64" r={radius}
          strokeWidth="8" stroke="currentColor"
          className="text-white/10"
          fill="none"
        />
        <motion.circle
          cx="64" cy="64" r={radius}
          strokeWidth="8" stroke="currentColor"
          className={scoreColor(score)}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold tabular-nums", scoreColor(score))}>
          {score}
        </span>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">
          / 100
        </span>
      </div>
    </div>
  );
}

function MiniBar({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Activity }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-white/60">
          <Icon className="w-3 h-3" aria-hidden />
          {label}
        </span>
        <span className={cn("font-semibold tabular-nums", scoreColor(value))}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", scoreColor(value).replace("text-", "bg-"))}
        />
      </div>
    </div>
  );
}

export function AIFriendshipHealth({ open, onClose }: Props) {
  const [req, setReq] = useState<HealthRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchSeq = useRef<number>(0);

  const fetchHealth = useCallback(
    async (r: HealthRequest) => {
      const seq = ++fetchSeq.current;
      setLoading(true);
      setError(null);
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 8000);
        try {
          const params = new URLSearchParams({ contactId: r.contactId });
          if (r.contactName) params.set("contactName", r.contactName);
          const res = await fetch(`/api/ai/friendship-health?${params.toString()}`, {
            signal: ctrl.signal,
            cache: "no-store",
          });
          if (!res.ok) {
            const errBody = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(errBody.error ?? `HTTP ${res.status}`);
          }
          const data = (await res.json()) as HealthResult;
          if (seq !== fetchSeq.current) return;
          setResult(data);
          window.dispatchEvent(
            new CustomEvent("circle:ai-friendship-health-result", { detail: data }),
          );
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        if (seq !== fetchSeq.current) return;
        const msg = err instanceof Error ? err.message : "Failed to load health";
        setError(msg);
        toast.error("Health check failed", { description: msg });
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<HealthRequest>).detail;
      if (!detail?.contactId) return;
      setReq(detail);
      setResult(null);
      setError(null);
      fetchHealth(detail);
    };
    window.addEventListener("circle:ai-friendship-health", handler);
    return () => window.removeEventListener("circle:ai-friendship-health", handler);
  }, [open, fetchHealth]);

  const handleRefresh = () => {
    if (!req) return;
    fetchHealth(req);
  };

  const trend = result ? TREND_META[result.trend] : null;
  const TrendIcon = trend?.icon;

  return (
    <OverlayShell open={open} onClose={onClose} variant="dialog" maxWidth="max-w-md" ariaLabel="Friendship health meter">
      <div className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Heart className="w-4 h-4 text-emerald-400" aria-hidden />
            </div>
            <div>
              <h2 id="friendship-title" className="text-sm font-semibold text-white">
                Friendship Health
              </h2>
              <p className="text-[11px] text-white/50">صحة العلاقة</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white"
              onClick={handleRefresh}
              disabled={loading || !req}
              aria-label="Refresh health"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white"
              onClick={onClose}
              aria-label="Close friendship health"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {!req && (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
            <Sparkles className="w-5 h-5 text-white/30 mx-auto mb-2" aria-hidden />
            <p className="text-xs text-white/50">
              Open a contact's profile and tap the Health icon to see your friendship score.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && req && !result && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" aria-hidden />
            <p className="text-xs text-white/50" aria-live="polite">
              Analyzing your messages…
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="text-xs text-rose-200">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 mt-2 px-2 text-xs text-rose-100 hover:text-white"
                onClick={handleRefresh}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Contact name + trend */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-white/90 truncate">
                {result.contactName}
              </p>
              {trend && TrendIcon && (
                <Badge variant="outline" className={cn("text-[10px] gap-1", trend.tint)}>
                  <TrendIcon className="w-3 h-3" aria-hidden />
                  {trend.label}
                </Badge>
              )}
            </div>

            {/* Score ring */}
            <div className="flex flex-col items-center gap-2 py-2">
              <Ring score={result.score} />
              <p className={cn("text-sm font-semibold", scoreColor(result.score))}>
                {scoreLabel(result.score)}
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-3">
              <MiniBar label="Recency" value={result.breakdown.recency} icon={Clock} />
              <MiniBar label="Frequency" value={result.breakdown.frequency} icon={MessageSquare} />
              <MiniBar label="Responsiveness" value={result.breakdown.responsiveness} icon={Activity} />
              <MiniBar label="Sentiment" value={result.breakdown.sentiment} icon={Heart} />
            </div>

            {/* Sentiment distribution */}
            {result.sentimentDistribution && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(["positive", "neutral", "negative"] as const).map((k) => {
                  const v = result.sentimentDistribution![k];
                  const tint =
                    k === "positive" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                    : k === "negative" ? "bg-rose-500/15 border-rose-500/30 text-rose-200"
                    : "bg-white/5 border-white/10 text-white/60";
                  return (
                    <div key={k} className={cn("rounded-lg border p-2 text-center", tint)}>
                      <p className="text-[10px] uppercase tracking-wider opacity-70">{k}</p>
                      <p className="text-lg font-bold tabular-nums">{v}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Alerts */}
            {result.alerts.length > 0 && (
              <div
                role="region"
                aria-label="Health alerts"
                className="space-y-1.5"
              >
                <p className="text-[10px] uppercase tracking-wider text-white/40">Alerts</p>
                <AnimatePresence mode="popLayout">
                  {result.alerts.map((a, i) => (
                    <motion.div
                      key={`${a.slice(0, 20)}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-start gap-2"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" aria-hidden />
                      <p className="text-[11px] text-amber-100 leading-snug">{a}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] text-white/40 pt-1">
              <span>
                {result.provider} · {result.elapsedMs}ms
                {result.fallback && " · heuristic only"}
              </span>
              <span>last 90 days</span>
            </div>
          </>
        )}
      </div>
    </OverlayShell>
  );
}

export default AIFriendshipHealth;
