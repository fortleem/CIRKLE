// @ts-nocheck
"use client";

/**
 * AI Governance Panel — §113–§119, §LXXX–§LXXXII
 *
 * Four sections:
 *   1. AI Data Access Broker — recent AI access requests + authorized scope.
 *   2. AI Kill Switch — every AI model / feature / integration / workflow
 *      with enable / disable toggles. Emergency disable-all.
 *   3. AI Automation Levels — L0–L4 per AI feature.
 *   4. AI Incident log — recent incidents (model, version, impact, correction).
 *
 * Banner: AI cannot independently declare guilt, impose discipline, issue
 * authoritative findings, unmask protected identities, destroy evidence, or
 * close sensitive investigations.
 *
 * Dispatches: `circle:ai-governance`
 */

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, RefreshCw, Loader2, BrainCog, Power, ShieldAlert, AlertTriangle,
  ToggleLeft, ToggleRight, Lock, Unlock, Activity, Bug, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── API shapes ────────────────────────────────────────────────────────────

interface KillSwitchState {
  featureId: string;
  modelName?: string;
  featureName: string;
  scope: "model" | "feature" | "integration" | "workflow";
  status: "active" | "disabled" | "killed";
  disabledBy?: string;
  disabledAt?: string;
  reason?: string;
  enabledBy?: string;
  enabledAt?: string;
}

interface AccessLogEntry {
  logId: string;
  requestId: string;
  institution: string;
  model: string;
  modelVersion?: string;
  policy: string;
  sourceRecords: string[];
  retrievalSet: string[];
  timestamp: string;
  decision: string;
  purpose: string;
  caseRef?: string;
}

interface AutomationConfig {
  featureId: string;
  featureName: string;
  institution: string;
  level: number;
  levelLabel?: string;
  levelDescription?: string;
  auditTrail?: Array<{ timestamp: string; previousLevel: number; newLevel: number; setBy: string; reason: string }>;
}

// ── Visual metadata ───────────────────────────────────────────────────────

const SCOPE_ICON: Record<string, LucideIcon> = {
  model: BrainCog,
  feature: Activity,
  integration: ShieldAlert,
  workflow: Power,
};

const DECISION_COLOR: Record<string, string> = {
  allow: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  deny: "bg-destructive/15 text-destructive border-destructive/40",
  require_approval: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  escalate: "bg-orange-500/15 text-orange-500 border-orange-500/40",
};

const LEVEL_COLOR: Record<number, string> = {
  0: "bg-muted/40 text-muted-foreground border-border/40",
  1: "bg-primary/15 text-primary border-primary/40",
  2: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  3: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  4: "bg-destructive/15 text-destructive border-destructive/40",
};

// Seed incidents so the AI incident log isn't empty on first load.
const SEED_INCIDENTS = [
  {
    incidentId: "AI-INC-001",
    model: "GLM-4 Vision",
    modelVersion: "v1.2",
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    impact: "Hallucinated OCR text on a low-resolution scan — flagged for human review.",
    correction: "Vision model auto-disabled; transcribed evidence routed through Whisper-AR instead.",
    status: "resolved",
  },
  {
    incidentId: "AI-INC-002",
    model: "NLLB-200",
    modelVersion: "v3.1",
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
    impact: "Translation drift on legal term 'تزوير' — output 'forgery' instead of 'falsification'.",
    correction: "Translation dictionary updated; rule POL-ACA-004 enforced manual review.",
    status: "resolved",
  },
  {
    incidentId: "AI-INC-003",
    model: "GLM-4 General",
    modelVersion: "v2.0",
    timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
    impact: "Attempted to declare guilt in an investigation summary (prohibited action).",
    correction: "Kill switch engaged on ai:finding-to-rule; L4 (prohibited) policy applied.",
    status: "resolved",
  },
];

function fetchWithTimeout(input: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(input, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// ── Component ─────────────────────────────────────────────────────────────

export function AIGovernancePanel({ open, onClose }: Props) {
  const [section, setSection] = useState<
    "broker" | "kill-switch" | "automation" | "incidents"
  >("broker");

  const [killStates, setKillStates] = useState<KillSwitchState[]>([]);
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [automationConfigs, setAutomationConfigs] = useState<AutomationConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // New access request form
  const [requestForm, setRequestForm] = useState({
    institution: "aca",
    aiModel: "GLM-4 General",
    purpose: "summarize",
    requestedData: "evidence:metadata:EV-ACA-0001",
    policy: "POL-ACA-001",
    caseRef: "",
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [killRes, autoRes] = await Promise.all([
        fetchWithTimeout(`/api/ai/kill-switch`, { cache: "no-store" }),
        fetchWithTimeout(`/api/ai/automation-level`, { cache: "no-store" }),
      ]);
      if (killRes.ok) {
        const kj = await killRes.json();
        setKillStates(kj.states ?? []);
      }
      if (autoRes.ok) {
        const aj = await autoRes.json();
        setAutomationConfigs(aj.configs ?? []);
      }
      // Access log is best-effort: the broker endpoint is POST-only; we keep
      // the local log seeded by fetching the most-recent well-known shape.
      setAccessLog([]);
    } catch (e) {
      toast.error("Couldn't load AI governance data", {
        description: String((e as Error)?.message || e),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchAll();
      window.dispatchEvent(new CustomEvent("circle:ai-governance"));
    }
  }, [open, fetchAll]);

  async function toggleKill(state: KillSwitchState) {
    const action = state.status === "active" ? "disable" : "enable";
    if (action === "enable") {
      const authorization = window.prompt(
        `Re-enabling ${state.featureId} requires explicit authorization. Enter authorization token / reason:`,
      );
      if (!authorization) return;
      try {
        const res = await fetchWithTimeout(`/api/ai/kill-switch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "enable",
            featureId: state.featureId,
            by: "admin",
            reason: authorization,
            authorization,
            scope: state.scope,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success(`Re-enabled: ${state.featureName}`, { description: `Authorization: ${authorization}` });
      } catch (e) {
        toast.error("Failed to enable", { description: String((e as Error)?.message || e) });
      }
      void fetchAll();
      return;
    }
    const reason = window.prompt(
      `Disabling ${state.featureId}. Provide a reason (audited):`,
    );
    if (!reason) return;
    try {
      const res = await fetchWithTimeout(`/api/ai/kill-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disable",
          featureId: state.featureId,
          by: "admin",
          reason,
          scope: state.scope,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Disabled: ${state.featureName}`, { description: reason });
    } catch (e) {
      toast.error("Failed to disable", { description: String((e as Error)?.message || e) });
    }
    void fetchAll();
  }

  async function emergencyDisableAll() {
    const by = window.prompt("Emergency disable ALL AI capabilities. Enter your operator ID:");
    if (!by) return;
    const reason = window.prompt("Reason (audited, cannot be empty):");
    if (!reason) return;
    try {
      const res = await fetchWithTimeout(
        `/api/ai/kill-switch?by=${encodeURIComponent(by)}&reason=${encodeURIComponent(reason)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      toast.error(`Emergency kill switch engaged`, {
        description: `Disabled ${payload.disabled} AI capabilities. Platform will remain in degraded mode until re-enabled individually.`,
      });
    } catch (e) {
      toast.error("Emergency disable failed", { description: String((e as Error)?.message || e) });
    }
    void fetchAll();
  }

  async function submitAccessRequest() {
    setSubmittingRequest(true);
    try {
      const res = await fetchWithTimeout(`/api/ai/access-broker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution: requestForm.institution,
          aiModel: requestForm.aiModel,
          purpose: requestForm.purpose,
          requestedData: requestForm.requestedData.split(",").map((s) => s.trim()).filter(Boolean),
          policy: requestForm.policy,
          caseRef: requestForm.caseRef || undefined,
          requesterId: requestForm.aiModel,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? `HTTP ${res.status}`);
      // Prepend to access log
      const entry: AccessLogEntry = {
        logId: `AI-LOG-${Date.now()}`,
        requestId: payload.request?.requestId ?? "unknown",
        institution: payload.request?.institution ?? requestForm.institution,
        model: payload.request?.aiModel ?? requestForm.aiModel,
        policy: payload.request?.policy ?? requestForm.policy,
        sourceRecords: payload.request?.requestedData ?? [],
        retrievalSet: payload.authorizedScope ?? [],
        timestamp: payload.evaluatedAt ?? new Date().toISOString(),
        decision: payload.decision,
        purpose: payload.request?.purpose ?? requestForm.purpose,
        caseRef: payload.request?.caseRef ?? requestForm.caseRef,
      };
      setAccessLog((prev) => [entry, ...prev]);
      toast.success(`Decision: ${payload.decision}`, {
        description: payload.reason,
      });
    } catch (e) {
      toast.error("Access request failed", { description: String((e as Error)?.message || e) });
    } finally {
      setSubmittingRequest(false);
    }
  }

  const activeCount = useMemo(
    () => killStates.filter((s) => s.status === "active").length,
    [killStates],
  );
  const disabledCount = killStates.length - activeCount;

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="AI Governance — Data Access Broker, Kill Switch, Automation Levels, Incidents">
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel/30 to-charcoal/40 border border-border/40 flex items-center justify-center shrink-0">
            <BrainCog className="w-5 h-5 text-steel" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">AI Governance</h1>
            <p className="text-[11px] text-muted-foreground">
              Zero-trust AI · {activeCount} active · {disabledCount} disabled · kill switch armed
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center disabled:opacity-50"
            aria-label="Refresh AI governance data"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={emergencyDisableAll}
            className="px-3 h-9 rounded-full bg-destructive/15 border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/25 flex items-center gap-1.5"
            aria-label="Emergency disable all AI"
          >
            <Power className="w-3.5 h-3.5" /> EMERGENCY KILL
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Section tabs */}
        <div className="max-w-6xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto">
          {([
            ["broker", "Data Access Broker"],
            ["kill-switch", "Kill Switch"],
            ["automation", "Automation Levels"],
            ["incidents", "AI Incidents"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition whitespace-nowrap",
                section === key
                  ? "border-steel/60 bg-steel/15 text-steel"
                  : "border-border/40 text-muted-foreground hover:bg-muted/40",
              )}
              aria-pressed={section === key}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full px-5 py-5 space-y-4">
        {/* Banner — AI prohibitions */}
        <section
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3"
        >
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">AI cannot independently perform prohibited actions.</p>
            <p className="text-muted-foreground mt-1">
              AI may not <strong>declare guilt</strong>, <strong>impose discipline</strong>,
              issue <strong>authoritative findings</strong>, <strong>unmask protected
              identities</strong>, <strong>destroy evidence</strong>, or <strong>close sensitive
              investigations</strong>. These actions are PROHIBITED regardless of automation level
              (§LXXXII).
            </p>
          </div>
        </section>

        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Loading…</span>
          </div>
        )}

        {/* ─── Section 1: Data Access Broker ──────────────────────────── */}
        {section === "broker" && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-border/60 bg-card/50 p-4">
              <h2 className="font-display text-base flex items-center gap-2 mb-3">
                <BrainCog className="w-4 h-4 text-steel" /> Submit AI Access Request
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                All AI access to ACA / institutional data must go through the broker. The broker
                evaluates institution, policy, case, clearance, purpose, and requested data —
                returning ONLY the authorized scope.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ar-inst">Institution</Label>
                  <select id="ar-inst" value={requestForm.institution}
                    onChange={(e) => setRequestForm({ ...requestForm, institution: e.target.value })}
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm">
                    {["aca","police","courts","ems"].map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="ar-model">AI model</Label>
                  <Input id="ar-model" value={requestForm.aiModel}
                    onChange={(e) => setRequestForm({ ...requestForm, aiModel: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ar-purpose">Purpose</Label>
                  <Input id="ar-purpose" value={requestForm.purpose}
                    onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
                    placeholder="summarize | transcribe | translate | redact" />
                </div>
                <div>
                  <Label htmlFor="ar-policy">Policy rule</Label>
                  <Input id="ar-policy" value={requestForm.policy}
                    onChange={(e) => setRequestForm({ ...requestForm, policy: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="ar-data">Requested data (comma-separated)</Label>
                  <Input id="ar-data" value={requestForm.requestedData}
                    onChange={(e) => setRequestForm({ ...requestForm, requestedData: e.target.value })}
                    placeholder="evidence:metadata:EV-ACA-0001, case:summary:ASG-2024-014" />
                </div>
                <div>
                  <Label htmlFor="ar-case">Case reference (optional)</Label>
                  <Input id="ar-case" value={requestForm.caseRef}
                    onChange={(e) => setRequestForm({ ...requestForm, caseRef: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <Button onClick={submitAccessRequest} disabled={submittingRequest} className="w-full">
                    {submittingRequest ? <><Loader2 className="w-4 h-4 animate-spin" /> Requesting…</> : <BrainCog className="w-4 h-4" />}
                    {" "}Request access
                  </Button>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-base flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-steel" /> Recent AI Access Requests
              </h2>
              <div className="rounded-2xl border border-border/60 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-3">Model / Request</div>
                  <div className="col-span-2">Institution</div>
                  <div className="col-span-2">Decision</div>
                  <div className="col-span-3">Authorized scope</div>
                  <div className="col-span-2">Timestamp</div>
                </div>
                <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
                  {accessLog.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No AI access requests logged yet. Submit one above.
                    </div>
                  ) : (
                    accessLog.map((l) => (
                      <div key={l.logId} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs items-center">
                        <div className="col-span-3 min-w-0">
                          <p className="font-medium truncate">{l.model}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{l.requestId}</p>
                        </div>
                        <div className="col-span-2 font-mono">{l.institution}</div>
                        <div className="col-span-2">
                          <Badge className={cn("text-[10px] border", DECISION_COLOR[l.decision] ?? "")}>
                            {l.decision}
                          </Badge>
                        </div>
                        <div className="col-span-3 min-w-0">
                          {l.retrievalSet.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {l.retrievalSet.slice(0, 2).map((r) => (
                                <span key={r} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 truncate">
                                  {r}
                                </span>
                              ))}
                              {l.retrievalSet.length > 2 && (
                                <span className="text-[9px] text-muted-foreground">+{l.retrievalSet.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="col-span-2 text-[10px] text-muted-foreground">
                          {new Date(l.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ─── Section 2: Kill Switch ─────────────────────────────────── */}
        {section === "kill-switch" && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Power className="w-4 h-4 text-steel" />
              <h2 className="font-display text-base">AI Kill Switch</h2>
              <Badge variant="secondary" className="text-[10px]">{killStates.length} capabilities</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Disable any individual AI capability WITHOUT taking down the entire platform. Every
              enable/disable is fully audited.
            </p>
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5">Capability</div>
                <div className="col-span-2">Scope</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3 text-right">Toggle</div>
              </div>
              <div className="divide-y divide-border/40 max-h-[28rem] overflow-y-auto">
                {killStates.map((s) => {
                  const Icon = SCOPE_ICON[s.scope] ?? Activity;
                  const active = s.status === "active";
                  return (
                    <div key={s.featureId} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm items-center hover:bg-muted/20 transition">
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        <Icon className={cn("w-4 h-4 shrink-0", active ? "text-steel" : "text-muted-foreground")} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.featureName}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">{s.featureId}</p>
                          {s.reason && (
                            <p className="text-[10px] text-muted-foreground truncate">↳ {s.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Badge variant="outline" className="text-[10px]">{s.scope}</Badge>
                      </div>
                      <div className="col-span-2">
                        <Badge className={cn(
                          "text-[10px] border",
                          active
                            ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40"
                            : s.status === "killed"
                              ? "bg-destructive/15 text-destructive border-destructive/40"
                              : "bg-amber-500/15 text-amber-500 border-amber-500/40",
                        )}>
                          {s.status}
                        </Badge>
                      </div>
                      <div className="col-span-3 flex justify-end items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {active ? "active" : "disabled"}
                        </span>
                        <Switch
                          checked={active}
                          onCheckedChange={() => toggleKill(s)}
                          aria-label={`Toggle ${s.featureName}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── Section 3: Automation Levels ───────────────────────────── */}
        {section === "automation" && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ToggleRight className="w-4 h-4 text-steel" />
              <h2 className="font-display text-base">AI Automation Levels</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Every AI feature has an explicit automation level (L0–L4). L4 = PROHIBITED — only
              humans may perform the action.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {automationConfigs.map((c) => (
                <motion.div
                  key={c.featureId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border/60 bg-card/50 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.featureName}</p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{c.featureId}</p>
                    </div>
                    <Badge className={cn("text-[10px] border", LEVEL_COLOR[c.level] ?? "")}>
                      L{c.level}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {c.levelDescription ?? "—"}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[10px]">
                    <Badge variant="outline" className="text-[9px]">{c.institution}</Badge>
                    {c.level === 4 ? (
                      <span className="text-destructive flex items-center gap-1">
                        <Lock className="w-3 h-3" /> prohibited for AI
                      </span>
                    ) : c.level === 3 ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Unlock className="w-3 h-3" /> auto-execute (low-risk)
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> human approval required
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Section 4: AI Incidents ────────────────────────────────── */}
        {section === "incidents" && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Bug className="w-4 h-4 text-steel" />
              <h2 className="font-display text-base">AI Incident Log</h2>
              <Badge variant="secondary" className="text-[10px]">{SEED_INCIDENTS.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Recent AI incidents: model, version, impact, and the correction applied. Every
              incident triggers the kill switch + a post-incident review.
            </p>
            <div className="space-y-3">
              {SEED_INCIDENTS.map((inc) => (
                <div key={inc.incidentId} className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bug className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="font-medium text-sm">{inc.model}</p>
                      <Badge variant="outline" className="text-[10px] font-mono">{inc.modelVersion}</Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">{inc.incidentId}</Badge>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/40 text-[10px]">
                      {inc.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs space-y-1">
                    <p><span className="text-muted-foreground">Impact:</span> {inc.impact}</p>
                    <p><span className="text-muted-foreground">Correction:</span> {inc.correction}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {new Date(inc.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </OverlayShell>
  );
}

export default AIGovernancePanel;
