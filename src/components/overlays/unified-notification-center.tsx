// @ts-nocheck
"use client";

/**
 * Unified Notification Center Overlay
 * ============================================================================
 * A fullscreen glass-aesthetic notification surface that merges every
 * CIRKLE notification source into a single, priority-grouped feed.
 *
 * Behaviour:
 *   • Priority-grouped (Urgent, Important, Normal, Low)
 *   • Each notification: type icon, title, body, timestamp, action button
 *   • "Mark all as read" button
 *   • Filter by type (chips at the top)
 *   • Per-item mark-as-read
 *   • Loading / empty / error states
 *   • Aria-complete (role=dialog, aria-modal, labelled inputs, sr-only text)
 *
 * Events dispatched:
 *   • circle:unified-notifications  (announces the overlay is open)
 *   • circle:navigate               (when an action button is clicked —
 *                                    payload includes target tab + id)
 *
 * All fetches use relative paths with an 8-second timeout.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, Bell, BellRing, Check, CheckCheck, Loader2, AlertTriangle,
  MessageSquare, AtSign, Phone, UserPlus, MessageCircle, Calendar,
  Briefcase, ShieldAlert, Plane, CreditCard, Lock, EyeOff, BadgeCheck,
  Settings, Sparkles, FileWarning, Filter, ChevronRight, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the API response shape
// ─────────────────────────────────────────────────────────────────────────────

type NotificationType =
  | "message" | "mention" | "call" | "follow" | "reply"
  | "event" | "job" | "official_alert" | "travel" | "payment"
  | "security" | "privacy" | "verification" | "system" | "ai_task" | "referral";

type Priority = "urgent" | "important" | "normal" | "low";

interface UnifiedNotification {
  id: string;
  type: NotificationType;
  module: string;
  title: string;
  body: string;
  priority: Priority;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000;

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  message: MessageSquare,
  mention: AtSign,
  call: Phone,
  follow: UserPlus,
  reply: MessageCircle,
  event: Calendar,
  job: Briefcase,
  official_alert: ShieldAlert,
  travel: Plane,
  payment: CreditCard,
  security: Lock,
  privacy: EyeOff,
  verification: BadgeCheck,
  system: Settings,
  ai_task: Sparkles,
  referral: FileWarning,
};

const PRIORITY_META: Record<
  Priority,
  { label: string; tint: string; icon: LucideIcon; ring: string }
> = {
  urgent: {
    label: "Urgent",
    tint: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    icon: AlertTriangle,
    ring: "ring-rose-500/40",
  },
  important: {
    label: "Important",
    tint: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: BellRing,
    ring: "ring-amber-500/40",
  },
  normal: {
    label: "Normal",
    tint: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: Bell,
    ring: "ring-emerald-500/40",
  },
  low: {
    label: "Low",
    tint: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30",
    icon: Bell,
    ring: "ring-zinc-500/40",
  },
};

const PRIORITY_ORDER: Priority[] = ["urgent", "important", "normal", "low"];

const FILTER_CHIPS: Array<{ id: NotificationType | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "message", label: "Messages" },
  { id: "mention", label: "Mentions" },
  { id: "call", label: "Calls" },
  { id: "follow", label: "Follows" },
  { id: "payment", label: "Payments" },
  { id: "referral", label: "Referrals" },
  { id: "ai_task", label: "AI Tasks" },
  { id: "security", label: "Security" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 0) return "in the future";
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    const mo = Math.floor(day / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.floor(mo / 12)}y ago`;
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function UnifiedNotificationCenter({ open, onClose }: Props) {
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [query, setQuery] = useState("");

  // Announce the overlay being open.
  useEffect(() => {
    if (open) {
      window.dispatchEvent(
        new CustomEvent("circle:unified-notifications", {
          detail: { open: true },
        }),
      );
    }
  }, [open]);

  // ── Data loader ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout("/api/notifications/unified?limit=200");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = (await res.json()) as {
        notifications: UnifiedNotification[];
        count: number;
        unreadCount: number;
      };
      setNotifications(json.notifications || []);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load notifications");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // ── Filter + group notifications ─────────────────────────────────────
  const filtered = useMemo(() => {
    let list = notifications;
    if (filter !== "all") {
      list = list.filter((n) => n.type === filter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.module.toLowerCase().includes(q),
      );
    }
    return list;
  }, [notifications, filter, query]);

  const groups = useMemo(() => {
    const g: Record<Priority, UnifiedNotification[]> = {
      urgent: [],
      important: [],
      normal: [],
      low: [],
    };
    for (const n of filtered) {
      if (!g[n.priority]) g[n.priority] = [];
      g[n.priority].push(n);
    }
    return g;
  }, [filtered]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  // ── Mark single as read ──────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    setMarkingId(id);
    // Optimistic UI update.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    try {
      const res = await fetchWithTimeout("/api/notifications/unified");
      // We have to use POST for marking read.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const postRes = await fetch("/api/notifications/unified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_read", id }),
          signal: controller.signal,
        });
        if (!postRes.ok) throw new Error(`Mark read failed (${postRes.status})`);
        toast.success("Marked as read");
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      // Roll back optimistic update.
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n)),
      );
      if ((err as Error).name === "AbortError") {
        toast.error("Mark read timed out", { description: "Please try again." });
      } else {
        toast.error("Failed to mark as read", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    } finally {
      setMarkingId(null);
    }
  }, []);

  // ── Mark all as read ─────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    // Optimistic UI update.
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const postRes = await fetch("/api/notifications/unified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_all_read" }),
          signal: controller.signal,
        });
        if (!postRes.ok) throw new Error(`Mark all read failed (${postRes.status})`);
        toast.success(`Marked ${unreadCount} as read`);
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      // Roll back — reload fresh data.
      await load();
      if ((err as Error).name === "AbortError") {
        toast.error("Mark all read timed out", { description: "Please try again." });
      } else {
        toast.error("Failed to mark all as read", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    } finally {
      setMarkingAll(false);
    }
  }, [unreadCount, load]);

  // ── Click action ─────────────────────────────────────────────────────
  const onAction = useCallback(
    (n: UnifiedNotification) => {
      // Mark as read first.
      if (!n.read) markRead(n.id);
      // Dispatch a navigate event so the shell can switch tabs.
      const tab = (() => {
        switch (n.module) {
          case "wasl":
            return "wasl";
          case "midan":
            return "midan";
          case "lamahat":
            return "lamahat";
          case "mashahd":
            return "mashahd";
          case "mail":
            return "mail";
          case "circles":
            return "circles";
          case "finance":
            return "finance";
          case "ai":
            return "ai";
          case "news":
            return "news";
          default:
            return "home";
        }
      })();
      window.dispatchEvent(
        new CustomEvent("circle:navigate", {
          detail: { tab, notificationId: n.id, module: n.module },
        }),
      );
      onClose();
    },
    [markRead, onClose],
  );

  // ───────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Unified notification center"
      titleId="unified-notification-center-title"
    >
      <div className="flex h-full w-full flex-col bg-background text-foreground">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="flex items-start justify-between gap-4 border-b border-border/60 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30"
              aria-hidden="true"
            >
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="unified-notification-center-title"
                className="text-xl font-semibold tracking-tight sm:text-2xl"
              >
                Notifications
              </h2>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading…"
                  : `${filtered.length} notification${filtered.length === 1 ? "" : "s"}${
                      unreadCount > 0 ? ` · ${unreadCount} unread` : ""
                    }`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              disabled={markingAll || unreadCount === 0}
              aria-label="Mark all notifications as read"
            >
              {markingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">All read</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close notification center"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </header>

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Filter
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            {FILTER_CHIPS.map((chip) => {
              const active = filter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id as any)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    "border border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                    active &&
                      "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications…"
              aria-label="Search notifications by title, body, or module"
              className="w-full bg-background/60"
            />
          </div>
        </div>

        {/* ── Body — priority-grouped list ─────────────────────────────── */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-600"
              >
                <p className="font-medium">Couldn&apos;t load notifications</p>
                <p className="mt-1 text-xs text-rose-500/80">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={load}
                  className="mt-3"
                >
                  Retry
                </Button>
              </div>
            )}

            {loading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" aria-hidden="true" />
                <p className="text-sm">Loading notifications…</p>
              </div>
            )}

            {!loading && filtered.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Bell className="h-12 w-12 opacity-30" aria-hidden="true" />
                <p className="text-sm font-medium">You&apos;re all caught up</p>
                <p className="text-xs text-muted-foreground/70">
                  No notifications match the current filter.
                </p>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="space-y-8">
                {PRIORITY_ORDER.map((priority) => {
                  const list = groups[priority] || [];
                  if (list.length === 0) return null;
                  const meta = PRIORITY_META[priority];
                  const Icon = meta.icon;
                  return (
                    <section
                      key={priority}
                      aria-labelledby={`group-${priority}-title`}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <Icon
                          className={cn("h-4 w-4", meta.tint.split(" ")[1])}
                          aria-hidden="true"
                        />
                        <h3
                          id={`group-${priority}-title`}
                          className="text-sm font-semibold tracking-wide uppercase text-muted-foreground"
                        >
                          {meta.label}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="ml-1 text-[10px] font-medium"
                        >
                          {list.length}
                        </Badge>
                      </div>
                      <ul className="space-y-2">
                        {list.map((n) => (
                          <NotificationItem
                            key={n.id}
                            notification={n}
                            onAction={() => onAction(n)}
                            onMarkRead={() => markRead(n.id)}
                            marking={markingId === n.id}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="border-t border-border/60 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Unified notifications merge Wasl, Midan, Circles, AI, and Shield
            sources — sorted by priority then recency.
          </p>
        </footer>
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationItem
// ─────────────────────────────────────────────────────────────────────────────

interface ItemProps {
  notification: UnifiedNotification;
  onAction: () => void;
  onMarkRead: () => void;
  marking: boolean;
}

function NotificationItem({ notification: n, onAction, onMarkRead, marking }: ItemProps) {
  const TypeIcon = TYPE_ICON[n.type] || Bell;
  const meta = PRIORITY_META[n.priority];

  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border p-4 transition-colors",
        "border-border/60 bg-background hover:border-emerald-500/40 hover:bg-emerald-500/[0.03]",
        "focus-within:ring-2 focus-within:ring-emerald-500/30",
        !n.read && "bg-emerald-500/[0.04]",
      )}
    >
      {/* Unread dot */}
      <span
        className={cn(
          "absolute right-3 top-3 h-2 w-2 rounded-full",
          n.read ? "bg-transparent" : "bg-emerald-500",
        )}
        aria-hidden="true"
      />

      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
          meta.tint,
        )}
        aria-hidden="true"
      >
        <TypeIcon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold leading-tight">
            {n.title}
          </p>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {n.body}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("border-border/60 text-[10px] uppercase", meta.tint.split(" ")[1])}
          >
            {n.module}
          </Badge>
          <span className="text-[10px] text-muted-foreground/80">
            {timeAgo(n.timestamp)}
          </span>
          {!n.read && (
            <span className="text-[10px] font-medium text-emerald-600">
              · unread
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {n.actionLabel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAction}
            aria-label={`${n.actionLabel} — opens ${n.module} module`}
            className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
          >
            {n.actionLabel}
            <ChevronRight className="ml-1 h-3 w-3" aria-hidden="true" />
          </Button>
        )}
        {!n.read && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMarkRead}
            disabled={marking}
            aria-label="Mark this notification as read"
            className="text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
          >
            {marking ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3 w-3" aria-hidden="true" />
            )}
            <span className="sr-only">Mark as read</span>
          </Button>
        )}
      </div>
    </li>
  );
}

export default UnifiedNotificationCenter;
