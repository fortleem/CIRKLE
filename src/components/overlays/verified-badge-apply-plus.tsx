// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ShieldCheck, Loader2, CheckCircle2, Building2, Crown, Award, Lock,
  Download, RefreshCw, ArrowUpCircle, Receipt, ExternalLink, Sparkles, TrendingUp,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Verification {
  id: string;
  institutionId: string;
  tier: "basic" | "silver" | "gold";
  status: "pending" | "approved" | "rejected";
  feePaid: number;
  currency: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Payment {
  id: string;
  verificationId: string;
  institutionId: string;
  kind: "initial" | "renewal" | "upgrade";
  amount: number;
  currency: string;
  tier: "basic" | "silver" | "gold";
  status: "pending" | "captured" | "refunded" | "failed";
  method: "card" | "wallet" | "bank_transfer";
  reference: string;
  capturedAt: string | null;
  createdAt: string;
}

interface Certificate {
  id: string;
  verificationId: string;
  institutionId: string;
  tier: "basic" | "silver" | "gold";
  serialNumber: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  publicUrl: string;
}

interface PricingTier {
  tier: "basic" | "silver" | "gold";
  initialFee: number;
  renewalFee: number;
  upgradeFees: { fromBasic: number; fromSilver: number; fromGold: number };
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

const TIER_META = {
  basic: { label: "Basic", color: "#94a3b8", icon: ShieldCheck },
  silver: { label: "Silver", color: "#cbd5e1", icon: Award },
  gold: { label: "Gold", color: "#fbbf24", icon: Crown },
} as const;

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function VerifiedBadgeApplyPlus({ open, onClose }: Props) {
  const { user } = useAuth();
  const institutionId = user?.username ? `inst-${user.username}` : "";
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [ledger, setLedger] = useState<Payment[]>([]);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [tab, setTab] = useState<"overview" | "ledger" | "certificate" | "pricing">("overview");
  const [renewing, setRenewing] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/verify/institution-plus?institutionId=${encodeURIComponent(institutionId)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        setVerification(data.verification ?? null);
        setLedger(data.ledger ?? []);
        setCertificate(data.certificate ?? null);
      }
      const prRes = await fetchWithTimeout("/api/verify/institution-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pricing" }),
      });
      if (prRes.ok) {
        const prData = await prRes.json();
        setPricing(prData.schedule ?? []);
      }
    } catch {
      /* swallow — overlay is resilient */
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  const handleRenew = async () => {
    if (!verification) return;
    setRenewing(true);
    try {
      const res = await fetchWithTimeout("/api/verify/institution-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renew", verificationId: verification.id, method: "card" }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "renewal failed");
      }
      toast.success("Verification renewed for another year");
      await fetchAll();
      window.dispatchEvent(new CustomEvent("circle:verified-badge-apply-plus", {
        detail: { action: "renew", verificationId: verification.id },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRenewing(false);
    }
  };

  const handleUpgrade = async (newTier: "silver" | "gold") => {
    if (!verification) return;
    setUpgrading(true);
    try {
      const res = await fetchWithTimeout("/api/verify/institution-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upgrade", verificationId: verification.id, newTier, method: "card" }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "upgrade failed");
      }
      toast.success(`Upgraded to ${TIER_META[newTier].label} tier`);
      await fetchAll();
      window.dispatchEvent(new CustomEvent("circle:verified-badge-apply-plus", {
        detail: { action: "upgrade", verificationId: verification.id, newTier },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUpgrading(false);
    }
  };

  const handleIssueCert = async () => {
    if (!verification) return;
    setIssuing(true);
    try {
      const res = await fetchWithTimeout("/api/verify/institution-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issueCertificate", verificationId: verification.id }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "certificate issue failed");
      }
      const data = await res.json();
      setCertificate(data.certificate);
      toast.success("Certificate issued");
      window.dispatchEvent(new CustomEvent("circle:verified-badge-apply-plus", {
        detail: { action: "issueCertificate", verificationId: verification.id },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIssuing(false);
    }
  };

  const expiry = verification?.expiresAt ?? null;
  const daysLeft = daysUntil(expiry);
  const expiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="Verified institution badge — Plus">
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/10 via-transparent to-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-10 rounded-xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/30">
                <ShieldCheck className="size-5 text-emerald-500" />
              </div>
              <span className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-400 ring-2 ring-background" />
            </div>
            <div>
              <h2 id="vbp-title" className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                Verified Institution <Sparkles className="size-4 text-amber-500" />
              </h2>
              <p className="text-xs text-muted-foreground">Manage your verification, renewals, and certificate</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        {/* Tab bar */}
        <nav className="flex items-center gap-1 px-4 py-2 border-b border-border/40 overflow-x-auto" aria-label="Sections">
          {(["overview", "ledger", "certificate", "pricing"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                tab === t
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
              aria-pressed={tab === t}
            >
              {t === "overview" && "Overview"}
              {t === "ledger" && "Payment Ledger"}
              {t === "certificate" && "Certificate"}
              {t === "pricing" && "Pricing"}
            </button>
          ))}
        </nav>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
              <Loader2 className="size-5 animate-spin text-emerald-500" />
              <span className="ml-2 text-sm text-muted-foreground">Loading…</span>
            </div>
          )}

          {!loading && tab === "overview" && (
            <>
              {!verification && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Building2 className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No verification on record. Apply via the standard verification flow.
                  </p>
                </div>
              )}
              {verification && (
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const M = TIER_META[verification.tier];
                          const Icon = M.icon;
                          return (
                            <div
                              className="size-12 rounded-full flex items-center justify-center ring-2"
                              style={{ backgroundColor: `${M.color}25`, color: M.color, borderColor: M.color }}
                            >
                              <Icon className="size-6" />
                            </div>
                          );
                        })()}
                        <div>
                          <p className="font-display text-lg font-semibold capitalize">{verification.tier} Tier</p>
                          <p className="text-xs text-muted-foreground">Institution ID: {verification.institutionId}</p>
                        </div>
                      </div>
                      <Badge
                        variant={verification.status === "approved" ? "default" : "secondary"}
                        className={cn(
                          "capitalize",
                          verification.status === "approved" && "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
                          verification.status === "pending" && "bg-amber-500/15 text-amber-600 border-amber-500/30",
                          verification.status === "rejected" && "bg-rose-500/15 text-rose-600 border-rose-500/30",
                        )}
                      >
                        {verification.status}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Fee Paid</p>
                        <p className="font-semibold">{fmtMoney(verification.feePaid, verification.currency)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Issued</p>
                        <p className="font-semibold">{fmtDate(verification.verifiedAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p className={cn("font-semibold", expiringSoon && "text-amber-600")}>
                          {fmtDate(expiry)}
                          {daysLeft !== null && ` (${daysLeft}d left)`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-semibold">{fmtDate(verification.createdAt)}</p>
                      </div>
                    </div>
                  </motion.div>

                  {verification.status === "approved" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleRenew}
                        disabled={renewing}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        {renewing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        Renew
                      </Button>
                      {verification.tier !== "gold" && (
                        <Button
                          onClick={() => handleUpgrade(verification.tier === "basic" ? "silver" : "gold")}
                          disabled={upgrading}
                          variant="outline"
                        >
                          {upgrading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpCircle className="size-4" />}
                          Upgrade
                        </Button>
                      )}
                    </div>
                  )}

                  {expiringSoon && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <Lock className="size-4 mt-0.5 shrink-0" />
                      <span>
                        Your verification expires in {daysLeft} days. Renew now to keep your badge active and avoid losing premium placement.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!loading && tab === "ledger" && (
            <div className="space-y-3">
              {ledger.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Receipt className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No payment transactions yet.</p>
                </div>
              )}
              {ledger.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          p.kind === "initial" && "border-emerald-500/40 text-emerald-600",
                          p.kind === "renewal" && "border-sky-500/40 text-sky-600",
                          p.kind === "upgrade" && "border-amber-500/40 text-amber-600",
                        )}
                      >
                        {p.kind}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{p.method}</span>
                    </div>
                    <span className="font-semibold">{fmtMoney(p.amount, p.currency)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Ref: {p.reference}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "capitalize",
                        p.status === "captured" && "bg-emerald-500/15 text-emerald-600",
                        p.status === "refunded" && "bg-rose-500/15 text-rose-600",
                        p.status === "pending" && "bg-amber-500/15 text-amber-600",
                        p.status === "failed" && "bg-rose-500/15 text-rose-600",
                      )}
                    >
                      {p.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && tab === "certificate" && (
            <div className="space-y-4">
              {!certificate && verification?.status === "approved" && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Award className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Issue your downloadable certificate.</p>
                  <Button onClick={handleIssueCert} disabled={issuing} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    {issuing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    Issue Certificate
                  </Button>
                </div>
              )}
              {!certificate && verification?.status !== "approved" && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Lock className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Certificates are issued only to approved institutions.</p>
                </div>
              )}
              {certificate && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-card to-amber-500/5 p-6 relative overflow-hidden"
                >
                  <div className="absolute -top-8 -right-8 size-32 rounded-full bg-emerald-500/10 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-6 text-emerald-500" />
                        <span className="font-display text-sm tracking-wide uppercase text-emerald-600">Cirkle Verified</span>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 capitalize">{certificate.tier}</Badge>
                    </div>
                    <h3 className="mt-4 font-display text-2xl font-bold">{certificate.institutionId}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Serial: {certificate.serialNumber}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Issued</p>
                        <p className="font-semibold">{fmtDate(certificate.issuedAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p className="font-semibold">{fmtDate(certificate.expiresAt)}</p>
                      </div>
                    </div>
                    {certificate.revokedAt && (
                      <div className="mt-3 text-xs text-rose-600 font-semibold">REVOKED {fmtDate(certificate.revokedAt)}</div>
                    )}
                    <div className="mt-5 flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={certificate.publicUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-3.5" /> Public URL
                        </a>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {!loading && tab === "pricing" && (
            <div className="space-y-3">
              {pricing.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <TrendingUp className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Pricing schedule unavailable.</p>
                </div>
              )}
              {pricing.map((p) => {
                const M = TIER_META[p.tier];
                const Icon = M.icon;
                return (
                  <div key={p.tier} className="rounded-xl border border-border/60 bg-card/40 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="size-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${M.color}25`, color: M.color }}>
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="font-display font-semibold capitalize">{p.tier} Tier</p>
                        <p className="text-xs text-muted-foreground">Annual billing cycle</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Initial Fee</p>
                        <p className="font-semibold">${p.initialFee}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Renewal Fee (20% off)</p>
                        <p className="font-semibold">${p.renewalFee}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Upgrade Fees (prorated 60%)</p>
                        <div className="flex gap-3 mt-1">
                          <span className="font-semibold">B→${p.upgradeFees.fromBasic}</span>
                          <span className="font-semibold">S→${p.upgradeFees.fromSilver}</span>
                          <span className="font-semibold">G→${p.upgradeFees.fromGold}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}
