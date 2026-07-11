"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Plus,
  Sparkles,
  Brain,
  Loader2,
  Trophy,
  Check,
  Clock,
  Coins,
  Activity,
  Filter,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { useAuth } from "@/lib/auth-store";
import { useApp } from "@/lib/app-store";
import { getCountry } from "@/lib/countries";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror server-side `prediction-market.ts` shapes.
// ─────────────────────────────────────────────────────────────────────────────

type MarketCategory =
  | "news"
  | "sports"
  | "politics"
  | "crypto"
  | "travel"
  | "weather"
  | "visa"
  | "social";

interface MarketOutcome {
  id: string;
  label: string;
  shares: number;
  probability: number;
}

interface PredictionMarket {
  id: string;
  question: string;
  category: MarketCategory;
  resolutionDate: string;
  outcomes: MarketOutcome[];
  totalVolume: number;
  resolved: boolean;
  resolutionOutcome?: string;
  liquidityParam: number;
  createdAt: string;
  createdBy: string;
}

interface PredictionBet {
  id: string;
  marketId: string;
  username: string;
  outcomeId: string;
  shares: number;
  amount: number;
  currency: string;
  createdAt: string;
  question?: string;
  outcomeLabel?: string;
  resolved?: boolean;
  won?: boolean;
  payout?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// NO indigo, NO blue.
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<MarketCategory, { label: string; emoji: string; tint: string }> = {
  news: { label: "News", emoji: "📰", tint: "from-secondary/25 to-primary/10 border-secondary/40" },
  sports: { label: "Sports", emoji: "⚽", tint: "from-primary/25 to-accent/10 border-primary/40" },
  politics: { label: "Politics", emoji: "🏛️", tint: "from-steel/30 to-primary/10 border-steel/40" },
  crypto: { label: "Crypto", emoji: "₿", tint: "from-accent/25 to-secondary/10 border-accent/40" },
  travel: { label: "Travel", emoji: "✈️", tint: "from-primary/25 to-steel/10 border-primary/40" },
  weather: { label: "Weather", emoji: "🌤️", tint: "from-secondary/25 to-primary/10 border-secondary/40" },
  visa: { label: "Visa", emoji: "🛂", tint: "from-primary/25 to-secondary/10 border-primary/40" },
  social: { label: "Social", emoji: "👥", tint: "from-accent/25 to-primary/10 border-accent/40" },
};

type TabView = "markets" | "my-bets" | "create";
const TABS: { id: TabView; label: string; icon: LucideIcon }[] = [
  { id: "markets", label: "Markets", icon: Activity },
  { id: "my-bets", label: "My Bets", icon: Trophy },
  { id: "create", label: "Create", icon: Plus },
];

// ─────────────────────────────────────────────────────────────────────────────
// Time-to-resolution helper
// ─────────────────────────────────────────────────────────────────────────────

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Resolving";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function OracleMarkets({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username || "guest";
  const { country } = useApp();
  const countryInfo = getCountry(country);
  const defaultCurrency = countryInfo?.currency ?? "EGP";

  const [tab, setTab] = useState<TabView>("markets");
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [bets, setBets] = useState<PredictionBet[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [loadingBets, setLoadingBets] = useState(false);
  const [selected, setSelected] = useState<PredictionMarket | null>(null);

  // Category filter on the markets tab.
  const [categoryFilter, setCategoryFilter] = useState<MarketCategory | "all">("all");

  // Balance fetched from /api/payments/transactions (same as Pay screen).
  const [balance, setBalance] = useState<number>(0);
  const [balanceCurrency, setBalanceCurrency] = useState<string>(defaultCurrency);

  // ── Data loaders ──────────────────────────────────────────────────────
  const loadMarkets = useCallback(async () => {
    setLoadingMarkets(true);
    try {
      const url = new URL("/api/predictions/markets", window.location.origin);
      if (categoryFilter !== "all") url.searchParams.set("category", categoryFilter);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("failed to load markets");
      const data = (await res.json()) as { markets: PredictionMarket[] };
      setMarkets(data.markets || []);
    } catch (err) {
      toast.error("Couldn't load markets", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoadingMarkets(false);
    }
  }, [categoryFilter]);

  const loadBets = useCallback(async () => {
    setLoadingBets(true);
    try {
      const res = await fetch(`/api/predictions/my-bets?username=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error("failed to load bets");
      const data = (await res.json()) as { bets: PredictionBet[] };
      setBets(data.bets || []);
    } catch {
      setBets([]);
    } finally {
      setLoadingBets(false);
    }
  }, [username]);

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/transactions");
      if (!res.ok) return;
      const txs = (await res.json()) as Array<{ direction: string; amount: number; currency: string }>;
      const bal = txs.reduce(
        (sum, t) => sum + (t.direction === "in" ? t.amount : -t.amount),
        0,
      );
      setBalance(bal);
      if (txs[0]?.currency) setBalanceCurrency(txs[0].currency);
    } catch {
      /* no-op — fall back to default currency */
    }
  }, []);

  // Reload on open + tab/category change.
  useEffect(() => {
    if (!open) return;
    loadMarkets();
    loadBalance();
  }, [open, loadMarkets, loadBalance]);

  useEffect(() => {
    if (!open) return;
    if (tab === "my-bets") loadBets();
  }, [open, tab, loadBets]);

  // Reset selection when overlay closes.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setSelected(null), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Derived stats for the markets list header ────────────────────────
  const stats = useMemo(() => {
    const active = markets.filter((m) => !m.resolved).length;
    const resolved = markets.filter((m) => m.resolved).length;
    const totalVolume = markets.reduce((s, m) => s + (m.totalVolume || 0), 0);
    const activeBets = bets.filter((b) => !b.resolved).length;
    const wonBets = bets.filter((b) => b.won === true).length;
    return { active, resolved, totalVolume, activeBets, wonBets };
  }, [markets, bets]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Cirkle Oracle — prediction markets with AI-powered probabilities"
    >
      {/* Aurora background — brand palette only */}
      <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background"
        aria-hidden
      />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {selected ? (
            <button
              onClick={() => setSelected(null)}
              className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
              aria-label="Back to list"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
          ) : null}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/40 to-secondary/20 border border-accent/40 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight flex items-center gap-2">
              Cirkle Oracle
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-primary/15 text-primary border-primary/40">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {stats.active} active
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              Prediction markets · LMSR market maker · AI-powered probabilities
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {!selected && (
          <div className="max-w-3xl mx-auto mt-3 flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60 w-fit">
            {TABS.map((t) => {
              const Icon = t.icon;
              const count =
                t.id === "my-bets" ? bets.length : 0;
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
                  {count > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 px-1.5 py-0 rounded-full text-[10px] font-semibold",
                        tab === t.id ? "bg-cream/20" : "bg-secondary/20 text-secondary",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ───────────────────────── Body ───────────────────────── */}
      <div className="relative flex-1 overflow-y-auto z-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 pb-24">
          <AnimatePresence mode="wait">
            {/* ─────────────── Market detail view ─────────────── */}
            {selected ? (
              <MarketDetail
                key="detail"
                market={selected}
                username={username}
                balance={balance}
                balanceCurrency={balanceCurrency}
                onBetPlaced={() => {
                  loadMarkets();
                  loadBets();
                }}
                onResolved={() => {
                  loadMarkets();
                  loadBets();
                }}
              />
            ) : (
              <>
                {/* ─────────────── Markets list ─────────────── */}
                {tab === "markets" && (
                  <motion.div
                    key="markets"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard
                        label="Active"
                        value={stats.active}
                        icon={Activity}
                        tint="text-primary"
                      />
                      <StatCard
                        label="Resolved"
                        value={stats.resolved}
                        icon={Check}
                        tint="text-emerald-600 dark:text-emerald-400"
                      />
                      <StatCard
                        label="Volume"
                        value={stats.totalVolume}
                        icon={Coins}
                        tint="text-secondary"
                        formatted
                      />
                    </div>

                    {/* Category filter */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => setCategoryFilter("all")}
                        className={cn(
                          "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition",
                          categoryFilter === "all"
                            ? "bg-gradient-hero text-cream border-transparent"
                            : "bg-card text-muted-foreground border-border/60 hover:text-foreground",
                        )}
                      >
                        All
                      </button>
                      {(Object.keys(CATEGORY_META) as MarketCategory[]).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={cn(
                            "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1",
                            categoryFilter === cat
                              ? "bg-gradient-hero text-cream border-transparent"
                              : "bg-card text-muted-foreground border-border/60 hover:text-foreground",
                          )}
                        >
                          <span>{CATEGORY_META[cat].emoji}</span>
                          {CATEGORY_META[cat].label}
                        </button>
                      ))}
                    </div>

                    {loadingMarkets ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : markets.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center mx-auto mb-3">
                          <Activity className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No markets in this category yet</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Switch to the Create tab to launch one.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {markets.map((m, i) => (
                          <MarketCard
                            key={m.id}
                            market={m}
                            delay={i * 0.04}
                            onClick={() => setSelected(m)}
                          />
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}

                {/* ─────────────── My Bets ─────────────── */}
                {tab === "my-bets" && (
                  <motion.div
                    key="my-bets"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard
                        label="Active bets"
                        value={stats.activeBets}
                        icon={Clock}
                        tint="text-primary"
                      />
                      <StatCard
                        label="Won"
                        value={stats.wonBets}
                        icon={Trophy}
                        tint="text-emerald-600 dark:text-emerald-400"
                      />
                      <StatCard
                        label="Total bets"
                        value={bets.length}
                        icon={Coins}
                        tint="text-secondary"
                      />
                    </div>

                    {loadingBets ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : bets.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center mx-auto mb-3">
                          <Trophy className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No bets placed yet</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Browse markets and buy shares — your bets will appear here.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {bets.map((b, i) => (
                          <BetCard key={b.id} bet={b} delay={i * 0.04} />
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}

                {/* ─────────────── Create market ─────────────── */}
                {tab === "create" && (
                  <motion.div
                    key="create"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CreateMarketForm
                      username={username}
                      defaultCurrency={defaultCurrency}
                      onCreated={() => {
                        setTab("markets");
                        loadMarkets();
                      }}
                    />
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market card (list item)
// ─────────────────────────────────────────────────────────────────────────────

function MarketCard({
  market,
  delay,
  onClick,
}: {
  market: PredictionMarket;
  delay: number;
  onClick: () => void;
}) {
  const meta = CATEGORY_META[market.category] ?? CATEGORY_META.news;
  const leadingOutcome = [...market.outcomes].sort((a, b) => b.probability - a.probability)[0];

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      onClick={onClick}
      className="w-full text-start rounded-2xl border border-border/60 bg-card hover:bg-muted/40 hover:border-border transition p-4 group"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl bg-gradient-to-br border flex items-center justify-center text-lg shrink-0",
            meta.tint,
          )}
        >
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-medium text-sm leading-snug flex-1 min-w-0">{market.question}</h3>
            {market.resolved && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40">
                <Check className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span className="uppercase tracking-wide">{meta.label}</span>
            <span>·</span>
            <span>{market.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} vol</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeLeft(market.resolutionDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Probability bars */}
      <div className="mt-3 space-y-1.5">
        {market.outcomes.slice(0, 4).map((o) => {
          const isWinner = market.resolved && market.resolutionOutcome === o.id;
          const pct = Math.round(o.probability * 100);
          return (
            <div key={o.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[11px] flex-1 min-w-0 truncate",
                  isWinner && "text-emerald-600 dark:text-emerald-400 font-medium",
                )}
              >
                {o.label}
                {isWinner && " ✓"}
              </span>
              <div className="w-24 sm:w-32 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isWinner
                      ? "bg-emerald-500"
                      : o.id === leadingOutcome?.id
                        ? "bg-gradient-to-r from-secondary to-primary"
                        : "bg-secondary/60",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-medium tabular-nums w-8 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market detail view with "Buy YES/NO" buttons + "Ask Cirkle Brain"
// ─────────────────────────────────────────────────────────────────────────────

function MarketDetail({
  market,
  username,
  balance,
  balanceCurrency,
  onBetPlaced,
  onResolved,
}: {
  market: PredictionMarket;
  username: string;
  balance: number;
  balanceCurrency: string;
  onBetPlaced: () => void;
  onResolved: () => void;
}) {
  const [betAmount, setBetAmount] = useState<string>("10");
  const [placing, setPlacing] = useState<string | null>(null); // outcomeId being placed
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<{ probability: number; reasoning: string } | null>(null);
  const [liveMarket, setLiveMarket] = useState<PredictionMarket>(market);

  // ── Place bet ──────────────────────────────────────────────────────
  const placeBetFor = useCallback(
    async (outcomeId: string) => {
      const amount = Number(betAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Enter a valid bet amount");
        return;
      }
      if (amount > balance) {
        toast.error("Insufficient Cirkle Pay balance", {
          description: `Available: ${balanceCurrency} ${balance.toLocaleString()}`,
        });
        return;
      }
      setPlacing(outcomeId);
      try {
        const res = await fetch("/api/predictions/bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketId: liveMarket.id,
            outcomeId,
            username,
            amount,
            currency: balanceCurrency,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "bet failed" }));
          throw new Error(err.error || "bet failed");
        }
        const data = (await res.json()) as { shares: number; newProbability: number; market: PredictionMarket };
        setLiveMarket(data.market);
        const outcome = liveMarket.outcomes.find((o) => o.id === outcomeId);
        toast.success("Bet placed!", {
          description: `Bought ${data.shares.toFixed(2)} shares of "${outcome?.label}". New probability: ${(data.newProbability * 100).toFixed(1)}%.`,
        });
        onBetPlaced();
      } catch (err) {
        toast.error("Couldn't place bet", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setPlacing(null);
      }
    },
    [betAmount, balance, balanceCurrency, username, liveMarket, onBetPlaced],
  );

  // ── Ask Cirkle Brain for an AI probability estimate ───────────────
  const askBrain = useCallback(async () => {
    setAiLoading(true);
    setAiEstimate(null);
    try {
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Prediction market question: "${liveMarket.question}". Outcomes: ${liveMarket.outcomes.map((o) => o.label).join(" vs ")}. Estimate the probability (0-100%) of the FIRST outcome being correct, and give a 1-2 sentence reasoning. Respond in JSON only: {"probability": <number 0-100>, "reasoning": "<text>"}.`,
          country: "EG",
          language: "en",
        }),
      });
      if (!res.ok) throw new Error("brain request failed");
      const data = await res.json();
      // Try to parse the probability out of the response text.
      const text: string = data?.response || data?.answer || data?.text || JSON.stringify(data);
      const match = text.match(/\{[\s\S]*?"probability"[\s\S]*?\}/i);
      let probability = 50;
      let reasoning = text;
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          probability = Number(parsed.probability) || 50;
          reasoning = parsed.reasoning || text;
        } catch {
          /* fall back to regex on the raw text */
        }
      } else {
        const numMatch = text.match(/(\d{1,3})\s*%/);
        if (numMatch) probability = Number(numMatch[1]);
      }
      setAiEstimate({
        probability: Math.max(0, Math.min(100, probability)),
        reasoning: reasoning.slice(0, 320),
      });
      toast.success("Cirkle Brain weighed in", {
        description: `AI estimate: ${probability.toFixed(0)}% for "${liveMarket.outcomes[0]?.label}"`,
      });
    } catch {
      toast.error("Brain couldn't respond", {
        description: "Try again in a moment.",
      });
    } finally {
      setAiLoading(false);
    }
  }, [liveMarket]);

  // ── Resolve market (admin/demo action) ─────────────────────────────
  const resolve = useCallback(
    async (outcomeId: string) => {
      try {
        const res = await fetch("/api/predictions/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketId: liveMarket.id, winningOutcomeId: outcomeId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "resolve failed" }));
          throw new Error(err.error || "resolve failed");
        }
        const data = (await res.json()) as { market: PredictionMarket };
        setLiveMarket(data.market);
        const winningLabel = liveMarket.outcomes.find((o) => o.id === outcomeId)?.label;
        toast.success("Market resolved", { description: `Winning outcome: ${winningLabel}` });
        onResolved();
      } catch (err) {
        toast.error("Couldn't resolve market", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [liveMarket, onResolved],
  );

  const meta = CATEGORY_META[liveMarket.category] ?? CATEGORY_META.news;

  return (
    <motion.div
      key={liveMarket.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Question + meta */}
      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl bg-gradient-to-br border flex items-center justify-center text-lg shrink-0",
              meta.tint,
            )}
          >
            {meta.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {meta.label} · Created by {liveMarket.createdBy}
            </span>
            <h2 className="font-display text-lg leading-snug mt-0.5">{liveMarket.question}</h2>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeLeft(liveMarket.resolutionDate)}
              </span>
              <span>·</span>
              <span>{liveMarket.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} {balanceCurrency} volume</span>
              <span>·</span>
              <span>LMSR b = {liveMarket.liquidityParam}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes + Buy buttons */}
      <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm">Outcomes</h3>
          <span className="text-[10px] text-muted-foreground">Balance: {balanceCurrency} {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>

        {/* Bet amount input */}
        {!liveMarket.resolved && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground shrink-0">Bet amount</label>
            <input
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-[11px] text-muted-foreground shrink-0">{balanceCurrency}</span>
          </div>
        )}

        {liveMarket.outcomes.map((o) => {
          const pct = Math.round(o.probability * 100);
          const isWinner = liveMarket.resolved && liveMarket.resolutionOutcome === o.id;
          const isPlacing = placing === o.id;
          return (
            <div
              key={o.id}
              className={cn(
                "rounded-xl border p-3",
                isWinner
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border/60 bg-background/40",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {o.label}
                      {isWinner && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                          <Trophy className="w-3 h-3" /> Winner
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isWinner
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-secondary to-primary",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums w-10 text-right">{pct}%</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {o.shares.toFixed(1)} shares outstanding
                  </div>
                </div>
                {!liveMarket.resolved ? (
                  <button
                    onClick={() => placeBetFor(o.id)}
                    disabled={isPlacing}
                    className={cn(
                      "shrink-0 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition",
                      isPlacing
                        ? "bg-muted text-muted-foreground cursor-wait"
                        : "bg-gradient-to-br from-secondary/80 to-secondary text-cream hover:scale-[1.03]",
                    )}
                  >
                    {isPlacing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Coins className="w-3.5 h-3.5" />
                    )}
                    Buy
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* Resolve (demo / admin) */}
        {!liveMarket.resolved && (
          <div className="pt-2 border-t border-border/60">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Resolve market (demo)
            </div>
            <div className="flex flex-wrap gap-2">
              {liveMarket.outcomes.map((o) => (
                <button
                  key={o.id}
                  onClick={() => resolve(o.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border/60 bg-card hover:bg-muted/40 transition"
                >
                  Resolve: {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Ask Cirkle Brain */}
      <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-sm">Ask Cirkle Brain</h3>
              <p className="text-[10px] text-muted-foreground">Get an AI probability estimate</p>
            </div>
          </div>
          <button
            onClick={askBrain}
            disabled={aiLoading}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition",
              aiLoading
                ? "bg-muted text-muted-foreground cursor-wait"
                : "bg-gradient-hero text-cream hover:scale-[1.03]",
            )}
          >
            {aiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {aiLoading ? "Thinking…" : "Ask Brain"}
          </button>
        </div>
        {aiEstimate && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/30 bg-primary/5 p-3"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                AI estimate for
              </span>
              <span className="text-[11px] font-medium">
                "{liveMarket.outcomes[0]?.label}"
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
                  style={{ width: `${aiEstimate.probability}%` }}
                />
              </div>
              <span className="text-lg font-display tabular-nums text-primary">
                {aiEstimate.probability.toFixed(0)}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              {aiEstimate.reasoning}
            </p>
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bet card (My Bets tab)
// ─────────────────────────────────────────────────────────────────────────────

function BetCard({ bet, delay }: { bet: PredictionBet; delay: number }) {
  const won = bet.won === true;
  const lost = bet.resolved && bet.won === false;
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      className="rounded-2xl border border-border/60 bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
            won
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : lost
                ? "bg-accent/15 text-accent border-accent/30"
                : "bg-primary/15 text-primary border-primary/30",
          )}
        >
          {won ? (
            <Trophy className="w-5 h-5" />
          ) : lost ? (
            <TrendingDown className="w-5 h-5" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium leading-snug">
            {bet.question || `Market ${bet.marketId.slice(-6)}`}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Coins className="w-3 h-3" />
              {bet.shares.toFixed(2)} shares
            </span>
            <span>·</span>
            <span>
              {bet.amount.toLocaleString()} {bet.currency} on
            </span>
            <span className="font-medium text-foreground">"{bet.outcomeLabel || bet.outcomeId}"</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {bet.resolved ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                  won
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                    : "bg-accent/15 text-accent border-accent/40",
                )}
              >
                {won ? <Check className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {won ? `Won ${bet.payout?.toFixed(2)}` : "Lost"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-primary/15 text-primary border-primary/40">
                <Clock className="w-3 h-3" />
                Active
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {new Date(bet.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create market form
// ─────────────────────────────────────────────────────────────────────────────

function CreateMarketForm({
  username,
  defaultCurrency,
  onCreated,
}: {
  username: string;
  defaultCurrency: string;
  onCreated: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState<MarketCategory>("news");
  const [resolutionDate, setResolutionDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [outcomeA, setOutcomeA] = useState("Yes");
  const [outcomeB, setOutcomeB] = useState("No");
  const [creating, setCreating] = useState(false);

  const submit = useCallback(async () => {
    if (!question.trim()) {
      toast.error("Question is required");
      return;
    }
    if (question.length > 280) {
      toast.error("Question must be 280 characters or fewer");
      return;
    }
    if (!outcomeA.trim() || !outcomeB.trim()) {
      toast.error("Both outcomes must have labels");
      return;
    }
    if (outcomeA.trim().toLowerCase() === outcomeB.trim().toLowerCase()) {
      toast.error("Outcomes must be different");
      return;
    }
    const iso = new Date(`${resolutionDate}T23:59:59`).toISOString();
    if (new Date(iso).getTime() <= Date.now()) {
      toast.error("Resolution date must be in the future");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/predictions/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          category,
          resolutionDate: iso,
          outcomes: [
            { id: outcomeA.trim().toLowerCase().replace(/\s+/g, "-"), label: outcomeA.trim() },
            { id: outcomeB.trim().toLowerCase().replace(/\s+/g, "-"), label: outcomeB.trim() },
          ],
          createdBy: username,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "create failed" }));
        throw new Error(err.error || "create failed");
      }
      toast.success("Market created!", {
        description: "It's now live in the Markets tab.",
      });
      setQuestion("");
      setOutcomeA("Yes");
      setOutcomeB("No");
      onCreated();
    } catch (err) {
      toast.error("Couldn't create market", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  }, [question, category, resolutionDate, outcomeA, outcomeB, username, onCreated]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm flex-1">Create a prediction market</h2>
      </div>

      {/* Question */}
      <div>
        <label className="text-[11px] text-muted-foreground block mb-1">
          Question (max 280 chars)
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Will X happen by Y?"
          rows={2}
          maxLength={280}
          className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="text-[10px] text-muted-foreground mt-0.5 text-right">
          {question.length}/280
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="text-[11px] text-muted-foreground block mb-1">Category</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_META) as MarketCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1",
                category === c
                  ? "bg-gradient-hero text-cream border-transparent"
                  : "bg-card text-muted-foreground border-border/60 hover:text-foreground",
              )}
            >
              <span>{CATEGORY_META[c].emoji}</span>
              {CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution date */}
      <div>
        <label className="text-[11px] text-muted-foreground block mb-1">Resolution date</label>
        <input
          type="date"
          value={resolutionDate}
          onChange={(e) => setResolutionDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Outcomes */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Outcome A</label>
          <input
            value={outcomeA}
            onChange={(e) => setOutcomeA(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Outcome B</label>
          <input
            value={outcomeB}
            onChange={(e) => setOutcomeB(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground">
          Default currency: {defaultCurrency} · LMSR b = 100
        </span>
        <button
          onClick={submit}
          disabled={creating}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition",
            creating
              ? "bg-muted text-muted-foreground cursor-wait"
              : "bg-gradient-hero text-cream hover:scale-[1.03]",
          )}
        >
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {creating ? "Creating…" : "Launch market"}
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card (shared)
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
  formatted,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tint: string;
  formatted?: boolean;
}) {
  const display = formatted
    ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : String(value);
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-3 py-2.5 text-center">
      <Icon className={cn("w-4 h-4 mx-auto mb-1", tint)} />
      <div className={cn("font-display text-xl leading-none truncate", tint)}>{display}</div>
      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide truncate">
        {label}
      </div>
    </div>
  );
}
