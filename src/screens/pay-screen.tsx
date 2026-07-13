// @ts-nocheck
"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { motion } from "framer-motion";
import { getCountry } from "@/lib/countries";
import { useApp } from "@/lib/app-store";
import {
  ScanLine, Send, Plus, Eye, EyeOff, Nfc, ShieldCheck,
  ArrowUpRight, ArrowDownLeft, X, Wallet, Loader2, Brain,
  TrendingDown, TrendingUp, Sparkles, Clock, Zap,
  CreditCard, Banknote, QrCode, Landmark,
  Utensils, Bus, ShoppingBag, Receipt, Film, Package,
  PiggyBank, BarChart3, PieChart,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Brain AI connection for Cirkle Pay.
 *
 * Pay was previously NOT wired to Cirkle Brain AI — transactions came
 * straight from `/api/payments/transactions` with no AI layer. This
 * helper routes the user's "analyze my spending patterns" request
 * through the Brain universal connection layer
 * (`/api/brain/cross-evaluate` → `crossEvaluate` → KG + 5-provider
 * consensus + web search), then surfaces the consensus answer as a
 * toast.
 *
 * It also dispatches a `circle:brain-query` CustomEvent so any future
 * page-level listener can observe / intercept Brain queries.
 */
async function brainAnalyzeSpending(opts: {
  country: string;
  city: string | null;
  username?: string;
  currency: string;
  balance: string;
  txCount: number;
}): Promise<{ answer: string; confidence: number; sources: string[] }> {
  const { country, city, username, currency, balance, txCount } = opts;
  window.dispatchEvent(
    new CustomEvent("circle:brain-query", {
      detail: { feature: "pay", action: "analyze", country, city },
    }),
  );
  const query =
    `[pay:analyze] analyze my spending patterns — ` +
    `currency ${currency}, current balance ${balance}, ${txCount} recent transactions. ` +
    `Highlight top categories, unusual activity, and one savings tip.`;
  const res = await fetch("/api/brain/cross-evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      country,
      city: city || undefined,
      username,
      language: "en",
    }),
  });
  if (!res.ok) throw new Error(`Brain query failed (${res.status})`);
  const data = await res.json();
  return {
    answer: data?.finalAnswer || "No insights right now — try again later.",
    confidence: data?.confidence ?? 0,
    sources: (data?.sources || []).map((s: { name: string }) => s.name),
  };
}

/** Real transaction shape returned by /api/payments/transactions. */
interface Tx {
  id: string;
  direction: "in" | "out";
  counterparty: string;
  counterpartyInitials: string;
  counterpartyColor: string;
  amount: number;
  currency: string;
  method: string;
  memo?: string;
  timestamp: string;
  status: "settled" | "pending" | "failed";
  fee: number;
}

const CONTACTS: string[] = []; // Real contacts loaded from /api/contacts

// ─── Spending analytics helpers ───────────────────────────────────────
// Pure functions that derive chart-ready data from the raw Tx[] stream.
// No external chart library — every visualization below is rendered with
// plain divs + CSS conic-gradient / height percentages.

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#C06070",          // brand rose
  Transport: "#4A6A8A",     // steel blue
  Shopping: "#C2A060",      // sand gold
  Bills: "#1A4A5A",         // deep teal
  Entertainment: "#7B5EA7", // accent purple
  Other: "#6B7280",         // neutral gray
};

const CATEGORY_ICONS: Record<string, any> = {
  Food: Utensils,
  Transport: Bus,
  Shopping: ShoppingBag,
  Bills: Receipt,
  Entertainment: Film,
  Other: Package,
};

/** Infers a spending category from the tx memo + method free text. */
function inferCategory(tx: Tx): string {
  const text = `${tx.memo || ""} ${tx.method}`.toLowerCase();
  if (/food|restaurant|cafe|coffee|eat|dinner|lunch|breakfast|meal|grocer|supermarket|bakery|takeout|delivery|kitchen/.test(text)) return "Food";
  if (/transport|taxi|uber|careem|gas|fuel|bus|train|metro|park|car|ride|bike|scooter|lyft/.test(text)) return "Transport";
  if (/shop|store|mall|amazon|purchase|retail|fashion|clothes|electronic|book|gift|market/.test(text)) return "Shopping";
  if (/bill|utility|electric|water|internet|phone|rent|mortgage|subscription|netflix|spotify|insurance|salary|payroll/.test(text)) return "Bills";
  if (/entertainment|movie|cinema|game|concert|ticket|fun|leisure|sport|stream/.test(text)) return "Entertainment";
  return "Other";
}

/** Builds the last 7 days of outgoing spend (settled only). */
function getLast7DaysSpending(txs: Tx[]): { day: string; amount: number; isToday: boolean }[] {
  const days: { day: string; amount: number; isToday: boolean }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const amount = txs
      .filter(t => t.direction === "out" && t.status === "settled")
      .filter(t => {
        const td = new Date(t.timestamp);
        return td >= d && td < next;
      })
      .reduce((s, t) => s + t.amount, 0);
    days.push({
      day: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3),
      amount,
      isToday: i === 0,
    });
  }
  return days;
}

/** Groups outgoing settled txs by inferred category, sorted desc. */
function getCategoryBreakdown(txs: Tx[]): { category: string; amount: number; color: string; pct: number }[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const t of txs) {
    if (t.direction !== "out" || t.status !== "settled") continue;
    const cat = inferCategory(t);
    map.set(cat, (map.get(cat) || 0) + t.amount);
    total += t.amount;
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Other,
      pct: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Three quick stat cards: week spend, month spend, lifetime saved. */
function getQuickStats(txs: Tx[]): { weekSpent: number; monthSpent: number; totalSaved: number } {
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
  const settledOut = txs.filter(t => t.direction === "out" && t.status === "settled");
  const settledIn = txs.filter(t => t.direction === "in" && t.status === "settled");
  const weekSpent = settledOut.filter(t => new Date(t.timestamp) >= weekAgo).reduce((s, t) => s + t.amount, 0);
  const monthSpent = settledOut.filter(t => new Date(t.timestamp) >= monthAgo).reduce((s, t) => s + t.amount, 0);
  const totalIn = settledIn.reduce((s, t) => s + t.amount, 0);
  const totalOut = settledOut.reduce((s, t) => s + t.amount, 0);
  const totalSaved = Math.max(0, totalIn - totalOut);
  return { weekSpent, monthSpent, totalSaved };
}

/** Compares this week's spend vs last week's — returns a localized insight. */
function getSmartInsight(txs: Tx[], currency: string): { text: string; tone: "positive" | "neutral" | "warning" } {
  if (txs.length === 0) {
    return { text: "Make your first payment to unlock personalized spending insights.", tone: "neutral" };
  }
  const last7 = getLast7DaysSpending(txs);
  const this7Amount = last7.reduce((s, d) => s + d.amount, 0);
  const prev7End = new Date(); prev7End.setDate(prev7End.getDate() - 7);
  const prev7Start = new Date(); prev7Start.setDate(prev7Start.getDate() - 14);
  const prev7Amount = txs
    .filter(t => t.direction === "out" && t.status === "settled")
    .filter(t => {
      const td = new Date(t.timestamp);
      return td >= prev7Start && td < prev7End;
    })
    .reduce((s, t) => s + t.amount, 0);

  const breakdown = getCategoryBreakdown(txs);
  const topCat = breakdown[0];

  if (prev7Amount === 0 && this7Amount === 0) {
    return { text: "No spending in the last 2 weeks — you're on a saving streak!", tone: "positive" };
  }
  if (prev7Amount === 0) {
    return {
      text: `You spent ${currency} ${this7Amount.toFixed(2)} this week${topCat ? ` — mostly on ${topCat.category.toLowerCase()}` : ""}.`,
      tone: "neutral",
    };
  }
  const pct = Math.round(((this7Amount - prev7Amount) / prev7Amount) * 100);
  if (pct < 0) {
    return {
      text: `You spent ${Math.abs(pct)}% less this week than last week — that's ${currency} ${(prev7Amount - this7Amount).toFixed(2)} saved.`,
      tone: "positive",
    };
  }
  if (pct > 25) {
    return {
      text: `Spending is up ${pct}% vs last week${topCat ? `, driven by ${topCat.category.toLowerCase()}` : ""}. Consider setting a budget.`,
      tone: "warning",
    };
  }
  return {
    text: `Spending is steady — up ${pct}% vs last week${topCat ? `. Top category: ${topCat.category}` : ""}.`,
    tone: "neutral",
  };
}

/** Maps a method string to a representative lucide icon. */
function getMethodIcon(method: string) {
  const m = (method || "").toLowerCase();
  if (/card|visa|mastercard|amex/.test(m)) return CreditCard;
  if (/bank|transfer|wire|iban/.test(m)) return Landmark;
  if (/qr|scan|code/.test(m)) return QrCode;
  if (/cash/.test(m)) return Banknote;
  if (/wallet|pay/.test(m)) return Wallet;
  return CreditCard;
}

/** Builds the conic-gradient stops string for the category donut. */
function buildDonutStops(breakdown: { color: string; amount: number }[]): string {
  const total = breakdown.reduce((s, c) => s + c.amount, 0);
  if (total === 0) return "hsl(var(--muted)) 0% 100%";
  let acc = 0;
  return breakdown.map(c => {
    const start = (acc / total) * 100;
    acc += c.amount;
    const end = (acc / total) * 100;
    return `${c.color} ${start}% ${end}%`;
  }).join(", ");
}

/** Compact colored status pill for the enhanced transaction cards. */
function StatusBadge({ status }: { status: "settled" | "pending" | "failed" }) {
  const cfg = {
    settled: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Settled" },
    pending: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Pending" },
    failed: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", label: "Failed" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-medium ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function PayScreen() {
  const { user } = useAuth();
  const [hide, setHide] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [action, setAction] = useState<string | null>(null);
  const [sendTo, setSendTo] = useState<string | null>(null);
  const [txSheet, setTxSheet] = useState<Tx | null>(null);
  const [brainBusy, setBrainBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { country, city } = useApp();
  const countryInfo = getCountry(country);

  // Real transactions straight from the API — drives the balance + the
  // "Recent activity" list. No mock fallback: an empty API response shows
  // the empty state.
  const { data: txsData, isError: balanceIsError, isLoading: txsLoading } = useQuery<Tx[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await fetch("/api/payments/transactions");
      if (!res.ok) throw new Error("failed to load transactions");
      return res.json();
    },
  });

  const txs: Tx[] = txsData ?? [];
  const balanceNum = txs.reduce(
    (sum, t) => sum + (t.direction === "in" ? t.amount : -t.amount),
    0,
  );
  const balanceCurrency = txs[0]?.currency ?? countryInfo.currency;
  const balanceStr =
    balanceIsError || balanceNum === undefined || Number.isNaN(balanceNum)
      ? "—"
      : balanceNum.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  // ── Derived spending analytics for the new chart sections ──
  // All pure functions of `txs` — recompute on every render (cheap for
  // typical tx counts). Memoization skipped intentionally: the dataset is
  // small and the helpers are O(n).
  const last7 = getLast7DaysSpending(txs);
  const breakdown = getCategoryBreakdown(txs);
  const quick = getQuickStats(txs);
  const insight = getSmartInsight(txs, balanceCurrency);

  const onMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 10, ry: px * 12 });
  };

  const reset = () => setTilt({ rx: 0, ry: 0 });

  /** Calls the Brain universal layer for spending-pattern analysis. */
  const onBrainInsights = async () => {
    if (brainBusy) return;
    setBrainBusy(true);
    const promise = brainAnalyzeSpending({
      country,
      city,
      username: user?.username,
      currency: balanceCurrency,
      balance: balanceStr,
      txCount: txs.length,
    });
    toast.promise(promise, {
      loading: "🧠 Brain is analyzing your spending…",
      success: (r) => ({
        title: "🧠 Brain AI · Pay Insights",
        description: `${r.answer.slice(0, 180)}${r.answer.length > 180 ? "…" : ""}`,
      }),
      error: (e: Error) => ({
        title: "Brain AI unavailable",
        description: e.message,
      }),
    });
    try {
      await promise;
    } catch {
      /* toast already shown */
    } finally {
      setBrainBusy(false);
    }
  };

  return (
    <div className="pb-32">
      {/* ── Super Upgrade: Header with fee-free + privacy badges ── */}
      <div className="px-5 pt-2 flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl">Cirkle Pay</h1>
          <p className="text-xs text-secondary mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            0% fees · Non-custodial · Your keys, your money
          </p>
        </div>
        <span className="text-[10px] glass rounded-full px-3 py-1.5 flex items-center gap-1.5 text-secondary">
          <ShieldCheck className="w-3 h-3" /> Cirkle ID
        </span>
      </div>

      {/* Card */}
      <div className="px-5 mt-5" style={{ perspective: 1200 }}>
        <motion.div
          ref={cardRef}
          onMouseMove={onMove}
          onMouseLeave={reset}
          initial={{ rotateX: -10, opacity: 0 }}
          animate={{ opacity: 1, rotateX: tilt.rx, rotateY: tilt.ry }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative rounded-3xl aspect-[16/10] p-5 overflow-hidden shadow-float bg-gradient-hero"
          style={{ color: "hsl(var(--cream))", transformStyle: "preserve-3d" }}
        >
          <div className="absolute inset-0 bg-gradient-aurora opacity-70" />
          <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full border border-white/15" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full border border-white/10" />
          <div className="relative h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest opacity-70">Balance</div>
                <div className="font-display text-4xl mt-1">{hide ? "•••••" : `${balanceCurrency} ${balanceStr}`}</div>
              </div>
              <button
                onClick={() => { setHide((h) => !h); toast(hide ? "Balance visible" : "Balance hidden"); }}
                className="w-9 h-9 rounded-full glass-strong flex items-center justify-center"
                aria-label={hide ? "Show balance" : "Hide balance"}
              >
                {hide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs opacity-70">{user?.displayName || "User"}</div>
                <div className="text-sm tracking-[0.3em] mt-1">•••• 4820</div>
              </div>
              <button
                onClick={() => toast("Tap a contactless reader — Coming soon")}
                className="flex items-center gap-1.5"
                aria-label="NFC"
              >
                <Nfc className="w-6 h-6 opacity-80" />
                <span className="text-[10px] uppercase tracking-widest opacity-80">Tap to pay</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Brain AI Insights banner — sits between the balance card and the
          quick-action grid so it's the first thing the user sees after
          their balance. Routes through the Brain universal layer. */}
      <div className="px-5 mt-4">
        <button
          onClick={onBrainInsights}
          disabled={brainBusy}
          aria-label="Brain AI spending insights"
          className="w-full rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-transparent p-4 flex items-center gap-3 relative overflow-hidden text-left hover:bg-secondary/10 transition disabled:opacity-50"
        >
          <div className="absolute -top-10 -right-8 w-32 h-32 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
            {brainBusy ? (
              <Loader2 className="w-5 h-5 text-brand-charcoal animate-spin" />
            ) : (
              <Brain className="w-5 h-5 text-brand-charcoal" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-secondary">Brain AI Insights</div>
            <div className="font-display text-base">Analyze my spending patterns</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              5-provider consensus · {txs.length} transactions · {balanceCurrency}
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-secondary shrink-0" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3 px-5 mt-5">
        {[
          { icon: ScanLine, label: "Scan" },
          { icon: Send, label: "Send" },
          { icon: Plus, label: "Top-up" },
          { icon: ShieldCheck, label: "Vault" },
        ].map((q) => (
          <button
            key={q.label}
            onClick={() => setAction(q.label)}
            className="glass rounded-2xl py-3 flex flex-col items-center gap-2 shadow-soft hover:bg-muted/50 transition"
          >
            <q.icon className="w-5 h-5 text-secondary" />
            <span className="text-[11px]">{q.label}</span>
          </button>
        ))}
      </div>

      {/* P2P contacts */}
      <div className="px-5 mt-6">
        <h2 className="font-display text-xl mb-3">Send to</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {CONTACTS.map((n) => (
            <button
              key={n}
              onClick={() => setSendTo(n)}
              className="shrink-0 flex flex-col items-center gap-1.5 hover:scale-105 transition"
            >
              <div
                className="w-14 h-14 rounded-full bg-gradient-mesh flex items-center justify-center font-display text-lg"
                style={{ color: "hsl(var(--cream))" }}
              >
                {n[0]}
              </div>
              <span className="text-[10px] text-muted-foreground">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Local payment methods for the active country */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Wallet className="w-5 h-5 text-secondary" />
            Payment methods in {countryInfo.name}
          </h2>
          <span className="text-xs text-muted-foreground">{countryInfo.flag} {countryInfo.currency}</span>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {countryInfo.paymentMethods.map((pm) => (
              <button
                key={pm.id}
                onClick={() => toast(`${pm.name} — ${pm.description}`)}
                className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 hover:bg-muted/40 transition text-start"
              >
                <span className="text-2xl shrink-0" aria-hidden>{pm.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{pm.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{pm.description}</div>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-secondary/80 shrink-0">{pm.type.replace(/_/g, " ")}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-3 text-center">
            {countryInfo.paymentMethods.length} local payment options available
          </div>
        </div>
      </div>

      {/* ── Spending Analytics: quick stats + smart insight + 7-day chart + category donut ── */}
      <div className="px-5 mt-6">
        <h2 className="font-display text-xl flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-secondary" />
          Spending analytics
        </h2>

        {/* Quick stats row — 3 cards */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="glass rounded-2xl p-3">
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">This week</div>
            <div className="font-display text-sm mt-0.5 truncate">{balanceCurrency} {quick.weekSpent.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="glass rounded-2xl p-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center mb-1.5">
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">This month</div>
            <div className="font-display text-sm mt-0.5 truncate">{balanceCurrency} {quick.monthSpent.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="glass rounded-2xl p-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center mb-1.5">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Total saved</div>
            <div className="font-display text-sm mt-0.5 truncate">{balanceCurrency} {quick.totalSaved.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Smart insight card — locally computed (no API call). */}
        <div className={`rounded-2xl border p-3.5 flex items-start gap-3 mb-3 relative overflow-hidden ${
          insight.tone === "positive" ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent" :
          insight.tone === "warning" ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent" :
          "border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent"
        }`}>
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-secondary/15 rounded-full blur-2xl pointer-events-none" />
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            insight.tone === "positive" ? "bg-emerald-500/20" :
            insight.tone === "warning" ? "bg-amber-500/20" :
            "bg-gradient-gold"
          }`}>
            {insight.tone === "positive" ? <TrendingDown className="w-4 h-4 text-emerald-500" /> :
             insight.tone === "warning" ? <TrendingUp className="w-4 h-4 text-amber-500" /> :
             <Sparkles className="w-4 h-4 text-brand-charcoal" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-secondary flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Smart insight
            </div>
            <div className="text-[13px] leading-snug mt-1">{insight.text}</div>
          </div>
        </div>

        {/* 7-day spending bar chart — pure CSS bars. */}
        <div className="glass rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Last 7 days</div>
              <div className="font-display text-lg">
                {balanceCurrency} {last7.reduce((s, d) => s + d.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground text-right">
              <div>Avg / day</div>
              <div className="text-secondary font-medium">
                {balanceCurrency} {(last7.reduce((s, d) => s + d.amount, 0) / 7).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-28">
            {last7.map((d, i) => {
              const max = Math.max(...last7.map(x => x.amount), 1);
              const h = max > 0 ? Math.max((d.amount / max) * 100, d.amount > 0 ? 6 : 2) : 2;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                  <div className="text-[9px] text-muted-foreground font-medium tabular-nums">{d.amount > 0 ? d.amount.toFixed(0) : ""}</div>
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${d.isToday ? "bg-gradient-to-t from-secondary to-secondary/60" : "bg-gradient-to-t from-secondary/50 to-secondary/20"}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <div className={`text-[10px] ${d.isToday ? "text-secondary font-semibold" : "text-muted-foreground"}`}>{d.day}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category breakdown — CSS conic-gradient donut + legend. */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-secondary" />
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">By category</div>
          </div>
          {breakdown.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">No spending to break down yet.</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28 shrink-0">
                <div
                  className="w-full h-full rounded-full"
                  style={{ background: `conic-gradient(${buildDonutStops(breakdown)})` }}
                />
                <div className="absolute inset-3 rounded-full bg-card flex flex-col items-center justify-center">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Total</div>
                  <div className="font-display text-sm">{balanceCurrency} {breakdown.reduce((s, c) => s + c.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {breakdown.map(c => {
                  const Icon = CATEGORY_ICONS[c.category] || Package;
                  return (
                    <div key={c.category} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-[11px] flex-1 truncate">{c.category}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{c.pct.toFixed(0)}%</span>
                      <span className="text-[11px] font-medium tabular-nums">{balanceCurrency} {c.amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Recent activity</h2>
          <button
            onClick={() => toast("Full history — Coming soon")}
            className="text-xs text-secondary"
          >
            See all
          </button>
        </div>
        {txsLoading ? (
          <div className="glass rounded-2xl p-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading activity…
          </div>
        ) : txs.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Tap Send or Scan to make your first payment.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl divide-y divide-border/60 overflow-hidden">
            {txs.map((tx) => {
              const isPos = tx.direction === "in";
              const when = tx.timestamp
                ? new Date(tx.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              const cat = inferCategory(tx);
              const MethodIcon = getMethodIcon(tx.method);
              const CatIcon = CATEGORY_ICONS[cat] || Package;
              return (
                <button
                  key={tx.id}
                  onClick={() => setTxSheet(tx)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition text-start"
                >
                  {/* Counterparty avatar with gradient + directional type badge */}
                  <div className="relative shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-display text-sm"
                      style={{
                        background: tx.counterpartyColor || "var(--gradient-mesh)",
                        color: "hsl(var(--cream))",
                      }}
                    >
                      {tx.counterpartyInitials || tx.counterparty?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-card ${
                        isPos ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      aria-hidden
                    >
                      {isPos ? (
                        <ArrowDownLeft className="w-3 h-3 text-white" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Counterparty name + category + date + payment method */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tx.counterparty}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <CatIcon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{cat}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="truncate">{when}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                      <MethodIcon className="w-3 h-3 shrink-0" />
                      <span className="truncate capitalize">{tx.method.replace(/_/g, " ")}</span>
                      {tx.fee > 0 && <span className="text-muted-foreground/50">· fee {tx.fee.toFixed(2)}</span>}
                    </div>
                  </div>

                  {/* Amount (green in / red out) + status badge */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div
                      className={`text-sm font-semibold tabular-nums ${
                        isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isPos ? "+" : "−"}
                      {tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <StatusBadge status={tx.status} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Split bill + federation banner */}
      <div className="px-5 mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-secondary">Smart split</div>
          <div className="font-display text-lg mt-1">Dinner at Myazu · 4 friends</div>
          <div className="text-xs text-muted-foreground">${countryInfo.currency} 92.50 each · AI-rounded</div>
          <div className="flex -space-x-2 mt-3 items-center">
            {["L", "O", "S", "K"].map((i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-gradient-mesh border-2 border-card flex items-center justify-center text-[10px]"
                style={{ color: "hsl(var(--cream))" }}
              >
                {i}
              </div>
            ))}
            <button
              onClick={() => toast.success("Split requests sent · 4 of 4 paid")}
              className="ms-3 text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground"
            >
              Request
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />
          <div className="text-[10px] uppercase tracking-widest text-secondary">Federation</div>
          <div className="font-display text-lg mt-1">Send to 47 countries</div>
          <div className="text-xs text-muted-foreground mt-1">Zero fees · Settles in seconds via Cirkle&apos;s global federation.</div>
        </div>
      </div>

      {/* Action sheet (Scan/Top-up/Vault) */}
      <Sheet open={!!action} onOpenChange={(v) => !v && setAction(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0">
          {action && (
            <>
              <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60">
                <SheetTitle className="font-display text-lg flex items-center gap-2">
                  {action === "Scan" && <ScanLine className="w-4 h-4 text-secondary" />}
                  {action === "Top-up" && <Plus className="w-4 h-4 text-secondary" />}
                  {action === "Vault" && <ShieldCheck className="w-4 h-4 text-secondary" />}
                  {action}
                </SheetTitle>
                <SheetDescription>Cirkle Pay · Federated</SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-3">
                {action === "Scan" && (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <ScanLine className="w-8 h-8 mx-auto text-secondary mb-2" />
                    <div className="text-sm font-medium">Point camera at QR</div>
                    <div className="text-[11px] text-muted-foreground mt-1">P2P merchant codes supported</div>
                    <button
                      onClick={() => { toast.success("Payment sent · SAR 45.00"); setAction(null); }}
                      className="mt-3 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs"
                    >
                      Simulate scan
                    </button>
                  </div>
                )}
                {action === "Top-up" && (
                  <div className="space-y-2">
                    {[100, 250, 500, 1000].map(a => `${countryInfo.currency} ${a}`).map((amt) => (
                      <button
                        key={amt}
                        onClick={() => { toast.success(`Topped up ${amt}`); setAction(null); }}
                        className="w-full rounded-xl bg-card border border-border p-3 flex items-center justify-between hover:bg-muted/40 transition"
                      >
                        <span className="text-sm font-medium">{amt}</span>
                        <span className="text-xs text-secondary">From STC Pay</span>
                      </button>
                    ))}
                  </div>
                )}
                {action === "Vault" && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-card border border-border p-3">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">In vault</div>
                      <div className="font-display text-2xl">${countryInfo.currency} 8,420.00</div>
                      <div className="text-[11px] text-muted-foreground">Encrypted · Time-locked 24h</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { toast.success("Moved to vault"); setAction(null); }}
                        className="py-2 rounded-full bg-primary text-primary-foreground text-xs"
                      >
                        Move to vault
                      </button>
                      <button
                        onClick={() => { toast.success("Withdrawn to balance"); setAction(null); }}
                        className="py-2 rounded-full glass text-xs"
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Send sheet */}
      <Sheet open={!!sendTo} onOpenChange={(v) => !v && setSendTo(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0">
          {sendTo && (
            <SendSheet
              name={sendTo}
              onClose={() => setSendTo(null)}
              currency={countryInfo.currency}
              balanceStr={balanceStr}
              balanceCurrency={balanceCurrency}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Transaction detail sheet */}
      <Sheet open={!!txSheet} onOpenChange={(v) => !v && setTxSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0">
          {txSheet && (
            <>
              <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60">
                <SheetTitle className="font-display text-lg">Transaction detail</SheetTitle>
                <SheetDescription>{txSheet.memo || txSheet.method.replace(/_/g, " ")}</SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-3">
                <div className="rounded-2xl bg-card border border-border p-4 text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${txSheet.direction === "in" ? "bg-secondary/20 text-secondary" : "bg-muted text-foreground"}`}>
                    {txSheet.direction === "in" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div className={`font-display text-2xl mt-2 ${txSheet.direction === "in" ? "text-secondary" : ""}`}>
                    {txSheet.direction === "in" ? "+" : "−"}{txSheet.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {txSheet.currency}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{txSheet.counterparty}</div>
                </div>
                <div className="rounded-xl bg-card border border-border p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{txSheet.timestamp ? new Date(txSheet.timestamp).toLocaleString() : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{txSheet.memo || txSheet.method.replace(/_/g, " ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-secondary capitalize">{txSheet.status}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>{txSheet.fee?.toFixed(2) || "0.00"} {txSheet.currency}</span></div>
                </div>
                <button
                  onClick={() => { toast.success("Receipt downloaded"); setTxSheet(null); }}
                  className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-xs"
                >
                  Download receipt
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SendSheet({
  name,
  onClose,
  currency = "USD",
  balanceStr = "—",
  balanceCurrency = "USD",
}: {
  name: string;
  onClose: () => void;
  currency?: string;
  balanceStr?: string;
  balanceCurrency?: string;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [pinEntered, setPinEntered] = useState(false);
  const [sending, setSending] = useState(false);

  const onPinChange = (v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 4);
    setPin(clean);
    setPinEntered(clean.length === 4);
  };

  const send = async () => {
    if (sending) return;
    const v = parseFloat(amount);
    if (!v || v <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!pinEntered) {
      toast.error("Enter 4-digit PIN to confirm");
      return;
    }

    setSending(true);
    const fetchPromise = fetch("/api/payments/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: v,
        currency,
        // The backend expects `counterparty` (or `to`) — we send both the
        // canonical field and the friendly `recipient` alias for clarity.
        recipient: name,
        counterparty: name,
        note,
        memo: note,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e?.error || `Request failed (${res.status})`);
      }
      return res.json();
    });

    toast.promise(fetchPromise, {
      loading: "Sending...",
      success: () => {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        return `Sent ${currency} ${v.toFixed(2)} to ${name}`;
      },
      error: (e: Error) => e.message || "Failed to send",
    });

    try {
      await fetchPromise;
      onClose();
    } catch {
      // Keep the sheet open on error so the user can retry.
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60">
        <SheetTitle className="font-display text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-mesh flex items-center justify-center text-primary-foreground text-xs">
            {name[0]}
          </div>
          Send to {name}
        </SheetTitle>
        <SheetDescription>Fee-free · Settles in seconds</SheetDescription>
      </SheetHeader>
      <div className="p-4 space-y-3">
        <div className="rounded-2xl bg-card border border-border p-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Amount (${currency})</div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            placeholder="0.00"
            className="font-display text-3xl w-full bg-transparent outline-none text-center mt-1"
          />
          <div className="text-[11px] text-muted-foreground mt-1">Balance: {balanceCurrency} {balanceStr}</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {["50", "100", "250", "500"].map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              className="py-2 rounded-full glass text-xs hover:bg-muted/60 transition"
            >
              {q}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          rows={2}
          className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none"
        />
        {/* PIN confirmation — demo: any 4 digits unlocks the send button. */}
        <div className="rounded-xl bg-card border border-border p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Confirm with 4-digit PIN
          </div>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => onPinChange(e.target.value)}
            maxLength={4}
            placeholder="••••"
            aria-label="4-digit PIN"
            className="w-full tracking-[0.5em] text-center font-display text-xl bg-transparent outline-none"
          />
          {pinEntered && (
            <div className="text-[10px] text-secondary text-center">PIN entered ✓</div>
          )}
        </div>
        <button
          onClick={send}
          disabled={sending}
          className="w-full py-2.5 rounded-full bg-gradient-hero text-cream text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending..." : <>Send ${currency} {amount || "0.00"}</>}
        </button>
      </div>
    </>
  );
}
