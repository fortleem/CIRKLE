// @ts-nocheck
"use client";

/**
 * ACA Command Center Dashboard Overlay
 * ============================================================================
 * Fullscreen overlay — the command center of the ACA sovereign layer.
 *
 * FOUR KEY QUESTIONS (per CIRKLE-ACA-BLUEPRINT §16, §238):
 *   WHAT IS GOING WRONG?
 *   WHERE?
 *   WHY?
 *   WHAT NEEDS ACTION NOW?
 *
 * Summary cards:
 *   - active cases
 *   - pending signals
 *   - overdue actions
 *   - evidence alerts (unsealed evidence in active cases)
 *
 * Recent lists:
 *   - cases (most recently updated)
 *   - signals (most recently created / converted)
 *
 * Navigation:
 *   - Cases, Evidence, Signals, Findings, Recommendations
 *
 * Selecting a case dispatches `circle:aca-case-detail` with the caseId.
 *
 * BUILDING PHASE — NO AUTH. Amber "DEV MODE — NO AUTH" banner shown.
 *
 * Accessibility:
 *   - role="dialog" aria-modal (from <OverlayShell>)
 *   - Each summary card is role="group" with aria-label
 *   - The four key questions use a <section aria-labelledby> structure
 *   - Lists use semantic <ul>/<li>
 *   - All icon-only buttons have aria-label
 * ============================================================================
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, Loader2, X, FolderOpen, Radio, AlertTriangle, Lock,
  ShieldAlert, Activity, MapPin, ChevronRight, FileText, Gavel,
  Lightbulb, ListChecks, AlertTriangle as AlertIcon, Clock,
} from "lucide-react";

import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AcaDashboardProps {
  open: boolean;
  onClose: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
//  Fetch hook with 8s timeout
// ────────────────────────────────────────────────────────────────────────────

function useAcaFetch<T = any>(endpoint: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Derived loading state on endpoint change
  const [prevEndpoint, setPrevEndpoint] = useState<string | null>(endpoint);
  const [prevRefresh, setPrevRefresh] = useState(refreshKey);
  if ((endpoint !== prevEndpoint || refreshKey !== prevRefresh) && endpoint) {
    setPrevEndpoint(endpoint);
    setPrevRefresh(refreshKey);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch(endpoint, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status}${text ? ` — ${text.slice(0, 120)}` : ""}`);
        }
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        const msg = (err as { message?: string })?.message || "Failed to fetch";
        setError(name === "AbortError" ? "Request timed out (8s)" : msg);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [endpoint, refreshKey]);

  return { data, loading, error, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

const CASE_STATUS_COLORS: Record<string, string> = {
  intake:           "border-slate-600 text-slate-300 bg-slate-700/40",
  investigation:    "border-amber-600/50 text-amber-200 bg-amber-700/20",
  review:           "border-sky-600/50 text-sky-200 bg-sky-700/20",
  finding:          "border-violet-600/50 text-violet-200 bg-violet-700/20",
  recommendation:   "border-teal-600/50 text-teal-200 bg-teal-700/20",
  reform:           "border-emerald-600/50 text-emerald-200 bg-emerald-700/20",
  closed:           "border-slate-700 text-slate-400 bg-slate-800/40",
};

const PRIORITY_COLORS: Record<string, string> = {
  low:      "border-slate-600 text-slate-300",
  medium:   "border-sky-600/50 text-sky-200",
  high:     "border-amber-600/50 text-amber-200",
  critical: "border-rose-600/60 text-rose-200",
};

const SIGNAL_STATUS_COLORS: Record<string, string> = {
  pending:            "border-amber-600/50 text-amber-200 bg-amber-700/20",
  reviewed:           "border-sky-600/50 text-sky-200 bg-sky-700/20",
  converted_to_case:  "border-emerald-600/50 text-emerald-200 bg-emerald-700/20",
  dismissed:          "border-slate-700 text-slate-400 bg-slate-800/40",
};

// ────────────────────────────────────────────────────────────────────────────
//  Stat card
// ────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof FolderOpen;
  accent?: "amber" | "rose" | "emerald" | "sky" | "slate";
  loading?: boolean;
}

function StatCard({ label, value, hint, icon: Icon, accent = "slate", loading }: StatCardProps) {
  const accents: Record<string, string> = {
    amber:   "border-amber-600/40 bg-amber-950/30",
    rose:    "border-rose-600/40 bg-rose-950/30",
    emerald: "border-emerald-600/40 bg-emerald-950/30",
    sky:     "border-sky-600/40 bg-sky-950/30",
    slate:   "border-slate-700/60 bg-slate-900/40",
  };
  const iconAccents: Record<string, string> = {
    amber:   "text-amber-300 bg-amber-500/15",
    rose:    "text-rose-300 bg-rose-500/15",
    emerald: "text-emerald-300 bg-emerald-500/15",
    sky:     "text-sky-300 bg-sky-500/15",
    slate:   "text-slate-300 bg-slate-500/15",
  };
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-2 backdrop-blur-sm",
        accents[accent],
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            iconAccents[accent],
          )}
        >
          <Icon className="w-4 h-4" aria-hidden />
        </div>
        {hint && (
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            {hint}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold tabular-nums leading-tight text-slate-100">
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 leading-tight">
        {label}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Main component
// ────────────────────────────────────────────────────────────────────────────

export function AcaDashboard({ open, onClose }: AcaDashboardProps) {
  const casesFetch = useAcaFetch<any>("/api/aca/cases");
  const signalsFetch = useAcaFetch<any>("/api/aca/signals");

  const refreshAll = useCallback(() => {
    casesFetch.refresh();
    signalsFetch.refresh();
  }, [casesFetch, signalsFetch]);

  const cases = casesFetch.data?.cases ?? [];
  const signals = signalsFetch.data?.signals ?? [];
  const signalSummary = signalsFetch.data?.summary ?? {};

  const activeCases = cases.filter(
    (c: any) => !["closed"].includes(c.status),
  ).length;
  const pendingSignals = signalSummary.pending ?? signals.filter((s: any) => s.status === "pending").length;
  const overdueActions = cases.reduce((acc: number, c: any) => {
    // crude overdue heuristic — count cases that have been in their current
    // stage for over 14 days (real impl: compare status timestamps to SLA)
    if (!c.updatedAt || c.status === "closed") return acc;
    const ageDays = (Date.now() - new Date(c.updatedAt).getTime()) / 86_400_000;
    return ageDays > 14 ? acc + 1 : acc;
  }, 0);
  const evidenceAlerts = cases.reduce((acc: number, c: any) => {
    return acc + (c.evidenceCount === 0 && c.status !== "closed" ? 1 : 0);
  }, 0);

  const recentCases = cases.slice(0, 6);
  const recentSignals = signals.slice(0, 6);

  const selectCase = useCallback((caseId: string, caseNumber: string) => {
    window.dispatchEvent(
      new CustomEvent("circle:aca-case-detail", {
        detail: { caseId, caseNumber },
      }),
    );
  }, []);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="ACA Command Center"
      className="bg-gradient-to-br from-slate-950 via-charcoal to-slate-950 text-slate-100"
    >
      <div className="flex flex-col min-h-screen w-full overflow-hidden">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-slate-200" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm md:text-base font-semibold text-slate-100">
                  ACA Command Center
                </span>
                <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                  SOVEREIGN
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Administrative Control Authority — institutional dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={refreshAll}
              disabled={casesFetch.loading || signalsFetch.loading}
              className="text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw
                className={cn("w-4 h-4", (casesFetch.loading || signalsFetch.loading) && "animate-spin")}
                aria-hidden
              />
              <span className="hidden sm:inline ml-1.5">Refresh</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
              aria-label="Close ACA dashboard"
            >
              <X className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline ml-1.5">Exit</span>
            </Button>
          </div>
        </header>

        {/* ── DEV MODE banner ──────────────────────────────────────────── */}
        <div
          role="alert"
          aria-live="polite"
          className="w-full bg-amber-500/15 border-b border-amber-500/40 text-amber-200 px-5 md:px-8 py-2.5 flex items-center gap-2.5 text-xs md:text-sm shrink-0"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
          <span className="font-semibold uppercase tracking-wide">DEV MODE — NO AUTH</span>
          <span className="text-amber-200/80 hidden md:inline">
            Sovereign dashboard is in building phase. Sessions are mock-permissive.
          </span>
          <span className="text-amber-200/80 md:hidden">Building phase.</span>
        </div>

        {/* ── Scrollable main ──────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
            {/* ── Four key questions ──────────────────────────────────── */}
            <section aria-labelledby="aca-key-questions-heading">
              <h2
                id="aca-key-questions-heading"
                className="sr-only"
              >
                Four key questions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KeyQuestionCard
                  question="WHAT IS GOING WRONG?"
                  color="amber"
                  body={
                    <div className="space-y-1">
                      <p className="text-slate-300 text-sm leading-snug">
                        {pendingSignals} pending signal{pendingSignals === 1 ? "" : "s"} awaiting review
                      </p>
                      <p className="text-slate-300 text-sm leading-snug">
                        {activeCases} active case{activeCases === 1 ? "" : "s"} in pipeline
                      </p>
                      {signalsFetch.error && (
                        <p className="text-rose-300 text-xs mt-1">{signalsFetch.error}</p>
                      )}
                    </div>
                  }
                />
                <KeyQuestionCard
                  question="WHERE?"
                  color="sky"
                  body={
                    <div className="space-y-1">
                      {Array.from(new Set(cases.map((c: any) => c.geography).filter(Boolean))).slice(0, 3).map((g: any) => (
                        <p key={g} className="text-slate-300 text-sm leading-snug flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-500" aria-hidden />
                          {g}
                        </p>
                      ))}
                      {cases.length === 0 && (
                        <p className="text-slate-500 text-sm">No geographic concentration yet.</p>
                      )}
                    </div>
                  }
                />
                <KeyQuestionCard
                  question="WHY?"
                  color="violet"
                  body={
                    <div className="space-y-1">
                      <p className="text-slate-300 text-sm leading-snug">
                        {signalSummary.withIntegrityIndicators ?? 0} signals with integrity indicators
                      </p>
                      <p className="text-slate-300 text-sm leading-snug">
                        {signalSummary.converted ?? 0} signals converted to cases
                      </p>
                    </div>
                  }
                />
                <KeyQuestionCard
                  question="WHAT NEEDS ACTION NOW?"
                  color="rose"
                  body={
                    <div className="space-y-1">
                      <p className="text-slate-300 text-sm leading-snug">
                        {overdueActions} overdue action{overdueActions === 1 ? "" : "s"}
                      </p>
                      <p className="text-slate-300 text-sm leading-snug">
                        {evidenceAlerts} active case{evidenceAlerts === 1 ? "" : "s"} with no evidence
                      </p>
                    </div>
                  }
                />
              </div>
            </section>

            {/* ── Summary cards ───────────────────────────────────────── */}
            <section aria-labelledby="aca-summary-heading">
              <h2 id="aca-summary-heading" className="sr-only">Summary</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                  label="Active Cases"
                  value={activeCases}
                  icon={FolderOpen}
                  accent="amber"
                  loading={casesFetch.loading && cases.length === 0}
                />
                <StatCard
                  label="Pending Signals"
                  value={pendingSignals}
                  icon={Radio}
                  accent="sky"
                  loading={signalsFetch.loading && signals.length === 0}
                />
                <StatCard
                  label="Overdue Actions"
                  value={overdueActions}
                  icon={Clock}
                  accent="rose"
                  loading={casesFetch.loading && cases.length === 0}
                />
                <StatCard
                  label="Evidence Alerts"
                  value={evidenceAlerts}
                  icon={Lock}
                  accent="emerald"
                  hint="no evidence"
                  loading={casesFetch.loading && cases.length === 0}
                />
              </div>
            </section>

            {/* ── Two-column lists ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Recent cases */}
              <section
                aria-labelledby="aca-recent-cases-heading"
                className="rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-300" aria-hidden />
                    <h3 id="aca-recent-cases-heading" className="text-sm font-medium text-slate-200">
                      Recent Cases
                    </h3>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                    {cases.length} total
                  </Badge>
                </div>
                <ul className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                  {recentCases.length === 0 && (
                    <li className="px-4 py-8 text-center text-slate-500 text-sm">
                      {casesFetch.loading ? "Loading…" : casesFetch.error ?? "No cases yet."}
                    </li>
                  )}
                  {recentCases.map((c: any) => (
                    <li key={c.caseId}>
                      <button
                        type="button"
                        onClick={() => selectCase(c.caseId, c.caseNumber)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-800/40 transition-colors flex items-start gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[11px] font-mono text-slate-400">
                              {c.caseNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] uppercase", CASE_STATUS_COLORS[c.status] || CASE_STATUS_COLORS.intake)}
                            >
                              {c.status}
                            </Badge>
                            {c.priority && (
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] uppercase", PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.medium)}
                              >
                                {c.priority}
                              </Badge>
                            )}
                            {c.twoPersonPending && (
                              <Badge variant="outline" className="border-rose-600/50 text-rose-300 text-[10px] uppercase">
                                2-person pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-200 truncate" title={c.title}>
                            {c.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {c.department}
                            {c.service ? ` · ${c.service}` : ""}
                            {c.geography ? ` · ${c.geography}` : ""}
                            {` · updated ${timeAgo(c.updatedAt)}`}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mt-1" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Recent signals */}
              <section
                aria-labelledby="aca-recent-signals-heading"
                className="rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-sky-300" aria-hidden />
                    <h3 id="aca-recent-signals-heading" className="text-sm font-medium text-slate-200">
                      Recent Signals
                    </h3>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                    {signals.length} total
                  </Badge>
                </div>
                <ul className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                  {recentSignals.length === 0 && (
                    <li className="px-4 py-8 text-center text-slate-500 text-sm">
                      {signalsFetch.loading ? "Loading…" : signalsFetch.error ?? "No signals yet."}
                    </li>
                  )}
                  {recentSignals.map((s: any) => (
                    <li key={s.signalId} className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-mono text-slate-400">
                          {s.signalNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] uppercase", SIGNAL_STATUS_COLORS[s.status] || SIGNAL_STATUS_COLORS.pending)}
                        >
                          {s.status}
                        </Badge>
                        {s.hasIntegrityIndicators && (
                          <Badge variant="outline" className="border-rose-600/50 text-rose-300 text-[10px] uppercase">
                            integrity
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-200 truncate">
                        {s.source} · {s.pattern.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {s.sourceCount} source{s.sourceCount === 1 ? "" : "s"}
                        {s.service ? ` · ${s.service}` : ""}
                        {s.geography ? ` · ${s.geography}` : ""}
                        {` · ${timeAgo(s.createdAt)}`}
                      </p>
                      {s.evaluation && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">
                          AI: {s.evaluation.recommendation.replace(/_/g, " ")} ({(s.evaluation.confidence * 100).toFixed(0)}%)
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* ── Navigation tiles ───────────────────────────────────── */}
            <section aria-labelledby="aca-nav-heading">
              <h2 id="aca-nav-heading" className="sr-only">Workspace navigation</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <NavTile label="Cases" icon={FolderOpen} accent="amber" />
                <NavTile label="Evidence" icon={Lock} accent="emerald" />
                <NavTile label="Signals" icon={Radio} accent="sky" />
                <NavTile label="Findings" icon={Gavel} accent="violet" />
                <NavTile label="Recommendations" icon={Lightbulb} accent="teal" />
              </div>
            </section>
          </div>
        </main>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-800/60 bg-slate-950/40 px-5 md:px-8 py-2.5 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" aria-hidden />
            ACA Sovereign — building phase
          </span>
          <span className="font-mono">ACA-SOVEREIGN-IMPL</span>
        </footer>
      </div>
    </OverlayShell>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ────────────────────────────────────────────────────────────────────────────

function KeyQuestionCard({
  question,
  color,
  body,
}: {
  question: string;
  color: "amber" | "sky" | "violet" | "rose";
  body: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    amber:  "border-amber-600/40 bg-amber-950/30",
    sky:    "border-sky-600/40 bg-sky-950/30",
    violet: "border-violet-600/40 bg-violet-950/30",
    rose:   "border-rose-600/40 bg-rose-950/30",
  };
  const headingColors: Record<string, string> = {
    amber:  "text-amber-200",
    sky:    "text-sky-200",
    violet: "text-violet-200",
    rose:   "text-rose-200",
  };
  return (
    <div className={cn("rounded-xl border p-4 backdrop-blur-sm", colors[color])}>
      <h3
        className={cn(
          "text-[11px] font-bold uppercase tracking-wide mb-2",
          headingColors[color],
        )}
      >
        {question}
      </h3>
      <div className="text-slate-300">{body}</div>
    </div>
  );
}

function NavTile({
  label,
  icon: Icon,
  accent,
}: {
  label: string;
  icon: typeof FolderOpen;
  accent: "amber" | "emerald" | "sky" | "violet" | "teal";
}) {
  const accents: Record<string, string> = {
    amber:   "border-amber-600/40 hover:bg-amber-950/40 text-amber-300",
    emerald: "border-emerald-600/40 hover:bg-emerald-950/40 text-emerald-300",
    sky:     "border-sky-600/40 hover:bg-sky-950/40 text-sky-300",
    violet:  "border-violet-600/40 hover:bg-violet-950/40 text-violet-300",
    teal:    "border-teal-600/40 hover:bg-teal-950/40 text-teal-300",
  };
  return (
    <button
      type="button"
      className={cn(
        "rounded-xl border bg-slate-900/40 backdrop-blur-sm p-4 flex flex-col items-start gap-2 transition-colors text-left",
        accents[accent],
      )}
      aria-label={`Open ${label}`}
    >
      <Icon className="w-5 h-5" aria-hidden />
      <span className="text-sm font-medium text-slate-200">{label}</span>
    </button>
  );
}
