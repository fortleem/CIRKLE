// @ts-nocheck
/**
 * AI Conversation Starters overlay (Tier E, E6).
 *
 * Shows 3 tappable conversation starter chips. Listens for
 * `circle:ai-conversation-starters` events dispatched by the host with
 * `{ conversationId, contactName? }`. Fetches `/api/ai/conversation-starters`
 * (8s timeout). When the user taps a chip, dispatches
 * `circle:ai-conversation-starters-select` with `{ conversationId, starter }`.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Sparkles, Loader2, RefreshCw, Lightbulb, MessageSquarePlus,
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

interface StarterRequest {
  conversationId: string;
  contactName?: string;
}

interface StarterResponse {
  conversationId: string;
  starters: string[];
  provider: string;
  elapsedMs: number;
  fallback: boolean;
}

const REFRESH_MIN_MS = 1500;

export function AIConversationStarters({ open, onClose }: Props) {
  const [req, setReq] = useState<StarterRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StarterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastFetchAt = useRef<number>(0);
  const fetchSeq = useRef<number>(0);

  const fetchStarters = useCallback(
    async (r: StarterRequest, force = false) => {
      const now = Date.now();
      if (!force && now - lastFetchAt.current < REFRESH_MIN_MS) return;
      lastFetchAt.current = now;
      const seq = ++fetchSeq.current;
      setLoading(true);
      setError(null);
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 8000);
        try {
          const res = await fetch("/api/ai/conversation-starters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: r.conversationId,
              contactName: r.contactName,
            }),
            signal: ctrl.signal,
          });
          if (!res.ok) {
            const errBody = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(errBody.error ?? `HTTP ${res.status}`);
          }
          const data = (await res.json()) as StarterResponse;
          if (seq !== fetchSeq.current) return;
          setResult(data);
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        if (seq !== fetchSeq.current) return;
        const msg = err instanceof Error ? err.message : "Failed to load starters";
        setError(msg);
        toast.error("Starters failed", { description: msg });
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<StarterRequest>).detail;
      if (!detail?.conversationId) return;
      setReq(detail);
      setResult(null);
      setError(null);
      fetchStarters(detail);
    };
    window.addEventListener("circle:ai-conversation-starters", handler);
    return () => window.removeEventListener("circle:ai-conversation-starters", handler);
  }, [open, fetchStarters]);

  const handleStarterClick = (starter: string) => {
    if (!req) return;
    window.dispatchEvent(
      new CustomEvent("circle:ai-conversation-starters-select", {
        detail: { conversationId: req.conversationId, starter },
      }),
    );
    toast.success("Starter selected", { description: starter });
    onClose();
  };

  const handleRefresh = () => {
    if (!req) return;
    fetchStarters(req, true);
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="dialog" maxWidth="max-w-md" ariaLabel="Conversation starters">
      <div className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <MessageSquarePlus className="w-4 h-4 text-emerald-400" aria-hidden />
            </div>
            <div>
              <h2 id="starters-title" className="text-sm font-semibold text-white">
                Conversation Starters
              </h2>
              <p className="text-[11px] text-white/50">أفكار لبدء المحادثة</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white"
            onClick={onClose}
            aria-label="Close conversation starters"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Contact context */}
        {req ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-300/80" aria-hidden />
            <p className="text-xs text-white/70">
              {req.contactName ? `For ${req.contactName}` : "For this conversation"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xs text-white/50">
              Open a conversation and tap the Starters icon to suggest an opening line.
            </p>
          </div>
        )}

        {/* Starters list */}
        <div
          role="list"
          aria-label="Conversation starters"
          className="space-y-2 min-h-[3rem]"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-white/60 text-sm py-2" aria-live="polite">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" aria-hidden />
              Thinking of openers…
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-start gap-2"
            >
              <Lightbulb className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" aria-hidden />
              <div className="flex-1">
                <p className="text-xs text-rose-200">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 mt-1 px-2 text-xs text-rose-100 hover:text-white"
                  onClick={handleRefresh}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : result ? (
            <AnimatePresence mode="popLayout">
              {result.starters.map((s, i) => (
                <motion.button
                  key={`${s}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ delay: i * 0.05, duration: 0.18 }}
                  onClick={() => handleStarterClick(s)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border",
                    "bg-emerald-500/10 border-emerald-500/30 text-emerald-50",
                    "hover:bg-emerald-500/20 hover:border-emerald-400/50",
                    "active:scale-[0.98] transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                  )}
                  aria-label={`Use starter: ${s}`}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" aria-hidden />
                    <p className="text-sm leading-snug">{s}</p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          ) : null}
        </div>

        {/* Footer */}
        {result && (
          <div className="flex items-center justify-between text-[11px] text-white/40">
            <span>
              {result.fallback ? (
                <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[9px] mr-1">
                  cached
                </Badge>
              ) : null}
              {result.provider} · {result.elapsedMs}ms
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-white/60 hover:text-white"
              onClick={handleRefresh}
              aria-label="Refresh starters"
            >
              <RefreshCw className="w-3 h-3 mr-1" aria-hidden />
              Refresh
            </Button>
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

export default AIConversationStarters;
