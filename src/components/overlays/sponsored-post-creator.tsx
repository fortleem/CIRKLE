// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Megaphone, Loader2, CheckCircle2, Tag, Globe, Heart, DollarSign,
  Eye, MousePointerClick, Plus,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface SponsoredPost {
  id: string;
  advertiserId: string;
  body: string;
  targetCountries: string;
  targetInterests: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  status: "pending" | "active" | "paused" | "ended";
  createdAt: string;
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

const POPULAR_INTERESTS = ["crypto", "ai", "fintech", "gaming", "fashion", "food", "travel", "tech", "sports", "music"];

export function SponsoredPostCreator({ open, onClose }: Props) {
  const { user } = useAuth();
  const [advertiserId, setAdvertiserId] = useState("");
  const [body, setBody] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [budget, setBudget] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [posts, setPosts] = useState<SponsoredPost[]>([]);
  const [done, setDone] = useState<SponsoredPost | null>(null);

  useEffect(() => {
    if (open) {
      setAdvertiserId(user?.username ?? "");
      setBody("");
      setCountries([]);
      setInterests([]);
      setNewInterest("");
      setBudget(50);
      setDone(null);
    }
  }, [open, user?.username]);

  const fetchPosts = useCallback(async () => {
    if (!advertiserId) return;
    try {
      const res = await fetchWithTimeout(`/api/ads/sponsored?limit=10`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      // Filter to the current advertiser
      const mine = (data.posts ?? []).filter((p: SponsoredPost) => p.advertiserId === advertiserId);
      setPosts(mine);
    } catch {
      /* no-op */
    }
  }, [advertiserId]);

  useEffect(() => {
    if (open) fetchPosts();
  }, [open, fetchPosts]);

  const toggleCountry = (c: string) => {
    setCountries((cur) => cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]);
  };
  const toggleInterest = (i: string) => {
    setInterests((cur) => cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]);
  };
  const addCustomInterest = () => {
    const v = newInterest.trim().toLowerCase();
    if (!v) return;
    if (!interests.includes(v)) setInterests((cur) => [...cur, v]);
    setNewInterest("");
  };

  const handleSubmit = async () => {
    if (!advertiserId.trim()) {
      toast.error("Advertiser ID is required");
      return;
    }
    if (body.trim().length < 3) {
      toast.error("Post body must be at least 3 characters");
      return;
    }
    if (body.trim().length > 500) {
      toast.error("Post body must be at most 500 characters");
      return;
    }
    if (!isFinite(budget) || budget < 1) {
      toast.error("Budget must be at least $1");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithTimeout("/api/ads/sponsored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advertiserId,
          body: body.trim(),
          targetCountries: countries,
          targetInterests: interests,
          budget,
          currency: "USD",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create sponsored post");
      toast.success("Sponsored post submitted", {
        description: `Budget: $${data.post.budget} · Status: ${data.post.status}`,
      });
      setDone(data.post);
      window.dispatchEvent(new CustomEvent("circle:sponsored-post-creator"));
      await fetchPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const totalReach = posts.reduce((s, p) => s + p.impressions, 0);
  const totalClicks = posts.reduce((s, p) => s + p.clicks, 0);
  const totalSpent = posts.reduce((s, p) => s + p.spent, 0);

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-3xl" ariaLabel="Sponsored post creator — transparent ads">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <Megaphone className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sponsored Posts</h2>
              <p className="text-xs text-muted-foreground">إعلانات · Transparent · Clearly labeled "Sponsored"</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {done ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 text-center" role="status" aria-live="polite">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" aria-hidden />
              <h3 className="text-lg font-semibold text-foreground mb-1">Sponsored post submitted</h3>
              <p className="text-sm text-muted-foreground mb-4">Status: <span className="text-amber-500 font-medium">{done.status}</span> · Budget: ${done.budget}</p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
                  <Tag className="w-3 h-3" aria-hidden /> This post will be clearly labeled "Sponsored" in the Midan feed.
                </p>
              </div>
              <Button onClick={() => setDone(null)} className="bg-emerald-500 hover:bg-emerald-600 text-white">Create another</Button>
            </motion.div>
          ) : (
            <>
              {/* Existing campaigns stats */}
              {posts.length > 0 && (
                <div className="grid grid-cols-3 gap-3" role="region" aria-label="Campaign stats">
                  <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 text-center">
                    <Eye className="w-4 h-4 text-emerald-500 mx-auto mb-1" aria-hidden />
                    <div className="text-xl font-bold text-foreground">{totalReach}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Impressions</div>
                  </div>
                  <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 text-center">
                    <MousePointerClick className="w-4 h-4 text-emerald-500 mx-auto mb-1" aria-hidden />
                    <div className="text-xl font-bold text-foreground">{totalClicks}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Clicks</div>
                  </div>
                  <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 text-center">
                    <DollarSign className="w-4 h-4 text-emerald-500 mx-auto mb-1" aria-hidden />
                    <div className="text-xl font-bold text-foreground">${totalSpent.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Spent</div>
                  </div>
                </div>
              )}

              {/* Ad creation form */}
              <section aria-label="Create sponsored post" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adv-id">Advertiser ID</Label>
                  <Input
                    id="adv-id"
                    value={advertiserId}
                    onChange={(e) => setAdvertiserId(e.target.value)}
                    aria-required="true"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-body">
                    Post body <span className="text-rose-500">*</span>
                    <span className="ml-2 text-xs text-muted-foreground">{body.length}/500</span>
                  </Label>
                  <Textarea
                    id="ad-body"
                    placeholder="Write your sponsored message — keep it concise and authentic…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    maxLength={500}
                    aria-required="true"
                  />
                </div>

                {/* Targeting: countries */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-500" aria-hidden /> Target countries
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {["US", "EG", "SA", "AE", "GB"].map((c) => {
                      const active = countries.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCountry(c)}
                          aria-pressed={active}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition border",
                            active
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border-transparent",
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                    {countries.length === 0 && (
                      <span className="text-xs text-muted-foreground">No country filter — visible worldwide</span>
                    )}
                  </div>
                </div>

                {/* Targeting: interests */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-emerald-500" aria-hidden /> Target interests
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_INTERESTS.map((i) => {
                      const active = interests.includes(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleInterest(i)}
                          aria-pressed={active}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition border",
                            active
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border-transparent",
                          )}
                        >
                          {i}
                        </button>
                      );
                    })}
                    {interests.filter((i) => !POPULAR_INTERESTS.includes(i)).map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleInterest(i)}
                        aria-pressed
                        className="px-3 py-1 rounded-full text-xs font-medium transition border bg-emerald-500 text-white border-emerald-500"
                      >
                        {i} ×
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add custom interest…"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomInterest(); } }}
                      aria-label="Add custom interest"
                    />
                    <Button onClick={addCustomInterest} variant="outline" size="icon" aria-label="Add interest">
                      <Plus className="w-4 h-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <Label htmlFor="budget">
                    <DollarSign className="w-3.5 h-3.5 inline mr-1 text-emerald-500" aria-hidden /> Budget (USD)
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    min={1}
                    max={10000}
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Estimated reach: {Math.round(budget * 100)} impressions (CPM $2) or {Math.round(budget / 0.05)} clicks (CPC $0.05)
                  </p>
                </div>

                <div className="glass backdrop-blur-xl border border-amber-500/30 bg-amber-500/5 rounded-xl p-3 flex items-center gap-2">
                  <Switch id="transparency" defaultChecked disabled aria-label="Transparency toggle (locked on)" />
                  <Label htmlFor="transparency" className="text-xs text-amber-600 dark:text-amber-400 cursor-default">
                    <Tag className="w-3 h-3 inline mr-1" aria-hidden />
                    This post will always be clearly labeled "Sponsored" — users can hide all sponsored content.
                  </Label>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !advertiserId.trim() || body.trim().length < 3}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Submitting…</>
                  ) : (
                    <><Megaphone className="w-4 h-4 mr-2" aria-hidden /> Submit sponsored post</>
                  )}
                </Button>
              </section>

              {/* Existing posts */}
              {posts.length > 0 && (
                <section aria-label="Existing campaigns" className="space-y-2">
                  <Label className="text-sm font-medium">Your campaigns</Label>
                  {posts.map((p) => (
                    <div key={p.id} className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-1">
                        <Badge className={cn(
                          "border",
                          p.status === "active" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                          p.status === "pending" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                          (p.status === "paused" || p.status === "ended") && "bg-muted text-muted-foreground border-transparent",
                        )}>
                          {p.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">${p.spent.toFixed(2)} / ${p.budget}</span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{p.body}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{p.impressions} impressions</span>
                        <span>{p.clicks} clicks</span>
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}
