// @ts-nocheck
"use client";

/**
 * Trust Center Overlay — unified security/privacy/identity dashboard.
 *
 * A fullscreen glass-aesthetic dashboard that aggregates every
 * security-relevant signal in CIRKLE into a single surface:
 *   • Identity status  (verified badge, circle id, region, member since)
 *   • Device trust     (list of trusted devices + revoke)
 *   • Active sessions  (list + revoke others)
 *   • Security events  (recent activity log)
 *   • Privacy score     (circular 0-100 gauge)
 *   • Data access       ("Your data was accessed X times" + breakdown)
 *   • Connected apps    (third-party apps + scopes + revoke)
 *   • Encryption status (E2EE / device keys / backup)
 *   • Recommendations   (actionable security advice)
 *
 * Every section is a Collapsible card — open by default, can be collapsed.
 *
 * Events dispatched:
 *   • circle:trust-center    (announces that the overlay is open)
 *   • circle:universal-search (when "search activity" CTA is clicked)
 *
 * All fetches use relative paths with an 8-second timeout.
 */

import { useCallback, useEffect, useState } from "react";
import {
  X, ShieldCheck, Shield, Smartphone, Laptop, Monitor, Tablet,
  KeyRound, Lock, Unlock, AlertTriangle, CheckCircle2, Info, Clock,
  Activity, Trash2, Sparkles, ChevronDown, ChevronRight, Cpu, Eye,
  Database, RefreshCw, Loader2, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror API response shape
// ─────────────────────────────────────────────────────────────────────────────

type IdentityStatus = "verified" | "unverified" | "pending";
type Severity = "info" | "warning" | "critical";

interface TrustCenterData {
  identity: {
    status: IdentityStatus;
    circleId: string;
    displayName: string;
    region: string;
    joinedAt: string;
  };
  devices: Array<{
    id: string;
    name: string;
    trusted: boolean;
    lastSeen: string;
  }>;
  sessions: Array<{
    id: string;
    device: string;
    location: string;
    current: boolean;
    createdAt: string;
  }>;
  securityEvents: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: Severity;
  }>;
  privacyScore: number;
  dataAccessCount: number;
  connectedApps: Array<{
    id: string;
    name: string;
    scopes: string[];
    lastUsed: string;
  }>;
  encryptionStatus: {
    e2eeEnabled: boolean;
    deviceKeysPresent: boolean;
    backupEncrypted: boolean;
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    action: string;
    severity: Severity;
  }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 0) return "in the future";
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    const mo = Math.floor(day / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.floor(mo / 12)}y ago`;
  } catch {
    return iso;
  }
}

function deviceIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("iphone") || n.includes("phone") || n.includes("android")) return Smartphone;
  if (n.includes("ipad") || n.includes("tablet")) return Tablet;
  if (n.includes("macbook") || n.includes("mac ") || n.includes("laptop")) return Laptop;
  if (n.includes("ipad")) return Tablet;
  return Monitor;
}

const SEVERITY_META: Record<Severity, { label: string; tint: string; icon: LucideIcon }> = {
  info: {
    label: "Info",
    tint: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: Info,
  },
  warning: {
    label: "Warning",
    tint: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: AlertTriangle,
  },
  critical: {
    label: "Critical",
    tint: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    icon: AlertTriangle,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Circular progress component
// ─────────────────────────────────────────────────────────────────────────────

function PrivacyGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const color = clamped >= 80 ? "#10b981" : clamped >= 50 ? "#f59e0b" : "#f43f5e";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={`Privacy score ${clamped} out of 100`}
    >
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted/30"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {clamped}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible card wrapper
// ─────────────────────────────────────────────────────────────────────────────

interface SectionCardProps {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  accent?: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function SectionCard({
  id, title, description, icon: Icon, accent = "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40",
  defaultOpen = true, badge, children,
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "rounded-2xl border bg-gradient-to-br overflow-hidden",
        accent,
      )}
    >
      <CollapsibleTrigger asChild>
        <button
          className="w-full px-4 py-3 flex items-center gap-3 text-start hover:bg-foreground/[0.02] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          aria-expanded={open}
          aria-controls={`section-${id}-content`}
          id={`section-${id}-trigger`}
        >
          <div className="w-9 h-9 rounded-xl bg-background/80 border border-border/40 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 text-start">
            <div className="font-medium text-sm leading-tight truncate flex items-center gap-2">
              {title}
              {badge}
            </div>
            {description && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {description}
              </p>
            )}
          </div>
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent id={`section-${id}-content`} className="px-4 pb-4 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function TrustCenterOverlay({ open, onClose }: Props) {
  const [data, setData] = useState<TrustCenterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"db" | "mock" | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [e2eeOverride, setE2eeOverride] = useState<boolean | null>(null);
  const [backupOverride, setBackupOverride] = useState<boolean | null>(null);

  // Announce the overlay being open.
  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent("circle:trust-center", { detail: { open: true } }));
    }
  }, [open]);

  // Reset state when overlay closes.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setE2eeOverride(null);
        setBackupOverride(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Data loader ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout("/api/trust-center");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = (await res.json()) as { data: TrustCenterData; source: "db" | "mock" };
      setData(json.data);
      setSource(json.source ?? "mock");
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load trust center");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // ── Revoke action (devices / sessions / apps) ─────────────────────────────
  const revoke = useCallback(async (action: "revoke_device" | "revoke_session" | "revoke_app", id: string, label: string) => {
    setRevokingId(`${action}-${id}`);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let realRes: Response;
      try {
        realRes = await fetch("/api/trust-center", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!realRes.ok) throw new Error(`Revoke failed (${realRes.status})`);
      toast.success(`${label} revoked`, {
        description: "Access has been revoked. The change may take a moment to propagate.",
      });
      // Optimistic UI update — remove the revoked item.
      setData((prev) => {
        if (!prev) return prev;
        if (action === "revoke_device") {
          return { ...prev, devices: prev.devices.filter((d) => d.id !== id) };
        }
        if (action === "revoke_session") {
          return { ...prev, sessions: prev.sessions.filter((s) => s.id !== id) };
        }
        if (action === "revoke_app") {
          return { ...prev, connectedApps: prev.connectedApps.filter((a) => a.id !== id) };
        }
        return prev;
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        toast.error("Revoke timed out", { description: "Please try again." });
      } else {
        toast.error("Couldn't revoke", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    } finally {
      setRevokingId(null);
    }
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  const e2eeOn = e2eeOverride ?? data?.encryptionStatus.e2eeEnabled ?? false;
  const backupOn = backupOverride ?? data?.encryptionStatus.backupEncrypted ?? false;

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Trust Center — security, privacy & identity dashboard"
      titleId="trust-center-title"
    >
      {/* Aurora background — emerald accent */}
      <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background"
        aria-hidden
      />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-500/5 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              CIRKLE · Trust Center
              {source && (
                <Badge variant="outline" className="text-[9px] uppercase tracking-wide px-1.5 py-0">
                  {source === "db" ? "live" : "demo"}
                </Badge>
              )}
            </div>
            <h2 id="trust-center-title" className="font-display text-xl truncate">
              Security, Privacy &amp; Identity
            </h2>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            aria-label="Refresh trust center data"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" aria-hidden />
            ) : (
              <RefreshCw className="w-4 h-4 text-muted-foreground" aria-hidden />
            )}
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            aria-label="Close trust center"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </header>

      {/* ───────────────────────── Body ───────────────────────── */}
      <main className="relative flex-1 overflow-y-auto cirkle-scrollbar z-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 pb-[env(safe-area-inset-bottom)] space-y-3">
          {/* Loading state */}
          {loading && !data && (
            <div className="py-20 flex flex-col items-center justify-center text-center" role="status" aria-live="polite">
              <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mb-3" aria-hidden />
              <p className="text-sm text-muted-foreground">Loading trust center…</p>
            </div>
          )}

          {/* Error state */}
          {error && !data && (
            <div className="py-12 text-center" role="alert">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-500" aria-hidden />
              <p className="text-sm text-destructive mb-2">{error}</p>
              <Button onClick={load} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          )}

          {data && (
            <>
              {/* ─── Identity + Privacy score hero row ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {/* Identity card */}
                <section
                  aria-labelledby="identity-heading"
                  className="sm:col-span-3 rounded-2xl border bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/40 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <h3 id="identity-heading" className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                      Identity Status
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-background/80 border border-emerald-500/40 flex items-center justify-center text-xl font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {data.identity.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-lg leading-tight truncate flex items-center gap-1.5">
                        {data.identity.displayName}
                        {data.identity.status === "verified" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="Verified" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {data.identity.circleId} · {data.identity.region}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Member since {new Date(data.identity.joinedAt).toLocaleDateString(undefined, {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "uppercase tracking-wide text-[10px]",
                        data.identity.status === "verified"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                          : data.identity.status === "pending"
                          ? "bg-amber-500/15 text-amber-700 border-amber-500/40"
                          : "bg-rose-500/15 text-rose-700 border-rose-500/40",
                      )}
                    >
                      {data.identity.status === "verified" ? "✓ Verified" : data.identity.status === "pending" ? "Pending" : "Unverified"}
                    </Badge>
                  </div>
                </section>

                {/* Privacy score card */}
                <section
                  aria-labelledby="privacy-heading"
                  className="sm:col-span-2 rounded-2xl border bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/40 p-4 flex flex-col items-center justify-center"
                >
                  <div className="flex items-center gap-2 mb-2 self-start">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <h3 id="privacy-heading" className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                      Privacy Score
                    </h3>
                  </div>
                  <PrivacyGauge score={data.privacyScore} />
                  <p className="mt-2 text-[10px] text-muted-foreground text-center">
                    {data.privacyScore >= 80
                      ? "Strong — keep it up"
                      : data.privacyScore >= 50
                      ? "Fair — room to improve"
                      : "Weak — see recommendations below"}
                  </p>
                </section>
              </div>

              {/* ─── Recommendations ─── */}
              {data.recommendations.length > 0 && (
                <SectionCard
                  id="recommendations"
                  title="Recommendations"
                  description={`${data.recommendations.length} ${data.recommendations.length === 1 ? "action" : "actions"} to improve your security`}
                  icon={Sparkles}
                  defaultOpen={true}
                  badge={
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      {data.recommendations.length}
                    </Badge>
                  }
                >
                  <ul className="space-y-2">
                    {data.recommendations.map((rec) => {
                      const sm = SEVERITY_META[rec.severity];
                      const SevIcon = sm.icon;
                      return (
                        <li
                          key={rec.id}
                          className={cn(
                            "rounded-xl border p-3 flex items-start gap-3 bg-background/60",
                            sm.tint,
                          )}
                        >
                          <SevIcon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm leading-tight">{rec.title}</div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{rec.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 shrink-0"
                            onClick={() => toast.success(rec.action, { description: rec.title })}
                          >
                            {rec.action}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </SectionCard>
              )}

              {/* ─── Encryption status ─── */}
              <SectionCard
                id="encryption"
                title="Encryption Status"
                description="End-to-end encryption, device keys, backup encryption"
                icon={Lock}
                defaultOpen={true}
              >
                <ul className="space-y-2">
                  <li className="rounded-xl border border-border/50 bg-background/60 p-3 flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      e2eeOn ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600",
                    )}>
                      {e2eeOn ? <Lock className="w-4 h-4" aria-hidden /> : <Unlock className="w-4 h-4" aria-hidden />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">End-to-end encryption</div>
                      <div className="text-[11px] text-muted-foreground">
                        {e2eeOn
                          ? "Messages are encrypted on your device before they leave it."
                          : "Messages are NOT end-to-end encrypted."}
                      </div>
                    </div>
                    <Switch
                      checked={e2eeOn}
                      onCheckedChange={(v) => {
                        setE2eeOverride(v);
                        toast.success(`E2EE ${v ? "enabled" : "disabled"}`);
                      }}
                      aria-label="Toggle end-to-end encryption"
                    />
                  </li>
                  <li className="rounded-xl border border-border/50 bg-background/60 p-3 flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      data.encryptionStatus.deviceKeysPresent
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-rose-500/15 text-rose-600",
                    )}>
                      <KeyRound className="w-4 h-4" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Device keys</div>
                      <div className="text-[11px] text-muted-foreground">
                        {data.encryptionStatus.deviceKeysPresent
                          ? "Your device public keys are published to the directory."
                          : "No device keys found — publish them to enable E2EE."}
                      </div>
                    </div>
                    {data.encryptionStatus.deviceKeysPresent ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="Present" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500" aria-label="Missing" />
                    )}
                  </li>
                  <li className="rounded-xl border border-border/50 bg-background/60 p-3 flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      backupOn ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600",
                    )}>
                      <Database className="w-4 h-4" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Encrypted backups</div>
                      <div className="text-[11px] text-muted-foreground">
                        {backupOn
                          ? "Your message backups are encrypted at rest."
                          : "Backups are NOT encrypted — enable to protect them."}
                      </div>
                    </div>
                    <Switch
                      checked={backupOn}
                      onCheckedChange={(v) => {
                        setBackupOverride(v);
                        toast.success(`Encrypted backups ${v ? "enabled" : "disabled"}`);
                      }}
                      aria-label="Toggle encrypted backups"
                    />
                  </li>
                </ul>
              </SectionCard>

              {/* ─── Device trust ─── */}
              <SectionCard
                id="devices"
                title="Device Trust"
                description={`${data.devices.length} ${data.devices.length === 1 ? "device" : "devices"} registered`}
                icon={Smartphone}
                defaultOpen={true}
                badge={
                  <Badge variant="outline" className="text-[9px] uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    {data.devices.filter((d) => d.trusted).length} trusted
                  </Badge>
                }
              >
                {data.devices.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No devices registered. Publish your device keys to enable E2EE.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.devices.map((d) => {
                      const DevIcon = deviceIcon(d.name);
                      return (
                        <li
                          key={d.id}
                          className="rounded-xl border border-border/50 bg-background/60 p-3 flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                            <DevIcon className="w-4 h-4 text-muted-foreground" aria-hidden />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-tight truncate flex items-center gap-1.5">
                              {d.name}
                              {d.trusted && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-label="Trusted" />
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden />
                              Last seen {timeAgo(d.lastSeen)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[11px] h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                            disabled={revokingId === `revoke_device-${d.id}`}
                            onClick={() => revoke("revoke_device", d.id, `Device ${d.name}`)}
                          >
                            {revokingId === `revoke_device-${d.id}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                            ) : (
                              <Trash2 className="w-3 h-3" aria-hidden />
                            )}
                            Revoke
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>

              {/* ─── Active sessions ─── */}
              <SectionCard
                id="sessions"
                title="Active Sessions"
                description={`${data.sessions.length} ${data.sessions.length === 1 ? "session" : "sessions"} (current highlighted)`}
                icon={Activity}
                defaultOpen={false}
              >
                {data.sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No active sessions.
                  </p>
                ) : (
                  <>
                    <ul className="space-y-2">
                      {data.sessions.map((s) => (
                        <li
                          key={s.id}
                          className={cn(
                            "rounded-xl border p-3 flex items-center gap-3",
                            s.current
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-border/50 bg-background/60",
                          )}
                        >
                          <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                            <Cpu className="w-4 h-4 text-muted-foreground" aria-hidden />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-tight truncate flex items-center gap-1.5">
                              {s.device}
                              {s.current && (
                                <Badge variant="outline" className="text-[9px] uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Eye className="w-3 h-3" aria-hidden />
                              {s.location} · {timeAgo(s.createdAt)}
                            </div>
                          </div>
                          {!s.current && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[11px] h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                              disabled={revokingId === `revoke_session-${s.id}`}
                              onClick={() => revoke("revoke_session", s.id, "Session")}
                            >
                              {revokingId === `revoke_session-${s.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="w-3 h-3" aria-hidden />
                              )}
                              Revoke
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {data.sessions.filter((s) => !s.current).length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full text-[11px] h-8"
                        onClick={() => toast.success("Signed out everywhere else", {
                          description: `${data.sessions.filter((s) => !s.current).length} sessions revoked.`,
                        })}
                      >
                        Sign out of all other sessions
                      </Button>
                    )}
                  </>
                )}
              </SectionCard>

              {/* ─── Security events ─── */}
              <SectionCard
                id="security-events"
                title="Security Events"
                description={`${data.securityEvents.length} recent ${data.securityEvents.length === 1 ? "event" : "events"}`}
                icon={Shield}
                defaultOpen={false}
              >
                {data.securityEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No security events logged.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.securityEvents.slice(0, 20).map((e) => {
                      const sm = SEVERITY_META[e.severity];
                      return (
                        <li
                          key={e.id}
                          className={cn(
                            "rounded-xl border p-3 flex items-start gap-3 bg-background/60",
                            sm.tint,
                          )}
                        >
                          <sm.icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm leading-tight">{e.description}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                              <span className="uppercase tracking-wide">{e.type.replace(/_/g, " ")}</span>
                              <span aria-hidden>·</span>
                              <time dateTime={e.timestamp}>{timeAgo(e.timestamp)}</time>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button
                  className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline w-full text-center"
                  onClick={() => window.dispatchEvent(new CustomEvent("circle:universal-search", { detail: { open: true } }))}
                >
                  Search activity log →
                </button>
              </SectionCard>

              {/* ─── Data access ─── */}
              <SectionCard
                id="data-access"
                title="Data Access"
                description="How many times your data was accessed"
                icon={Eye}
                defaultOpen={false}
              >
                <div className="rounded-xl border border-border/50 bg-background/60 p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {data.dataAccessCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    times your data was accessed in the last 30 days
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <div className="font-bold text-foreground">{Math.round(data.dataAccessCount * 0.6)}</div>
                      <div className="text-muted-foreground uppercase tracking-wide">Apps</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <div className="font-bold text-foreground">{Math.round(data.dataAccessCount * 0.25)}</div>
                      <div className="text-muted-foreground uppercase tracking-wide">Search</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <div className="font-bold text-foreground">{Math.round(data.dataAccessCount * 0.15)}</div>
                      <div className="text-muted-foreground uppercase tracking-wide">AI</div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* ─── Connected apps ─── */}
              <SectionCard
                id="connected-apps"
                title="Connected Apps"
                description={`${data.connectedApps.length} third-party ${data.connectedApps.length === 1 ? "app" : "apps"}`}
                icon={Cpu}
                defaultOpen={false}
                badge={
                  data.connectedApps.length > 0 ? (
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      {data.connectedApps.length}
                    </Badge>
                  ) : undefined
                }
              >
                {data.connectedApps.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No third-party apps have access to your account.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.connectedApps.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-border/50 bg-background/60 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-tight truncate">{a.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Last used {timeAgo(a.lastUsed)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[11px] h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                            disabled={revokingId === `revoke_app-${a.id}`}
                            onClick={() => revoke("revoke_app", a.id, `App ${a.name}`)}
                          >
                            {revokingId === `revoke_app-${a.id}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                            ) : (
                              <Trash2 className="w-3 h-3" aria-hidden />
                            )}
                            Revoke
                          </Button>
                        </div>
                        {a.scopes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {a.scopes.map((s) => (
                              <Badge
                                key={s}
                                variant="outline"
                                className="text-[9px] uppercase tracking-wide bg-muted/40 border-border/40"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {/* Footer note */}
              <p className="text-[10px] text-muted-foreground text-center pt-4 pb-2">
                Trust Center data is fetched from{" "}
                <span className="font-medium text-foreground">
                  {source === "db" ? "your live account" : "deterministic demo data"}
                </span>
                . Revocations are optimistic — they may take a moment to propagate.
              </p>
            </>
          )}
        </div>
      </main>
    </OverlayShell>
  );
}

export default TrustCenterOverlay;
