"use client";
// @ts-nocheck
/**
 * Emergency Routing overlay — Chapters XXII–XXVIII.
 *
 * Citizen-facing emergency packet builder. The citizen selects an emergency
 * type (Police / Medical / Fire / Traffic), the platform auto-detects
 * location (GPS), builds the minimum-necessary-info packet, and sends it
 * via the fallback hierarchy.
 *
 * Safety features:
 *   • SAFE-EVIDENCE MODE toggle — citizen reports from a safe distance.
 *   • Safety guidance banner: "Do not endanger yourself to gather evidence."
 *   • Delivery status indicator — NEVER fabricates success.
 *   • Fallback indicator — shows which fallback method was used.
 *
 * Dispatches the `circle:emergency-routing` event when the packet is sent.
 */
import { useState } from "react";
import {
  Loader2, ShieldAlert, Heart, Flame, Car, MoreHorizontal, MapPin, X,
  Send, Eye, AlertTriangle, Phone, CheckCircle2, ServerCrash, Database,
  type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

type EmergencyType = "police" | "medical" | "fire" | "traffic" | "other";

interface EmergencyRouteResult {
  emergencyId: string;
  type: EmergencyType;
  targetInstitution: string;
  targetDepartment: string;
  targetChannel: string;
  packet: any;
  status: "TRANSMITTED" | "ACKNOWLEDGED" | "STATUS_UNAVAILABLE" | "FAILED" | "FALLBACK_USED";
  fallbackUsed: string | null;
  statusNote: string;
  timestamp: string;
}

const TYPE_OPTIONS: Array<{
  id: EmergencyType;
  label: string;
  icon: LucideIcon;
  channel: string;
}> = [
  { id: "police", label: "Police", icon: ShieldAlert, channel: "122 — Police emergency" },
  { id: "medical", label: "Medical", icon: Heart, channel: "123 — Ambulance / EMS" },
  { id: "fire", label: "Fire", icon: Flame, channel: "Civil Protection" },
  { id: "traffic", label: "Traffic", icon: Car, channel: "Traffic authority" },
  { id: "other", label: "Other", icon: MoreHorizontal, channel: "Public Safety triage" },
];

const STATUS_THEME: Record<EmergencyRouteResult["status"], {
  label: string;
  color: string;
  icon: LucideIcon;
  bg: string;
}> = {
  TRANSMITTED: { label: "Transmitted", color: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800" },
  ACKNOWLEDGED: { label: "Acknowledged", color: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800" },
  STATUS_UNAVAILABLE: { label: "Status unavailable", color: "text-amber-700 dark:text-amber-300", icon: AlertTriangle, bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800" },
  FALLBACK_USED: { label: "Recorded (offline)", color: "text-amber-700 dark:text-amber-300", icon: Database, bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800" },
  FAILED: { label: "Failed", color: "text-red-700 dark:text-red-300", icon: ServerCrash, bg: "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800" },
};

const FALLBACK_LABELS: Record<string, string> = {
  DIGITAL_CHANNEL: "Primary official digital channel",
  ALTERNATIVE_DIGITAL: "Alternative official digital channel",
  SMS_DATA: "SMS data to emergency gateway",
  TELEPHONE: "Telephone — voice call",
  OFFLINE_QUEUE: "Offline queue — recorded for retransmission",
};

export function EmergencyRouting({ open, onClose }: Props) {
  const [type, setType] = useState<EmergencyType>("police");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number; address?: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [personsAffected, setPersonsAffected] = useState<number>(1);
  const [safeEvidenceMode, setSafeEvidenceMode] = useState(true);
  const [minInfoOnly, setMinInfoOnly] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<EmergencyRouteResult | null>(null);
  const [polling, setPolling] = useState(false);

  const detectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation unavailable", {
        description: "Your device does not expose geolocation. You can still send a silent-emergency packet.",
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
          description: `±${Math.round(pos.coords.accuracy)}m accuracy. Only the coordinates are sent.`,
        });
      },
      () => {
        setLocating(false);
        toast.error("Location denied", {
          description: "Packet will be sent in silent-emergency mode without coordinates.",
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
    );
  };

  const buildPreviewPacket = () => {
    const lines: string[] = [];
    lines.push(`Type: ${type}`);
    if (location) {
      lines.push(`Location: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${location.accuracy != null ? ` (±${Math.round(location.accuracy)}m)` : ""}`);
    } else {
      lines.push("Location: not available (silent-emergency mode)");
    }
    lines.push(`Persons affected: ${personsAffected}`);
    if (description.trim()) lines.push(`Description: "${description.trim().slice(0, 200)}${description.length > 200 ? "…" : ""}"`);
    if (!minInfoOnly) {
      lines.push("Mode: full packet (media hashes + callback)");
    } else {
      lines.push("Mode: minimum necessary info only");
    }
    if (safeEvidenceMode) lines.push("SAFE-EVIDENCE MODE: on");
    return lines;
  };

  const send = async () => {
    if (!description.trim()) {
      toast.error("Describe the emergency", {
        description: "Even a few words help the responder understand the situation.",
      });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/emergency/packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          citizenDescription: description.trim(),
          location: location || undefined,
          personsAffected,
          safeEvidenceMode,
          minInfoOnly,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!data.ok || !data.route) {
        toast.error("Send failed", {
          description: data?.message || data?.error || "Try again or call the emergency line directly.",
        });
        return;
      }
      setResult(data.route);
      // Dispatch the event so the home page and other overlays can react.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("circle:emergency-routing", {
            detail: {
              emergencyId: data.route.emergencyId,
              type: data.route.type,
              targetInstitution: data.route.targetInstitution,
              status: data.route.status,
              fallbackUsed: data.route.fallbackUsed,
              timestamp: data.route.timestamp,
            },
          }),
        );
      }
      if (data.route.status === "TRANSMITTED" || data.route.status === "ACKNOWLEDGED") {
        toast.success("Packet transmitted", {
          description: `${data.route.targetInstitution} acknowledged receipt.`,
        });
      } else if (data.route.status === "FALLBACK_USED" || data.route.status === "STATUS_UNAVAILABLE") {
        toast.warning("Packet recorded", {
          description: "Primary channel unavailable. Your report was recorded and will be retransmitted.",
        });
      } else {
        toast.error("Packet failed", {
          description: "All electronic methods failed. Please call the emergency line directly.",
        });
      }
    } catch (err: any) {
      toast.error("Send failed", {
        description: err?.name === "AbortError" ? "Timed out after 8s." : "Network error.",
      });
    } finally {
      setSending(false);
    }
  };

  const triggerFallback = async (level: string) => {
    if (!result) return;
    setPolling(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/emergency/fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emergencyId: result.emergencyId, level }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!data.ok) {
        toast.error("Fallback failed", { description: data?.message || data?.error });
        return;
      }
      setResult((prev) =>
        prev
          ? {
              ...prev,
              status: data.result.status,
              fallbackUsed: data.result.fallbackUsed ?? prev.fallbackUsed,
              statusNote: `${prev.statusNote}\n\n[Manual fallback ${new Date().toISOString()}] ${data.label}: ${data.result.note}`,
            }
          : prev,
      );
      toast.success(`${data.label} attempted`, { description: data.result.note });
    } catch (err: any) {
      toast.error("Fallback failed", {
        description: err?.name === "AbortError" ? "Timed out after 8s." : "Network error.",
      });
    } finally {
      setPolling(false);
    }
  };

  const reset = () => {
    setDescription("");
    setResult(null);
    setPersonsAffected(1);
  };

  const selectedType = TYPE_OPTIONS.find((t) => t.id === type)!;
  const statusTheme = result ? STATUS_THEME[result.status] : null;

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="Emergency Routing">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-red-50 dark:bg-red-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-red-700 dark:text-red-300">Emergency Routing</h2>
            <p className="text-xs text-muted-foreground">Chapters XXII–XXVIII · Minimum necessary info · No fabricated dispatch</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Safety-first banner */}
        <div className="rounded-xl bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 p-3 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-red-900 dark:text-red-100">Do not endanger yourself to gather evidence</p>
            <p className="text-red-800 dark:text-red-200 mt-0.5">
              If you are in immediate danger, leave the scene first and call the emergency line directly (Egypt: 122 police, 123 ambulance). You can send the packet from a safe distance.
            </p>
          </div>
        </div>

        {/* Type selector */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Emergency type</Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Select emergency type">
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setType(opt.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[80px]",
                    active
                      ? "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                      : "border-border hover:border-red-300 hover:bg-muted/50",
                  )}
                >
                  <opt.icon className="w-5 h-5" aria-hidden />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Routed to: {selectedType.channel}</p>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Location</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={detectLocation} disabled={locating} className="min-h-[44px]">
              {locating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
              {location ? `Location set (±${Math.round(location.accuracy || 0)}m)` : "Detect my location"}
            </Button>
            {location && (
              <Badge variant="outline" className="text-xs">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </Badge>
            )}
            {!location && (
              <span className="text-xs text-muted-foreground">Silent-emergency mode — packet can be sent without coordinates.</span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="emergency-description" className="text-sm font-medium">What is happening?</Label>
          <Textarea
            id="emergency-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Two-car collision, one person trapped, smoke visible from one vehicle."
            rows={3}
            maxLength={2000}
            className="resize-none"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="number"
                min={1}
                max={9999}
                value={personsAffected}
                onChange={(e) => setPersonsAffected(Math.max(1, Math.min(9999, Number(e.target.value) || 1)))}
                className="w-16 h-9 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Number of persons affected"
              />
              <span className="text-muted-foreground">persons affected</span>
            </label>
          </div>
        </div>

        {/* Modes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className={cn("flex items-start gap-2 p-3 rounded-lg border cursor-pointer min-h-[60px] transition-colors", safeEvidenceMode ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:bg-muted/50")}>
            <input
              type="checkbox"
              checked={safeEvidenceMode}
              onChange={(e) => setSafeEvidenceMode(e.target.checked)}
              className="accent-emerald-600 mt-0.5"
              aria-label="SAFE-EVIDENCE MODE — report from a safe distance"
            />
            <div className="text-sm">
              <p className="font-medium">SAFE-EVIDENCE MODE</p>
              <p className="text-xs text-muted-foreground">Report from a safe distance. No media capture is attempted while you may be in danger.</p>
            </div>
          </label>
          <label className={cn("flex items-start gap-2 p-3 rounded-lg border cursor-pointer min-h-[60px] transition-colors", minInfoOnly ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-border hover:bg-muted/50")}>
            <input
              type="checkbox"
              checked={minInfoOnly}
              onChange={(e) => setMinInfoOnly(e.target.checked)}
              className="accent-amber-600 mt-0.5"
              aria-label="Minimum necessary info only"
            />
            <div className="text-sm">
              <p className="font-medium">Minimum necessary info only</p>
              <p className="text-xs text-muted-foreground">Send only type, location, count, description. No media hashes, no callback phone.</p>
            </div>
          </label>
        </div>

        {/* Packet preview */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-muted-foreground" aria-hidden />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">What will be sent</p>
          </div>
          <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/80 leading-relaxed">{buildPreviewPacket().join("\n")}</pre>
        </div>

        {/* Send */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={send} disabled={sending || !description.trim()} size="lg" className="min-h-[52px] flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white">
            {sending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
            Send emergency packet
          </Button>
          {result && (
            <Button variant="outline" onClick={reset} className="min-h-[52px]">
              New report
            </Button>
          )}
        </div>

        {/* Result */}
        {result && statusTheme && (
          <div className={cn("rounded-xl border p-4 space-y-3", statusTheme.bg)} role="status" aria-live="polite">
            <div className="flex items-start gap-3">
              <statusTheme.icon className={cn("w-6 h-6 shrink-0", statusTheme.color)} aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{statusTheme.label}</h3>
                  <Badge variant="outline" className="text-xs">
                    {result.targetInstitution}
                  </Badge>
                  {result.fallbackUsed && (
                    <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-300">
                      Fallback: {FALLBACK_LABELS[result.fallbackUsed] || result.fallbackUsed}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono break-all">ID: {result.emergencyId}</p>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/80 bg-white/50 dark:bg-black/20 rounded-md p-2 border border-border/40 max-h-48 overflow-y-auto">{result.statusNote}</pre>

            {/* Rule 1 reminder */}
            <div className="rounded-lg bg-white/60 dark:bg-black/20 border border-border/40 p-2 text-xs text-muted-foreground">
              {result.status === "TRANSMITTED" || result.status === "ACKNOWLEDGED"
                ? "✓ The responder confirmed receipt. Status reflects ONLY what the authority returned."
                : result.status === "FALLBACK_USED" || result.status === "STATUS_UNAVAILABLE"
                  ? "⚠ Primary channel unavailable. Your report was recorded — NOT a confirmed dispatch. The packet will be retransmitted when the network is restored."
                  : "✗ All electronic methods failed. Please call the emergency line directly. Your report was recorded for audit."}
            </div>

            {/* Fallback controls */}
            {(result.status === "STATUS_UNAVAILABLE" || result.status === "FAILED") && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Retry via fallback</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={polling} onClick={() => triggerFallback("SMS_DATA")} className="min-h-[40px]">
                    {polling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Phone className="w-3 h-3 mr-1" />}
                    SMS data
                  </Button>
                  <Button size="sm" variant="outline" disabled={polling} onClick={() => triggerFallback("TELEPHONE")} className="min-h-[40px]">
                    <Phone className="w-3 h-3 mr-1" />
                    Telephone
                  </Button>
                  <Button size="sm" variant="outline" disabled={polling} onClick={() => triggerFallback("OFFLINE_QUEUE")} className="min-h-[40px]">
                    <Database className="w-3 h-3 mr-1" />
                    Offline queue
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

export default EmergencyRouting;
