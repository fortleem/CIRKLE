// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ShieldCheck, Loader2, CheckCircle2, Building2, Award, Sparkles, Lock,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface TierInfo {
  fee: number;
  label: string;
  color: string;
  perks: string[];
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

const TIERS: Record<"basic" | "silver" | "gold", TierInfo> = {
  basic: { fee: 49, label: "Basic", color: "#94a3b8", perks: ["Verified checkmark", "Listed in directory"] },
  silver: { fee: 199, label: "Silver", color: "#cbd5e1", perks: ["Everything in Basic", "Priority support", "Enhanced ranking", "Tier-2 docs attestation"] },
  gold: { fee: 499, label: "Gold", color: "#fbbf24", perks: ["Everything in Silver", "Dedicated manager", "Featured placement", "Annual audit"] },
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

export function VerifiedBadgeApply({ open, onClose }: Props) {
  const { user } = useAuth();
  const [institutionId, setInstitutionId] = useState("");
  const [tier, setTier] = useState<"basic" | "silver" | "gold">("basic");
  const [country, setCountry] = useState("US");
  const [docsNote, setDocsNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<Verification | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [done, setDone] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setInstitutionId("");
      setTier("basic");
      setCountry(user?.country || "US");
      setDocsNote("");
      setExisting(null);
      setDone(false);
    }
  }, [open, user?.country]);

  const fetchStatus = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingStatus(true);
    try {
      const res = await fetchWithTimeout(
        `/api/verify/institution?institutionId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setExisting(data.verification ?? null);
    } catch {
      /* no-op */
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (open && institutionId.trim().length > 2) {
      const t = setTimeout(() => fetchStatus(institutionId.trim()), 300);
      return () => clearTimeout(t);
    }
  }, [open, institutionId, fetchStatus]);

  const handleSubmit = async () => {
    const id = institutionId.trim();
    if (!id) {
      toast.error("Institution ID is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithTimeout("/api/verify/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: id,
          tier,
          currency: "USD",
          docsUploaded: docsNote ? [{ type: "supplementary", fileName: docsNote, fileHash: "hash_placeholder" }] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      toast.success("Verification requested", {
        description: `${TIERS[tier].label} tier · $${TIERS[tier].fee} ${data.verification.currency}`,
      });
      setExisting(data.verification);
      setDone(true);
      window.dispatchEvent(new CustomEvent("circle:verified-badge-apply"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Apply for verified institution badge">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Verified Institution Badge</h2>
              <p className="text-xs text-muted-foreground">شارة التحقق · Basic · Silver · Gold</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {done && existing ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 text-center"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" aria-hidden />
              <h3 className="text-lg font-semibold text-foreground mb-1">Application submitted</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Verification ID: <span className="font-mono text-emerald-500">{existing.id}</span>
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {TIERS[existing.tier].label} tier
                </Badge>
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Status: {existing.status}
                </Badge>
              </div>
              <Button onClick={onClose} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Done
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Existing status banner */}
              {loadingStatus && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking existing verification…
                </div>
              )}
              {existing && !loadingStatus && (
                <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4" role="region" aria-label="Existing verification">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" aria-hidden />
                      <span className="text-sm font-medium text-foreground">Existing application found</span>
                    </div>
                    <Badge className={cn(
                      "border",
                      existing.status === "approved" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                      existing.status === "pending" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                      existing.status === "rejected" && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
                    )}>
                      {existing.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tier: <span className="font-medium text-foreground">{TIERS[existing.tier].label}</span> ·
                    Fee paid: <span className="font-medium text-foreground">${existing.feePaid} {existing.currency}</span> ·
                    Expires: {existing.expiresAt ? new Date(existing.expiresAt).toLocaleDateString() : "—"}
                  </p>
                </div>
              )}

              {/* Tier picker */}
              <section aria-label="Pricing tiers">
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Choose your badge tier
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(TIERS) as Array<keyof typeof TIERS>).map((key) => {
                    const t = TIERS[key];
                    const active = tier === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTier(key)}
                        aria-pressed={active}
                        aria-label={`Select ${t.label} tier for $${t.fee}`}
                        className={cn(
                          "relative text-left p-4 rounded-2xl border transition-all",
                          active
                            ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5"
                            : "border-border/60 hover:border-emerald-500/40 bg-card/40",
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: `${t.color}30`, border: `1px solid ${t.color}` }}
                            aria-hidden
                          >
                            <Award className="w-4 h-4" style={{ color: t.color }} />
                          </div>
                          {active && <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden />}
                        </div>
                        <div className="font-semibold text-foreground">{t.label}</div>
                        <div className="text-xl font-bold text-emerald-500 mt-1">
                          ${t.fee}<span className="text-xs text-muted-foreground font-normal">/yr</span>
                        </div>
                        <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                          {t.perks.slice(0, 3).map((p, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <Sparkles className="w-2.5 h-2.5 mt-0.5 text-emerald-500 shrink-0" aria-hidden />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Application form */}
              <section aria-label="Application details" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inst-id">
                    <Building2 className="w-3.5 h-3.5 inline mr-1.5 text-emerald-500" aria-hidden />
                    Institution ID <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="inst-id"
                    placeholder="e.g. inst_yousef-bakery-eg"
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    aria-required="true"
                    aria-describedby="inst-id-help"
                  />
                  <p id="inst-id-help" className="text-xs text-muted-foreground">
                    Use the handle from your institution registration.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="country" className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {["US", "EG", "SA", "AE", "GB"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="docs-note">
                    <Lock className="w-3.5 h-3.5 inline mr-1.5 text-emerald-500" aria-hidden />
                    Supplementary documents note (optional)
                  </Label>
                  <Textarea
                    id="docs-note"
                    placeholder="List any additional documents you've already uploaded (e.g. trade license, tax certificate, audit report)…"
                    value={docsNote}
                    onChange={(e) => setDocsNote(e.target.value)}
                    rows={3}
                    maxLength={400}
                  />
                  <p className="text-xs text-muted-foreground text-right">{docsNote.length}/400</p>
                </div>
              </section>

              {/* Summary + submit */}
              <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tier</span>
                  <span className="font-medium text-foreground">{TIERS[tier].label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Annual fee</span>
                  <span className="font-semibold text-emerald-500">${TIERS[tier].fee}</span>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !institutionId.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  aria-label="Submit verification application"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Submitting…</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4 mr-2" aria-hidden /> Apply for {TIERS[tier].label} verification</>
                  )}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  By applying, you confirm your institution is legally registered and you are authorized to represent it.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}
