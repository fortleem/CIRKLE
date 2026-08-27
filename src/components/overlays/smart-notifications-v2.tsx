// @ts-nocheck
/**
 * Smart Notifications v2 overlay (Tier E, E4).
 *
 * Notification inbox grouped by AI priority (Urgent / Important / Normal /
 * Low). Each band is collapsible; tapping a notification dispatches
 * `circle:smart-notifications-v2-open` with the notification id so the host
 * can navigate. Fetches `/api/notifications/ranked` (8s timeout).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Bell, Loader2, RefreshCw, AlertCircle, ChevronDown, ChevronRight,
  Flame, Bookmark, Inbox, Coffee,
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

type Priority = "urgent" | "important" | "normal" | "low";

interface RankedNotification {
  id: string;
  source: string;
  type: string;
  title: string;
  preview?: string;
  at: string;
  count?: number;
  priority: Priority;
  score: number;
  reasons: string[];
  immediate: boolean;
  sentiment?: "positive" | "neutral" | "negative" | null;
}

interface Groups {
  urgent: RankedNotification[];
  important: RankedNotification[];
  normal: RankedNotification[];
  low: RankedNotification[];
}

interface RankedResponse {
  groups: Groups;
  count: number;
  generatedAt: string;
  fallback?: boolean;
}

const BAND_META: Record<Priority, {
  label: string;
  emoji: string;
  icon: typeof Flame;
  tint: string;
  border: string;
  defaultOpen: boolean;
}> = {
  urgent: { label: "Urgent", emoji: "🔴", icon: Flame, tint: "bg-rose-500/15 text-rose-200 border-rose-500/30", border: "border-rose-500/30", defaultOpen: true },
  important: { label: "Important", emoji: "🟠", icon: Bookmark, tint: "bg-amber-500/15 text-amber-200 border-amber-500/30", border: "border-amber-500/30", defaultOpen: true },
  normal: { label: "Normal", emoji: "🔵", icon: Inbox, tint: "bg-sky-500/15 text-sky-200 border-sky-500/30", border: "border-sky-500/30", defaultOpen: false },
  low: { label: "Low", emoji: "⚪", icon: Coffee, tint: "bg-white/10 text-white/60 border-white/15", border: "border-white/15", defaultOpen: false },
};

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  } catch {
    return "";
  }
}

export function SmartNotificationsV2({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RankedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<Priority, boolean>>({
    urgent: false,
    important: false,
    normal: true,
    low: true,
  });
  const fetchSeq = useRef<number>(0);

  const fetchRanked = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch("/api/notifications/ranked?limit=30", {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errBody.error ?? `HTTP ${res.status}`);
        }
        const d = (await res.json()) as RankedResponse;
        if (seq !== fetchSeq.current) return;
        setData(d);
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      const msg = err instanceof Error ? err.message : "Failed to load notifications";
      setError(msg);
      toast.error("Notifications failed", { description: msg });
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setError(null);
    setCollapsed({ urgent: false, important: false, normal: true, low: true });
    fetchRanked();
  }, [open, fetchRanked]);

  const handleNotifClick = (n: RankedNotification) => {
    window.dispatchEvent(
      new CustomEvent("circle:smart-notifications-v2-open", {
        detail: { id: n.id, source: n.source, type: n.type },
      }),
    );
    toast(`Opening ${n.source}…`);
    onClose();
  };

  const totalUnread = data
    ? data.groups.urgent.length + data.groups.important.length
    : 0;

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-lg" ariaLabel="Smart notifications inbox">
      <div className="glass backdrop-blur-xl border border-white/10 rounded-t-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Bell className="w-4 h-4 text-emerald-400" aria-hidden />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <div>
              <h2 id="smart-notif-title" className="text-sm font-semibold text-white">
                Notifications
              </h2>
              <p className="text-[11px] text-white/50">
                {data ? `${data.count} total · AI ranked` : "الإشعارات الذكية"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white"
              onClick={fetchRanked}
              disabled={loading}
              aria-label="Refresh notifications"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" aria-hidden />
            <p className="text-xs text-white/50" aria-live="polite">
              Ranking your notifications…
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
                onClick={fetchRanked}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Bands */}
        {data && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 -mr-1 custom-scroll">
            {(Object.keys(BAND_META) as Priority[]).map((band) => {
              const meta = BAND_META[band];
              const items = data.groups[band];
              const isCollapsed = collapsed[band];
              if (items.length === 0 && (band === "low" || band === "normal")) return null;
              const Icon = meta.icon;
              return (
                <section
                  key={band}
                  className={cn("rounded-xl border overflow-hidden", meta.border, "bg-white/[0.03]")}
                  aria-labelledby={`band-${band}-title`}
                >
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [band]: !c[band] }))}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                    aria-expanded={!isCollapsed}
                    aria-controls={`band-${band}-list`}
                    aria-label={`${meta.label} — ${items.length} notifications`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none" aria-hidden>{meta.emoji}</span>
                      <span id={`band-${band}-title`} className="text-xs font-semibold text-white">
                        {meta.label}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", meta.tint)}>
                        {items.length}
                      </Badge>
                    </div>
                    {isCollapsed
                      ? <ChevronRight className="w-3.5 h-3.5 text-white/40" aria-hidden />
                      : <ChevronDown className="w-3.5 h-3.5 text-white/40" aria-hidden />}
                  </button>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.ul
                        id={`band-${band}-list`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="divide-y divide-white/5 overflow-hidden"
                      >
                        {items.length === 0 ? (
                          <li className="px-3 py-3 text-[11px] text-white/40 italic">
                            No {meta.label.toLowerCase()} notifications.
                          </li>
                        ) : (
                          items.map((n) => (
                            <li key={n.id}>
                              <button
                                type="button"
                                onClick={() => handleNotifClick(n)}
                                className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] focus:outline-none focus-visible:bg-white/[0.04] transition-colors"
                                aria-label={`${n.title}${n.preview ? ` — ${n.preview}` : ""}`}
                              >
                                <div className="flex items-start gap-2">
                                  <Icon className="w-3.5 h-3.5 text-white/40 mt-0.5 shrink-0" aria-hidden />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-white line-clamp-1">
                                      {n.title}
                                    </p>
                                    {n.preview && (
                                      <p className="text-[11px] text-white/60 mt-0.5 line-clamp-2 break-words">
                                        {n.preview}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 border-white/15 text-white/50">
                                        {n.source}
                                      </Badge>
                                      {n.sentiment && n.sentiment !== "neutral" && (
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-[9px] py-0 px-1",
                                            n.sentiment === "positive"
                                              ? "border-emerald-500/40 text-emerald-300"
                                              : "border-rose-500/40 text-rose-300",
                                          )}
                                        >
                                          {n.sentiment}
                                        </Badge>
                                      )}
                                      {n.immediate && (
                                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-rose-500/40 text-rose-300">
                                          immediate
                                        </Badge>
                                      )}
                                      <span className="text-[10px] text-white/40 ml-auto">
                                        {timeAgo(n.at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))
                        )}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </section>
              );
            })}
            {data.count === 0 && (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden />
                <p className="text-sm text-white/50">You're all caught up ✨</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {data && (
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span>
              Ranked at {new Date(data.generatedAt).toLocaleTimeString()}
              {data.fallback && " · cached"}
            </span>
            <span>score 0–100 · sentiment-aware</span>
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

export default SmartNotificationsV2;
