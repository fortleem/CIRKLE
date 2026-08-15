"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Bell, BellOff, Heart, MessageCircle, UserPlus, Calendar, Newspaper,
  Settings, CheckCheck, Trash2, Clock, AlertTriangle, Sparkles, Users,
  Volume2, VolumeX, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Notification model ────────────────────────────────────────────────────

type NotificationType = "social" | "messages" | "news" | "system";
type Priority = "urgent" | "important" | "normal";

interface Notification {
  id: string;
  type: NotificationType;
  priority: Priority;
  /** Grouped display title (e.g. "3 people liked your post"). */
  title: string;
  /** Optional preview / sub-text. */
  preview?: string;
  /** Timestamp (relative). */
  time: string;
  /** Count of underlying events (for grouping badge). */
  count?: number;
  /** Read state. */
  read: boolean;
  /** Snoozed-until timestamp (ms). 0 = not snoozed. */
  snoozedUntil?: number;
  /** Stable grouping key used by "snooze similar" — same key = similar notif. */
  groupKey: string;
  /** Icon to render. */
  icon: LucideIcon;
}

const INITIAL: Notification[] = [
  {
    id: "n1", type: "social", priority: "urgent",
    title: "3 people liked your post", preview: "“Spent the morning at the new specialty coffee spot…”",
    time: "2m", count: 3, read: false, groupKey: "like:post:abc123", icon: Heart,
  },
  {
    id: "n2", type: "messages", priority: "urgent",
    title: "2 new messages from Wasl", preview: "Layla: are we still on for tomorrow? · Hassan: sent a photo",
    time: "5m", count: 2, read: false, groupKey: "message:wasl:dm", icon: MessageCircle,
  },
  {
    id: "n3", type: "social", priority: "important",
    title: "@sara_ahmed started following you", preview: "Follow back to grow your network",
    time: "12m", count: 1, read: false, groupKey: "follow:new", icon: UserPlus,
  },
  {
    id: "n4", type: "news", priority: "important",
    title: "Breaking news in your city", preview: "Cairo: Metro Line 4 extension opens next month",
    time: "30m", count: 1, read: false, groupKey: "news:breaking:cairo", icon: Newspaper,
  },
  {
    id: "n5", type: "social", priority: "normal",
    title: "@omar_k replied to your comment", preview: "Totally agree — the new location is great",
    time: "1h", count: 1, read: true, groupKey: "comment:reply", icon: MessageCircle,
  },
  {
    id: "n6", type: "system", priority: "important",
    title: "1 Circle event tomorrow", preview: "Riyadh Designers Meetup · 7:00 PM",
    time: "2h", count: 1, read: false, groupKey: "calendar:circle:event", icon: Calendar,
  },
  {
    id: "n7", type: "social", priority: "normal",
    title: "5 people liked your photo", preview: "“Sunset over the Nile”",
    time: "3h", count: 5, read: true, groupKey: "like:photo:xyz789", icon: Heart,
  },
  {
    id: "n8", type: "messages", priority: "normal",
    title: "Family chat has 8 new messages", preview: "Mom: don't forget dinner Friday",
    time: "5h", count: 8, read: true, groupKey: "message:wasl:group:family", icon: Users,
  },
  {
    id: "n9", type: "system", priority: "normal",
    title: "Weekly privacy report ready", preview: "No new data requests this week",
    time: "Yesterday", count: 1, read: true, groupKey: "system:privacy:report", icon: Sparkles,
  },
];

// ── Filter tabs ────────────────────────────────────────────────────────────

type Filter = "all" | NotificationType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "messages", label: "Messages" },
  { id: "news", label: "News" },
  { id: "system", label: "System" },
];

// ── Priority helpers ───────────────────────────────────────────────────────

const PRIORITY_META: Record<Priority, { label: string; tint: string; dot: string; bar: string }> = {
  urgent: {
    label: "Urgent",
    tint: "from-destructive/15 to-transparent border-destructive/30",
    dot: "bg-destructive",
    bar: "bg-destructive",
  },
  important: {
    label: "Important",
    tint: "from-amber-500/15 to-transparent border-amber-500/30",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  normal: {
    label: "Normal",
    tint: "from-muted to-transparent border-border/40",
    dot: "bg-muted-foreground/40",
    bar: "bg-muted-foreground/40",
  },
};

// ── Component ─────────────────────────────────────────────────────────────

export function SmartNotifications({ open, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [showPrefs, setShowPrefs] = useState(false);

  // ── Notification preferences (mock, localStorage-backed) ──
  const [prefs, setPrefs] = useState<Record<NotificationType, boolean>>({
    social: true,
    messages: true,
    news: true,
    system: true,
  });

  useEffect(() => {
    if (!open) return;
    // Simulate latency so the loading state is visible.
    const t = setTimeout(() => {
      setNotifications(INITIAL);
      setLoaded(true);
    }, 500);
    return () => clearTimeout(t);
  }, [open]);

  // ── Derived: filtered list (respect snooze + prefs) ────────────────
  const now = Date.now();
  const visible = useMemo(() => {
    return notifications
      .filter((n) => prefs[n.type])
      .filter((n) => !n.snoozedUntil || n.snoozedUntil < now)
      .filter((n) => filter === "all" || n.type === filter);
  }, [notifications, prefs, filter, now]);

  const unreadCount = visible.filter((n) => !n.read).length;
  const urgentCount = visible.filter((n) => !n.read && n.priority === "urgent").length;

  // ── Actions ─────────────────────────────────────────────────────────
  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const clearAll = () => {
    setNotifications([]);
    toast.success("Notifications cleared");
  };

  const snoozeSimilar = (notif: Notification) => {
    const until = Date.now() + 60 * 60 * 1000; // 1 hour
    setNotifications((prev) =>
      prev.map((n) =>
        n.groupKey === notif.groupKey ? { ...n, snoozedUntil: until } : n,
      ),
    );
    toast.success("Snoozed similar notifications for 1 hour", {
      description: `"${notif.title}" and similar will be hidden until ${new Date(until).toLocaleTimeString()}`,
    });
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const togglePref = (type: NotificationType) => {
    setPrefs((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Smart Notifications">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-secondary" />
              {urgentCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
                  {urgentCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread · {urgentCount} urgent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrefs((s) => !s)}
              aria-label="Notification preferences"
              aria-pressed={showPrefs}
            >
              <Settings className={cn("w-3.5 h-3.5 mr-1.5", showPrefs && "text-secondary")} /> Prefs
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter tabs + batch actions */}
        <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-2 border-b border-border/40">
          <div className="flex gap-1 overflow-x-auto">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              const count = f.id === "all"
                ? visible.length
                : notifications.filter((n) => n.type === f.id && prefs[n.type] && (!n.snoozedUntil || n.snoozedUntil < now)).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
                  )}
                  aria-pressed={active}
                >
                  {f.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark all
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={notifications.length === 0}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
            </Button>
          </div>
        </div>

        {/* Mobile batch actions */}
        <div className="sm:hidden flex items-center gap-2 px-5 py-2 border-b border-border/40">
          <Button variant="outline" size="sm" className="flex-1" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark all read
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={clearAll} disabled={notifications.length === 0}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
          </Button>
        </div>

        {/* Preferences panel (collapsible) */}
        <AnimatePresence>
          {showPrefs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border/40 bg-muted/20"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Volume2 className="w-3.5 h-3.5" /> Notification channels
                </div>
                {(Object.keys(prefs) as NotificationType[]).map((type) => (
                  <div key={type} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground capitalize">{type}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {type === "social" && "Likes, comments, follows"}
                        {type === "messages" && "Direct + group messages"}
                        {type === "news" && "Breaking news + city alerts"}
                        {type === "system" && "Circle events, privacy reports"}
                      </div>
                    </div>
                    <Switch checked={prefs[type]} onCheckedChange={() => togglePref(type)} aria-label={`Toggle ${type} notifications`} />
                  </div>
                ))}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("circle:settings"))}
                  className="text-xs text-secondary hover:underline flex items-center gap-1 mt-1"
                >
                  Open full settings <Settings className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!loaded ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BellOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">All caught up — no notifications here.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visible.map((n) => {
                const Icon = n.icon;
                const meta = PRIORITY_META[n.priority];
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    className={cn(
                      "relative rounded-xl border bg-gradient-to-r p-3 pl-4 transition",
                      meta.tint,
                      !n.read && "ring-1 ring-secondary/20",
                    )}
                  >
                    {/* Priority bar */}
                    <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-full", meta.bar)} />

                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-white/10 dark:bg-black/20 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className={cn("text-sm", n.read ? "text-muted-foreground" : "text-foreground font-medium")}>
                                {n.title}
                              </p>
                              {!n.read && (
                                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-secondary" />
                              )}
                              {n.priority === "urgent" && (
                                <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">
                                  <AlertTriangle className="w-2.5 h-2.5" /> URGENT
                                </span>
                              )}
                              {n.priority === "important" && (
                                <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                                  IMPORTANT
                                </span>
                              )}
                            </div>
                            {n.preview && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.preview}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{n.time} ago</span>
                              {n.count && n.count > 1 && (
                                <>
                                  <span>·</span>
                                  <span>{n.count} events grouped</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => dismiss(n.id)}
                            className="shrink-0 w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                            aria-label="Dismiss notification"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Action row */}
                        <div className="flex items-center gap-2 mt-2">
                          {!n.read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="text-[11px] text-secondary hover:underline flex items-center gap-1"
                            >
                              <CheckCheck className="w-3 h-3" /> Mark read
                            </button>
                          )}
                          <button
                            onClick={() => snoozeSimilar(n)}
                            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <BellOff className="w-3 h-3" /> Snooze similar · 1h
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {visible.length > 0 && (
          <div className="border-t border-border/60 p-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              AI grouped · similar events collapsed into one notification
            </span>
            <button
              onClick={clearAll}
              className="hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </OverlayShell>
  );
}
