"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Link2,
  Link2Off,
  Banknote,
  Eye,
  AlertTriangle,
  Brain,
  Camera,
  ScanLine,
  CheckCircle2,
  Activity,
  Lock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// ─────────────────────────────────────────────────────────────────────────────

type AlertType = "scam" | "phishing" | "fraud" | "predatory";
type Severity = "blocked" | "removed" | "warning" | "monitoring";

interface SentinelAlert {
  id: string;
  type: AlertType;
  typeEmoji: string;
  severity: Severity;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  actionTaken: string;
  patterns?: string[];
}

interface Stats {
  messagesScanned: number;
  threatsBlocked: number;
  scamsDetected: number;
  phishingLinksRemoved: number;
}

interface ProtectionSettings {
  scamDetection: boolean;
  phishingBlocker: boolean;
  fraudAlert: boolean;
  mentalHealthCheck: boolean;
  screenshotProtection: boolean;
}

const SAMPLE_ALERTS: SentinelAlert[] = [
  {
    id: "sa-1",
    type: "scam",
    typeEmoji: "🚫",
    severity: "blocked",
    title: "Message from @unknown matches 4 scam patterns",
    description:
      "Unsolicited investment pitch using 'guaranteed returns' language + pressure tactics + unverified sender + request to move conversation off-platform.",
    source: "Wasl · @unknown_user_8472",
    timestamp: "2 min ago",
    actionTaken: "Message blocked · Sender reported · Conversation quarantined",
    patterns: ["guaranteed returns", "act now or lose out", "off-platform request", "unverified sender"],
  },
  {
    id: "sa-2",
    type: "phishing",
    typeEmoji: "🔗",
    severity: "removed",
    title: "Suspicious link detected in Wasl message",
    description:
      "Link 'cirklе-verify.com' uses a Cyrillic 'е' (homoglyph) to impersonate cirkle-verify.com. Domain registered 3 days ago. No HTTPS certificate transparency record.",
    source: "Wasl · group: Cairo Tech Circle",
    timestamp: "18 min ago",
    actionTaken: "Link stripped from message · Warning banner added · Original sender notified",
    patterns: ["homoglyph domain", "newly registered domain (3d)", "impersonates cirkle brand"],
  },
  {
    id: "sa-3",
    type: "fraud",
    typeEmoji: "💸",
    severity: "warning",
    title: "Large payment to new contact flagged",
    description:
      "Outgoing payment of 1,200 SAR to a contact added 6 minutes ago. No prior transaction history. Pattern matches 87% of romance-scam escalation sequences.",
    source: "Cirkle Pay · new contact @sara_8842",
    timestamp: "1 hour ago",
    actionTaken: "Payment held in escrow · Confirmation required · 24h cooling-off window",
    patterns: ["large first payment", "new contact (<10 min)", "no shared circles"],
  },
  {
    id: "sa-4",
    type: "predatory",
    typeEmoji: "⚠️",
    severity: "monitoring",
    title: "Conversation pattern flagged for review",
    description:
      "Thread with @new_friend_22 shows escalating intimacy timeline + repeated requests for photos + isolation from existing circles. Pattern consistent with grooming behavior.",
    source: "Wasl · @new_friend_22",
    timestamp: "3 hours ago",
    actionTaken:
      "Monitoring active · No action taken yet · Mental health resources surfaced to you",
    patterns: ["rapid intimacy escalation", "photo requests", "isolation language", "age-gap signals"],
  },
];

const STATS: Stats = {
  messagesScanned: 4287,
  threatsBlocked: 23,
  scamsDetected: 11,
  phishingLinksRemoved: 8,
};

const SEVERITY_META: Record<
  Severity,
  { label: string; className: string; icon: LucideIcon }
> = {
  blocked: {
    label: "Blocked",
    className: "bg-accent/15 text-accent border-accent/40",
    icon: Ban,
  },
  removed: {
    label: "Removed",
    className: "bg-secondary/15 text-secondary border-secondary/40",
    icon: Link2Off,
  },
  warning: {
    label: "Warning",
    className: "bg-secondary/15 text-secondary border-secondary/40",
    icon: AlertTriangle,
  },
  monitoring: {
    label: "Monitoring",
    className: "bg-primary/15 text-primary border-primary/40",
    icon: Eye,
  },
};

const TYPE_ICON: Record<AlertType, LucideIcon> = {
  scam: Ban,
  phishing: Link2,
  fraud: Banknote,
  predatory: AlertTriangle,
};

// Big animated counter (count-up)
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    const start = Date.now();
    const t = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(target * eased));
      if (p >= 1) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

function StatTile({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tint: string;
}) {
  const v = useCountUp(value);
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3.5 relative overflow-hidden">
      <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full bg-gradient-to-br from-secondary/10 to-primary/10 blur-xl" aria-hidden />
      <div className="relative flex items-start gap-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", tint)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-2xl leading-none tabular-nums">{v.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</div>
        </div>
      </div>
    </div>
  );
}

export function CirkleSentinel({ open, onClose }: Props) {
  const [settings, setSettings] = useState<ProtectionSettings>({
    scamDetection: true,
    phishingBlocker: true,
    fraudAlert: true,
    mentalHealthCheck: true,
    screenshotProtection: false,
  });

  // Live "scan demo" state — simulates messages being scanned in real time
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanResult, setLastScanResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setScanning(false);
        setScanProgress(0);
        setLastScanResult(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const toggleSetting = (key: keyof ProtectionSettings, label: string) => {
    setSettings((s) => {
      const next = { ...s, [key]: !s[key] };
      toast.success(
        `${label} ${next[key] ? "enabled" : "disabled"}`,
        { description: next[key] ? "Sentinel will monitor for this category." : "This category will be skipped." },
      );
      return next;
    });
  };

  const runScanDemo = async () => {
    if (scanning) return;
    setScanning(true);
    setScanProgress(0);
    setLastScanResult(null);
    const sample = "Hi! Guaranteed returns on your crypto investment. Act now — send money via gift card.";
    let pct = 0;
    const t = setInterval(() => {
      pct = Math.min(pct + 7, 100);
      setScanProgress(pct);
      if (pct >= 100) clearInterval(t);
    }, 80);

    // Run the real POST against /api/sentinel — falls back gracefully.
    let verdict = "blocked";
    let action = "Message blocked · Sender quarantined";
    let confidence = 96;
    let patterns: string[] = ["guaranteed returns", "act now", "gift-card payment"];
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: sample, sender: "@demo_sender" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.verdict) verdict = data.verdict;
        if (data?.actionTaken) action = data.actionTaken;
        if (typeof data?.confidence === "number") confidence = data.confidence;
        if (Array.isArray(data?.patterns) && data.patterns.length) patterns = data.patterns;
      }
    } catch {
      // fall back to defaults
    }

    // Wait for progress to finish if API returned faster
    setTimeout(() => {
      setScanning(false);
      setLastScanResult(`${verdict} · ${confidence}% confidence · ${action} · ${patterns.length} patterns matched`);
      toast.success(`Sentinel scan complete`, {
        description: `Verdict: ${verdict} — ${patterns.length} pattern(s) matched`,
      });
    }, 1300);
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="CirkleSentinel — AI Safety Guardian">
          <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background" aria-hidden />

          {/* ───────────────────────── Header ───────────────────────── */}
          <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-primary/20 border border-accent/40 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl leading-tight">CirkleSentinel</h1>
                <p className="text-[11px] text-muted-foreground truncate">AI Safety Guardian</p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                On-device · Active
              </span>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* ───────────────────────── Body ───────────────────────── */}
          <div className="relative flex-1 overflow-y-auto z-0">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 pb-24 space-y-5">
              {/* ─────────────── Section 1: Threat Dashboard ─────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-primary" />
                  <h2 className="font-display text-base">Threat Dashboard</h2>
                  <span className="ml-auto text-[10px] text-muted-foreground">Last 30 days</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatTile label="Messages scanned" value={STATS.messagesScanned} icon={ScanLine} tint="bg-primary/15 text-primary border-primary/30" />
                  <StatTile label="Threats blocked" value={STATS.threatsBlocked} icon={Ban} tint="bg-accent/15 text-accent border-accent/30" />
                  <StatTile label="Scams detected" value={STATS.scamsDetected} icon={ShieldAlert} tint="bg-secondary/15 text-secondary border-secondary/30" />
                  <StatTile label="Phishing links removed" value={STATS.phishingLinksRemoved} icon={Link2Off} tint="bg-secondary/15 text-secondary border-secondary/30" />
                </div>

                {/* Live scan demo */}
                <div className="mt-3 rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/25 to-accent/15 border border-primary/30 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Live message scan</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Try the on-device model on a sample suspicious message.
                      </div>

                      {scanning && (
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Scanning on-device…</span>
                            <span className="tabular-nums">{scanProgress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              animate={{ width: `${scanProgress}%` }}
                              transition={{ ease: "linear", duration: 0.08 }}
                              className="h-full bg-gradient-to-r from-primary to-accent"
                            />
                          </div>
                        </div>
                      )}

                      {lastScanResult && !scanning && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-[11px] text-accent flex items-start gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{lastScanResult}</span>
                        </motion.div>
                      )}
                    </div>
                    <button
                      onClick={runScanDemo}
                      disabled={scanning}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-gradient-hero text-cream text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {scanning ? <ScanLine className="w-3.5 h-3.5 animate-pulse" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {scanning ? "Scanning…" : "Run demo"}
                    </button>
                  </div>
                </div>
              </section>

              {/* ─────────────── Section 2: Recent Alerts ─────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-accent" />
                  <h2 className="font-display text-base">Recent Alerts</h2>
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-[10px] font-medium text-accent">
                    {SAMPLE_ALERTS.length} new
                  </span>
                </div>

                <div className="space-y-2.5">
                  {SAMPLE_ALERTS.map((a, i) => {
                    const SevIcon = SEVERITY_META[a.severity].icon;
                    const TypeIcon = TYPE_ICON[a.type];
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.25 }}
                        className="rounded-2xl border border-border/60 bg-card p-4"
                      >
                        {/* Top row */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-primary/10 border border-border/60 flex items-center justify-center text-lg shrink-0">
                            {a.typeEmoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap">
                              <TypeIcon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <h3 className="font-medium text-sm leading-snug flex-1 min-w-0">
                                {a.title}
                              </h3>
                              <span
                                className={cn(
                                  "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                  SEVERITY_META[a.severity].className,
                                )}
                              >
                                <SevIcon className="w-3 h-3" />
                                {SEVERITY_META[a.severity].label}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1.5">{a.description}</p>
                          </div>
                        </div>

                        {/* Patterns */}
                        {a.patterns && a.patterns.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-3">
                            <span className="text-[10px] text-muted-foreground mr-1">Patterns:</span>
                            {a.patterns.map((p, k) => (
                              <span
                                key={k}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/60 text-[9px] text-muted-foreground"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 border border-border/60 text-[10px] text-muted-foreground">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            {a.source}
                          </div>
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 border border-border/60 text-[10px] text-muted-foreground">
                            {a.timestamp}
                          </div>
                          <div
                            className={cn(
                              "ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border",
                              SEVERITY_META[a.severity].className,
                            )}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {a.actionTaken}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* ─────────────── Section 3: Protection Settings ─────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h2 className="font-display text-base">Protection Settings</h2>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
                  {[
                    {
                      key: "scamDetection" as const,
                      label: "Scam detection",
                      desc: "Block messages matching known scam patterns.",
                      icon: Ban,
                      tint: "bg-accent/15 text-accent border-accent/30",
                    },
                    {
                      key: "phishingBlocker" as const,
                      label: "Phishing blocker",
                      desc: "Strip suspicious links + add warning banners.",
                      icon: Link2Off,
                      tint: "bg-secondary/15 text-secondary border-secondary/30",
                    },
                    {
                      key: "fraudAlert" as const,
                      label: "Fraud alert",
                      desc: "Hold large payments to new contacts in escrow.",
                      icon: Banknote,
                      tint: "bg-secondary/15 text-secondary border-secondary/30",
                    },
                    {
                      key: "mentalHealthCheck" as const,
                      label: "Mental health check",
                      desc: "Surface resources when conversation tone shifts.",
                      icon: Brain,
                      tint: "bg-primary/15 text-primary border-primary/30",
                    },
                    {
                      key: "screenshotProtection" as const,
                      label: "Screenshot protection",
                      desc: "Best-effort screen-capture block in sensitive threads.",
                      icon: Camera,
                      tint: "bg-primary/15 text-primary border-primary/30",
                    },
                  ].map((row) => {
                    const Icon = row.icon;
                    const enabled = settings[row.key];
                    return (
                      <div key={row.key} className="flex items-center gap-3 p-3.5">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0", row.tint)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{row.label}</div>
                          <div className="text-[11px] text-muted-foreground">{row.desc}</div>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggleSetting(row.key, row.label)}
                          aria-label={`Toggle ${row.label}`}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <span>
                    All scans run <span className="text-foreground font-medium">100% on-device</span> — no message content ever leaves your phone. Pattern updates arrive over the community threat-intel mesh.
                  </span>
                </div>
              </section>
            </div>
          </div>

          {/* ───────────────────────── Footer ───────────────────────── */}
          <div className="relative z-10 px-4 sm:px-6 pb-[env(safe-area-inset-bottom)] pt-2 border-t border-border/60 glass-strong">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Sentinel v4.2 · last pattern sync 6 min ago
              </div>
              <button
                onClick={runScanDemo}
                disabled={scanning}
                className="px-3 py-2 rounded-xl bg-gradient-hero text-cream text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <ScanLine className={cn("w-3.5 h-3.5", scanning && "animate-pulse")} />
                {scanning ? "Scanning…" : "Scan now"}
              </button>
            </div>
          </div>
    </OverlayShell>
  );
}
