// @ts-nocheck
"use client";

/**
 * CIRKLE Platform Admin Panel
 * ============================================================================
 * A single fullscreen overlay that provides complete administration for the
 * entire CIRKLE super app — 13 sections covering Operations / Intelligence /
 * Infrastructure. Renders the registry defined in `src/lib/admin-tabs.ts`.
 *
 * BUILDING PHASE — NO AUTH. A prominent amber "DEV MODE — NO AUTH" banner is
 * shown in the top bar. A future iteration will gate this behind an OIDC
 * admin role.
 *
 * Every section fetches its data from the endpoint defined in `admin-tabs.ts`
 * on mount + on refresh. All fetches use relative paths and an 8s
 * AbortController timeout. Loading skeletons + error cards with retry are
 * rendered for every fetch state.
 *
 * Accessibility:
 *   - Sidebar: role="tablist" with roving tabindex (arrow-key navigation)
 *   - Each item: role="tab" with aria-selected
 *   - Main content: role="tabpanel" aria-labelledby
 *   - All icon-only buttons have aria-label
 *   - Tables use proper thead/tbody/scope="col"
 *   - Focus trap + Esc-to-close handled by <OverlayShell>
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, Loader2, X, Search, AlertTriangle, CheckCircle2, XCircle,
  Clock, Database, GitBranch, Tag, Package, Server, ShieldCheck, Lock,
  Cpu, HardDrive, Activity, TrendingUp, Users, FileText, CircleDot, Brain,
  Sparkles, Newspaper, Wallet, Grid3x3, Network, ServerCog, LayoutDashboard,
  ChevronRight, Cpu as CpuIcon, Zap, Globe, ArrowUpRight, ArrowDownRight,
  TriangleAlert, Ban, Trash2, ShieldAlert, Server as ServerIcon, GitCommit,
  ListChecks, Hash, Eye, EyeOff, Layers, FolderTree, Gauge, Code2,
  CircleCheck, CircleAlert, Info, Bug, ToggleRight, Shield, Scale, Building2,
  type LucideIcon,
} from "lucide-react";

import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ADMIN_SECTIONS, ADMIN_SECTION_GROUPS, type AdminSectionId,
} from "@/lib/admin-tabs";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────────────
//  Utility helpers
// ────────────────────────────────────────────────────────────────────────────

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatUptime(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

function truncate(s: string | null | undefined, n = 120): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const REGION_FLAGS: Record<string, string> = {
  EG: "🇪🇬", SA: "🇸🇦", AE: "🇦🇪", JO: "🇯🇴", KW: "🇰🇼", QA: "🇶🇦",
  BH: "🇧🇭", OM: "🇴🇲", US: "🇺🇸", GB: "🇬🇧", FR: "🇫🇷", DE: "🇩🇪",
  IN: "🇮🇳", CN: "🇨🇳", JP: "🇯🇵", KR: "🇰🇷", TR: "🇹🇷", ID: "🇮🇩",
  PK: "🇵🇰", BD: "🇧🇩", MY: "🇲🇾", NG: "🇳🇬", BR: "🇧🇷", MX: "🇲🇽",
  MA: "🇲🇦", DZ: "🇩🇿", TN: "🇹🇳", LY: "🇱🇾", IQ: "🇮🇶", YE: "🇾🇪",
  PS: "🇵🇸", LB: "🇱🇧", SY: "🇸🇾", SD: "🇸🇩",
};

function regionFlag(region: string | null | undefined): string {
  if (!region) return "🌍";
  return REGION_FLAGS[region.toUpperCase()] || "🌍";
}

const AVATAR_BG: Record<string, string> = {
  emerald: "bg-emerald-500/30 text-emerald-200",
  amber:   "bg-amber-500/30 text-amber-200",
  rose:    "bg-rose-500/30 text-rose-200",
  sky:     "bg-sky-500/30 text-sky-200",
  violet:  "bg-violet-500/30 text-violet-200",
  orange:  "bg-orange-500/30 text-orange-200",
  teal:    "bg-teal-500/30 text-teal-200",
  pink:    "bg-pink-500/30 text-pink-200",
  default: "bg-slate-500/30 text-slate-200",
};

function avatarBg(color: string | null | undefined): string {
  if (!color) return AVATAR_BG.default;
  return AVATAR_BG[color.toLowerCase()] || AVATAR_BG.default;
}

// ────────────────────────────────────────────────────────────────────────────
//  useAdminData — fetch hook with timeout + auto-refresh
// ────────────────────────────────────────────────────────────────────────────

interface AdminDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: number | null;
  elapsedMs: number | null;
}

function useAdminData<T = any>(
  endpoint: string | null,
  autoRefreshMs?: number,
): AdminDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Derived-state pattern: set loading synchronously during render when the
  // endpoint or refresh key changes (avoids setState-in-effect lint rule).
  const [prevEndpoint, setPrevEndpoint] = useState<string | null>(endpoint);
  const [prevRefreshKey, setPrevRefreshKey] = useState(0);
  if ((endpoint !== prevEndpoint || refreshKey !== prevRefreshKey) && endpoint) {
    setPrevEndpoint(endpoint);
    setPrevRefreshKey(refreshKey);
    setLoading(true);
    setError(null);
  }

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();

    fetch(endpoint, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status}${text ? ` — ${text.slice(0, 120)}` : ""}`);
        }
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        const end = typeof performance !== "undefined" ? performance.now() : Date.now();
        setElapsedMs(Math.round(end - start));
        setLastUpdated(Date.now());
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        const msg = (err as { message?: string })?.message || "Failed to fetch";
        setError(name === "AbortError" ? "Request timed out (8s)" : msg);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        clearTimeout(timeout);
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [endpoint, refreshKey]);

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return;
    const id = setInterval(() => setRefreshKey((k) => k + 1), autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs]);

  return { data, loading, error, refresh, lastUpdated, elapsedMs };
}

// ────────────────────────────────────────────────────────────────────────────
//  Shared helper components
// ────────────────────────────────────────────────────────────────────────────

interface AdminCardProps {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

function AdminCard({ title, icon: Icon, children, className, action }: AdminCardProps) {
  return (
    <div
      className={cn(
        "bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col gap-3",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <div className="flex items-center gap-2 min-w-0">
              {Icon && <Icon className="w-4 h-4 text-emerald-300/80 shrink-0" />}
              <h3 className="text-xs font-medium uppercase tracking-wide text-white/60 truncate">
                {title}
              </h3>
            </div>
          )}
          {action}
        </div>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  accent?: "green" | "amber" | "red" | "blue" | "default";
}

const STAT_ACCENTS: Record<string, string> = {
  green: "border-emerald-500/30 bg-emerald-500/10",
  amber: "border-amber-500/30 bg-amber-500/10",
  red:   "border-rose-500/30 bg-rose-500/10",
  blue:  "border-sky-500/30 bg-sky-500/10",
  default: "border-white/10 bg-white/5",
};

const STAT_ICON_ACCENTS: Record<string, string> = {
  green: "text-emerald-300 bg-emerald-500/15",
  amber: "text-amber-300 bg-amber-500/15",
  red:   "text-rose-300 bg-rose-500/15",
  blue:  "text-sky-300 bg-sky-500/15",
  default: "text-white/70 bg-white/10",
};

function StatCard({ label, value, icon: Icon, hint, accent = "default" }: StatCardProps) {
  const isZero = value === 0 || value === "0";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-2 backdrop-blur-sm",
        STAT_ACCENTS[accent],
      )}
    >
      {Icon && (
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            STAT_ICON_ACCENTS[accent],
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div
        className={cn(
          "text-2xl font-bold tabular-nums leading-tight",
          isZero ? "text-white/40" : "text-white",
        )}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-white/50 leading-tight">
        {label}
      </div>
      {hint && <div className="text-[11px] text-white/40">{hint}</div>}
    </div>
  );
}

interface BarRowProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  rightLabel?: string;
}

function BarRow({ label, value, max, color, rightLabel }: BarRowProps) {
  const pct = max > 0 ? Math.min(100, Math.max(2, (value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-white/70 truncate shrink-0" title={label}>
        {label}
      </div>
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn("h-full rounded-full", color || "bg-emerald-400/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-16 text-right text-xs tabular-nums text-white/70 shrink-0">
        {rightLabel ?? value.toLocaleString()}
      </div>
    </div>
  );
}

function LoadingSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-white/10 animate-pulse"
          style={{ width: `${60 + ((i * 7) % 35)}%` }}
        />
      ))}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex flex-col items-start gap-3">
      <div className="flex items-center gap-2 text-rose-300">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">Failed to load</span>
      </div>
      <p className="text-xs text-rose-200/80 font-mono break-all">{message}</p>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        className="h-7 text-xs border-rose-500/40 text-rose-200 hover:bg-rose-500/20"
      >
        <RefreshCw className="w-3 h-3 mr-1" /> Retry
      </Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
        <Ban className="w-5 h-5 text-white/40" />
      </div>
      <p className="text-sm text-white/50">{message}</p>
    </div>
  );
}

const LEVEL_STYLES: Record<string, { bg: string; icon: LucideIcon; label: string }> = {
  fatal:   { bg: "bg-rose-500/20 text-rose-300 border-rose-500/40", icon: TriangleAlert, label: "Fatal" },
  error:   { bg: "bg-rose-500/15 text-rose-200 border-rose-500/30", icon: XCircle, label: "Error" },
  warning: { bg: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: AlertTriangle, label: "Warning" },
  info:    { bg: "bg-sky-500/15 text-sky-300 border-sky-500/30", icon: Info, label: "Info" },
  debug:   { bg: "bg-white/10 text-white/60 border-white/15", icon: Bug, label: "Debug" },
};

function LevelBadge({ level }: { level: string }) {
  const s = LEVEL_STYLES[level] || LEVEL_STYLES.error;
  const Icon = s.icon;
  return (
    <span
      role="status"
      aria-label={`${level} level`}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase",
        s.bg,
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {s.label}
    </span>
  );
}

function StatusDot({ on, label }: { on: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          on ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" : "bg-rose-400",
        )}
      />
      {label && <span className="text-xs text-white/70">{label}</span>}
    </span>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {description && <p className="text-xs text-white/50 mt-0.5">{description}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 1: Overview
// ────────────────────────────────────────────────────────────────────────────

function OverviewSection() {
  const { data, loading, error, refresh } = useAdminData<any>("/api/admin/overview");

  if (loading && !data) return <LoadingSkeleton rows={10} />;
  if (error) return <ErrorCard message={error} onRetry={refresh} />;
  if (!data) return <EmptyState message="No overview data available." />;

  const counts = data.counts || {};
  const health = data.health || {};
  const brain = data.brain || {};
  const aike = data.aike || {};
  const env = data.env || {};
  const errors = data.errors || { byLevel: {} };
  const topRegions = data.topRegions || [];
  const topModules = data.topModules || [];
  const maxRegion = Math.max(1, ...topRegions.map((r: any) => r.count));
  const maxModule = Math.max(1, ...topModules.map((m: any) => m.count));
  const memMb = health.memory ? Math.round((health.memory.rss || health.memory.heapUsed || 0) / 1024 / 1024) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="Overview" description="Top-level KPIs, system health, and platform version" />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Users" value={formatNumber(counts.users ?? 0)} icon={Users} accent="green" />
        <StatCard label="Posts" value={formatNumber(counts.posts ?? 0)} icon={FileText} accent="blue" />
        <StatCard label="Circles" value={formatNumber(counts.circles ?? 0)} icon={CircleDot} accent="amber" />
        <StatCard label="Transactions" value={formatNumber(counts.transactions ?? 0)} icon={Wallet} accent="default" />
      </div>

      {/* Health row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Platform Version" value={data.platform?.version || "—"} icon={Server} hint={data.platform?.tag} accent="default" />
        <StatCard
          label="Health Status"
          value={health.status || "—"}
          icon={health.status === "healthy" ? CheckCircle2 : AlertTriangle}
          accent={health.status === "healthy" ? "green" : "red"}
        />
        <StatCard label="Uptime" value={formatUptime(health.uptime)} icon={Clock} accent="default" />
        <StatCard label="Memory" value={`${memMb} MB`} icon={HardDrive} accent="default" />
      </div>

      {/* Brain + AIKE row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard title="Brain AI" icon={Brain}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <StatusDot on={!!brain.online} label={brain.online ? "Online" : "Offline"} />
              <span className="text-xs text-white/50">{brain.providers || 0} providers</span>
            </div>
            {brain.availableProviders && brain.availableProviders.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {brain.availableProviders.map((p: string) => (
                  <span key={p} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">No providers available</p>
            )}
            {brain.knowledgeGraph && (
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                <KV label="Countries" value={brain.knowledgeGraph.countries} />
                <KV label="Payments" value={brain.knowledgeGraph.paymentMethods} />
                <KV label="Transport" value={brain.knowledgeGraph.transportOptions} />
                <KV label="News" value={brain.knowledgeGraph.newsSources} />
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard title="AIKE — Phase 7.5" icon={Sparkles}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <StatusDot on={aike.status === "operational"} label={aike.status || "—"} />
              <span className="text-xs text-white/50 truncate max-w-[60%]">{aike.phase}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <KV label="Open Gaps" value={aike.openGaps ?? 0} />
              <KV label="Pending Research" value={aike.pendingResearch ?? 0} />
              <KV label="World State" value={aike.worldStateEntries ?? 0} />
              <KV label="Capabilities" value={aike.capabilities ?? 0} />
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Recent activity + Top regions + Top modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AdminCard title="Recent Activity" icon={Activity}>
          <div className="space-y-2">
            <ActivityRow label="Recent signups (7d)" value={counts.recentUsers7d ?? 0} />
            <ActivityRow label="Recent posts (24h)" value={counts.recentPosts24h ?? 0} />
            <ActivityRow label="Pending transactions" value={counts.pendingTransactions ?? 0} />
            <ActivityRow label="Verified users" value={counts.verifiedUsers ?? 0} />
            <ActivityRow label="Anonymous posts" value={counts.anonymousPosts ?? 0} />
          </div>
        </AdminCard>

        <AdminCard title="Top Regions" icon={Globe}>
          {topRegions.length > 0 ? (
            <div className="space-y-2">
              {topRegions.map((r: any) => (
                <BarRow
                  key={r.region}
                  label={`${regionFlag(r.region)} ${r.region || "—"}`
                  }
                  value={r.count}
                  max={maxRegion}
                  color="bg-teal-400/70"
                />
              ))}
            </div>
          ) : <EmptyState message="No regions yet" />}
        </AdminCard>

        <AdminCard title="Top Modules" icon={Layers}>
          {topModules.length > 0 ? (
            <div className="space-y-2">
              {topModules.map((m: any) => (
                <BarRow
                  key={m.module}
                  label={m.module || "—"}
                  value={m.count}
                  max={maxModule}
                  color="bg-violet-400/70"
                />
              ))}
            </div>
          ) : <EmptyState message="No modules yet" />}
        </AdminCard>
      </div>

      {/* Environment + Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard title="Environment" icon={ShieldCheck}>
          <div className="grid grid-cols-3 gap-2">
            <KV label="Total" value={env.total ?? 0} />
            <KV label="Set" value={env.set ?? 0} />
            <KV label="Missing" value={env.missing ?? 0} accent={env.missing > 0 ? "red" : "green"} />
          </div>
          <div className="mt-3">
            <Badge
              className={cn(
                env.allRequiredPresent
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/30",
              )}
            >
              {env.allRequiredPresent ? "All required present" : "Required missing"}
            </Badge>
          </div>
        </AdminCard>

        <AdminCard title="Errors" icon={AlertTriangle}>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-white">{errors.total ?? 0}</div>
            <div className="grid grid-cols-5 gap-1.5">
              {(["fatal", "error", "warning", "info", "debug"] as const).map((lvl) => (
                <div key={lvl} className="rounded-md bg-white/5 px-2 py-1.5 text-center">
                  <div className="text-base font-bold tabular-nums text-white">
                    {errors.byLevel?.[lvl] ?? 0}
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-white/50">{lvl}</div>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      </div>
    </motion.div>
  );
}

function KV({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "red" | "green" }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div
        className={cn(
          "text-base font-bold tabular-nums leading-tight",
          accent === "red" ? "text-rose-300" : accent === "green" ? "text-emerald-300" : "text-white",
        )}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-white/50 leading-tight">{label}</div>
    </div>
  );
}

function ActivityRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/70">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", value === 0 ? "text-white/40" : "text-white")}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 2: Users & Accounts
// ────────────────────────────────────────────────────────────────────────────

function UsersSection() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [region, setRegion] = useState("");
  const [verified, setVerified] = useState<"all" | "true" | "false">("all");

  // Debounce search by 300ms
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ take: "50" });
    if (debouncedQ) params.set("q", debouncedQ);
    if (region) params.set("region", region);
    if (verified !== "all") params.set("verified", verified);
    return `/api/admin/users?${params.toString()}`;
  }, [debouncedQ, region, verified]);

  const { data, loading, error, refresh } = useAdminData<any>(endpoint);

  const regions = data?.byRegion || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="Users & Accounts" description="User table, verification, regions, signups" />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={formatNumber(data?.total ?? 0)} icon={Users} accent="green" />
        <StatCard label="Verified" value={formatNumber(data?.verifiedCount ?? 0)} icon={CheckCircle2} accent="blue" />
        <StatCard label="Recent (7d)" value={formatNumber(data?.recentSignups7d ?? 0)} icon={TrendingUp} accent="amber" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or @circleId…"
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
            aria-label="Search users"
          />
        </div>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-md h-9 px-2 text-sm text-white"
          aria-label="Filter by region"
        >
          <option value="">All regions</option>
          {regions.map((r: any) => (
            <option key={r.region} value={r.region}>
              {regionFlag(r.region)} {r.region} ({r.count})
            </option>
          ))}
        </select>
        <div
          className="inline-flex rounded-md border border-white/10 bg-white/5 p-0.5 h-9"
          role="radiogroup"
          aria-label="Filter by verification status"
        >
          {(["all", "true", "false"] as const).map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={verified === v}
              onClick={() => setVerified(v)}
              className={cn(
                "flex-1 px-2 text-xs rounded transition-colors",
                verified === v
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "text-white/60 hover:text-white",
              )}
            >
              {v === "all" ? "All" : v === "true" ? "Verified" : "Unverified"}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <ErrorCard message={error} onRetry={refresh} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Table */}
          <AdminCard title={`Users (${data?.returned ?? 0} of ${data?.total ?? 0})`} icon={Users} className="lg:col-span-2">
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent -mx-1">
              {data?.users?.length ? (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white/5 backdrop-blur z-10">
                    <tr className="text-white/50 uppercase tracking-wide">
                      <th scope="col" className="text-left font-medium px-2 py-2">User</th>
                      <th scope="col" className="text-left font-medium px-2 py-2 hidden sm:table-cell">Region</th>
                      <th scope="col" className="text-left font-medium px-2 py-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u: any) => (
                      <tr
                        key={u.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                avatarBg(u.avatarColor),
                              )}
                            >
                              {initials(u.displayName)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-white truncate">{u.displayName || "—"}</span>
                                {u.verified && (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-label="Verified" />
                                )}
                              </div>
                              <div className="text-[10px] text-white/40 truncate">
                                @{u.circleId || "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 hidden sm:table-cell">
                          <span className="text-white/70">
                            {regionFlag(u.region)} {u.region || "—"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-white/60">
                          {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState message="No users match these filters." />
              )}
            </div>
          </AdminCard>

          {/* Sidebars */}
          <div className="space-y-3">
            <AdminCard title="By Region" icon={Globe}>
              {regions.length > 0 ? (
                <div className="space-y-2">
                  {regions.slice(0, 10).map((r: any) => {
                    const max = Math.max(1, ...regions.map((x: any) => x.count));
                    return (
                      <BarRow
                        key={r.region}
                        label={`${regionFlag(r.region)} ${r.region || "—"}`}
                        value={r.count}
                        max={max}
                        color="bg-teal-400/70"
                      />
                    );
                  })}
                </div>
              ) : <EmptyState message="No regions" />}
            </AdminCard>

            <AdminCard title="By Avatar Color" icon={CircleDot}>
              {data?.byAvatarColor?.length ? (
                <div className="space-y-1.5">
                  {data.byAvatarColor.map((c: any) => (
                    <div key={c.color} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full",
                          avatarBg(c.color),
                        )}
                      />
                      <span className="text-xs text-white/70 flex-1 capitalize">{c.color || "default"}</span>
                      <span className="text-xs tabular-nums text-white/60">{c.count}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState message="No avatar data" />}
            </AdminCard>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 3: Content Moderation
// ────────────────────────────────────────────────────────────────────────────

const MODULE_FILTERS = ["all", "midan", "lamahat", "mashahd", "circle"] as const;
const VIS_FILTERS = ["all", "public", "followers", "circle", "anonymous"] as const;

function ContentSection() {
  const [module, setModule] = useState<string>("all");
  const [vis, setVis] = useState<string>("all");
  const [anonOnly, setAnonOnly] = useState(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ take: "50" });
    if (module !== "all") params.set("module", module);
    if (vis !== "all") params.set("vis", vis);
    if (anonOnly) params.set("anon", "1");
    return `/api/admin/content?${params.toString()}`;
  }, [module, vis, anonOnly]);

  const { data, loading, error, refresh } = useAdminData<any>(endpoint);
  const maxTagCount = Math.max(1, ...(data?.topTags || []).map((t: any) => t.count));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="Content Moderation" description="Posts, visibility, anonymous activity, engagement" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Posts" value={formatNumber(data?.total ?? 0)} icon={FileText} accent="green" />
        <StatCard label="Anonymous" value={formatNumber(data?.anonymousTotal ?? 0)} icon={EyeOff} accent="amber" />
        <StatCard label="Recent (24h)" value={formatNumber(data?.recent24h ?? 0)} icon={Clock} accent="blue" />
        <StatCard label="Recent (7d)" value={formatNumber(data?.recent7d ?? 0)} icon={TrendingUp} accent="default" />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Module"
            value={module}
            options={MODULE_FILTERS as unknown as string[]}
            onChange={setModule}
          />
          <Segmented
            label="Visibility"
            value={vis}
            options={VIS_FILTERS as unknown as string[]}
            onChange={setVis}
          />
          <button
            onClick={() => setAnonOnly((v) => !v)}
            aria-pressed={anonOnly}
            aria-label="Toggle anonymous only"
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors",
              anonOnly
                ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
                : "bg-white/5 text-white/60 border-white/10",
            )}
          >
            <EyeOff className="w-3 h-3" />
            Anonymous only
          </button>
        </div>
      </div>

      {loading && !data ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <ErrorCard message={error} onRetry={refresh} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <AdminCard title={`Posts (${data?.returned ?? 0} of ${data?.total ?? 0})`} icon={FileText} className="lg:col-span-2">
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent -mx-1">
              {data?.posts?.length ? (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white/5 backdrop-blur z-10">
                    <tr className="text-white/50 uppercase tracking-wide">
                      <th scope="col" className="text-left font-medium px-2 py-2">Author</th>
                      <th scope="col" className="text-left font-medium px-2 py-2 hidden md:table-cell">Body</th>
                      <th scope="col" className="text-left font-medium px-2 py-2">Module</th>
                      <th scope="col" className="text-right font-medium px-2 py-2 hidden lg:table-cell">Engagement</th>
                      <th scope="col" className="text-left font-medium px-2 py-2 hidden sm:table-cell">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.posts.map((p: any) => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 align-top">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <span className="text-white truncate max-w-[120px]">{p.authorName || "—"}</span>
                            {p.authorVerified && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-label="Verified" />
                            )}
                          </div>
                          <div className="text-[10px] text-white/40 truncate max-w-[120px]">
                            @{p.authorHandle || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-2 hidden md:table-cell max-w-[280px]">
                          <p className="text-white/70 line-clamp-2">{p.bodyPreview || "(no body)"}</p>
                          {p.language && (
                            <span className="text-[10px] text-white/40 mt-0.5 inline-block">{p.language}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Badge className="bg-violet-500/15 text-violet-200 border-violet-500/30 text-[10px]">
                            {p.module}
                          </Badge>
                          <div className="text-[10px] text-white/40 mt-0.5">{p.visibility}</div>
                        </td>
                        <td className="px-2 py-2 hidden lg:table-cell">
                          <div className="flex items-center gap-2 text-[10px] text-white/60 tabular-nums">
                            <span title="likes">♥{p.likes}</span>
                            <span title="comments">💬{p.comments}</span>
                            <span title="shares">↻{p.shares}</span>
                            <span title="views">👁{p.views}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 hidden sm:table-cell text-white/60 whitespace-nowrap">
                          {timeAgo(p.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState message="No posts match these filters." />
              )}
            </div>
          </AdminCard>

          <div className="space-y-3">
            <AdminCard title="By Module" icon={Layers}>
              <BarsList data={data?.byModule} field="module" />
            </AdminCard>
            <AdminCard title="By Visibility" icon={Eye}>
              <BarsList data={data?.byVisibility} field="visibility" color="bg-sky-400/70" />
            </AdminCard>
            <AdminCard title="Engagement Totals" icon={Activity}>
              {data?.engagement ? (
                <div className="space-y-1 text-xs">
                  <Row label="Likes" value={data.engagement.totalLikes} />
                  <Row label="Comments" value={data.engagement.totalComments} />
                  <Row label="Shares" value={data.engagement.totalShares} />
                  <Row label="Views" value={data.engagement.totalViews} />
                  <div className="border-t border-white/5 pt-1 mt-1">
                    <Row label="Avg likes / post" value={data.engagement.avgLikes} />
                    <Row label="Avg comments / post" value={data.engagement.avgComments} />
                  </div>
                </div>
              ) : <EmptyState message="No engagement" />}
            </AdminCard>
            <AdminCard title="Top Tags" icon={Hash}>
              {data?.topTags?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.topTags.map((t: any) => (
                    <span
                      key={t.tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70"
                      style={{
                        fontSize: `${10 + Math.max(0, Math.min(6, (t.count / maxTagCount) * 6))}px`,
                      }}
                    >
                      #{t.tag}
                      <span className="text-white/40 tabular-nums">{t.count}</span>
                    </span>
                  ))}
                </div>
              ) : <EmptyState message="No tags" />}
            </AdminCard>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Segmented({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-white/40">{label}</span>
      <div
        className="inline-flex rounded-md border border-white/10 bg-white/5 p-0.5"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((opt) => (
          <button
            key={opt}
            role="radio"
            aria-checked={value === opt}
            onClick={() => onChange(opt)}
            className={cn(
              "px-2.5 h-7 text-xs rounded transition-colors capitalize",
              value === opt
                ? "bg-emerald-500/20 text-emerald-200"
                : "text-white/60 hover:text-white",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function BarsList({
  data, field, color,
}: {
  data: any[] | undefined;
  field: string;
  color?: string;
}) {
  if (!data || data.length === 0) return <EmptyState message="No data" />;
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <BarRow
          key={d[field]}
          label={d[field] || "—"}
          value={d.count}
          max={max}
          color={color || "bg-emerald-400/70"}
        />
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-white/60">{label}</span>
      <span className="text-white tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 4: Circles & Groups
// ────────────────────────────────────────────────────────────────────────────

const CIRCLE_CATEGORIES = ["Social", "Professional", "Hobby", "Community", "Study", "Sports"];
const CIRCLE_MODES = ["private", "public", "anonymous"];

function CirclesSection() {
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("");

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ take: "50" });
    if (category) params.set("category", category);
    if (mode) params.set("mode", mode);
    return `/api/admin/circles?${params.toString()}`;
  }, [category, mode]);

  const { data, loading, error, refresh } = useAdminData<any>(endpoint);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="Circles & Groups" description="Circle groups, members, categories, modes" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Circles" value={formatNumber(data?.total ?? 0)} icon={CircleDot} accent="green" />
        <StatCard label="Encrypted" value={formatNumber(data?.encryptedCount ?? 0)} icon={Lock} accent="amber" />
        <StatCard label="Recent (7d)" value={formatNumber(data?.recent7d ?? 0)} icon={Clock} accent="blue" />
        <StatCard label="Total Members" value={formatNumber(data?.totalMembers ?? 0)} icon={Users} accent="default" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <FilterDropdown label="Category" value={category} onChange={setCategory} options={CIRCLE_CATEGORIES} />
        <FilterDropdown label="Mode" value={mode} onChange={setMode} options={CIRCLE_MODES} />
      </div>

      {loading && !data ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <ErrorCard message={error} onRetry={refresh} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <AdminCard title={`Circles (${data?.returned ?? 0} of ${data?.total ?? 0})`} icon={CircleDot} className="lg:col-span-2">
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent -mx-1">
              {data?.circles?.length ? (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white/5 backdrop-blur z-10">
                    <tr className="text-white/50 uppercase tracking-wide">
                      <th scope="col" className="text-left font-medium px-2 py-2">Circle</th>
                      <th scope="col" className="text-left font-medium px-2 py-2 hidden md:table-cell">Category</th>
                      <th scope="col" className="text-left font-medium px-2 py-2">Mode</th>
                      <th scope="col" className="text-left font-medium px-2 py-2 hidden lg:table-cell">Owner</th>
                      <th scope="col" className="text-left font-medium px-2 py-2 hidden sm:table-cell">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.circles.map((c: any) => (
                      <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 align-top">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                avatarBg(c.avatarColor),
                              )}
                            >
                              {c.avatarInitials || initials(c.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-white truncate max-w-[140px]">{c.name || "—"}</span>
                                {c.encrypted && <Lock className="w-3 h-3 text-amber-400 shrink-0" aria-label="Encrypted" />}
                              </div>
                              <div className="text-[10px] text-white/40 truncate max-w-[200px]">
                                {truncate(c.description, 80) || "(no description)"}
                              </div>
                              {c.settingsList?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {c.settingsList.slice(0, 4).map((s: string) => (
                                    <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/60 border border-white/10">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 hidden md:table-cell">
                          <Badge className="bg-teal-500/15 text-teal-200 border-teal-500/30 text-[10px]">
                            {c.category || "—"}
                          </Badge>
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-white/70 capitalize">{c.mode || "—"}</span>
                        </td>
                        <td className="px-2 py-2 hidden lg:table-cell">
                          <span className="text-white/60 truncate block max-w-[120px]">{c.ownerLabel || "—"}</span>
                        </td>
                        <td className="px-2 py-2 hidden sm:table-cell text-white/60 whitespace-nowrap">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState message="No circles match these filters." />
              )}
            </div>
          </AdminCard>

          <div className="space-y-3">
            <AdminCard title="By Category" icon={Layers}>
              <BarsList data={data?.byCategory} field="category" color="bg-teal-400/70" />
            </AdminCard>
            <AdminCard title="By Mode" icon={Eye}>
              <BarsList data={data?.byMode} field="mode" color="bg-violet-400/70" />
            </AdminCard>
            <AdminCard title="Top Owners" icon={Users}>
              {data?.topOwners?.length ? (
                <div className="space-y-1.5">
                  {data.topOwners.slice(0, 10).map((o: any, i: number) => (
                    <div key={o.owner} className="flex items-center gap-2">
                      <span className="w-4 text-[10px] text-white/40 tabular-nums">{i + 1}.</span>
                      <span className="text-xs text-white/70 truncate flex-1">{o.owner || "—"}</span>
                      <span className="text-xs tabular-nums text-white/60">{o.count}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState message="No owners" />}
            </AdminCard>
            <AdminCard title="Top by Members" icon={CircleDot}>
              {data?.topCirclesByMembers?.length ? (
                <div className="space-y-1.5">
                  {data.topCirclesByMembers.slice(0, 10).map((c: any, i: number) => (
                    <div key={c.circleId} className="flex items-center gap-2">
                      <span className="w-4 text-[10px] text-white/40 tabular-nums">{i + 1}.</span>
                      <span className="text-xs text-white/70 truncate flex-1">{c.name || "—"}</span>
                      <span className="text-xs tabular-nums text-white/60">{c.memberCount}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState message="No circles" />}
            </AdminCard>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function FilterDropdown({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-white/40">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-md h-9 px-2 text-sm text-white"
        aria-label={`Filter by ${label}`}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 5: Brain AI
// ────────────────────────────────────────────────────────────────────────────

function BrainAISection() {
  const { data, loading, error, refresh } = useAdminData<any>("/api/brain/status");

  if (loading && !data) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorCard message={error} onRetry={refresh} />;
  if (!data) return <EmptyState message="No Brain AI data." />;

  const providers = data.providers || [];
  const kg = data.knowledgeGraph || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="Brain AI" description="5 AI providers, knowledge graph, features, actions" />

      {/* Online status */}
      <div
        className={cn(
          "rounded-xl border p-5 flex items-center justify-between",
          data.online
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-rose-500/30 bg-rose-500/10",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              data.online ? "bg-emerald-500/20" : "bg-rose-500/20",
            )}
          >
            {data.online ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-300" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-300" />
            )}
          </div>
          <div>
            <div className={cn("text-lg font-semibold", data.online ? "text-emerald-200" : "text-rose-200")}>
              {data.online ? "Brain AI Online" : "Brain AI Offline"}
            </div>
            <div className="text-xs text-white/60">
              Universal Layer v{data.universalLayerVersion || "—"} · Updated {timeAgo(data.updatedAt)}
            </div>
          </div>
        </div>
        <StatusDot on={!!data.online} />
      </div>

      {/* Providers grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {providers.map((p: any) => (
          <AdminCard key={p.name} title={p.name} icon={Cpu}>
            <div className="space-y-2">
              <StatusDot on={!!p.available} label={p.available ? "Available" : "Unavailable"} />
              {p.strengths?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.strengths.map((s: string) => (
                    <span
                      key={s}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </AdminCard>
        ))}
      </div>

      {/* Knowledge graph */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Countries" value={formatNumber(kg.countries)} icon={Globe} accent="green" />
        <StatCard label="Payment Methods" value={formatNumber(kg.paymentMethods)} icon={Wallet} accent="amber" />
        <StatCard label="Transport Options" value={formatNumber(kg.transportOptions)} icon={Network} accent="blue" />
        <StatCard label="News Sources" value={formatNumber(kg.newsSources)} icon={Newspaper} accent="default" />
      </div>

      {/* Features + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard title={`Features (${data.features?.length || 0})`} icon={Zap}>
          {data.features?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.features.map((f: string) => (
                <span
                  key={f}
                  className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
                >
                  {f}
                </span>
              ))}
            </div>
          ) : <EmptyState message="No features" />}
        </AdminCard>
        <AdminCard title={`Actions (${data.actions?.length || 0})`} icon={Activity}>
          {data.actions?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.actions.map((a: string) => (
                <span
                  key={a}
                  className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-200"
                >
                  {a}
                </span>
              ))}
            </div>
          ) : <EmptyState message="No actions" />}
        </AdminCard>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 6: AIKE (Phase 7.5)
// ────────────────────────────────────────────────────────────────────────────

function AIKESection() {
  const { data, loading, error, refresh } = useAdminData<any>("/api/aike/status");

  if (loading && !data) return <LoadingSkeleton rows={10} />;
  if (error) return <ErrorCard message={error} onRetry={refresh} />;
  if (!data) return <EmptyState message="No AIKE data." />;

  const o = data.orchestrator || {};
  const graph = o.graphStats || {};
  const fresh = o.freshnessStats || {};
  const research = o.researchStats || {};
  const world = o.worldStats || {};
  const prov = o.providerStats || {};
  const cap = o.capabilityStats || {};
  const ev = o.evaluatorStats || {};
  const comp = o.compressorStats || {};
  const evt = data.eventLearning || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="AIKE — Phase 7.5" description="Autonomous Intelligence & Knowledge Engine status" />

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-emerald-200">{data.phase || "Phase 7.5"}</div>
          <div className="text-xs text-white/60">Status: {data.status || "—"} · Updated {timeAgo(data.timestamp)}</div>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
          {data.status === "operational" ? "Operational" : data.status}
        </Badge>
      </div>

      {/* Orchestrator */}
      <AdminCard title="Orchestrator" icon={Cpu}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <KV label="Running" value={o.running ? "Yes" : "No"} accent={o.running ? "green" : "red"} />
          <KV label="Cycle" value={`${(o.cycleMs / 1000 || 0).toFixed(0)}s`} />
          <KV label="Queue Depth" value={o.queueDepth ?? 0} />
          <KV label="Total Tasks" value={o.totalTasks ?? 0} />
          <KV label="Scheduled" value={o.totalScheduled ?? 0} />
          <KV label="Executed" value={o.totalExecuted ?? 0} />
          <KV label="Succeeded" value={o.totalSucceeded ?? 0} accent="green" />
          <KV label="Failed" value={o.totalFailed ?? 0} accent={o.totalFailed > 0 ? "red" : undefined} />
          <KV label="Last Cycle" value={o.lastCycleAt ? timeAgo(o.lastCycleAt) : "—"} />
          <KV label="Last Task" value={o.lastTaskType || "—"} />
        </div>
      </AdminCard>

      {/* Knowledge graph + Freshness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard title="Knowledge Graph" icon={Network}>
          <div className="grid grid-cols-3 gap-3">
            <KV label="Nodes" value={graph.nodes ?? 0} />
            <KV label="Edges" value={graph.edges ?? 0} />
            <KV label="Density" value={typeof graph.density === "number" ? graph.density.toFixed(3) : "—"} />
          </div>
        </AdminCard>
        <AdminCard title="Freshness" icon={Clock}>
          <div className="grid grid-cols-3 gap-3">
            <KV label="Total" value={fresh.total ?? 0} />
            <KV label="Stale" value={fresh.stale ?? 0} accent={fresh.stale > 0 ? "red" : undefined} />
            <KV label="Domains" value={fresh.domains ?? 0} />
          </div>
        </AdminCard>
      </div>

      {/* Research + World state */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard title="Research" icon={Sparkles}>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <KV label="Total" value={research.total ?? 0} />
              <KV label="Pending" value={research.pending ?? 0} />
              <KV label="In-Prog" value={research.inProgress ?? 0} />
              <KV label="Completed" value={research.completed ?? 0} accent="green" />
            </div>
            {research.byPriority && (
              <div className="border-t border-white/5 pt-2">
                <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">By Priority</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {(["critical", "high", "medium", "low", "background"] as const).map((p) => (
                    <div key={p} className="rounded bg-white/5 px-1 py-1 text-center">
                      <div className="text-sm font-bold text-white">{research.byPriority[p] ?? 0}</div>
                      <div className="text-[9px] uppercase text-white/50">{p.slice(0, 4)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AdminCard>
        <AdminCard title="World State" icon={Globe}>
          <div className="grid grid-cols-3 gap-3">
            <KV label="Total" value={world.total ?? 0} />
            <KV label="Active" value={world.active ?? 0} accent="green" />
            <KV label="Stale" value={world.stale ?? 0} accent={world.stale > 0 ? "red" : undefined} />
            <KV label="Queue Depth" value={world.queueDepth ?? 0} />
          </div>
        </AdminCard>
      </div>

      {/* Provider + Capability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard title="Provider Stats" icon={Cpu}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <KV label="Providers" value={prov.providers ?? 0} />
              <KV label="Total Calls" value={prov.totalCalls ?? 0} />
            </div>
            {prov.taskTypes && Object.keys(prov.taskTypes).length > 0 && (
              <div className="border-t border-white/5 pt-2">
                <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">Task Types</div>
                <div className="space-y-1">
                  {Object.entries(prov.taskTypes)
                    .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
                    .slice(0, 6)
                    .map(([k, v]: any) => (
                      <div key={k} className="flex items-center justify-between text-xs">
                        <span className="text-white/70">{k}</span>
                        <span className="text-white/60 tabular-nums">{v}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </AdminCard>
        <AdminCard title="Capability Stats" icon={Sparkles}>
          <div className="grid grid-cols-3 gap-2">
            <KV label="Total" value={cap.total ?? 0} />
            <KV label="Discovered" value={cap.discovered ?? 0} />
            <KV label="Evaluating" value={cap.evaluating ?? 0} />
            <KV label="Approved" value={cap.approved ?? 0} accent="green" />
            <KV label="Rejected" value={cap.rejected ?? 0} accent="red" />
            <KV label="Integrated" value={cap.integrated ?? 0} accent="green" />
            <KV label="Domains Scanned" value={cap.domainsScanned ?? 0} />
          </div>
        </AdminCard>
      </div>

      {/* Model eval + Compressor + Event learning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AdminCard title="Model Evaluation" icon={Gauge}>
          <div className="grid grid-cols-2 gap-2">
            <KV label="Evaluations" value={ev.evaluations ?? 0} />
            <KV label="Models" value={ev.modelsTracked ?? 0} />
            <KV label="Deploy" value={ev.deploy ?? 0} accent="green" />
            <KV label="Monitor" value={ev.monitor ?? 0} />
            <KV label="Retrain" value={ev.retrain ?? 0} />
            <KV label="Rollback" value={ev.rollback ?? 0} accent={ev.rollback > 0 ? "red" : undefined} />
          </div>
        </AdminCard>
        <AdminCard title="Compressor" icon={HardDrive}>
          <div className="grid grid-cols-2 gap-2">
            <KV label="Runs" value={comp.runs ?? 0} />
            <KV label="Facts Archived" value={comp.factsArchived ?? 0} />
            <KV label="Nodes Merged" value={comp.nodesMerged ?? 0} />
            <KV label="Edges Pruned" value={comp.edgesPruned ?? 0} />
            <KV label="In Memory" value={comp.archivedInMemory ?? 0} />
            <KV label="Ledger Size" value={comp.mergeLedgerSize ?? 0} />
          </div>
        </AdminCard>
        <AdminCard title="Event Learning" icon={Activity}>
          <div className="grid grid-cols-2 gap-2">
            <KV label="Ingested" value={evt.totalIngested ?? 0} />
            <KV label="Processed" value={evt.totalProcessed ?? 0} />
            <KV label="Skipped" value={evt.totalSkipped ?? 0} />
            <KV label="Queue Depth" value={evt.queueDepth ?? 0} />
            <KV label="Known Events" value={evt.knownEvents ?? 0} />
            <KV label="Users Tracked" value={evt.usersTracked ?? 0} />
            <KV label="Sessions" value={evt.sessionsTracked ?? 0} />
          </div>
        </AdminCard>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 7: News Orchestrator
// ────────────────────────────────────────────────────────────────────────────

function NewsOrchestratorSection() {
  const { data, loading, error, refresh } = useAdminData<any>("/api/news/orchestrator-status");

  if (loading && !data) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorCard message={error} onRetry={refresh} />;
  if (!data) return <EmptyState message="No news orchestrator data." />;

  const pipeline = data.pipeline || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="News Orchestrator" description="5-source news pipeline, 246 countries, cache" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AdminCard title="5-Source Pipeline" icon={Newspaper} className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <StatusDot on label={data.orchestration || "CIRKLE Brain AI"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CapabilityCard label="Web Search" on={!!data.webSearch} icon={Search} />
            <CapabilityCard label="Web Scraping" on={!!data.webScraping} icon={Code2} />
          </div>
        </AdminCard>

        <AdminCard title="Countries Supported" icon={Globe}>
          <div className="text-4xl font-bold text-emerald-300 tabular-nums">
            {data.countriesSupported ?? 246}
          </div>
          <div className="text-xs text-white/50 mt-1">Sovereign states + territories</div>
        </AdminCard>
      </div>

      <AdminCard title="Pipeline Steps (8)" icon={ListChecks}>
        <div className="space-y-2">
          {pipeline.map((step: string, i: number) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <span className="text-xs text-white/80 leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Timestamp" icon={Clock}>
        <div className="text-sm text-white/70">{data.timestamp ? new Date(data.timestamp).toLocaleString() : "—"}</div>
        <div className="text-xs text-white/40 mt-1">{timeAgo(data.timestamp)}</div>
      </AdminCard>
    </motion.div>
  );
}

function CapabilityCard({ label, on, icon: Icon }: { label: string; on: boolean; icon: LucideIcon }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 flex items-center gap-2",
        on ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10",
      )}
    >
      <Icon className={cn("w-4 h-4", on ? "text-emerald-300" : "text-rose-300")} />
      <div className="flex-1">
        <div className="text-sm text-white">{label}</div>
        <div className={cn("text-[10px]", on ? "text-emerald-300" : "text-rose-300")}>
          {on ? "Enabled" : "Disabled"}
        </div>
      </div>
      <StatusDot on={on} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 8: Payments
// ────────────────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = ["fawry", "vodafone-cash", "instapay", "wechat", "alipay", "upi", "usdc", "qr"];

function PaymentsSection() {
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [direction, setDirection] = useState("");

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ take: "50" });
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (direction) params.set("direction", direction);
    return `/api/admin/payments?${params.toString()}`;
  }, [status, method, direction]);

  const { data, loading, error, refresh } = useAdminData<any>(endpoint);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="Payments" description="Transactions, volume, methods, fraud alerts" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Total Transactions" value={formatNumber(data?.total ?? 0)} icon={Wallet} accent="green" />
        <StatCard label="Failed" value={formatNumber(data?.failedCount ?? 0)} icon={XCircle} accent="red" />
        <StatCard label="Pending" value={formatNumber(data?.pendingCount ?? 0)} icon={Clock} accent="amber" />
        <StatCard label="Recent (24h)" value={formatNumber(data?.recent24h ?? 0)} icon={TrendingUp} accent="blue" />
        <StatCard label="Volume (30d)" value={formatNumber(data?.volume30d ?? 0)} icon={Activity} accent="default" />
        <StatCard label="Avg tx (30d)" value={formatNumber(data?.avgTx30d ?? 0)} icon={Gauge} accent="default" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FilterDropdown label="Status" value={status} onChange={setStatus} options={["settled", "pending", "failed"]} />
        <FilterDropdown label="Method" value={method} onChange={setMethod} options={PAYMENT_METHODS} />
        <FilterDropdown label="Direction" value={direction} onChange={setDirection} options={["in", "out"]} />
      </div>

      {loading && !data ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <ErrorCard message={error} onRetry={refresh} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <AdminCard title={`Transactions (${data?.returned ?? 0} of ${data?.total ?? 0})`} icon={Wallet} className="lg:col-span-2">
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent -mx-1">
              {data?.transactions?.length ? (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white/5 backdrop-blur z-10">
                    <tr className="text-white/50 uppercase tracking-wide">
                      <th scope="col" className="text-left font-medium px-2 py-2">User</th>
                      <th scope="col" className="text-left font-medium px-2 py-2">↕</th>
                      <th scope="col" className="text-left font-medium px-2 py-2 hidden md:table-cell">Counterparty</th>
                      <th scope="col" className="text-right font-medium px-2 py-2">Amount</th>
                      <th scope="col" className="text-left font-medium px-2 py-2">Method</th>
                      <th scope="col" className="text-left font-medium px-2 py-2">Status</th>
                      <th scope="col" className="text-left font-medium px-2 py-2 hidden lg:table-cell">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t: any) => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 align-top">
                        <td className="px-2 py-2">
                          <span className="text-white truncate block max-w-[120px]">{t.userLabel || "—"}</span>
                          {t.memo && (
                            <span className="text-[10px] text-white/40 truncate block max-w-[120px]">
                              {truncate(t.memo, 40)}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {t.direction === "in" ? (
                            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" aria-label="Incoming" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" aria-label="Outgoing" />
                          )}
                        </td>
                        <td className="px-2 py-2 hidden md:table-cell">
                          <span className="text-white/70 truncate block max-w-[140px]">{t.counterparty || "—"}</span>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          <span className="text-white">{Number(t.amount || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-white/40 ml-1">{t.currency || ""}</span>
                          {t.fee ? (
                            <div className="text-[10px] text-white/40">fee {t.fee}</div>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <Badge className="bg-violet-500/15 text-violet-200 border-violet-500/30 text-[10px]">
                            {t.method}
                          </Badge>
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-2 py-2 hidden lg:table-cell text-white/60 whitespace-nowrap">
                          {timeAgo(t.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState message="No transactions match these filters." />
              )}
            </div>
          </AdminCard>

          <div className="space-y-3">
            <AdminCard title="By Status" icon={Activity}>
              <BarsList data={data?.byStatus} field="status" color="bg-emerald-400/70" />
            </AdminCard>
            <AdminCard title="By Method" icon={Wallet}>
              <BarsList data={data?.byMethod} field="method" color="bg-violet-400/70" />
            </AdminCard>
            <AdminCard title="By Currency" icon={Globe}>
              <BarsList data={data?.byCurrency} field="currency" color="bg-teal-400/70" />
            </AdminCard>
            <AdminCard title="By Direction" icon={ArrowUpRight}>
              <BarsList data={data?.byDirection} field="direction" color="bg-sky-400/70" />
            </AdminCard>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    settled: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    failed:  "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase",
        map[status] || "bg-white/5 text-white/60 border-white/10",
      )}
    >
      {status}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 9: Overlays & Features
// ────────────────────────────────────────────────────────────────────────────

function OverlaysSection() {
  const { data, loading, error, refresh } = useAdminData<any>("/api/admin/overlays");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const filteredOverlays = useMemo(() => {
    if (!data?.overlays) return [];
    const q = search.trim().toLowerCase();
    return data.overlays.filter((o: any) => {
      if (catFilter && o.category !== catFilter) return false;
      if (!q) return true;
      return (
        o.name?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        o.event?.toLowerCase().includes(q)
      );
    });
  }, [data, search, catFilter]);

  const categories = data?.byCategory || [];
  const prefixes = data?.byEventPrefix || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="Overlays & Features" description="71 overlays, feature flags, DRE toggles" />

      {loading && !data ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <ErrorCard message={error} onRetry={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Total Overlays" value={formatNumber(data?.totalOverlays ?? 0)} icon={Grid3x3} accent="green" />
            <StatCard label="Total Commands" value={formatNumber(data?.totalCommands ?? 0)} icon={Hash} accent="blue" />
            <StatCard label="Quick Actions" value={formatNumber(data?.quickActionsCount ?? 0)} icon={Zap} accent="amber" />
            <StatCard label="Primary Tabs" value={formatNumber(data?.primaryTabs?.length ?? 0)} icon={LayoutDashboard} accent="default" />
            <StatCard label="Secondary Tabs" value={formatNumber(data?.secondaryTabs?.length ?? 0)} icon={Layers} accent="default" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AdminCard title="By Category" icon={FolderTree}>
              <BarsList data={categories} field="category" color="bg-emerald-400/70" />
            </AdminCard>
            <AdminCard title="By Event Prefix" icon={Hash}>
              <BarsList data={prefixes} field="prefix" color="bg-violet-400/70" />
            </AdminCard>
          </div>

          <AdminCard title="Tabs" icon={LayoutDashboard}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {[...(data?.primaryTabs || []), ...(data?.secondaryTabs || [])].map((t: any) => (
                <div key={t.id} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 flex items-center gap-2">
                  <span className="text-base">{t.icon || "•"}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-white truncate">{t.label || t.id}</div>
                    <div className="text-[9px] text-white/40 uppercase">{t.primary ? "Primary" : "Secondary"}</div>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Searchable grid */}
          <AdminCard
            title={`Overlay Browser (${filteredOverlays.length})`}
            icon={Grid3x3}
            action={
              <div className="flex items-center gap-2">
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-md h-8 px-2 text-xs text-white"
                  aria-label="Filter by category"
                >
                  <option value="">All categories</option>
                  {categories.map((c: any) => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                </select>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search overlays…"
                    className="pl-7 h-8 w-44 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/40"
                    aria-label="Search overlays"
                  />
                </div>
              </div>
            }
          >
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredOverlays.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredOverlays.map((o: any) => (
                    <div
                      key={o.id}
                      className="rounded-lg bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl shrink-0">{o.emoji || "•"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-white truncate">{o.name}</span>
                          </div>
                          <p className="text-[10px] text-white/50 line-clamp-2 mt-0.5">{o.description}</p>
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <Badge className="bg-teal-500/15 text-teal-200 border-teal-500/30 text-[9px]">
                              {o.category}
                            </Badge>
                            <span className="text-[9px] text-white/40 font-mono truncate">{o.event}</span>
                            {o.keywordsCount > 0 && (
                              <span className="text-[9px] text-white/40">· {o.keywordsCount} kw</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No overlays match these filters." />
              )}
            </div>
          </AdminCard>
        </>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 10: API & Routes
// ────────────────────────────────────────────────────────────────────────────

function ApiRoutesSection() {
  const { data, loading, error, refresh } = useAdminData<any>("/api/admin/api-routes");
  const [search, setSearch] = useState("");

  const filteredRoutes = useMemo(() => {
    if (!data?.routes) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.routes;
    return data.routes.filter((r: any) => r.path?.toLowerCase().includes(q));
  }, [data, search]);

  const presets = data?.rateLimitPresets || {};
  const byFolder = data?.byFolder || [];
  const maxFolder = Math.max(1, ...byFolder.map((f: any) => f.count));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="API & Routes" description="237 routes, rate limits, validation, smoke tests" />

      {loading && !data ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <ErrorCard message={error} onRetry={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total Routes" value={formatNumber(data?.totalRoutes ?? 0)} icon={Network} accent="green" />
            <StatCard label="Validation-Wrapped" value={formatNumber(data?.validationWrappedCount ?? 0)} icon={ShieldCheck} accent="blue" />
            <StatCard label="Folders" value={formatNumber(byFolder.length)} icon={FolderTree} accent="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AdminCard title="Rate Limit Presets" icon={Gauge}>
              <div className="space-y-2">
                {Object.entries(presets).map(([name, p]: any) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                    <div>
                      <div className="text-sm text-white">{name}</div>
                      <div className="text-[10px] text-white/40">{p.maxRequests} req / {(p.windowMs / 1000).toFixed(0)}s window</div>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                      {p.maxRequests}/{(p.windowMs / 60000).toFixed(0)}min
                    </Badge>
                  </div>
                ))}
              </div>
            </AdminCard>

            <AdminCard title="Validation-Wrapped Routes" icon={ShieldCheck}>
              {data?.validationWrapped?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.validationWrapped.map((r: string) => (
                    <span
                      key={r}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : <EmptyState message="No validation-wrapped routes" />}
            </AdminCard>
          </div>

          <AdminCard title="By Folder" icon={FolderTree}>
            <div className="space-y-2">
              {byFolder.map((f: any) => (
                <BarRow
                  key={f.folder}
                  label={f.folder || "root"}
                  value={f.count}
                  max={maxFolder}
                  color="bg-emerald-400/70"
                />
              ))}
            </div>
          </AdminCard>

          <AdminCard
            title={`Routes (${filteredRoutes.length})`}
            icon={Network}
            action={
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search routes…"
                  className="pl-7 h-8 w-48 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/40"
                  aria-label="Search routes"
                />
              </div>
            }
          >
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredRoutes.length ? (
                <div className="space-y-0.5">
                  {filteredRoutes.map((r: any, i: number) => (
                    <div
                      key={`${r.path}-${i}`}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                    >
                      <code className="text-[11px] font-mono text-white/80 truncate">{r.path}</code>
                      <Badge className="bg-violet-500/15 text-violet-200 border-violet-500/30 text-[9px] shrink-0">
                        {r.folder}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No routes match your search." />
              )}
            </div>
          </AdminCard>
        </>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 11: Errors & Monitoring
// ────────────────────────────────────────────────────────────────────────────

function ErrorsSection() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { data, loading, error, refresh, lastUpdated, elapsedMs } = useAdminData<any>(
    "/api/monitoring/errors",
    autoRefresh ? 10_000 : undefined,
  );

  const handleClear = async () => {
    setClearing(true);
    try {
      await fetch("/api/monitoring/errors", { method: "DELETE" });
      setConfirmingClear(false);
      refresh();
    } catch {
      // ignore
    } finally {
      setClearing(false);
    }
  };

  const stats = data?.stats || { total: 0, byLevel: {}, byKind: { error: 0, message: 0 } };
  const errors = data?.errors || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="Errors & Monitoring" description="Error history, stats, captured messages" />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="h-8 border-white/10 text-white/70 hover:bg-white/5"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1", loading && "animate-spin")} /> Refresh
        </Button>
        <button
          onClick={() => setAutoRefresh((v) => !v)}
          aria-pressed={autoRefresh}
          aria-label="Toggle 10s auto-refresh"
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors",
            autoRefresh
              ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
              : "bg-white/5 text-white/60 border-white/10",
          )}
        >
          <Clock className="w-3 h-3" />
          Auto-refresh (10s)
        </button>
        <div className="flex-1" />
        {!confirmingClear ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmingClear(true)}
            disabled={errors.length === 0 || clearing}
            className="h-8 border-rose-500/40 text-rose-200 hover:bg-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear errors
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-300">Clear all errors?</span>
            <Button
              size="sm"
              onClick={handleClear}
              disabled={clearing}
              className="h-8 bg-rose-500/30 text-rose-100 hover:bg-rose-500/40 border border-rose-500/40"
            >
              {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, clear"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingClear(false)}
              className="h-8 text-white/60"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {loading && !data ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <ErrorCard message={error} onRetry={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <StatCard label="Total Errors" value={formatNumber(stats.total)} icon={AlertTriangle} accent={stats.total > 0 ? "red" : "green"} />
            {(["fatal", "error", "warning", "info", "debug"] as const).map((lvl) => (
              <StatCard
                key={lvl}
                label={lvl}
                value={stats.byLevel?.[lvl] ?? 0}
                accent={lvl === "fatal" || lvl === "error" ? "red" : lvl === "warning" ? "amber" : lvl === "info" ? "blue" : "default"}
              />
            ))}
          </div>

          <AdminCard title={`Error History (${errors.length})`} icon={AlertTriangle}>
            {lastUpdated && (
              <div className="text-[10px] text-white/40 mb-2">
                Last updated {new Date(lastUpdated).toLocaleTimeString()} · {formatDuration(elapsedMs)}
              </div>
            )}
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-2">
              {errors.length ? (
                errors.map((e: any) => (
                  <div
                    key={e.id}
                    className="rounded-lg bg-white/5 border border-white/5 p-2.5"
                  >
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <LevelBadge level={e.level} />
                      <span className="text-[10px] text-white/40 tabular-nums">
                        {e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}
                      </span>
                      <span className="text-[10px] text-white/40">·</span>
                      <span className="text-[10px] text-white/50 uppercase">{e.kind}</span>
                      {e.name && (
                        <>
                          <span className="text-[10px] text-white/40">·</span>
                          <span className="text-[10px] font-mono text-rose-300/80">{e.name}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-white/80 break-all">{e.message}</p>
                    {e.stack && (
                      <details className="mt-1.5">
                        <summary className="text-[10px] text-white/40 cursor-pointer hover:text-white/60">
                          Stack trace
                        </summary>
                        <pre className="mt-1 text-[10px] font-mono text-white/50 bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                          {e.stack}
                        </pre>
                      </details>
                    )}
                    {(e.context || e.url || e.userAgent) && (
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-white/40">
                        {e.url && <span className="font-mono">URL: {e.url}</span>}
                        {e.userAgent && <span className="truncate max-w-[300px]">UA: {e.userAgent}</span>}
                        {e.context && (
                          <span className="font-mono truncate max-w-[300px]">
                            ctx: {JSON.stringify(e.context)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState message="No errors captured. All clear!" />
              )}
            </div>
          </AdminCard>
        </>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section: Feature Toggles (admin-controlled platform feature switches)
// ────────────────────────────────────────────────────────────────────────────

interface AdminFeatureItem {
  id: string;
  label: string;
  description: string;
  category: "tab" | "capability" | "overlay";
  defaultEnabled: boolean;
  enabled: boolean;
  updatedAt?: string | null;
}

interface AdminFeaturesResponse {
  total: number;
  enabledCount: number;
  disabledCount: number;
  features: AdminFeatureItem[];
  byCategory: {
    tab: AdminFeatureItem[];
    capability: AdminFeatureItem[];
    overlay: AdminFeatureItem[];
  };
  coreFeatureIds: string[];
}

const FEATURE_CATEGORY_META: Record<
  "tab" | "capability" | "overlay",
  { label: string; icon: LucideIcon; color: string }
> = {
  tab:        { label: "Tabs",            icon: LayoutDashboard, color: "bg-emerald-400/70" },
  capability: { label: "Capabilities",    icon: CpuIcon,         color: "bg-violet-400/70"  },
  overlay:    { label: "Feature Overlays", icon: Layers,         color: "bg-amber-400/70"   },
};

function FeatureToggleRow({
  feature,
  onToggle,
  pending,
}: {
  feature: AdminFeatureItem;
  onToggle: (id: string, enabled: boolean) => void;
  pending: boolean;
}) {
  const isCore = feature.defaultEnabled;
  const labelId = `feat-${feature.id}-label`;
  return (
    <div
      className="rounded-lg bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors"
      aria-labelledby={labelId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span id={labelId} className="text-xs font-medium text-white truncate">
              {feature.label}
            </span>
            {isCore && (
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[9px] uppercase">
                Core
              </Badge>
            )}
          </div>
          <p
            className="text-[10px] text-white/50 mt-0.5 truncate"
            title={feature.description}
          >
            {feature.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[9px] font-mono text-white/40 truncate">
              {feature.id}
            </span>
            {feature.updatedAt && (
              <span className="text-[9px] text-white/40 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> {timeAgo(feature.updatedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {pending && (
            <Loader2 className="w-3 h-3 text-white/60 animate-spin" aria-hidden="true" />
          )}
          <Switch
            checked={feature.enabled}
            disabled={pending}
            onCheckedChange={(checked) => onToggle(feature.id, checked)}
            role="switch"
            aria-checked={feature.enabled}
            aria-label={`Toggle ${feature.label} — ${feature.enabled ? "on" : "off"}`}
            className="data-[state=checked]:bg-emerald-500/80 data-[state=unchecked]:bg-white/15"
          />
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const { data: raw, loading, error, refresh } = useAdminData<AdminFeaturesResponse>("/api/admin/features");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | "tab" | "capability" | "overlay">("all");
  // Local override map: featureId -> enabled. Lets us apply optimistic updates
  // and reconcile with server state on next refresh.
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Reconcile: when server data refreshes, drop overrides that match the server
  // state (the server has caught up). Stale overrides remain so the optimistic
  // flip is preserved if a PUT failed silently.
  const prevRawRef = useRef<AdminFeaturesResponse | null>(null);
  if (raw !== prevRawRef.current) {
    prevRawRef.current = raw;
    if (raw) {
      const stale: Record<string, boolean> = {};
      for (const [id, enabled] of Object.entries(localOverrides)) {
        const serverFeat = raw.features.find((f) => f.id === id);
        if (!serverFeat || serverFeat.enabled !== enabled) {
          stale[id] = enabled;
        }
      }
      if (Object.keys(stale).length !== Object.keys(localOverrides).length) {
        setLocalOverrides(stale);
      }
    }
  }

  // Merge server data with optimistic local overrides.
  const features = useMemo<AdminFeatureItem[]>(() => {
    if (!raw?.features) return [];
    return raw.features.map((f) =>
      localOverrides[f.id] !== undefined
        ? { ...f, enabled: localOverrides[f.id] }
        : f,
    );
  }, [raw, localOverrides]);

  const enabledCount = features.filter((f) => f.enabled).length;
  const disabledCount = features.length - enabledCount;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return features.filter((f) => {
      if (catFilter !== "all" && f.category !== catFilter) return false;
      if (!q) return true;
      return (
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
      );
    });
  }, [features, search, catFilter]);

  const grouped = useMemo(() => {
    return {
      tab: filtered.filter((f) => f.category === "tab"),
      capability: filtered.filter((f) => f.category === "capability"),
      overlay: filtered.filter((f) => f.category === "overlay"),
    };
  }, [filtered]);

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      // Optimistic update
      setLocalOverrides((prev) => ({ ...prev, [id]: enabled }));
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      try {
        const res = await fetch("/api/admin/features", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, enabled }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}${txt ? ` — ${txt.slice(0, 120)}` : ""}`);
        }
        const feat = features.find((f) => f.id === id);
        toast.success(`${feat?.label ?? id} ${enabled ? "enabled" : "disabled"}`);
      } catch (err: unknown) {
        // Revert optimistic update
        setLocalOverrides((prev) => {
          const next = { ...prev };
          // Restore the previous server state (or remove override)
          const serverFeat = raw?.features.find((f) => f.id === id);
          if (serverFeat && serverFeat.enabled === enabled) {
            // server already matches; nothing to revert
          } else if (serverFeat) {
            next[id] = serverFeat.enabled;
          } else {
            delete next[id];
          }
          return next;
        });
        const msg = (err as { message?: string })?.message || "Failed to toggle";
        toast.error(`Failed to toggle: ${msg}`);
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [features, raw],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader
        title="Feature Toggles"
        description="Admin-controlled platform feature on/off switches"
      />

      {loading && !raw ? (
        <LoadingSkeleton rows={10} />
      ) : error ? (
        <ErrorCard message={error} onRetry={refresh} />
      ) : !raw ? (
        <EmptyState message="No feature data available." />
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Total Features"
              value={features.length}
              icon={ToggleRight}
              accent="default"
              hint={`${raw.coreFeatureIds.length} core defaults`}
            />
            <StatCard
              label="Enabled"
              value={enabledCount}
              icon={CheckCircle2}
              accent="green"
              hint={`${Math.round((enabledCount / Math.max(1, features.length)) * 100)}% of all features`}
            />
            <StatCard
              label="Disabled"
              value={disabledCount}
              icon={XCircle}
              accent="red"
              hint={`${Math.round((disabledCount / Math.max(1, features.length)) * 100)}% of all features`}
            />
          </div>

          {/* Core features info banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-100/90 leading-relaxed">
              <span className="font-medium text-amber-200">
                {raw.coreFeatureIds.length} core features are always on by default:
              </span>{" "}
              Wasl, Lamahat, Mashahd, Midan, Posting, Citizen Shield, Emergency, Commit.
              All other features are OFF until you enable them.
            </div>
          </div>

          {/* Search + filter */}
          <AdminCard
            title="Filter Features"
            icon={Search}
            action={
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={catFilter}
                  onChange={(e) =>
                    setCatFilter(e.target.value as typeof catFilter)
                  }
                  className="bg-white/5 border border-white/10 rounded-md h-8 px-2 text-xs text-white"
                  aria-label="Filter by category"
                >
                  <option value="all">All categories</option>
                  <option value="tab">Tabs</option>
                  <option value="capability">Capabilities</option>
                  <option value="overlay">Overlays</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search features…"
                    className="pl-7 h-8 w-44 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/40"
                    aria-label="Search features"
                  />
                </div>
              </div>
            }
          >
            <div className="text-[11px] text-white/50">
              Showing <span className="text-white/80 font-medium">{filtered.length}</span> of{" "}
              {features.length} features
            </div>
          </AdminCard>

          {/* Category cards */}
          {(["tab", "capability", "overlay"] as const).map((cat) => {
            const meta = FEATURE_CATEGORY_META[cat];
            const items = grouped[cat];
            if (catFilter !== "all" && catFilter !== cat) return null;
            if (items.length === 0) return null;
            const enabledInCat = items.filter((f) => f.enabled).length;
            const CatIcon = meta.icon;
            return (
              <AdminCard
                key={cat}
                title={`${meta.label} (${enabledInCat}/${items.length} on)`}
                icon={CatIcon}
                action={
                  <Badge className="bg-white/5 text-white/60 border-white/10 text-[9px] uppercase">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </Badge>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map((f) => (
                    <FeatureToggleRow
                      key={f.id}
                      feature={f}
                      onToggle={handleToggle}
                      pending={pendingIds.has(f.id)}
                    />
                  ))}
                </div>
              </AdminCard>
            );
          })}

          {filtered.length === 0 && (
            <EmptyState message="No features match these filters." />
          )}
        </>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section 12: System & Database
// ────────────────────────────────────────────────────────────────────────────

function SystemSection() {
  const { data, loading, error, refresh } = useAdminData<any>("/api/admin/system");

  if (loading && !data) return <LoadingSkeleton rows={10} />;
  if (error) return <ErrorCard message={error} onRetry={refresh} />;
  if (!data) return <EmptyState message="No system data." />;

  const env = data.env || { details: [], total: 0, set: 0, missing: [], missingRequired: [], allRequiredPresent: true };
  const db = data.database || {};
  const git = data.git || {};
  const backups = data.backups || [];
  const pkg = data.package || {};
  const runtime = data.runtime || {};
  const bp = data.branchProtection || {};
  const adrs = data.adrs || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <SectionHeader title="System & Database" description="Turso DB, env validation, git, backups" />

      {/* Database + Runtime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard title="Database" icon={Database}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusDot on={!!db.connected} label={db.connected ? "Connected" : "Disconnected"} />
              <span className="text-xs text-white/50 ml-auto">{db.url || "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <KV label="Tables" value={db.tableCount ?? 0} />
              <KV label="Users" value={db.userCount ?? 0} />
            </div>
            {db.error && (
              <p className="text-[10px] text-rose-300 font-mono break-all">{db.error}</p>
            )}
          </div>
        </AdminCard>

        <AdminCard title="Runtime" icon={Cpu}>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <KV label="Node" value={runtime.nodeVersion || "—"} />
            <KV label="Platform" value={runtime.platform || "—"} />
            <KV label="Arch" value={runtime.arch || "—"} />
            <KV label="PID" value={runtime.pid ?? "—"} />
            <KV label="Memory" value={`${runtime.memoryMb ?? 0} MB`} />
            <KV label="Uptime" value={formatUptime(runtime.uptimeSec)} />
          </div>
          <div className="mt-2 text-[10px] text-white/40 font-mono truncate">
            {runtime.cwd}
          </div>
        </AdminCard>
      </div>

      {/* Git + Backups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard title="Git" icon={GitBranch}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">{git.branch || "—"}</Badge>
              <span className="text-xs font-mono text-white/60">@{git.commit}</span>
              {git.prePushHookInstalled && (
                <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                  <ShieldCheck className="w-3 h-3" /> pre-push
                </Badge>
              )}
            </div>
            <div className="text-xs text-white/70">{git.lastCommitMessage || "—"}</div>
            <div className="text-[10px] text-white/40">
              {git.lastCommitDate ? new Date(git.lastCommitDate).toLocaleString() : "—"}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/50">
              <span>↑{git.ahead || 0}</span>
              <span>↓{git.behind || 0}</span>
              {git.remote && <span className="font-mono truncate max-w-[200px]">{git.remote}</span>}
            </div>
            {git.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {git.tags.map((t: string) => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 font-mono">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard title={`Backups (${backups.length})`} icon={HardDrive}>
          {backups.length ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {backups.map((b: any) => (
                <div key={b.name} className="flex items-center justify-between gap-2 p-2 rounded bg-white/5">
                  <div className="min-w-0">
                    <div className="text-xs text-white truncate font-mono">{b.name}</div>
                    <div className="text-[10px] text-white/40">
                      {b.mtime ? new Date(b.mtime).toLocaleString() : "—"}
                    </div>
                  </div>
                  <span className="text-xs text-emerald-300 tabular-nums shrink-0">{b.sizeMb} MB</span>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No backups found" />}
        </AdminCard>
      </div>

      {/* Package + ADRs + Platform stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AdminCard title="Package" icon={Package}>
          <div className="space-y-2">
            <div>
              <div className="text-sm text-white">{pkg.name || "—"}</div>
              <div className="text-xs text-white/50">v{pkg.version || "—"}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <KV label="Dependencies" value={pkg.dependencies ?? 0} />
              <KV label="DevDeps" value={pkg.devDependencies ?? 0} />
            </div>
            {pkg.scripts?.length > 0 && (
              <div className="border-t border-white/5 pt-2">
                <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">Scripts</div>
                <div className="flex flex-wrap gap-1">
                  {pkg.scripts.slice(0, 12).map((s: string) => (
                    <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard title="ADRs" icon={FileText}>
          <div className="space-y-2">
            {adrs.map((a: any) => (
              <div key={a.id} className="rounded-lg bg-white/5 border border-white/5 p-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-emerald-300">{a.id}</span>
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[9px]">
                    {a.status}
                  </Badge>
                </div>
                <div className="text-[11px] text-white/70 mt-1">{a.title}</div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Platform Stats" icon={Server}>
          <div className="grid grid-cols-2 gap-2">
            <KV label="Locale Packs" value={data.localePacks ?? 0} />
            <KV label="AIKE Modules" value={data.aikeModules ?? 0} />
            <KV label="AIKE Trainers" value={data.aikeTrainers ?? 0} />
            <KV label="Data Sources" value={data.dataSources ?? 0} />
          </div>
        </AdminCard>
      </div>

      {/* Environment */}
      <AdminCard
        title={`Environment (${env.set}/${env.total} set)`}
        icon={ShieldCheck}
        action={
          <Badge
            className={cn(
              env.allRequiredPresent
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-300 border-rose-500/30",
            )}
          >
            {env.allRequiredPresent ? "All required present" : `${env.missingRequired.length} required missing`}
          </Badge>
        }
      >
        <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white/5 backdrop-blur z-10">
              <tr className="text-white/50 uppercase tracking-wide">
                <th scope="col" className="text-left font-medium px-2 py-1.5">Name</th>
                <th scope="col" className="text-left font-medium px-2 py-1.5">Status</th>
                <th scope="col" className="text-left font-medium px-2 py-1.5 hidden md:table-cell">Required</th>
                <th scope="col" className="text-left font-medium px-2 py-1.5 hidden lg:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {env.details?.map((v: any) => {
                const missing = !v.set && v.required;
                return (
                  <tr
                    key={v.name}
                    className={cn(
                      "border-b border-white/5",
                      missing && "bg-rose-500/10",
                    )}
                  >
                    <td className="px-2 py-1.5 font-mono text-white/80">{v.name}</td>
                    <td className="px-2 py-1.5">
                      {v.set ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> set
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-300 text-[10px]">
                          <XCircle className="w-3 h-3" /> missing
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 hidden md:table-cell">
                      {v.required ? (
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[9px]">required</Badge>
                      ) : (
                        <span className="text-[10px] text-white/40">optional</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 hidden lg:table-cell text-white/50">{v.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Branch Protection */}
      <AdminCard title="Branch Protection (3-Layer)" icon={ShieldCheck}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-lg bg-white/5 border border-white/5 p-3">
            <div className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-300" />
              Layer 1: GitHub API
            </div>
            <div className="space-y-1 text-[11px]">
              <ProtectionRow label="allowForcePushes=false" ok={!bp.githubApi?.allowForcePushes} />
              <ProtectionRow label="allowDeletions=false" ok={!bp.githubApi?.allowDeletions} />
              <ProtectionRow label="requiredLinearHistory" ok={!!bp.githubApi?.requiredLinearHistory} />
              <ProtectionRow label="enforceAdmins" ok={!!bp.githubApi?.enforceAdmins} />
              <ProtectionRow label="strictStatusChecks" ok={!!bp.githubApi?.requiredStatusChecksStrict} />
            </div>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/5 p-3">
            <div className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-emerald-300" />
              Layer 2: Local Hook
            </div>
            <div className="space-y-1 text-[11px]">
              <ProtectionRow label="pre-push hook installed" ok={!!bp.localPrePushHook} />
              <ProtectionRow label="denyNonFastForwards" ok={!!bp.gitConfig?.denyNonFastForwards} />
              <ProtectionRow label="denyDeletes" ok={!!bp.gitConfig?.denyDeletes} />
              <ProtectionRow label="fsckObjects" ok={!!bp.gitConfig?.fsckObjects} />
            </div>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/5 p-3">
            <div className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-300" />
              Layer 3: Tag Patterns
            </div>
            <div className="flex flex-wrap gap-1">
              {bp.protectiveTagPatterns?.map((p: string) => (
                <span
                  key={p}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </AdminCard>
    </motion.div>
  );
}

function ProtectionRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
      ) : (
        <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
      )}
      <span className={cn("font-mono", ok ? "text-white/70" : "text-rose-300")}>{label}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Sovereign Environment Section (R1 — ACA, Police, EMS, Fire, Traffic)
// ────────────────────────────────────────────────────────────────────────────

function SovereignSection() {
  const { data, loading, error, refresh } = useAdminData<any>("/api/federation/institutions");
  const [showAcaLogin, setShowAcaLogin] = useState(false);

  const institutions = data?.institutions || [];
  const byType: Record<string, any[]> = {};
  for (const inst of institutions) {
    const t = inst.type || "other";
    if (!byType[t]) byType[t] = [];
    byType[t].push(inst);
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Sovereign Environment" description="ACA, Police, EMS, Fire, Traffic — confidential institutional workspaces" />

      {/* ACA Access Button — R1 */}
      <AdminCard title="ACA Sovereign Access" icon={Shield}>
        <div className="space-y-3">
          <p className="text-sm text-secondary">
            The ACA (Administrative Control Authority) environment is a completely separate, confidential institutional layer.
            It is invisible to ordinary citizens. Access requires ACA-provisioned identity.
          </p>
          <Button
            onClick={() => {
              toast.info("Opening ACA Login — DEV MODE (no auth)");
              window.dispatchEvent(new CustomEvent("circle:aca-login"));
            }}
            className="bg-slate-800 text-slate-100 hover:bg-slate-700"
          >
            <Shield className="w-4 h-4 mr-2" />
            Enter ACA Environment
          </Button>
          <div className="text-xs text-amber-500">
            ⚠️ DEV MODE — Credentials are NOT verified. Production MUST use PKI / hardware keys.
          </div>
        </div>
      </AdminCard>

      {/* Institution Registry Quick Access */}
      <AdminCard title="Institution Registry" icon={Building2}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent("circle:institution-registry"))}
        >
          Open Full Registry
        </Button>
      </AdminCard>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Institutions" value={formatNumber(institutions.length)} icon={Building2} />
        <StatCard label="ACA Cases" value="—" icon={Shield} accent="amber" />
        <StatCard label="Active Signals" value="—" icon={AlertTriangle} accent="amber" />
        <StatCard label="Federated Incidents" value="—" icon={Network} />
      </div>

      {/* Institutions by type */}
      {Object.keys(byType).length > 0 && (
        <AdminCard title="Institutions by Type">
          <div className="space-y-2">
            {Object.entries(byType).map(([type, items]) => (
              <div key={type} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <Badge variant="outline" className="capitalize">{type}</Badge>
                <span className="text-sm">{items.length} registered</span>
                <span className="text-xs text-secondary ml-auto">
                  {items[0]?.integrationLevel !== undefined ? `Level ${items[0].integrationLevel}` : "Level 0"}
                </span>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      {/* Sovereign principles */}
      <AdminCard title="Architectural Rules" icon={Scale}>
        <ul className="text-xs space-y-1 text-secondary">
          <li>• Circle does not replace government</li>
          <li>• Each institution is a sovereign security + operational domain</li>
          <li>• Emergency → Police/EMS/Fire/Traffic (NEVER ACA)</li>
          <li>• Signal ≠ Case (AI cannot auto-convert)</li>
          <li>• No cross-institution privilege inheritance</li>
          <li>• Federation ≠ Centralization</li>
        </ul>
      </AdminCard>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  AI Governance Admin Section (R7)
// ────────────────────────────────────────────────────────────────────────────

function AIGovernanceAdminSection() {
  const { data: killSwitchData, loading, error, refresh } = useAdminData<any>("/api/ai/kill-switch");
  const { data: automationData } = useAdminData<any>("/api/ai/automation-level");

  const killSwitches = killSwitchData?.states || [];
  const automationLevels = automationData?.levels || [];

  return (
    <div className="space-y-4">
      <SectionHeader title="AI Governance" description="Zero-trust AI — data access broker, kill switch, automation levels" />

      {/* AI Authority Boundary */}
      <AdminCard title="AI Human-Authority Boundary" icon={Shield}>
        <div className="space-y-2 text-xs">
          <div className="text-emerald-500 font-medium">AI CAN:</div>
          <div className="text-secondary">detect · connect · correlate · classify · summarize · prioritize · simulate · recommend · warn</div>
          <div className="text-red-500 font-medium mt-2">AI CANNOT (independently):</div>
          <div className="text-secondary">declare guilt · impose discipline · issue authoritative findings · unmask protected identities · destroy evidence · close sensitive investigations</div>
        </div>
      </AdminCard>

      {/* Kill Switch */}
      <AdminCard title="AI Kill Switch" icon={Cpu}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">Total AI features: {killSwitches.length || 0}</span>
          <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("circle:ai-governance"))}>
            Open Full Panel
          </Button>
        </div>
        <div className="text-xs text-amber-500">
          Can disable individual models/features WITHOUT disabling the entire platform.
        </div>
      </AdminCard>

      {/* Automation Levels */}
      <AdminCard title="AI Automation Levels">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span>Level 0 — Information only</span><Badge variant="outline">Safe</Badge></div>
          <div className="flex justify-between"><span>Level 1 — Recommendation</span><Badge variant="outline">Safe</Badge></div>
          <div className="flex justify-between"><span>Level 2 — Human approval required</span><Badge variant="secondary">Caution</Badge></div>
          <div className="flex justify-between"><span>Level 3 — Low-risk automation (by policy)</span><Badge variant="secondary">Caution</Badge></div>
          <div className="flex justify-between"><span>Level 4 — Prohibited autonomous action</span><Badge variant="destructive">Blocked</Badge></div>
        </div>
      </AdminCard>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Policy Engine Admin Section
// ────────────────────────────────────────────────────────────────────────────

function PolicyAdminSection() {
  const { data, loading, error, refresh } = useAdminData<any>("/api/policy/rules");

  const rules = data?.rules || [];
  const byCategory: Record<string, number> = {};
  for (const r of rules) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Policy Engine" description="Configurable policy rules — access, retention, escalation, AI, evidence" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Rules" value={formatNumber(rules.length)} icon={Scale} />
        <StatCard label="Active" value={formatNumber(rules.filter((r: any) => r.status === "active").length)} icon={CheckCircle2} accent="green" />
        <StatCard label="Categories" value={formatNumber(Object.keys(byCategory).length)} icon={Grid3x3} />
        <StatCard label="Institutions" value={formatNumber(new Set(rules.map((r: any) => r.institution).filter(Boolean)).size)} icon={Building2} />
      </div>

      <AdminCard title="Rules by Category">
        {Object.keys(byCategory).length > 0 ? (
          <div className="space-y-1">
            {Object.entries(byCategory).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <Badge variant="outline" className="capitalize">{cat}</Badge>
                <span className="text-sm">{count} rules</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-secondary text-center py-4">
            No policy rules yet. Seed defaults or create new rules.
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("circle:policy-engine"))}>
                Open Policy Engine
              </Button>
            </div>
          </div>
        )}
      </AdminCard>

      <AdminCard title="Policy Principles" icon={Scale}>
        <ul className="text-xs space-y-1 text-secondary">
          <li>• Everything government-facing is policy-configurable</li>
          <li>• No hard-coded government assumptions</li>
          <li>• Use configuration and explicit authorization</li>
          <li>• Categories: access, retention, escalation, emergency, disclosure, AI, evidence</li>
        </ul>
      </AdminCard>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Section router
// ────────────────────────────────────────────────────────────────────────────

function SectionRouter({ id }: { id: AdminSectionId }) {
  switch (id) {
    case "overview": return <OverviewSection />;
    case "users":    return <UsersSection />;
    case "content":  return <ContentSection />;
    case "circles":  return <CirclesSection />;
    case "ai":       return <BrainAISection />;
    case "aike":     return <AIKESection />;
    case "news":     return <NewsOrchestratorSection />;
    case "payments": return <PaymentsSection />;
    case "overlays": return <OverlaysSection />;
    case "api":      return <ApiRoutesSection />;
    case "errors":   return <ErrorsSection />;
    case "features": return <FeaturesSection />;
    case "system":   return <SystemSection />;
    case "sovereign":     return <SovereignSection />;
    case "ai-governance": return <AIGovernanceAdminSection />;
    case "policy":        return <PolicyAdminSection />;
    default:         return <EmptyState message="Unknown section" />;
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Sidebar
// ────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  active: AdminSectionId;
  onSelect: (id: AdminSectionId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function Sidebar({ active, onSelect, mobileOpen, onCloseMobile }: SidebarProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const flatIds = ADMIN_SECTIONS.map((s) => s.id);

  const handleKeyDown = (e: React.KeyboardEvent, id: AdminSectionId) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = flatIds.indexOf(id);
    const nextIdx = e.key === "ArrowDown" || e.key === "ArrowRight"
      ? (idx + 1) % flatIds.length
      : (idx - 1 + flatIds.length) % flatIds.length;
    const nextId = flatIds[nextIdx]!;
    onSelect(nextId);
    requestAnimationFrame(() => {
      tabRefs.current[nextId]?.focus();
    });
  };

  const sidebarContent = (
    <nav
      role="tablist"
      aria-label="Admin sections"
      aria-orientation="vertical"
      className="flex flex-col gap-4 p-3 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
    >
      {ADMIN_SECTION_GROUPS.map((group) => (
        <div key={group.id}>
          <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {ADMIN_SECTIONS.filter((s) => s.group === group.id).map((section) => {
              const Icon = section.icon;
              const isActive = active === section.id;
              return (
                <button
                  key={section.id}
                  ref={(el) => { tabRefs.current[section.id] = el; }}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => {
                    onSelect(section.id);
                    onCloseMobile();
                  }}
                  onKeyDown={(e) => handleKeyDown(e, section.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors border border-transparent text-left",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{section.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar (md+) */}
      <aside className="hidden md:flex md:w-[240px] lg:w-[240px] shrink-0 border-r border-white/10 bg-black/20 backdrop-blur-xl">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          onClick={onCloseMobile}
          aria-hidden="true"
        >
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="absolute left-0 top-0 bottom-0 w-[260px] bg-charcoal/95 border-r border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </motion.aside>
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Mobile icon strip (visible <768px instead of sidebar)
// ────────────────────────────────────────────────────────────────────────────

function MobileIconStrip({ active, onSelect }: { active: AdminSectionId; onSelect: (id: AdminSectionId) => void }) {
  return (
    <div
      className="md:hidden flex items-center gap-1 px-2 py-2 border-b border-white/10 bg-black/20 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      role="tablist"
      aria-label="Admin sections (mobile)"
      aria-orientation="horizontal"
    >
      {ADMIN_SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = active === section.id;
        return (
          <button
            key={section.id}
            role="tab"
            aria-selected={isActive}
            aria-label={section.label}
            onClick={() => onSelect(section.id)}
            className={cn(
              "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors border",
              isActive
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "text-white/60 hover:bg-white/5 border-transparent",
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Top bar
// ────────────────────────────────────────────────────────────────────────────

interface TopBarProps {
  onRefresh: () => void;
  refreshing: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onClose: () => void;
  onOpenMobileNav: () => void;
  activeLabel: string;
}

function TopBar({
  onRefresh, refreshing, autoRefresh, onToggleAutoRefresh, onClose, onOpenMobileNav, activeLabel,
}: TopBarProps) {
  return (
    <header className="flex items-center gap-2 px-3 md:px-4 h-14 border-b border-white/10 bg-black/30 backdrop-blur-xl shrink-0">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobileNav}
        className="md:hidden text-white/70 hover:bg-white/10"
        aria-label="Open navigation"
      >
        <Layers className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <LayoutDashboard className="w-4 h-4 text-emerald-300" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">CIRKLE Admin</div>
          <div className="text-[10px] text-white/40 truncate hidden sm:block">{activeLabel}</div>
        </div>
      </div>

      {/* DEV MODE warning */}
      <Badge className="ml-2 bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] uppercase tracking-wide hidden sm:inline-flex">
        <AlertTriangle className="w-3 h-3" />
        DEV MODE — NO AUTH
      </Badge>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh data"
        className="text-white/70 hover:bg-white/10"
      >
        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
      </Button>

      <button
        onClick={onToggleAutoRefresh}
        aria-pressed={autoRefresh}
        aria-label="Toggle auto-refresh"
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-xs transition-colors",
          autoRefresh
            ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
            : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10",
        )}
      >
        <Clock className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Auto (30s)</span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close admin panel"
        className="text-white/70 hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </Button>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Footer
// ────────────────────────────────────────────────────────────────────────────

function Footer({ lastUpdated, elapsedMs }: { lastUpdated: number | null; elapsedMs: number | null }) {
  return (
    <footer className="flex items-center justify-between gap-2 px-3 md:px-4 h-8 border-t border-white/10 bg-black/30 backdrop-blur-xl shrink-0 text-[10px] text-white/40">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—"}
        </span>
        {elapsedMs !== null && (
          <span className="tabular-nums">{formatDuration(elapsedMs)}</span>
        )}
      </div>
      <div className="hidden sm:block">Admin Panel v1.0 — Building Phase</div>
    </footer>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Main AdminPanel component
// ────────────────────────────────────────────────────────────────────────────

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AdminPanel({ open, onClose }: AdminPanelProps) {
  const [activeId, setActiveId] = useState<AdminSectionId>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Global refresh key — increments when user hits the top-bar refresh button
  // or when auto-refresh fires. Passed to the active section via context-like
  // refire: we re-mount the section by changing `key`.
  const [remountKey, setRemountKey] = useState(0);

  // Footer "last refresh" timestamp + elapsed time. Updated in three places:
  //   (1) when the panel opens
  //   (2) when the active section changes
  //   (3) when the user clicks refresh / auto-refresh fires
  // All three use the derived-state pattern (no setState-in-effect).
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [prevRefreshTick, setPrevRefreshTick] = useState(refreshTick);
  const [prevActiveId, setPrevActiveId] = useState<AdminSectionId>(activeId);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open && (!prevOpen || refreshTick !== prevRefreshTick || activeId !== prevActiveId)) {
    setPrevOpen(true);
    setPrevRefreshTick(refreshTick);
    setPrevActiveId(activeId);
    setLastUpdated(Date.now());
    setElapsedMs(null);
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Top-bar auto-refresh (30s)
  useEffect(() => {
    if (!open || !autoRefresh) return;
    const id = setInterval(() => {
      setRefreshTick((t) => t + 1);
      setRemountKey((k) => k + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, [open, autoRefresh]);

  const handleTopBarRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
    setRemountKey((k) => k + 1);
    setLastUpdated(Date.now());
    setElapsedMs(null);
  }, []);

  const activeSection = ADMIN_SECTIONS.find((s) => s.id === activeId);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="CIRKLE Platform Admin Panel"
      className="bg-gradient-to-br from-charcoal via-slate-900 to-charcoal text-white"
    >
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <TopBar
          onRefresh={handleTopBarRefresh}
          refreshing={false}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
          onClose={onClose}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          activeLabel={activeSection?.label || ""}
        />

        <MobileIconStrip active={activeId} onSelect={setActiveId} />

        <div className="flex flex-1 min-h-0">
          <Sidebar
            active={activeId}
            onSelect={setActiveId}
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
          />

          <main
            role="tabpanel"
            aria-labelledby={`tab-${activeId}`}
            className="flex-1 min-w-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            <motion.div
              key={`${activeId}-${remountKey}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-3 md:p-5 max-w-[1600px] mx-auto"
            >
              {/* Visible mobile warning since the top-bar badge is hidden on small screens */}
              <div className="md:hidden mb-3 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>DEV MODE — NO AUTH. Admin panel is in building phase.</span>
              </div>

              <SectionRouter id={activeId} />
            </motion.div>
          </main>
        </div>

        <Footer lastUpdated={lastUpdated} elapsedMs={elapsedMs} />
      </div>
    </OverlayShell>
  );
}
