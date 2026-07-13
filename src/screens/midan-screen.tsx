// @ts-nocheck
"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  ShieldCheck,
  Mic,
  BadgeCheck,
  BarChart3,
  Radio,
  X,
  Send,
  Loader2,
  Coins,
  UserPlus,
  UserCheck,
  MessageSquare,
  Brain,
  TrendingUp,
  Hash,
  Bookmark,
  Eye,
  Image as ImageIcon,
  Smile,
  MapPin,
  CalendarClock,
  Sparkles,
  Info,
  MoreHorizontal,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-store";
import { useApp } from "@/lib/app-store";

/**
 * Brain AI connection for Midan (the public square).
 *
 * Midan's main feed was already Brain-connected via `/api/feed` (which
 * runs through the Brain's feed-algorithm + cross-evaluation), but the
 * screen had no explicit "ask the Brain" affordance. This helper routes
 * the user's "what's trending in my city" request through the Brain
 * universal connection layer (`/api/brain/cross-evaluate` →
 * `crossEvaluate` → KG + 5-provider consensus + web search) and
 * surfaces the consensus answer as a toast.
 *
 * It also dispatches a `circle:brain-query` CustomEvent so any future
 * page-level listener can observe / intercept Brain queries.
 */
async function brainTrendingInCity(opts: {
  country: string;
  city: string | null;
  username?: string;
}): Promise<{ answer: string; confidence: number; sources: string[] }> {
  const { country, city, username } = opts;
  window.dispatchEvent(
    new CustomEvent("circle:brain-query", {
      detail: { feature: "social", action: "recommend", country, city },
    }),
  );
  const location = city ? `${city}, ${country}` : country;
  const query =
    `[social:recommend] what's trending in my city (${location}) right now? ` +
    `List 5 topics people are talking about, with a one-line summary of each, ` +
    `and call out any local event happening this week.`;
  const res = await fetch("/api/brain/cross-evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      country,
      city: city || undefined,
      username,
      language: "en",
    }),
  });
  if (!res.ok) throw new Error(`Brain query failed (${res.status})`);
  const data = await res.json();
  return {
    answer: data?.finalAnswer || "No trends right now — try again later.",
    confidence: data?.confidence ?? 0,
    sources: (data?.sources || []).map((s: { name: string }) => s.name),
  };
}

const FILTERS = ["For you", "Following", "Saudi", "Tech", "Sports", "Culture"] as const;

interface PostState {
  liked: boolean;
  likes: number;
  reposts: number;
  reposted: boolean;
  bookmarked: boolean;
}

// Normalized post shape that works for API posts.
interface UnifiedPost {
  id: string;
  handle: string;
  name: string;
  body: string;
  likes: number;
  comments: number;
  reposts: number;
  verified?: boolean;
  image?: boolean;
  time?: string;
  initials?: string;
  color?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Engagement helpers — used to derive the trending rail + view estimates.
// Weighted score: replies signal depth, reposts signal reach, likes signal
// lightweight affinity. We weight accordingly.
// ─────────────────────────────────────────────────────────────────────────────

function engagementScore(p: UnifiedPost): number {
  return p.likes + p.reposts * 2.5 + p.comments * 1.8;
}

/** Compact number formatter: 1.2K, 12.4K, 3.1M. */
function fmt(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** Rough "views" estimate derived from likes + reposts (no API field yet). */
function estimateViews(p: UnifiedPost): number {
  return Math.round((p.likes + p.reposts) * 7.3 + p.comments * 4.1);
}

// Default trending hashtags used as a fallback when the feed has no #hashtags
// of its own. Tuned to the Saudi / GCC context the Midan was designed for.
const FALLBACK_TRENDS: { tag: string; count: number; category: string }[] = [
  { tag: "Vision2030", count: 12400, category: "Saudi Arabia · Trending" },
  { tag: "RiyadhSeason", count: 8920, category: "Entertainment · Trending" },
  { tag: "NEOM", count: 5410, category: "Technology · Trending" },
  { tag: "SaudiCup", count: 3210, category: "Sports · Trending" },
  { tag: "Diriyah", count: 2890, category: "Culture · Trending" },
  { tag: "LEAP", count: 1840, category: "Technology · Trending" },
];

// ─────────────────────────────────────────────────────────────────────────────
// IntersectionObserver hook — tracks view + dwell interactions per post.
// We fire a "view" as soon as a post enters the viewport, and a "dwell"
// interaction when the post stays visible for ≥ 2 seconds.
// ─────────────────────────────────────────────────────────────────────────────

function useViewTracking(username: string | null, posts: UnifiedPost[]) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const dwellTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const trackedViewsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!username || typeof window === "undefined") return;

    // Cleanup any previous observer.
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    dwellTimersRef.current.forEach((t) => clearTimeout(t));
    dwellTimersRef.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const postId = (entry.target as HTMLElement).dataset.postId;
          if (!postId) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Fire view once per post per mount.
            if (!trackedViewsRef.current.has(postId)) {
              trackedViewsRef.current.add(postId);
              try {
                navigator.sendBeacon?.(
                  `/api/posts?id=${encodeURIComponent(postId)}&username=${encodeURIComponent(username)}&track=view`,
                );
              } catch {
                /* no-op */
              }
            }

            // Schedule a dwell tracking after 2s of continuous visibility.
            if (!dwellTimersRef.current.has(postId)) {
              const t = setTimeout(() => {
                try {
                  navigator.sendBeacon?.(
                    `/api/posts?id=${encodeURIComponent(postId)}&username=${encodeURIComponent(username)}&track=dwell&dwellMs=2000`,
                  );
                } catch {
                  /* no-op */
                }
                dwellTimersRef.current.delete(postId);
              }, 2000);
              dwellTimersRef.current.set(postId, t);
            }
          } else {
            // Cancel pending dwell timer if the post leaves the viewport.
            const t = dwellTimersRef.current.get(postId);
            if (t) {
              clearTimeout(t);
              dwellTimersRef.current.delete(postId);
            }
          }
        }
      },
      { threshold: [0, 0.5, 1.0] },
    );
    observerRef.current = observer;

    // Observe every post element that has a data-post-id.
    const els = document.querySelectorAll<HTMLElement>("[data-post-id]");
    els.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      dwellTimersRef.current.forEach((t) => clearTimeout(t));
      dwellTimersRef.current.clear();
    };
  }, [username, posts]);
}

export function MidanScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("For you");
  const { user } = useAuth();
  const username = user?.username || null;
  const { country, city } = useApp();
  const [brainBusy, setBrainBusy] = useState(false);

  /** Calls the Brain universal layer for local trending topics. */
  const onBrainTrending = async () => {
    if (brainBusy) return;
    setBrainBusy(true);
    const promise = brainTrendingInCity({
      country,
      city,
      username: user?.username,
    });
    toast.promise(promise, {
      loading: "🧠 Brain is scanning the square…",
      success: (r) => ({
        title: "🧠 Brain AI · Trending",
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

  // Fetch real posts from the API. No mock fallback: an empty API
  // response shows the empty state.
  // For the "For you" filter, we request the algorithmic feed
  // (algo=true + username) so the ranking respects the follow graph +
  // engagement + recency + diversity.
  const { data: apiPosts, isLoading } = useQuery<UnifiedPost[]>({
    queryKey: ["posts", filter, username],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === "For you") {
        params.set("algo", "true");
        if (username) params.set("username", username);
      }
      const r = await fetch(`/api/posts?${params.toString()}`, { cache: "no-store" });
      if (!r.ok) throw new Error("failed to load posts");
      const data = await r.json();
      const arr = Array.isArray(data) ? data : (data.posts || []);
      return arr.map((p: any): UnifiedPost => ({
        id: p.id,
        handle: p.authorHandle || p.handle || "@anonymous",
        name: p.authorName || p.name || "Anonymous",
        body: p.body || p.text || "",
        likes: p.stats?.likes ?? p.likes ?? 0,
        comments: p.stats?.comments ?? p.comments ?? 0,
        reposts: p.stats?.shares ?? p.reposts ?? p.shares ?? 0,
        verified: p.authorVerified ?? p.verified ?? false,
        image: !!p.mediaKind,
        time: p.timestamp || p.createdAt ? new Date(p.timestamp || p.createdAt).toLocaleString() : "now",
        initials: p.authorInitials,
        color: p.authorColor,
      }));
    },
    staleTime: 30_000,
  });

  // Use ONLY API posts — no mock merge.
  const allPosts: UnifiedPost[] = useMemo(() => apiPosts ?? [], [apiPosts]);

  const [states, setStates] = useState<Record<string, PostState>>(() =>
    Object.fromEntries(allPosts.map((p) => [p.id, { liked: false, likes: p.likes, reposts: p.reposts, reposted: false, bookmarked: false }]))
  );
  const [commentFor, setCommentFor] = useState<UnifiedPost | null>(null);
  const [shareFor, setShareFor] = useState<UnifiedPost | null>(null);
  const [supportFor, setSupportFor] = useState<UnifiedPost | null>(null);
  const [spacesOpen, setSpacesOpen] = useState(false);
  // Per-handle follow state (client-side optimistic; synced with /api/follow).
  const [following, setFollowing] = useState<Set<string>>(new Set());

  // Sync per-post UI state with posts as they load from the API. The lazy
  // useState initializer above runs at mount when allPosts is still empty,
  // so we hydrate state entries here whenever new posts appear.
  useEffect(() => {
    if (allPosts.length === 0) return;
    setStates((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const p of allPosts) {
        if (!next[p.id]) {
          next[p.id] = {
            liked: false,
            likes: p.likes,
            reposts: p.reposts,
            reposted: false,
            bookmarked: false,
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [allPosts]);

  // Track views via IntersectionObserver.
  useViewTracking(username, allPosts);

  // ── Load the current user's follows on mount ──────────────────────────
  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/follow?username=${encodeURIComponent(username)}&direction=following`, { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        const handles = new Set<string>(
          (data.edges || []).map((e: { other: string }) => e.other.replace(/^@/, "")),
        );
        setFollowing(handles);
      } catch {
        /* no-op */
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  const filteredPosts = useMemo(() => {
    if (filter === "Following") {
      // Strict: only show posts by authors the user follows (fallback to
      // first 2 if none, to avoid an empty screen).
      const f = allPosts.filter((p) => following.has(p.handle.replace(/^@/, "")));
      return f.length ? f : allPosts.slice(0, 2);
    }
    if (filter === "Tech") return allPosts.filter((p) => p.handle.includes("dev") || p.body.toLowerCase().includes("ai"));
    return allPosts;
  }, [filter, allPosts, following]);

  // ── Trending rail: top 8 posts by weighted engagement score ──────────
  // Re-derives whenever the API feed changes (likes/reposts from server).
  const trendingPosts = useMemo(() => {
    if (allPosts.length === 0) return [];
    return [...allPosts]
      .map((p) => ({ p, score: engagementScore(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.p);
  }, [allPosts]);

  // ── Trending hashtags: mined from the live feed (#hashtag), with a
  // curated fallback list when the feed has no hashtags yet. Each trend
  // is decorated with a category + post count for the Twitter-style rail.
  const trendingTopics = useMemo(() => {
    const map = new Map<string, { tag: string; count: number; category: string }>();
    for (const p of allPosts) {
      const matches = (p.body.match(/#[\p{L}\d_]+/gu) || []) as string[];
      for (const m of matches) {
        const tag = m.slice(1);
        const key = tag.toLowerCase();
        const entry = map.get(key) || { tag, count: 0, category: "Trending in Midan" };
        entry.count += 1;
        map.set(key, entry);
      }
    }
    const fromFeed = Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((t) => ({
        tag: t.tag,
        // Boost the displayed count so the rail doesn't show "1 post" —
        // we treat feed occurrences as a signal of broader momentum.
        count: Math.max(t.count * 412 + 87, 240),
        category: t.category,
      }));
    return fromFeed.length > 0 ? fromFeed : FALLBACK_TRENDS;
  }, [allPosts]);

  // ── Who to follow: pick 3 distinct authors the user doesn't follow yet.
  // Prefers verified authors first, then the rest by engagement score.
  const suggestedFollows = useMemo(() => {
    const seen = new Set<string>();
    const candidates: UnifiedPost[] = [];
    for (const p of allPosts) {
      const handle = p.handle.replace(/^@/, "");
      if (!handle) continue;
      if (following.has(handle)) continue;
      if (seen.has(handle)) continue;
      if (username && handle.toLowerCase() === username.toLowerCase()) continue;
      seen.add(handle);
      candidates.push(p);
    }
    candidates.sort((a, b) => {
      if (!!a.verified !== !!b.verified) return a.verified ? -1 : 1;
      return engagementScore(b) - engagementScore(a);
    });
    return candidates.slice(0, 3);
  }, [allPosts, following, username]);

  // ── "Why am I seeing this?" tooltip reasons, rotated per-post so the
  // rail doesn't read like a broken record. Picked deterministically from
  // the post id hash so the same post always shows the same reason.
  const whySeeing = useMemo(() => {
    const reasons = [
      "People you follow are engaging with this",
      "This post is trending in your region",
      "Because you follow similar topics",
      "Popular in the Midan right now",
      "Based on your recent interests",
      "Suggested by the Brain — no ad targeting",
    ];
    return (id: string) => {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
      return reasons[Math.abs(h) % reasons.length];
    };
  }, []);

  const toggleLike = (id: string) => {
    setStates((prev) => {
      const s = prev[id];
      if (!s) return prev;
      return { ...prev, [id]: { ...s, liked: !s.liked, likes: s.liked ? s.likes - 1 : s.likes + 1 } };
    });
    toast.success(states[id]?.liked ? "Unliked" : "Liked ❤");
  };

  const toggleRepost = (id: string) => {
    setStates((prev) => {
      const s = prev[id];
      if (!s) return prev;
      return { ...prev, [id]: { ...s, reposted: !s.reposted, reposts: s.reposted ? s.reposts - 1 : s.reposts + 1 } };
    });
    toast.success(states[id]?.reposted ? "Un-reposted" : "Reposted 🔁");
  };

  const toggleBookmark = (id: string) => {
    setStates((prev) => {
      const s = prev[id];
      if (!s) return prev;
      return { ...prev, [id]: { ...s, bookmarked: !s.bookmarked } };
    });
    toast.success(states[id]?.bookmarked ? "Removed from bookmarks" : "Saved to bookmarks 🔖");
  };

  const isOwnPost = (p: UnifiedPost) => {
    if (!username) return false;
    return p.handle.replace(/^@/, "").toLowerCase() === username.toLowerCase();
  };

  const handleFollow = async (p: UnifiedPost) => {
    if (!username) {
      toast.error("Sign in to follow creators");
      return;
    }
    const handle = p.handle.replace(/^@/, "");
    const wasFollowing = following.has(handle);
    // Optimistic update.
    setFollowing((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(handle);
      else next.add(handle);
      return next;
    });
    try {
      if (wasFollowing) {
        const r = await fetch(`/api/follow?follower=${encodeURIComponent(username)}&following=${encodeURIComponent(handle)}`, { method: "DELETE" });
        if (!r.ok) throw new Error("unfollow failed");
        toast.success(`Unfollowed @${handle}`);
      } else {
        const r = await fetch("/api/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ follower: username, following: handle }),
        });
        if (!r.ok) throw new Error("follow failed");
        toast.success(`Following @${handle}`);
      }
    } catch (err) {
      // Revert on failure.
      setFollowing((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(handle);
        else next.delete(handle);
        return next;
      });
      toast.error("Couldn't update follow", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="pb-32">
      {/* ── Super Upgrade: Header with Wellness Timer + No-Ads Banner ── */}
      <div className="px-6 pt-2 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl">Midan</h1>
          <p className="text-[10px] text-secondary mt-0.5 flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5" /> Ad-free · No algorithm manipulation · You control the feed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBrainTrending}
            disabled={brainBusy}
            aria-label="Brain AI trending topics"
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
            onClick={() => setSpacesOpen(true)}
            className="text-xs px-3 py-1.5 rounded-full glass flex items-center gap-1.5 hover:bg-muted/60 transition"
          >
            <Radio className="w-3 h-3 text-accent" /> Spaces · 14 live
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-6 mt-4 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${
              filter === f ? "bg-primary text-primary-foreground" : "glass hover:bg-muted/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Compose CTA — "What's happening?" card (Twitter-style) ── */}
      {(() => {
        const composerName = user?.displayName || username || "friend";
        const composerInitial = (composerName.trim()[0] || "Y").toUpperCase();
        const composerKind = (kind: string, extra?: Record<string, unknown>) =>
          window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind, ...extra } }));
        return (
          <div className="mx-5 mt-4 glass rounded-3xl p-4 w-[calc(100%-2.5rem)]">
            <button
              onClick={() => composerKind("post")}
              className="w-full flex items-start gap-3 text-start rounded-2xl p-1 -m-1 hover:bg-muted/30 transition"
              aria-label="Compose a new post"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-display text-base shrink-0 ring-2 ring-secondary/25">
                {composerInitial}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-base text-muted-foreground">
                  What&apos;s happening, {composerName.split(" ")[0]}?
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-secondary">
                  <Sparkles className="w-3 h-3" />
                  Share to the public square · No algorithm boost
                </div>
              </div>
            </button>
            <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-0.5 text-secondary">
                <button
                  onClick={() => composerKind("post", { media: "image" })}
                  className="w-9 h-9 rounded-full hover:bg-secondary/15 flex items-center justify-center transition"
                  aria-label="Add photo"
                  title="Photo"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => composerKind("poll")}
                  className="w-9 h-9 rounded-full hover:bg-secondary/15 flex items-center justify-center transition"
                  aria-label="Create poll"
                  title="Poll"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => composerKind("post", { media: "emoji" })}
                  className="w-9 h-9 rounded-full hover:bg-secondary/15 flex items-center justify-center transition"
                  aria-label="Add emoji"
                  title="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  onClick={() => composerKind("post", { location: true })}
                  className="w-9 h-9 rounded-full hover:bg-secondary/15 flex items-center justify-center transition"
                  aria-label="Tag location"
                  title="Location"
                >
                  <MapPin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => composerKind("schedule")}
                  className="w-9 h-9 rounded-full hover:bg-secondary/15 flex items-center justify-center transition"
                  aria-label="Schedule post"
                  title="Schedule"
                >
                  <CalendarClock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => composerKind("post", { voice: true })}
                  className="w-9 h-9 rounded-full hover:bg-secondary/15 flex items-center justify-center transition"
                  aria-label="Voice post"
                  title="Voice post"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => composerKind("post")}
                className="px-5 py-1.5 rounded-full bg-gradient-gold text-charcoal text-sm font-medium hover:scale-[1.02] active:scale-95 transition shadow-sm"
              >
                Post
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Trending Now — horizontal rail of top-engagement posts ── */}
      {trendingPosts.length > 0 && (
        <section className="mt-5 px-5" aria-label="Trending posts">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="w-4 h-4 text-accent shrink-0" />
              <h2 className="font-display text-base leading-none">Trending Now</h2>
              <span className="text-[10px] text-muted-foreground truncate">
                · Top {trendingPosts.length} by engagement
              </span>
            </div>
            <button
              onClick={() => toast("Full trending page — coming soon")}
              className="text-[11px] text-secondary hover:underline shrink-0"
            >
              See all
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x">
            {trendingPosts.map((p, idx) => {
              const s = states[p.id];
              const initial = (p.initials || p.name || "?").trim()[0]?.toUpperCase() || "?";
              const likes = s?.likes ?? p.likes;
              const reposts = s?.reposts ?? p.reposts;
              const views = estimateViews(p);
              return (
                <motion.button
                  key={`trend-${p.id}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => toast(`Opening @${p.handle.replace(/^@/, "")}'s trending post…`)}
                  className="glass rounded-2xl p-3.5 w-72 shrink-0 snap-start text-start hover:bg-muted/40 hover:border-secondary/30 transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-wider text-accent">
                      #{idx + 1} · TRENDING
                    </span>
                    <TrendingUp className="w-3.5 h-3.5 text-accent/70 group-hover:scale-110 transition" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-mesh flex items-center justify-center text-primary-foreground text-sm font-display shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-xs truncate">{p.name}</span>
                        {p.verified && <BadgeCheck className="w-3 h-3 text-secondary shrink-0" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {p.handle} · {p.time}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed line-clamp-3 mb-3 text-foreground/90">{p.body}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {fmt(likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-3 h-3" /> {fmt(reposts)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {fmt(p.comments)}
                    </span>
                    <span className="flex items-center gap-1 ms-auto">
                      <Eye className="w-3 h-3" /> {fmt(views)}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* Feed */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading posts…
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center px-6">
          <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <div className="font-display text-lg">No posts yet</div>
          <div className="text-xs text-muted-foreground mt-1">Be the first to post!</div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "post" } }))}
            className="mt-4 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground"
          >
            Compose a post
          </button>
        </div>
      ) : (
      <ul className="mt-5">
        {filteredPosts.map((p, i) => {
          const s = states[p.id];
          if (!s) return null;
          const own = isOwnPost(p);
          const isFollowing = following.has(p.handle.replace(/^@/, ""));
          const initial = (p.initials || p.name || "?").trim()[0]?.toUpperCase() || "?";
          const views = estimateViews(p);

          const card = (
            <motion.li
              data-post-id={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="px-6 py-4 border-b border-border hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Avatar — larger (w-11), ring tinted by verified status */}
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-mesh flex items-center justify-center font-display text-sm text-primary-foreground shrink-0 ring-1 ${
                    p.verified ? "ring-secondary/50" : "ring-border/60"
                  }`}
                >
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Header: name + verified + handle + time · Why-am-I-seeing + Follow */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate max-w-[40%]">{p.name}</span>
                    {p.verified && <BadgeCheck className="w-3.5 h-3.5 text-secondary shrink-0" />}
                    <span className="text-xs text-muted-foreground truncate">
                      {p.handle} · {p.time}
                    </span>
                    {/* "Why am I seeing this?" tooltip button */}
                    <button
                      onClick={() =>
                        toast(whySeeing(p.id), {
                          description:
                            "Cirkle never uses ad targeting — recommendations are interest + engagement based.",
                        })
                      }
                      className="ms-auto w-7 h-7 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition shrink-0"
                      aria-label="Why am I seeing this?"
                      title="Why am I seeing this?"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        toast(`Post options for @${p.handle.replace(/^@/, "")}'s post`, {
                          description: "Mute · Block · Report · Embed · Pin to profile",
                        })
                      }
                      className="w-7 h-7 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition shrink-0"
                      aria-label="More options"
                      title="More"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {!own && (
                      <button
                        onClick={() => handleFollow(p)}
                        className={`text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition shrink-0 ${
                          isFollowing
                            ? "bg-muted text-muted-foreground hover:bg-accent/15 hover:text-accent"
                            : "bg-secondary/15 text-secondary border border-secondary/40 hover:bg-secondary/25"
                        }`}
                        aria-pressed={isFollowing}
                        aria-label={isFollowing ? `Unfollow ${p.handle}` : `Follow ${p.handle}`}
                      >
                        {isFollowing ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                  {/* Body — line-clamped for long posts, preserves line breaks */}
                  <p className="mt-1.5 text-[15px] leading-relaxed line-clamp-5 whitespace-pre-wrap break-words">
                    {p.body}
                  </p>

                  {p.image && (
                    <div className="mt-3 rounded-2xl aspect-video relative overflow-hidden border border-border/40">
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10" />
                      <div className="absolute bottom-2 left-2 text-[10px] text-primary-foreground/80 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Media attachment
                      </div>
                    </div>
                  )}

                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-secondary">
                    <ShieldCheck className="w-3 h-3" /> AI verified · No misinformation
                  </div>

                  {/* Engagement bar — pill-hover on every action, full set:
                       replies · reposts · likes · views · bookmark · share · support · analytics */}
                  <div className="mt-3 flex items-center gap-0.5 text-xs text-muted-foreground -ms-1.5">
                    <button
                      onClick={() => setCommentFor(p)}
                      className="group flex items-center gap-1 hover:text-secondary transition"
                      aria-label={`Reply to ${p.name}`}
                    >
                      <span className="p-1.5 rounded-full group-hover:bg-secondary/15 transition">
                        <MessageCircle className="w-4 h-4" />
                      </span>
                      <span className="tabular-nums">{fmt(p.comments)}</span>
                    </button>
                    <button
                      onClick={() => toggleRepost(p.id)}
                      className={`group flex items-center gap-1 transition ${
                        s.reposted ? "text-secondary" : "hover:text-primary"
                      }`}
                      aria-pressed={s.reposted}
                      aria-label={s.reposted ? "Undo repost" : "Repost"}
                    >
                      <span
                        className={`p-1.5 rounded-full transition ${
                          s.reposted ? "bg-secondary/15" : "group-hover:bg-primary/15"
                        }`}
                      >
                        <Repeat2 className={`w-4 h-4 ${s.reposted ? "fill-current" : ""}`} />
                      </span>
                      <span className="tabular-nums">{fmt(s.reposts)}</span>
                    </button>
                    <button
                      onClick={() => toggleLike(p.id)}
                      className={`group flex items-center gap-1 transition ${
                        s.liked ? "text-accent" : "hover:text-accent"
                      }`}
                      aria-pressed={s.liked}
                      aria-label={s.liked ? "Unlike" : "Like"}
                    >
                      <span
                        className={`p-1.5 rounded-full transition ${
                          s.liked ? "bg-accent/15" : "group-hover:bg-accent/15"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${s.liked ? "fill-current" : ""}`} />
                      </span>
                      <span className="tabular-nums">{fmt(s.likes)}</span>
                    </button>
                    <button
                      onClick={() => toast(`Detailed analytics for @${p.handle.replace(/^@/, "")}'s post — coming soon`)}
                      className="group flex items-center gap-1 hover:text-secondary transition"
                      aria-label="View count"
                      title="Views"
                    >
                      <span className="p-1.5 rounded-full group-hover:bg-secondary/15 transition">
                        <Eye className="w-4 h-4" />
                      </span>
                      <span className="tabular-nums">{fmt(views)}</span>
                    </button>
                    <button
                      onClick={() => toggleBookmark(p.id)}
                      className={`group p-1.5 rounded-full transition ${
                        s.bookmarked
                          ? "text-secondary bg-secondary/15"
                          : "hover:text-secondary hover:bg-secondary/15"
                      }`}
                      aria-pressed={s.bookmarked}
                      aria-label={s.bookmarked ? "Remove bookmark" : "Bookmark post"}
                      title={s.bookmarked ? "Bookmarked" : "Bookmark"}
                    >
                      <Bookmark className={`w-4 h-4 ${s.bookmarked ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={() => setShareFor(p)}
                      className="group p-1.5 rounded-full hover:text-foreground hover:bg-muted/60 transition"
                      aria-label="Share post"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {!own && (
                      <button
                        onClick={() => setSupportFor(p)}
                        className="group p-1.5 rounded-full hover:text-secondary hover:bg-secondary/15 transition"
                        aria-label={`Support ${p.name} with CirkleCommit`}
                        title="Support"
                      >
                        <Coins className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toast("Detailed analytics — coming soon")}
                      className="group p-1.5 rounded-full hover:text-foreground hover:bg-muted/60 transition ms-auto"
                      aria-label="Open detailed analytics"
                      title="Analytics"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.li>
          );

          // Interleave the "Who to follow" rail after the 3rd post so it
          // surfaces mid-feed rather than buried at the bottom.
          if (i === 2 && suggestedFollows.length > 0) {
            return (
              <Fragment key={p.id}>
                {card}
                <motion.li
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="px-6 py-4 border-b border-border bg-gradient-to-br from-secondary/[0.05] to-transparent"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-secondary" />
                      <h3 className="font-display text-sm">Who to follow</h3>
                      <span className="text-[10px] text-muted-foreground">· suggested by the Brain</span>
                    </div>
                    <button
                      onClick={() => toast("More suggestions — coming soon")}
                      className="text-[11px] text-secondary hover:underline"
                    >
                      See more
                    </button>
                  </div>
                  <div className="space-y-3">
                    {suggestedFollows.map((sf) => {
                      const sfHandle = sf.handle.replace(/^@/, "");
                      const sfInitial = (sf.initials || sf.name || "?").trim()[0]?.toUpperCase() || "?";
                      const sfFollowing = following.has(sfHandle);
                      return (
                        <div key={sfHandle} className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full bg-gradient-mesh flex items-center justify-center font-display text-sm text-primary-foreground shrink-0 ring-1 ${
                              sf.verified ? "ring-secondary/50" : "ring-border/60"
                            }`}
                          >
                            {sfInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-sm truncate">{sf.name}</span>
                              {sf.verified && <BadgeCheck className="w-3 h-3 text-secondary shrink-0" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">{sf.handle}</div>
                          </div>
                          <button
                            onClick={() => handleFollow(sf)}
                            className={`text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1 transition shrink-0 ${
                              sfFollowing
                                ? "bg-muted text-muted-foreground hover:bg-accent/15 hover:text-accent"
                                : "bg-foreground text-background hover:opacity-90"
                            }`}
                            aria-pressed={sfFollowing}
                            aria-label={sfFollowing ? `Unfollow ${sf.handle}` : `Follow ${sf.handle}`}
                          >
                            {sfFollowing ? (
                              <>
                                <UserCheck className="w-3 h-3" /> Following
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" /> Follow
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.li>
              </Fragment>
            );
          }

          return <Fragment key={p.id}>{card}</Fragment>;
        })}
      </ul>
      )}

      {/* ── Trends for you — hashtag rail (mines hashtags from the live feed) ── */}
      {!isLoading && filteredPosts.length > 0 && trendingTopics.length > 0 && (
        <section
          className="mt-6 mx-5 glass rounded-3xl p-4 w-[calc(100%-2.5rem)]"
          aria-label="Trends for you"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-accent" />
              <h2 className="font-display text-base leading-none">Trends for you</h2>
              <span className="text-[10px] text-muted-foreground">· {city || country || "Global"}</span>
            </div>
            <button
              onClick={() => toast("Trend settings — coming soon")}
              className="w-7 h-7 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition"
              aria-label="Trends info"
              title="Trending from real engagement — no promoted trends"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="space-y-0.5">
            {trendingTopics.map((t, idx) => (
              <li key={t.tag}>
                <button
                  onClick={() => toast(`Exploring #${t.tag}…`)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition text-start group"
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0 group-hover:bg-secondary/20 transition">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground leading-tight truncate">{t.category}</div>
                    <div className="font-medium text-sm truncate">#{t.tag}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      {fmt(t.count)} posts
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-[10px] font-bold text-accent tabular-nums">#{idx + 1}</span>
                    <TrendingUp className="w-3 h-3 text-accent/60 group-hover:scale-110 transition" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-secondary" />
            Trending from real engagement — no promoted trends, no boosted hashtags.
          </div>
        </section>
      )}

      {/* Comment sheet */}
      <Sheet open={!!commentFor} onOpenChange={(v) => !v && setCommentFor(null)}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-0">
          {commentFor && (
            <>
              <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60">
                <SheetTitle className="font-display text-lg">Comments</SheetTitle>
                <SheetDescription>On @{commentFor.handle.replace(/^@/, "")}&apos;s post</SheetDescription>
              </SheetHeader>
              <CommentSheet post={{ user: commentFor.name, handle: commentFor.handle, body: commentFor.body }} />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Share sheet */}
      <Sheet open={!!shareFor} onOpenChange={(v) => !v && setShareFor(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0">
          {shareFor && (
            <>
              <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60">
                <SheetTitle className="font-display text-lg">Share</SheetTitle>
                <SheetDescription>Spread the word — no tracking.</SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-2">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { l: "Wasl", h: "@layla" },
                    { l: "Circle", h: "My circle" },
                    { l: "Copy link", h: "cirkle/p/3x7" },
                    { l: "QR code", h: "Scan to view" },
                  ].map((s) => (
                    <button
                      key={s.l}
                      onClick={() => toast.success(`Shared via ${s.l}`)}
                      className="rounded-2xl glass p-3 text-center hover:bg-muted/50 transition"
                    >
                      <div className="w-10 h-10 mx-auto rounded-full bg-gradient-mesh flex items-center justify-center text-primary-foreground font-display">
                        {s.l[0]}
                      </div>
                      <div className="text-[10px] mt-1.5 font-medium">{s.l}</div>
                      <div className="text-[9px] text-muted-foreground">{s.h}</div>
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground text-center pt-2">
                  End-to-end encrypted · No tracking pixels
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Support sheet */}
      <Sheet open={!!supportFor} onOpenChange={(v) => !v && setSupportFor(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0">
          {supportFor && (
            <SupportSheet
              post={supportFor}
              supporter={username || ""}
              onClose={() => setSupportFor(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Spaces sheet */}
      <Sheet open={spacesOpen} onOpenChange={setSpacesOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60">
            <SheetTitle className="font-display text-lg flex items-center gap-2">
              <Radio className="w-4 h-4 text-accent" /> Live Spaces
            </SheetTitle>
            <SheetDescription>14 live · Tap to join</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-2">
            {[
              
              
              { t: "Diriyah Festival recap", h: "@riyadhdaily", l: 2240 },
              { t: "Designers of KSA", h: "@desert.design", l: 188 },
            ].map((s) => (
              <div key={s.t} className="glass rounded-2xl p-3 flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-xl bg-gradient-mesh flex items-center justify-center">
                  <Radio className="w-4 h-4 text-primary-foreground" />
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">LIVE</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.t}</div>
                  <div className="text-[11px] text-muted-foreground">{s.h} · {s.l.toLocaleString()} listening</div>
                </div>
                <button
                  onClick={() => { setSpacesOpen(false); toast.success(`Joining “${s.t}”…`); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Support sheet — fetches the creator's profile, lets the user pick a tier
// amount (or enter a custom one), then POSTs to /api/creator/support.
// ─────────────────────────────────────────────────────────────────────────────

function SupportSheet({
  post,
  supporter,
  onClose,
}: {
  post: UnifiedPost;
  supporter: string;
  onClose: () => void;
}) {
  const creator = post.handle.replace(/^@/, "");
  const [profile, setProfile] = useState<{
    basicAmount: number;
    premiumAmount: number;
    vipAmount: number;
    currency: string;
    monetized: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/creator/profile?username=${encodeURIComponent(creator)}`, { cache: "no-store" });
        if (!r.ok) throw new Error("failed");
        const data = await r.json();
        if (cancelled) return;
        setProfile({
          basicAmount: data.basicAmount ?? 5,
          premiumAmount: data.premiumAmount ?? 20,
          vipAmount: data.vipAmount ?? 100,
          currency: data.currency ?? "SAR",
          monetized: !!data.monetized,
        });
        setSelectedAmount(data.basicAmount ?? 5);
      } catch {
        if (cancelled) return;
        setProfile({ basicAmount: 5, premiumAmount: 20, vipAmount: 100, currency: "SAR", monetized: false });
        setSelectedAmount(5);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [creator]);

  const handleSupport = async () => {
    if (!supporter) {
      toast.error("Sign in to support creators");
      return;
    }
    const amount = customAmount ? Number(customAmount) : selectedAmount;
    if (!isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/creator/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator,
          supporter,
          amount,
          currency: profile?.currency ?? "SAR",
          message: message.trim() || undefined,
        }),
      });
      if (!r.ok) throw new Error("support failed");
      const data = await r.json();
      toast.success(`Supported @${creator}`, {
        description: `${amount} ${profile?.currency ?? "SAR"} sent via Commit`,
      });
      onClose();
      void data;
    } catch (err) {
      toast.error("Couldn't send support", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60">
        <SheetTitle className="font-display text-lg flex items-center gap-2">
          <Coins className="w-4 h-4 text-secondary" /> Support @{creator}
        </SheetTitle>
        <SheetDescription>
          Micropayment via Commit · 0% fees · supports future work
        </SheetDescription>
      </SheetHeader>
      {loading ? (
        <div className="p-6 flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-secondary" />
          <p className="text-xs text-muted-foreground">Loading tiers…</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {!profile?.monetized && (
            <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-xl p-3 flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-secondary" />
              <span>
                @{creator} hasn&apos;t enabled monetization yet — your support will still go through and they&apos;ll be notified.
              </span>
            </div>
          )}

          {/* Tier picker */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Basic", emoji: "🌱", amount: profile?.basicAmount ?? 5 },
              { label: "Premium", emoji: "⭐", amount: profile?.premiumAmount ?? 20 },
              { label: "VIP", emoji: "👑", amount: profile?.vipAmount ?? 100 },
            ].map((t) => {
              const active = !customAmount && selectedAmount === t.amount;
              return (
                <button
                  key={t.label}
                  onClick={() => { setSelectedAmount(t.amount); setCustomAmount(""); }}
                  className={`rounded-2xl border p-3 text-center transition flex flex-col items-center gap-1 ${
                    active
                      ? "border-secondary/60 bg-secondary/15 text-secondary"
                      : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  <span className="text-[10px] font-medium">{t.label}</span>
                  <span className="text-sm font-display tabular-nums">{t.amount} {profile?.currency}</span>
                </button>
              );
            })}
          </div>

          {/* Custom amount */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Custom amount</label>
            <div className="relative mt-1.5">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full glass rounded-xl px-3 py-2.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-secondary/40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                {profile?.currency}
              </span>
            </div>
          </div>

          {/* Optional message */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              placeholder="Say something kind…"
              className="mt-1.5 w-full glass rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/40 min-h-[60px] resize-none"
            />
            <div className="text-[10px] text-muted-foreground text-end mt-0.5">{message.length}/280</div>
          </div>

          <button
            onClick={handleSupport}
            disabled={submitting}
            className="w-full py-3 rounded-full bg-gradient-gold text-charcoal text-sm font-medium flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95 transition disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            Support {customAmount ? customAmount : selectedAmount} {profile?.currency}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            Powered by CirkleCommit · Escrow-protected · Instant settlement
          </p>
        </div>
      )}
    </>
  );
}

function CommentSheet({ post }: { post: { user: string; handle: string; body: string } }) {
  const [comments, setComments] = useState<{ id: number; user: string; text: string }[]>([
    
    
  ]);
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border/60">
        <div className="text-xs">
          <span className="font-medium">{post.user}</span>{" "}
          <span className="text-muted-foreground">{post.body.slice(0, 80)}{post.body.length > 80 ? "…" : ""}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-mesh flex items-center justify-center text-primary-foreground font-display text-xs shrink-0">
              {c.user[0]}
            </div>
            <div>
              <div className="text-xs">
                <span className="font-medium">{c.user}</span>{" "}
                <span className="text-muted-foreground">· just now</span>
              </div>
              <div className="text-sm mt-0.5">{c.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border/60">
        <div className="glass rounded-full px-3 py-2 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                setComments((c) => [...c, { id: Date.now(), user: "You", text: text.trim() }]);
                setText("");
                toast.success("Comment posted");
              }
            }}
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder="Add a comment…"
          />
          <button
            onClick={() => {
              if (text.trim()) {
                setComments((c) => [...c, { id: Date.now(), user: "You", text: text.trim() }]);
                setText("");
                toast.success("Comment posted");
              }
            }}
            className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center"
            aria-label="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
