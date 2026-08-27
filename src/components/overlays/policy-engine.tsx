// @ts-nocheck
"use client";

/**
 * Policy Engine Overlay — PART LXXXIX
 *
 *   • List of policy rules: institution, category, condition, action, status.
 *   • "Create Rule" form.
 *   • "Evaluate Policy" tester — input a scenario, get a decision.
 *   • Active policies grouped by institution.
 *
 * Everything government-facing is policy-configurable. No hard-coded government
 * assumptions — every rule is configuration with explicit authorization.
 *
 * Dispatches: `circle:policy-engine`
 */

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, RefreshCw, Loader2, Scale, Plus, FlaskConical, Building2, CheckCircle2,
  XCircle, AlertTriangle, ArrowUpCircle, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── API shapes ────────────────────────────────────────────────────────────

interface PolicyRule {
  ruleId: string;
  institution: string;
  region?: string;
  service?: string;
  name: string;
  description?: string;
  category: string;
  condition: { field: string; op: string; value?: unknown };
  action: string;
  authority?: string;
  effectiveDate: string;
  expiryDate?: string;
  status: string;
}

interface EvaluationResult {
  decision: string;
  reason: string;
  evaluations?: Array<{
    ruleId: string;
    decision: string;
    reason: string;
    matchedRule?: PolicyRule;
  }>;
  evaluatedAt: string;
}

// ── Visual metadata ───────────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, LucideIcon> = {
  access: CheckCircle2,
  retention: Scale,
  escalation: ArrowUpCircle,
  emergency: AlertTriangle,
  disclosure: Building2,
  ai: FlaskConical,
  evidence: Scale,
};

const ACTION_ICON: Record<string, LucideIcon> = {
  allow: CheckCircle2,
  deny: XCircle,
  require_approval: AlertTriangle,
  escalate: ArrowUpCircle,
  redact: Scale,
  anonymize: Scale,
  log_only: CheckCircle2,
};

const ACTION_COLOR: Record<string, string> = {
  allow: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  deny: "bg-destructive/15 text-destructive border-destructive/40",
  require_approval: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  escalate: "bg-orange-500/15 text-orange-500 border-orange-500/40",
  redact: "bg-primary/15 text-primary border-primary/40",
  anonymize: "bg-primary/15 text-primary border-primary/40",
  log_only: "bg-muted/40 text-muted-foreground border-border/40",
};

function fetchWithTimeout(input: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(input, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// ── Component ─────────────────────────────────────────────────────────────

export function PolicyEngineOverlay({ open, onClose }: Props) {
  const [view, setView] = useState<"list" | "create" | "evaluate">("list");
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterInst, setFilterInst] = useState<string>("");
  const [filterCat, setFilterCat] = useState<string>("");

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterInst) qs.set("institution", filterInst);
      if (filterCat) qs.set("category", filterCat);
      const url = `/api/policy/rules${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetchWithTimeout(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      setRules(payload.rules ?? []);
    } catch (e) {
      toast.error("Couldn't load policy rules", {
        description: String((e as Error)?.message || e),
      });
    } finally {
      setLoading(false);
    }
  }, [filterInst, filterCat]);

  useEffect(() => {
    if (open) {
      void fetchRules();
      window.dispatchEvent(new CustomEvent("circle:policy-engine"));
    }
  }, [open, fetchRules]);

  const groupedByInstitution = useMemo(() => {
    const map = new Map<string, PolicyRule[]>();
    for (const r of rules) {
      if (!map.has(r.institution)) map.set(r.institution, []);
      map.get(r.institution)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rules]);

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="Policy Engine — rule management, evaluation tester, active policies">
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel/30 to-charcoal/40 border border-border/40 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-steel" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">Policy Engine</h1>
            <p className="text-[11px] text-muted-foreground">
              {rules.length} active rules · everything government-facing is policy-configurable
            </p>
          </div>
          <button
            onClick={fetchRules}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center disabled:opacity-50"
            aria-label="Refresh policy rules"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* View tabs */}
        <div className="max-w-6xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto">
          {([
            ["list", "Active Rules"],
            ["create", "Create Rule"],
            ["evaluate", "Evaluate Policy"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition whitespace-nowrap",
                view === key
                  ? "border-steel/60 bg-steel/15 text-steel"
                  : "border-border/40 text-muted-foreground hover:bg-muted/40",
              )}
              aria-pressed={view === key}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full px-5 py-5 space-y-4">
        {/* Banner — no hard-coded assumptions */}
        <section
          className="rounded-2xl border border-steel/40 bg-steel/10 p-4 flex items-start gap-3"
        >
          <Building2 className="w-5 h-5 text-steel shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">No hard-coded government assumptions.</p>
            <p className="text-muted-foreground mt-1">
              Every rule is configuration with explicit authorization. Institution, region,
              service, law, authority, access, retention, escalation, emergency, disclosure, AI,
              and evidence are all policy-configurable.
            </p>
          </div>
        </section>

        {loading && rules.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Loading policy rules…</span>
          </div>
        )}

        {/* ─── View: list ──────────────────────────────────────────── */}
        {view === "list" && (
          <>
            {/* Filters */}
            <section className="flex items-end gap-3 flex-wrap">
              <div>
                <Label htmlFor="f-inst" className="text-[10px] uppercase">Institution</Label>
                <select
                  id="f-inst"
                  value={filterInst}
                  onChange={(e) => setFilterInst(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">all</option>
                  {["aca","police","courts","ems","global"].map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="f-cat" className="text-[10px] uppercase">Category</Label>
                <select
                  id="f-cat"
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">all</option>
                  {["access","retention","escalation","emergency","disclosure","ai","evidence"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setFilterInst(""); setFilterCat(""); }}>
                Clear
              </Button>
            </section>

            {/* Rules by institution */}
            {groupedByInstitution.map(([inst, instRules]) => (
              <section key={inst}>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-steel" />
                  <h2 className="font-display text-base">{inst}</h2>
                  <Badge variant="secondary" className="text-[10px]">{instRules.length}</Badge>
                </div>
                <div className="rounded-2xl border border-border/60 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-3">Rule</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-3">Condition</div>
                    <div className="col-span-2">Action</div>
                    <div className="col-span-2 text-right">Status</div>
                  </div>
                  <div className="divide-y divide-border/40">
                    {instRules.map((r) => {
                      const CatIcon = CATEGORY_ICON[r.category] ?? Scale;
                      const ActIcon = ACTION_ICON[r.action] ?? CheckCircle2;
                      return (
                        <div key={r.ruleId} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-muted/20 transition items-center">
                          <div className="col-span-3 min-w-0">
                            <p className="font-medium truncate">{r.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">{r.ruleId}</p>
                            {r.authority && (
                              <p className="text-[10px] text-muted-foreground truncate">↳ {r.authority}</p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <Badge variant="outline" className="text-[10px]">
                              <CatIcon className="w-3 h-3" /> {r.category}
                            </Badge>
                          </div>
                          <div className="col-span-3 text-[11px] font-mono text-muted-foreground truncate">
                            {r.condition.field} {r.condition.op} {String(r.condition.value ?? "")}
                          </div>
                          <div className="col-span-2">
                            <Badge className={cn("text-[10px] border", ACTION_COLOR[r.action] ?? "")}>
                              <ActIcon className="w-3 h-3" /> {r.action}
                            </Badge>
                          </div>
                          <div className="col-span-2 text-right">
                            <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ))}

            {rules.length === 0 && !loading && (
              <div className="text-center text-sm text-muted-foreground py-8">
                No rules match the current filters.
              </div>
            )}
          </>
        )}

        {/* ─── View: create ─────────────────────────────────────────── */}
        {view === "create" && (
          <CreateRuleForm
            onCreated={(r) => {
              setRules((prev) => [r, ...prev.filter((x) => x.ruleId !== r.ruleId)]);
              toast.success(`Rule created: ${r.ruleId}`, { description: r.name });
              setView("list");
            }}
          />
        )}

        {/* ─── View: evaluate ───────────────────────────────────────── */}
        {view === "evaluate" && (
          <EvaluatePolicyTester rules={rules} />
        )}
      </div>
    </OverlayShell>
  );
}

// ── Create Rule form ───────────────────────────────────────────────────────

function CreateRuleForm({ onCreated }: { onCreated: (r: PolicyRule) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    institution: "aca",
    name: "",
    description: "",
    category: "ai",
    conditionField: "purpose",
    conditionOp: "eq",
    conditionValue: "",
    action: "deny",
    authority: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    createdBy: "admin",
  });

  async function submit() {
    if (!form.name || !form.conditionValue) {
      toast.error("Rule name and condition value are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithTimeout(`/api/policy/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution: form.institution,
          name: form.name,
          description: form.description,
          category: form.category,
          condition: {
            field: form.conditionField,
            op: form.conditionOp,
            value: form.conditionValue,
          },
          action: form.action,
          authority: form.authority,
          effectiveDate: new Date(form.effectiveDate).toISOString(),
          createdBy: form.createdBy,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? `HTTP ${res.status}`);
      onCreated(payload.rule);
    } catch (e) {
      toast.error("Failed to create rule", { description: String((e as Error)?.message || e) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Plus className="w-5 h-5 text-steel" />
        <h2 className="font-display text-lg">Create Policy Rule</h2>
      </div>
      <div className="space-y-3">
        <div>
          <Label htmlFor="r-name">Rule name</Label>
          <Input id="r-name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. AI may not declare guilt" />
        </div>
        <div>
          <Label htmlFor="r-desc">Description</Label>
          <Textarea id="r-desc" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="r-inst">Institution</Label>
            <select id="r-inst" value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              {["aca","police","courts","ems","global"].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="r-cat">Category</Label>
            <select id="r-cat" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              {["access","retention","escalation","emergency","disclosure","ai","evidence"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="r-cf">Condition field</Label>
            <Input id="r-cf" value={form.conditionField}
              onChange={(e) => setForm({ ...form, conditionField: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="r-co">Operator</Label>
            <select id="r-co" value={form.conditionOp}
              onChange={(e) => setForm({ ...form, conditionOp: e.target.value })}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              {["eq","neq","in","not_in","exists","missing"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="r-cv">Condition value</Label>
            <Input id="r-cv" value={form.conditionValue}
              onChange={(e) => setForm({ ...form, conditionValue: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="r-act">Action</Label>
            <select id="r-act" value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              {["allow","deny","require_approval","escalate","redact","anonymize","log_only"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="r-auth">Issuing authority</Label>
            <Input id="r-auth" value={form.authority}
              onChange={(e) => setForm({ ...form, authority: e.target.value })}
              placeholder="e.g. ACA Oversight Council" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="r-eff">Effective date</Label>
            <Input id="r-eff" type="date" value={form.effectiveDate}
              onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="r-by">Created by</Label>
            <Input id="r-by" value={form.createdBy}
              onChange={(e) => setForm({ ...form, createdBy: e.target.value })} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button onClick={submit} disabled={submitting}>
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create rule</>}
        </Button>
      </div>
    </section>
  );
}

// ── Evaluate Policy tester ─────────────────────────────────────────────────

function EvaluatePolicyTester({ rules }: { rules: PolicyRule[] }) {
  const [selectedRule, setSelectedRule] = useState<string>("");
  const [inputJson, setInputJson] = useState(
    `{\n  "purpose": "summarize",\n  "institution": "aca",\n  "caseRef": "ASG-2024-014"\n}`,
  );
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  async function evaluate() {
    setEvaluating(true);
    setResult(null);
    try {
      const input = JSON.parse(inputJson);
      const body = selectedRule
        ? { ruleId: selectedRule, input }
        : { input };
      const res = await fetchWithTimeout(`/api/policy/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? `HTTP ${res.status}`);
      setResult(payload);
    } catch (e) {
      toast.error("Evaluation failed", { description: String((e as Error)?.message || e) });
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-5 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-5 h-5 text-steel" />
        <h2 className="font-display text-lg">Evaluate Policy — Decision Tester</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Input a scenario (JSON object). Choose a single rule to evaluate against, or leave blank
        to evaluate the full active rule set. Returns a decision:{" "}
        <span className="font-mono">allow | deny | require_approval | escalate</span>.
      </p>

      <div>
        <Label htmlFor="e-rule">Rule (optional — blank = evaluate full set)</Label>
        <select
          id="e-rule"
          value={selectedRule}
          onChange={(e) => setSelectedRule(e.target.value)}
          className="w-full h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">— full active rule set —</option>
          {rules.map((r) => (
            <option key={r.ruleId} value={r.ruleId}>
              {r.ruleId} · {r.name} ({r.institution}/{r.category})
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="e-input">Input scenario (JSON)</Label>
        <Textarea
          id="e-input"
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          className="font-mono text-xs"
          rows={6}
        />
      </div>

      <Button onClick={evaluate} disabled={evaluating}>
        {evaluating
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating…</>
          : <><FlaskConical className="w-4 h-4" /> Evaluate policy</>}
      </Button>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/60 bg-background/50 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Decision</span>
            <Badge className={cn("text-xs border", ACTION_COLOR[result.decision] ?? "")}>
              {result.decision}
            </Badge>
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
              {new Date(result.evaluatedAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{result.reason}</p>
          {result.evaluations && result.evaluations.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Matched rules ({result.evaluations.length})
              </p>
              <div className="rounded-lg border border-border/40 divide-y divide-border/30 max-h-48 overflow-y-auto">
                {result.evaluations.map((ev, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-2 text-xs">
                    <Badge className={cn("text-[10px] border", ACTION_COLOR[ev.decision] ?? "")}>
                      {ev.decision}
                    </Badge>
                    <span className="font-mono">{ev.ruleId}</span>
                    <span className="text-muted-foreground truncate">{ev.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </section>
  );
}

export default PolicyEngineOverlay;
