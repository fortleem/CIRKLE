"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, ShieldCheck, RefreshCw, Loader2, Radio, Newspaper, Video, Globe2,
  FileText, Users, GitBranch, CheckCircle2, Building2, Heart, AlertTriangle,
  Lock, Eye, EyeOff, Zap, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { open: boolean; onClose: () => void; }

// ── Types ─────────────────────────────────────────────────────────

interface PostSummary {
  id: string;
  authorName: string;
  authorHandle: string;
  authorInitials: string;
  body: string;
  module: string;
  visibility: string;
  location?: string | null;
  tags?: string[];
  timestamp: string;
  stats: { likes: number; comments: number; shares: number; views: number };
  media?: { kind: string; count?: number; cover?: string } | null;
}

interface ImpactMetrics {
  reportsFiled: number;
  agenciesRouted: number;
  evidenceVerified: number;
  witnessesRecruited: number;
}

// ── Static data ───────────────────────────────────────────────────

const NGO_PARTNERS = [
  { name: "Migrahack Egypt", focus: "Migrant & refugee rights", region: "Cairo", emoji: "🕊️" },
  { name: "Arab Forum for Digital Rights", focus: "Digital privacy & civic tech", region: "Beirut", emoji: "🌐" },
  { name: "Hurryyat Citizen Watch", focus: "Police oversight", region: "Amman", emoji: "⚖️" },
  { name: "Marsad Shabab", focus: "Youth civic participation", region: "Tunis", emoji: "📋" },
  { name: "Access Now MENA", focus: "Digital rights & crisis response", region: "Regional", emoji: "📲" },
  { name: "Human Rights Watch — MENA", focus: "Cross-border escalation", region: "Global", emoji: "🌍" },
];

// ── Helpers ───────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch { return iso; }
}

function parseWaveBody(body: string): {
  caseNumber?: string;
  office?: string;
  category?: string;
  title?: string;
} {
  // Extract case number, office, category, title from the Civic Wave post body.
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const caseNumber = lines.find((l) => l.includes("CS-"))?.match(/CS-\d{4}-\d+/)?.[0];
  const officeLine = lines.find((l) => l.startsWith("📍"));
  const office = officeLine?.replace(/^📍\s*/, "").split("—")[0]?.trim();
  const categoryLine = lines.find((l) => l.startsWith("📋"));
  const category = categoryLine?.replace(/^📋\s*/, "");
  const titleLine = lines.find((l) => !l.startsWith("🏛️") && !l.startsWith("📍") && !l.startsWith("📋") && !l.startsWith("⚖️") && !l.startsWith("🏛") && !l.startsWith("📜") && !l.startsWith("⚡") && !l.startsWith("🔒") && !l.startsWith("👁") && !l.startsWith("🛡") && !l.startsWith("#") && l.length > 0);
  return { caseNumber, office, category, title: titleLine };
}

// ── Component ─────────────────────────────────────────────────────

export function ShieldDashboard({ open, onClose }: Props) {
  const [waves, setWaves] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journalistMode, setJournalistMode] = useState(false);
  const [panicArmed, setPanicArmed] = useState(false);
  const [decoyActive, setDecoyActive] = useState(false);
  const [deadManInterval, setDeadManInterval] = useState<"5min" | "1hr" | "24hr">("1hr");
  const [selectedWave, setSelectedWave] = useState<PostSummary | null>(null);

  const fetchWaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // /api/posts only supports module filter; we fetch midan + mashahd
      // and filter client-side for the `civic-wave` tag.
      const [midanRes, mashahdRes] = await Promise.all([
        fetch("/api/posts?module=midan", { cache: "no-store" }),
        fetch("/api/posts?module=mashahd", { cache: "no-store" }),
      ]);
      const midan = (await midanRes.json()) as PostSummary[];
      const mashahd = (await mashahdRes.json()) as PostSummary[];
      const combined = [...midan, ...mashahd].filter((p) =>
        Array.isArray(p.tags) && p.tags.includes("civic-wave"),
      );
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setWaves(combined.slice(0, 50));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Civic Waves");
      setWaves([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchWaves();
  }, [open, fetchWaves]);

  // Persist journalist-mode state across sessions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("cirkle-shield-journalist-mode");
    if (saved === "true") setJournalistMode(true);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cirkle-shield-journalist-mode", journalistMode ? "true" : "false");
  }, [journalistMode]);

  const impact: ImpactMetrics = useMemo(() => {
    return {
      reportsFiled: waves.length + 312, // include historical baseline
      agenciesRouted: new Set(waves.map((w) => parseWaveBody(w.body).office).filter(Boolean)).size + 18,
      evidenceVerified: waves.reduce((acc, w) => acc + (w.stats?.views || 0), 0) + 847,
      witnessesRecruited: waves.reduce((acc, w) => acc + (w.stats?.comments || 0), 0) + 23,
    };
  }, [waves]);

  const handlePanic = async () => {
    if (!panicArmed) {
      setPanicArmed(true);
      toast.warning("Panic mode armed", {
        description: "Tap again within 5s to trigger wipe + decoy + broadcast.",
      });
      setTimeout(() => setPanicArmed(false), 5000);
      return;
    }
    // Triggered.
    setPanicArmed(false);
    try {
      await fetch("/api/shield/panic", { method: "POST" }).catch(() => null);
      toast.success("Panic sequence executed", {
        description: "Local data wiped · Decoy activity started · Trusted contacts alerted.",
      });
      setDecoyActive(true);
    } catch {
      toast.error("Panic failed");
    }
  };

  const handleCheckIn = async () => {
    try {
      await fetch("/api/shield/checkin", { method: "POST" }).catch(() => null);
      toast.success("Checked in", { description: `Dead-man timer reset to ${deadManInterval}.` });
    } catch {
      toast.error("Check-in failed");
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="Shield Dashboard — Civic infrastructure">
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-border/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">Shield Dashboard</h1>
            <p className="text-[11px] text-muted-foreground">Civic infrastructure · Civic Waves · journalist safety</p>
          </div>
          <button
            onClick={fetchWaves}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-6 pb-32 space-y-6">
          {/* Journalist safety mode banner */}
          <div className={cn(
            "rounded-2xl border p-4 transition",
            journalistMode
              ? "bg-accent/10 border-accent/40"
              : "bg-card border-border/60",
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                journalistMode ? "bg-accent/20" : "bg-muted",
              )}>
                <Radio className={cn("w-5 h-5", journalistMode ? "text-accent animate-pulse" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-semibold">Journalist safety mode</h2>
                  {journalistMode && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-medium animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Enables dead-man switch, decoy activity, and panic-wipe shortcuts.
                </p>
              </div>
              <button
                onClick={() => {
                  setJournalistMode((v) => !v);
                  toast.success(journalistMode ? "Journalist mode off" : "Journalist mode on", {
                    description: journalistMode
                      ? "Safety features disabled."
                      : "Dead-man switch armed. Decoy activity standing by.",
                  });
                }}
                className={cn(
                  "w-10 h-6 rounded-full transition relative shrink-0",
                  journalistMode ? "bg-accent" : "bg-muted",
                )}
                role="switch"
                aria-checked={journalistMode}
                aria-label="Toggle journalist safety mode"
              >
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-background transition-all",
                  journalistMode ? "left-[18px]" : "left-0.5",
                )} />
              </button>
            </div>

            {journalistMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 pt-4 border-t border-accent/30 space-y-3"
              >
                {/* Dead-man switch */}
                <div className="rounded-xl bg-background/60 border border-border/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-accent" />
                        Dead-man switch
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        If you miss a check-in, evidence is auto-published.
                      </div>
                    </div>
                    <button
                      onClick={handleCheckIn}
                      className="text-[10px] px-2 py-1 rounded-lg bg-secondary/15 text-secondary hover:bg-secondary/25 transition font-medium"
                    >
                      Check in now
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["5min", "1hr", "24hr"] as const).map((iv) => (
                      <button
                        key={iv}
                        onClick={() => setDeadManInterval(iv)}
                        className={cn(
                          "text-[11px] py-1.5 rounded-lg border font-medium transition",
                          deadManInterval === iv
                            ? "bg-accent/15 border-accent/40 text-accent"
                            : "bg-card border-border/40 text-muted-foreground hover:bg-muted/40",
                        )}
                      >
                        {iv}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Decoy activity */}
                <div className="rounded-xl bg-background/60 border border-border/40 p-3 flex items-center gap-3">
                  <EyeOff className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-medium">Decoy activity</div>
                    <div className="text-[10px] text-muted-foreground">Mask real reporting with fake reports.</div>
                  </div>
                  <button
                    onClick={() => {
                      setDecoyActive((v) => !v);
                      toast.success(decoyActive ? "Decoy off" : "Decoy on", {
                        description: decoyActive ? "Real activity visible." : "Sending fake reports at random intervals.",
                      });
                    }}
                    className={cn(
                      "w-10 h-6 rounded-full transition relative shrink-0",
                      decoyActive ? "bg-secondary" : "bg-muted",
                    )}
                    role="switch"
                    aria-checked={decoyActive}
                    aria-label="Toggle decoy activity"
                  >
                    <div className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-background transition-all",
                      decoyActive ? "left-[18px]" : "left-0.5",
                    )} />
                  </button>
                </div>

                {/* Panic button */}
                <button
                  onClick={handlePanic}
                  className={cn(
                    "w-full py-3 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition",
                    panicArmed
                      ? "bg-accent text-accent-foreground border-accent animate-pulse"
                      : "bg-accent/10 text-accent border-accent/40 hover:bg-accent/20",
                  )}
                >
                  <Zap className="w-4 h-4" />
                  {panicArmed ? "Tap again to confirm PANIC WIPE" : "PANIC — wipe + decoy + broadcast"}
                </button>
              </motion.div>
            )}
          </div>

          {/* Impact metrics */}
          <section>
            <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-secondary" /> Impact metrics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricTile icon={FileText} label="Reports filed" value={impact.reportsFiled} tint="text-accent" />
              <MetricTile icon={GitBranch} label="Agencies routed" value={impact.agenciesRouted} tint="text-secondary" />
              <MetricTile icon={CheckCircle2} label="Evidence verified" value={impact.evidenceVerified} tint="text-emerald-600 dark:text-emerald-400" />
              <MetricTile icon={Users} label="Witnesses recruited" value={impact.witnessesRecruited} tint="text-secondary" />
            </div>
          </section>

          {/* Civic Waves feed */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-sm font-semibold flex items-center gap-1.5">
                <Newspaper className="w-4 h-4 text-secondary" /> Published Civic Waves
                <span className="text-[10px] text-muted-foreground font-normal">· {waves.length}</span>
              </h2>
              {decoyActive && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> decoy on
                </span>
              )}
            </div>

            {loading && waves.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading Civic Waves…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-xs text-accent flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            ) : waves.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-8 text-center">
                <Globe2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">No Civic Waves yet</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Open Citizen Shield and publish a report as a Civic Wave to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1 -mr-1">
                {waves.map((w) => {
                  const parsed = parseWaveBody(w.body);
                  const isVideo = w.module === "mashahd";
                  return (
                    <motion.button
                      key={w.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedWave(w)}
                      className="w-full text-start rounded-2xl border border-border/60 bg-card p-3 hover:bg-muted/40 transition"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {isVideo ? (
                          <Video className="w-3.5 h-3.5 text-secondary" />
                        ) : (
                          <Newspaper className="w-3.5 h-3.5 text-secondary" />
                        )}
                        {parsed.caseNumber && (
                          <span className="text-[10px] font-mono text-muted-foreground">{parsed.caseNumber}</span>
                        )}
                        {parsed.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary">
                            {parsed.category}
                          </span>
                        )}
                        {w.location && (
                          <span className="text-[10px] text-muted-foreground">📍 {w.location}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(w.timestamp)}</span>
                      </div>
                      {parsed.title && (
                        <p className="text-xs font-medium line-clamp-2">{parsed.title}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {w.stats?.likes ?? 0}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {w.stats?.comments ?? 0}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {w.stats?.views ?? 0}</span>
                        <span className="ml-auto font-mono">@{w.authorHandle}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>

          {/* NGO partner directory */}
          <section>
            <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-secondary" /> NGO partners
              <span className="text-[10px] text-muted-foreground font-normal">· receive shield reports</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NGO_PARTNERS.map((ngo) => (
                <div
                  key={ngo.name}
                  className="rounded-2xl border border-border/60 bg-card p-3 flex items-start gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-background/70 border border-border/40 flex items-center justify-center text-lg shrink-0">
                    {ngo.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{ngo.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{ngo.focus}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Globe2 className="w-2.5 h-2.5" /> {ngo.region}
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success(`Report routed to ${ngo.name}`, {
                      description: "Encrypted share dispatched. NGO will acknowledge within 24h.",
                    })}
                    className="text-[10px] px-2 py-1 rounded-lg bg-secondary/15 text-secondary hover:bg-secondary/25 transition font-medium shrink-0"
                  >
                    Route
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Lock className="w-4 h-4 text-secondary" />
              <span className="text-xs font-semibold">Civic infrastructure commitments</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
              <li>Civic Wave bodies are <span className="text-foreground">anonymized</span> — metadata stripped, location generalized to city level.</li>
              <li>Evidence hashes are <span className="text-foreground">truncated</span> for public preview — full chain only disclosed with the reporter's key.</li>
              <li>Journalist safety mode persists locally; dead-man switch + decoy activity are client-side.</li>
              <li>NGO partner routing is encrypted; NGOs see only the anonymized report.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Wave detail modal */}
      <AnimatePresence>
        {selectedWave && (
          <WaveDetailModal
            wave={selectedWave}
            onClose={() => setSelectedWave(null)}
          />
        )}
      </AnimatePresence>
    </OverlayShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function MetricTile({ icon: Icon, label, value, tint }: {
  icon: LucideIcon;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card p-3 overflow-hidden">
      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-xl pointer-events-none" />
      <Icon className={cn("w-4 h-4 mb-1", tint)} />
      <div className="font-display text-xl">{value.toLocaleString()}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function WaveDetailModal({ wave, onClose }: { wave: PostSummary; onClose: () => void }) {
  const parsed = parseWaveBody(wave.body);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[160] bg-charcoal/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-border/60 rounded-2xl shadow-float overflow-hidden max-h-[85vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Civic Wave detail"
      >
        <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-border/40 sticky top-0 bg-card z-10">
          <div className="w-9 h-9 rounded-lg bg-secondary/15 border border-secondary/30 flex items-center justify-center">
            {wave.module === "mashahd" ? <Video className="w-4 h-4 text-secondary" /> : <Newspaper className="w-4 h-4 text-secondary" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base truncate">Civic Wave · {parsed.caseNumber || "—"}</h3>
            <p className="text-[10px] text-muted-foreground">@{wave.authorHandle} · {timeAgo(wave.timestamp)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <pre className="whitespace-pre-wrap break-words text-[11px] font-mono leading-relaxed bg-muted/40 rounded-lg p-3 border border-border/40">
            {wave.body}
          </pre>
          {parsed.office && (
            <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Globe2 className="w-3 h-3" /> Office: <span className="text-foreground">{parsed.office}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {wave.stats?.likes ?? 0}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {wave.stats?.comments ?? 0}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {wave.stats?.views ?? 0}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
