// @ts-nocheck
/**
 * GovernmentInstitutionRegistry — overlay component
 * ============================================================================
 * Admin overlay for the Federated Government Fabric's Institution Registry.
 *
 * Institutional dark theme (admin overlay). Cards per institution show:
 *   • name, authority, type, integration level, status, services count
 *
 * A "Register Institution" form allows operators to add new institutions.
 * Each new institution is created at Level 0 (Directory) by default;
 * integrations declared in the form are recorded but not activated
 * (activation requires the Authority Matrix, a separate governance
 * artifact — see PART XVII).
 *
 * Dispatches `circle:institution-registry` on open so the host page can
 * react if needed (e.g. log analytics, surface a co-banner).
 *
 * Accessibility:
 *   • role="dialog" + aria-modal provided by <OverlayShell>
 *   • All form fields have associated <Label>
 *   • All icon-only buttons have aria-label
 *   • Status badges are paired with sr-only text
 *   • Fetches use relative paths and an 8s AbortController timeout
 * ============================================================================
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Building2, Plus, RefreshCw, Loader2, ShieldCheck, ShieldAlert,
  Clock, Phone, Globe, Mail, MapPin, AlertCircle, CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Types (mirror src/lib/institution-registry.ts) ──────────────────────────

type InstitutionType =
  | "aca" | "police" | "ems" | "fire" | "traffic"
  | "health" | "local_gov" | "regulator" | "financial" | "other";
type InstitutionStatus =
  | "active" | "pending_verification" | "stale" | "suspended" | "retired";
type IntegrationLevel = 0 | 1 | 2 | 3 | 4;

interface OfficialChannel {
  kind: "phone" | "website" | "office" | "online_portal" | "email" | "sms";
  label: string;
  value: string;
  twentyFourSeven?: boolean;
  languages?: string[];
}

interface InstitutionIntegration {
  adapterKey: string;
  level: IntegrationLevel;
  legalAuthority: string;
  systemOfRecord: "institution" | "circle_referral_only";
  lastVerified?: string;
  status: "active" | "degraded" | "retired";
}

interface GovernmentInstitution {
  institutionId: string;
  name: string;
  authority: string;
  type: InstitutionType;
  services: string[];
  officialChannels: OfficialChannel[];
  integrations: InstitutionIntegration[];
  status: InstitutionStatus;
  dataClassification: "public" | "restricted" | "confidential";
  lastVerification: string;
  effectiveDate: string;
  country?: string;
  jurisdiction?: string;
  notes?: string;
}

interface ListResponse {
  total: number;
  institutions: GovernmentInstitution[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<InstitutionType, string> = {
  aca: "ACA",
  police: "Police",
  ems: "EMS",
  fire: "Fire / Civil Protection",
  traffic: "Traffic",
  health: "Health",
  local_gov: "Local Government",
  regulator: "Regulator",
  financial: "Financial",
  other: "Other",
};

const TYPE_OPTIONS: InstitutionType[] = [
  "aca", "police", "ems", "fire", "traffic",
  "health", "local_gov", "regulator", "financial", "other",
];

const LEVEL_LABEL: Record<IntegrationLevel, string> = {
  0: "L0 Directory",
  1: "L1 Referral",
  2: "L2 Transaction",
  3: "L3 Inst. Intelligence",
  4: "L4 Federated Intelligence",
};

const STATUS_VARIANT: Record<InstitutionStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending_verification: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  stale: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  suspended: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  retired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const CHANNEL_ICON: Record<string, LucideIcon> = {
  phone: Phone,
  website: Globe,
  online_portal: Globe,
  office: MapPin,
  email: Mail,
  sms: Phone,
};

const FETCH_TIMEOUT_MS = 8_000;

// ── Helpers ────────────────────────────────────────────────────────────────

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

function highestLevel(inst: GovernmentInstitution): IntegrationLevel {
  let max: IntegrationLevel = 0;
  for (const it of inst.integrations || []) {
    if (it.status !== "active") continue;
    if (it.level > max) max = it.level;
  }
  return max;
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

export function GovernmentInstitutionRegistry({ open, onClose }: Props) {
  const [list, setList] = useState<GovernmentInstitution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [fName, setFName] = useState("");
  const [fAuthority, setFAuthority] = useState("");
  const [fType, setFType] = useState<InstitutionType>("police");
  const [fCountry, setFCountry] = useState("EG");
  const [fJurisdiction, setFJurisdiction] = useState("National");
  const [fClassification, setFClassification] = useState<
    "public" | "restricted" | "confidential"
  >("restricted");
  const [fServices, setFServices] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const titleId = "gov-inst-registry-title";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout("/api/federation/institutions", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as ListResponse;
      setList(payload.institutions || []);
    } catch (e) {
      const msg = String((e as Error)?.message || e || "Failed to load institutions.");
      setError(msg);
      toast.error("Couldn't load institution registry", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Notify host page that this overlay opened.
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("circle:institution-registry", {
          detail: { open: true, at: new Date().toISOString() },
        }),
      );
    }
    load();
  }, [open, load]);

  const submit = useCallback(async () => {
    if (!fName.trim() || !fAuthority.trim()) {
      toast.error("Name and authority are required.");
      return;
    }
    setSubmitting(true);
    try {
      const services = fServices
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetchWithTimeout("/api/federation/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fName.trim(),
          authority: fAuthority.trim(),
          type: fType,
          country: fCountry.trim() || undefined,
          jurisdiction: fJurisdiction.trim() || undefined,
          dataClassification: fClassification,
          services,
          status: "pending_verification",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      toast.success("Institution registered", {
        description: `${fName.trim()} is pending verification.`,
      });
      setFName("");
      setFAuthority("");
      setFServices("");
      setShowForm(false);
      await load();
    } catch (e) {
      const msg = String((e as Error)?.message || e || "Submit failed.");
      toast.error("Registration failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }, [
    fName, fAuthority, fType, fCountry, fJurisdiction, fClassification, fServices, load,
  ]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="dialog"
      maxWidth="max-w-5xl"
      ariaLabel="Government Institution Registry"
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
              <Building2 className="size-5 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold leading-tight">
                Government Institution Registry
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                Federated Government Fabric · Directory of sovereign institutions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={load}
              disabled={loading}
              aria-label="Refresh institution list"
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
              aria-controls="register-institution-form"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Register</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label="Close institution registry"
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Sovereignty notice */}
          <div
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"
            role="note"
          >
            <ShieldAlert className="inline size-4 mr-1.5 -mt-0.5" aria-hidden="true" />
            Each institution is a separate security + operational domain. Circle
            records directory + integration descriptors only — it never becomes
            the system of record for any government institution (Rule 4, PART XLIII).
          </div>

          {/* Register form */}
          {showForm && (
            <motion.section
              id="register-institution-form"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
              aria-label="Register a new institution"
            >
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Plus className="size-4" aria-hidden="true" />
                Register Institution
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gi-name" className="text-xs text-zinc-300">
                    Name *
                  </Label>
                  <Input
                    id="gi-name"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    placeholder="e.g. National Police Authority"
                    className="bg-zinc-950 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gi-authority" className="text-xs text-zinc-300">
                    Authority *
                  </Label>
                  <Input
                    id="gi-authority"
                    value={fAuthority}
                    onChange={(e) => setFAuthority(e.target.value)}
                    placeholder="e.g. Ministry of Interior"
                    className="bg-zinc-950 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gi-type" className="text-xs text-zinc-300">
                    Type
                  </Label>
                  <select
                    id="gi-type"
                    value={fType}
                    onChange={(e) => setFType(e.target.value as InstitutionType)}
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gi-country" className="text-xs text-zinc-300">
                    Country (ISO-2)
                  </Label>
                  <Input
                    id="gi-country"
                    value={fCountry}
                    onChange={(e) => setFCountry(e.target.value)}
                    maxLength={2}
                    className="bg-zinc-950 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gi-jurisdiction" className="text-xs text-zinc-300">
                    Jurisdiction
                  </Label>
                  <Input
                    id="gi-jurisdiction"
                    value={fJurisdiction}
                    onChange={(e) => setFJurisdiction(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gi-classification" className="text-xs text-zinc-300">
                    Data Classification
                  </Label>
                  <select
                    id="gi-classification"
                    value={fClassification}
                    onChange={(e) =>
                      setFClassification(
                        e.target.value as "public" | "restricted" | "confidential",
                      )
                    }
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
                  >
                    <option value="public">Public</option>
                    <option value="restricted">Restricted</option>
                    <option value="confidential">Confidential</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="gi-services" className="text-xs text-zinc-300">
                    Services (comma-separated)
                  </Label>
                  <Input
                    id="gi-services"
                    value={fServices}
                    onChange={(e) => setFServices(e.target.value)}
                    placeholder="e.g. emergency_response, criminal_investigation"
                    className="bg-zinc-950 border-zinc-700 text-zinc-100"
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
                    <CheckCircle2 className="size-4" />
                  )}
                  Register
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
                <p className="font-medium">Failed to load institutions.</p>
                <p className="text-rose-300/80">{error}</p>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && list.length === 0 && (
            <div className="space-y-3" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Institution cards */}
          {!loading && list.length > 0 && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              role="list"
              aria-label="Registered institutions"
            >
              {list.map((inst) => {
                const lvl = highestLevel(inst);
                const Icon = Building2;
                return (
                  <motion.article
                    key={inst.institutionId}
                    role="listitem"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
                  >
                    <header className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className="size-8 rounded-md bg-zinc-800 grid place-items-center shrink-0"
                          aria-hidden="true"
                        >
                          <Icon className="size-4 text-zinc-300" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold leading-tight truncate">
                            {inst.name}
                          </h3>
                          <p className="text-xs text-zinc-400 truncate">
                            {inst.authority}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("border", STATUS_VARIANT[inst.status])}
                      >
                        {inst.status.replace("_", " ")}
                        <span className="sr-only">status: {inst.status}</span>
                      </Badge>
                    </header>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <div>
                        <dt className="text-zinc-500">Type</dt>
                        <dd className="text-zinc-200">{TYPE_LABEL[inst.type]}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Integration</dt>
                        <dd className="text-zinc-200">{LEVEL_LABEL[lvl]}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Services</dt>
                        <dd className="text-zinc-200">{inst.services.length}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Verified</dt>
                        <dd className="text-zinc-200 flex items-center gap-1">
                          <Clock className="size-3" aria-hidden="true" />
                          {timeAgo(inst.lastVerification)}
                        </dd>
                      </div>
                    </dl>

                    {inst.officialChannels.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap gap-2">
                        {inst.officialChannels.slice(0, 3).map((ch, i) => {
                          const Ico = CHANNEL_ICON[ch.kind] || Globe;
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[11px] text-zinc-400"
                            >
                              <Ico className="size-3" aria-hidden="true" />
                              <span className="truncate max-w-[140px]">{ch.value}</span>
                              {ch.twentyFourSeven && (
                                <span
                                  className="sr-only"
                                >{`, 24/7`}</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {inst.dataClassification !== "public" && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-300">
                        <ShieldCheck className="size-3" aria-hidden="true" />
                        Classification: {inst.dataClassification}
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && list.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              <Building2 className="size-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p className="text-sm">No institutions registered yet.</p>
              <p className="text-xs mt-1">
                Click “Register” to add the first sovereign institution.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-800 px-5 py-3 flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-900/60">
          <span>{list.length} institutions</span>
          <span>Federation ≠ Centralization</span>
        </footer>
      </div>
    </OverlayShell>
  );
}
