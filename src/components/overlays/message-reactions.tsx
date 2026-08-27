// @ts-nocheck
"use client";

/**
 * MessageReactions overlay — B3.
 *
 * Small dialog showing the 8 supported reaction emojis. Clicking an emoji
 * toggles the reaction for the current user on the given message:
 *   • If the user hasn't reacted with that emoji → POST (add).
 *   • If the user already reacted with that emoji → DELETE (remove).
 *
 * After a successful add/remove, dispatches a `circle:message-reactions`
 * CustomEvent on window with `{ detail: { messageIds: [messageId] } }` so
 * the Wasl screen can refresh reaction chips on the affected message(s).
 *
 * Props:
 *   open           boolean       — is the overlay open?
 *   onClose        () => void    — close handler
 *   messageId      string?      — the message being reacted to
 *   userId         string?      — the acting user's id
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";

interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  messageId?: string;
  userId?: string;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏"] as const;

const FETCH_TIMEOUT_MS = 8000;

function dispatchRefresh(messageIds: string[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("circle:message-reactions", {
      detail: { messageIds },
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

export function MessageReactions({ open, onClose, messageId, userId }: Props) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  // Fetch reactions whenever the overlay opens (or messageId changes).
  useEffect(() => {
    if (!open || !messageId) {
      setReactions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchWithTimeout(`/api/messages/${encodeURIComponent(messageId)}/reactions`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load reactions");
        const json = await r.json();
        if (cancelled) return;
        setReactions(Array.isArray(json.reactions) ? json.reactions : []);
      })
      .catch(() => {
        if (!cancelled) setReactions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, messageId]);

  const mine = useCallback(
    (emoji: string): boolean =>
      !!userId && reactions.some((r) => r.emoji === emoji && r.userId === userId),
    [reactions, userId],
  );

  const counts = useCallback(() => {
    const out: Record<string, number> = {};
    for (const r of reactions) {
      out[r.emoji] = (out[r.emoji] ?? 0) + 1;
    }
    return out;
  }, [reactions]);

  const toggle = async (emoji: string) => {
    if (!messageId || !userId || pending) return;
    setPending(emoji);
    try {
      const already = mine(emoji);
      if (already) {
        const r = await fetchWithTimeout(
          `/api/messages/${encodeURIComponent(messageId)}/reactions?emoji=${encodeURIComponent(emoji)}&userId=${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        );
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Failed to remove reaction");
        }
        setReactions((rs) => rs.filter((x) => !(x.emoji === emoji && x.userId === userId)));
        toast.success("Reaction removed");
      } else {
        const r = await fetchWithTimeout(
          `/api/messages/${encodeURIComponent(messageId)}/reactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji, userId }),
          },
        );
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Failed to add reaction");
        }
        const json = await r.json();
        if (json.reaction) {
          setReactions((rs) => [...rs, json.reaction]);
        }
        toast.success(`Reacted ${emoji}`);
      }
      dispatchRefresh([messageId]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reaction failed");
    } finally {
      setPending(null);
    }
  };

  const cs = counts();

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="dialog"
      maxWidth="sm:max-w-sm"
      ariaLabel="Message reactions"
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base leading-tight">React</h2>
          <p className="text-[11px] text-muted-foreground">Pick an emoji — tap again to undo.</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close reactions"
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {!messageId || !userId ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center text-sm text-muted-foreground">
            Open a message first to react to it.
          </div>
        ) : (
          <div
            role="group"
            aria-label="Reaction emojis"
            className="grid grid-cols-4 gap-2 sm:gap-3"
          >
            {EMOJIS.map((emoji) => {
              const isMine = mine(emoji);
              const count = cs[emoji] ?? 0;
              const isPending = pending === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() => toggle(emoji)}
                  disabled={!!pending}
                  aria-pressed={isMine}
                  aria-label={`${emoji} — ${count} reaction${count === 1 ? "" : "s"}${isMine ? " (yours)" : ""}`}
                  className={cn(
                    "relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition select-none",
                    "bg-white/5 backdrop-blur-xl border border-white/10",
                    "hover:bg-white/10 hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    isMine && "bg-emerald-500/15 border-emerald-500/50 hover:bg-emerald-500/25",
                    pending && !isPending && "opacity-50",
                  )}
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  ) : (
                    <span className="text-2xl leading-none" aria-hidden="true">{emoji}</span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      count > 0 ? "text-foreground" : "text-muted-foreground/50",
                    )}
                  >
                    {count}
                  </span>
                  {isMine && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading reactions…
          </div>
        )}
      </div>
    </OverlayShell>
  );
}
