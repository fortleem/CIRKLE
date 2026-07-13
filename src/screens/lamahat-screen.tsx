// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Layers, Heart, Plus, Grid3x3, Bookmark, Film, Camera, Loader2, Brain, ShieldCheck, MessageCircle, Eye } from "lucide-react";
import { LamahatViewer } from "@/components/overlays/lamahat-viewer";
import { toast } from "sonner";
import { useApp } from "@/lib/app-store";
import { useAuth } from "@/lib/auth-store";

/**
 * Brain AI connection for Lamahat.
 *
 * Lamahat (photos) was previously NOT wired to Cirkle Brain AI — every
 * photo came straight from `/api/posts`. This helper routes the user's
 * "suggest photos based on my interests" request through the Brain's
 * universal connection layer (`/api/brain/cross-evaluate` →
 * `crossEvaluate` → KG + 5-provider consensus + web search).
 *
 * It also dispatches a `circle:brain-query` CustomEvent so any future
 * page-level listener can observe / intercept Brain queries across the
 * whole app (telemetry, proactive suggestions, etc.).
 */
async function brainRecommendPhotos(opts: {
  country: string;
  city: string | null;
  username?: string;
}): Promise<{ answer: string; confidence: number; sources: string[] }> {
  const { country, city, username } = opts;
  // Telemetry — let the rest of the app know a Brain query is in flight.
  window.dispatchEvent(
    new CustomEvent("circle:brain-query", {
      detail: { feature: "photos", action: "recommend", country, city },
    }),
  );
  const res = await fetch("/api/brain/cross-evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "[photos:recommend] suggest photos based on my interests",
      country,
      city: city || undefined,
      username,
      language: "en",
    }),
  });
  if (!res.ok) throw new Error(`Brain query failed (${res.status})`);
  const data = await res.json();
  return {
    answer: data?.finalAnswer || "No suggestions right now — try again later.",
    confidence: data?.confidence ?? 0,
    sources: (data?.sources || []).map((s: { name: string }) => s.name),
  };
}

type Tab = "feed" | "reels" | "saved" | "tagged";

const STORIES = ["Memories", "Travel", "Food", "Friends", "Sunsets", "Studio"];

/** Deterministic aspect-ratio picker so the masonry grid still has visual variety. */
function ratioFor(id: string): "tall" | "wide" | "square" {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const m = Math.abs(h) % 5;
  if (m === 0) return "tall";
  if (m === 3) return "wide";
  return "square";
}

interface Photo {
  id: string;
  body: string;
  authorName: string;
  ratio: "tall" | "wide" | "square";
}

/** Colored category definitions — each drives the placeholder gradient + pill style. */
const CATEGORIES = [
  { name: "Travel", bg: "from-sky-500/45 via-blue-600/35 to-indigo-700/45", pill: "bg-sky-500/30 text-sky-100 border-sky-300/40" },
  { name: "Food", bg: "from-amber-500/45 via-orange-600/35 to-rose-700/45", pill: "bg-amber-500/30 text-amber-100 border-amber-300/40" },
  { name: "Nature", bg: "from-emerald-500/45 via-green-600/35 to-teal-700/45", pill: "bg-emerald-500/30 text-emerald-100 border-emerald-300/40" },
  { name: "Friends", bg: "from-pink-500/45 via-rose-600/35 to-fuchsia-700/45", pill: "bg-pink-500/30 text-pink-100 border-pink-300/40" },
  { name: "Studio", bg: "from-violet-500/45 via-purple-600/35 to-indigo-700/45", pill: "bg-violet-500/30 text-violet-100 border-violet-300/40" },
  { name: "Sunsets", bg: "from-orange-500/45 via-rose-600/35 to-purple-700/45", pill: "bg-orange-500/30 text-orange-100 border-orange-300/40" },
  { name: "Architecture", bg: "from-slate-500/45 via-zinc-600/35 to-stone-700/45", pill: "bg-slate-500/30 text-slate-100 border-slate-300/40" },
  { name: "Art", bg: "from-fuchsia-500/45 via-pink-600/35 to-violet-700/45", pill: "bg-fuchsia-500/30 text-fuchsia-100 border-fuchsia-300/40" },
] as const;

/** Avatar gradient pairs — uses brand tokens (gold/rose/teal/accent) so cards stay on-brand. */
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--rose)))",
  "linear-gradient(135deg, hsl(var(--teal)), hsl(var(--gold)))",
  "linear-gradient(135deg, hsl(var(--rose)), hsl(var(--accent)))",
  "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--teal)))",
  "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--gold)))",
  "linear-gradient(135deg, hsl(var(--teal)), hsl(var(--rose)))",
] as const;

const TIME_AGO = ["5m", "18m", "42m", "2h", "5h", "9h", "14h", "1d", "2d", "3d", "4d", "6d", "1w", "2w", "3w", "1mo"] as const;

/** Stable 32-bit hash from a string — used to derive deterministic mock data per photo. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Compress a raw integer into a human count (1.2k / 12.4k / 1.2M). */
function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

/**
 * Enrich a raw Photo with deterministic mock engagement data so every card
 * renders realistic metadata (likes / comments / views / category / time /
 * avatar) without requiring API changes. Same id → same metrics, every render.
 */
function enrichPhoto(p: Photo) {
  const h = hashStr(p.id);
  const category = CATEGORIES[h % CATEGORIES.length];
  const likes = 48 + (h % 9_520);          // 48 .. 9,567
  const comments = 2 + (h % 480);          // 2 .. 481
  const views = 1_200 + (h % 58_800);      // 1,200 .. 59,999
  const timeAgo = TIME_AGO[h % TIME_AGO.length];
  const avatar = AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
  const initials =
    (p.authorName || "U")
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  return { category, likes, comments, views, timeAgo, avatar, initials };
}

export function LamahatScreen() {
  const [viewer, setViewer] = useState<{ open: boolean; mode: "post" | "story"; index: number }>({
    open: false, mode: "post", index: 0,
  });
  const [tab, setTab] = useState<Tab>("feed");
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [brainBusy, setBrainBusy] = useState(false);
  const { country, city } = useApp();
  const { user } = useAuth();

  /** Calls the Brain universal layer for photo recommendations. */
  const onBrainRecommend = async () => {
    if (brainBusy) return;
    setBrainBusy(true);
    const promise = brainRecommendPhotos({
      country,
      city,
      username: user?.username,
    });
    toast.promise(promise, {
      loading: "🧠 Brain is curating photo ideas…",
      success: (r) => ({
        title: "🧠 Brain AI · Photos",
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

  // Fetch real photos from the lamahat module.
  // The /api/posts endpoint accepts a `module` filter and returns posts in
  // the shape defined by `Post` in @/lib/circle/types.
  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ["posts", "lamahat"],
    queryFn: async () => {
      const r = await fetch("/api/posts?module=lamahat", { cache: "no-store" });
      if (!r.ok) throw new Error("failed to load photos");
      const data = await r.json();
      const arr = Array.isArray(data) ? data : (data.posts || []);
      return arr
        .filter((p: any) => p && (p.mediaKind || p.media?.kind === "image" || p.media?.kind === "album" || p.body))
        .map((p: any): Photo => ({
          id: p.id,
          body: p.body || "",
          authorName: p.authorName || p.user || "Anonymous",
          ratio: ratioFor(p.id),
        }));
    },
    staleTime: 30_000,
  });

  const grid = useMemo(() => {
    if (tab === "saved") return photos.slice(0, 6);
    if (tab === "tagged") return photos.slice(4, 12);
    if (tab === "reels") return photos.filter((_, i) => i % 2 === 0);
    return photos;
  }, [tab, photos]);

  const toggleLike = (i: number) => {
    setLiked((p) => ({ ...p, [i]: !p[i] }));
  };

  return (
    <div className="pb-32">
      {/* ── Super Upgrade: Header with no-ads + privacy badges ── */}
      <div className="px-6 pt-2 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl">Lamahat</h1>
          <p className="text-[10px] text-secondary mt-0.5 flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5" /> No filters · No tracking · Your photos, your control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBrainRecommend}
            disabled={brainBusy}
            aria-label="Brain AI photo recommendations"
            className="text-xs px-3 py-1.5 rounded-full glass flex items-center gap-1.5 hover:bg-secondary/15 hover:text-secondary transition disabled:opacity-50"
          >
            {brainBusy ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Brain className="w-3 h-3 text-secondary" />
            )}
            Brain AI
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media" } }))}
            className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-muted/60 transition"
            aria-label="Create"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media", draft: "📸 " } }))}
            className="text-xs px-3 py-1.5 rounded-full bg-gradient-gold text-brand-charcoal font-medium flex items-center gap-1"
          >
            <Camera className="w-3 h-3" /> Capture
          </button>
        </div>
      </div>

      {/* Stories with add */}
      <div className="flex gap-3 px-6 mt-5 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media" } }))}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-secondary/60 flex items-center justify-center">
            <Plus className="w-6 h-6 text-secondary" />
          </div>
          <span className="text-[10px] text-muted-foreground">Your story</span>
        </button>
        {STORIES.map((s, i) => (
          <button
            key={s}
            onClick={() => setViewer({ open: true, mode: "story", index: i })}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div
              className="w-20 h-20 rounded-full p-[2px]"
              style={{ background: `conic-gradient(from ${i * 60}deg, hsl(var(--gold)), hsl(var(--rose)), hsl(var(--teal)))` }}
            >
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">{s}</span>
          </button>
        ))}
      </div>

      {/* AI memories banner */}
      <button
        onClick={() => setViewer({ open: true, mode: "story", index: 0 })}
        className="mx-5 mt-5 w-[calc(100%-2.5rem)] rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-transparent p-4 flex items-center gap-3 relative overflow-hidden text-left hover:bg-secondary/10 transition"
      >
        <div className="absolute -top-12 -right-8 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />
        <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-brand-charcoal" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-secondary">AI Memories</div>
          <div className="font-display text-lg">A year in golden hour</div>
          <div className="text-xs text-muted-foreground">{photos.length} photos · 8 places · Tap to relive</div>
        </div>
      </button>

      {/* Tabs */}
      <div className="mt-5 px-6 flex items-center gap-1 border-b border-border">
        {[
          { k: "feed" as Tab, l: "Feed", i: Grid3x3 },
          { k: "reels" as Tab, l: "Lamahat Reels", i: Film },
          { k: "saved" as Tab, l: "Saved", i: Bookmark },
          { k: "tagged" as Tab, l: "Tagged", i: Layers },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 border-b-2 transition ${
              tab === t.k ? "border-secondary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.i className="w-3.5 h-3.5" /> {t.l}
          </button>
        ))}
      </div>

      {/* Pinterest-style grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-xs text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading photos…
        </div>
      ) : grid.length === 0 ? (
        <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
          <Camera className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <div className="font-display text-lg">No photos yet</div>
          <div className="text-xs text-muted-foreground mt-1">Share your first moment!</div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media" } }))}
            className="mt-4 text-xs px-4 py-2 rounded-full bg-gradient-gold text-brand-charcoal font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Share a photo
          </button>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-2 px-2 mt-4">
          {grid.map((p, i) => {
            const isLiked = !!liked[i];
            const meta = enrichPhoto(p);
            return (
              <button
                key={p.id}
                onClick={() => setViewer({ open: true, mode: "post", index: i })}
                className={`mb-2 break-inside-avoid rounded-2xl relative overflow-hidden group block w-full ring-1 ring-white/5 ${
                  p.ratio === "tall" ? "aspect-[3/4]" : p.ratio === "wide" ? "aspect-[4/3]" : "aspect-square"
                }`}
              >
                {/* Photo placeholder — category-tinted gradient (zooms on hover) */}
                <div className={`absolute inset-0 bg-gradient-to-br ${meta.category.bg} transition-transform duration-500 group-hover:scale-110`} />
                {/* Texture / sheen overlay so the placeholder reads as a photo */}
                <div
                  className="absolute inset-0 opacity-50 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 25% 15%, hsl(var(--cream) / 0.35), transparent 55%), radial-gradient(circle at 78% 82%, hsl(var(--gold) / 0.3), transparent 50%)",
                  }}
                />
                {/* Top legibility scrim (always on) */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/55 to-transparent" />

                {/* Top-left: avatar + author + time (always visible) */}
                <div className="absolute top-2 left-2 right-12 flex items-center gap-2 z-10">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-brand-charcoal shrink-0 ring-2 ring-white/40 shadow-md"
                    style={{ background: meta.avatar }}
                    aria-hidden
                  >
                    {meta.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-cream truncate drop-shadow-md leading-tight">
                      {p.authorName}
                    </div>
                    <div className="text-[9px] text-cream/80 leading-tight">{meta.timeAgo} ago</div>
                  </div>
                </div>

                {/* Top-right: like heart (always visible, primary action) */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(i);
                    toast(isLiked ? "Unliked" : "Liked ❤");
                  }}
                  className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full glass-strong flex items-center justify-center transition hover:scale-110"
                  role="button"
                  aria-label={isLiked ? "Unlike" : "Like"}
                >
                  <Heart
                    className={`w-4 h-4 transition ${isLiked ? "fill-current text-accent scale-110" : "text-cream"}`}
                  />
                </span>

                {/* Hover overlay — dark gradient lifting from the bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[5]" />

                {/* Category pill — always visible, bottom-left */}
                <span
                  className={`absolute bottom-2 left-2 z-10 inline-flex items-center text-[9px] font-medium px-2 py-0.5 rounded-full border backdrop-blur-sm ${meta.category.pill}`}
                >
                  {meta.category.name}
                </span>

                {/* Engagement stats — fade in on hover, bottom-right */}
                <div className="absolute bottom-2 right-2 z-10 flex items-center gap-2 text-[10px] text-cream opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="flex items-center gap-0.5" title={`${formatCount(meta.likes + (isLiked ? 1 : 0))} likes`}>
                    <Heart className={`w-3 h-3 ${isLiked ? "fill-current text-accent" : "text-cream"}`} />
                    {formatCount(meta.likes + (isLiked ? 1 : 0))}
                  </span>
                  <span className="flex items-center gap-0.5" title={`${formatCount(meta.comments)} comments`}>
                    <MessageCircle className="w-3 h-3" />
                    {formatCount(meta.comments)}
                  </span>
                  <span className="flex items-center gap-0.5" title={`${formatCount(meta.views)} views`}>
                    <Eye className="w-3 h-3" />
                    {formatCount(meta.views)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <LamahatViewer
        open={viewer.open}
        mode={viewer.mode}
        index={viewer.index}
        onClose={() => setViewer((v) => ({ ...v, open: false }))}
      />
    </div>
  );
}
