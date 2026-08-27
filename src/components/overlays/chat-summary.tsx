// @ts-nocheck
"use client";

/**
 * ChatSummarySheet — AI-powered topic-based chat summarization drawer.
 * ============================================================================
 * Opens from the Wasl conversation header ("Summarize" button). Calls
 * POST /api/chats/summarize with { conversationId, scope: "today" | "all" }
 * and renders topic cards (topic name, summary, key points, message count +
 * time range).
 *
 * States: loading spinner, error (retry), empty (no messages).
 * Scope toggle is a segmented control (role="tablist" + role="tab").
 * Mobile: full-width Sheet (side="bottom"). Desktop: max-w-lg (side="right").
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
  Calendar,
  ListChecks,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the API response (see /api/chats/summarize/route.ts +
// /lib/chat-summarization.ts).
// ─────────────────────────────────────────────────────────────────────────────

interface TopicSummary {
  topic: string;
  summary: string;
  keyPoints: string[];
  messageCount: number;
  rangeStart: string;
  rangeEnd: string;
}

interface SummarizeResult {
  conversationId: string;
  scope: "today" | "all";
  totalMessages: number;
  topics: TopicSummary[];
  generatedAt: string;
  provider?: string;
}

type Scope = "today" | "all";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const sameDay = s.toDateString() === e.toDateString();
    const fmtTime = (d: Date) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const fmtDate = (d: Date) =>
      d.toLocaleDateString([], { month: "short", day: "numeric" });
    if (sameDay) {
      return `${fmtTime(s)} – ${fmtTime(e)}`;
    }
    return `${fmtDate(s)} ${fmtTime(s)} – ${fmtDate(e)} ${fmtTime(e)}`;
  } catch {
    return "";
  }
}

function formatGeneratedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface ChatSummarySheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  conversationName?: string;
  /** Total message count for the loading hint. Optional. */
  totalMessagesHint?: number;
}

export function ChatSummarySheet({
  open,
  onOpenChange,
  conversationId,
  conversationName,
  totalMessagesHint,
}: ChatSummarySheetProps) {
  const [scope, setScope] = useState<Scope>("today");
  const [data, setData] = useState<SummarizeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Track the latest fetch so stale responses don't overwrite newer ones.
  const fetchSeqRef = useRef(0);

  const fetchData = useCallback(
    async (selectedScope: Scope, isRefresh = false) => {
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const r = await fetch("/api/chats/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            scope: selectedScope,
          }),
          signal: controller.signal,
          cache: "no-store",
        });

        if (seq !== fetchSeqRef.current) return; // stale

        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${r.status}`);
        }

        const json = (await r.json()) as SummarizeResult;
        if (seq !== fetchSeqRef.current) return; // stale
        setData(json);
        if (isRefresh) {
          toast.success("Summary refreshed", {
            description: `${json.topics.length} topic${
              json.topics.length === 1 ? "" : "s"
            } detected`,
          });
        }
      } catch (err) {
        if (seq !== fetchSeqRef.current) return;
        if ((err as Error).name === "AbortError") {
          setError("Summarization timed out. Please try again.");
        } else {
          setError(
            (err as Error).message || "Failed to generate summary.",
          );
        }
      } finally {
        clearTimeout(timeout);
        if (seq === fetchSeqRef.current) setLoading(false);
      }
    },
    [conversationId],
  );

  // Fetch on open + whenever scope changes + manual refresh.
  useEffect(() => {
    if (!open) return;
    void fetchData(scope, false);
  }, [open, scope, fetchData, refreshTick]);

  const handleScopeChange = (next: Scope) => {
    if (next === scope) return;
    setScope(next);
    setData(null); // clear stale data while refetching
  };

  const handleRefresh = () => {
    setRefreshTick((t) => t + 1);
  };

  const totalMessages = data?.totalMessages ?? totalMessagesHint ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col"
        aria-label="AI chat summary"
        role="dialog"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            AI Chat Summary
          </SheetTitle>
          <SheetDescription className="flex items-center gap-1.5">
            <span className="truncate">
              {conversationName ? `${conversationName} · ` : ""}
              ملخص المحادثة بالذكاء الاصطناعي
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* Scope toggle (segmented control, role="tablist") */}
        <div
          className="px-4"
          role="tablist"
          aria-label="Summary scope"
        >
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/50">
            <ScopeTab
              active={scope === "today"}
              onClick={() => handleScopeChange("today")}
              label="Today only"
              icon={<Clock className="w-3.5 h-3.5" />}
            />
            <ScopeTab
              active={scope === "all"}
              onClick={() => handleScopeChange("all")}
              label="All history"
              icon={<Calendar className="w-3.5 h-3.5" />}
            />
          </div>
        </div>

        {/* Body — loading / error / empty / data */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {loading && (
            <LoadingState messageCount={totalMessages} scope={scope} />
          )}

          {!loading && error && (
            <ErrorState message={error} onRetry={handleRefresh} />
          )}

          {!loading && !error && data && data.topics.length === 0 && (
            <EmptyState scope={scope} />
          )}

          {!loading && !error && data && data.topics.length > 0 && (
            <>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ListChecks className="w-3 h-3" />
                  {data.topics.length} topic
                  {data.topics.length === 1 ? "" : "s"} ·{" "}
                  {data.totalMessages} message
                  {data.totalMessages === 1 ? "" : "s"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-7 px-2 text-[11px] gap-1"
                  aria-label="Refresh summary"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </Button>
              </div>

              {data.topics.map((topic, i) => (
                <TopicCard
                  key={`${topic.topic}-${i}`}
                  topic={topic}
                  index={i}
                />
              ))}

              {data.generatedAt && (
                <div className="text-[10px] text-muted-foreground text-center pt-2">
                  Generated at {formatGeneratedAt(data.generatedAt)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — provider credit */}
        <SheetFooter className="border-t border-border pt-3">
          <div className="w-full flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-secondary" />
              Generated by Cirkle Brain AI
              {data?.provider ? ` · ${data.provider}` : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 text-xs"
            >
              Close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ScopeTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
        active
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TopicCard({
  topic,
  index,
}: {
  topic: TopicSummary;
  index: number;
}) {
  return (
    <article className="glass rounded-2xl p-4 space-y-2.5">
      <header className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <h4 className="font-medium text-sm leading-snug flex-1">{topic.topic}</h4>
      </header>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {topic.summary}
      </p>

      {topic.keyPoints.length > 0 && (
        <ul className="space-y-1 pt-1">
          {topic.keyPoints.map((kp, i) => (
            <li
              key={i}
              className="text-xs text-foreground/85 flex items-start gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-secondary mt-1.5 shrink-0" />
              <span>{kp}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className="flex items-center gap-2 pt-1.5 text-[10px] text-muted-foreground">
        <Badge
          variant="secondary"
          className="text-[10px] h-5 px-1.5 gap-1"
        >
          <FileText className="w-2.5 h-2.5" />
          {topic.messageCount} message
          {topic.messageCount === 1 ? "" : "s"}
        </Badge>
        {topic.rangeStart && topic.rangeEnd && (
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatRange(topic.rangeStart, topic.rangeEnd)}
          </span>
        )}
      </footer>
    </article>
  );
}

function LoadingState({
  messageCount,
  scope,
}: {
  messageCount: number;
  scope: Scope;
}) {
  const label =
    messageCount > 0
      ? `Analyzing ${messageCount} message${
          messageCount === 1 ? "" : "s"
        }…`
      : scope === "today"
        ? "Analyzing today's messages…"
        : "Analyzing conversation…";
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="w-8 h-8 text-secondary animate-spin mb-3" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-1">
        Grouping messages by topic and generating summaries…
      </p>
    </div>
  );
}

function EmptyState({ scope }: { scope: Scope }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <FileText className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">
        No messages to summarize for this period.
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">
        {scope === "today"
          ? "Send a few messages today, then come back to summarize."
          : "This conversation has no messages yet."}
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6 text-accent" />
      </div>
      <p className="text-sm font-medium">
        Failed to generate summary. Please try again.
      </p>
      <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
        {message}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-4 h-8 gap-1.5"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </Button>
    </div>
  );
}

export default ChatSummarySheet;
