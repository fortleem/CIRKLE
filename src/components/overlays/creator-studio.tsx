"use client";

/**
 * Creator Studio — monetization dashboard for Cirkle creators.
 *
 * Tabs:
 *   1. Overview     — earnings (all-time, this month, last 30d), supporters count,
 *                     monthly recurring revenue, top supporters leaderboard.
 *   2. Monetization — enable/disable toggle, support tier amounts (basic/premium/VIP),
 *                     Mint verified-creator badge display.
 *   3. Subscribers  — active monthly subscribers list.
 *   4. Payouts      — payout method (cirkle_pay | bank | crypto) + opaque details.
 *
 * Open via the `circle:creator-studio` event (registered in page.tsx + overlay-registry.ts).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Coins,
  TrendingUp,
  Users,
  Trophy,
  Crown,
  BadgeCheck,
  Loader2,
  RefreshCw,
  Sparkles,
  Wallet,
  Building2,
  Bitcoin,
  ShieldCheck,
  Heart,
  AlertCircle,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-store";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// NO indigo, NO blue. All accent colors map to the brand tokens.
// ─────────────────────────────────────────────────────────────────────────────

type TabView = "overview" | "monetization" | "subscribers" | "payouts";
const TABS: { id: TabView; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: TrendingUp },
  { id: "monetization", label: "Monetization", icon: Coins },
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "payouts", label: "Payouts", icon: Wallet },
];

type Tier = "bronze" | "silver" | "gold" | "platinum";
const TIER_META: Record<Tier, { label: string; tint: string; emoji: string; threshold: number }> = {
  bronze:    { label: "Bronze",    tint: "from-amber-700/30 to-amber-900/10 border-amber-700/40",         emoji: "🥉", threshold: 0 },
  silver:    { label: "Silver",    tint: "from-slate-400/30 to-slate-600/10 border-slate-400/40",         emoji: "🥈", threshold: 250 },
  gold:      { label: "Gold",      tint: "from-secondary/30 to-accent/10 border-secondary/40",            emoji: "🥇", threshold: 1000 },
  platinum:  { label: "Platinum",  tint: "from-primary/30 to-secondary/10 border-primary/40",             emoji: "💎", threshold: 5000 },
};

type PayoutMethod = "cirkle_pay" | "bank" | "crypto";
const PAYOUT_META: Record<PayoutMethod, { label: string; icon: LucideIcon; placeholder: string; hint: string }> = {
  cirkle_pay: { label: "Cirkle Pay", icon: Wallet,    placeholder: "@username or +9665XXXXXXXX", hint: "Funds land in your Cirkle Pay wallet instantly." },
  bank:       { label: "Bank",       icon: Building2, placeholder: "IBAN · SA03 8000 0000 6080 1016 7519",  hint: "SWIFT transfers settle in 1–3 business days." },
  crypto:     { label: "Crypto",     icon: Bitcoin,   placeholder: "0x... or bc1... (USDC on Polygon)",     hint: "USDC payouts on Polygon — gas paid by Cirkle." },
};

interface CreatorProfile {
  username: string;
  verified: boolean;
  monetized: boolean;
  tier: Tier;
  totalEarnings: number;
  totalSupporters: number;
  payoutMethod: PayoutMethod | null;
  payoutDetails?: string | null;
  basicAmount: number;
  premiumAmount: number;
  vipAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface TopSupporter {
  supporter: string;
  totalAmount: number;
  count: number;
  lastAt: string;
}

interface Subscriber {
  id: string;
  tier: string;
  amount: number;
  currency: string;
  subscriber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface RecentSupport {
  id: string;
  supporter: string;
  amount: number;
  currency: string;
  message: string | null;
  createdAt: string;
}

interface EarningsPayload {
  profile: CreatorProfile;
  totals: {
    allTime: number;
    thisMonth: number;
    last30d: number;
    currency: string;
    supporters: number;
    subscribers: number;
    monthlyRecurring: number;
  };
  topSupporters: TopSupporter[];
  monthlySubs: Subscriber[];
  recentSupport: RecentSupport[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function computeTier(totalEarnings: number): Tier {
  if (totalEarnings >= TIER_META.platinum.threshold) return "platinum";
  if (totalEarnings >= TIER_META.gold.threshold) return "gold";
  if (totalEarnings >= TIER_META.silver.threshold) return "silver";
  return "bronze";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function CreatorStudio({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username || "guest";
  const displayName = user?.displayName || "Creator";

  const [tab, setTab] = useState<TabView>("overview");
  const [data, setData] = useState<EarningsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Editable monetization form (mirrors the profile fields).
  const [monetized, setMonetized] = useState(false);
  const [basicAmount, setBasicAmount] = useState("5");
  const [premiumAmount, setPremiumAmount] = useState("20");
  const [vipAmount, setVipAmount] = useState("100");
  const [currency, setCurrency] = useState("SAR");

  // Payout form.
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("cirkle_pay");
  const [payoutDetails, setPayoutDetails] = useState("");

  // ── Data loader ───────────────────────────────────────────────────────
  const loadEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/earnings?username=${encodeURIComponent(username)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed to load earnings");
      const payload = (await res.json()) as EarningsPayload;
      setData(payload);
      setMonetized(payload.profile.monetized);
      setBasicAmount(String(payload.profile.basicAmount));
      setPremiumAmount(String(payload.profile.premiumAmount));
      setVipAmount(String(payload.profile.vipAmount));
      setCurrency(payload.profile.currency);
      if (payload.profile.payoutMethod) setPayoutMethod(payload.profile.payoutMethod);
      if (payload.profile.payoutDetails) setPayoutDetails(payload.profile.payoutDetails);
    } catch (err) {
      toast.error("Couldn't load earnings", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!open) return;
    loadEarnings();
  }, [open, loadEarnings]);

  // ── Save handlers ─────────────────────────────────────────────────────
  const saveMonetization = useCallback(async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/creator/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          monetized,
          basicAmount: Number(basicAmount) || 0,
          premiumAmount: Number(premiumAmount) || 0,
          vipAmount: Number(vipAmount) || 0,
          currency,
        }),
      });
      if (!res.ok) throw new Error("failed to save");
      toast.success("Monetization settings saved");
      loadEarnings();
    } catch (err) {
      toast.error("Couldn't save monetization settings", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingProfile(false);
    }
  }, [username, monetized, basicAmount, premiumAmount, vipAmount, currency, loadEarnings]);

  const requestMintBadge = useCallback(async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/creator/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, verified: true }),
      });
      if (!res.ok) throw new Error("failed to mint badge");
      toast.success("Mint verified-creator badge issued", {
        description: "The badge now appears on every post you publish.",
      });
      loadEarnings();
    } catch (err) {
      toast.error("Couldn't issue Mint badge", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingProfile(false);
    }
  }, [username, loadEarnings]);

  const savePayout = useCallback(async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/creator/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          payoutMethod,
          payoutDetails: payoutDetails.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("failed to save payout");
      toast.success("Payout method saved");
      loadEarnings();
    } catch (err) {
      toast.error("Couldn't save payout method", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingProfile(false);
    }
  }, [username, payoutMethod, payoutDetails, loadEarnings]);

  // ── Derived display values ────────────────────────────────────────────
  const effectiveTier = useMemo<Tier>(() => {
    if (!data) return "bronze";
    // Show the tier the algorithm thinks they should be at, based on earnings.
    return computeTier(data.profile.totalEarnings);
  }, [data]);

  const nextTier = useMemo<Tier | null>(() => {
    const order: Tier[] = ["bronze", "silver", "gold", "platinum"];
    const idx = order.indexOf(effectiveTier);
    return idx < order.length - 1 ? order[idx + 1] : null;
  }, [effectiveTier]);

  const progressToNext = useMemo(() => {
    if (!data || !nextTier) return 100;
    const cur = data.profile.totalEarnings;
    const base = TIER_META[effectiveTier].threshold;
    const target = TIER_META[nextTier].threshold;
    if (target <= base) return 100;
    return Math.min(100, Math.max(0, ((cur - base) / (target - base)) * 100));
  }, [data, effectiveTier, nextTier]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Creator Studio — monetize your content. Micropayments, subscriptions, Mint verified badge."
    >
      {/* Aurora background — brand palette only */}
      <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background" aria-hidden />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/40 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight flex items-center gap-2">
              Creator Studio
              {data?.profile.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-secondary/15 text-secondary border-secondary/40">
                  <BadgeCheck className="w-3 h-3" />
                  Mint verified
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                  TIER_META[effectiveTier].tint,
                )}
              >
                <Crown className="w-3 h-3" />
                {TIER_META[effectiveTier].label}
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              @{username} · Monetize your content · 0% platform fees
            </p>
          </div>
          <button
            onClick={loadEarnings}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0 disabled:opacity-50"
            aria-label="Refresh"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <FeedbackButton overlayName="Creator Studio" />
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto mt-3 flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60 w-fit">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5",
                  tab === t.id
                    ? "bg-gradient-hero text-cream shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ───────────────────────── Body ─────────────────────────── */}
      <div className="relative max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 pb-32 overflow-y-auto z-10">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-secondary" />
            <p className="text-xs">Loading earnings…</p>
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <AlertCircle className="w-6 h-6 text-accent" />
            <p className="text-xs">No earnings data yet.</p>
            <button onClick={loadEarnings} className="text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/60">
              Retry
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {/* ────────────── Overview tab ────────────── */}
              {tab === "overview" && (
                <OverviewTab data={data} displayName={displayName} effectiveTier={effectiveTier} nextTier={nextTier} progressToNext={progressToNext} />
              )}

              {/* ────────────── Monetization tab ────────────── */}
              {tab === "monetization" && (
                <MonetizationTab
                  monetized={monetized}
                  setMonetized={setMonetized}
                  basicAmount={basicAmount}
                  setBasicAmount={setBasicAmount}
                  premiumAmount={premiumAmount}
                  setPremiumAmount={setPremiumAmount}
                  vipAmount={vipAmount}
                  setVipAmount={setVipAmount}
                  currency={currency}
                  setCurrency={setCurrency}
                  verified={data.profile.verified}
                  saving={savingProfile}
                  onSave={saveMonetization}
                  onMintBadge={requestMintBadge}
                  username={username}
                />
              )}

              {/* ────────────── Subscribers tab ────────────── */}
              {tab === "subscribers" && <SubscribersTab subs={data.monthlySubs} />}

              {/* ────────────── Payouts tab ────────────── */}
              {tab === "payouts" && (
                <PayoutsTab
                  payoutMethod={payoutMethod}
                  setPayoutMethod={setPayoutMethod}
                  payoutDetails={payoutDetails}
                  setPayoutDetails={setPayoutDetails}
                  saving={savingProfile}
                  onSave={savePayout}
                  balance={data.totals.allTime}
                  currency={data.totals.currency}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({
  data,
  displayName,
  effectiveTier,
  nextTier,
  progressToNext,
}: {
  data: EarningsPayload;
  displayName: string;
  effectiveTier: Tier;
  nextTier: Tier | null;
  progressToNext: number;
}) {
  const { totals, topSupporters, recentSupport, profile } = data;
  return (
    <div className="space-y-4">
      {/* Earnings hero card */}
      <div className="glass-strong rounded-3xl p-5 border border-border/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">All-time earnings</p>
            <p className="font-display text-4xl gradient-text-gold mt-1">
              {fmt(totals.allTime, totals.currency)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {fmt(totals.monthlyRecurring, totals.currency)} / mo recurring · {totals.subscribers} subscribers
            </p>
          </div>
          <div className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs">+{fmt(totals.last30d, totals.currency)} · 30d</span>
          </div>
        </div>

        {/* Tier progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Crown className="w-3 h-3" /> {TIER_META[effectiveTier].label}
            </span>
            {nextTier ? (
              <span className="text-muted-foreground">
                {fmt(profile.totalEarnings, totals.currency)} / {fmt(TIER_META[nextTier].threshold, totals.currency)} to {TIER_META[nextTier].label}
              </span>
            ) : (
              <span className="text-secondary flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Top tier reached
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-gradient-gold"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="This month" value={fmt(totals.thisMonth, totals.currency)} icon={Coins} tint="from-secondary/25 to-accent/10" />
        <StatCard label="Last 30 days" value={fmt(totals.last30d, totals.currency)} icon={TrendingUp} tint="from-primary/25 to-secondary/10" />
        <StatCard label="Supporters" value={String(totals.supporters)} icon={Heart} tint="from-accent/25 to-secondary/10" />
        <StatCard label="Subscribers" value={String(totals.subscribers)} icon={Users} tint="from-steel/25 to-primary/10" />
      </div>

      {/* Top supporters leaderboard */}
      <section className="glass-strong rounded-2xl border border-border/40 overflow-hidden">
        <header className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-secondary" />
          <h2 className="font-display text-sm">Top supporters</h2>
          <span className="text-[10px] text-muted-foreground ms-auto">{topSupporters.length} supporters</span>
        </header>
        {topSupporters.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No supporters yet. Share your profile to start earning.
          </div>
        ) : (
          <ul className="divide-y divide-border/40 max-h-80 overflow-y-auto">
            {topSupporters.map((s, i) => (
              <li key={s.supporter} className="px-4 py-3 flex items-center gap-3">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    i === 0 ? "bg-secondary/30 text-secondary"
                    : i === 1 ? "bg-muted text-foreground"
                    : i === 2 ? "bg-accent/20 text-accent"
                    : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center text-[10px] text-cream font-display shrink-0">
                  {s.supporter[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">@{s.supporter}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {s.count} {s.count === 1 ? "support" : "supports"} · last {timeAgo(s.lastAt)}
                  </div>
                </div>
                <div className="text-sm font-display text-secondary tabular-nums">
                  {fmt(s.totalAmount, profile.currency)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent support activity */}
      <section className="glass-strong rounded-2xl border border-border/40 overflow-hidden">
        <header className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm">Recent support</h2>
          <span className="text-[10px] text-muted-foreground ms-auto">last 20</span>
        </header>
        {recentSupport.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No recent activity.
          </div>
        ) : (
          <ul className="divide-y divide-border/40 max-h-72 overflow-y-auto">
            {recentSupport.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-mesh flex items-center justify-center text-[10px] text-cream font-display shrink-0">
                  {s.supporter[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">@{s.supporter}</span>{" "}
                    <span className="text-muted-foreground">supported {fmt(s.amount, s.currency)}</span>
                  </div>
                  {s.message && <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">“{s.message}”</p>}
                  <div className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(s.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-[10px] text-muted-foreground pt-2">
        {displayName}, you keep 100% of every support. Cirkle takes 0%.
      </p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tint }: { label: string; value: string; icon: LucideIcon; tint: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/40 p-3 bg-gradient-to-br", tint)}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <div className="font-display text-lg mt-1.5 tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Monetization tab
// ─────────────────────────────────────────────────────────────────────────────

function MonetizationTab({
  monetized,
  setMonetized,
  basicAmount,
  setBasicAmount,
  premiumAmount,
  setPremiumAmount,
  vipAmount,
  setVipAmount,
  currency,
  setCurrency,
  verified,
  saving,
  onSave,
  onMintBadge,
  username,
}: {
  monetized: boolean;
  setMonetized: (v: boolean) => void;
  basicAmount: string;
  setBasicAmount: (v: string) => void;
  premiumAmount: string;
  setPremiumAmount: (v: string) => void;
  vipAmount: string;
  setVipAmount: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  verified: boolean;
  saving: boolean;
  onSave: () => void;
  onMintBadge: () => void;
  username: string;
}) {
  return (
    <div className="space-y-4">
      {/* Monetization toggle */}
      <section className="glass-strong rounded-2xl border border-border/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-secondary" />
              <h2 className="font-display text-sm">Accept support</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              When on, a “Support” button appears on every post you publish.
              Supporters can send one-off Commit micropayments or subscribe monthly.
            </p>
          </div>
          <Switch checked={monetized} onCheckedChange={setMonetized} aria-label="Toggle monetization" />
        </div>
      </section>

      {/* Support tier amounts */}
      <section className="glass-strong rounded-2xl border border-border/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-secondary" />
          <h2 className="font-display text-sm">Support tiers</h2>
          <span className="text-[10px] text-muted-foreground ms-auto">One-off Commit micropayments</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TierInput label="Basic" emoji="🌱" amount={basicAmount} setAmount={setBasicAmount} tint="from-emerald-500/15 to-transparent border-emerald-500/30" />
          <TierInput label="Premium" emoji="⭐" amount={premiumAmount} setAmount={setPremiumAmount} tint="from-secondary/20 to-accent/10 border-secondary/40" />
          <TierInput label="VIP" emoji="👑" amount={vipAmount} setAmount={setVipAmount} tint="from-primary/20 to-secondary/10 border-primary/40" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="currency" className="text-[11px] text-muted-foreground uppercase tracking-widest">Currency</label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg bg-muted/60 border border-border/60 outline-none"
          >
            {["SAR", "AED", "EGP", "USD", "EUR", "GBP"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full mt-4 py-2.5 rounded-full bg-gradient-gold text-charcoal text-xs font-medium flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95 transition disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          Save monetization settings
        </button>
      </section>

      {/* Mint verified-creator badge */}
      <section className="glass-strong rounded-2xl border border-border/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-secondary" />
              <h2 className="font-display text-sm">Mint verified-creator badge</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Issue a verifiable on-device credential that proves @{username} is the
              original author. The badge appears on every post and on your profile.
            </p>
            {verified && (
              <p className="text-[11px] text-secondary mt-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Badge issued · visible across Cirkle
              </p>
            )}
          </div>
          <button
            onClick={onMintBadge}
            disabled={saving || verified}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition shrink-0",
              verified
                ? "bg-secondary/20 text-secondary border border-secondary/40 cursor-default"
                : "bg-gradient-gold text-charcoal hover:scale-105 active:scale-95 disabled:opacity-60",
            )}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {verified ? "Issued" : "Mint badge"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TierInput({
  label,
  emoji,
  amount,
  setAmount,
  tint,
}: {
  label: string;
  emoji: string;
  amount: string;
  setAmount: (v: string) => void;
  tint: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-3 bg-gradient-to-br", tint)}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-2 relative">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="pr-10 tabular-nums"
          aria-label={`${label} amount`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
          amt
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscribers tab
// ─────────────────────────────────────────────────────────────────────────────

function SubscribersTab({ subs }: { subs: Subscriber[] }) {
  if (subs.length === 0) {
    return (
      <section className="glass-strong rounded-2xl border border-border/40 p-8 text-center">
        <Users className="w-8 h-8 text-muted-foreground mx-auto" />
        <h2 className="font-display text-base mt-3">No active subscribers yet</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          When fans subscribe, they pay a monthly amount in exchange for your
          premium posts. Set your tier amounts in the Monetization tab.
        </p>
      </section>
    );
  }
  return (
    <section className="glass-strong rounded-2xl border border-border/40 overflow-hidden">
      <header className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
        <Users className="w-4 h-4 text-secondary" />
        <h2 className="font-display text-sm">Active subscribers</h2>
        <span className="text-[10px] text-muted-foreground ms-auto">{subs.length} active</span>
      </header>
      <ul className="divide-y divide-border/40 max-h-[60vh] overflow-y-auto">
        {subs.map((s) => (
          <li key={s.id} className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-[10px] text-cream font-display shrink-0">
              {s.subscriber[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">@{s.subscriber}</div>
              <div className="text-[10px] text-muted-foreground">
                {s.tier} tier · since {new Date(s.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-display text-secondary tabular-nums">
                {fmt(s.amount, s.currency)}
              </div>
              <div className="text-[10px] text-muted-foreground">/mo</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payouts tab
// ─────────────────────────────────────────────────────────────────────────────

function PayoutsTab({
  payoutMethod,
  setPayoutMethod,
  payoutDetails,
  setPayoutDetails,
  saving,
  onSave,
  balance,
  currency,
}: {
  payoutMethod: PayoutMethod;
  setPayoutMethod: (m: PayoutMethod) => void;
  payoutDetails: string;
  setPayoutDetails: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  balance: number;
  currency: string;
}) {
  const meta = PAYOUT_META[payoutMethod];
  const PayoutIcon = meta.icon;
  return (
    <div className="space-y-4">
      {/* Balance banner */}
      <section className="glass-strong rounded-2xl border border-border/40 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Available for payout</p>
          <p className="font-display text-2xl gradient-text-gold mt-1">{fmt(balance, currency)}</p>
        </div>
        <Wallet className="w-6 h-6 text-secondary" />
      </section>

      {/* Method picker */}
      <section className="glass-strong rounded-2xl border border-border/40 p-4">
        <h2 className="font-display text-sm mb-3">Payout method</h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PAYOUT_META) as PayoutMethod[]).map((m) => {
            const M = PAYOUT_META[m];
            const Icon = M.icon;
            const active = payoutMethod === m;
            return (
              <button
                key={m}
                onClick={() => setPayoutMethod(m)}
                className={cn(
                  "rounded-2xl border p-3 text-center transition flex flex-col items-center gap-1.5",
                  active
                    ? "border-secondary/60 bg-secondary/15 text-secondary"
                    : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-medium">{M.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <label htmlFor="payoutDetails" className="text-[11px] text-muted-foreground uppercase tracking-widest">
            {meta.label} details
          </label>
          <Textarea
            id="payoutDetails"
            value={payoutDetails}
            onChange={(e) => setPayoutDetails(e.target.value)}
            placeholder={meta.placeholder}
            className="mt-1.5 min-h-[72px] font-mono text-xs"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-start gap-1.5">
            <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0 text-secondary" />
            {meta.hint} Details are encrypted at rest — only you can decrypt them.
          </p>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full mt-4 py-2.5 rounded-full bg-gradient-gold text-charcoal text-xs font-medium flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95 transition disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PayoutIcon className="w-3.5 h-3.5" />}
          Save payout method
        </button>
      </section>

      <p className="text-center text-[10px] text-muted-foreground">
        Payouts process within 24h · 0% platform fee · network fees may apply
      </p>
    </div>
  );
}
