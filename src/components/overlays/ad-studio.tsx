"use client";

/**
 * Ad Studio — Blueprint §7.3.1, §30.
 *
 * Cirkle's only revenue model: non-targeted local ads paid via corporate
 * invoice. This is the advertiser portal where businesses:
 *
 *   1. View their campaign list (with impressions / clicks / spent / CTR).
 *   2. Create new CPM campaigns (country / city / category targeting).
 *   3. Generate invoices for settled spend (paid via corporate bank transfer).
 *   4. See aggregate analytics (total spend, impressions, clicks, CTR).
 *
 * Open via the `circle:ad-studio` event (registered in page.tsx +
 * overlay-registry.ts).
 *
 * Privacy posture (§30.4): the ONLY targeting axes are country + city +
 * content category. No user profiling, no cookies, no behavioural tracking.
 * The privacy note in the header makes this explicit to advertisers.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Megaphone,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Eye,
  Plus,
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle,
  Calendar,
  MapPin,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// NO indigo, NO blue. All accent colors map to the brand tokens.
// ─────────────────────────────────────────────────────────────────────────────

type TabView = "campaigns" | "create" | "invoices" | "analytics";
const TABS: { id: TabView; label: string; icon: LucideIcon }[] = [
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "create", label: "New Campaign", icon: Plus },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
];

const AD_CATEGORIES = ["news", "sports", "tech", "education", "retail", "food", "travel"] as const;
const AD_CURRENCIES = ["USD", "SAR", "AED", "EGP", "EUR", "GBP"] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  news: "📰",
  sports: "⚽",
  tech: "💻",
  education: "🎓",
  retail: "🛍️",
  food: "🍽️",
  travel: "✈️",
};

interface AdCampaign {
  id: string;
  advertiser: string;
  title: string;
  body: string;
  cta: string;
  url: string;
  targetCountry: string;
  targetCity: string | null;
  category: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  cpm: number;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
}

interface AdvertiserStats {
  impressions: number;
  clicks: number;
  spent: number;
  ctr: number;
  budget: number;
  remaining: number;
  campaigns: number;
}

interface AdInvoice {
  id: string;
  advertiser: string;
  amount: number;
  currency: string;
  status: string;
  campaigns: string[];
  createdAt: string;
  paidAt: string | null;
}

interface CampaignsPayload {
  campaigns: AdCampaign[];
  stats: AdvertiserStats;
}

interface InvoicesPayload {
  invoices: AdInvoice[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat("en").format(n);
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

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "paused":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "exhausted":
      return "bg-secondary/15 text-secondary border-secondary/40";
    case "ended":
      return "bg-muted text-muted-foreground border-border";
    case "paid":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "overdue":
      return "bg-accent/15 text-accent border-accent/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function ctr(impressions: number, clicks: number): string {
  if (impressions <= 0) return "0.00%";
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
}

function pctSpent(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(100, Math.max(0, (spent / budget) * 100));
}

function toInputDate(iso: string): string {
  // yyyy-MM-dd for <input type="date">
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function AdStudio({ open, onClose }: Props) {
  const { user } = useAuth();
  // Advertiser identity defaults to the logged-in user's username; if
  // they're not signed in, fall back to "guest-advertiser" so the portal
  // still renders demo data without throwing.
  const advertiser = user?.username || "guest-advertiser";

  const [tab, setTab] = useState<TabView>("campaigns");
  const [data, setData] = useState<CampaignsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<AdInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Create-campaign form state
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "",
    body: "",
    cta: "Learn more",
    url: "https://",
    targetCountry: "EG",
    targetCity: "",
    category: "retail" as (typeof AD_CATEGORIES)[number],
    budget: "500",
    cpm: "2.50",
    startDate: today,
    endDate: in30,
    currency: "USD" as (typeof AD_CURRENCIES)[number],
  });
  const [saving, setSaving] = useState(false);

  // ── Loaders ───────────────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ads/campaigns?advertiser=${encodeURIComponent(advertiser)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed to load campaigns");
      const payload = (await res.json()) as CampaignsPayload;
      setData(payload);
    } catch (err) {
      toast.error("Couldn't load campaigns", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [advertiser]);

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const res = await fetch(`/api/ads/invoice?advertiser=${encodeURIComponent(advertiser)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed to load invoices");
      const payload = (await res.json()) as InvoicesPayload;
      setInvoices(payload.invoices);
    } catch (err) {
      toast.error("Couldn't load invoices", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setInvoicesLoading(false);
    }
  }, [advertiser]);

  useEffect(() => {
    if (!open) return;
    loadCampaigns();
    loadInvoices();
  }, [open, loadCampaigns, loadInvoices]);

  // ── Create campaign ───────────────────────────────────────────────────
  const createCampaign = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advertiser,
          title: form.title.trim(),
          body: form.body.trim(),
          cta: form.cta.trim(),
          url: form.url.trim(),
          targetCountry: form.targetCountry.toUpperCase().trim(),
          targetCity: form.targetCity.trim() || null,
          category: form.category,
          budget: Number(form.budget),
          cpm: Number(form.cpm),
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "failed to create campaign");
      }
      toast.success("Campaign launched", {
        description: `${form.title.trim()} is now serving in ${form.targetCountry.toUpperCase()}.`,
      });
      // Reset form
      setForm((f) => ({
        ...f,
        title: "",
        body: "",
        cta: "Learn more",
        url: "https://",
        targetCity: "",
      }));
      setTab("campaigns");
      loadCampaigns();
    } catch (err) {
      toast.error("Couldn't create campaign", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }, [advertiser, form, loadCampaigns]);

  // ── Generate invoice (covers all current campaigns) ───────────────────
  const generateInvoice = useCallback(async () => {
    if (!data || data.campaigns.length === 0) {
      toast.error("No campaigns to invoice");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ads/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advertiser,
          campaignIds: data.campaigns.map((c) => c.id),
          currency: form.currency,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "failed to generate invoice");
      }
      toast.success("Invoice generated", {
        description: "An admin will mark it paid once the bank transfer settles.",
      });
      loadInvoices();
    } catch (err) {
      toast.error("Couldn't generate invoice", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }, [advertiser, data, form.currency, loadInvoices]);

  const totalSpend = data?.stats.spent ?? 0;
  const totalImpressions = data?.stats.impressions ?? 0;
  const totalClicks = data?.stats.clicks ?? 0;
  const totalCtr = data?.stats.ctr ?? 0;

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Ad Studio — non-targeted local ads. Advertiser portal, CPM campaigns, invoice billing."
    >
      {/* Aurora background — brand palette only */}
      <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background"
        aria-hidden
      />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/40 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight flex items-center gap-2">
              Ad Studio
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-secondary/15 text-secondary border-secondary/40">
                Local · Non-targeted
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {advertiser} · CPM campaigns · Corporate invoice billing · No user profiling
            </p>
          </div>
          <button
            onClick={() => {
              loadCampaigns();
              loadInvoices();
            }}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0 disabled:opacity-50"
            aria-label="Refresh"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto mt-3 flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60 w-fit">
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
      <div className="relative max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 pb-32 overflow-y-auto z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "campaigns" && (
              <CampaignsTab
                loading={loading}
                data={data}
                onCreate={() => setTab("create")}
                currency={form.currency}
              />
            )}

            {tab === "create" && (
              <CreateCampaignTab
                form={form}
                setForm={setForm}
                saving={saving}
                onSave={createCampaign}
              />
            )}

            {tab === "invoices" && (
              <InvoicesTab
                loading={invoicesLoading}
                invoices={invoices}
                onGenerate={generateInvoice}
                canGenerate={(data?.campaigns.length ?? 0) > 0}
                saving={saving}
              />
            )}

            {tab === "analytics" && (
              <AnalyticsTab
                loading={loading}
                totalSpend={totalSpend}
                totalImpressions={totalImpressions}
                totalClicks={totalClicks}
                totalCtr={totalCtr}
                campaigns={data?.campaigns ?? []}
                budget={data?.stats.budget ?? 0}
                currency={form.currency}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns tab
// ─────────────────────────────────────────────────────────────────────────────

function CampaignsTab({
  loading,
  data,
  onCreate,
  currency,
}: {
  loading: boolean;
  data: CampaignsPayload | null;
  onCreate: () => void;
  currency: string;
}) {
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        <p className="text-xs">Loading campaigns…</p>
      </div>
    );
  }
  if (!data || data.campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="w-6 h-6 text-secondary" />
        <p className="text-xs">No campaigns yet.</p>
        <button
          onClick={onCreate}
          className="text-xs px-4 py-2 rounded-full bg-gradient-hero text-cream shadow-soft hover:opacity-90 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Launch your first ad
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {/* Quick stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatChip icon={Eye} label="Impressions" value={fmtNumber(data.stats.impressions)} />
        <StatChip icon={MousePointerClick} label="Clicks" value={fmtNumber(data.stats.clicks)} />
        <StatChip
          icon={DollarSign}
          label="Spent"
          value={fmt(data.stats.spent, currency)}
        />
        <StatChip icon={TrendingUp} label="CTR" value={ctr(data.stats.impressions, data.stats.clicks)} />
      </div>

      {data.campaigns.map((c) => {
        const spentPct = pctSpent(c.spent, c.budget);
        return (
          <article
            key={c.id}
            className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 shadow-soft"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary/15 border border-secondary/30 flex items-center justify-center shrink-0 text-lg">
                {CATEGORY_EMOJI[c.category] || "📣"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-semibold leading-tight truncate">
                      {c.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {c.body}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                      statusColor(c.status),
                    )}
                  >
                    {c.status}
                  </span>
                </div>

                {/* Targeting */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60">
                    <MapPin className="w-3 h-3" />
                    {c.targetCountry}
                    {c.targetCity ? ` · ${c.targetCity}` : " · nationwide"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60">
                    <Tag className="w-3 h-3" />
                    {c.category}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60">
                    <Calendar className="w-3 h-3" />
                    {new Date(c.startDate).toLocaleDateString()} →{" "}
                    {new Date(c.endDate).toLocaleDateString()}
                  </span>
                </div>

                {/* Budget bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">
                      {fmt(c.spent, currency)} / {fmt(c.budget, currency)} spent
                    </span>
                    <span className="text-muted-foreground">{spentPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-secondary to-accent"
                      style={{ width: `${spentPct}%` }}
                    />
                  </div>
                </div>

                {/* Bottom stats */}
                <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <div className="text-muted-foreground">Impressions</div>
                    <div className="font-medium">{fmtNumber(c.impressions)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Clicks</div>
                    <div className="font-medium">{fmtNumber(c.clicks)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">CTR</div>
                    <div className="font-medium">{ctr(c.impressions, c.clicks)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">CPM</div>
                    <div className="font-medium">{fmt(c.cpm, currency)}</div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create campaign tab
// ─────────────────────────────────────────────────────────────────────────────

function CreateCampaignTab({
  form,
  setForm,
  saving,
  onSave,
}: {
  form: {
    title: string;
    body: string;
    cta: string;
    url: string;
    targetCountry: string;
    targetCity: string;
    category: (typeof AD_CATEGORIES)[number];
    budget: string;
    cpm: string;
    startDate: string;
    endDate: string;
    currency: (typeof AD_CURRENCIES)[number];
  };
  setForm: React.Dispatch<React.SetStateAction<{
    title: string;
    body: string;
    cta: string;
    url: string;
    targetCountry: string;
    targetCity: string;
    category: (typeof AD_CATEGORIES)[number];
    budget: string;
    cpm: string;
    startDate: string;
    endDate: string;
    currency: (typeof AD_CURRENCIES)[number];
  }>>;
  saving: boolean;
  onSave: () => void;
}) {
  const canSave =
    form.title.trim().length > 0 &&
    form.body.trim().length > 0 &&
    /^https?:\/\//i.test(form.url) &&
    form.targetCountry.length >= 2 &&
    Number(form.budget) > 0 &&
    Number(form.cpm) >= 0 &&
    new Date(form.endDate) > new Date(form.startDate);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-3 text-[11px] text-muted-foreground">
        <strong className="text-secondary">Privacy-first targeting.</strong> Cirkle ads
        match only on country + city + content category. There is no user
        profiling, no cookies, no behavioural retargeting. Your CPM budget is
        spent on local context, not personal data.
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 space-y-4">
        {/* Title */}
        <Field label="Ad title" hint="Max 140 chars">
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={140}
            placeholder="Spring sale at Downtown Books"
          />
        </Field>

        {/* Body */}
        <Field label="Ad body" hint="Max 600 chars">
          <Textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            maxLength={600}
            rows={3}
            placeholder="20% off all Arabic literature this week. Visit our Cairo branch or order online."
          />
        </Field>

        {/* CTA + URL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="CTA button">
            <Input
              value={form.cta}
              onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))}
              maxLength={32}
              placeholder="Shop now"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Landing URL">
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com/spring-sale"
                type="url"
              />
            </Field>
          </div>
        </div>

        {/* Targeting */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Country (ISO 2)">
            <Input
              value={form.targetCountry}
              onChange={(e) =>
                setForm((f) => ({ ...f, targetCountry: e.target.value.toUpperCase().slice(0, 3) }))
              }
              placeholder="EG"
              maxLength={3}
            />
          </Field>
          <Field label="City (optional)" hint="Leave blank for nationwide">
            <Input
              value={form.targetCity}
              onChange={(e) => setForm((f) => ({ ...f, targetCity: e.target.value }))}
              placeholder="Cairo"
              maxLength={64}
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as (typeof AD_CATEGORIES)[number],
                }))
              }
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {AD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_EMOJI[c]} {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Budget + CPM + currency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Budget" hint="Total spend cap">
            <Input
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              type="number"
              min="1"
              step="1"
              placeholder="500"
            />
          </Field>
          <Field label="CPM" hint="Cost per 1,000 impressions">
            <Input
              value={form.cpm}
              onChange={(e) => setForm((f) => ({ ...f, cpm: e.target.value }))}
              type="number"
              min="0"
              step="0.01"
              placeholder="2.50"
            />
          </Field>
          <Field label="Invoice currency">
            <select
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currency: e.target.value as (typeof AD_CURRENCIES)[number],
                }))
              }
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {AD_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <Input
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              type="date"
            />
          </Field>
          <Field label="End date">
            <Input
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              type="date"
            />
          </Field>
        </div>

        {/* Live preview */}
        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Live preview
          </div>
          <AdPreview campaign={form} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onSave}
            disabled={!canSave || saving}
            className="px-4 py-2 rounded-full bg-gradient-hero text-cream shadow-soft hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Launch campaign
          </button>
        </div>
      </div>
    </div>
  );
}

function AdPreview({
  campaign,
}: {
  campaign: {
    title: string;
    body: string;
    cta: string;
    url: string;
    category: string;
    targetCountry: string;
    targetCity: string;
  };
}) {
  return (
    <div className="rounded-lg border border-secondary/40 bg-gradient-to-br from-secondary/10 to-accent/5 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{CATEGORY_EMOJI[campaign.category] || "📣"}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Sponsored · {campaign.targetCountry}
          {campaign.targetCity ? ` · ${campaign.targetCity}` : ""}
        </span>
      </div>
      <div className="font-medium text-sm">
        {campaign.title || "Your ad title appears here"}
      </div>
      <div className="text-[12px] text-muted-foreground mt-0.5">
        {campaign.body || "Your ad body copy appears here. Make it local, make it useful."}
      </div>
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-[11px] font-medium"
        tabIndex={-1}
      >
        {campaign.cta || "Learn more"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoices tab
// ─────────────────────────────────────────────────────────────────────────────

function InvoicesTab({
  loading,
  invoices,
  onGenerate,
  canGenerate,
  saving,
}: {
  loading: boolean;
  invoices: AdInvoice[];
  onGenerate: () => void;
  canGenerate: boolean;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-semibold">Generate corporate invoice</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Settle spend across all your campaigns with a single bank-transfer
              invoice. An admin marks it paid once the transfer lands.
            </p>
          </div>
          <button
            onClick={onGenerate}
            disabled={!canGenerate || saving}
            className="shrink-0 px-3 py-1.5 rounded-full bg-gradient-hero text-cream shadow-soft hover:opacity-90 disabled:opacity-40 text-xs font-medium flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Generate invoice
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-secondary" />
          <p className="text-xs">Loading invoices…</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <FileText className="w-6 h-6 text-secondary" />
          <p className="text-xs">No invoices yet. Generate one to bill your spend.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <article
              key={inv.id}
              className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{inv.id.slice(-8).toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                      statusColor(inv.status),
                    )}
                  >
                    {inv.status}
                  </span>
                </div>
                <div className="font-display text-base font-semibold mt-1">
                  {fmt(inv.amount, inv.currency)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {inv.campaigns.length} campaign{inv.campaigns.length === 1 ? "" : "s"} ·{" "}
                  created {timeAgo(inv.createdAt)}
                  {inv.paidAt ? ` · paid ${timeAgo(inv.paidAt)}` : ""}
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(inv.id).catch(() => {});
                  toast.success("Invoice ID copied");
                }}
                className="shrink-0 px-2 py-1 rounded-md text-[11px] bg-muted hover:bg-muted/70"
              >
                Copy ID
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics tab
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsTab({
  loading,
  totalSpend,
  totalImpressions,
  totalClicks,
  totalCtr,
  campaigns,
  budget,
  currency,
}: {
  loading: boolean;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalCtr: number;
  campaigns: AdCampaign[];
  budget: number;
  currency: string;
}) {
  // Per-category breakdown for the simple bar chart.
  const byCategory = useMemo(() => {
    const map = new Map<string, { impressions: number; clicks: number; spent: number }>();
    for (const c of campaigns) {
      const cur = map.get(c.category) || { impressions: 0, clicks: 0, spent: 0 };
      cur.impressions += c.impressions;
      cur.clicks += c.clicks;
      cur.spent += c.spent;
      map.set(c.category, cur);
    }
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.spent - a.spent);
  }, [campaigns]);

  const maxSpend = byCategory.length > 0 ? Math.max(...byCategory.map((c) => c.spent), 1) : 1;

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        <p className="text-xs">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <BigStat
          icon={DollarSign}
          label="Total spend"
          value={fmt(totalSpend, currency)}
          sub={`of ${fmt(budget, currency)} budget`}
        />
        <BigStat
          icon={Eye}
          label="Impressions"
          value={fmtNumber(totalImpressions)}
          sub={`${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`}
        />
        <BigStat
          icon={MousePointerClick}
          label="Clicks"
          value={fmtNumber(totalClicks)}
          sub={`CTR ${(totalCtr * 100).toFixed(2)}%`}
        />
        <BigStat
          icon={TrendingUp}
          label="Avg CPM"
          value={
            totalImpressions > 0
              ? fmt((totalSpend / totalImpressions) * 1000, currency)
              : fmt(0, currency)
          }
          sub="Effective rate"
        />
      </div>

      {/* Category breakdown */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4">
        <h3 className="font-display text-sm font-semibold mb-3">Spend by category</h3>
        {byCategory.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No spend yet — launch a campaign to see analytics.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {byCategory.map((row) => {
              const widthPct = (row.spent / maxSpend) * 100;
              return (
                <div key={row.category} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium">
                      {CATEGORY_EMOJI[row.category]} {row.category}
                    </span>
                    <span className="text-muted-foreground">{fmt(row.spent, currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-secondary to-accent"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{fmtNumber(row.impressions)} impressions</span>
                    <span>
                      {fmtNumber(row.clicks)} clicks · CTR{" "}
                      {ctr(row.impressions, row.clicks)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Privacy note */}
      <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-3 text-[11px] text-muted-foreground">
        <strong className="text-secondary">Why no demographic breakdown?</strong> Cirkle
        ads are non-targeted by design. We don&apos;t track user age, gender,
        interests, or browsing history — so we can&apos;t (and won&apos;t) report
        on it. You pay for local context, not personal data.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI primitives
// ─────────────────────────────────────────────────────────────────────────────

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="font-display text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function BigStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="font-display text-lg font-bold mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
