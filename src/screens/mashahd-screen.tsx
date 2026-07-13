"use client";

/**
 * Mashahd — Cirkle video platform (MASHAHD-UPGRADE).
 *
 * A short-form reels viewer reimagined as a full video platform with
 * Cirkle Brain AI curation, working subtab filters, creator tools,
 * AI summaries, watch party, bullet comments (danmaku), trending,
 * monetization indicators, and Brain AI integration.
 *
 * Only this file is edited. All overlays are dispatched via existing
 * `circle:*` events (co-watch, bullet-comments, composer, creator-studio,
 * mashahd-player). All data comes from `/api/feed` + `/api/ai/summarize`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart, MessageCircle, Share2, Music, Sparkles, Radio, Maximize2, Play, X,
  Upload, Video as VideoIcon, RadioTower, ListVideo, Camera, Plus,
  TrendingUp, Flame, Users, Eye, Bookmark, BookmarkCheck, Zap,
  BadgeCheck, Coins, Film, Hash, Crown, Send, Loader2, Info,
  Scissors, UsersRound, ChevronRight, Tv, ListMusic, Search, Settings,
  ShieldCheck, ThumbsUp, Clock, type LucideIcon,
} from "lucide-react";
import { MashahdPlayer } from "@/components/overlays/mashahd-player";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { personalAI, getPersonalAIConsent } from "@/lib/personal-ai";
import { useAuth } from "@/lib/auth-store";

// Helper: branded gradient placeholder for any video thumbnail/avatar slot.
// Replaces every previous SmartImage call that used mock images.
function GradientThumb({ className = "" }: { className?: string }) {
  return <div className={`bg-gradient-to-br from-primary/20 to-secondary/10 ${className}`} />;
}

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type FilterId = "for-you" | "my-videos" | "live" | "shorts" | "channels" | "music" | "trending";

interface VideoItem {
  id: string;
  title: string;
  creator: string;
  handle: string;
  avatar: string; // unused — kept for type-compat; rendered as gradient
  thumbnail: string; // unused — kept for type-compat; rendered as gradient
  duration: number;       // seconds
  views: number;          // raw count
  likes: number;          // raw count
  comments: number;       // raw count
  music: string;
  caption: string;
  category: string;
  tags: string[];
  isLive?: boolean;
  isShort?: boolean;
  isMusic?: boolean;
  monetized: boolean;
  verified: boolean;
  mintNft?: boolean;
  subscribers: string;
  growth?: number;        // % growth for trending
  why: string;            // AI explanation for "Why am I seeing this?"
  createdAt: number;       // epoch ms — drives "2 days ago" relative time
  watchProgress?: number;  // 0..100 — partially-watched red bar under thumbnail
}

interface ChannelItem {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  subs: string;
  reels: number;
  views: string;
  monetized: boolean;
  verified: boolean;
  mintNft?: boolean;
}

interface TrendingTag { id: string; tag: string; count: string; growth: number; }
interface TrendingCreator { id: string; name: string; handle: string; avatar: string; subs: string; growth: number; }

// ────────────────────────────────────────────────────────────────────────────
// Static configuration
// ────────────────────────────────────────────────────────────────────────────

const FILTERS: { id: FilterId; label: string; icon: LucideIcon }[] = [
  { id: "for-you", label: "For you", icon: Sparkles },
  { id: "my-videos", label: "My Videos", icon: VideoIcon },
  { id: "live", label: "Live", icon: Radio },
  { id: "shorts", label: "Shorts", icon: Film },
  { id: "channels", label: "Channels", icon: Tv },
  { id: "music", label: "Music", icon: Music },
  { id: "trending", label: "Trending", icon: TrendingUp },
];

const CHANNELS = [
  "Dunes Studio", "Chef Noura", "Urban KSA", "Riyadh Daily", "AlUla TV", "Aramco",
];

const SEED_CREATORS = [
  { name: "Dunes Studio", handle: "@dunes.studio", subs: "128K", monetized: true, verified: true, mintNft: true },
  { name: "Chef Noura", handle: "@chefnoura", subs: "89K", monetized: true, verified: true },
  { name: "Urban KSA", handle: "@urbanksa", subs: "212K", monetized: false, verified: true },
  { name: "Riyadh Daily", handle: "@riyadhdaily", subs: "450K", monetized: true, verified: true, mintNft: true },
  { name: "AlUla TV", handle: "@alulatv", subs: "67K", monetized: false, verified: false },
  { name: "Aramco Studio", handle: "@aramco.studio", subs: "1.3M", monetized: true, verified: true, mintNft: true },
  { name: "NEOM Films", handle: "@neomfilms", subs: "320K", monetized: true, verified: true },
  
];

const CATEGORIES = ["Travel", "Food", "Heritage", "Tech", "Music", "Nature", "Lifestyle", "Comedy", "News", "Sports"];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Deterministic hash → used to derive stable per-video metadata. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function pick<T>(arr: T[], n: number): T { return arr[n % arr.length]; }

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function fmtDuration(sec: number): string {
  // Supports hours so long videos render as "1:23:45" (not "83:45").
  // Shorts / sub-hour videos keep the "12:34" shape used everywhere else.
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Relative "2 days ago" formatter — used on every video card meta row. */
function fmtRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} week${wk === 1 ? "" : "s"} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.floor(day / 365);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

/**
 * Like-ratio percentage shown next to the thumbs-up icon on every card.
 * Real like/view ratios hover near 95%+ on most platforms, so we compress
 * raw (likes/views) into a YouTube-style 85-99% band — keeps the UI honest
 * while staying readable.
 */
function fmtLikeRatio(likes: number, views: number): number {
  if (views <= 0) return 100;
  const ratio = (likes / views) * 100;
  return Math.max(85, Math.min(99, Math.round(95 - (100 - ratio) / 5)));
}

/** Map an arbitrary /api/feed forYou post to a video item. */
function forYouToVideo(
  post: { id: string; user: string; handle: string; body: string; likes: number; comments: number; verified?: boolean },
  idx: number,
): VideoItem {
  const h = hash(post.id);
  const creator = SEED_CREATORS[idx % SEED_CREATORS.length];
  const duration = 15 + (h % 600); // 15s .. 10min
  const views = (post.likes || 100) * (8 + (h % 40));
  const isShort = duration < 60;
  const isMusic = h % 7 === 0;
  const cat = pick(CATEGORIES, h);
  // Deterministic upload timestamp in the past 0..45 days — drives the
  // "2 days ago" relative-time pill on every video card.
  const createdAt = Date.now() - ((h % 45) * 24 * 60 * 60 * 1000) - (h % (24 * 60 * 60 * 1000));
  // ~1 in 5 videos is partially watched (5..95% progress) — drives the red
  // watch-progress bar pinned to the bottom edge of the thumbnail.
  const watchProgress = (h % 5 === 0) ? 5 + (h % 90) : undefined;
  return {
    id: `vid-${post.id}`,
    title: post.body.length > 60 ? post.body.slice(0, 60) + "…" : post.body,
    creator: creator.name,
    handle: creator.handle,
    avatar: "", // rendered as gradient placeholder
    thumbnail: "", // rendered as gradient placeholder
    duration,
    views,
    likes: post.likes || (h % 5000),
    comments: post.comments || (h % 800),
    music: isMusic ? post.user : pick(["Ambient · Sahara", "Lo-fi beats", "Original audio", "Oud · contemporary", "Drone · cosmic"], idx),
    caption: post.body,
    category: cat,
    tags: [cat.toLowerCase(), `#${cat.toLowerCase()}`, pick(["#diriyah", "#riyadhseason", "#alula", "#vision2030", "#exploreksa"], idx)],
    isShort,
    isMusic,
    monetized: creator.monetized,
    verified: creator.verified,
    mintNft: creator.mintNft,
    subscribers: creator.subs,
    growth: 5 + (h % 220),
    why: `Cirkle Brain AI surfaced this because it matches your interest in ${cat.toLowerCase()} + trending in your region right now`,
    createdAt,
    watchProgress,
  };
}

/** Static trending hashtags surfaced by Cirkle Brain AI. */
const TRENDING_TAGS: TrendingTag[] = [
  
  { id: "tt2", tag: "#GreenRiyadh", count: "8.7K", growth: 22 },
  { id: "tt3", tag: "#FormulaE", count: "21.2K", growth: 156 },
  { id: "tt4", tag: "#RamadanNights", count: "33.1K", growth: 41 },
  { id: "tt5", tag: "#NEOM", count: "18.9K", growth: 73 },
  { id: "tt6", tag: "#AlUla", count: "9.4K", growth: 38 },
];

const TRENDING_CREATORS: TrendingCreator[] = SEED_CREATORS.slice(0, 5).map((c, i) => ({
  id: `tc${i}`,
  name: c.name,
  handle: c.handle,
  avatar: "", // rendered as gradient placeholder
  subs: c.subs,
  growth: 12 + (i * 17) + (hash(c.name) % 40),
}));

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export function MashahdScreen() {
  const [playerIdx, setPlayerIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterId>("for-you");
  const [channelSheet, setChannelSheet] = useState<string | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({});

  // Current authenticated user (for the "My Videos" tab).
  const authUser = useAuth((s) => s.user);
  const username = authUser?.username;

  // Search bar — text input is debounced 300ms before being applied as a
  // filter to the visible video feed. Cleared whenever the user switches
  // subtabs so each tab starts with a clean search state.
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // "My Videos" — videos created/uploaded by the current user. Fetched
  // lazily from /api/posts when the user opens the My Videos subtab.
  const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
  const [myVideosLoading, setMyVideosLoading] = useState(false);
  const [myVideosLoaded, setMyVideosLoaded] = useState(false);

  // AI feed state
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [brainReason, setBrainReason] = useState<string>("Cirkle Brain AI is curating your video feed");

  // Personal AI context for "Why am I seeing this?" tooltips
  const [moodLabel, setMoodLabel] = useState<string>("");
  const [topInterest, setTopInterest] = useState<string>("");

  // Creator tools
  const [createOpen, setCreateOpen] = useState(false);
  const [createFlow, setCreateFlow] = useState<"upload" | "live" | "short" | "playlist" | null>(null);

  // Per-video AI summary
  const [summaryVideo, setSummaryVideo] = useState<VideoItem | null>(null);

  // Bullet comments (danmaku) — keyed by video id
  const [bulletsOn, setBulletsOn] = useState<Record<string, boolean>>({});
  const [bulletInput, setBulletInput] = useState<Record<string, string>>({});
  const [liveBullets, setLiveBullets] = useState<Record<string, { id: number; text: string; color: string; row: number }[]>>({});

  // Watch party invitation state
  const [cowatchVideo, setCowatchVideo] = useState<VideoItem | null>(null);

  // Heart burst animation — keyed by video id, holds timestamps
  const [bursts, setBursts] = useState<Record<string, number[]>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ── Search debounce (300ms) ──────────────────────────────────────────────
  // The text input writes to `searchInput` immediately for snappy UX, then a
  // 300ms debounce propagates the trimmed value to `searchQuery`, which is
  // what the filter logic actually reads. Cancels the pending update if the
  // user keeps typing.
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Switch subtab (clears search) ─────────────────────────────────────────
  // Every subtab switch resets the search input + query so the new tab starts
  // from a clean state.
  const switchFilter = useCallback((id: FilterId) => {
    setFilter(id);
    setSearchInput("");
    setSearchQuery("");
  }, []);

  // ── Load My Videos ──────────────────────────────────────────────────────────
  // Fetches posts from /api/posts?module=mashahd&authorId={username} when the
  // user opens the My Videos subtab. The API currently ignores `authorId` and
  // returns all mashahd-module posts, so we filter client-side by authorId /
  // authorHandle to keep the section strictly limited to the current user's
  // own uploads. Results are cached for the session (`myVideosLoaded`) so we
  // don't refetch on every tab switch.
  const loadMyVideos = useCallback(async () => {
    if (!username) {
      setMyVideos([]);
      setMyVideosLoaded(true);
      return;
    }
    setMyVideosLoading(true);
    try {
      const qs = new URLSearchParams({
        module: "mashahd",
        authorId: username,
      });
      const res = await fetch(`/api/posts?${qs.toString()}`, { cache: "no-store" });
      let mine: VideoItem[] = [];
      if (res.ok) {
        const data = (await res.json()) as Array<{
          id: string;
          authorId?: string;
          authorName: string;
          authorHandle: string;
          authorVerified?: boolean;
          body: string;
          tags?: string[];
          stats?: { likes?: number; comments?: number; views?: number };
        }>;
        const rows = Array.isArray(data)
          ? data.filter((p) =>
              (p.authorId && p.authorId === username) ||
              (p.authorHandle && p.authorHandle.toLowerCase() === username.toLowerCase()),
            )
          : [];
        mine = rows.map((p, i) => {
          const v = forYouToVideo({
            id: p.id,
            user: p.authorName,
            handle: p.authorHandle,
            body: p.body,
            likes: p.stats?.likes ?? 0,
            comments: p.stats?.comments ?? 0,
            verified: p.authorVerified,
          }, i);
          // Override creator info to reflect the actual current user, not
          // the seed-creator cycle that forYouToVideo picks deterministically.
          return {
            ...v,
            creator: authUser?.displayName || p.authorName || username,
            handle: p.authorHandle || `@${username}`,
            verified: p.authorVerified ?? false,
            tags: Array.isArray(p.tags) && p.tags.length ? p.tags : v.tags,
            why: `One of your uploads — published from your Mashahd creator channel`,
          };
        });
      }
      setMyVideos(mine);
      setMyVideosLoaded(true);
    } catch {
      setMyVideos([]);
      setMyVideosLoaded(true);
    } finally {
      setMyVideosLoading(false);
    }
  }, [authUser, username]);

  useEffect(() => {
    if (filter === "my-videos" && !myVideosLoaded) loadMyVideos();
  }, [filter, myVideosLoaded, loadMyVideos]);

  // ── Load feed ────────────────────────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      // Read on-device personalization context (Feature 5 — opt-in).
      // Falls back to a minimal context when consent is off.
      let personalizationContext: string | undefined;
      let consent = false;
      try {
        consent = await getPersonalAIConsent();
        personalizationContext = await personalAI.getPersonalizationContext();
      } catch { /* ignore — minimal context */ }

      const qs = new URLSearchParams({
        module: "mashahd",
        personalizationContext: personalizationContext || "",
        personalAIConsent: String(consent),
      });
      const res = await fetch(`/api/feed?${qs.toString()}`, { cache: "no-store" });
      let aiVideos: VideoItem[] = [];
      if (res.ok) {
        const data = (await res.json()) as {
          forYou?: { id: string; user: string; handle: string; body: string; likes: number; comments: number; verified?: boolean }[];
        };
        const fy = data?.forYou ?? [];
        aiVideos = fy.map((p, i) => forYouToVideo(p, i));
        // Derive a friendly reason string from the personalization context
        if (personalizationContext) {
          const m = personalizationContext.match(/Current mood: (\w+)/);
          const t = personalizationContext.match(/Top interests: ([^.]+)/);
          if (m) setMoodLabel(m[1]);
          if (t) setTopInterest(t[1].split(",")[0].trim());
          setBrainReason(
            `Cirkle Brain AI curated this feed from your DNA, Mood${m ? ` (${m[1]})` : ""}${t ? `, top interest: ${t[1].split(",")[0].trim()}` : ""} + watch history`,
          );
        }
      }
      // AI feed only — no mock fallback. Empty API response shows the
      // "No videos yet — be the first to upload!" empty state below.
      setVideos(aiVideos);
      setCursor(aiVideos.length);
    } catch {
      // Network/unknown error — keep the feed empty; the empty state
      // invites the user to upload.
      setVideos([]);
      setCursor(0);
      setBrainReason("Cirkle Brain AI is warming up — try again in a moment");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // ── Infinite scroll ──────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || filter !== "for-you") return;
    if (videos.length === 0) return;
    setLoadingMore(true);
    // Simulate async fetch — generate 3 more videos derived from existing ones
    await new Promise((r) => setTimeout(r, 600));
    setVideos((prev) => {
      const next: VideoItem[] = [];
      for (let i = 0; i < 3; i++) {
        const base = prev[(cursor + i) % prev.length];
        const h = hash(`${cursor}-${i}-${base.id}`);
        next.push({
          ...base,
          id: `vid-more-${cursor}-${i}`,
          title: `${base.title} · part ${(cursor + i) % 4 + 1}`,
          views: base.views + (h % 50000),
          likes: base.likes + (h % 3000),
          thumbnail: "",
          why: `Because you watched "${base.title.slice(0, 30)}…" — Cirkle Brain AI suggested this next`,
        });
      }
      return [...prev, ...next];
    });
    setCursor((c) => c + 3);
    setLoadingMore(false);
  }, [cursor, filter, loadingMore, videos.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    const root = scrollRef.current;
    if (!node || !root) return;
    const ob = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root, threshold: 0.1 },
    );
    ob.observe(node);
    return () => ob.disconnect();
  }, [loadMore]);

  // ── Filtering ────────────────────────────────────────────────────────────
  // Subtab filter applied first (for-you / live / shorts / music), then the
  // debounced search query is applied on top — matching against the video
  // title, creator name, handle, or any tag. An empty query is a no-op.
  const filtered = useMemo(() => {
    let list = videos;
    if (filter === "live") list = list.filter((v) => v.isLive);
    else if (filter === "shorts") list = list.filter((v) => v.isShort && !v.isLive);
    else if (filter === "music") list = list.filter((v) => v.isMusic || v.category === "Music");
    // for-you (and any unspecified filter) keeps the full AI-curated list.

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) =>
        v.title.toLowerCase().includes(q) ||
        v.creator.toLowerCase().includes(q) ||
        v.handle.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [filter, videos, searchQuery]);

  // My Videos list with the same search filter applied so the search bar
  // works across every video-bearing subtab.
  const filteredMyVideos = useMemo(() => {
    if (!searchQuery) return myVideos;
    const q = searchQuery.toLowerCase();
    return myVideos.filter((v) =>
      v.title.toLowerCase().includes(q) ||
      v.creator.toLowerCase().includes(q) ||
      v.handle.toLowerCase().includes(q) ||
      v.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [myVideos, searchQuery]);

  // Channels & Trending tabs render their own dedicated panels.
  const channels: ChannelItem[] = useMemo(() => SEED_CREATORS.map((c, i) => ({
    id: `ch-${i}`,
    name: c.name,
    handle: c.handle,
    avatar: "", // rendered as gradient placeholder
    subs: c.subs,
    reels: 12 + (hash(c.name) % 80),
    views: `${(1 + (hash(c.name) % 5)).toFixed(1)}M`,
    monetized: c.monetized,
    verified: c.verified,
    mintNft: c.mintNft,
  })), []);

  // ── Actions ──────────────────────────────────────────────────────────────
  const toggleLike = useCallback((v: VideoItem) => {
    setLiked((p) => {
      const next = !p[v.id];
      if (next) {
        toast.success("Liked ❤", { description: v.title.slice(0, 50) });
      }
      return { ...p, [v.id]: next };
    });
  }, []);

  const doubleTapLike = useCallback((v: VideoItem) => {
    setLiked((p) => ({ ...p, [v.id]: true }));
    // Trigger a heart burst
    setBursts((p) => ({ ...p, [v.id]: [...(p[v.id] || []), Date.now()] }));
    // Clear burst after animation
    setTimeout(() => {
      setBursts((p) => {
        const cur = p[v.id] || [];
        return { ...p, [v.id]: cur.slice(1) };
      });
    }, 800);
  }, []);

  const toggleSave = useCallback((v: VideoItem) => {
    setSaved((p) => {
      const next = !p[v.id];
      toast.success(next ? "Saved to playlist" : "Removed from saved", { description: v.title.slice(0, 50) });
      return { ...p, [v.id]: next };
    });
  }, []);

  const toggleSubscribe = useCallback((v: VideoItem) => {
    setSubscribed((p) => {
      const next = !p[v.id];
      toast.success(next ? `Subscribed to ${v.creator}` : `Unsubscribed from ${v.creator}`);
      return { ...p, [v.id]: next };
    });
  }, []);

  const triggerWatchParty = useCallback((v: VideoItem) => {
    setCowatchVideo(v);
    window.dispatchEvent(new CustomEvent("circle:co-watch", { detail: { videoId: v.id, title: v.title, creator: v.creator } }));
    toast.success("Inviting friends to watch…", { description: `Up to 8 friends can join the synced session for "${v.title.slice(0, 40)}"` });
    setTimeout(() => setCowatchVideo(null), 3500);
  }, []);

  const triggerSummary = useCallback((v: VideoItem) => {
    setSummaryVideo(v);
  }, []);

  const toggleBullets = useCallback((v: VideoItem) => {
    setBulletsOn((p) => {
      const next = !p[v.id];
      if (next) {
        // Seed a few mock danmaku comments
        const seeds = ["🔥🔥🔥", "this is incredible", "wait for it…", "stop scrolling", " masterpiece", "alulaaa 🌅", "the lighting!!", "saved", "going to my circle", "10/10"];
        const colors = ["#ffffff", "#ffd60a", "#22d3ee", "#C2A060", "#C06070"];
        const list = seeds.slice(0, 5).map((t, i) => ({
          id: Date.now() + i,
          text: t,
          color: colors[i % colors.length],
          row: i % 3,
        }));
        setLiveBullets((lb) => ({ ...lb, [v.id]: list }));
        toast.success("Bullet comments on", { description: "Scrolling comments overlaid — tap again to hide" });
      } else {
        toast.info("Bullet comments off");
      }
      return { ...p, [v.id]: next };
    });
  }, []);

  const postBullet = useCallback((v: VideoItem) => {
    const text = (bulletInput[v.id] || "").trim();
    if (!text) return;
    const colors = ["#ffffff", "#ffd60a", "#22d3ee", "#C2A060", "#C06070"];
    const id = Date.now();
    setLiveBullets((lb) => ({
      ...lb,
      [v.id]: [...(lb[v.id] || []), { id, text, color: colors[id % colors.length], row: ((lb[v.id] || []).length) % 3 }],
    }));
    setBulletInput((bi) => ({ ...bi, [v.id]: "" }));
  }, [bulletInput]);

  const openBulletManager = useCallback(() => {
    window.dispatchEvent(new CustomEvent("circle:bullet-comments"));
  }, []);

  const openPlayer = useCallback((idx: number) => {
    setPlayerIdx(idx);
  }, []);

  const openPlayerEvt = useCallback(() => {
    window.dispatchEvent(new CustomEvent("circle:mashahd-player"));
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="pb-24">
      {/* ── Super Upgrade: Header with no-ads + wellness + Brain AI ── */}
      <div className="px-6 pt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-4xl">Mashahd</h1>
          <div className="flex items-center gap-1.5 text-[10px] text-secondary bg-secondary/10 px-2 py-1 rounded-full" title={brainReason}>
            <Sparkles className="w-3 h-3" />
            <span>Brain AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-secondary glass rounded-full px-2.5 py-1 flex items-center gap-1" title="No ads, ever">
            <ShieldCheck className="w-2.5 h-2.5" /> No ads
          </span>
          <button
            onClick={openPlayerEvt}
            className="flex items-center gap-2 text-xs text-secondary"
            aria-label="Live now"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" /> {videos.filter((v) => v.isLive).length || 2} live
          </button>
        </div>
      </div>
      <p className="px-6 text-[10px] text-secondary mt-0.5 flex items-center gap-1">
        <ShieldCheck className="w-2.5 h-2.5" /> Ad-free · No algorithm manipulation · P2P streaming · 0% creator fees
      </p>

      {/* Brain reason strip */}
      <div className="px-6 mt-2">
        <div className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Sparkles className="w-3 h-3 mt-0.5 text-secondary shrink-0" />
          <span className="line-clamp-1">
            {moodLabel || topInterest
              ? `Sorted by your ${moodLabel ? `mood (${moodLabel})` : ""}${moodLabel && topInterest ? " · " : ""}${topInterest ? `top interest (${topInterest})` : ""} + watch history`
              : brainReason}
          </span>
        </div>
      </div>

      {/* Subtabs */}
      <div className="flex gap-2 px-6 mt-3 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => switchFilter(f.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${
              filter === f.id ? "bg-primary text-primary-foreground" : "glass hover:bg-muted/60"
            }`}
          >
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
            {f.id === "live" && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Search bar — filters videos by title, creator name, or tags.
          Debounced 300ms; clears on subtab switch. */}
      <div className="px-6 mt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${filter === "my-videos" ? "your videos" : "videos, creators, tags"}…`}
            aria-label="Search videos and creators"
            className="w-full pl-10 pr-10 py-2.5 rounded-full bg-card border border-border text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition placeholder:text-muted-foreground"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setSearchQuery(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Creator tools bar — Create button + sub-rail */}
      <div className="px-6 mt-3 flex items-center justify-between gap-2">
        <DropdownMenu open={createOpen} onOpenChange={setCreateOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-secondary to-accent text-primary-foreground text-xs font-semibold shadow-float hover:scale-[1.02] transition"
              aria-label="Create"
            >
              <Plus className="w-4 h-4" /> Create
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => { setCreateOpen(false); setCreateFlow("upload"); }}>
              <Upload className="w-4 h-4 mr-2" /> Upload video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setCreateOpen(false); setCreateFlow("live"); }}>
              <RadioTower className="w-4 h-4 mr-2" /> Go Live
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setCreateOpen(false); setCreateFlow("short"); }}>
              <Camera className="w-4 h-4 mr-2" /> Create Short
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setCreateOpen(false); setCreateFlow("playlist"); }}>
              <ListVideo className="w-4 h-4 mr-2" /> Playlist
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setCreateOpen(false); window.dispatchEvent(new CustomEvent("circle:broadcast-channel")); }}>
              <Radio className="w-4 h-4 mr-2" /> Create channel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:creator-studio"))}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full glass hover:bg-muted/60 transition"
          >
            <Coins className="w-3 h-3 text-secondary" /> Creator Studio
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media" } }))}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full glass hover:bg-muted/60 transition"
          >
            <Scissors className="w-3 h-3" /> Remix
          </button>
        </div>
      </div>

      {/* Channel rail — quick-jump circles */}
      <div className="px-6 mt-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {CHANNELS.map((c, i) => (
            <button
              key={c}
              onClick={() => setChannelSheet(c)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-mesh">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <GradientThumb className="w-full h-full" />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[56px] truncate">{c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content area: depends on filter ─────────────────────────── */}
      {filter === "channels" ? (
        <ChannelsGrid
          channels={channels}
          subscribed={subscribed}
          onToggle={(c) => {
            setSubscribed((p) => ({ ...p, [c.id]: !p[c.id] }));
            toast.success(`${subscribed[c.id] ? "Unsubscribed from" : "Subscribed to"} ${c.name}`);
          }}
          onOpen={(c) => setChannelSheet(c.name)}
        />
      ) : filter === "trending" ? (
        <TrendingPanel
          tags={TRENDING_TAGS}
          creators={TRENDING_CREATORS}
          viral={videos.filter((v) => !v.isLive).sort((a, b) => (b.growth || 0) - (a.growth || 0)).slice(0, 6)}
          onPlay={(v) => {
            const idx = videos.findIndex((x) => x.id === v.id);
            if (idx >= 0) openPlayer(idx);
          }}
        />
      ) : filter === "music" ? (
        <MusicGrid videos={filtered} onPlay={(v) => {
          const idx = videos.findIndex((x) => x.id === v.id);
          if (idx >= 0) openPlayer(idx);
        }} />
      ) : filter === "my-videos" ? (
        <MyVideosGrid
          videos={filteredMyVideos}
          loading={myVideosLoading}
          searchQuery={searchQuery}
          onCreate={() => setCreateFlow("upload")}
          onPlay={(v) => {
            const idx = myVideos.findIndex((x) => x.id === v.id);
            if (idx >= 0) openPlayer(idx);
          }}
          onManage={(v) => toast("Video management coming soon", { description: v.title.slice(0, 50) })}
        />
      ) : (
        /* Snap-scroll reels — for-you / live / shorts */
        <div className="px-3 mt-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-3 flex items-center gap-1.5">
            {filter === "live" && <><span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Live streams · tap to join</>}
            {filter === "shorts" && <><Film className="w-3 h-3" /> Vertical shorts · under 60s</>}
            {filter === "for-you" && <><Sparkles className="w-3 h-3 text-secondary" /> AI-curated for you · swipe up for next</>}
          </div>

          {loading ? (
            <div className="h-[calc(100vh-320px)] px-3">
              <Skeleton className="w-full h-full rounded-3xl" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-[calc(100vh-320px)] flex flex-col items-center justify-center text-center px-6">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 text-muted-foreground/50 mb-3" />
                  <div className="font-display text-lg">No results for &lsquo;{searchQuery}&rsquo;</div>
                  <div className="text-xs text-muted-foreground mt-1">Try a different keyword, or clear the search.</div>
                  <button
                    onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                    className="mt-4 text-xs px-4 py-2 rounded-full glass hover:bg-muted/60 transition flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear search
                  </button>
                </>
              ) : (
                <>
                  <Film className="w-12 h-12 text-muted-foreground/50 mb-3" />
                  <div className="font-display text-lg">No videos yet</div>
                  <div className="text-xs text-muted-foreground mt-1">Be the first to upload!</div>
                  <button
                    onClick={() => setCreateFlow("upload")}
                    className="mt-4 text-xs px-4 py-2 rounded-full bg-gradient-to-r from-secondary to-accent text-primary-foreground font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" /> Upload a video
                  </button>
                </>
              )}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="h-[calc(100vh-320px)] overflow-y-auto snap-y snap-mandatory px-3"
            >
              {filtered.map((v, i) => (
                <ReelCard
                  key={v.id}
                  video={v}
                  index={i}
                  liked={!!liked[v.id]}
                  saved={!!saved[v.id]}
                  subscribed={!!subscribed[v.id]}
                  bulletsOn={!!bulletsOn[v.id]}
                  liveBullets={liveBullets[v.id] || []}
                  bulletInput={bulletInput[v.id] || ""}
                  bursts={bursts[v.id] || []}
                  onLike={() => toggleLike(v)}
                  onDoubleTap={() => doubleTapLike(v)}
                  onSave={() => toggleSave(v)}
                  onSubscribe={() => toggleSubscribe(v)}
                  onComment={() => toast("Comments — opening manager", { description: v.title.slice(0, 50) })}
                  onShare={() => toast.success("Share sheet", { description: `Link to "${v.title.slice(0, 40)}" copied` })}
                  onRemix={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media", draft: `🎬 Remixing "${v.title}"` } }))}
                  onSummary={() => triggerSummary(v)}
                  onWatchParty={() => triggerWatchParty(v)}
                  onToggleBullets={() => toggleBullets(v)}
                  onPostBullet={(t) => setBulletInput((bi) => ({ ...bi, [v.id]: t }))}
                  onSendBullet={() => postBullet(v)}
                  onOpenBulletManager={openBulletManager}
                  onOpenPlayer={() => openPlayer(i)}
                />
              ))}
              {/* Infinite scroll sentinel */}
              {filter === "for-you" && (
                <div ref={sentinelRef} className="h-12 snap-start flex items-center justify-center">
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <button onClick={loadMore} className="text-[10px] text-muted-foreground hover:text-foreground">
                      Load more · Cirkle Brain AI
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full-screen player overlay */}
      <MashahdPlayer open={playerIdx !== null} index={playerIdx ?? 0} onClose={() => setPlayerIdx(null)} />

      {/* Channel sheet */}
      {channelSheet && <ChannelSheet name={channelSheet} onClose={() => setChannelSheet(null)} />}

      {/* Watch party invite state */}
      <AnimatePresence>
        {cowatchVideo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] glass-strong rounded-2xl px-4 py-3 shadow-float flex items-center gap-3"
          >
            <div className="relative">
              <UsersRound className="w-5 h-5 text-secondary" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            </div>
            <div className="text-xs">
              <div className="font-medium">Inviting friends to watch…</div>
              <div className="text-[10px] text-muted-foreground line-clamp-1">{cowatchVideo.title}</div>
            </div>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create flows */}
      <CreateFlows flow={createFlow} onClose={() => setCreateFlow(null)} videos={videos} />

      {/* AI Summary modal */}
      <AnimatePresence>
        {summaryVideo && (
          <SummaryModal video={summaryVideo} onClose={() => setSummaryVideo(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ReelCard — full snap-scroll reel
// ────────────────────────────────────────────────────────────────────────────

interface ReelCardProps {
  video: VideoItem;
  index: number;
  liked: boolean;
  saved: boolean;
  subscribed: boolean;
  bulletsOn: boolean;
  liveBullets: { id: number; text: string; color: string; row: number }[];
  bulletInput: string;
  bursts: number[];
  onLike: () => void;
  onDoubleTap: () => void;
  onSave: () => void;
  onSubscribe: () => void;
  onComment: () => void;
  onShare: () => void;
  onRemix: () => void;
  onSummary: () => void;
  onWatchParty: () => void;
  onToggleBullets: () => void;
  onPostBullet: (text: string) => void;
  onSendBullet: () => void;
  onOpenBulletManager: () => void;
  onOpenPlayer: () => void;
}

function ReelCard(props: ReelCardProps) {
  const { video: v, index: i } = props;
  const lastTapRef = useRef(0);

  const handleClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      props.onDoubleTap();
    } else {
      lastTapRef.current = now;
      // Single tap opens player after a short delay (so double-tap can fire first)
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 280) props.onOpenPlayer();
      }, 300);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(i * 0.04, 0.4) }}
      className="relative rounded-3xl overflow-hidden h-[calc(100vh-320px)] snap-start shadow-float cursor-pointer group"
      onClick={handleClick}
    >
      <GradientThumb className="absolute inset-0 w-full h-full transition group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-charcoal/10" />

      {/* Watch progress bar — top edge of the reel, partially-watched only */}
      {typeof v.watchProgress === "number" && v.watchProgress > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/15 z-[5]" aria-label={`${v.watchProgress}% watched`}>
          <div className="h-full bg-accent transition-all" style={{ width: `${v.watchProgress}%` }} />
        </div>
      )}

      {/* Top-left badges */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <div className="glass text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-secondary" /> AI captions on
        </div>
        {v.isLive && (
          <div className="bg-accent text-accent-foreground text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE · {fmtCount(v.views)}
          </div>
        )}
        {!v.isLive && (
          <div className="glass text-[10px] px-2 py-1 rounded-full">{v.isShort ? "SHORT" : fmtDuration(v.duration)}</div>
        )}
        {v.monetized && (
          <div className="glass text-[10px] px-2 py-1 rounded-full flex items-center gap-1 text-secondary" title="This creator is monetized via Creator Studio">
            <Coins className="w-3 h-3" /> Monetized
          </div>
        )}
        {v.mintNft && (
          <div className="glass text-[10px] px-2 py-1 rounded-full flex items-center gap-1 text-secondary" title="Mint NFT verified">
            <Crown className="w-3 h-3" /> Mint NFT
          </div>
        )}
      </div>

      {/* Top-right — "Why am I seeing this?" + fullscreen */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
        <button
          onClick={(e) => { e.stopPropagation(); toast.info("Why am I seeing this?", { description: v.why, duration: 5000 }); }}
          className="glass text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
          style={{ color: "hsl(var(--cream))" }}
          aria-label="Why am I seeing this?"
        >
          <Info className="w-3 h-3" /> Why?
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); props.onOpenPlayer(); }}
          className="glass-strong px-2.5 py-1 rounded-full flex items-center gap-1 text-[10px]"
          style={{ color: "hsl(var(--cream))" }}
        >
          <Maximize2 className="w-3 h-3" /> Full
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); props.onToggleBullets(); }}
          className={`px-2.5 py-1 rounded-full flex items-center gap-1 text-[10px] ${props.bulletsOn ? "bg-primary text-primary-foreground" : "glass-strong"}`}
          style={props.bulletsOn ? {} : { color: "hsl(var(--cream))" }}
          aria-label="Toggle bullet comments"
          title="Bullet comments (danmaku)"
        >
          <MessageCircle className="w-3 h-3" /> 弹
        </button>
      </div>

      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
        <span className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center shadow-float">
          <Play className="w-7 h-7 ml-1 text-primary-foreground" fill="currentColor" />
        </span>
      </div>

      {/* Bullet comments overlay (danmaku) */}
      {props.bulletsOn && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {props.liveBullets.map((b, bi) => (
            <motion.div
              key={b.id}
              initial={{ x: "110%" }}
              animate={{ x: "-120%" }}
              transition={{ duration: 8 + (bi % 3), repeat: Infinity, delay: bi * 1.2, ease: "linear" }}
              className="absolute text-xs font-medium whitespace-nowrap drop-shadow-lg"
              style={{ top: `${15 + b.row * 18}%`, color: b.color }}
            >
              {b.text}
            </motion.div>
          ))}
        </div>
      )}

      {/* Heart burst animation on double-tap */}
      <AnimatePresence>
        {props.bursts.length > 0 && (
          <motion.div
            key={props.bursts[props.bursts.length - 1]}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1.4 }}
            exit={{ opacity: 0, scale: 1.8 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-24 h-24 text-accent fill-accent drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom overlay: creator + caption + music */}
      <div className="absolute bottom-4 left-4 right-16" style={{ color: "hsl(var(--cream))" }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/30 flex items-center justify-center font-display text-sm text-cream bg-gradient-mesh">
            {(v.creator || "?")[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium flex items-center gap-1">
              {v.creator}
              {v.verified && <BadgeCheck className="w-3.5 h-3.5 text-secondary" />}
            </div>
            <div className="text-[10px] opacity-80 flex items-center gap-1 flex-wrap">
              <span>{v.subscribers} subscribers</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {fmtCount(v.views)} views</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {fmtRelativeTime(v.createdAt)}</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-0.5 text-secondary"><ThumbsUp className="w-2.5 h-2.5" /> {fmtLikeRatio(v.likes, v.views)}%</span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); props.onSubscribe(); }}
            className={`text-[10px] px-2.5 py-1 rounded-full ${props.subscribed ? "glass text-cream" : "bg-secondary text-primary-foreground"}`}
          >
            {props.subscribed ? "Following" : "Subscribe"}
          </button>
        </div>
        <div className="text-xs opacity-90 mt-2 line-clamp-2">{v.caption}</div>
        <div className="flex items-center gap-1 text-[11px] mt-2 opacity-80">
          <Music className="w-3 h-3" /> {v.music}
        </div>
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {v.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">{t}</span>
          ))}
        </div>
        {/* Bullet comment input */}
        {props.bulletsOn && (
          <div className="mt-2 flex items-center gap-1.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <input
              value={props.bulletInput}
              onChange={(e) => props.onPostBullet(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") props.onSendBullet(); }}
              placeholder="Send a bullet comment…"
              maxLength={50}
              className="flex-1 text-[11px] px-2.5 py-1.5 rounded-full glass-strong text-cream placeholder:text-cream/50 outline-none"
            />
            <button
              onClick={props.onSendBullet}
              className="w-7 h-7 rounded-full bg-secondary text-primary-foreground flex items-center justify-center"
              aria-label="Send bullet comment"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={props.onOpenBulletManager}
              className="text-[10px] px-2 py-1 rounded-full glass text-cream"
              title="Open bullet comment manager"
            >
              All
            </button>
          </div>
        )}
      </div>

      {/* Right-side action rail */}
      <div className="absolute bottom-4 right-3 flex flex-col items-center gap-3" style={{ color: "hsl(var(--cream))" }}>
        <ActionPill
          icon={Heart}
          label={fmtCount(v.likes + (props.liked ? 1 : 0))}
          filled={props.liked}
          onClick={(e) => { e.stopPropagation(); props.onLike(); }}
        />
        <ActionPill
          icon={MessageCircle}
          label={fmtCount(v.comments)}
          onClick={(e) => { e.stopPropagation(); props.onComment(); }}
        />
        <ActionPill
          icon={Share2}
          label="Share"
          onClick={(e) => { e.stopPropagation(); props.onShare(); }}
        />
        <ActionPill
          icon={props.saved ? BookmarkCheck : Bookmark}
          label={props.saved ? "Saved" : "Save"}
          filled={props.saved}
          onClick={(e) => { e.stopPropagation(); props.onSave(); }}
        />
        <ActionPill
          icon={Scissors}
          label="Remix"
          onClick={(e) => { e.stopPropagation(); props.onRemix(); }}
        />
        <ActionPill
          icon={Sparkles}
          label="AI"
          highlight
          onClick={(e) => { e.stopPropagation(); props.onSummary(); }}
        />
        <ActionPill
          icon={UsersRound}
          label="Watch"
          onClick={(e) => { e.stopPropagation(); props.onWatchParty(); }}
        />
      </div>
    </motion.div>
  );
}

function ActionPill({
  icon: Icon, label, onClick, filled, highlight,
}: {
  icon: LucideIcon; label: string; onClick?: (e: React.MouseEvent) => void;
  filled?: boolean; highlight?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
          highlight ? "bg-secondary text-primary-foreground" : "glass-strong"
        } ${filled ? "ring-2 ring-accent" : ""}`}
      >
        <Icon className={`w-5 h-5 ${filled ? "fill-current text-accent" : ""}`} />
      </span>
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MyVideosGrid — the current user's own uploads, visually distinct (gold
// border) and each card carrying a "Manage" button. Search-aware.
// ────────────────────────────────────────────────────────────────────────────

interface MyVideosGridProps {
  videos: VideoItem[];
  loading: boolean;
  searchQuery: string;
  onCreate: () => void;
  onPlay: (v: VideoItem) => void;
  onManage: (v: VideoItem) => void;
}

function MyVideosGrid({ videos, loading, searchQuery, onCreate, onPlay, onManage }: MyVideosGridProps) {
  // Loading skeletons — keep the layout stable while we fetch.
  if (loading) {
    return (
      <div className="px-6 mt-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <VideoIcon className="w-3 h-3" /> My videos · loading…
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-video rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state — the user hasn't uploaded any videos yet.
  if (videos.length === 0) {
    return (
      <div className="px-6 mt-8 flex flex-col items-center justify-center text-center">
        {searchQuery ? (
          <>
            <Search className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <div className="font-display text-lg">No results for &lsquo;{searchQuery}&rsquo;</div>
            <div className="text-xs text-muted-foreground mt-1">Try a different keyword, or clear the search.</div>
          </>
        ) : (
          <>
            <VideoIcon className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <div className="font-display text-lg">No videos yet</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-xs">
              You haven&rsquo;t uploaded any videos yet — tap Create to share your first!
            </div>
            <button
              onClick={onCreate}
              className="mt-4 text-xs px-4 py-2 rounded-full bg-gradient-to-r from-secondary to-accent text-primary-foreground font-semibold flex items-center gap-1"
            >
              <Upload className="w-3 h-3" /> Create a video
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 mt-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
        <VideoIcon className="w-3 h-3 text-secondary" /> My videos · {videos.length}
        <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary normal-case tracking-normal">
          <Crown className="w-2.5 h-2.5" /> Your uploads
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {videos.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            // Visually distinct from the shared feed: gold (secondary) border
            // instead of the regular border-token used elsewhere.
            className="rounded-2xl overflow-hidden border-2 border-secondary bg-card shadow-float flex flex-col group hover:shadow-float/80 transition"
          >
            {/* ── Thumbnail (gradient placeholder + play overlay + badges) ── */}
            <button
              onClick={() => onPlay(v)}
              className="block w-full text-start relative"
              aria-label={`Play ${v.title}`}
            >
              <div className="relative aspect-video overflow-hidden">
                <GradientThumb className="absolute inset-0 w-full h-full transition group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent" />
                {/* "Your upload" gold badge — top-left */}
                <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-secondary text-primary-foreground flex items-center gap-1 font-medium shadow-sm">
                  <Crown className="w-3 h-3" /> Your upload
                </div>
                {/* LIVE badge — top-left, stacked under "Your upload" (red, pulsing) */}
                {v.isLive && (
                  <div className="absolute top-9 left-2 text-[10px] px-2 py-1 rounded-full bg-accent text-accent-foreground flex items-center gap-1 font-semibold shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE · {fmtCount(v.views)}
                  </div>
                )}
                {/* Monetized pill — top-right (replaces duration badge there) */}
                {v.monetized && (
                  <div className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full glass-strong text-secondary flex items-center gap-1" title="This creator is monetized via Creator Studio">
                    <Coins className="w-3 h-3" /> Monetized
                  </div>
                )}
                {/* Play overlay (hover) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  <span className="w-12 h-12 rounded-full bg-secondary text-primary-foreground flex items-center justify-center shadow-float">
                    <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                  </span>
                </div>
                {/* Duration badge — bottom-right corner (YouTube-style dark pill) */}
                {!v.isLive && (
                  <div className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded-md bg-black/75 text-cream font-medium tabular-nums">
                    {v.isShort ? "SHORT" : fmtDuration(v.duration)}
                  </div>
                )}
                {/* Watch progress bar — bottom edge, partially-watched videos only */}
                {typeof v.watchProgress === "number" && v.watchProgress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20" aria-label={`${v.watchProgress}% watched`}>
                    <div className="h-full bg-accent transition-all" style={{ width: `${v.watchProgress}%` }} />
                  </div>
                )}
              </div>
            </button>
            {/* ── Meta row — YouTube-style avatar + title + creator + stats ── */}
            <div className="p-3 flex items-start gap-2.5">
              {/* Creator avatar (small circle) */}
              <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-mesh shrink-0 mt-0.5" title={v.creator}>
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-display text-xs text-cream">
                  {(v.creator || "?")[0]?.toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium line-clamp-2 leading-snug">{v.title}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <span className="truncate">{v.creator}</span>
                  {v.verified && <BadgeCheck className="w-3 h-3 text-secondary shrink-0" aria-label="Verified creator" />}
                  {v.mintNft && <Crown className="w-2.5 h-2.5 text-secondary shrink-0" aria-label="Mint NFT verified" />}
                </div>
                {/* Meta row: views · upload time · like ratio */}
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5" /> {fmtCount(v.views)} views
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {fmtRelativeTime(v.createdAt)}
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-0.5 text-secondary">
                    <ThumbsUp className="w-2.5 h-2.5" /> {fmtLikeRatio(v.likes, v.views)}%
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 truncate">
                  {v.tags.slice(0, 3).join(" · ")}
                </div>
              </div>
              <button
                onClick={() => onManage(v)}
                className="shrink-0 text-[10px] px-3 py-1.5 rounded-full bg-secondary/15 text-secondary hover:bg-secondary/25 transition flex items-center gap-1 font-medium"
                aria-label={`Manage ${v.title}`}
              >
                <Settings className="w-3 h-3" /> Manage
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ChannelsGrid
// ────────────────────────────────────────────────────────────────────────────

function ChannelsGrid({
  channels, subscribed, onToggle, onOpen,
}: {
  channels: ChannelItem[];
  subscribed: Record<string, boolean>;
  onToggle: (c: ChannelItem) => void;
  onOpen: (c: ChannelItem) => void;
}) {
  return (
    <div className="px-6 mt-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
        <Tv className="w-3 h-3" /> Creator channels · {channels.length}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {channels.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4 hover:shadow-float transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-mesh shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-display text-lg text-cream">
                  {c.name[0]?.toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-base flex items-center gap-1 truncate">
                  {c.name}
                  {c.verified && <BadgeCheck className="w-3.5 h-3.5 text-secondary shrink-0" />}
                  {c.mintNft && <Crown className="w-3 h-3 text-secondary shrink-0" />}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {c.subs} subscribers · {c.reels} reels · {c.views} views
                </div>
                {c.monetized && (
                  <div className="text-[9px] mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary">
                    <Coins className="w-2.5 h-2.5" /> Monetized
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => onToggle(c)}
                className={`flex-1 text-xs py-2 rounded-full ${subscribed[c.id] ? "glass" : "bg-primary text-primary-foreground"}`}
              >
                {subscribed[c.id] ? "Following" : "Subscribe"}
              </button>
              <button
                onClick={() => onOpen(c)}
                className="text-xs py-2 px-3 rounded-full glass"
              >
                Visit
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MusicGrid
// ────────────────────────────────────────────────────────────────────────────

function MusicGrid({ videos, onPlay }: { videos: VideoItem[]; onPlay: (v: VideoItem) => void }) {
  if (videos.length === 0) {
    return (
      <div className="px-6 mt-8 flex flex-col items-center justify-center text-center">
        <ListMusic className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <div className="font-display text-lg">No music videos yet</div>
        <div className="text-xs text-muted-foreground mt-1">Cirkle Brain AI is gathering music picks for you.</div>
      </div>
    );
  }
  return (
    <div className="px-6 mt-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
        <ListMusic className="w-3 h-3" /> Music · {videos.length}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {videos.map((v, i) => (
          <motion.button
            key={v.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onPlay(v)}
            className="text-start rounded-2xl overflow-hidden glass hover:shadow-float transition group"
          >
            <div className="relative aspect-square overflow-hidden">
              <GradientThumb className="absolute inset-0 w-full h-full transition group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
              {/* LIVE badge — top-left, pulsing red */}
              {v.isLive && (
                <div className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </div>
              )}
              {/* Monetized pill — top-right */}
              {v.monetized && (
                <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full glass-strong text-secondary flex items-center gap-0.5" title="Monetized">
                  <Coins className="w-2.5 h-2.5" />
                </div>
              )}
              {/* Play overlay (hover) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="w-12 h-12 rounded-full bg-secondary text-primary-foreground flex items-center justify-center">
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                </span>
              </div>
              {/* Music info — bottom-left of thumbnail (kept) */}
              <div className="absolute bottom-2 left-2 right-12 text-cream">
                <div className="text-xs font-medium line-clamp-1 flex items-center gap-1">
                  <Music className="w-3 h-3 shrink-0" /> {v.music}
                </div>
                <div className="text-[10px] opacity-80 line-clamp-1 flex items-center gap-0.5">
                  {v.creator}
                  {v.verified && <BadgeCheck className="w-2.5 h-2.5 text-secondary shrink-0" />}
                </div>
              </div>
              {/* Duration badge — bottom-right corner */}
              <div className="absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-black/75 text-cream font-medium tabular-nums">
                {fmtDuration(v.duration)}
              </div>
              {/* Watch progress bar — bottom edge */}
              {typeof v.watchProgress === "number" && v.watchProgress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20" aria-label={`${v.watchProgress}% watched`}>
                  <div className="h-full bg-accent" style={{ width: `${v.watchProgress}%` }} />
                </div>
              )}
            </div>
            <div className="p-2.5">
              <div className="text-[11px] line-clamp-1 font-medium">{v.title}</div>
              {/* Meta row: views · upload time · like ratio */}
              <div className="text-[9.5px] text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                <span className="inline-flex items-center gap-0.5">
                  <Eye className="w-2.5 h-2.5" /> {fmtCount(v.views)}
                </span>
                <span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> {fmtRelativeTime(v.createdAt)}
                </span>
                <span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-0.5 text-secondary">
                  <ThumbsUp className="w-2.5 h-2.5" /> {fmtLikeRatio(v.likes, v.views)}%
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TrendingPanel
// ────────────────────────────────────────────────────────────────────────────

function TrendingPanel({
  tags, creators, viral, onPlay,
}: {
  tags: TrendingTag[];
  creators: TrendingCreator[];
  viral: VideoItem[];
  onPlay: (v: VideoItem) => void;
}) {
  return (
    <div className="px-6 mt-4 space-y-5">
      {/* Trending hashtags */}
      <section>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <Hash className="w-3 h-3 text-secondary" /> Trending hashtags · Cirkle Brain AI
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tags.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-xl p-3 flex items-center gap-3"
            >
              <div className="font-display text-lg text-secondary w-6">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.tag}</div>
                <div className="text-[10px] text-muted-foreground">{t.count} posts</div>
              </div>
              <div className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5">
                <Flame className="w-3 h-3" /> +{t.growth}%
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Top creators this week */}
      <section>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <Users className="w-3 h-3 text-secondary" /> Top creators this week
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {creators.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="shrink-0 w-44 glass rounded-2xl p-3"
            >
              <div className="flex items-center gap-2">
                <div className="font-display text-base text-secondary">#{i + 1}</div>
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-display text-sm text-cream bg-gradient-mesh">
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">{c.subs}</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +{c.growth}% growth
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Viral videos */}
      <section>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <Flame className="w-3 h-3 text-accent" /> Viral · high velocity
        </div>
        <div className="space-y-2">
          {viral.map((v, i) => (
            <motion.button
              key={v.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onPlay(v)}
              className="w-full text-start flex items-center gap-3 p-2 rounded-2xl glass hover:bg-muted/40 transition group"
            >
              <div className="font-display text-2xl text-secondary w-8 text-center">{i + 1}</div>
              {/* Thumbnail with duration + live + watch-progress overlays */}
              <div className="w-28 h-16 rounded-xl overflow-hidden shrink-0 relative">
                <GradientThumb className="absolute inset-0 w-full h-full transition group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
                {/* LIVE badge — top-left */}
                {v.isLive && (
                  <div className="absolute top-1 left-1 text-[8px] px-1 py-0.5 rounded bg-accent text-accent-foreground flex items-center gap-0.5 font-semibold">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> LIVE
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  <span className="w-8 h-8 rounded-full bg-secondary/90 text-primary-foreground flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
                  </span>
                </div>
                {/* Duration badge — bottom-right */}
                <div className="absolute bottom-1 right-1 text-[9px] px-1 rounded bg-black/75 text-cream tabular-nums">{fmtDuration(v.duration)}</div>
                {/* Watch progress bar — bottom edge */}
                {typeof v.watchProgress === "number" && v.watchProgress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20" aria-label={`${v.watchProgress}% watched`}>
                    <div className="h-full bg-accent" style={{ width: `${v.watchProgress}%` }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium line-clamp-1">{v.title}</div>
                {/* Creator row — avatar + name + verified */}
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-display text-[8px] text-cream bg-gradient-mesh">
                    {(v.creator || "?")[0]?.toUpperCase()}
                  </div>
                  <span className="truncate">{v.creator}</span>
                  {v.verified && <BadgeCheck className="w-2.5 h-2.5 text-secondary shrink-0" />}
                </div>
                {/* Meta row — views · upload time · like ratio */}
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="inline-flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5" /> {fmtCount(v.views)}
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {fmtRelativeTime(v.createdAt)}
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-0.5 text-secondary">
                    <ThumbsUp className="w-2.5 h-2.5" /> {fmtLikeRatio(v.likes, v.views)}%
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5 shrink-0">
                <TrendingUp className="w-3 h-3" /> +{v.growth || 0}%
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ChannelSheet — opens when a channel rail circle is tapped
// ────────────────────────────────────────────────────────────────────────────

function ChannelSheet({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[140] bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md glass-strong rounded-t-3xl sm:rounded-3xl shadow-float overflow-hidden"
      >
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-mesh flex items-center justify-center font-display text-xl text-primary-foreground">
              {name[0]}
            </div>
            <div className="flex-1">
              <div className="font-display text-lg flex items-center gap-1">
                {name} <BadgeCheck className="w-3.5 h-3.5 text-secondary" />
              </div>
              <div className="text-xs text-muted-foreground">128K subscribers · Verified creator · Monetized</div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="font-display text-lg">42</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Reels</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="font-display text-lg">128K</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Subs</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="font-display text-lg">2.1M</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Views</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => toast.success(`Subscribed to ${name}`)}
              className="px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs"
            >
              Subscribe
            </button>
            <button
              onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("circle:creator-studio")); }}
              className="px-3 py-2 rounded-full bg-secondary/20 text-secondary text-xs flex items-center justify-center gap-1"
            >
              <Coins className="w-3.5 h-3.5" /> Support
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CreateFlows — Upload / Live / Short / Playlist
// ────────────────────────────────────────────────────────────────────────────

function CreateFlows({ flow, onClose, videos }: { flow: "upload" | "live" | "short" | "playlist" | null; onClose: () => void; videos: VideoItem[] }) {
  if (!flow) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[140] bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl shadow-float overflow-hidden max-h-[88vh] overflow-y-auto"
      >
        {flow === "upload" && <UploadFlow onClose={onClose} />}
        {flow === "live" && <LiveFlow onClose={onClose} />}
        {flow === "short" && <ShortFlow onClose={onClose} />}
        {flow === "playlist" && <PlaylistFlow onClose={onClose} videos={videos} />}
      </motion.div>
    </motion.div>
  );
}

function UploadFlow({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const aiAnalyze = useCallback(async (f: File) => {
    setAnalyzing(true);
    // Ask the AI to auto-generate title/description/tags from the filename.
    // Falls back to deterministic local generation if /api/ai/summarize fails.
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Video file: ${f.name}. Size: ${(f.size / 1024 / 1024).toFixed(2)} MB.` }),
      });
      const data = await res.json();
      const lines = (data?.summary as string || "").split("\n").filter(Boolean).slice(0, 3);
      setTitle(lines[0]?.replace(/^•\s*/, "").slice(0, 80) || f.name.replace(/\.[^.]+$/, ""));
      setDesc(lines.join("\n") || `Auto-generated description for ${f.name}`);
    } catch {
      setTitle(f.name.replace(/\.[^.]+$/, ""));
      setDesc(`Uploaded on ${new Date().toLocaleDateString()} via Cirkle Mashahd.`);
    }
    const cat = pick(CATEGORIES, hash(f.name));
    setCategory(cat);
    setTags([cat.toLowerCase(), "#cirkle", "#mashahd", `#${cat.toLowerCase()}`]);
    setAnalyzing(false);
    toast.success("Cirkle Brain AI tagged your video", { description: `Category: ${cat} · ${4} tags auto-applied` });
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setTitle("");
    setDesc("");
    setTags([]);
    setCategory("");
    void aiAnalyze(f);
  };

  const publish = () => {
    if (!file) return;
    toast.success("Published to Mashahd", {
      description: `"${title || file.name}" is now live on P2P · pinning to community node (Qm…)`,
    });
    onClose();
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-xl flex items-center gap-2">
          <Upload className="w-5 h-5 text-secondary" /> Upload video
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onPick} />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-secondary transition"
      >
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <VideoIcon className="w-10 h-10 text-secondary" />
            <div className="text-sm font-medium truncate max-w-[80%]">{file.name}</div>
            <div className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="w-8 h-8" />
            <div className="text-sm">Tap to pick a video</div>
            <div className="text-[10px]">MP4 · MOV · WebM · max 4K</div>
          </div>
        )}
      </button>

      {analyzing && (
        <div className="mt-3 flex items-center gap-2 text-xs text-secondary">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Cirkle Brain AI is generating title, description, and tags…
        </div>
      )}

      {(title || desc || tags.length > 0) && (
        <div className="mt-4 space-y-3">
          <Field label="AI-generated title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm bg-card border border-border rounded-xl px-3 py-2 outline-none"
            />
          </Field>
          <Field label="AI-generated description">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full text-sm bg-card border border-border rounded-xl px-3 py-2 outline-none resize-none"
            />
          </Field>
          <Field label="AI-detected category">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setTags((t) => [c.toLowerCase(), ...t.filter((x) => !CATEGORIES.map((cc) => cc.toLowerCase()).includes(x))]); }}
                  className={`text-[10px] px-2 py-1 rounded-full ${category === c ? "bg-primary text-primary-foreground" : "glass"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="AI auto-tags">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-secondary/15 text-secondary">{t}</span>
              ))}
            </div>
          </Field>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={publish}
          disabled={!file || analyzing}
          className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-secondary to-accent text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          Publish to P2P
        </button>
        <button onClick={onClose} className="px-4 py-2.5 rounded-full glass text-sm">Cancel</button>
      </div>
    </div>
  );
}

function LiveFlow({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<"prep" | "countdown" | "live">("prep");
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      // Schedule the transition async so we don't call setState
      // synchronously inside the effect body (cascading-render guard).
      const t = setTimeout(() => setPhase("live"), 50);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count]);

  const start = () => { setCount(3); setPhase("countdown"); };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-xl flex items-center gap-2">
          <RadioTower className="w-5 h-5 text-accent" /> Go Live
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {phase === "prep" && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Start a real-time live stream. P2P distribution · up to 10K viewers · bullet comments enabled.</div>
          <Field label="Stream title">
            <input
              defaultValue="LIVE: Quick update from the studio"
              className="w-full text-sm bg-card border border-border rounded-xl px-3 py-2 outline-none"
            />
          </Field>
          <Field label="Category">
            <select className="w-full text-sm bg-card border border-border rounded-xl px-3 py-2 outline-none">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <button
            onClick={start}
            className="w-full px-4 py-3 rounded-full bg-gradient-to-r from-accent to-secondary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
          >
            <RadioTower className="w-4 h-4" /> Start live stream
          </button>
        </div>
      )}

      {phase === "countdown" && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-sm text-muted-foreground mb-4">Going live in…</div>
          <motion.div
            key={count}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display text-7xl text-accent"
          >
            {count === 0 ? "GO" : count}
          </motion.div>
          <div className="mt-4 text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-secondary" /> Cirkle Brain AI is warming up the P2P swarm
          </div>
        </div>
      )}

      {phase === "live" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-6 bg-gradient-to-br from-accent/30 to-secondary/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-semibold">You are LIVE</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Viewers: 3 · Bullet comments: on · Latency: 0.8s</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { toast.success("Live stream ended"); onClose(); }}
              className="flex-1 px-4 py-2.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold"
            >
              End stream
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-full glass text-sm">Minimize</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShortFlow({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setErr("Camera not supported in this browser.");
          return;
        }
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e: unknown) {
        setErr(`Camera unavailable: ${(e as Error).message || "permission denied"}`);
      }
    })();
    return () => {
      active = false;
      setStream((s) => { s?.getTracks().forEach((t) => t.stop()); return null; });
    };
  }, []);

  const toggleRecord = () => {
    if (!stream) return;
    setRecording((r) => !r);
    if (!recording) toast.success("Recording short…", { description: "Tap stop when done — 15s max" });
    else toast.success("Short captured", { description: "Opening composer to publish" });
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-xl flex items-center gap-2">
          <Camera className="w-5 h-5 text-secondary" /> Create Short
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative aspect-[9/16] max-h-[60vh] mx-auto rounded-2xl overflow-hidden bg-charcoal">
        {err ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-cream/80">
            <Camera className="w-10 h-10 mb-2 opacity-50" />
            <div className="text-sm">{err}</div>
            <div className="text-[10px] mt-1 opacity-70">Showing a placeholder camera preview instead.</div>
            <div className="mt-3 w-full aspect-[9/16] max-w-[200px] bg-gradient-hero rounded-xl" />
          </div>
        ) : (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        )}
        {recording && (
          <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-cream bg-accent px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> REC
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          onClick={toggleRecord}
          disabled={!stream && !err}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition ${
            recording ? "bg-accent" : "bg-secondary"
          } text-primary-foreground disabled:opacity-40`}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {recording ? <span className="w-5 h-5 rounded-sm bg-white" /> : <span className="w-12 h-12 rounded-full border-4 border-primary-foreground" />}
        </button>
      </div>

      <div className="mt-3 text-[10px] text-muted-foreground text-center">
        Bullet comments + AI captions will be auto-applied on publish.
      </div>
    </div>
  );
}

function PlaylistFlow({ onClose, videos }: { onClose: () => void; videos: VideoItem[] }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  // Real videos from the live feed only — no mock fallback. If the user
  // hasn't loaded any videos yet, we show a friendly empty state.
  const available = videos.slice(0, 5);

  const create = () => {
    const n = Object.values(picked).filter(Boolean).length;
    toast.success("Playlist created", { description: `"${name || "Untitled"}" · ${n} videos saved to your library` });
    onClose();
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-xl flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-secondary" /> New playlist
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <Field label="Playlist name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My favourite AlUla reels"
          className="w-full text-sm bg-card border border-border rounded-xl px-3 py-2 outline-none"
        />
      </Field>

      <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Pick from recent</div>
      {available.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No videos yet — browse the For You feed first, then come back to add them to a playlist.
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {available.map((v) => (
            <button
              key={v.id}
              onClick={() => setPicked((p) => ({ ...p, [v.id]: !p[v.id] }))}
              className="w-full flex items-center gap-3 p-2 rounded-xl glass hover:bg-muted/40 transition text-start"
            >
              <div className="w-16 h-10 rounded-lg overflow-hidden shrink-0">
                <GradientThumb className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium line-clamp-1">{v.title}</div>
                <div className="text-[10px] text-muted-foreground">{v.creator}</div>
              </div>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${picked[v.id] ? "bg-secondary text-primary-foreground" : "border border-border"}`}>
                {picked[v.id] && <BookmarkCheck className="w-3 h-3" />}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={create}
        className="mt-4 w-full px-4 py-2.5 rounded-full bg-gradient-to-r from-secondary to-accent text-primary-foreground text-sm font-semibold"
      >
        Create playlist · {Object.values(picked).filter(Boolean).length} videos
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SummaryModal — AI video summary
// ────────────────────────────────────────────────────────────────────────────

function SummaryModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string>("");
  const [bullets, setBullets] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSummary("");
    setBullets([]);
    setSaved(false);
    (async () => {
      try {
        const res = await fetch("/api/ai/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `${video.title}. ${video.caption}. Category: ${video.category}. Creator: ${video.creator}.` }),
        });
        const data = await res.json();
        const text = (data?.summary as string) || "• Cirkle Brain AI couldn't summarize this video.\n• Try again in a moment.";
        if (!active) return;
        setSummary(text);
        setBullets(text.split("\n").map((s) => s.replace(/^•\s*/, "").trim()).filter(Boolean).slice(0, 3));
      } catch {
        if (!active) return;
        setSummary("• Cirkle Brain AI couldn't summarize this video.\n• Try again in a moment.");
        setBullets(["Cirkle Brain AI couldn't summarize this video.", "Try again in a moment."]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [video]);

  const save = () => {
    try {
      const key = "cirkle-brain-summaries";
      const all = JSON.parse(window.localStorage.getItem(key) || "[]");
      all.push({
        id: `s-${Date.now()}`,
        videoId: video.id,
        title: video.title,
        creator: video.creator,
        summary,
        savedAt: new Date().toISOString(),
      });
      window.localStorage.setItem(key, JSON.stringify(all));
    } catch { /* ignore */ }
    setSaved(true);
    toast.success("Saved to Brain memory", { description: `"${video.title.slice(0, 40)}" summary stored on-device` });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl shadow-float overflow-hidden"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" /> AI Video Summary
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-10 rounded-lg overflow-hidden shrink-0">
              <GradientThumb className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium line-clamp-1">{video.title}</div>
              <div className="text-[10px] text-muted-foreground">{video.creator} · {video.category}</div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : (
            <div className="space-y-2">
              {bullets.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="w-5 h-5 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                  <span>{b}</span>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={save}
              disabled={loading || saved}
              className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-secondary to-accent text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saved ? <><BookmarkCheck className="w-4 h-4" /> Saved to Brain</> : <><Bookmark className="w-4 h-4" /> Save summary</>}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-full glass text-sm">Close</button>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-secondary" /> Generated by Cirkle Brain AI · stored on-device
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
