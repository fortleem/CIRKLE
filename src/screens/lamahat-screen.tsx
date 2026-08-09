// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Layers, Heart, Plus, Grid3x3, Bookmark, Film, Camera, Loader2,
  Brain, ShieldCheck, MessageCircle, Eye, Send, Share2, MoreHorizontal,
  Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
  FolderPlus, Images, Clock, Calendar, Flame, TrendingUp, Star, X,
  History, Bookmark as BookmarkIcon, MapPin, Volume2, Smile, ArrowUpDown,
  Crown, Gift, CircleUser,
} from "lucide-react";
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
type SortKey = "recent" | "popular" | "liked";
type CategoryKey = "all" | "Travel" | "Food" | "Nature" | "Friends" | "Art" | "Architecture";

/* ────────────────────────────────────────────────────────────────────── */
/* Stories — ephemeral 24-hour stories                                    */
/* ────────────────────────────────────────────────────────────────────── */

interface Story {
  id: string;
  user: string;
  initials: string;
  avatar: string;
  seen: boolean;
  isOwn?: boolean;
  count: number;
  timeAgo: string;
}

const STORY_USERS: Story[] = [
  { id: "you", user: "Your story", initials: "You", avatar: "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--rose)))", seen: false, isOwn: true, count: 0, timeAgo: "Add" },
  { id: "layla", user: "layla.studio", initials: "LS", avatar: "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--rose)))", seen: false, count: 4, timeAgo: "2h" },
  { id: "noura", user: "noura.k", initials: "NK", avatar: "linear-gradient(135deg, hsl(var(--teal)), hsl(var(--gold)))", seen: false, count: 2, timeAgo: "5h" },
  { id: "majid", user: "majid.f", initials: "MF", avatar: "linear-gradient(135deg, hsl(var(--rose)), hsl(var(--accent)))", seen: false, count: 1, timeAgo: "8h" },
  { id: "sara", user: "sara_h", initials: "SH", avatar: "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--teal)))", seen: false, count: 6, timeAgo: "10h" },
  { id: "khalid", user: "khalid.q", initials: "KQ", avatar: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--gold)))", seen: true, count: 3, timeAgo: "12h" },
  { id: "amira", user: "amira.d", initials: "AD", avatar: "linear-gradient(135deg, hsl(var(--teal)), hsl(var(--rose)))", seen: true, count: 2, timeAgo: "16h" },
  { id: "yousef", user: "yousef.b", initials: "YB", avatar: "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--teal)))", seen: true, count: 5, timeAgo: "20h" },
];

/* ────────────────────────────────────────────────────────────────────── */
/* Collections — curated photo collections                                */
/* ────────────────────────────────────────────────────────────────────── */

interface Collection {
  id: string;
  title: string;
  count: number;
  cover: string;       // gradient classes for cover
  updated: string;
  collaborators: number;
  pinned?: boolean;
}

const COLLECTIONS: Collection[] = [
  { id: "desert-light", title: "Desert Light", count: 24, cover: "from-amber-500 via-orange-600 to-rose-700", updated: "2d", collaborators: 3, pinned: true },
  { id: "cairo-cafes", title: "Cairo Cafés", count: 18, cover: "from-amber-400 via-rose-500 to-fuchsia-700", updated: "5d", collaborators: 1 },
  { id: "red-sea", title: "Red Sea Reef", count: 31, cover: "from-cyan-500 via-teal-600 to-blue-700", updated: "1w", collaborators: 2 },
  { id: "old-souks", title: "Old Souks", count: 12, cover: "from-yellow-600 via-amber-700 to-stone-800", updated: "2w", collaborators: 0 },
  { id: "mountains", title: "Atlas Mountains", count: 9, cover: "from-slate-500 via-zinc-600 to-stone-800", updated: "1mo", collaborators: 1 },
  { id: "studio-portraits", title: "Studio Portraits", count: 42, cover: "from-violet-500 via-purple-600 to-indigo-800", updated: "1mo", collaborators: 4 },
];

/* ────────────────────────────────────────────────────────────────────── */
/* Memories — "On this day" feature                                      */
/* ────────────────────────────────────────────────────────────────────── */

interface Memory {
  id: string;
  yearsAgo: number;
  title: string;
  subtitle: string;
  count: number;
  cover: string;
  badge: string;
}

const MEMORIES: Memory[] = [
  { id: "mem-1y", yearsAgo: 1, title: "A year in golden hour", subtitle: "AlUla desert · 8 places · 24 photos", count: 24, cover: "from-amber-500 via-orange-600 to-purple-700", badge: "1 year ago" },
  { id: "mem-2y", yearsAgo: 2, title: "Cafés of Cairo", subtitle: "Downtown漫游 · 12 photos", count: 12, cover: "from-rose-500 via-pink-600 to-fuchsia-800", badge: "2 years ago" },
  { id: "mem-3y", yearsAgo: 3, title: "Red Sea week", subtitle: "Hurghada · 31 photos", count: 31, cover: "from-cyan-500 via-blue-600 to-indigo-800", badge: "3 years ago" },
];

/* ────────────────────────────────────────────────────────────────────── */
/* Moments — permanent posts (vs ephemeral stories)                      */
/* ────────────────────────────────────────────────────────────────────── */

interface Moment {
  id: string;
  author: string;
  avatar: string;
  initials: string;
  caption: string;
  category: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  timeAgo: string;
  location: string;
  pinned?: boolean;
  cover: string;
}

const MOMENTS: Moment[] = [
  {
    id: "mom-1",
    author: "layla.studio",
    avatar: "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--rose)))",
    initials: "LS",
    caption: "Golden hour in AlUla — third roll on the new lens. The light here does something to your soul. 📷✨",
    category: "Travel",
    likes: 1248,
    comments: 47,
    shares: 18,
    views: 8920,
    timeAgo: "2h",
    location: "AlUla, Saudi Arabia",
    pinned: true,
    cover: "from-amber-500 via-orange-600 to-rose-700",
  },
  {
    id: "mom-2",
    author: "noura.k",
    avatar: "linear-gradient(135deg, hsl(var(--teal)), hsl(var(--gold)))",
    initials: "NK",
    caption: "Mansaf on a Friday with the whole family. Grandma's recipe, never written down. 🍽️",
    category: "Food",
    likes: 892,
    comments: 31,
    shares: 24,
    views: 5410,
    timeAgo: "5h",
    location: "Amman, Jordan",
    cover: "from-amber-400 via-orange-500 to-rose-700",
  },
  {
    id: "mom-3",
    author: "majid.f",
    avatar: "linear-gradient(135deg, hsl(var(--rose)), hsl(var(--accent)))",
    initials: "MF",
    caption: "Atlas fog at 2,400m. Hiked 6 hours for this. Worth every step. 🏔️",
    category: "Nature",
    likes: 2103,
    comments: 88,
    shares: 42,
    views: 14200,
    timeAgo: "1d",
    location: "Imlil, Morocco",
    cover: "from-slate-500 via-zinc-600 to-stone-800",
  },
];

/* ────────────────────────────────────────────────────────────────────── */
/* Existing helpers — preserved                                          */
/* ────────────────────────────────────────────────────────────────────── */

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
  { name: "Travel",      bg: "from-sky-500/45 via-blue-600/35 to-indigo-700/45",        pill: "bg-sky-500/30 text-sky-100 border-sky-300/40" },
  { name: "Food",        bg: "from-amber-500/45 via-orange-600/35 to-rose-700/45",      pill: "bg-amber-500/30 text-amber-100 border-amber-300/40" },
  { name: "Nature",      bg: "from-emerald-500/45 via-green-600/35 to-teal-700/45",     pill: "bg-emerald-500/30 text-emerald-100 border-emerald-300/40" },
  { name: "Friends",     bg: "from-pink-500/45 via-rose-600/35 to-fuchsia-700/45",      pill: "bg-pink-500/30 text-pink-100 border-pink-300/40" },
  { name: "Studio",      bg: "from-violet-500/45 via-purple-600/35 to-indigo-700/45",   pill: "bg-violet-500/30 text-violet-100 border-violet-300/40" },
  { name: "Sunsets",     bg: "from-orange-500/45 via-rose-600/35 to-purple-700/45",     pill: "bg-orange-500/30 text-orange-100 border-orange-300/40" },
  { name: "Architecture",bg: "from-slate-500/45 via-zinc-600/35 to-stone-700/45",       pill: "bg-slate-500/30 text-slate-100 border-slate-300/40" },
  { name: "Art",         bg: "from-fuchsia-500/45 via-pink-600/35 to-violet-700/45",    pill: "bg-fuchsia-500/30 text-fuchsia-100 border-fuchsia-300/40" },
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

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Clock }[] = [
  { key: "recent", label: "Recent",  icon: Clock },
  { key: "popular", label: "Popular", icon: Flame },
  { key: "liked",   label: "Most Liked", icon: Heart },
];

const CATEGORY_CHIPS: CategoryKey[] = ["all", "Travel", "Food", "Nature", "Friends", "Art", "Architecture"];

/* ────────────────────────────────────────────────────────────────────── */
/* Story ring — gradient progress ring around each story avatar          */
/* ────────────────────────────────────────────────────────────────────── */

function StoryRing({ story, onClick }: { story: Story; onClick: () => void }) {
  const ringStyle = story.isOwn
    ? { border: "2px dashed hsl(var(--gold) / 0.7)" }
    : story.seen
      ? { background: "conic-gradient(from 0deg, hsl(var(--muted-foreground) / 0.4), hsl(var(--muted-foreground) / 0.4))" }
      : { background: "conic-gradient(from 0deg, hsl(var(--gold)), hsl(var(--rose)), hsl(var(--teal)), hsl(var(--gold)))" };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 group"
      aria-label={story.isOwn ? "Add to your story" : `View ${story.user}'s story`}
    >
      <div className="relative">
        <div
          className="w-[68px] h-[68px] rounded-full p-[2.5px] transition group-hover:scale-105"
          style={ringStyle}
        >
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
            <div
              className="w-full h-full flex items-center justify-center text-sm font-bold text-brand-charcoal"
              style={{ background: story.avatar }}
            >
              {story.isOwn ? <Plus className="w-6 h-6" /> : story.initials}
            </div>
          </div>
        </div>
        {story.isOwn ? (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-gold flex items-center justify-center ring-2 ring-background">
            <Plus className="w-3 h-3 text-brand-charcoal" />
          </div>
        ) : story.count > 1 ? (
          <div className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full glass-strong flex items-center justify-center ring-2 ring-background">
            <span className="text-[9px] font-bold text-cream leading-none">{story.count}</span>
          </div>
        ) : null}
      </div>
      <span className={`text-[10px] max-w-[72px] truncate ${story.isOwn ? "text-muted-foreground" : "text-foreground/80"}`}>
        {story.user}
      </span>
      {!story.isOwn && (
        <span className="text-[9px] text-muted-foreground -mt-1">{story.timeAgo}</span>
      )}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Story viewer — full-screen ephemeral story overlay                    */
/* ────────────────────────────────────────────────────────────────────── */

function StoryViewer({
  open,
  storyIndex,
  stories,
  onClose,
}: {
  open: boolean;
  storyIndex: number;
  stories: Story[];
  onClose: () => void;
}) {
  const [i, setI] = useState(storyIndex);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState("");
  const [liked, setLiked] = useState(false);

  // Reset derived state when the open/index key changes — avoids
  // setState-in-effect cascading renders (matches LamahatViewer pattern).
  const [prevKey, setPrevKey] = useState(`${open}-${storyIndex}`);
  const key = `${open}-${storyIndex}`;
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) { setI(storyIndex); setProgress(0); setLiked(false); setReply(""); }
  }

  // auto-advance 5s
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setI((v) => (v + 1) % stories.length);
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(t);
  }, [open, stories.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { setI((v) => (v + 1) % stories.length); setProgress(0); }
      else if (e.key === "ArrowLeft") { setI((v) => (v - 1 + stories.length) % stories.length); setProgress(0); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, stories.length]);

  if (!open) return null;
  const story = stories[i];
  const total = story.count || 1;
  const currentSub = Math.min(Math.floor(progress / (100 / total)) + 1, total);

  return (
    <div className="fixed inset-0 z-[140] bg-charcoal/95 backdrop-blur-xl flex items-center justify-center p-3">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full glass-strong flex items-center justify-center text-cream"
        aria-label="Close story"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full max-w-md aspect-[9/16] rounded-3xl overflow-hidden shadow-float">
        {/* Background gradient */}
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{ background: story.avatar, opacity: 0.35 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

        {/* Progress bars — one per story segment */}
        <div className="absolute top-3 inset-x-3 flex gap-1 z-10">
          {Array.from({ length: total }).map((_, idx) => (
            <div key={idx} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-cream transition-all duration-100"
                style={{ width: `${idx < currentSub - 1 ? 100 : idx === currentSub - 1 ? progress % (100 / total) / (100 / total) * 100 : 0}%` }}
              />
            </div>
          ))}
        </div>

        {/* Header: avatar + username + time */}
        <div className="absolute top-7 inset-x-3 flex items-center gap-2 text-cream z-10">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-brand-charcoal shrink-0 ring-2 ring-white/30"
            style={{ background: story.avatar }}
          >
            {story.initials}
          </div>
          <div className="text-sm font-medium">{story.user}</div>
          <span className="text-[11px] opacity-70">· {story.timeAgo}</span>
          <div className="flex-1" />
          <button
            onClick={() => toast("Story options")}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center"
            aria-label="More"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Caption */}
        <div className="absolute bottom-24 inset-x-4 text-cream text-sm leading-relaxed z-10 pointer-events-none">
          {story.isOwn
            ? "Your story · Tap to add more"
            : `${story.user.split(".")[0]} shared ${story.count} moment${story.count > 1 ? "s" : ""} from today`}
        </div>

        {/* Reply input */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (!reply.trim()) return; toast.success("Reply sent"); setReply(""); }}
          className="absolute bottom-4 inset-x-3 flex items-center gap-2 z-10"
        >
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={`Reply to ${story.user}…`}
            className="flex-1 glass-strong rounded-full px-4 py-2.5 text-sm outline-none text-cream placeholder:text-cream/60"
          />
          <button
            type="button"
            onClick={() => { setLiked((l) => !l); toast.success(liked ? "Reaction removed" : "❤️ Reaction sent"); }}
            className="w-10 h-10 rounded-full glass-strong text-cream flex items-center justify-center shrink-0"
            aria-label="React"
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-current text-rose" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => toast.success("Shared to Wasl")}
            className="w-10 h-10 rounded-full glass-strong text-cream flex items-center justify-center shrink-0"
            aria-label="Share"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* tap zones */}
        <button
          onClick={() => { setI((v) => (v - 1 + stories.length) % stories.length); setProgress(0); }}
          className="absolute left-0 top-1/4 bottom-1/4 w-1/3 z-0"
          aria-label="Previous story"
        />
        <button
          onClick={() => { setI((v) => (v + 1) % stories.length); setProgress(0); }}
          className="absolute right-0 top-1/4 bottom-1/4 w-1/3 z-0"
          aria-label="Next story"
        />
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[10px] text-cream/40 pointer-events-none">
          Tap sides to navigate · Esc to close
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Main screen                                                           */
/* ────────────────────────────────────────────────────────────────────── */

export function LamahatScreen() {
  const [viewer, setViewer] = useState<{ open: boolean; mode: "post" | "story"; index: number }>({
    open: false, mode: "post", index: 0,
  });
  const [storyView, setStoryView] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [tab, setTab] = useState<Tab>("feed");
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [brainBusy, setBrainBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [loadingMore, setLoadingMore] = useState(false);
  const { country, city } = useApp();
  const { user } = useAuth();
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  /** Apply discovery filters: search + category + sort, then slice for infinite scroll. */
  const filteredPhotos = useMemo(() => {
    let list = photos.slice();
    if (category !== "all") {
      list = list.filter((p) => enrichPhoto(p).category.name === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.body.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        enrichPhoto(p).category.name.toLowerCase().includes(q)
      );
    }
    // Sort — recent is insertion order (already newest-first from API),
    // popular = views desc, liked = likes desc.
    if (sort === "popular") {
      list.sort((a, b) => enrichPhoto(b).views - enrichPhoto(a).views);
    } else if (sort === "liked") {
      list.sort((a, b) => enrichPhoto(b).likes - enrichPhoto(a).likes);
    }
    return list;
  }, [photos, category, search, sort]);

  const grid = useMemo(() => {
    let g = filteredPhotos;
    if (tab === "saved") g = g.filter((_, i) => i < 6);
    else if (tab === "tagged") g = g.slice(4, 12);
    else if (tab === "reels") g = g.filter((_, i) => i % 2 === 0);
    return g.slice(0, visibleCount);
  }, [tab, filteredPhotos, visibleCount]);

  const hasMore = filteredPhotos.length > visibleCount;

  /** Infinite scroll — when sentinel enters viewport, load 8 more. */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          // simulate network delay so the indicator is visible
          setTimeout(() => {
            setVisibleCount((v) => v + 8);
            setLoadingMore(false);
          }, 700);
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore]);

  // Close sort menu on outside click
  useEffect(() => {
    if (!sortMenuOpen) return;
    const onDoc = () => setSortMenuOpen(false);
    const t = setTimeout(() => window.addEventListener("click", onDoc), 0);
    return () => { clearTimeout(t); window.removeEventListener("click", onDoc); };
  }, [sortMenuOpen]);

  const toggleLike = (i: number) => {
    setLiked((p) => ({ ...p, [i]: !p[i] }));
  };

  const toggleSave = (id: string) => {
    setSaved((p) => ({ ...p, [id]: !p[id] }));
    toast.success(saved[id] ? "Removed from saved" : "Saved");
  };

  return (
    <div className="pb-32">
      {/* ── Header with no-ads + privacy badges (preserved) ── */}
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

      {/* ── Stories (ephemeral 24h bar) ── */}
      <div className="mt-5">
        <div className="px-6 flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-medium">Stories</span>
            <span className="text-[10px] text-muted-foreground">· disappears in 24h</span>
          </div>
          <button
            onClick={() => setStoryView({ open: true, index: 1 })}
            className="text-[10px] text-secondary hover:underline"
          >
            View all
          </button>
        </div>
        <div className="flex gap-3 px-6 overflow-x-auto scrollbar-hide pb-1">
          {STORY_USERS.map((s, i) => (
            <StoryRing
              key={s.id}
              story={s}
              onClick={() => {
                if (s.isOwn) {
                  window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media", story: true } }));
                } else {
                  setStoryView({ open: true, index: i });
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Memories (On this day) ── */}
      <div className="mt-6">
        <div className="px-6 flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-medium">Memories</span>
            <span className="text-[10px] text-muted-foreground">· on this day</span>
          </div>
          <button
            onClick={() => toast.success("Memory remix created", { description: "AI made a 12s reel from this collection." })}
            className="text-[10px] text-secondary hover:underline"
          >
            Remix all
          </button>
        </div>

        <div className="flex gap-3 px-6 overflow-x-auto scrollbar-hide">
          {MEMORIES.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setViewer({ open: true, mode: "story", index: i })}
              className="shrink-0 w-[260px] rounded-2xl overflow-hidden border border-border/60 relative group text-left"
            >
              {/* Cover */}
              <div className={`h-32 bg-gradient-to-br ${m.cover} relative`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div
                  className="absolute inset-0 opacity-40 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 25% 20%, hsl(var(--cream) / 0.4), transparent 55%), radial-gradient(circle at 75% 80%, hsl(var(--gold) / 0.35), transparent 50%)",
                  }}
                />
                <div className="absolute top-2 left-2 z-10">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-cream/90 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
                    {m.badge}
                  </span>
                </div>
                <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-brand-charcoal" />
                </div>
              </div>
              <div className="p-3 bg-card">
                <div className="font-display text-base leading-tight">{m.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{m.subtitle}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Images className="w-3 h-3" /> {m.count} photos
                  </span>
                  <span className="text-[10px] text-secondary flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                    Relive <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Discovery bar (search + sort + category chips) ── */}
      <div className="mt-6 px-6 space-y-3">
        {/* Search + Sort */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search photos, people, places…"
              className="w-full glass rounded-full pl-9 pr-9 py-2 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-secondary/40 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSortMenuOpen((o) => !o)}
              className="glass rounded-full px-3 py-2 text-xs flex items-center gap-1.5 hover:bg-muted/60 transition"
              aria-label="Sort"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{SORT_OPTIONS.find((o) => o.key === sort)?.label}</span>
              <ChevronDown className={`w-3 h-3 transition ${sortMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {sortMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 glass-strong rounded-xl shadow-float p-1 z-30">
                {SORT_OPTIONS.map((o) => {
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.key}
                      onClick={() => { setSort(o.key); setSortMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-muted/60 transition ${
                        sort === o.key ? "text-secondary font-medium" : "text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {o.label}
                      {sort === o.key && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {CATEGORY_CHIPS.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
                  active
                    ? "bg-gradient-gold text-brand-charcoal border-transparent font-medium"
                    : "glass text-foreground/80 hover:bg-muted/60 border-border/60"
                }`}
              >
                {c === "all" ? "All" : c}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Collections ── */}
      <div className="mt-6">
        <div className="px-6 flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Images className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-medium">Your Collections</span>
            <span className="text-[10px] text-muted-foreground">· {COLLECTIONS.length}</span>
          </div>
          <button
            onClick={() => toast.success("New collection", { description: "Pick photos to start a curated album." })}
            className="text-[10px] text-secondary flex items-center gap-0.5 hover:gap-1 transition-all"
          >
            <FolderPlus className="w-3 h-3" /> Create new
          </button>
        </div>
        <div className="flex gap-3 px-6 overflow-x-auto scrollbar-hide">
          {COLLECTIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => toast.success(`Opening ${c.title}`, { description: `${c.count} photos · ${c.collaborators} collaborator${c.collaborators === 1 ? "" : "s"}` })}
              className="shrink-0 w-[200px] rounded-2xl overflow-hidden border border-border/60 relative group text-left hover:ring-2 hover:ring-secondary/30 transition"
            >
              <div className={`h-28 bg-gradient-to-br ${c.cover} relative`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div
                  className="absolute inset-0 opacity-50 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 25%, hsl(var(--cream) / 0.4), transparent 55%), radial-gradient(circle at 75% 75%, hsl(var(--gold) / 0.3), transparent 50%)",
                  }}
                />
                {c.pinned && (
                  <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-gradient-gold flex items-center justify-center">
                    <Star className="w-3 h-3 text-brand-charcoal fill-current" />
                  </div>
                )}
                <div className="absolute bottom-2 left-3 z-10 text-cream">
                  <div className="font-display text-base leading-tight">{c.title}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{c.count} photos · updated {c.updated}</div>
                </div>
              </div>
              <div className="px-3 py-2 bg-card flex items-center justify-between">
                <div className="flex -space-x-2">
                  {Array.from({ length: Math.min(c.collaborators + 1, 3) }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full ring-2 ring-background"
                      style={{ background: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length] }}
                    />
                  ))}
                  {c.collaborators > 2 && (
                    <div className="w-5 h-5 rounded-full ring-2 ring-background glass-strong flex items-center justify-center">
                      <span className="text-[8px] text-cream">+{c.collaborators - 2}</span>
                    </div>
                  )}
                </div>
                {c.collaborators === 0 ? (
                  <span className="text-[9px] text-muted-foreground">Private</span>
                ) : (
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <CircleUser className="w-2.5 h-2.5" /> Shared
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Moments (permanent posts) ── */}
      <div className="mt-6">
        <div className="px-6 flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-medium">Moments</span>
            <span className="text-[10px] text-muted-foreground">· permanent posts</span>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media", moment: true } }))}
            className="text-[10px] text-secondary flex items-center gap-0.5 hover:gap-1 transition-all"
          >
            <Plus className="w-3 h-3" /> New moment
          </button>
        </div>

        <div className="px-4 space-y-4">
          {MOMENTS.map((m, idx) => {
            const isSaved = !!saved[m.id];
            return (
              <article
                key={m.id}
                className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm hover:shadow-float transition"
              >
                {/* Author row */}
                <div className="p-3 flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-brand-charcoal ring-2 ring-secondary/30"
                    style={{ background: m.avatar }}
                  >
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-1">
                      @{m.author}
                      {m.pinned && <Crown className="w-3 h-3 text-secondary" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {m.location}
                      <span>·</span>
                      <Clock className="w-2.5 h-2.5" /> {m.timeAgo} ago
                    </div>
                  </div>
                  <button
                    onClick={() => toast("Moment options")}
                    className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                    aria-label="More"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Photo */}
                <button
                  onClick={() => setViewer({ open: true, mode: "post", index: idx })}
                  className={`relative w-full aspect-[4/3] bg-gradient-to-br ${m.cover} block group overflow-hidden`}
                  aria-label="View moment"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                  <div
                    className="absolute inset-0 opacity-40 mix-blend-soft-light"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 25% 15%, hsl(var(--cream) / 0.4), transparent 55%), radial-gradient(circle at 78% 82%, hsl(var(--gold) / 0.3), transparent 50%)",
                    }}
                  />
                  <span className="absolute top-2 left-2 text-[9px] font-medium px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-cream border border-white/20">
                    {m.category}
                  </span>
                </button>

                {/* Caption */}
                <div className="p-3 pt-2.5">
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">@{m.author}</span>{" "}
                    {m.caption}
                  </p>
                </div>

                {/* Engagement row */}
                <div className="px-3 pb-2 flex items-center gap-1 text-muted-foreground">
                  <button
                    onClick={() => { setLiked((p) => ({ ...p, [1000 + idx]: !p[1000 + idx] })); toast.success(liked[1000 + idx] ? "Like removed" : "Liked ❤"); }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-muted/60 transition text-xs"
                    aria-label="Like"
                  >
                    <Heart className={`w-4 h-4 ${liked[1000 + idx] ? "fill-current text-rose" : ""}`} />
                    <span>{formatCount(m.likes + (liked[1000 + idx] ? 1 : 0))}</span>
                  </button>
                  <button
                    onClick={() => setViewer({ open: true, mode: "post", index: idx })}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-muted/60 transition text-xs"
                    aria-label="Comments"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{formatCount(m.comments)}</span>
                  </button>
                  <button
                    onClick={() => toast.success("Shared to Wasl")}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-muted/60 transition text-xs"
                    aria-label="Share"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{formatCount(m.shares)}</span>
                  </button>
                  <button
                    onClick={() => toast("Views: " + formatCount(m.views))}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-muted/60 transition text-xs"
                    aria-label="Views"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{formatCount(m.views)}</span>
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => toggleSave(m.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/60 transition"
                    aria-label="Save"
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current text-secondary" : ""}`} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* ── Tabs (preserved) ── */}
      <div className="mt-6 px-6 flex items-center gap-1 border-b border-border">
        {[
          { k: "feed" as Tab,   l: "Feed",          i: Grid3x3 },
          { k: "reels" as Tab,  l: "Lamahat Reels", i: Film },
          { k: "saved" as Tab,  l: "Saved",         i: Bookmark },
          { k: "tagged" as Tab, l: "Tagged",        i: Layers },
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

      {/* ── Discovery summary line ── */}
      {!isLoading && (
        <div className="px-6 mt-3 text-[10px] text-muted-foreground flex items-center gap-2">
          <SlidersHorizontal className="w-3 h-3" />
          {filteredPhotos.length} photo{filteredPhotos.length === 1 ? "" : "s"}
          {category !== "all" && <> · {category}</>}
          {search && <> · matching "{search}"</>}
          {sort !== "recent" && <> · sorted by {SORT_OPTIONS.find((o) => o.key === sort)?.label.toLowerCase()}</>}
        </div>
      )}

      {/* ── Pinterest-style masonry grid (preserved + enhanced) ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-xs text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading photos…
        </div>
      ) : grid.length === 0 ? (
        <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
          <Camera className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <div className="font-display text-lg">
            {search ? "No matches found" : category !== "all" ? `No ${category} photos yet` : "No photos yet"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {search ? "Try a different search or filter." : "Share your first moment!"}
          </div>
          {(search || category !== "all") && (
            <button
              onClick={() => { setSearch(""); setCategory("all"); }}
              className="mt-3 text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/60 transition"
            >
              Clear filters
            </button>
          )}
          {!search && category === "all" && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media" } }))}
              className="mt-4 text-xs px-4 py-2 rounded-full bg-gradient-gold text-brand-charcoal font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Share a photo
            </button>
          )}
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-2 px-2 mt-4">
          {grid.map((p, i) => {
            const isLiked = !!liked[i];
            const meta = enrichPhoto(p);
            // Vary card sizes — every 5th card spans 2 columns for visual rhythm
            const isFeature = i % 5 === 0 && i > 0;
            return (
              <button
                key={p.id}
                onClick={() => setViewer({ open: true, mode: "post", index: i })}
                className={`mb-2 break-inside-avoid rounded-2xl relative overflow-hidden group block w-full ring-1 ring-white/5 ${
                  p.ratio === "tall" ? "aspect-[3/4]" : p.ratio === "wide" ? "aspect-[4/3]" : "aspect-square"
                } ${isFeature ? "sm:column-span-2 sm:row-span-2" : ""}`}
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

                {/* Feature card badge */}
                {isFeature && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    <span className="text-[9px] font-medium px-2 py-0.5 rounded-full glass-strong text-cream flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 text-secondary fill-current" /> Featured
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Infinite scroll sentinel + load more button ── */}
      {!isLoading && grid.length > 0 && (
        <div ref={sentinelRef} className="px-6 py-6 flex flex-col items-center gap-3">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading more photos…
            </div>
          ) : hasMore ? (
            <button
              onClick={() => { setLoadingMore(true); setTimeout(() => { setVisibleCount((v) => v + 8); setLoadingMore(false); }, 400); }}
              className="text-xs px-4 py-2 rounded-full glass hover:bg-muted/60 transition flex items-center gap-1.5"
            >
              Load more <ChevronDown className="w-3 h-3" />
            </button>
          ) : (
            <div className="text-center text-[10px] text-muted-foreground">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ShieldCheck className="w-3 h-3 text-secondary" />
                <span className="font-medium">You're all caught up</span>
              </div>
              Showing {grid.length} of {filteredPhotos.length} photos · end of feed
            </div>
          )}
        </div>
      )}

      {/* ── Viewers ── */}
      <LamahatViewer
        open={viewer.open}
        mode={viewer.mode}
        index={viewer.index}
        onClose={() => setViewer((v) => ({ ...v, open: false }))}
      />

      <StoryViewer
        open={storyView.open}
        storyIndex={storyView.index}
        stories={STORY_USERS.filter((s) => !s.isOwn)}
        onClose={() => setStoryView((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
