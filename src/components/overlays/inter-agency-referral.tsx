// @ts-nocheck
/**
 * InterAgencyReferral — overlay component
 * ============================================================================
 * Admin overlay showing active inter-agency referrals between institutions.
 *
 * Institutional dark theme (admin overlay). Each referral card displays:
 *   • from / to institution
 *   • correlation id (cross-institution, never a shared case id)
 *   • purpose
 *   • status (pending → acknowledged → responded → completed)
 *   • provenance chain (last 3 entries)
 *
 * "Create Referral" form lets an operator initiate a new referral. The
 * receiving institution is NOT notified until it polls / is polled by
 * its adapter — Circle never fabricates an acknowledgement (Rule 1 — no
 * fabricated dispatch).
 *
 * Dispatches `circle:inter-agency-referral` on open.
 *
 * Accessibility:
 *   • role="dialog" + aria-modal provided by <OverlayShell>
 *   • Status badges paired with sr-only text
 *   • All icon-only buttons have aria-label
 *   • All form fields have associated <Label>
 *   • Fetches use relative paths and an 8s AbortController timeout
 * ============================================================================
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X, RefreshCw, Loader2, ArrowRight, Link2, FileClock, AlertCircle,
  CheckCircle2, Clock, Send, Building2, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Types (mirror src/lib/inter-agency-exchange.ts) ─────────────────────────

type ReferralStatus =
  | "pending" | "acknowledged" | "responded" | "completed" | "rejected" | "failed";

interface ProvenanceEntry {
  at: string;
  actor: string;
  institution: string;
  action: string;
  detail?: string;
}

interface InterAgencyReferral {
  referralId: string;
  fromInstitution: string;
  toInstitution: string;
  citizenSubmission: string;
  correlationId: string;
  fromCaseId?: string;
  toCaseId?: string;
  purpose: string;
  status: ReferralStatus;
  provenance: ProvenanceEntry[];
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  total: number;
  referrals: InterAgencyReferral[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<ReferralStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  acknowledged: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  responded: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  failed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const STATUS_ICON: Record<ReferralStatus, LucideIcon> = {
  pending: Clock,
  acknowledged: CheckCircle2,
  responded: ArrowRight,
  completed: CheckCircle2,
  rejected: AlertCircle,
  failed: AlertCircle,
};

const FETCH_TIMEOUT_MS = 8_000;

// ── Helpers ────────────────────────────────────────────────────────────────

function shortId(id: string): string {
  if (!id) return "—";
  return id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function InterAgencyReferral({ open, onClose }: Props) {
  const [list, setList] = useState<InterAgencyReferral[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // form
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fSubmission, setFSubmission] = useState("");
  const [fFromCase, setFFromCase] = useState("");
  const [fPurpose, setFPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const titleId = "inter-agency-referral-title";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout("/api/federation/referrals", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as ListResponse;
      setList(payload.referrals || []);
    } catch (e) {
      const msg = String((e as Error)?.message || e || "Failed to load referrals.");
      setError(msg);
      toast.error("Couldn't load referrals", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("circle:inter-agency-referral", {
          detail: { open: true, at: new Date().toISOString() },
        }),
      );
    }
    load();
  }, [open, load]);

  const submit = useCallback(async () => {
    if (!fFrom.trim() || !fTo.trim() || !fSubmission.trim() || !fPurpose.trim()) {
      toast.error("All required fields must be filled.");
      return;
    }
    if (fFrom.trim() === fTo.trim()) {
      toast.error("From and To institutions must differ.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithTimeout("/api/federation/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromInstitution: fFrom.trim(),
          toInstitution: fTo.trim(),
          citizenSubmission: fSubmission.trim(),
          fromCaseId: fFromCase.trim() || undefined,
          purpose: fPurpose.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      toast.success("Referral created", {
        description: "The receiving institution will be polled by its adapter.",
      });
      setFFrom("");
      setFTo("");
      setFSubmission("");
      setFFromCase("");
      setFPurpose("");
      setShowForm(false);
      await load();
    } catch (e) {
      const msg = String((e as Error)?.message || e || "Submit failed.");
      toast.error("Referral creation failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }, [fFrom, fTo, fSubmission, fFromCase, fPurpose, load]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="dialog"
      maxWidth="max-w-4xl"
      ariaLabel="Inter-Agency Referral Tracker"
      titleId={titleId}
      className="bg-charcoal-950/80"
    >
      <div
        className="bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="document"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg bg-zinc-800 grid place-items-center shrink-0" aria-hidden="true">
              <ArrowRight className="size-5 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold leading-tight">
                Inter-Agency Referral Tracker
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                No shared government case — each institution retains its own
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={load}
              disabled={loading}
              aria-label="Refresh referrals"
              className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowForm((s) => !s)}
              aria-expanded={showForm}
              aria-controls="new-referral-form"
            >
              <Link2 className="size-4" />
              <span className="hidden sm:inline">New Referral</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label="Close referral tracker"
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Notice */}
          <div
            className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200"
            role="note"
          >
            <Link2 className="inline size-4 mr-1.5 -mt-0.5" aria-hidden="true" />
            A referral establishes a correlation between two institutions'
            independent cases — it does NOT merge them. Each institution
            retains its own case under its own namespace (PART XXXI).
          </div>

          {/* Form */}
          {showForm && (
            <motion.section
              id="new-referral-form"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
              aria-label="Create a new inter-agency referral"
            >
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Send className="size-4" aria-hidden="true" />
                Create Referral
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-from" className="text-xs text-zinc-300">
                    From Institution *
                  </Label>
                  <Input
                    id="r-from"
                    value={fFrom}
                    onChange={(e) => setFFrom(e.target.value)}
                    placeholder="INST-POLICE-SEED"
                    className="bg-zinc-950 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-to" className="text-xs text-zinc-300">
                    To Institution *
                  </Label>
                  <Input
                    id="r-to"
                    value={fTo}
                    onChange={(e) => setFTo(e.target.value)}
                    placeholder="INST-ACA-SEED"
                    className="bg-zinc-950 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-submission" className="text-xs text-zinc-300">
                    Citizen Submission *
                  </Label>
                  <Input
                    id="r-submission"
                    value={fSubmission}
                    onChange={(e) => setFSubmission(e.target.value)}
                    placeholder="SUB-xxxx"
                    className="bg-zinc-950 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-fromCase" className="text-xs text-zinc-300">
                    From Case ID (optional)
                  </Label>
                  <Input
                    id="r-fromCase"
                    value={fFromCase}
                    onChange={(e) => setFFromCase(e.target.value)}
                    placeholder="P-001"
                    className="bg-zinc-950 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="r-purpose" className="text-xs text-zinc-300">
                    Purpose *
                  </Label>
                  <Textarea
                    id="r-purpose"
                    value={fPurpose}
                    onChange={(e) => setFPurpose(e.target.value)}
                    placeholder="Why is the originating institution referring this citizen submission?"
                    rows={3}
                    className="bg-zinc-950 border-zinc-700 text-zinc-100 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Create
                </Button>
              </div>
            </motion.section>
          )}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 flex items-start gap-2"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium">Failed to load referrals.</p>
                <p className="text-rose-300/80">{error}</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && list.length === 0 && (
            <div className="space-y-3" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Referral cards */}
          {!loading && list.length > 0 && (
            <ul
              className="space-y-3"
              role="list"
              aria-label="Active inter-agency referrals"
            >
              {list.map((r) => {
                const StatusIcon = STATUS_ICON[r.status];
                return (
                  <motion.li
                    key={r.referralId}
                    role="listitem"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
                  >
                    <header className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="size-4 text-zinc-400 shrink-0" aria-hidden="true" />
                        <span className="text-sm font-mono truncate">
                          {shortId(r.fromInstitution)}
                          <ArrowRight className="inline size-3 mx-1 text-zinc-500" aria-hidden="true" />
                          {shortId(r.toInstitution)}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("border", STATUS_VARIANT[r.status])}
                      >
                        <StatusIcon className="size-3" aria-hidden="true" />
                        {r.status}
                        <span className="sr-only">status: {r.status}</span>
                      </Badge>
                    </header>

                    <p className="text-xs text-zinc-300 mb-2 line-clamp-2">
                      {r.purpose}
                    </p>

                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-2">
                      <div>
                        <dt className="text-zinc-500">Correlation</dt>
                        <dd className="text-zinc-200 font-mono">
                          {shortId(r.correlationId)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">From Case</dt>
                        <dd className="text-zinc-200 font-mono">
                          {r.fromCaseId ? shortId(r.fromCaseId) : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">To Case</dt>
                        <dd className="text-zinc-200 font-mono">
                          {r.toCaseId ? shortId(r.toCaseId) : "pending"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Updated</dt>
                        <dd className="text-zinc-200 flex items-center gap-1">
                          <Clock className="size-3" aria-hidden="true" />
                          {timeAgo(r.updatedAt)}
                        </dd>
                      </div>
                    </dl>

                    {/* Provenance (last 3) */}
                    {r.provenance.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-800">
                        <p className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1">
                          <FileClock className="size-3" aria-hidden="true" />
                          Provenance
                        </p>
                        <ol className="space-y-0.5 text-[11px] text-zinc-400">
                          {r.provenance.slice(-3).map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-zinc-600 shrink-0">
                                {timeAgo(p.at)}
                              </span>
                              <span className="truncate">
                                <span className="text-zinc-300">{p.action}</span>
                                {p.detail ? ` — ${p.detail}` : ""}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}

          {/* Empty state */}
          {!loading && !error && list.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              <Link2 className="size-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p className="text-sm">No active referrals.</p>
              <p className="text-xs mt-1">
                Click “New Referral” to initiate an inter-agency exchange.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-800 px-5 py-3 flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-900/60">
          <span>{list.length} referrals</span>
          <span>Rule 2 — no silent cross-institutional sharing</span>
        </footer>
      </div>
    </OverlayShell>
  );
}
