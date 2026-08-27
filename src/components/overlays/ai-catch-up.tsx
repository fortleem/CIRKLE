// @ts-nocheck
/**
 * AI Catch Up overlay (Tier E, E3) — shows a personalized "While you were
 * away…" summary with one card per active module.
 *
 * Listens for `circle:ai-catch-up` events (no payload needed — the overlay
 * just opens and fetches). On open, fetches `/api/ai/catch-up?sinceHours=24`
 * with an 8s AbortController timeout. Dispatches `circle:ai-catch-up-result`
 * with the result so other UIs (e.g. a notification badge) can react.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Sparkles, Loader2, RefreshCw, AlertCircle, ArrowRight, Clock,
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

interface CatchUpCard {
  module: "wasl" | "midan" | "circle" | "lamahat";
  title: string;
  body: string;
  emoji: string;
  tint: string;
}

interface CatchUpResult {
  headline: string;
  cards: CatchUpCard[];
  suggestedAction: string;
  provider: string;
  elapsedMs: number;
  fallback: boolean;
  signals: {
    waslUnread: number;
    midanMentions: number;
    circleActivity: number;
    lamahatNew: number;
    asOf: string;
  };
}

const MODULE_ROUTE: Record<CatchUpCard["module"], string> = {
  wasl: "wasl",
  midan: "midan",
  circle: "circle",
  lamahat: "lamahat",
};

export function AICatchUp({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CatchUpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchSeq = useRef<number>(0);

  const fetchCatchUp = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch("/api/ai/catch-up?sinceHours=24", {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errBody.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as CatchUpResult;
        if (seq !== fetchSeq.current) return;
        setResult(data);
        window.dispatchEvent(
          new CustomEvent("circle:ai-catch-up-result", { detail: data }),
        );
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
      toast.error("Catch-up failed", { description: msg });
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, []);

  // Fetch on open.
  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    fetchCatchUp();
  }, [open, fetchCatchUp]);

  const handleCardClick = (m: CatchUpCard["module"]) => {
    window.dispatchEvent(
      new CustomEvent("circle:open-module", { detail: { module: MODULE_ROUTE[m] ?? m } }),
    );
    toast(`Opening ${m}…`);
    onClose();
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="dialog" maxWidth="max-w-xl" ariaLabel="AI catch up briefing">
      <div className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden />
            </div>
            <div>
              <h2 id="catch-up-title" className="text-sm font-semibold text-white">
                While you were away…
              </h2>
              <p className="text-[11px] text-white/50">ملخص ما فاتك</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white"
              onClick={fetchCatchUp}
              disabled={loading}
              aria-label="Refresh catch-up"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white"
              onClick={onClose}
              aria-label="Close catch-up"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Headline */}
        {result && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-white/85 leading-relaxed"
          >
            {result.headline}
          </motion.p>
        )}

        {/* Loading */}
        {loading && !result && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" aria-hidden />
            <p className="text-xs text-white/50" aria-live="polite">
              Gathering your missed updates…
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
                onClick={fetchCatchUp}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Cards */}
        {result && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AnimatePresence mode="popLayout">
              {result.cards.map((card, i) => (
                <motion.button
                  key={`${card.module}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                  onClick={() => handleCardClick(card.module)}
                  className={cn(
                    "group relative overflow-hidden text-left p-3 rounded-xl border bg-gradient-to-br",
                    card.tint,
                    "hover:scale-[1.02] active:scale-[0.98] transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                  )}
                  aria-label={`${card.title} — ${card.body}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl leading-none" aria-hidden>{card.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white">{card.title}</p>
                      <p className="text-[11px] text-white/60 mt-0.5 line-clamp-2 break-words">
                        {card.body}
                      </p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-emerald-300 transition-colors mt-1 shrink-0" aria-hidden />
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer */}
        {result && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <Clock className="w-3 h-3" aria-hidden />
              {new Date(result.signals.asOf).toLocaleTimeString()}
              {result.fallback && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[9px] ml-1">
                  cached
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-emerald-300 hover:text-emerald-200"
              onClick={() => result.cards[0] && handleCardClick(result.cards[0]!.module)}
              disabled={!result.cards.length}
              aria-label={result.suggestedAction}
            >
              {result.suggestedAction}
              <ArrowRight className="w-3 h-3 ml-1" aria-hidden />
            </Button>
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

export default AICatchUp;
