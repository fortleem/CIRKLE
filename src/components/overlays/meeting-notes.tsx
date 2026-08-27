// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  X, FileText, Loader2, AlertTriangle, CheckCircle2, RefreshCw,
  ListChecks, Gavel, Users, Copy, Share2, Clock,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StartDetail {
  callId?: string;
}

interface ActionItem {
  assignee?: string;
  task: string;
  deadline?: string;
}

interface Decision {
  topic: string;
  decision: string;
}

interface ParticipantInfo {
  id: string;
  displayName: string;
  spokeCount?: number;
}

interface MeetingNotes {
  id?: string;
  callId?: string;
  summary: string;
  actionItems: ActionItem[];
  decisions: Decision[];
  participants: ParticipantInfo[];
  provider?: string;
  generatedAt: string;
}

async function fetch8s(url: string, opts: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, { ...opts, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/**
 * Meeting Notes overlay (E2).
 *
 * Opens via `circle:meeting-notes` event with `{ callId }`.
 *
 * Flow:
 *   1. On open, fetches GET /api/calls/[id]/notes.
 *   2. If notes exist → render them (summary, action items, decisions,
 *      who-said-what).
 *   3. If null → show "Generate notes" button.
 *   4. On regenerate → POST /api/calls/[id]/notes with { force: true }.
 *
 * The notes are produced by `src/lib/meeting-notes.ts` which uses the
 * CIRKLE Brain AI provider chain (5 providers).
 */
export function MeetingNotesOverlay({ open, onClose }: Props) {
  const [callId, setCallId] = useState<string>("");
  const [notes, setNotes] = useState<MeetingNotes | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Reset on close ──────────────────────────────────────────────────────
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setTimeout(() => {
        setCallId("");
        setNotes(null);
        setError(null);
        setLoading(false);
        setGenerating(false);
      }, 0);
    }
  }

  // ── Event listener ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<StartDetail>).detail || {};
      if (detail.callId) {
        setCallId(detail.callId);
        void loadNotes(detail.callId);
      }
    };
    window.addEventListener("circle:meeting-notes", onStart as EventListener);
    return () => {
      window.removeEventListener("circle:meeting-notes", onStart as EventListener);
    };
  }, [open]);

  // ── Load notes ────────────────────────────────────────────────────────────
  const loadNotes = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch8s(`/api/calls/${id}/notes`);
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setNotes(data.notes || null);
      } else {
        setError(data?.error || "Failed to load notes.");
      }
    } catch (err) {
      setError((err as Error)?.message || "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async (force: boolean = false) => {
    if (!callId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch8s(`/api/calls/${callId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && data.notes) {
        setNotes(data.notes);
        toast.success("Meeting notes generated.");
      } else {
        setError(data?.error || "Failed to generate notes.");
      }
    } catch (err) {
      setError((err as Error)?.message || "Failed to generate notes.");
    } finally {
      setGenerating(false);
    }
  };

  const copySummary = async () => {
    if (!notes) return;
    const text = `Meeting Summary\n\n${notes.summary}\n\nAction Items:\n${notes.actionItems.map((a) => `• ${a.assignee || "Someone"}: ${a.task}${a.deadline ? ` (by ${a.deadline})` : ""}`).join("\n")}\n\nDecisions:\n${notes.decisions.map((d) => `• ${d.topic}: ${d.decision}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Notes copied to clipboard.");
    } catch {
      toast.error("Couldn't copy — please select manually.");
    }
  };

  const share = async () => {
    if (!notes) return;
    const text = `${notes.summary}\n\n— via Cirkle Meeting Notes`;
    if (typeof (navigator as any)?.share === "function") {
      try {
        await (navigator as any).share({ title: "Meeting Notes", text });
      } catch { /* user cancelled */ }
    } else {
      await copySummary();
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" ariaLabel="AI meeting notes" maxWidth="max-w-2xl">
      <div className="flex flex-col h-full bg-card">
        {/* Header */}
        <header className="px-5 py-4 flex items-center gap-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-primary/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg">AI Meeting Notes</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {callId ? `Call ${callId.slice(0, 16)}…` : "No call selected"}
              {notes?.generatedAt && (
                <span className="ml-2 inline-flex items-center gap-1">
                  · <Clock className="w-3 h-3" /> {formatDate(notes.generatedAt)}
                </span>
              )}
            </div>
          </div>
          {notes && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Copy notes" onClick={() => void copySummary()}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Share notes" onClick={() => void share()}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Regenerate notes"
                onClick={() => void generate(true)}
                disabled={generating}
              >
                <RefreshCw className={cn("w-4 h-4", generating && "animate-spin")} />
              </Button>
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close meeting notes"
            className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="glass rounded-xl p-3 border border-rose-500/30 text-sm text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">Loading meeting notes…</span>
            </div>
          ) : !notes ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-primary/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="font-display text-lg mb-2">No notes yet</div>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Generate AI-powered meeting notes from this call's transcript.
                You'll get a summary, action items, decisions, and a who-said-what breakdown.
              </p>
              <Button
                onClick={() => void generate(false)}
                disabled={generating || !callId}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {generating ? "Generating…" : "Generate notes"}
              </Button>
            </div>
          ) : (
            <>
              {/* Summary */}
              <section className="glass rounded-2xl p-4 border border-emerald-500/20" aria-label="Call summary">
                <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <FileText className="w-3 h-3 text-emerald-500" /> Summary
                </div>
                <p className="text-sm leading-relaxed">{notes.summary || "No summary available."}</p>
              </section>

              {/* Action items */}
              <section aria-label="Action items">
                <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <ListChecks className="w-3 h-3 text-emerald-500" /> Action Items
                  {notes.actionItems.length > 0 && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 px-1.5 py-0.5 rounded-full">
                      {notes.actionItems.length}
                    </span>
                  )}
                </div>
                {notes.actionItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">No action items detected.</div>
                ) : (
                  <ul className="space-y-2">
                    {notes.actionItems.map((a, i) => (
                      <li
                        key={i}
                        className="glass rounded-xl p-3 border border-border/40 flex items-start gap-2"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px]">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">{a.task}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            {a.assignee && <span>👤 {a.assignee}</span>}
                            {a.deadline && <span>⏰ by {a.deadline}</span>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Decisions */}
              <section aria-label="Decisions">
                <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <Gavel className="w-3 h-3 text-emerald-500" /> Decisions
                  {notes.decisions.length > 0 && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 px-1.5 py-0.5 rounded-full">
                      {notes.decisions.length}
                    </span>
                  )}
                </div>
                {notes.decisions.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">No decisions detected.</div>
                ) : (
                  <ul className="space-y-2">
                    {notes.decisions.map((d, i) => (
                      <li
                        key={i}
                        className="glass rounded-xl p-3 border border-border/40"
                      >
                        <div className="text-[11px] text-emerald-700 uppercase tracking-widest mb-0.5">
                          {d.topic}
                        </div>
                        <div className="text-sm">{d.decision}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Participants */}
              <section aria-label="Participants">
                <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <Users className="w-3 h-3 text-emerald-500" /> Who Said What
                  {notes.participants.length > 0 && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 px-1.5 py-0.5 rounded-full">
                      {notes.participants.length}
                    </span>
                  )}
                </div>
                {notes.participants.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">No participants recorded.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {notes.participants.map((p, i) => (
                      <div
                        key={i}
                        className="glass rounded-xl p-3 border border-border/40 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/40 to-teal-500/30 border border-emerald-500/40 flex items-center justify-center text-white text-sm font-display shrink-0">
                          {(p.displayName || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{p.displayName}</div>
                          {p.spokeCount !== undefined && (
                            <div className="text-[11px] text-muted-foreground">
                              {p.spokeCount} segment{p.spokeCount === 1 ? "" : "s"}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Provider footer */}
              {notes.provider && (
                <div className="text-[10px] text-muted-foreground text-center pt-2">
                  Generated by Cirkle Brain AI · provider: <span className="font-mono">{notes.provider}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

/**
 * Trigger the meeting notes overlay from anywhere.
 * Usage:
 *   window.dispatchEvent(new CustomEvent("circle:meeting-notes", {
 *     detail: { callId: "abc123" }
 *   }));
 */
export function dispatchMeetingNotesEvent(callId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("circle:meeting-notes", { detail: { callId } }));
}
