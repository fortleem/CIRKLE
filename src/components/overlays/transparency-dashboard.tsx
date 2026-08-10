"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X, RefreshCw, Loader2, DollarSign, TrendingUp, TrendingDown, Users,
  Megaphone, Wallet, FileText, ShieldCheck, BarChart3, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── API shape (mirrors /api/transparency) ───────────────────────────────

interface CostLine {
  category: string;
  label: string;
  amount: number;
  note: string;
}
interface RevenueLine {
  category: string;
  label: string;
  amount: number;
  note: string;
}
interface TransparencyPayload {
  period: string;
  generatedAt: string;
  costs: { lines: CostLine[]; total: number };
  revenue: { lines: RevenueLine[]; total: number };
  users: { total: number; posts: number; costPerUser: number; revenuePerUser: number; netPerUser: number };
  adStats: {
    model: string;
    targeting: string;
    profiling: boolean;
    cookies: boolean;
    activeCampaigns: number;
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
    averageCpm: number;
    disclosure: string;
  };
  affiliateStats: { totalCommissions: number; note: string };
  financialReport: {
    period: string;
    publishedAt: string;
    summary: string;
    totals: { costs: number; revenue: number; net: number };
    principles: string[];
  };
}

function formatMoney(n: number): string {
  if (!isFinite(n)) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function formatNumber(n: number): string {
  if (!isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TransparencyDashboard({ open, onClose }: Props) {
  const [data, setData] = useState<TransparencyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transparency", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as TransparencyPayload;
      setData(payload);
    } catch (e) {
      const msg = String((e as Error)?.message || e || "Failed to load transparency data.");
      setError(msg);
      toast.error("Couldn't load transparency data", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !data) void fetch_();
  }, [open, data, fetch_]);

  const net = data ? data.revenue.total - data.costs.total : 0;
  const isSurplus = net >= 0;

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Transparency dashboard — costs, revenue, ad stats"
    >
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-border/40 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">Transparency Dashboard</h1>
            <p className="text-[11px] text-muted-foreground">
              Where the money comes from · Where it goes · Public financial report
            </p>
          </div>
          <button
            onClick={fetch_}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center disabled:opacity-50"
            aria-label="Refresh transparency data"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close transparency dashboard"
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

          {/* Hero: net position */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-5"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                  Monthly net position · {data?.period ?? "—"}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-display text-4xl tabular-nums",
                      isSurplus ? "text-emerald-500" : "text-rose-500",
                    )}
                  >
                    {isSurplus ? "+" : ""}{formatMoney(net)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isSurplus ? "surplus reinvested" : "operating at a loss"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="text-right">
                  <div className="text-muted-foreground">Revenue</div>
                  <div className="font-medium tabular-nums text-emerald-500">
                    {formatMoney(data?.revenue.total ?? 0)}
                  </div>
                </div>
                <TrendingDown className="w-4 h-4 text-muted-foreground rotate-90" />
                <div className="text-right">
                  <div className="text-muted-foreground">Costs</div>
                  <div className="font-medium tabular-nums text-rose-500">
                    {formatMoney(data?.costs.total ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Per-user stats */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Users}
              label="Total users"
              value={formatNumber(data?.users.total ?? 0)}
              accent="primary"
            />
            <StatCard
              icon={FileText}
              label="Total posts"
              value={formatNumber(data?.users.posts ?? 0)}
              accent="secondary"
            />
            <StatCard
              icon={DollarSign}
              label="Cost per user"
              value={formatMoney(data?.users.costPerUser ?? 0)}
              accent="rose"
              sub="/ month"
            />
            <StatCard
              icon={Wallet}
              label="Revenue per user"
              value={formatMoney(data?.users.revenuePerUser ?? 0)}
              accent="emerald"
              sub="/ month"
            />
          </section>

          {/* Costs breakdown */}
          <section>
            <SectionHeader icon={TrendingDown} title="Platform costs" subtitle="Monthly spend, by category" />
            <div className="glass rounded-3xl p-4 space-y-2">
              {data?.costs.lines.map((c) => {
                const pct = data.costs.total > 0 ? (c.amount / data.costs.total) * 100 : 0;
                return (
                  <div key={c.category} className="rounded-2xl bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{c.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{c.note}</div>
                      </div>
                      <div className="text-sm font-medium tabular-nums shrink-0">
                        {formatMoney(c.amount)}
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500/80 to-rose-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {!data && !loading && (
                <div className="text-center text-sm text-muted-foreground py-8">No data yet.</div>
              )}
              {data && (
                <div className="flex items-center justify-between pt-2 px-1">
                  <span className="text-xs font-medium">Total monthly costs</span>
                  <span className="font-display text-base tabular-nums text-rose-500">
                    {formatMoney(data.costs.total)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Revenue breakdown */}
          <section>
            <SectionHeader icon={TrendingUp} title="Revenue sources" subtitle="Where the money comes from — never data sales" />
            <div className="glass rounded-3xl p-4 space-y-2">
              {data?.revenue.lines.map((r) => {
                const pct = data.revenue.total > 0 ? (r.amount / data.revenue.total) * 100 : 0;
                return (
                  <div key={r.category} className="rounded-2xl bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{r.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{r.note}</div>
                      </div>
                      <div className="text-sm font-medium tabular-nums shrink-0">
                        {formatMoney(r.amount)}
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500/80 to-emerald-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {!data && !loading && (
                <div className="text-center text-sm text-muted-foreground py-8">No data yet.</div>
              )}
              {data && (
                <div className="flex items-center justify-between pt-2 px-1">
                  <span className="text-xs font-medium">Total monthly revenue</span>
                  <span className="font-display text-base tabular-nums text-emerald-500">
                    {formatMoney(data.revenue.total)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Non-targeted ad statistics */}
          <section>
            <SectionHeader icon={Megaphone} title="Non-targeted ad statistics" subtitle="No profiling · No cookies · No retargeting" />
            <div className="glass rounded-3xl p-4">
              {data && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <StatCard
                      icon={Megaphone}
                      label="Active campaigns"
                      value={formatNumber(data.adStats.activeCampaigns)}
                      accent="primary"
                      compact
                    />
                    <StatCard
                      icon={BarChart3}
                      label="Impressions"
                      value={formatNumber(data.adStats.totalImpressions)}
                      accent="secondary"
                      compact
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="Clicks"
                      value={formatNumber(data.adStats.totalClicks)}
                      accent="emerald"
                      compact
                    />
                    <StatCard
                      icon={DollarSign}
                      label="Avg CPM"
                      value={formatMoney(data.adStats.averageCpm)}
                      accent="gold"
                      compact
                    />
                  </div>
                  <div className="rounded-2xl bg-background/40 p-3 space-y-2 text-xs">
                    <Row label="Targeting model" value={data.adStats.model} />
                    <Row label="Targeting scope" value={data.adStats.targeting} />
                    <Row label="Behavioural profiling" value={data.adStats.profiling ? "Yes" : "No"} valueClass={!data.adStats.profiling ? "text-emerald-500" : "text-rose-500"} />
                    <Row label="Tracking cookies" value={data.adStats.cookies ? "Yes" : "No"} valueClass={!data.adStats.cookies ? "text-emerald-500" : "text-rose-500"} />
                    <Row label="Click-through rate" value={`${data.adStats.ctr.toFixed(2)}%`} />
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground">
                    <ShieldCheck className="w-3 h-3 text-secondary shrink-0 mt-0.5" />
                    <span>{data.adStats.disclosure}</span>
                  </div>
                </>
              )}
              {!data && !loading && (
                <div className="text-center text-sm text-muted-foreground py-8">No data yet.</div>
              )}
            </div>
          </section>

          {/* Public financial report */}
          <section>
            <SectionHeader icon={FileText} title="Public financial report" subtitle="Quarterly summary — published openly" />
            <div className="glass rounded-3xl p-4">
              {data && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-display text-lg">{data.financialReport.period}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Published {new Date(data.financialReport.publishedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-muted-foreground">Net for the period</div>
                      <div
                        className={cn(
                          "font-display text-lg tabular-nums",
                          data.financialReport.totals.net >= 0 ? "text-emerald-500" : "text-rose-500",
                        )}
                      >
                        {data.financialReport.totals.net >= 0 ? "+" : ""}
                        {formatMoney(data.financialReport.totals.net)}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {data.financialReport.summary}
                  </p>
                  <ul className="space-y-1.5">
                    {data.financialReport.principles.map((p, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs">
                        <ShieldCheck className="w-3 h-3 text-secondary shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {!data && !loading && (
                <div className="text-center text-sm text-muted-foreground py-8">No data yet.</div>
              )}
            </div>
          </section>

          {/* Affiliate disclosure */}
          {data && data.affiliateStats.totalCommissions > 0 && (
            <section className="text-[11px] text-muted-foreground text-center">
              <Wallet className="w-3 h-3 inline-block mr-1 text-secondary" />
              {formatMoney(data.affiliateStats.totalCommissions)} paid to creators in affiliate
              commissions. {data.affiliateStats.note}
            </section>
          )}
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
  icon: Icon, label, value, accent = "primary", sub, compact,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: keyof typeof ACCENT_BG | string;
  sub?: string;
  compact?: boolean;
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
      <div className="flex items-baseline gap-1">
        <span className="font-display text-lg tabular-nums">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function Row({
  label, value, valueClass,
}: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", valueClass)}>{value}</span>
    </div>
  );
}
