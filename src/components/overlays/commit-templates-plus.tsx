// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, Search, Lock, Crown, Star, Download, Sparkles, Tag,
  TrendingUp, Package, MessageSquare, ShoppingCart,
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

interface PremiumTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  emoji: string;
  body: string;
  priceUsd: number;
  creatorId: string;
  bestseller: boolean;
  downloads: number;
  ratingCount: number;
  previewLines: number;
}

interface TemplateBundle {
  id: string;
  name: string;
  description: string;
  templateIds: string[];
  priceUsd: number;
  emoji: string;
  savings: number;
}

interface Review {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const CATEGORIES = [
  { id: "all", label: "All", emoji: "✨" },
  { id: "nda", label: "NDA", emoji: "🔒" },
  { id: "freelance", label: "Freelance", emoji: "💼" },
  { id: "rental", label: "Rental", emoji: "🏠" },
  { id: "loan", label: "Loan", emoji: "💵" },
  { id: "service", label: "Service", emoji: "🤝" },
  { id: "partnership", label: "Partnership", emoji: "👥" },
  { id: "employment", label: "Employment", emoji: "🧑‍💼" },
];

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

export function CommitTemplatesPlus({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";

  const [templates, setTemplates] = useState<PremiumTemplate[]>([]);
  const [bundles, setBundles] = useState<TemplateBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PremiumTemplate | null>(null);
  const [preview, setPreview] = useState<{ body: string; fullAccess: boolean } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number>(0);
  const [purchasing, setPurchasing] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewStars, setReviewStars] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [owned, setOwned] = useState<Set<string>>(new Set());

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithTimeout("/api/commit/templates-plus", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
        setBundles(data.bundles ?? []);
      }
      if (userId) {
        const prRes = await fetchWithTimeout(
          `/api/commit/templates-plus?userId=${encodeURIComponent(userId)}&purchases=1`,
          { cache: "no-store" },
        );
        if (prRes.ok) {
          const prData = await prRes.json();
          const set = new Set<string>(prData.purchases.map((p: { templateId: string }) => p.templateId));
          setOwned(set);
        }
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  const openPreview = async (t: PremiumTemplate) => {
    setSelected(t);
    setPreview(null);
    setReviews([]);
    if (!userId) {
      // Show only preview lines from the body
      const lines = t.body.split("\n");
      setPreview({ body: lines.slice(0, t.previewLines).join("\n") + "\n\n[... Purchase to view full template ...]", fullAccess: false });
      return;
    }
    try {
      const res = await fetchWithTimeout(
        `/api/commit/templates-plus?templateId=${t.id}&preview=1&userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        setPreview({ body: data.body, fullAccess: data.fullAccess });
      }
      const rvRes = await fetchWithTimeout(
        `/api/commit/templates-plus?templateId=${t.id}&reviews=1`,
        { cache: "no-store" },
      );
      if (rvRes.ok) {
        const rvData = await rvRes.json();
        setReviews(rvData.reviews ?? []);
        setRatingAvg(rvData.rating?.avg ?? 0);
      }
    } catch {
      /* swallow */
    }
  };

  const handlePurchase = async () => {
    if (!selected || !userId) {
      toast.error("Sign in to purchase");
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetchWithTimeout("/api/commit/templates-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purchase", templateId: selected.id, userId, method: "card" }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "purchase failed");
      }
      toast.success(`Purchased ${selected.name}`);
      setOwned((s) => new Set([...s, selected.id]));
      await openPreview(selected);
      window.dispatchEvent(new CustomEvent("circle:commit-templates-plus", {
        detail: { action: "purchase", templateId: selected.id, priceUsd: selected.priceUsd },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPurchasing(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selected || !userId) return;
    setSubmittingReview(true);
    try {
      const res = await fetchWithTimeout("/api/commit/templates-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rate",
          templateId: selected.id,
          userId,
          rating: reviewStars,
          comment: reviewText,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "review failed");
      }
      toast.success("Review submitted");
      setReviewText("");
      await openPreview(selected);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const filtered = templates.filter((t) => {
    if (cat !== "all" && t.category !== cat) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-3xl" ariaLabel="Premium Commit Templates">
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-amber-500/10 via-transparent to-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center ring-1 ring-amber-500/30">
              <Package className="size-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                Premium Templates <Sparkles className="size-4 text-amber-500" />
              </h2>
              <p className="text-xs text-muted-foreground">Curated, lawyer-reviewed agreements</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        {selected ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              ← Back to gallery
            </button>
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl">
                    {selected.emoji}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{selected.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{selected.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-emerald-600">{fmtMoney(selected.priceUsd)}</p>
                  <p className="text-xs text-muted-foreground">{selected.downloads} downloads</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{selected.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.bestseller && (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">
                    <Crown className="size-3 mr-1" /> Bestseller
                  </Badge>
                )}
                {ratingAvg > 0 && (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                    <Star className="size-3 mr-1 fill-current" /> {ratingAvg.toFixed(1)} ({selected.ratingCount})
                  </Badge>
                )}
                {owned.has(selected.id) && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                    <Download className="size-3 mr-1" /> Owned
                  </Badge>
                )}
              </div>
            </div>

            {preview && (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Preview</Label>
                  {!preview.fullAccess && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                      <Lock className="size-3 mr-1" /> Locked
                    </Badge>
                  )}
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 max-h-64 overflow-y-auto">{preview.body}</pre>
              </div>
            )}

            {!owned.has(selected.id) && (
              <Button
                onClick={handlePurchase}
                disabled={purchasing || !userId}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {purchasing ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
                {userId ? `Purchase for ${fmtMoney(selected.priceUsd)}` : "Sign in to purchase"}
              </Button>
            )}

            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <Label className="mb-2 block">Reviews</Label>
              {reviews.length === 0 && (
                <p className="text-xs text-muted-foreground">No reviews yet. Be the first!</p>
              )}
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn("size-3", n <= r.rating ? "text-amber-500 fill-current" : "text-muted-foreground/30")}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">@{r.userId}</span>
                    </div>
                    <p className="mt-1 text-sm">{r.comment}</p>
                  </div>
                ))}
              </div>
              {owned.has(selected.id) && (
                <div className="mt-3 border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setReviewStars(n)}
                        aria-label={`${n} stars`}
                      >
                        <Star className={cn("size-5", n <= reviewStars ? "text-amber-500 fill-current" : "text-muted-foreground/40")} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience…"
                    className="mb-2"
                    rows={3}
                  />
                  <Button onClick={handleSubmitReview} disabled={submittingReview || !reviewText.trim()} size="sm">
                    {submittingReview ? <Loader2 className="size-3 animate-spin" /> : <MessageSquare className="size-3" />}
                    Submit Review
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search premium templates…"
                className="pl-9"
                aria-label="Search premium templates"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Categories">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                    cat === c.id
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  )}
                  aria-pressed={cat === c.id}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12" role="status">
                <Loader2 className="size-5 animate-spin text-emerald-500" />
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-12">
                <Package className="size-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No templates match your search.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((t) => (
                <motion.button
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => openPreview(t)}
                  className="text-left rounded-xl border border-border/60 bg-card/40 p-4 hover:border-emerald-500/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-xl">
                      {t.emoji}
                    </div>
                    {t.bestseller && (
                      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                        <Crown className="size-2.5 mr-0.5" /> Best
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-2 font-display font-semibold text-sm">{t.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-display text-lg font-bold text-emerald-600">{fmtMoney(t.priceUsd)}</span>
                    {owned.has(t.id) ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                        <Download className="size-3 mr-1" /> Owned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                        <Lock className="size-3 mr-1" /> Locked
                      </Badge>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {bundles.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="size-4 text-emerald-500" />
                  <h3 className="font-display font-semibold">Bundles</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bundles.map((b) => (
                    <div key={b.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <div className="flex items-start justify-between">
                        <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xl">
                          {b.emoji}
                        </div>
                        {b.savings > 0 && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                            Save {fmtMoney(b.savings)}
                          </Badge>
                        )}
                      </div>
                      <h4 className="mt-2 font-display font-semibold text-sm">{b.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{b.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{b.templateIds.length} templates</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-display text-lg font-bold text-emerald-600">{fmtMoney(b.priceUsd)}</span>
                        <TrendingUp className="size-4 text-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </OverlayShell>
  );
}
