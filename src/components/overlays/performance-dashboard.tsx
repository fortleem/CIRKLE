"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X, RefreshCw, Loader2, Zap, Database, Gauge, HardDrive, Cpu,
  Clock, TrendingUp, Activity, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── API shape (mirrors /api/metrics) ────────────────────────────────────

interface RouteStat {
  route: string;
  count: number;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}
interface MetricsPayload {
  generatedAt: string;
  uptimeSec: number;
  apiResponseTimes: {
    samples: number;
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    max: number;
    byRoute: RouteStat[];
  };
  dbQueryTimes: { p50: number; p95: number; p99: number; note: string };
  cacheHitRates: {
    memory: number;
    cdn: number;
    browser: number;
    overall: number;
    layers: { name: string; hitRate: number }[];
    note: string;
  };
  bundle: {
    main: number;
    app: number;
    wasm: number;
    vendor: number;
    fonts: number;
    total: number;
  };
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
    rssMb: number;
    heapMb: number;
    heapRatio: number;
    uptimeSec: number;
  };
  tti: {
    samples: number;
    p50: number;
    p95: number;
    avg: number;
    fcpP50: number;
    lcpP50: number;
    target: number;
    note: string;
  };
  slos: {
    apiP95Under300ms: boolean;
    dbP95Under50ms: boolean;
    ttiP95Under3500ms: boolean;
    cacheHitOver80: boolean;
    heapUnder512Mb: boolean;
  };
  sloCompliance: number;
}

function formatMs(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "—";
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(ms < 10 ? 1 : 0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(b: number): string {
  if (!isFinite(b) || b <= 0) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatUptime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PerformanceDashboard({ open, onClose }: Props) {
  const [data, setData] = useState<MetricsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/metrics", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as MetricsPayload;
      setData(payload);
    } catch (e) {
      const msg = String((e as Error)?.message || e || "Failed to load metrics.");
      setError(msg);
      toast.error("Couldn't load performance metrics", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !data) void fetch_();
  }, [open, data, fetch_]);

  // Auto-refresh every 15s while open.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => void fetch_(), 15_000);
    return () => clearInterval(t);
  }, [open, fetch_]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Performance metrics dashboard"
    >
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-border/40 flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">Performance Metrics</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", loading ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
              Live · Auto-refresh 15s · Uptime {formatUptime(data?.uptimeSec ?? 0)}
            </p>
          </div>
          <button
            onClick={fetch_}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center disabled:opacity-50"
            aria-label="Refresh metrics"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close performance dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-6 space-y-6">
          {error && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* SLO compliance hero */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-5"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                  SLO compliance
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-display text-4xl tabular-nums",
                      (data?.sloCompliance ?? 100) >= 80 ? "text-emerald-500" : "text-amber-500",
                    )}
                  >
                    {data?.sloCompliance.toFixed(0) ?? "—"}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {data ? `${Object.values(data.slos).filter(Boolean).length}/${Object.keys(data.slos).length} SLOs met` : "—"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {data && (
                  <>
                    <SloChip ok={data.slos.apiP95Under300ms} label="API p95 < 300ms" />
                    <SloChip ok={data.slos.dbP95Under50ms} label="DB p95 < 50ms" />
                    <SloChip ok={data.slos.ttiP95Under3500ms} label="TTI p95 < 3.5s" />
                    <SloChip ok={data.slos.cacheHitOver80} label="Cache > 80%" />
                    <SloChip ok={data.slos.heapUnder512Mb} label="Heap < 512 MB" />
                  </>
                )}
              </div>
            </div>
          </motion.section>

          {/* Top-level stats */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Zap}
              label="API p50"
              value={formatMs(data?.apiResponseTimes.p50 ?? 0)}
              accent="primary"
            />
            <StatCard
              icon={TrendingUp}
              label="API p95"
              value={formatMs(data?.apiResponseTimes.p95 ?? 0)}
              accent="secondary"
              warn={data ? data.apiResponseTimes.p95 > 300 : false}
            />
            <StatCard
              icon={Database}
              label="DB p95"
              value={formatMs(data?.dbQueryTimes.p95 ?? 0)}
              accent="emerald"
              warn={data ? data.dbQueryTimes.p95 > 50 : false}
            />
            <StatCard
              icon={Activity}
              label="Cache hit"
              value={`${data?.cacheHitRates.overall.toFixed(0) ?? 0}%`}
              accent="gold"
              warn={data ? data.cacheHitRates.overall < 80 : false}
            />
          </section>

          {/* TTI */}
          <section>
            <SectionHeader icon={Clock} title="Time to Interactive (TTI)" subtitle="Client-reported via beacon · Core Web Vitals target" />
            <div className="glass rounded-3xl p-4">
              {data && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <StatCard icon={Clock} label="TTI p50" value={formatMs(data.tti.p50)} accent="primary" compact />
                    <StatCard icon={TrendingUp} label="TTI p95" value={formatMs(data.tti.p95)} accent="secondary" compact warn={data.tti.p95 > data.tti.target} />
                    <StatCard icon={Zap} label="FCP p50" value={formatMs(data.tti.fcpP50)} accent="emerald" compact />
                    <StatCard icon={Activity} label="LCP p50" value={formatMs(data.tti.lcpP50)} accent="gold" compact />
                  </div>
                  <div className="rounded-2xl bg-background/40 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between mb-1">
                      <span>Samples</span>
                      <span className="font-medium text-foreground tabular-nums">{data.tti.samples}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span>Target (Core Web Vitals "good")</span>
                      <span className="font-medium text-foreground tabular-nums">{formatMs(data.tti.target)}</span>
                    </div>
                    <div className="flex items-start gap-1.5 mt-2 text-[11px]">
                      <Activity className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{data.tti.note}</span>
                    </div>
                  </div>
                </>
              )}
              {!data && !loading && <EmptyState />}
            </div>
          </section>

          {/* API response times by route */}
          <section>
            <SectionHeader icon={Zap} title="API response times" subtitle={`p50 / p95 / p99 · ${data?.apiResponseTimes.samples ?? 0} samples`} />
            <div className="glass rounded-3xl p-4">
              {data && data.apiResponseTimes.byRoute.length > 0 ? (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {data.apiResponseTimes.byRoute.map((r) => (
                    <div
                      key={r.route}
                      className="rounded-xl bg-background/40 p-2.5 flex items-center gap-3"
                    >
                      <code className="text-xs text-secondary shrink-0 truncate flex-1 min-w-0">
                        {r.route}
                      </code>
                      <div className="flex items-center gap-3 text-xs tabular-nums shrink-0">
                        <span className="text-muted-foreground">
                          p50 <span className="text-foreground font-medium">{formatMs(r.p50)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          p95 <span className={cn("font-medium", r.p95 > 300 ? "text-rose-500" : "text-emerald-500")}>{formatMs(r.p95)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          p99 <span className="text-foreground font-medium">{formatMs(r.p99)}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ×{r.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
          </section>

          {/* Database + Cache side-by-side */}
          <section className="grid md:grid-cols-2 gap-4">
            <div>
              <SectionHeader icon={Database} title="Database queries" subtitle="Prisma query timing" />
              <div className="glass rounded-3xl p-4 space-y-2">
                {data && (
                  <>
                    <Row label="p50" value={formatMs(data.dbQueryTimes.p50)} />
                    <Row label="p95" value={formatMs(data.dbQueryTimes.p95)} warn={data.dbQueryTimes.p95 > 50} />
                    <Row label="p99" value={formatMs(data.dbQueryTimes.p99)} />
                    <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/30">
                      {data.dbQueryTimes.note}
                    </div>
                  </>
                )}
                {!data && !loading && <EmptyState />}
              </div>
            </div>
            <div>
              <SectionHeader icon={Activity} title="Cache hit rates" subtitle="Multi-layer cache performance" />
              <div className="glass rounded-3xl p-4 space-y-3">
                {data && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Overall (weighted)</span>
                      <span
                        className={cn(
                          "font-display text-2xl tabular-nums",
                          data.cacheHitRates.overall >= 80 ? "text-emerald-500" : "text-amber-500",
                        )}
                      >
                        {data.cacheHitRates.overall.toFixed(0)}%
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {data.cacheHitRates.layers.map((l) => (
                        <div key={l.name}>
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-muted-foreground">{l.name}</span>
                            <span className="font-medium tabular-nums">{l.hitRate.toFixed(0)}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                            <div
                              className={cn(
                                "h-full",
                                l.hitRate >= 80 ? "bg-emerald-500" : "bg-amber-500",
                              )}
                              style={{ width: `${l.hitRate}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/30">
                      {data.cacheHitRates.note}
                    </div>
                  </>
                )}
                {!data && !loading && <EmptyState />}
              </div>
            </div>
          </section>

          {/* Bundle size + Memory */}
          <section className="grid md:grid-cols-2 gap-4">
            <div>
              <SectionHeader icon={HardDrive} title="Bundle size" subtitle="Last build (env-configured)" />
              <div className="glass rounded-3xl p-4 space-y-2">
                {data && (
                  <>
                    <Row label="Main chunk" value={formatBytes(data.bundle.main)} />
                    <Row label="App chunks" value={formatBytes(data.bundle.app)} />
                    <Row label="WASM (on-device AI)" value={formatBytes(data.bundle.wasm)} />
                    <Row label="Vendor" value={formatBytes(data.bundle.vendor)} />
                    <Row label="Fonts" value={formatBytes(data.bundle.fonts)} />
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-xs font-medium">Total</span>
                      <span className="font-display text-base tabular-nums">
                        {formatBytes(data.bundle.total)}
                      </span>
                    </div>
                  </>
                )}
                {!data && !loading && <EmptyState />}
              </div>
            </div>
            <div>
              <SectionHeader icon={Cpu} title="Memory usage" subtitle="Node.js process" />
              <div className="glass rounded-3xl p-4 space-y-2">
                {data && (
                  <>
                    <Row label="RSS (resident set)" value={`${data.memory.rssMb.toFixed(1)} MB`} />
                    <Row label="Heap used" value={`${data.memory.heapMb.toFixed(1)} MB`} warn={data.memory.heapMb > 512} />
                    <div>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-muted-foreground">Heap usage ratio</span>
                        <span className="font-medium tabular-nums">{(data.memory.heapRatio * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className={cn(
                            "h-full",
                            data.memory.heapRatio > 0.85 ? "bg-rose-500" : data.memory.heapRatio > 0.7 ? "bg-amber-500" : "bg-emerald-500",
                          )}
                          style={{ width: `${data.memory.heapRatio * 100}%` }}
                        />
                      </div>
                    </div>
                    <Row label="External (off-heap)" value={formatBytes(data.memory.external)} />
                    <Row label="Array buffers" value={formatBytes(data.memory.arrayBuffers)} />
                    <Row label="Uptime" value={formatUptime(data.memory.uptimeSec)} />
                  </>
                )}
                {!data && !loading && <EmptyState />}
              </div>
            </div>
          </section>

          {/* Footer */}
          <section className="text-[10px] text-muted-foreground text-center pt-2 pb-2">
            <Activity className="w-3 h-3 inline-block mr-1 text-secondary" />
            Metrics are sampled in-memory per instance · No PII collected · Auto-refresh 15s
          </section>
        </div>
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, subtitle,
}: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-secondary" />
      <div>
        <h2 className="font-display text-base leading-tight">{title}</h2>
        <div className="text-[11px] text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}

const ACCENT_BG: Record<string, string> = {
  primary: "from-primary/20 to-primary/5 text-primary",
  secondary: "from-secondary/20 to-secondary/5 text-secondary",
  rose: "from-rose-500/20 to-rose-500/5 text-rose-500",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
  gold: "from-amber-500/20 to-amber-500/5 text-amber-500",
};

function StatCard({
  icon: Icon, label, value, accent = "primary", compact, warn,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: keyof typeof ACCENT_BG | string;
  compact?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={cn(
            "w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center",
            ACCENT_BG[accent] ?? ACCENT_BG.primary,
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!compact && <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>}
      </div>
      {compact && <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>}
      <div className={cn("font-display text-lg tabular-nums", warn && "text-rose-500")}>
        {value}
      </div>
    </div>
  );
}

function SloChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={cn(
        "rounded-lg px-2 py-1.5 text-[10px] flex items-center gap-1.5 border",
        ok
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", ok ? "bg-emerald-500" : "bg-rose-500")} />
      {label}
    </div>
  );
}

function Row({
  label, value, warn,
}: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", warn && "text-rose-500")}>{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-sm text-muted-foreground py-8">
      No data yet — samples accumulate as traffic flows.
    </div>
  );
}
