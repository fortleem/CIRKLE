"use client";
// @ts-nocheck
/**
 * Service Outage Report overlay — Chapter XXX §30.6 (Multi-Agency Referral).
 *
 * Citizen-facing form for reporting a government service outage (portal
 * down, transaction failure, payment problem, etc.). The platform
 * aggregates the report into the government digital health radar
 * (see /api/services/health).
 *
 * Features:
 *   • Select service from the canonical Egyptian government service list.
 *   • Describe outage type (portal_down, transaction_failure, payment_problem, ...).
 *   • Auto-detect user location (optional).
 *   • Show similar recent reports — to avoid duplicates, the citizen may
 *     "add my voice" to an existing report rather than create a duplicate.
 *   • Status tracking after submission.
 *
 * Dispatches the `circle:service-outage-report` event when the report is
 * submitted.
 */
import { useEffect, useState } from "react";
import {
  Loader2, ServerCrash, X, MapPin, Send, CheckCircle2, AlertTriangle,
  Users, Activity, Radio, type LucideIcon,
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

const SERVICES: Array<{ id: string; label: string }> = [
  { id: "eta", label: "ETA — e-invoice portal" },
  { id: "nafeza", label: "NAFEZA — customs single-window" },
  { id: "civil_registry", label: "Civil Registry" },
  { id: "passports", label: "Passport services" },
  { id: "traffic_services", label: "Traffic licensing" },
  { id: "municipal", label: "Municipal services" },
  { id: "health_services", label: "Ministry of Health" },
  { id: "education", label: "Ministry of Education" },
  { id: "labor", label: "Ministry of Labour" },
  { id: "courts", label: "Courts services" },
  { id: "government_complaints", label: "Government complaints portal" },
];

const OUTAGE_TYPES: Array<{ id: string; label: string }> = [
  { id: "portal_down", label: "Portal down" },
  { id: "transaction_failure", label: "Transaction failure" },
  { id: "payment_problem", label: "Payment problem" },
  { id: "login_failure", label: "Login failure" },
  { id: "data_inconsistency", label: "Data inconsistency" },
  { id: "slow_response", label: "Slow response" },
  { id: "api_error", label: "API error" },
  { id: "certificate_expired", label: "Certificate expired" },
  { id: "other", label: "Other" },
];

interface Outage {
  id: string;
  service: string;
  outageType: string;
  description?: string;
  city?: string;
  reports: number;
  status: "open" | "confirmed" | "resolved";
  lastReported: string;
  firstReported: string;
}

export function ServiceOutageReport({ open, onClose }: Props) {
  const [service, setService] = useState<string>("eta");
  const [outageType, setOutageType] = useState<string>("portal_down");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [recentOutages, setRecentOutages] = useState<Outage[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Outage | null>(null);

  // Load similar recent reports when the service or outageType changes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoadingRecent(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(
          `/api/services/outage?service=${encodeURIComponent(service)}&outageType=${encodeURIComponent(outageType)}&limit=5`,
          { signal: controller.signal },
        );
        clearTimeout(timeout);
        const data = await res.json();
        if (!cancelled && data.ok && Array.isArray(data.outages)) {
          setRecentOutages(data.outages);
        }
      } catch {
        // Non-fatal — duplicate detection is best-effort.
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, service, outageType]);

  const detectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation unavailable", { description: "Location is optional." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
        toast.success("Location detected", {
          description: `±${Math.round(pos.coords.accuracy)}m. Only used to aggregate regional outage data.`,
        });
      },
      () => {
        setLocating(false);
        toast.error("Location denied", { description: "You can submit without location." });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitted(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/services/outage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          outageType,
          description: description.trim() || undefined,
          city: city.trim() || undefined,
          location: location || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!data.ok || !data.outage) {
        toast.error("Submit failed", { description: data?.message || data?.error });
        return;
      }
      setSubmitted(data.outage);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("circle:service-outage-report", {
            detail: {
              outageId: data.outage.id,
              service: data.outage.service,
              outageType: data.outage.outageType,
              addedVoiceTo: data.addedVoiceTo || null,
              reports: data.outage.reports,
              timestamp: data.outage.lastReported,
            },
          }),
        );
      }
      if (data.addedVoiceTo) {
        toast.success("Added your voice", {
          description: "A similar recent outage was found. Your report was added as a corroborating voice rather than a duplicate.",
        });
      } else {
        toast.success("Outage recorded", {
          description: "It will appear in the government digital health radar.",
        });
      }
      // Refresh the recent list.
      setRecentOutages((prev) => [data.outage, ...prev.filter((o) => o.id !== data.outage.id)].slice(0, 5));
    } catch (err: any) {
      toast.error("Submit failed", {
        description: err?.name === "AbortError" ? "Timed out after 8s." : "Network error.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setDescription("");
    setSubmitted(null);
    setCity("");
  };

  const serviceLabel = (id: string) => SERVICES.find((s) => s.id === id)?.label || id;
  const outageTypeLabel = (id: string) => OUTAGE_TYPES.find((t) => t.id === id)?.label || id;

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="Report a Service Outage">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
            <ServerCrash className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Report a service outage</h2>
            <p className="text-xs text-muted-foreground">Government Digital Health Radar · Chapter XXX §30.6</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Info banner */}
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 flex gap-3">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">Aggregate, not contact</p>
            <p className="text-blue-700 dark:text-blue-300 mt-0.5">
              CIRCLE aggregates citizen outage reports into the government digital health radar. It does NOT contact the institution on your behalf. For a personal issue with a specific transaction, contact the service directly.
            </p>
          </div>
        </div>

        {/* Form */}
        {!submitted && (
          <>
            <div className="space-y-2">
              <Label htmlFor="outage-service" className="text-sm font-medium">Affected service</Label>
              <select
                id="outage-service"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm min-h-[44px]"
              >
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outage-type" className="text-sm font-medium">Outage type</Label>
              <select
                id="outage-type"
                value={outageType}
                onChange={(e) => setOutageType(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm min-h-[44px]"
              >
                {OUTAGE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outage-description" className="text-sm font-medium">Description (optional)</Label>
              <Textarea
                id="outage-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. The portal returns a 502 when I try to submit an e-invoice. Happened at ~3pm and again at 5pm."
                rows={3}
                maxLength={1000}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outage-city" className="text-sm font-medium">City (optional)</Label>
              <Input
                id="outage-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Cairo"
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Location (optional)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={detectLocation} disabled={locating} className="min-h-[44px]">
                  {locating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                  {location ? `Location set (±${Math.round(location.accuracy || 0)}m)` : "Detect my location"}
                </Button>
              </div>
            </div>

            {/* Similar recent reports */}
            {loadingRecent ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking for similar recent reports…
              </div>
            ) : recentOutages.length > 0 ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Similar recent reports</p>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  If your outage matches one below, you can still submit — your report will be added as a corroborating voice rather than a duplicate.
                </p>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {recentOutages.map((o) => (
                    <li key={o.id} className="text-xs flex items-center justify-between gap-2 py-1 border-t border-amber-200/50 dark:border-amber-800/50 first:border-t-0">
                      <span className="flex-1 min-w-0">
                        <span className="font-medium">{outageTypeLabel(o.outageType)}</span>
                        {o.city ? ` · ${o.city}` : ""}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {o.reports} report{o.reports === 1 ? "" : "s"}
                      </Badge>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">{timeAgo(o.lastReported)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                ✓ No similar recent reports for this service + outage type. Your report will be the first.
              </div>
            )}

            {/* Submit */}
            <Button onClick={submit} disabled={submitting} size="lg" className="w-full min-h-[52px] bg-amber-600 hover:bg-amber-700 text-white">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
              Submit outage report
            </Button>
          </>
        )}

        {/* Submitted */}
        {submitted && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3" role="status" aria-live="polite">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Outage recorded</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">ID: {submitted.id}</p>
              </div>
            </div>
            <div className="rounded-lg bg-white/60 dark:bg-black/20 border border-border/40 p-3 space-y-1.5 text-sm">
              <Row label="Service" value={serviceLabel(submitted.service)} />
              <Row label="Outage type" value={outageTypeLabel(submitted.outageType)} />
              {submitted.city && <Row label="City" value={submitted.city} />}
              <Row label="Total reports" value={String(submitted.reports)} />
              <Row label="Status" value={submitted.status} />
              <Row label="First reported" value={new Date(submitted.firstReported).toLocaleString()} />
              <Row label="Last reported" value={new Date(submitted.lastReported).toLocaleString()} />
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 flex gap-2 text-sm">
              <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden />
              <p className="text-blue-800 dark:text-blue-200">
                Your report is now part of the government digital health radar at <code className="text-xs">/api/services/health</code>. Aggregated with other citizens' reports, it helps surface systemic service issues for oversight.
              </p>
            </div>
            <Button variant="outline" onClick={reset} className="min-h-[44px]">
              Report another outage
            </Button>
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground col-span-1">{label}</p>
      <p className="text-sm text-foreground col-span-2 break-words">{value}</p>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} h ago`;
  return `${Math.floor(ms / 86_400_000)} d ago`;
}

export default ServiceOutageReport;
