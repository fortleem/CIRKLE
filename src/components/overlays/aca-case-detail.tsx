// @ts-nocheck
"use client";

/**
 * ACA Case Detail Overlay
 * ============================================================================
 * Fullscreen overlay showing a single formal ACA case.
 *
 * Tabs (17):
 *   Overview · Timeline · Evidence · Evidence Graph · People · Entities ·
 *   Services · Systems · Documents · Inspections · Contradictions ·
 *   Evidence Gaps · Hypotheses · Findings · Recommendations ·
 *   Corrective Actions · Audit Trail
 *
 * Each tab fetches from the relevant API endpoint (cases/[id] returns the full
 * case object; per-tab endpoints are derived from the same payload). All
 * fetches use relative paths with an 8s AbortController timeout.
 *
 * Special UI:
 *   - "NEXT BEST ACTION" card — surfaced from the case's workspace NBA
 *   - "Case Health" meter — 0..100 with readiness sub-score
 *   - "Challenge Finding" button — triggers the devil's advocate AI
 *     (records a challenge result on the workspace, surfaces the issues)
 *
 * Accessibility:
 *   - role="dialog" aria-modal (from <OverlayShell>)
 *   - Tab strip uses role="tablist" with roving tabindex + aria-selected
 *   - Each panel is role="tabpanel" aria-labelledby
 *   - All icon-only buttons have aria-label
 * ============================================================================
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Loader2, X, ChevronRight, Activity, FileText, Clock,
  Lock, ShieldCheck, Network, Users, Building, Server, FileSearch,
  ClipboardCheck, AlertOctagon, AlertTriangle, Lightbulb, Gavel,
  ListChecks, History, Gauge, Sparkles, ShieldAlert, Ban,
} from "lucide-react";

import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AcaCaseDetailProps {
  open: boolean;
  onClose: () => void;
  /** When the dashboard opens this overlay, it dispatches the caseId via the
   *  `circle:aca-case-detail` event. The host shell passes it through here. */
  caseId?: string | null;
}

type TabId =
  | "overview" | "timeline" | "evidence" | "evidence-graph"
  | "people" | "entities" | "services" | "systems"
  | "documents" | "inspections" | "contradictions" | "evidence-gaps"
  | "hypotheses" | "findings" | "recommendations"
  | "corrective-actions" | "audit-trail";

interface TabDef {
  id: TabId;
  label: string;
  icon: typeof FileText;
}

const TABS: TabDef[] = [
  { id: "overview",            label: "Overview",            icon: FileText },
  { id: "timeline",            label: "Timeline",            icon: Clock },
  { id: "evidence",            label: "Evidence",            icon: Lock },
  { id: "evidence-graph",      label: "Evidence Graph",      icon: Network },
  { id: "people",              label: "People",              icon: Users },
  { id: "entities",            label: "Entities",            icon: Building },
  { id: "services",            label: "Services",            icon: Server },
  { id: "systems",             label: "Systems",             icon: Activity },
  { id: "documents",           label: "Documents",           icon: FileSearch },
  { id: "inspections",         label: "Inspections",          icon: ClipboardCheck },
  { id: "contradictions",      label: "Contradictions",      icon: AlertOctagon },
  { id: "evidence-gaps",       label: "Evidence Gaps",       icon: AlertTriangle },
  { id: "hypotheses",          label: "Hypotheses",          icon: Lightbulb },
  { id: "findings",            label: "Findings",            icon: Gavel },
  { id: "recommendations",     label: "Recommendations",     icon: ShieldCheck },
  { id: "corrective-actions",  label: "Corrective Actions",  icon: ListChecks },
  { id: "audit-trail",         label: "Audit Trail",         icon: History },
];

// ────────────────────────────────────────────────────────────────────────────
//  Fetch hook with 8s timeout
// ────────────────────────────────────────────────────────────────────────────

function useAcaFetch<T = any>(endpoint: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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
  if (diff < 0) return "in the future";
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString();
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

function healthColor(score: number): string {
  if (score >= 75) return "text-emerald-300";
  if (score >= 50) return "text-amber-300";
  if (score >= 25) return "text-orange-300";
  return "text-rose-300";
}

function healthBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-400";
  if (score >= 50) return "bg-amber-400";
  if (score >= 25) return "bg-orange-400";
  return "bg-rose-400";
}

// ────────────────────────────────────────────────────────────────────────────
//  Main component
// ────────────────────────────────────────────────────────────────────────────

export function AcaCaseDetail({ open, onClose, caseId }: AcaCaseDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [challengeRunning, setChallengeRunning] = useState(false);
  const [challengeResult, setChallengeResult] = useState<any | null>(null);
  const tabStripRef = useRef<HTMLDivElement | null>(null);

  const endpoint = caseId ? `/api/aca/cases/${caseId}` : null;
  const { data: acase, loading, error, refresh } = useAcaFetch<any>(endpoint);

  // Reset active tab when switching cases.
  useEffect(() => {
    if (open) setActiveTab("overview");
    setChallengeResult(null);
  }, [open, caseId]);

  const runChallenge = useCallback(async () => {
    if (!caseId) return;
    setChallengeRunning(true);
    setChallengeResult(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`/api/aca/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "challenge_finding" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = await res.json().catch(() => null);
      // The PATCH endpoint may not implement challenge — derive client-side
      // from the case + workspace data instead.
      if (json?.challenge) {
        setChallengeResult(json.challenge);
        toast.success("Devil's advocate challenge complete", {
          description: `${json.challenge.challengesRaised.length} issue(s) raised.`,
        });
      } else {
        // Client-side fallback: synthesize a challenge based on the case shape.
        const ev = acase?.evidence ?? [];
        const challengesRaised: string[] = [];
        if (ev.length < 2) {
          challengesRaised.push("Single-source risk: fewer than two pieces of evidence.");
        }
        if (ev.length > 0 && ev.filter((e: any) => e.sealed).length === 0) {
          challengesRaised.push("No sealed evidence — every piece is still mutable.");
        }
        const methods = new Set(ev.map((e: any) => e.captureMethod));
        if (methods.size === 1 && ev.length > 0) {
          challengesRaised.push("Capture-method monoculture.");
        }
        const result = {
          challengeId: `cl_${Date.now().toString(36)}`,
          challengedAt: new Date().toISOString(),
          challengesRaised,
          conclusion:
            challengesRaised.length === 0 ? "supports_finding"
            : challengesRaised.length >= 3 ? "weakens_finding"
            : "inconclusive",
        };
        setChallengeResult(result);
        toast.success("Devil's advocate challenge complete (client-side)", {
          description: `${challengesRaised.length} issue(s) raised.`,
        });
      }
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      const msg = name === "AbortError" ? "Request timed out (8s)" : "Challenge failed.";
      toast.error(msg);
    } finally {
      setChallengeRunning(false);
    }
  }, [caseId, acase]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="ACA Case Detail"
      className="bg-gradient-to-br from-slate-950 via-charcoal to-slate-950 text-slate-100"
    >
      <div className="flex flex-col min-h-screen w-full overflow-hidden">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent("circle:aca-dashboard"));
              }}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 shrink-0"
              aria-label="Back to dashboard"
            >
              <ChevronRight className="w-4 h-4 rotate-180" aria-hidden />
              <span className="sr-only">Back to dashboard</span>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-slate-400">
                  {acase?.caseNumber ?? (loading ? "…" : "—")}
                </span>
                {acase?.status && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] uppercase", CASE_STATUS_COLORS[acase.status] || CASE_STATUS_COLORS.intake)}
                  >
                    {acase.status}
                  </Badge>
                )}
                {acase?.priority && (
                  <Badge variant="outline" className="text-[10px] uppercase border-slate-600 text-slate-300">
                    {acase.priority}
                  </Badge>
                )}
              </div>
              <h1 className="text-sm md:text-base font-semibold text-slate-100 truncate mt-0.5" title={acase?.title}>
                {acase?.title ?? (loading ? "Loading case…" : error ?? "Case not found")}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={loading || !caseId}
              className="text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
              aria-label="Refresh case"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
              aria-label="Close case detail"
            >
              <X className="w-4 h-4" aria-hidden />
            </Button>
          </div>
        </header>

        {/* ── DEV MODE banner ──────────────────────────────────────────── */}
        <div
          role="alert"
          aria-live="polite"
          className="w-full bg-amber-500/15 border-b border-amber-500/40 text-amber-200 px-5 md:px-8 py-2 flex items-center gap-2 text-xs md:text-sm shrink-0"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span className="font-semibold uppercase tracking-wide text-[11px]">DEV MODE — NO AUTH</span>
          <span className="text-amber-200/80 hidden md:inline">
            Two-person authorization is enforced structurally but the confirming agent is mock-permissive.
          </span>
        </div>

        {/* ── Key metrics strip ────────────────────────────────────────── */}
        <section
          aria-label="Case metrics"
          className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800/60 border-b border-slate-800 shrink-0"
        >
          <MetricCell
            label="Case Health"
            value={acase ? `${acase.caseHealth ?? 0}/100` : "—"}
            icon={Gauge}
            iconClass={acase ? healthColor(acase.caseHealth ?? 0) : "text-slate-500"}
            sub={acase ? `Readiness ${acase.caseReadiness ?? 0}/100` : undefined}
          />
          <MetricCell
            label="Evidence"
            value={acase ? `${acase.evidenceCount ?? 0}` : "—"}
            icon={Lock}
            iconClass="text-emerald-300"
            sub={acase?.workspace ? `${acase.workspace.openGaps ?? 0} open gap${acase.workspace.openGaps === 1 ? "" : "s"}` : undefined}
          />
          <MetricCell
            label="Findings"
            value={acase ? `${acase.findingsCount ?? 0}` : "—"}
            icon={Gavel}
            iconClass="text-violet-300"
            sub={acase?.workspace ? `${acase.workspace.openContradictions ?? 0} open contradiction${acase.workspace.openContradictions === 1 ? "" : "s"}` : undefined}
          />
          <MetricCell
            label="Hypotheses"
            value={acase ? `${acase.workspace?.hypothesesCount ?? 0}` : "—"}
            icon={Lightbulb}
            iconClass="text-amber-300"
            sub={acase?.workspace ? `${acase.workspace.openHypotheses ?? 0} open` : undefined}
          />
        </section>

        {/* ── Health meter ─────────────────────────────────────────────── */}
        {acase && (
          <div className="px-5 md:px-8 py-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
            <div className="flex items-center gap-3 mb-1.5">
              <Gauge className={cn("w-3.5 h-3.5", healthColor(acase.caseHealth ?? 0))} aria-hidden />
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Case Health Meter
              </span>
              <span className={cn("text-xs font-mono ml-auto", healthColor(acase.caseHealth ?? 0))}>
                {acase.caseHealth ?? 0} / 100
              </span>
            </div>
            <div
              className="h-2 rounded-full bg-slate-800 overflow-hidden"
              role="meter"
              aria-valuenow={acase.caseHealth ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Case health"
            >
              <div
                className={cn("h-full rounded-full transition-all", healthBarColor(acase.caseHealth ?? 0))}
                style={{ width: `${acase.caseHealth ?? 0}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Next Best Action ────────────────────────────────────────── */}
        {acase?.nextBestAction && (
          <div className="px-5 md:px-8 py-3 border-b border-slate-800 bg-slate-900/40 shrink-0">
            <div className="rounded-lg border border-amber-600/40 bg-amber-950/20 px-4 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-amber-300" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase tracking-wide font-bold text-amber-200">
                    Next Best Action
                  </span>
                  <Badge variant="outline" className="text-[9px] uppercase border-amber-600/50 text-amber-300">
                    {acase.nextBestAction.priority}
                  </Badge>
                  <span className="text-[10px] text-slate-500 ml-auto">
                    AI-assisted recommendation
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-snug">{acase.nextBestAction.action}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{acase.nextBestAction.rationale}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={runChallenge}
                disabled={challengeRunning || !acase}
                className="border-slate-600 text-slate-200 hover:bg-slate-800 shrink-0"
                aria-label="Run devil's advocate challenge"
              >
                {challengeRunning ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                )}
                Challenge Finding
              </Button>
            </div>
            {challengeResult && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 rounded-lg border border-rose-700/40 bg-rose-950/30 px-3 py-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-300" aria-hidden />
                  <span className="text-[10px] uppercase tracking-wide font-bold text-rose-200">
                    Devil's Advocate Result — {challengeResult.conclusion.replace(/_/g, " ")}
                  </span>
                </div>
                {challengeResult.challengesRaised.length === 0 ? (
                  <p className="text-xs text-slate-300">No challenges raised — the finding is supported.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                    {challengeResult.challengesRaised.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* ── Tab strip ───────────────────────────────────────────────── */}
        <nav
          aria-label="Case sections"
          className="border-b border-slate-800 bg-slate-950/40 shrink-0 overflow-x-auto scrollbar-thin"
        >
          <div
            ref={tabStripRef}
            role="tablist"
            aria-orientation="horizontal"
            className="flex gap-1 px-3 md:px-5 py-2 min-w-max"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`aca-tab-${t.id}`}
                  aria-selected={isActive}
                  aria-controls={`aca-panel-${t.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-slate-200 text-slate-900"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── Tab panel ───────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
            {loading && !acase && (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-12 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Loading case…
              </div>
            )}
            {error && !acase && (
              <div className="rounded-xl border border-rose-700/50 bg-rose-950/40 p-4 text-rose-200 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4" aria-hidden />
                  <span className="font-medium">Failed to load case</span>
                </div>
                <p className="text-xs">{error}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={refresh}
                  className="mt-3 border-rose-600/50 text-rose-200 hover:bg-rose-950"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                  Retry
                </Button>
              </div>
            )}
            {acase && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  role="tabpanel"
                  id={`aca-panel-${activeTab}`}
                  aria-labelledby={`aca-tab-${activeTab}`}
                >
                  <TabPanel tab={activeTab} acase={acase} />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-800/60 bg-slate-950/40 px-5 md:px-8 py-2.5 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" aria-hidden />
            ACA Case Detail — sovereign layer
          </span>
          <span className="font-mono">ACA-SOVEREIGN-IMPL</span>
        </footer>
      </div>
    </OverlayShell>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Metric cell
// ────────────────────────────────────────────────────────────────────────────

function MetricCell({
  label,
  value,
  icon: Icon,
  iconClass,
  sub,
}: {
  label: string;
  value: string;
  icon: typeof Gauge;
  iconClass: string;
  sub?: string;
}) {
  return (
    <div className="px-4 py-3 bg-slate-950/40">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-3.5 h-3.5", iconClass)} aria-hidden />
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className="text-lg font-bold tabular-nums text-slate-100 leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Tab panel router
// ────────────────────────────────────────────────────────────────────────────

function TabPanel({ tab, acase }: { tab: TabId; acase: any }) {
  switch (tab) {
    case "overview":           return <OverviewTab acase={acase} />;
    case "timeline":           return <TimelineTab acase={acase} />;
    case "evidence":           return <EvidenceTab acase={acase} />;
    case "evidence-graph":     return <EvidenceGraphTab acase={acase} />;
    case "people":             return <SimpleListTab title="People" emptyMsg="People are derived from evidence + assignments (building phase)." items={[]} />;
    case "entities":           return <SimpleListTab title="Entities" emptyMsg="Entities (institutions, departments) will appear here." items={[]} />;
    case "services":           return <SimpleListTab title="Services" emptyMsg={acase.service ? `Service: ${acase.service}` : "No service linked to this case."} items={acase.service ? [{ id: acase.service, label: acase.service, sub: "linked service" }] : []} />;
    case "systems":            return <SimpleListTab title="Systems" emptyMsg="System records (IT systems, registries) will appear here." items={[]} />;
    case "documents":          return <SimpleListTab title="Documents" emptyMsg="Documentary evidence is listed under Evidence (type: document)." items={[]} />;
    case "inspections":        return <SimpleListTab title="Inspections" emptyMsg="On-site inspection records will appear here." items={[]} />;
    case "contradictions":     return <ContradictionsTab acase={acase} />;
    case "evidence-gaps":      return <EvidenceGapsTab acase={acase} />;
    case "hypotheses":         return <HypothesesTab acase={acase} />;
    case "findings":           return <FindingsTab acase={acase} />;
    case "recommendations":    return <RecommendationsTab acase={acase} />;
    case "corrective-actions": return <CorrectiveActionsTab acase={acase} />;
    case "audit-trail":        return <AuditTrailTab acase={acase} />;
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Individual tab panels
// ────────────────────────────────────────────────────────────────────────────

function EmptyTab({ icon: Icon, title, message }: { icon: typeof Ban; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="w-10 h-10 rounded-full bg-slate-800/60 flex items-center justify-center">
        <Icon className="w-5 h-5 text-slate-500" aria-hidden />
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">{message}</p>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b border-slate-800/60">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-200 break-words">{value || "—"}</dd>
    </div>
  );
}

function OverviewTab({ acase }: { acase: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="text-sm font-medium text-slate-200 mb-3">Case Description</h3>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {acase.description || "No description provided."}
        </p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="text-sm font-medium text-slate-200 mb-2">Properties</h3>
        <dl>
          <FieldRow label="Case Number" value={<span className="font-mono">{acase.caseNumber}</span>} />
          <FieldRow label="Status" value={<span className="capitalize">{acase.status}</span>} />
          <FieldRow label="Priority" value={<span className="capitalize">{acase.priority}</span>} />
          <FieldRow label="Department" value={acase.department} />
          <FieldRow label="Service" value={acase.service} />
          <FieldRow label="Geography" value={acase.geography} />
          <FieldRow label="Lead Agent" value={acase.assignedAgentName || acase.assignedAgent || "Unassigned"} />
          <FieldRow label="Supporting Agents" value={acase.supportingAgents?.length || 0} />
          <FieldRow label="Related Cases" value={acase.relatedCases?.length || 0} />
          <FieldRow label="Created From Signal" value={acase.createdFromSignal || "—"} />
          <FieldRow label="Created At" value={timeAgo(acase.createdAt)} />
          <FieldRow label="Updated At" value={timeAgo(acase.updatedAt)} />
          {acase.closedAt && <FieldRow label="Closed At" value={timeAgo(acase.closedAt)} />}
          {acase.closureReason && <FieldRow label="Closure Reason" value={acase.closureReason} />}
        </dl>
      </div>
      {acase.twoPersonState && (
        <div className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-amber-300" aria-hidden />
            <h3 className="text-sm font-medium text-amber-200">Two-Person Authorization Pending</h3>
          </div>
          <p className="text-xs text-slate-300">
            Action <span className="font-mono">{acase.twoPersonState.pendingAction}</span> initiated by{" "}
            <span className="font-mono">{acase.twoPersonState.initiatedBy}</span> at {timeAgo(acase.twoPersonState.initiatedAt)}.
          </p>
          {acase.twoPersonState.confirmedBy ? (
            <p className="text-xs text-emerald-300 mt-1">
              Confirmed by {acase.twoPersonState.confirmedBy} at {timeAgo(acase.twoPersonState.confirmedAt)}.
            </p>
          ) : (
            <p className="text-xs text-amber-300/80 mt-1">
              Awaiting confirmation from a different authorized agent.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineTab({ acase }: { acase: any }) {
  const events = acase.timeline ?? [];
  if (events.length === 0) return <EmptyTab icon={Clock} title="No timeline events" message="Timeline events are recorded as the case progresses." />;
  return (
    <ol className="relative border-l border-slate-700 pl-6 space-y-4">
      {events.map((ev: any, i: number) => (
        <li key={ev.eventId || i} className="relative">
          <span
            className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-900"
            aria-hidden
          />
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <Badge variant="outline" className="text-[10px] uppercase border-slate-600 text-slate-300">
              {ev.kind.replace(/_/g, " ")}
            </Badge>
            <span className="text-[11px] text-slate-500">{timeAgo(ev.timestamp)}</span>
          </div>
          <p className="text-sm text-slate-200">{ev.summary}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">by {ev.actorDisplayName}</p>
        </li>
      ))}
    </ol>
  );
}

function EvidenceTab({ acase }: { acase: any }) {
  const evidence = acase.evidence ?? [];
  if (evidence.length === 0) return <EmptyTab icon={Lock} title="No evidence yet" message="Submit evidence via the evidence manager or POST /api/aca/evidence." />;
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {evidence.map((ev: any) => (
        <li key={ev.evidenceId} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className={cn("w-4 h-4 shrink-0", ev.sealed ? "text-emerald-300" : "text-amber-300")} aria-hidden />
              <span className="text-sm text-slate-200 truncate">{ev.label}</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase shrink-0",
                ev.sealed ? "border-emerald-600/50 text-emerald-300" : "border-amber-600/50 text-amber-300",
              )}
            >
              {ev.sealed ? "Sealed" : "Unsealed"}
            </Badge>
          </div>
          <dl className="text-[11px] text-slate-400 space-y-0.5">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Type</dt>
              <dd className="text-slate-300">{ev.type}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Capture</dt>
              <dd className="text-slate-300">{ev.captureMethod?.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Captured</dt>
              <dd className="text-slate-300">{timeAgo(ev.capturedAt)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Hash</dt>
              <dd className="text-slate-300 font-mono truncate max-w-[180px]" title={ev.integrityHash}>
                {ev.integrityHash ? ev.integrityHash.slice(0, 16) + "…" : "—"}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function EvidenceGraphTab({ acase }: { acase: any }) {
  const evidence = acase.evidence ?? [];
  if (evidence.length === 0) return <EmptyTab icon={Network} title="Evidence graph empty" message="The evidence graph visualizes relationships between evidence, people, entities, and systems (building phase)." />;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-sm font-medium text-slate-200 mb-3">Evidence Graph (text representation)</h3>
      <ul className="space-y-2 text-xs text-slate-300">
        {evidence.map((ev: any) => (
          <li key={ev.evidenceId} className="flex items-center gap-2">
            <Lock className={cn("w-3 h-3", ev.sealed ? "text-emerald-300" : "text-amber-300")} aria-hidden />
            <span className="text-slate-200">{ev.label}</span>
            <span className="text-slate-500">—captured by→</span>
            <span className="text-slate-300">{ev.capturedByName || ev.capturedBy}</span>
            <span className="text-slate-500">—on→</span>
            <span className="text-slate-300">{timeAgo(ev.capturedAt)}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-500 mt-4">
        Visual graph rendering is a future iteration; this view shows the structural relationships.
      </p>
    </div>
  );
}

function SimpleListTab({ title, items, emptyMsg }: { title: string; items: { id: string; label: string; sub?: string }[]; emptyMsg: string }) {
  if (items.length === 0) {
    return <EmptyTab icon={FileSearch} title={title} message={emptyMsg} />;
  }
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-200 truncate">{it.label}</p>
            {it.sub && <p className="text-[11px] text-slate-500">{it.sub}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ContradictionsTab({ acase }: { acase: any }) {
  // Contradictions live on the workspace, not the case — surface workspace summary.
  const ws = acase.workspace;
  if (!ws || ws.contradictionsCount === 0) {
    return <EmptyTab icon={AlertOctagon} title="No contradictions" message="Contradictions are registered on the case workspace when evidence points in different directions." />;
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-sm font-medium text-slate-200 mb-2">Contradictions Summary</h3>
      <dl className="text-sm space-y-1">
        <div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="text-slate-300">{ws.contradictionsCount}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Open</dt><dd className="text-rose-300">{ws.openContradictions}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Resolved</dt><dd className="text-emerald-300">{ws.contradictionsCount - ws.openContradictions}</dd></div>
      </dl>
      <p className="text-[11px] text-slate-500 mt-3">
        Detailed contradiction records will be rendered here in a future iteration (workspace API extension).
      </p>
    </div>
  );
}

function EvidenceGapsTab({ acase }: { acase: any }) {
  const ws = acase.workspace;
  if (!ws || ws.evidenceGapsCount === 0) {
    return <EmptyTab icon={AlertTriangle} title="No evidence gaps" message="Evidence gaps are registered on the case workspace when required evidence is missing." />;
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-sm font-medium text-slate-200 mb-2">Evidence Gaps Summary</h3>
      <dl className="text-sm space-y-1">
        <div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="text-slate-300">{ws.evidenceGapsCount}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Open</dt><dd className="text-amber-300">{ws.openGaps}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Blocking findings</dt><dd className="text-rose-300">{ws.blockingGaps}</dd></div>
      </dl>
    </div>
  );
}

function HypothesesTab({ acase }: { acase: any }) {
  const ws = acase.workspace;
  if (!ws || ws.hypothesesCount === 0) {
    return <EmptyTab icon={Lightbulb} title="No hypotheses" message="Register alternative hypotheses on the workspace (procedural error, system failure, legitimate exception, negligence, process weakness, potential misconduct)." />;
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-sm font-medium text-slate-200 mb-2">Hypotheses Summary</h3>
      <dl className="text-sm space-y-1">
        <div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="text-slate-300">{ws.hypothesesCount}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Open</dt><dd className="text-amber-300">{ws.openHypotheses}</dd></div>
      </dl>
      <p className="text-[11px] text-slate-500 mt-3">
        Use "Challenge Finding" in the top strip to run a devil's advocate pass on an open hypothesis.
      </p>
    </div>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  informational: "border-slate-600 text-slate-300",
  minor:         "border-sky-600/50 text-sky-300",
  major:         "border-amber-600/50 text-amber-300",
  critical:      "border-rose-600/60 text-rose-300",
};

function FindingsTab({ acase }: { acase: any }) {
  const findings = acase.findings ?? [];
  if (findings.length === 0) return <EmptyTab icon={Gavel} title="No findings yet" message="Findings are issued after the investigation stage and a devil's advocate challenge." />;
  return (
    <ul className="space-y-3">
      {findings.map((f: any) => (
        <li key={f.findingId} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Gavel className="w-4 h-4 text-violet-300" aria-hidden />
            <span className="text-sm font-medium text-slate-200">{f.title}</span>
            <Badge variant="outline" className={cn("text-[10px] uppercase", SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.minor)}>
              {f.severity}
            </Badge>
            <span className="text-[11px] text-slate-500 ml-auto">issued {timeAgo(f.issuedAt)}</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{f.description}</p>
          <p className="text-[11px] text-slate-500 mt-2">Issued by {f.issuedByName} · {f.supportingEvidence?.length || 0} supporting evidence</p>
          {f.challengedBy && (
            <p className="text-[11px] text-amber-300 mt-1">⚠ Challenged — see workspace.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

const REC_STATUS_COLORS: Record<string, string> = {
  open:         "border-amber-600/50 text-amber-300",
  accepted:     "border-sky-600/50 text-sky-300",
  rejected:     "border-rose-600/50 text-rose-300",
  implemented:  "border-emerald-600/50 text-emerald-300",
  overdue:      "border-rose-600/60 text-rose-300",
};

function RecommendationsTab({ acase }: { acase: any }) {
  const recs = acase.recommendations ?? [];
  if (recs.length === 0) return <EmptyTab icon={ShieldCheck} title="No recommendations" message="Recommendations are issued after findings, addressed to the responsible entity." />;
  return (
    <ul className="space-y-3">
      {recs.map((r: any) => (
        <li key={r.recommendationId} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <ShieldCheck className="w-4 h-4 text-teal-300" aria-hidden />
            <span className="text-sm font-medium text-slate-200">{r.title}</span>
            <Badge variant="outline" className={cn("text-[10px] uppercase", REC_STATUS_COLORS[r.status] || REC_STATUS_COLORS.open)}>
              {r.status}
            </Badge>
            <span className="text-[11px] text-slate-500 ml-auto">issued {timeAgo(r.issuedAt)}</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{r.description}</p>
          <p className="text-[11px] text-slate-500 mt-2">
            {r.targetEntity ? `Target: ${r.targetEntity}` : ""}
            {r.targetService ? ` · ${r.targetService}` : ""}
            {r.dueDate ? ` · due ${timeAgo(r.dueDate)}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

const CA_STATUS_COLORS: Record<string, string> = {
  pending:     "border-slate-600 text-slate-300",
  in_progress: "border-amber-600/50 text-amber-300",
  completed:   "border-emerald-600/50 text-emerald-300",
  overdue:     "border-rose-600/60 text-rose-300",
  cancelled:   "border-slate-700 text-slate-400",
};

function CorrectiveActionsTab({ acase }: { acase: any }) {
  const cas = acase.correctiveActions ?? [];
  if (cas.length === 0) return <EmptyTab icon={ListChecks} title="No corrective actions" message="Corrective actions are tracked from recommendation to closure." />;
  return (
    <ul className="space-y-3">
      {cas.map((c: any) => (
        <li key={c.actionId} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <ListChecks className="w-4 h-4 text-teal-300" aria-hidden />
            <span className="text-sm font-medium text-slate-200">{c.title}</span>
            <Badge variant="outline" className={cn("text-[10px] uppercase", CA_STATUS_COLORS[c.status] || CA_STATUS_COLORS.pending)}>
              {c.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500">
            Owner: {c.owner}{c.dueDate ? ` · due ${timeAgo(c.dueDate)}` : ""}{c.completedAt ? ` · completed ${timeAgo(c.completedAt)}` : ""}
          </p>
          {c.verificationNotes && (
            <p className="text-xs text-slate-400 mt-2 italic">{c.verificationNotes}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function AuditTrailTab({ acase }: { acase: any }) {
  const trail = acase.auditTrail ?? [];
  if (trail.length === 0) return <EmptyTab icon={History} title="No audit entries" message="The audit trail is append-only and records every case lifecycle action." />;
  return (
    <ol className="space-y-2">
      {trail.map((a: any, i: number) => (
        <li key={a.auditId || i} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 flex items-start gap-3">
          <div className={cn(
            "w-6 h-6 rounded shrink-0 flex items-center justify-center",
            a.result === "success" ? "bg-emerald-500/15" : a.result === "denied" ? "bg-rose-500/15" : "bg-amber-500/15",
          )}>
            {a.result === "success" ? (
              <ShieldCheck className="w-3 h-3 text-emerald-300" aria-hidden />
            ) : a.result === "denied" ? (
              <Ban className="w-3 h-3 text-rose-300" aria-hidden />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-300" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-200">{a.action}</span>
              <span className="text-[11px] text-slate-500">{timeAgo(a.timestamp)}</span>
              {a.twoPersonPartnerAgentId && (
                <Badge variant="outline" className="text-[9px] uppercase border-amber-600/50 text-amber-300">
                  2-person
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              by {a.actorAgentId}
              {a.before ? ` · ${a.before} → ${a.after}` : a.after ? ` · → ${a.after}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
