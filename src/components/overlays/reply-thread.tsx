// @ts-nocheck
"use client";

/**
 * ReplyThread overlay — B7.
 *
 * Shows a thread view: the parent message at the top, followed by every
 * reply (oldest first) rendered as a chat bubble. Each reply shows the
 * sender's initials avatar, sender name, timestamp, and body.
 *
 * On open (or when messageId changes), fetches
 *   GET /api/messages/[id]/thread
 * which returns `{ parentMessageId, depth, count, replies: [] }`.
 *
 * Dispatches `circle:reply-thread` with `{ detail: { messageId } }` so the
 * Wasl screen knows the thread overlay was opened for that parent.
 *
 * Props:
 *   open           boolean
 *   onClose        () => void
 *   messageId      string?      — parent message id
 *   parentBody?    string?      — optional parent body (rendered if provided)
 *   parentSender?  string?      — optional parent sender display name
 *   parentInitials? string?
 *   parentColor?   string?
 *   parentCreatedAt? string?
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X, MessageSquare, AlertCircle, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";

interface ThreadReply {
  id: string;
  parentMessageId: string;
  replyMessageId: string;
  createdAt: string;
  replyMessage?: {
    id: string;
    body: string | null;
    senderName: string;
    senderInitials: string;
    senderColor: string;
    createdAt: string;
  } | null;
}

interface ThreadPayload {
  parentMessageId: string;
  depth: number;
  count: number;
  replies: ThreadReply[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  messageId?: string;
  parentBody?: string | null;
  parentSender?: string | null;
  parentInitials?: string | null;
  parentColor?: string | null;
  parentCreatedAt?: string | null;
}

const FETCH_TIMEOUT_MS = 8000;

const COLOR_MAP: Record<string, string> = {
  teal: "bg-teal-500/20 text-teal-300 border-teal-500/40",
  rose: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  steel: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  gold: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  charcoal: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
};

function colorClasses(c?: string | null): string {
  return (c && COLOR_MAP[c]) || COLOR_MAP.teal;
}

function dispatchOpen(messageId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("circle:reply-thread", { detail: { messageId } }),
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

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ReplyThread({
  open,
  onClose,
  messageId,
  parentBody,
  parentSender,
  parentInitials,
  parentColor,
  parentCreatedAt,
}: Props) {
  const [data, setData] = useState<ThreadPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest fetch so stale responses don't overwrite newer ones.
  const fetchSeqRef = useRef(0);

  const fetchData = useCallback(async (msgId: string) => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchWithTimeout(
        `/api/messages/${encodeURIComponent(msgId)}/thread`,
      );
      if (seq !== fetchSeqRef.current) return; // stale
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Failed to load thread");
      }
      const json = (await r.json()) as ThreadPayload;
      if (seq !== fetchSeqRef.current) return; // stale
      setData(json);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load");
      toast.error("Couldn't load thread");
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, []);

  // Fetch on open (or when messageId changes). When closed or missing an id,
  // we skip without resetting — the parent hides us anyway.
  useEffect(() => {
    if (!open || !messageId) return;
    dispatchOpen(messageId);
    void fetchData(messageId);
  }, [open, messageId, fetchData]);

  const replies = data?.replies ?? [];
  const replyCount = data?.count ?? replies.length;

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="dialog"
      maxWidth="sm:max-w-lg"
      ariaLabel="Reply thread"
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base leading-tight">Thread</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {replyCount === 0
                ? "No replies yet"
                : `${replyCount} repl${replyCount === 1 ? "y" : "ies"}`}
              {data?.depth ? ` · depth ${data.depth}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close thread"
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
        {!messageId ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center text-sm text-muted-foreground">
            Open a message first to view its thread.
          </div>
        ) : loading ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            Loading thread…
          </div>
        ) : error ? (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 p-4 flex items-start gap-2 text-sm text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Couldn&apos;t load thread</div>
              <div className="text-[11px] opacity-80 mt-0.5">{error}</div>
            </div>
          </div>
        ) : (
          <>
            {/* Parent message */}
            <section
              aria-label="Original message"
              className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-semibold",
                    colorClasses(parentColor),
                  )}
                  aria-hidden="true"
                >
                  {parentInitials || (parentSender?.[0]?.toUpperCase() ?? "·")}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">
                    {parentSender || "Original message"}
                  </div>
                  {parentCreatedAt && (
                    <div className="text-[10px] text-muted-foreground">
                      {formatTime(parentCreatedAt)}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pl-9">
                {parentBody || <em className="text-muted-foreground/60">[empty or media-only]</em>}
              </p>
            </section>

            {/* Replies */}
            {replies.length === 0 ? (
              <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                <CornerDownRight className="w-3.5 h-3.5" />
                Be the first to reply in this thread.
              </div>
            ) : (
              <ol className="space-y-2.5" aria-label="Thread replies">
                {replies.map((r) => {
                  const m = r.replyMessage;
                  if (!m) {
                    return (
                      <li
                        key={r.id}
                        className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 text-[11px] text-muted-foreground italic"
                      >
                        Reply message was deleted.
                      </li>
                    );
                  }
                  return (
                    <li
                      key={r.id}
                      className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3"
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-semibold shrink-0",
                            colorClasses(m.senderColor),
                          )}
                          aria-hidden="true"
                        >
                          {m.senderInitials || m.senderName?.[0]?.toUpperCase() || "·"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{m.senderName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatTime(m.createdAt)}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pl-9">
                        {m.body || <em className="text-muted-foreground/60">[empty or media-only]</em>}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </div>
    </OverlayShell>
  );
}
