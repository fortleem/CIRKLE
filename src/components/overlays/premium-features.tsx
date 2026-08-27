// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, Loader2, Check, Zap, Bot, Mic, BookOpen, MessageSquare,
  Crown,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  emoji: string;
  premiumOnly: boolean;
}

interface PremiumStatus {
  isPremium: boolean;
  subscription: {
    id: string;
    plan: "monthly" | "yearly";
    price: number;
    currency: string;
    status: string;
    startedAt: string;
    expiresAt: string | null;
  } | null;
  features: PremiumFeature[];
  priceMonthly: number;
  priceYearly: number;
}

const FEATURE_ICONS: Record<string, any> = {
  advanced_summarization: BookOpen,
  meeting_notes: MessageSquare,
  ai_assistant_in_chat: Bot,
  voice_cloning: Mic,
  priority_ai: Zap,
  basic_qa: Sparkles,
};

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function PremiumFeatures({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState<"monthly" | "yearly" | null>(null);
  const [canceling, setCanceling] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/premium/status?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) fetchStatus();
  }, [open, fetchStatus]);

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    if (!userId) {
      toast.error("Sign in to subscribe");
      return;
    }
    setSubscribing(plan);
    try {
      const res = await fetchWithTimeout("/api/premium/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "subscribe", plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");
      toast.success("Premium activated", {
        description: `${plan === "yearly" ? "Yearly" : "Monthly"} plan · $${plan === "yearly" ? 30 : 3}`,
      });
      window.dispatchEvent(new CustomEvent("circle:premium-features"));
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!userId) return;
    setCanceling(true);
    try {
      const res = await fetchWithTimeout("/api/premium/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      toast.success("Premium cancelled");
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCanceling(false);
    }
  };

  const isPremium = status?.isPremium === true;
  const features = status?.features ?? [];
  const premiumFeatures = features.filter((f) => f.premiumOnly);
  const freeFeatures = features.filter((f) => !f.premiumOnly);

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Premium AI features — upgrade to unlock">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Cirkle Premium AI</h2>
              <p className="text-xs text-muted-foreground">Advanced Summarization · Meeting Notes · Voice Cloning · Priority AI</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground" aria-live="polite">
              <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Loading…
            </div>
          ) : (
            <>
              {/* Status banner */}
              <div
                className={cn(
                  "glass backdrop-blur-xl border rounded-xl p-4 flex items-center gap-3",
                  isPremium
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5",
                )}
                role="status"
                aria-live="polite"
              >
                {isPremium ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Premium active</p>
                      <p className="text-xs text-muted-foreground">
                        {status?.subscription?.plan === "yearly" ? "Yearly" : "Monthly"} · expires{" "}
                        {status?.subscription?.expiresAt
                          ? new Date(status.subscription.expiresAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <Button onClick={handleCancel} variant="ghost" size="sm" disabled={canceling}>
                      {canceling ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : "Cancel"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 text-amber-500 shrink-0" aria-hidden />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Free plan</p>
                      <p className="text-xs text-muted-foreground">Unlock 5 advanced AI features for $3/month</p>
                    </div>
                  </>
                )}
              </div>

              {/* Premium features grid */}
              <section aria-label="Premium features" className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" aria-hidden /> Premium features
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {premiumFeatures.map((f) => {
                    const Icon = FEATURE_ICONS[f.id] ?? Sparkles;
                    return (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "glass backdrop-blur-xl border rounded-xl p-4",
                          isPremium ? "border-emerald-500/30" : "border-amber-500/20",
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                            aria-hidden
                          >
                            {f.emoji}
                          </div>
                          {isPremium ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              <Check className="w-2.5 h-2.5 inline mr-1" aria-hidden /> Unlocked
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              Premium
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground text-sm mb-1 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                          {f.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{f.description}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* Free features */}
              {freeFeatures.length > 0 && (
                <section aria-label="Free features" className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Always free</Label>
                  <div className="flex flex-wrap gap-2">
                    {freeFeatures.map((f) => (
                      <Badge key={f.id} className="bg-muted/40 text-muted-foreground border-transparent" variant="outline">
                        {f.emoji} {f.name}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Pricing CTA */}
              {!isPremium && (
                <section aria-label="Pricing" className="glass backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-500">
                      $3<span className="text-sm font-normal text-muted-foreground">/month</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Or save 17% with yearly ($30/yr)</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleSubscribe("monthly")}
                      disabled={subscribing !== null}
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      {subscribing === "monthly" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Processing…</>
                      ) : (
                        <>Monthly · $3/mo</>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleSubscribe("yearly")}
                      disabled={subscribing !== null}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      {subscribing === "yearly" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Processing…</>
                      ) : (
                        <><Crown className="w-4 h-4 mr-2" aria-hidden /> Yearly · $30/yr</>
                      )}
                    </Button>
                  </div>

                  <p className="text-[11px] text-center text-muted-foreground">
                    Cancel anytime. No hidden fees. Supports all currencies via Cirkle Pay.
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

