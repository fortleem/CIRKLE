// @ts-nocheck
"use client";

/**
 * ScheduledMessages overlay — B6.
 *
 * A bottom sheet showing:
 *   (1) a date+time picker to schedule a new message,
 *   (2) AI-suggested optimal send times (one-tap to apply),
 *   (3) the list of currently-scheduled messages (pending first),
 *   (4) per-row cancel button for pending messages.
 *
 * Fetches `GET /api/messages/scheduled?conversationId=…` on open which
 * returns `{ scheduled: [...], optimalTimes: [...] }`.
 * Schedules via `POST /api/messages/scheduled`.
 * Cancels via `DELETE /api/messages/scheduled?id=…`.
 *
 * After every successful schedule / cancel, dispatches
 * `circle:scheduled-messages` with `{ detail: { conversationId } }`.
 *
 * Props:
 *   open            boolean
 *   onClose         () => void
 *   conversationId  string?
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, X, CalendarClock, Sparkles, Send, Trash2, AlertCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";

interface ScheduledMsg {
  id: string;
  conversationId: string;
  body: string;
  scheduledFor: string;
  status: string;
  createdAt: string;
}

interface OptimalTime {
  iso: string;
  label: string;
  reason: string;
  score: number;
}

interface Payload {
  scheduled: ScheduledMsg[];
  optimalTimes: OptimalTime[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
}

const FETCH_TIMEOUT_MS = 8000;

function dispatchChange(conversationId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("circle:scheduled-messages", {
      detail: { conversationId },
    }),
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

function toLocalInputValue(iso: string): string {
  // For <input type="datetime-local"> we need YYYY-MM-DDTHH:mm in local tz.
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function defaultWhen(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
  return toLocalInputValue(d.toISOString());
}

function minInputValue(): string {
  return toLocalInputValue(new Date(Date.now() + 60 * 1000).toISOString());
}

export function ScheduledMessages({ open, onClose, conversationId }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [when, setWhen] = useState<string>(defaultWhen());
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchWithTimeout(
        `/api/messages/scheduled?conversationId=${encodeURIComponent(conversationId)}`,
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Failed to load");
      }
      const json = (await r.json()) as Payload;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!open || !conversationId) {
      setData(null);
      setError(null);
      return;
    }
    load();
  }, [open, conversationId, load]);

  // Reset composer on close.
  useEffect(() => {
    if (!open) {
      setBody("");
      setWhen(defaultWhen());
    }
  }, [open]);

  const scheduled = useMemo(
    () =>
      (data?.scheduled ?? []).slice().sort((a, b) => {
        // Pending first, then by scheduledFor asc.
        const pa = a.status === "pending" ? 0 : 1;
        const pb = b.status === "pending" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      }),
    [data?.scheduled],
  );

  const optimalTimes = data?.optimalTimes ?? [];

  const schedule = async (overrideIso?: string) => {
    if (!conversationId) return;
    const bodyText = body.trim();
    if (!bodyText) {
      toast.error("Write a message first");
      return;
    }
    const iso = overrideIso ?? (when ? new Date(when).toISOString() : "");
    if (!iso || Number.isNaN(new Date(iso).getTime())) {
      toast.error("Pick a valid date & time");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetchWithTimeout(`/api/messages/scheduled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          body: bodyText,
          scheduledFor: iso,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Failed to schedule");
      }
      toast.success("Scheduled", { description: formatWhen(iso) });
      setBody("");
      setWhen(defaultWhen());
      dispatchChange(conversationId);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id: string) => {
    if (!conversationId || cancellingId) return;
    setCancellingId(id);
    try {
      const r = await fetchWithTimeout(
        `/api/messages/scheduled?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Failed to cancel");
      }
      toast.success("Cancelled");
      dispatchChange(conversationId);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="sheet"
      maxWidth="sm:max-w-lg"
      ariaLabel="Scheduled messages"
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base leading-tight">Scheduled messages</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              Write now, send later.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
        {!conversationId ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center text-sm text-muted-foreground">
            Open a conversation first to schedule messages.
          </div>
        ) : (
          <>
            {/* Composer */}
            <section
              aria-label="Schedule a new message"
              className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 space-y-3"
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the message to send later…"
                rows={3}
                maxLength={4096}
                aria-label="Message body"
                className="w-full bg-white/5 rounded-lg p-2.5 text-sm outline-none resize-none border border-white/10 focus:border-emerald-500/50 transition placeholder:text-muted-foreground/60"
              />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="flex-1 block">
                  <span className="sr-only">Send at</span>
                  <input
                    type="datetime-local"
                    value={when}
                    min={minInputValue()}
                    onChange={(e) => setWhen(e.target.value)}
                    aria-label="Date and time to send"
                    className="w-full bg-white/5 rounded-lg px-2.5 py-2 text-sm outline-none border border-white/10 focus:border-emerald-500/50 transition"
                  />
                </label>
                <button
                  onClick={() => schedule()}
                  disabled={submitting || !body.trim()}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Schedule
                </button>
              </div>
            </section>

            {/* AI suggestions */}
            <section aria-label="AI-suggested optimal send times">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-500" /> Suggested times
              </div>
              {loading && !optimalTimes.length ? (
                <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading suggestions…
                </div>
              ) : optimalTimes.length === 0 ? (
                <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 text-[11px] text-muted-foreground">
                  No suggestions for the next 7 days.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {optimalTimes.map((t) => (
                    <button
                      key={t.iso}
                      onClick={() => schedule(t.iso)}
                      disabled={submitting || !body.trim()}
                      title={t.reason}
                      aria-label={`Schedule for ${t.label} — ${t.reason}`}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] flex items-center gap-1 border transition",
                        "bg-white/5 backdrop-blur-xl border-white/10",
                        "hover:bg-emerald-500/15 hover:border-emerald-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                        (submitting || !body.trim()) && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <Clock className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Scheduled list */}
            <section aria-label="Scheduled messages list">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <CalendarClock className="w-3 h-3 text-emerald-500" /> Your queue
              </div>
              {error ? (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 p-3 flex items-start gap-2 text-[11px] text-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : loading && scheduled.length === 0 ? (
                <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading queue…
                </div>
              ) : scheduled.length === 0 ? (
                <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 text-[11px] text-muted-foreground text-center">
                  No scheduled messages yet.
                </div>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {scheduled.map((m) => {
                    const isPending = m.status === "pending";
                    const isPast = isPending && new Date(m.scheduledFor).getTime() <= Date.now();
                    return (
                      <li
                        key={m.id}
                        className={cn(
                          "rounded-xl p-3 border flex flex-col gap-1.5",
                          "bg-white/5 backdrop-blur-xl border-white/10",
                          isPast && "border-rose-500/40",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                              m.status === "pending"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : m.status === "sent"
                                  ? "bg-white/10 text-muted-foreground"
                                  : "bg-rose-500/15 text-rose-300",
                            )}
                          >
                            {m.status}
                          </span>
                          <div className="flex items-center gap-1">
                            {isPending && (
                              <button
                                onClick={() => cancel(m.id)}
                                disabled={!!cancellingId}
                                aria-label={`Cancel scheduled message for ${formatWhen(m.scheduledFor)}`}
                                className="w-7 h-7 rounded-full hover:bg-rose-500/20 text-rose-300 flex items-center justify-center transition disabled:opacity-50"
                              >
                                {cancellingId === m.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
                          {m.body}
                        </p>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatWhen(m.scheduledFor)}
                          {isPast && <span className="text-rose-300 ml-1">· overdue</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </OverlayShell>
  );
}
