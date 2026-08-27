// @ts-nocheck
/**
 * Smart Reply Chips overlay (Tier A, A1).
 *
 * Renders 3 quick-reply chips above the Wasl composer. Because we can't modify
 * `wasl-screen.tsx`, this overlay is an embeddable component that listens for
 * the `circle:smart-reply` event (the host dispatches it with
 * `{ conversationId, lastMessage, senderName, locale }`).
 *
 * The overlay then fetches `/api/ai/smart-reply-v2` (8s timeout) and renders
 * 3 tappable chips. When the user taps a chip, we dispatch
 * `circle:smart-reply-select` with `{ conversationId, reply }` so the host
 * can fill the composer.
 *
 * It uses OverlayShell in "sheet" variant only when opened standalone from
 * the overlay browser — the embeddable variant is a bare chip row controlled
 * by the `mode` prop.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Loader2, X, RefreshCw, Lightbulb } from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface SmartReplyRequest {
  conversationId: string;
  lastMessage: string;
  senderName?: string;
  locale?: "en" | "ar";
}

interface SmartReplyResponse {
  replies: string[];
  provider: string;
  elapsedMs: number;
  fallback: boolean;
}

const REFRESH_MIN_MS = 1500;

export function SmartReplyChips({ open, onClose }: Props) {
  const [req, setReq] = useState<SmartReplyRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmartReplyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastFetchAt = useRef<number>(0);
  const fetchSeq = useRef<number>(0);

  const fetchReplies = useCallback(
    async (r: SmartReplyRequest, force = false) => {
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
          const res = await fetch("/api/ai/smart-reply-v2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: r.lastMessage,
              senderName: r.senderName,
              conversationId: r.conversationId,
              locale: r.locale ?? "en",
            }),
            signal: ctrl.signal,
          });
          if (!res.ok) {
            const errBody = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(errBody.error ?? `HTTP ${res.status}`);
          }
          const data = (await res.json()) as SmartReplyResponse;
          if (seq !== fetchSeq.current) return; // stale
          setResult(data);
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        if (seq !== fetchSeq.current) return;
        const msg = err instanceof Error ? err.message : "Failed to load replies";
        setError(msg);
        toast.error("Smart reply failed", { description: msg });
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    },
    [],
  );

  // Listen for `circle:smart-reply` events dispatched by the host.
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SmartReplyRequest>).detail;
      if (!detail?.conversationId || !detail?.lastMessage) return;
      setReq(detail);
      setResult(null);
      setError(null);
      fetchReplies(detail);
    };
    window.addEventListener("circle:smart-reply", handler);
    return () => window.removeEventListener("circle:smart-reply", handler);
  }, [open, fetchReplies]);

  const handleChipClick = (reply: string) => {
    if (!req) return;
    window.dispatchEvent(
      new CustomEvent("circle:smart-reply-select", {
        detail: { conversationId: req.conversationId, reply },
      }),
    );
    toast.success("Reply selected", { description: reply });
    onClose();
  };

  const handleRefresh = () => {
    if (!req) return;
    fetchReplies(req, true);
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="dialog" maxWidth="max-w-md" ariaLabel="Smart replies">
      <div className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden />
            </div>
            <div>
              <h2 id="smart-reply-title" className="text-sm font-semibold text-white">
                Smart Replies
              </h2>
              <p className="text-[11px] text-white/50">ردود سريعة</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white"
            onClick={onClose}
            aria-label="Close smart replies"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Last message preview */}
        {req ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
              {req.senderName ?? "Them"}
            </p>
            <p className="text-sm text-white/80 line-clamp-3">{req.lastMessage}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xs text-white/50">
              Open a conversation and tap the Smart Reply icon to generate quick replies.
            </p>
          </div>
        )}

        {/* Chips */}
        <div
          role="group"
          aria-label="Quick reply options"
          className="flex flex-wrap gap-2 min-h-[2.5rem]"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-white/60 text-sm py-2" aria-live="polite">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" aria-hidden />
              Thinking…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-rose-300/80 text-sm py-2">
              <Lightbulb className="w-4 h-4" aria-hidden />
              <span className="truncate">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleRefresh}
                aria-label="Retry smart replies"
              >
                Retry
              </Button>
            </div>
          ) : result ? (
            <AnimatePresence mode="popLayout">
              {result.replies.map((reply, i) => (
                <motion.button
                  key={`${reply}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ delay: i * 0.04, duration: 0.18 }}
                  onClick={() => handleChipClick(reply)}
                  className={cn(
                    "group px-3 py-2 rounded-xl text-sm font-medium",
                    "bg-emerald-500/10 border border-emerald-500/30 text-emerald-100",
                    "hover:bg-emerald-500/20 hover:border-emerald-400/50",
                    "active:scale-[0.97] transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                  )}
                  aria-label={`Send reply: ${reply}`}
                >
                  {reply}
                </motion.button>
              ))}
            </AnimatePresence>
          ) : null}
        </div>

        {/* Footer */}
        {result && (
          <div className="flex items-center justify-between text-[11px] text-white/40">
            <span>
              {result.fallback ? "Curated · " : `AI · ${result.provider} · `}
              {result.elapsedMs}ms
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-white/60 hover:text-white"
              onClick={handleRefresh}
              aria-label="Refresh smart replies"
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

export default SmartReplyChips;
