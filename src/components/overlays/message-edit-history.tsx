// @ts-nocheck
"use client";

/**
 * MessageEditHistory overlay — B4.
 *
 * Shows the edit history of a single message: a vertical timeline of every
 * previous body version, plus the current (latest) body at the top. Each
 * version is timestamped.
 *
 * On open (or when messageId changes), fetches
 *   GET /api/messages/[id]/edit
 * which returns `{ messageId, currentBody, createdAt, history: [] }`.
 *
 * Dispatches `circle:edit-history` with `{ detail: { messageId } }` so the
 * Wasl screen knows the edit-history overlay was opened for that message
 * (useful for highlighting the message bubble, refreshing the edited label,
 * etc.).
 *
 * Props:
 *   open           boolean
 *   onClose        () => void
 *   messageId      string?
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X, History, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  messageId: string;
  oldBody: string;
  editedAt: string;
}

interface Payload {
  messageId: string;
  currentBody: string | null;
  createdAt?: string;
  history: HistoryEntry[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  messageId?: string;
}

const FETCH_TIMEOUT_MS = 8000;

function dispatchOpen(messageId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("circle:edit-history", { detail: { messageId } }),
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

export function MessageEditHistory({ open, onClose, messageId }: Props) {
  const [data, setData] = useState<Payload | null>(null);
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
        `/api/messages/${encodeURIComponent(msgId)}/edit`,
      );
      if (seq !== fetchSeqRef.current) return; // stale
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Failed to load edit history");
      }
      const json = (await r.json()) as Payload;
      if (seq !== fetchSeqRef.current) return; // stale
      setData(json);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load");
      toast.error("Couldn't load edit history");
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

  const history = data?.history ?? [];
  const totalEdits = history.length;

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="dialog"
      maxWidth="sm:max-w-lg"
      ariaLabel="Message edit history"
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <History className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base leading-tight">Edit history</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {totalEdits === 0
                ? "No edits yet"
                : `${totalEdits} edit${totalEdits === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close edit history"
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {!messageId ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center text-sm text-muted-foreground">
            Open a message first to view its edit history.
          </div>
        ) : loading ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            Loading history…
          </div>
        ) : error ? (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 p-4 flex items-start gap-2 text-sm text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Couldn&apos;t load history</div>
              <div className="text-[11px] opacity-80 mt-0.5">{error}</div>
            </div>
          </div>
        ) : (
          <ol className="relative space-y-3" aria-label="Edit timeline">
            {/* Timeline rail */}
            <span
              aria-hidden="true"
              className="absolute left-[15px] top-2 bottom-2 w-px bg-white/10"
            />

            {/* Current version */}
            <li className="relative pl-10">
              <span
                aria-hidden="true"
                className="absolute left-[10px] top-2 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"
              />
              <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Current
                  </span>
                  {data?.createdAt && (
                    <span className="text-[10px] text-muted-foreground">
                      Sent {formatTime(data.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {data?.currentBody || <em className="text-muted-foreground/60">[empty]</em>}
                </p>
              </div>
            </li>

            {/* Previous versions — newest first */}
            {history
              .slice()
              .reverse()
              .map((entry, idx) => {
                const versionNumber = history.length - idx;
                return (
                  <li key={entry.id} className="relative pl-10">
                    <span
                      aria-hidden="true"
                      className="absolute left-[10px] top-2 w-3 h-3 rounded-full bg-white/20 ring-4 ring-white/5"
                    />
                    <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          v{versionNumber}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Edited {formatTime(entry.editedAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-muted-foreground line-through decoration-white/20">
                        {entry.oldBody || <em>[empty]</em>}
                      </p>
                    </div>
                  </li>
                );
              })}

            {history.length === 0 && (
              <li className="pl-10 text-[11px] text-muted-foreground italic">
                This message has never been edited.
              </li>
            )}
          </ol>
        )}
      </div>
    </OverlayShell>
  );
}
