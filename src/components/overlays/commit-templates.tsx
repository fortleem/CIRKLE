// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, FileText, Loader2, Crown, Lock, CheckCircle2, Sparkles, Search, Copy,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Category = "nda" | "employment" | "lease" | "freelance" | "partnership" | "sale";

interface CommitTemplate {
  id: string;
  name: string;
  category: Category;
  isPremium: boolean;
  body: string;
  description: string;
  createdAt: string;
}

interface Instantiation {
  id: string;
  template: CommitTemplate;
  renderedBody: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<Category, { label: string; emoji: string }> = {
  nda: { label: "NDA", emoji: "🔒" },
  employment: { label: "Employment", emoji: "🧑‍💼" },
  lease: { label: "Lease", emoji: "🏠" },
  freelance: { label: "Freelance", emoji: "💼" },
  partnership: { label: "Partnership", emoji: "👥" },
  sale: { label: "Sale of Goods", emoji: "📦" },
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

/** Parse {{placeholder}} tokens out of a template body. */
function extractPlaceholders(body: string): string[] {
  const re = /\{\{(\w+)\}\}/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

export function CommitTemplatesOverlay({ open, onClose }: Props) {
  const [templates, setTemplates] = useState<CommitTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CommitTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [instantiating, setInstantiating] = useState(false);
  const [result, setResult] = useState<Instantiation | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithTimeout("/api/commit/templates", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelected(null);
      setResult(null);
      setValues({});
      setFilter("all");
      setQuery("");
    }
  }, [open, fetchTemplates]);

  const filtered = useMemo(() => {
    let list = templates;
    if (filter !== "all") list = list.filter((t) => t.category === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    // Free first, then premium
    return list.sort((a, b) => Number(a.isPremium) - Number(b.isPremium));
  }, [templates, filter, query]);

  const placeholders = useMemo(
    () => (selected ? extractPlaceholders(selected.body) : []),
    [selected],
  );

  const handleSelect = (tpl: CommitTemplate) => {
    setSelected(tpl);
    setResult(null);
    // Pre-fill empty values for each placeholder
    const init: Record<string, string> = {};
    for (const p of extractPlaceholders(tpl.body)) init[p] = "";
    setValues(init);
  };

  const handleInstantiate = async () => {
    if (!selected) return;
    // Premium gate — show upgrade CTA in UI
    if (selected.isPremium) {
      toast.message("Premium template", {
        description: "Upgrade to Premium ($5/mo) to unlock all premium templates.",
      });
    }
    setInstantiating(true);
    try {
      const res = await fetchWithTimeout("/api/commit/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selected.id, values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to instantiate");
      setResult(data.instantiation);
      toast.success("Template instantiated");
      window.dispatchEvent(new CustomEvent("circle:commit-templates"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Instantiation failed");
    } finally {
      setInstantiating(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard?.writeText(result.renderedBody).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Clipboard unavailable"),
    );
  };

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-3xl" ariaLabel="Premium commit templates gallery">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Commit Templates</h2>
              <p className="text-xs text-muted-foreground">Free + Premium · NDA · Employment · Lease · Freelance · Partnership · Sale</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div key="gallery" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                {/* Premium banner */}
                <div className="glass backdrop-blur-xl border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3" role="region" aria-label="Premium subscription banner">
                  <Crown className="w-5 h-5 text-amber-500 shrink-0" aria-hidden />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Unlock premium templates</p>
                    <p className="text-xs text-muted-foreground">M&A NDAs, executive contracts, commercial leases — $5/month</p>
                  </div>
                  <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    Premium · $5/mo
                  </Badge>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
                  <Input
                    placeholder="Search templates…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    aria-label="Search templates"
                  />
                </div>

                {/* Category chips */}
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Template categories">
                  <button
                    role="tab"
                    aria-selected={filter === "all"}
                    onClick={() => setFilter("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition",
                      filter === "all"
                        ? "bg-emerald-500 text-white"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    All
                  </button>
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                    <button
                      key={c}
                      role="tab"
                      aria-selected={filter === c}
                      onClick={() => setFilter(c)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition",
                        filter === c
                          ? "bg-emerald-500 text-white"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      {CATEGORY_LABELS[c].emoji} {CATEGORY_LABELS[c].label}
                    </button>
                  ))}
                </div>

                {/* Gallery */}
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground" aria-live="polite">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Loading templates…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground" aria-live="polite">
                    No templates found
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filtered.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => handleSelect(tpl)}
                        className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4 text-left hover:border-emerald-500/40 transition group"
                        aria-label={`Use template ${tpl.name}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl" aria-hidden>{CATEGORY_LABELS[tpl.category].emoji}</span>
                          {tpl.isPremium ? (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              <Lock className="w-2.5 h-2.5 inline mr-1" aria-hidden /> Premium
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Free</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-emerald-500 transition">{tpl.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <button
                  onClick={() => { setSelected(null); setResult(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  ← Back to gallery
                </button>

                <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{selected.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>
                    </div>
                    {selected.isPremium ? (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                        <Lock className="w-2.5 h-2.5 inline mr-1" aria-hidden /> Premium
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Free</Badge>
                    )}
                  </div>
                </div>

                {placeholders.length > 0 && !result && (
                  <section aria-label="Fill in placeholders" className="space-y-3">
                    <Label className="text-sm font-medium">Fill in the details</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {placeholders.map((p) => (
                        <div key={p} className="space-y-1">
                          <Label htmlFor={`ph-${p}`} className="text-xs text-muted-foreground font-mono">{`{{${p}}}`}</Label>
                          <Input
                            id={`ph-${p}`}
                            value={values[p] ?? ""}
                            onChange={(e) => setValues((v) => ({ ...v, [p]: e.target.value }))}
                            placeholder={p}
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleInstantiate}
                      disabled={instantiating}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      {instantiating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Generating…</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" aria-hidden /> Instantiate template</>
                      )}
                    </Button>
                  </section>
                )}

                {result && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-500" role="status" aria-live="polite">
                      <CheckCircle2 className="w-4 h-4" aria-hidden />
                      <span className="text-sm font-medium">Template instantiated</span>
                    </div>
                    <Textarea
                      readOnly
                      value={result.renderedBody}
                      rows={10}
                      aria-label="Rendered template"
                      className="font-mono text-xs"
                    />
                    <Button onClick={copyResult} variant="outline" className="w-full">
                      <Copy className="w-4 h-4 mr-2" aria-hidden /> Copy to clipboard
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </OverlayShell>
  );
}
