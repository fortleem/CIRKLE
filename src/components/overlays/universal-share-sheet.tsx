// @ts-nocheck
/**
 * Universal Share Sheet overlay (Tier A, A3/A4/A5/A7/A8/A9).
 *
 * Bottom sheet showing every share target (Wasl, Midan, Lamahat, Rihla,
 * Citizen Shield, Commit) plus a preview of the transformed payload for the
 * selected target. Listens for `circle:universal-share` events dispatched by
 * the host with `{ source }` (a ShareSource object).
 *
 * When the user confirms a target, the overlay POSTs to the matching
 * `/api/share/to-*` endpoint (8s timeout), then dispatches
 * `circle:universal-share-result` with the result so the host can show
 * a toast / navigate to the new content.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Share2, Loader2, CheckCircle2, AlertCircle, ArrowRight, Sparkles,
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

// ── Types (mirror of share-targets.ts; duplicated to avoid server-only import) ──

type ShareTargetId =
  | "wasl" | "midan" | "lamahat" | "rihla" | "citizen-shield" | "commit";

interface ShareSource {
  module: string;
  contentId: string;
  author: string;
  body: string;
  caption?: string;
  media?: string[];
  mediaKind?: "photo" | "video" | "audio" | "none";
  location?: string;
  link?: string;
  at?: string;
}

interface ShareTargetResult {
  target: ShareTargetId;
  ok: boolean;
  id?: string;
  payload: Record<string, unknown>;
  error?: string;
  elapsedMs: number;
}

interface TargetMeta {
  id: ShareTargetId;
  label: string;
  emoji: string;
  description: string;
  tint: string;
  endpoint: string;
  /** True when the target requires a username (Midan/Commit). */
  needsUser: boolean;
}

const TARGETS: TargetMeta[] = [
  { id: "wasl", label: "Wasl", emoji: "💬", description: "Send as a chat message draft", tint: "bg-emerald-500/15 border-emerald-500/30", endpoint: "/api/share/to-wasl", needsUser: false },
  { id: "midan", label: "Midan", emoji: "📢", description: "Post to the public square", tint: "bg-amber-500/15 border-amber-500/30", endpoint: "/api/share/to-midan", needsUser: true },
  { id: "lamahat", label: "Lamahat", emoji: "📸", description: "Share as a photo moment", tint: "bg-rose-500/15 border-rose-500/30", endpoint: "/api/share/to-lamahat", needsUser: true },
  { id: "rihla", label: "Rihla", emoji: "🧭", description: "Add to a travel itinerary", tint: "bg-sky-500/15 border-sky-500/30", endpoint: "/api/share/to-rihla", needsUser: false },
  { id: "citizen-shield", label: "Citizen Shield", emoji: "🛡️", description: "File a civic report (protected)", tint: "bg-violet-500/15 border-violet-500/30", endpoint: "/api/share/to-citizen-shield", needsUser: false },
  { id: "commit", label: "Commit", emoji: "⚖️", description: "Announce commitment (no private terms)", tint: "bg-indigo-500/15 border-indigo-500/30", endpoint: "/api/share/commit-to-midan", needsUser: true },
];

const ENDPOINT_FOR: Record<ShareTargetId, string> = Object.fromEntries(
  TARGETS.map((t) => [t.id, t.endpoint]),
) as Record<ShareTargetId, string>;

export function UniversalShareSheet({ open, onClose }: Props) {
  const [source, setSource] = useState<ShareSource | null>(null);
  const [selected, setSelected] = useState<ShareTargetId | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ShareTargetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for `circle:universal-share` events from the host.
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ source: ShareSource }>).detail;
      if (!detail?.source) return;
      setSource(detail.source);
      setSelected(null);
      setResult(null);
      setError(null);
    };
    window.addEventListener("circle:universal-share", handler);
    return () => window.removeEventListener("circle:universal-share", handler);
  }, [open]);

  // Reset on close (deferred so the slide-out animation can play).
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setSource(null);
      setSelected(null);
      setResult(null);
      setError(null);
    }, 300);
    return () => clearTimeout(t);
  }, [open]);

  const send = useCallback(
    async (target: ShareTargetId) => {
      if (!source) return;
      setSelected(target);
      setSending(true);
      setResult(null);
      setError(null);
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 8000);
        try {
          const res = await fetch(ENDPOINT_FOR[target], {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source, username: "anonymous" }),
            signal: ctrl.signal,
          });
          const data = (await res.json().catch(() => ({}))) as ShareTargetResult | { error: string };
          if (!res.ok) {
            const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
            setError(msg);
            toast.error(`Share to ${target} failed`, { description: msg });
            return;
          }
          const r = data as ShareTargetResult;
          setResult(r);
          window.dispatchEvent(
            new CustomEvent("circle:universal-share-result", {
              detail: { target, source, result: r },
            }),
          );
          if (r.ok) {
            toast.success(`Shared to ${target}`, {
              description: r.id ? `ID: ${r.id.slice(0, 12)}…` : undefined,
            });
          } else {
            toast.error(`Share to ${target} failed`, { description: r.error });
          }
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        setError(msg);
        toast.error(`Share to ${target} failed`, { description: msg });
      } finally {
        setSending(false);
      }
    },
    [source],
  );

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-lg" ariaLabel="Universal share sheet">
      <div className="glass backdrop-blur-xl border border-white/10 rounded-t-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-emerald-400" aria-hidden />
            </div>
            <div>
              <h2 id="share-sheet-title" className="text-sm font-semibold text-white">
                Share
              </h2>
              <p className="text-[11px] text-white/50">مشاركة عبر الوحدات</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white"
            onClick={onClose}
            aria-label="Close share sheet"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Source preview */}
        {source ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[10px] uppercase">
                from {source.module}
              </Badge>
              {source.author && (
                <span className="text-[10px] text-white/40">@{source.author}</span>
              )}
            </div>
            <p className="text-sm text-white/80 line-clamp-3 break-words">
              {source.body || source.caption || "(no text)"}
            </p>
            {source.media && source.media.length > 0 && (
              <p className="text-[10px] text-white/40 mt-1.5">
                {source.media.length} attachment{source.media.length > 1 ? "s" : ""} ({source.mediaKind ?? "media"})
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-center">
            <Sparkles className="w-5 h-5 text-white/30 mx-auto mb-2" aria-hidden />
            <p className="text-xs text-white/50">
              Open any message, post, photo, or itinerary and tap the share icon to send it across Cirkle.
            </p>
          </div>
        )}

        {/* Targets */}
        <div
          role="listbox"
          aria-label="Share targets"
          className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        >
          {TARGETS.map((t) => {
            const isSelected = selected === t.id;
            const isBusy = sending && isSelected;
            const isDone = result?.ok && isSelected;
            const isFailed = (error || (result && !result.ok)) && isSelected;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => !sending && send(t.id)}
                disabled={!source || sending}
                className={cn(
                  "relative group flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left",
                  "transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                  t.tint,
                  isSelected && "ring-2 ring-emerald-400/60",
                  "hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                )}
                aria-label={`Share to ${t.label}${isBusy ? " (sending)" : isDone ? " (done)" : ""}`}
                aria-selected={isSelected}
                role="option"
              >
                <span className="text-xl leading-none" aria-hidden>{t.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{t.label}</p>
                  <p className="text-[10px] text-white/50 line-clamp-1">{t.description}</p>
                </div>
                {isBusy && (
                  <Loader2 className="absolute top-2 right-2 w-3 h-3 animate-spin text-white/80" aria-hidden />
                )}
                {isDone && (
                  <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-emerald-400" aria-hidden />
                )}
                {isFailed && (
                  <AlertCircle className="absolute top-2 right-2 w-3.5 h-3.5 text-rose-400" aria-hidden />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Result / error panel */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.target + (result.ok ? "-ok" : "-err")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                "rounded-xl border p-3",
                result.ok
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-rose-500/30 bg-rose-500/10",
              )}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                {result.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white">
                    {result.ok ? "Shared successfully" : "Share failed"}
                  </p>
                  <p className="text-[11px] text-white/60 mt-0.5 break-words">
                    {result.ok
                      ? `Target: ${result.target}${result.id ? ` · ID ${String(result.id).slice(0, 12)}` : ""} · ${result.elapsedMs}ms`
                      : result.error ?? "Unknown error"}
                  </p>
                  {result.ok && result.payload?.body && (
                    <p className="text-[11px] text-white/40 mt-1.5 line-clamp-2 italic">
                      "{String(result.payload.body).slice(0, 120)}"
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-white/40">
            <ArrowRight className="w-3 h-3 inline mr-1" aria-hidden />
            Private terms are stripped before publishing
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-white/70 hover:text-white"
            onClick={onClose}
            aria-label="Close share sheet"
          >
            Done
          </Button>
        </div>
      </div>
    </OverlayShell>
  );
}

export default UniversalShareSheet;
