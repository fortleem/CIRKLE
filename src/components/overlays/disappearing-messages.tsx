// @ts-nocheck
"use client";

/**
 * DisappearingMessages overlay — B5.
 *
 * A bottom sheet with the 5 timer options (off / 24h / 7d / 90d / view-once).
 * On open, fetches the conversation's current setting; tapping a tile POSTs
 * the new setting to the API and updates the active highlight.
 *
 * After a successful change, dispatches `circle:disappearing-messages` with
 * `{ detail: { conversationId } }` so the Wasl screen can refresh its
 * header chip / message lifetime indicators.
 *
 * Props:
 *   open            boolean
 *   onClose         () => void
 *   conversationId  string?
 *   setBy           string?      — the acting user's id (for the POST body)
 */
import { useCallback, useEffect, useState } from "react";
import {
  Loader2, X, ShieldAlert, Eye, Clock, Calendar, CalendarDays, Power,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";

interface Setting {
  id: string;
  conversationId: string;
  duration: string;
  setBy: string;
  setAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  setBy?: string;
}

const FETCH_TIMEOUT_MS = 8000;

type DurationKey = "off" | "24h" | "7d" | "90d" | "view-once";

const OPTIONS: {
  key: DurationKey;
  label: string;
  description: string;
  icon: typeof Clock;
}[] = [
  { key: "off", label: "Off", description: "Messages never disappear.", icon: Power },
  { key: "24h", label: "24 hours", description: "Messages vanish 24h after sending.", icon: Clock },
  { key: "7d", label: "7 days", description: "Messages vanish a week after sending.", icon: Calendar },
  { key: "90d", label: "90 days", description: "Messages vanish 90 days after sending.", icon: CalendarDays },
  { key: "view-once", label: "View once", description: "Disappears after the recipient reads it once.", icon: Eye },
];

function dispatchChange(conversationId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("circle:disappearing-messages", {
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

export function DisappearingMessages({ open, onClose, conversationId, setBy }: Props) {
  const [current, setCurrent] = useState<DurationKey>("off");
  const [setAt, setSetAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<DurationKey | null>(null);

  // Load current setting when the sheet opens (or conversationId changes).
  useEffect(() => {
    if (!open || !conversationId) {
      setCurrent("off");
      setSetAt(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchWithTimeout(`/api/conversations/${encodeURIComponent(conversationId)}/disappearing`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load");
        const json = await r.json();
        if (cancelled) return;
        const s: Setting = json.setting;
        setCurrent((s?.duration as DurationKey) || "off");
        setSetAt(s?.setAt ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setCurrent("off");
          setSetAt(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  const select = useCallback(
    async (key: DurationKey) => {
      if (!conversationId || !setBy || pending) return;
      if (key === current) return;
      setPending(key);
      try {
        const r = await fetchWithTimeout(
          `/api/conversations/${encodeURIComponent(conversationId)}/disappearing`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ duration: key, setBy }),
          },
        );
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Failed to set timer");
        }
        const json = await r.json();
        const s: Setting = json.setting;
        setCurrent((s?.duration as DurationKey) || key);
        setSetAt(s?.setAt ?? new Date().toISOString());
        toast.success(`Disappearing messages: ${OPTIONS.find((o) => o.key === key)?.label}`);
        dispatchChange(conversationId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      } finally {
        setPending(null);
      }
    },
    [conversationId, setBy, current, pending],
  );

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="sheet"
      maxWidth="sm:max-w-md"
      ariaLabel="Disappearing messages"
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base leading-tight">Disappearing messages</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              New messages vanish after the timer.
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

      <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
        {!conversationId ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center text-sm text-muted-foreground">
            Open a conversation first to manage its disappearing-message timer.
          </div>
        ) : loading ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            Loading setting…
          </div>
        ) : (
          <div role="radiogroup" aria-label="Disappearing message timer">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = current === opt.key;
              const isPendingThis = pending === opt.key;
              return (
                <button
                  key={opt.key}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => select(opt.key)}
                  disabled={!!pending || !setBy}
                  className={cn(
                    "w-full mb-2.5 last:mb-0 rounded-xl p-3 flex items-center gap-3 transition select-none text-left",
                    "bg-white/5 backdrop-blur-xl border",
                    "hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    isActive
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : "border-white/10",
                    pending && !isPendingThis && "opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                      isActive
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "bg-white/5 border-white/10 text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {isPendingThis ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-sm font-medium", isActive && "text-emerald-400")}>
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {opt.description}
                    </div>
                  </div>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Privacy footer */}
        <section className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Timers apply to <strong className="text-foreground">new</strong> messages only.
            Existing messages keep their original lifetime. View-once messages
            disappear immediately after the recipient opens them.
            {setAt && (
              <>
                {" "}Last changed{" "}
                <span className="text-foreground">
                  {new Date(setAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                .
              </>
            )}
          </p>
        </section>
      </div>
    </OverlayShell>
  );
}
