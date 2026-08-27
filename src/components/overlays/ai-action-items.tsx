// @ts-nocheck
/**
 * AI Action Items overlay (Tier E, E8).
 *
 * Task list with checkboxes + due dates + mark-done. Listens for
 * `circle:ai-action-items` events dispatched by the host with
 * `{ conversationId }`. On open: extracts action items via POST
 * `/api/ai/action-items` (8s timeout) and then lists pending items via
 * GET (8s timeout). Marking an item done PATCHes the API.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, ListChecks, Loader2, RefreshCw, AlertCircle, Check, Calendar,
  User, Sparkles,
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

interface ActionItem {
  id: string;
  conversationId: string;
  messageId: string;
  body: string;
  assignee?: string | null;
  dueDate?: string | null;
  done: boolean;
  extractedAt: string;
}

interface ActionItemsRequest {
  conversationId: string;
}

interface ExtractResponse {
  conversationId: string;
  items: Array<{ messageId: string; body: string; assignee?: string; dueDate?: string }>;
  provider: string;
  elapsedMs: number;
  fallback: boolean;
}

function dueLabel(iso?: string | null): { label: string; tint: string } | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const diff = d.getTime() - Date.now();
    const days = Math.ceil(diff / 86_400_000);
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, tint: "border-rose-500/40 text-rose-300" };
    if (days === 0) return { label: "Due today", tint: "border-amber-500/40 text-amber-300" };
    if (days === 1) return { label: "Tomorrow", tint: "border-amber-500/40 text-amber-300" };
    if (days <= 7) return { label: `In ${days}d`, tint: "border-sky-500/40 text-sky-300" };
    return { label: d.toLocaleDateString(), tint: "border-white/15 text-white/50" };
  } catch {
    return null;
  }
}

export function AIActionItems({ open, onClose }: Props) {
  const [req, setReq] = useState<ActionItemsRequest | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const fetchSeq = useRef<number>(0);

  const loadItems = useCallback(async (conversationId: string) => {
    const seq = ++fetchSeq.current;
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(
          `/api/ai/action-items?conversationId=${encodeURIComponent(conversationId)}&pendingOnly=false&limit=50`,
          { signal: ctrl.signal, cache: "no-store" },
        );
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errBody.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { items: ActionItem[] };
        if (seq !== fetchSeq.current) return;
        // Sort: pending first, then by due date asc.
        const sorted = [...data.items].sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return ad - bd;
        });
        setItems(sorted);
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      const msg = err instanceof Error ? err.message : "Failed to load items";
      setError(msg);
    }
  }, []);

  const extract = useCallback(
    async (conversationId: string) => {
      const seq = ++fetchSeq.current;
      setExtracting(true);
      setError(null);
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 8000);
        try {
          const res = await fetch("/api/ai/action-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId }),
            signal: ctrl.signal,
          });
          if (!res.ok) {
            const errBody = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(errBody.error ?? `HTTP ${res.status}`);
          }
          const data = (await res.json()) as ExtractResponse;
          if (seq !== fetchSeq.current) return;
          toast.success(`Extracted ${data.items.length} action item${data.items.length === 1 ? "" : "s"}`, {
            description: data.fallback ? "Using heuristics (AI unavailable)" : `via ${data.provider}`,
          });
          // Refresh the list.
          await loadItems(conversationId);
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        if (seq !== fetchSeq.current) return;
        const msg = err instanceof Error ? err.message : "Failed to extract";
        setError(msg);
        toast.error("Extraction failed", { description: msg });
      } finally {
        if (seq === fetchSeq.current) setExtracting(false);
      }
    },
    [loadItems],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ActionItemsRequest>).detail;
      if (!detail?.conversationId) return;
      setReq(detail);
      setItems([]);
      setError(null);
      // Extract first, then load.
      extract(detail.conversationId).then(() => loadItems(detail.conversationId));
    };
    window.addEventListener("circle:ai-action-items", handler);
    return () => window.removeEventListener("circle:ai-action-items", handler);
  }, [open, extract, loadItems]);

  const handleToggleDone = async (item: ActionItem) => {
    if (item.done) return;
    setMarkingId(item.id);
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch("/api/ai/action-items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, done: true }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errBody.error ?? `HTTP ${res.status}`);
        }
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, done: true } : it)),
        );
        toast.success("Marked done", { description: item.body.slice(0, 60) });
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      toast.error("Update failed", { description: msg });
    } finally {
      setMarkingId(null);
    }
  };

  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-lg" ariaLabel="AI action items">
      <div className="glass backdrop-blur-xl border border-white/10 rounded-t-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <ListChecks className="w-4 h-4 text-emerald-400" aria-hidden />
              {pending.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {pending.length > 99 ? "99+" : pending.length}
                </span>
              )}
            </div>
            <div>
              <h2 id="action-items-title" className="text-sm font-semibold text-white">
                Action Items
              </h2>
              <p className="text-[11px] text-white/50">
                {req ? `${pending.length} pending · ${done.length} done` : "العناصر القابلة للتنفيذ"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white"
              onClick={() => req && extract(req.conversationId)}
              disabled={extracting || !req}
              aria-label="Re-extract action items"
            >
              <RefreshCw className={cn("w-4 h-4", extracting && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white"
              onClick={onClose}
              aria-label="Close action items"
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
              Open a conversation and tap the Action Items icon to extract commitments.
            </p>
          </div>
        )}

        {/* Extracting */}
        {extracting && (
          <div className="flex items-center gap-2 text-white/60 text-xs py-3" aria-live="polite">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" aria-hidden />
            Scanning messages for commitments…
          </div>
        )}

        {/* Error */}
        {error && !extracting && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="text-xs text-rose-200">{error}</p>
              {req && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 mt-2 px-2 text-xs text-rose-100 hover:text-white"
                  onClick={() => extract(req.conversationId)}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Pending list */}
        {req && (
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 -mr-1 custom-scroll">
            {pending.length > 0 && (
              <section aria-labelledby="pending-section">
                <p id="pending-section" className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
                  Pending ({pending.length})
                </p>
                <ul className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {pending.map((item) => {
                      const due = dueLabel(item.dueDate);
                      return (
                        <motion.li
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-start gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleDone(item)}
                            disabled={markingId === item.id}
                            className={cn(
                              "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                              "border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-500/10",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                              markingId === item.id && "opacity-50 cursor-wait",
                            )}
                            aria-label={`Mark done: ${item.body}`}
                            aria-pressed={false}
                          >
                            {markingId === item.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" aria-hidden />
                            ) : null}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white/90 leading-snug break-words">
                              {item.body}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {item.assignee && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-white/15 text-white/60">
                                  <User className="w-2.5 h-2.5 mr-0.5" aria-hidden />
                                  {item.assignee}
                                </Badge>
                              )}
                              {due && (
                                <Badge variant="outline" className={cn("text-[9px] py-0 px-1.5", due.tint)}>
                                  <Calendar className="w-2.5 h-2.5 mr-0.5" aria-hidden />
                                  {due.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </section>
            )}

            {/* Done list */}
            {done.length > 0 && (
              <section aria-labelledby="done-section">
                <p id="done-section" className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
                  Done ({done.length})
                </p>
                <ul className="space-y-1.5">
                  {done.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 flex items-start gap-2"
                    >
                      <div className="mt-0.5 w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" aria-hidden />
                      </div>
                      <p className="text-xs text-white/50 line-through break-words">
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* All empty */}
            {!extracting && pending.length === 0 && done.length === 0 && (
              <div className="text-center py-8">
                <ListChecks className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden />
                <p className="text-sm text-white/50">
                  No commitments detected yet.
                </p>
                <p className="text-[11px] text-white/40 mt-1">
                  Try refreshing after more messages.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

export default AIActionItems;
