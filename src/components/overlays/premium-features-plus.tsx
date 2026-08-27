// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, Sparkles, Crown, Gift, Users, Zap, Bot, Mic, BookOpen,
  Check, Clock, Star, ChevronRight, Send, Copy, UserPlus, Heart, Zap as ZapIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Entitlement {
  userId: string;
  isPremium: boolean;
  hasActiveTrial: boolean;
  isInFamilyPlan: boolean;
  familyRole: "owner" | "member" | null;
  familyPlanId: string | null;
  totalAccessDaysLeft: number;
  entitlementSource: "subscription" | "trial" | "family" | "gift" | "none";
}

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  emoji: string;
  premiumOnly: boolean;
}

interface GiftRecord {
  id: string;
  senderId: string;
  recipientId: string;
  months: number;
  amountPaid: number;
  currency: string;
  message: string;
  status: "pending" | "redeemed" | "expired";
  code: string;
  createdAt: string;
}

interface FamilyPlan {
  id: string;
  ownerId: string;
  memberIds: string[];
  plan: "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  startedAt: string;
  expiresAt: string | null;
  inviteCode: string;
}

interface FamilyPlanPricing {
  monthly: number;
  yearly: number;
  maxMembers: number;
  savingsVsIndividual: number;
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const FEATURES_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  advanced_summarization: BookOpen,
  meeting_notes: BookOpen,
  ai_assistant_in_chat: Bot,
  voice_cloning: Mic,
  priority_ai: Zap,
  basic_qa: Sparkles,
};

export function PremiumFeaturesPlus({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";

  const [tab, setTab] = useState<"overview" | "trial" | "gift" | "family">("overview");
  const [loading, setLoading] = useState(false);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [familyPricing, setFamilyPricing] = useState<FamilyPlanPricing | null>(null);
  const [gifts, setGifts] = useState<GiftRecord[]>([]);
  const [family, setFamily] = useState<FamilyPlan | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [converting, setConverting] = useState(false);

  // Gift form
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftMonths, setGiftMonths] = useState(3);
  const [giftMessage, setGiftMessage] = useState("");
  const [purchasingGift, setPurchasingGift] = useState(false);

  // Family form
  const [familyPlan, setFamilyPlan] = useState<"monthly" | "yearly">("monthly");
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joiningFamily, setJoiningFamily] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!userId) {
      // Still fetch the feature catalog + pricing for the upsell
      const prRes = await fetchWithTimeout("/api/premium/status-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", userId: "__catalog_only__" }),
      }).catch(() => null);
      if (prRes && prRes.ok) {
        const data = await prRes.json();
        // Don't actually subscribe — but the route would error
      }
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/premium/status-plus?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        setEntitlement(data.entitlement ?? null);
        setFeatures(data.features ?? []);
        setFamilyPricing(data.familyPlanPricing ?? null);
      }
      const gRes = await fetchWithTimeout(
        `/api/premium/status-plus?userId=${encodeURIComponent(userId)}&gifts=1`,
        { cache: "no-store" },
      );
      if (gRes.ok) setGifts((await gRes.json()).gifts ?? []);
      const fRes = await fetchWithTimeout(
        `/api/premium/status-plus?userId=${encodeURIComponent(userId)}&family=1`,
        { cache: "no-store" },
      );
      if (fRes.ok) setFamily((await fRes.json()).family ?? null);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    if (!userId) {
      toast.error("Sign in to subscribe");
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetchWithTimeout("/api/premium/status-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", userId, plan }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "subscribe failed");
      }
      toast.success(`Subscribed (${plan})`);
      await fetchAll();
      window.dispatchEvent(new CustomEvent("circle:premium-features-plus", {
        detail: { action: "subscribe", plan },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubscribing(false);
    }
  };

  const handleStartTrial = async () => {
    if (!userId) {
      toast.error("Sign in to start trial");
      return;
    }
    setStartingTrial(true);
    try {
      const res = await fetchWithTimeout("/api/premium/status-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "startTrial", userId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "trial start failed");
      }
      toast.success("7-day trial started — no card required");
      await fetchAll();
      setTab("overview");
      window.dispatchEvent(new CustomEvent("circle:premium-features-plus", {
        detail: { action: "startTrial", userId },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStartingTrial(false);
    }
  };

  const handleConvertTrial = async (plan: "monthly" | "yearly") => {
    if (!userId) return;
    setConverting(true);
    try {
      const res = await fetchWithTimeout("/api/premium/status-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "convertTrial", userId, plan }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "convert failed");
      }
      toast.success(`Trial converted to ${plan} subscription`);
      await fetchAll();
      window.dispatchEvent(new CustomEvent("circle:premium-features-plus", {
        detail: { action: "convertTrial", plan },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConverting(false);
    }
  };

  const handlePurchaseGift = async () => {
    if (!userId) {
      toast.error("Sign in to send a gift");
      return;
    }
    if (!giftRecipient.trim() || giftRecipient === userId) {
      toast.error("Enter a valid recipient username");
      return;
    }
    setPurchasingGift(true);
    try {
      const res = await fetchWithTimeout("/api/premium/status-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "purchaseGift",
          senderId: userId,
          recipientId: giftRecipient.trim(),
          months: giftMonths,
          message: giftMessage,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "gift purchase failed");
      }
      const data = await res.json();
      toast.success(`Gift sent — code ${data.gift.code}`);
      setGiftRecipient("");
      setGiftMessage("");
      await fetchAll();
      window.dispatchEvent(new CustomEvent("circle:premium-features-plus", {
        detail: { action: "purchaseGift", recipientId: giftRecipient.trim(), months: giftMonths },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPurchasingGift(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!userId) {
      toast.error("Sign in to create a family plan");
      return;
    }
    setCreatingFamily(true);
    try {
      const res = await fetchWithTimeout("/api/premium/status-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createFamily", ownerId: userId, plan: familyPlan, months: 1 }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "family create failed");
      }
      toast.success("Family plan created");
      await fetchAll();
      window.dispatchEvent(new CustomEvent("circle:premium-features-plus", {
        detail: { action: "createFamily", plan: familyPlan },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreatingFamily(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!userId || !joinCode.trim()) return;
    setJoiningFamily(true);
    try {
      const res = await fetchWithTimeout("/api/premium/status-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "joinFamily", inviteCode: joinCode.trim(), userId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "join failed");
      }
      toast.success("Joined family plan");
      setJoinCode("");
      await fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setJoiningFamily(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => toast.success("Code copied"),
      () => toast.error("Copy failed"),
    );
  };

  const hasAccess =
    entitlement?.isPremium ||
    entitlement?.hasActiveTrial ||
    entitlement?.isInFamilyPlan;

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-3xl" ariaLabel="Premium AI Features — Plus">
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center ring-1 ring-amber-500/30">
              <Crown className="size-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                Cirkle Premium <Sparkles className="size-4 text-amber-500" />
              </h2>
              <p className="text-xs text-muted-foreground">
                {hasAccess
                  ? `Active · ${entitlement?.totalAccessDaysLeft ?? 0} days left`
                  : "Unlock advanced AI features — $3/mo"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        <nav className="flex items-center gap-1 px-4 py-2 border-b border-border/40 overflow-x-auto" aria-label="Sections">
          {(["overview", "trial", "gift", "family"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5",
                tab === t
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
              aria-pressed={tab === t}
            >
              {t === "overview" && <><ZapIcon className="size-3" /> Overview</>}
              {t === "trial" && <><Clock className="size-3" /> Free Trial</>}
              {t === "gift" && <><Gift className="size-3" /> Gift</>}
              {t === "family" && <><Users className="size-3" /> Family</>}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2 className="size-5 animate-spin text-emerald-500" />
            </div>
          )}

          {!loading && tab === "overview" && (
            <>
              <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-card to-emerald-500/5 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="size-5 text-amber-500" />
                    <span className="font-display text-xl font-bold">Premium Plan</span>
                  </div>
                  {hasAccess && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 capitalize">
                      {entitlement?.entitlementSource}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="font-display text-2xl font-bold">$3</p>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                  <div className="rounded-xl bg-card/60 p-3 relative">
                    <Badge className="absolute -top-2 -right-2 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                      Save 17%
                    </Badge>
                    <p className="text-xs text-muted-foreground">Yearly</p>
                    <p className="font-display text-2xl font-bold">$30</p>
                    <p className="text-xs text-muted-foreground">per year</p>
                  </div>
                </div>
                {!hasAccess && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button onClick={() => handleSubscribe("monthly")} disabled={subscribing} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                      {subscribing ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
                      Subscribe Monthly
                    </Button>
                    <Button onClick={() => handleSubscribe("yearly")} disabled={subscribing} variant="outline">
                      <Crown className="size-4" />
                      Subscribe Yearly
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-3 block">Included features</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {features.map((f) => {
                    const Icon = FEATURES_ICONS[f.id] ?? Sparkles;
                    return (
                      <div key={f.id} className="rounded-xl border border-border/60 bg-card/40 p-3 flex items-start gap-3">
                        <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0",
                          f.premiumOnly ? "bg-amber-500/10 text-amber-600" : "bg-muted/40 text-muted-foreground")}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm flex items-center gap-1.5">
                            {f.name}
                            {f.premiumOnly && <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-[10px]">Premium</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!loading && tab === "trial" && (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-5 text-emerald-500" />
                  <h3 className="font-display text-lg font-semibold">7-Day Free Trial</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get full premium access for 7 days — no credit card required. Cancel anytime.
                </p>
                {!entitlement?.hasActiveTrial ? (
                  <Button
                    onClick={handleStartTrial}
                    disabled={startingTrial || !userId}
                    className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {startingTrial ? <Loader2 className="size-4 animate-spin" /> : <ZapIcon className="size-4" />}
                    {userId ? "Start Free Trial" : "Sign in to start"}
                  </Button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm">
                      <p className="font-medium text-emerald-700 dark:text-emerald-400">Trial active</p>
                      <p className="text-xs">{entitlement?.totalAccessDaysLeft} days remaining</p>
                    </div>
                    <p className="text-sm font-medium">Convert to a paid plan to keep your access:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleConvertTrial("monthly")} disabled={converting} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                        {converting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Monthly $3
                      </Button>
                      <Button onClick={() => handleConvertTrial("yearly")} disabled={converting} variant="outline">
                        <Check className="size-4" />
                        Yearly $30
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && tab === "gift" && (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="size-5 text-rose-500" />
                  <h3 className="font-display text-lg font-semibold">Gift Premium</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Send premium months to a friend — only $2.50/month.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="gift-recipient">Recipient username</Label>
                    <Input
                      id="gift-recipient"
                      value={giftRecipient}
                      onChange={(e) => setGiftRecipient(e.target.value)}
                      placeholder="e.g. yousef"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gift-months">Months</Label>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {[1, 3, 6, 12].map((m) => (
                        <button
                          key={m}
                          onClick={() => setGiftMonths(m)}
                          className={cn(
                            "px-3 py-2 text-sm font-medium rounded-md border transition-colors",
                            giftMonths === m
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                              : "border-border text-muted-foreground hover:bg-muted/40",
                          )}
                          aria-pressed={giftMonths === m}
                        >
                          {m}mo
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="gift-message">Personal message (optional)</Label>
                    <Textarea
                      id="gift-message"
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder="Happy birthday!"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-display text-lg font-bold text-emerald-600">
                      {fmtMoney(giftMonths * 2.5)}
                    </span>
                  </div>
                  <Button
                    onClick={handlePurchaseGift}
                    disabled={purchasingGift || !giftRecipient.trim()}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {purchasingGift ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Send Gift
                  </Button>
                </div>
              </div>

              {gifts.length > 0 && (
                <div>
                  <Label className="mb-2 block">Your gifts</Label>
                  <div className="space-y-2">
                    {gifts.map((g) => (
                      <div key={g.id} className="rounded-xl border border-border/60 bg-card/40 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {g.senderId === userId ? "To" : "From"}{" "}
                            @{g.senderId === userId ? g.recipientId : g.senderId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {g.months} months · {fmtMoney(g.amountPaid)}
                          </p>
                          {g.message && <p className="text-xs italic mt-1">"{g.message}"</p>}
                        </div>
                        <div className="text-right">
                          {g.status === "pending" && g.recipientId === userId && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-600 mb-1">
                              Redeem code: {g.code}
                            </Badge>
                          )}
                          <Badge
                            className={cn(
                              "capitalize",
                              g.status === "redeemed" && "bg-emerald-500/15 text-emerald-600",
                              g.status === "pending" && "bg-amber-500/15 text-amber-600",
                              g.status === "expired" && "bg-rose-500/15 text-rose-600",
                            )}
                          >
                            {g.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && tab === "family" && (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="size-5 text-emerald-500" />
                    <h3 className="font-display text-lg font-semibold">Family Plan</h3>
                  </div>
                  {familyPricing && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                      Save {Math.round(familyPricing.savingsVsIndividual)}%
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Premium for up to {familyPricing?.maxMembers ?? 5} family members — one bill.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="font-display text-2xl font-bold">${familyPricing?.monthly ?? 8}</p>
                  </div>
                  <div className="rounded-xl bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">Yearly</p>
                    <p className="font-display text-2xl font-bold">${familyPricing?.yearly ?? 80}</p>
                  </div>
                </div>

                {!family ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => setFamilyPlan("monthly")}
                        className={cn("px-3 py-2 text-sm font-medium rounded-md border",
                          familyPlan === "monthly" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border")}
                        aria-pressed={familyPlan === "monthly"}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setFamilyPlan("yearly")}
                        className={cn("px-3 py-2 text-sm font-medium rounded-md border",
                          familyPlan === "yearly" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border")}
                        aria-pressed={familyPlan === "yearly"}
                      >
                        Yearly
                      </button>
                    </div>
                    <Button onClick={handleCreateFamily} disabled={creatingFamily || !userId} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                      {creatingFamily ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                      Create Family Plan
                    </Button>

                    <div className="mt-4 pt-4 border-t border-border/40">
                      <Label htmlFor="join-code">Have an invite code?</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="join-code"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value)}
                          placeholder="FAM-XXX-XXXX"
                        />
                        <Button onClick={handleJoinFamily} disabled={joiningFamily || !joinCode.trim()} variant="outline">
                          {joiningFamily ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
                          Join
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                      <p className="font-medium text-emerald-700 dark:text-emerald-400">
                        You're a {family.ownerId === userId ? "owner" : "member"} of this family plan
                      </p>
                      <p className="text-xs mt-1">
                        {family.memberIds.length + 1}/{familyPricing?.maxMembers ?? 5} members ·
                        Plan: {family.plan}
                      </p>
                    </div>
                    <div className="rounded-xl bg-card/60 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Invite code</p>
                        <p className="font-mono text-sm font-semibold">{family.inviteCode}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => copyCode(family.inviteCode)}>
                        <Copy className="size-3.5" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}
