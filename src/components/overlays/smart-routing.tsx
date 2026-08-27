"use client";
// @ts-nocheck
/**
 * Smart Routing overlay — Chapter XXI (Smart Citizen Routing).
 *
 * Citizen-facing "I need help" interface. The citizen types a free-text
 * description; the platform classifies it into one of three lanes and
 * shows the routing decision BEFORE anything is sent. The citizen must
 * explicitly press "Proceed" to actually route the request.
 *
 * Three color-coded pathways:
 *   • EMERGENCY  — red.   Routed to Police / EMS / Civil Protection / Traffic.
 *                         NEVER to ACA.
 *   • SERVICE    — blue.  Routed to the responsible government service.
 *   • INTEGRITY  — amber. Routed to ACA Signal intake — NEVER an ACA Case.
 *
 * Sovereign rules (all enforced in the UI):
 *   • No fabricated dispatch — the overlay shows the DECISION, not a dispatch.
 *   • No silent cross-institutional sharing — the citizen sees exactly
 *     where the request will be sent before pressing Proceed.
 *   • No autonomous Signal-to-Case conversion — when integrity is detected,
 *     the overlay explicitly says "ACA Signal — NOT a case".
 *
 * Dispatches the `circle:smart-routing` event when the citizen proceeds.
 */
import { useState } from "react";
import { Loader2, ShieldAlert, LifeBuoy, Scale, X, MapPin, ChevronRight, Info } from "lucide-react";
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

type Pathway = "emergency" | "service" | "integrity";

interface RoutingResult {
  pathway: Pathway;
  category: string;
  targetInstitution: string;
  targetDepartment: string;
  officialChannel: string;
  sla: string;
  escalation: string;
  routingReason: string;
  fallbackChannels: string[];
  classifiedBy: "keyword" | "ai" | "hybrid";
  timestamp: string;
  emergencyType?: string;
  degraded?: boolean;
}

const PATHWAY_THEME: Record<
  Pathway,
  {
    label: string;
    symbol: string;
    color: string;
    bg: string;
    border: string;
    ring: string;
    text: string;
    icon: typeof ShieldAlert;
    description: string;
  }
> = {
  emergency: {
    label: "Emergency",
    symbol: "HELP",
    color: "red",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-300 dark:border-red-800",
    ring: "ring-red-500",
    text: "text-red-700 dark:text-red-300",
    icon: ShieldAlert,
    description:
      "Immediate danger to life, limb, property, or public safety. Routed to Police / EMS / Civil Protection / Traffic. NEVER to ACA.",
  },
  service: {
    label: "Government Service",
    symbol: "SERVICE",
    color: "blue",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-300 dark:border-blue-800",
    ring: "ring-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    icon: LifeBuoy,
    description:
      "A non-emergency administrative interaction with a government service. Routed to the responsible ministry / agency / portal.",
  },
  integrity: {
    label: "Integrity Concern",
    symbol: "INTEGRITY",
    color: "amber",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-300 dark:border-amber-800",
    ring: "ring-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    icon: Scale,
    description:
      "A possible administrative, financial, or operational integrity concern. Routed to ACA Signal intake — NEVER an ACA Case.",
  },
};

export function SmartRouting({ open, onClose }: Props) {
  const [text, setText] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [integrityRequested, setIntegrityRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoutingResult | null>(null);
  const [proceeding, setProceeding] = useState(false);

  const detectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation unavailable", {
        description: "Your device does not expose geolocation. Location is optional.",
      });
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
          description: `±${Math.round(pos.coords.accuracy)}m accuracy. Only sent if you proceed.`,
        });
      },
      () => {
        setLocating(false);
        toast.error("Location denied", {
          description: "You can still route without location (silent-emergency mode).",
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  };

  const classify = async () => {
    if (!text.trim()) {
      toast.error("Describe what you need help with", {
        description: "Type a few words about your situation so we can route you to the right institution.",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/emergency/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          location: location || undefined,
          integrityRequested,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok || !data.ok || !data.result) {
        toast.error("Routing failed", {
          description: data?.message || data?.error || "Try again in a moment.",
        });
        return;
      }
      setResult(data.result);
    } catch (err: any) {
      toast.error("Routing failed", {
        description: err?.name === "AbortError" ? "Timed out after 8s." : "Network error.",
      });
    } finally {
      setLoading(false);
    }
  };

  const proceed = () => {
    if (!result) return;
    setProceeding(true);
    // Dispatch the smart-routing event — the home page can react to it
    // (e.g. open the emergency-routing overlay when pathway === 'emergency',
    // or surface a confirmation toast for service / integrity).
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("circle:smart-routing", {
          detail: {
            pathway: result.pathway,
            category: result.category,
            targetInstitution: result.targetInstitution,
            targetDepartment: result.targetDepartment,
            officialChannel: result.officialChannel,
            sla: result.sla,
            timestamp: result.timestamp,
            emergencyType: result.emergencyType,
            location: location || undefined,
          },
        }),
      );
    }
    toast.success("Request routed", {
      description:
        result.pathway === "emergency"
          ? `Routed to ${result.targetInstitution}. Use the Emergency Routing overlay to send the packet.`
          : result.pathway === "integrity"
            ? `Routed to ACA Signal intake. This is a Signal, NOT a Case.`
            : `Routed to ${result.targetInstitution}.`,
    });
    setProceeding(false);
    onClose();
  };

  const reset = () => {
    setText("");
    setResult(null);
    setIntegrityRequested(false);
  };

  const theme = result ? PATHWAY_THEME[result.pathway] : null;

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="Smart Citizen Routing">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-rose-500 flex items-center justify-center text-white">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">I need help</h2>
            <p className="text-xs text-muted-foreground">Smart Citizen Routing — Chapter XXI</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Safety-first banner */}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex gap-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">If you are in immediate danger</p>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
              Call your local emergency number directly (Egypt: 122 police, 123 ambulance). This tool helps you find the right institution — it is not a substitute for a direct call when seconds matter.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smart-routing-text" className="text-sm font-medium">
            Describe what you need help with
          </Label>
          <Textarea
            id="smart-routing-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. There's been a car accident on the ring road, two cars, someone is hurt. — or — I was asked to pay to renew my passport. — or — The tax e-invoice portal won't accept my return."
            rows={4}
            maxLength={4000}
            className="resize-none"
            aria-describedby="smart-routing-text-help"
          />
          <p id="smart-routing-text-help" className="text-xs text-muted-foreground">
            You don't need to know which institution to contact. CIRCLE classifies your request and routes it for you.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detectLocation}
            disabled={locating}
            aria-label="Detect my location"
            className="min-h-[44px]"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
            {location ? `Location set (±${Math.round(location.accuracy || 0)}m)` : "Detect my location"}
          </Button>
          <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 rounded-lg border border-border/60 hover:bg-muted transition-colors min-h-[44px]">
            <input
              type="checkbox"
              checked={integrityRequested}
              onChange={(e) => setIntegrityRequested(e.target.checked)}
              className="accent-amber-600"
              aria-label="Mark this as an integrity concern"
            />
            <span>This is an integrity concern (ACA Signal)</span>
          </label>
          <Button
            type="button"
            onClick={classify}
            disabled={loading || !text.trim()}
            className="ml-auto min-h-[44px]"
            aria-label="Classify and route my request"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
            Classify & route
          </Button>
        </div>

        {/* Result */}
        {result && theme && (
          <div className={cn("rounded-xl border p-4 space-y-3", theme.bg, theme.border)} role="status" aria-live="polite">
            <div className="flex items-start gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", theme.text, "bg-white/60 dark:bg-black/20")}>
                <theme.icon className="w-5 h-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{theme.label}</h3>
                  <Badge variant="outline" className={cn("border-current/30", theme.text)}>
                    {theme.symbol}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Classified by: {result.classifiedBy}
                    {result.degraded ? " (degraded — AI unavailable)" : ""}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{theme.description}</p>
              </div>
            </div>

            <div className="rounded-lg bg-white/60 dark:bg-black/20 border border-border/40 p-3 space-y-2 text-sm">
              <Row label="Routed to" value={result.targetInstitution} />
              <Row label="Department" value={result.targetDepartment} />
              <Row label="Official channel" value={result.officialChannel} />
              <Row label="SLA" value={result.sla} />
              <Row label="Escalation" value={result.escalation} />
              <Row label="Why this route" value={result.routingReason} />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Fallback channels</p>
                <ul className="text-sm space-y-1">
                  {result.fallbackChannels.map((ch, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>{ch}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {result.pathway === "integrity" && (
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 p-3 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">ACA Signal — NOT a Case</p>
                <p className="text-amber-800 dark:text-amber-200 mt-1">
                  An ACA Signal is a reviewable intelligence object. Only the ACA, under its own institutional process, may convert a Signal into a formal Case. CIRCLE never auto-converts.
                </p>
              </div>
            )}

            {result.pathway === "emergency" && (
              <div className="rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 p-3 text-sm">
                <p className="font-medium text-red-900 dark:text-red-100">Emergency pathway</p>
                <p className="text-red-800 dark:text-red-200 mt-1">
                  This will be routed to {result.targetInstitution}. Emergencies are NEVER routed to the ACA — the ACA is an oversight body, not an emergency responder. Use the Emergency Routing overlay to send the minimum-necessary-info packet.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={proceed} disabled={proceeding} className={cn("min-h-[44px]", theme.text ? "" : "")}>
                {proceeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Proceed
              </Button>
              <Button variant="outline" onClick={reset} className="min-h-[44px]">
                Start over
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        {!result && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            {(["emergency", "service", "integrity"] as Pathway[]).map((p) => {
              const t = PATHWAY_THEME[p];
              return (
                <div key={p} className={cn("rounded-lg border p-3", t.bg, t.border)}>
                  <t.icon className={cn("w-4 h-4 mb-1", t.text)} aria-hidden />
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", t.text)}>{t.symbol}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.label}</p>
                </div>
              );
            })}
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

export default SmartRouting;
