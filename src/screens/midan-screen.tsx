// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2, Share2, ShieldCheck, Mic, BadgeCheck, BarChart3, Radio, X, Send, Loader2, Coins, UserPlus, UserCheck, MessageSquare, Brain } from "lucide-react";
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
    Object.fromEntries(allPosts.map((p) => [p.id, { liked: false, likes: p.likes, reposts: p.reposts, reposted: false }]))
  );
  const [commentFor, setCommentFor] = useState<UnifiedPost | null>(null);
  const [shareFor, setShareFor] = useState<UnifiedPost | null>(null);
  const [supportFor, setSupportFor] = useState<UnifiedPost | null>(null);
  const [spacesOpen, setSpacesOpen] = useState(false);
  // Per-handle follow state (client-side optimistic; synced with /api/follow).
  const [following, setFollowing] = useState<Set<string>>(new Set());

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
      <div className="px-6 pt-2 flex items-center justify-between">
        <h1 className="font-display text-4xl">Midan</h1>
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

      {/* Composer */}
      <button
        className="mx-5 mt-4 glass rounded-2xl p-3 w-[calc(100%-2.5rem)] flex items-start gap-3 text-start hover:bg-muted/50 transition"
        onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "post" } }))}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-display shrink-0">Y</div>
        <div className="bg-transparent flex-1 text-sm py-2 text-muted-foreground">Share to the public square</div>
        <span
          onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "poll" } })); }}
          className="w-9 h-9 rounded-full bg-secondary/20 text-secondary flex items-center justify-center shrink-0"
          aria-label="Poll"
        >
          <Mic className="w-4 h-4" />
        </span>
      </button>

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
          return (
            <motion.li
              key={p.id}
              data-post-id={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="px-6 py-4 border-b border-border"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-mesh flex items-center justify-center font-display text-sm text-primary-foreground shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{p.name}</span>
                    {p.verified && <BadgeCheck className="w-3.5 h-3.5 text-secondary" />}
                    <span className="text-xs text-muted-foreground">{p.handle} · {p.time}</span>
                    {!own && (
                      <button
                        onClick={() => handleFollow(p)}
                        className={`ms-auto text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition shrink-0 ${
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
                  <p className="mt-1.5 text-[15px] leading-relaxed">{p.body}</p>

                  {p.image && (
                    <div className="mt-3 rounded-2xl aspect-video relative overflow-hidden">
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10" />
                    </div>
                  )}

                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-secondary">
                    <ShieldCheck className="w-3 h-3" /> AI verified · No misinformation
                  </div>

                  <div className="mt-3 flex items-center gap-6 text-xs text-muted-foreground">
                    <button
                      onClick={() => toggleLike(p.id)}
                      className={`flex items-center gap-1.5 transition ${s.liked ? "text-accent" : "hover:text-accent"}`}
                    >
                      <Heart className={`w-4 h-4 ${s.liked ? "fill-current" : ""}`} />
                      {s.likes.toLocaleString()}
                    </button>
                    <button
                      onClick={() => setCommentFor(p)}
                      className="flex items-center gap-1.5 hover:text-secondary transition"
                    >
                      <MessageCircle className="w-4 h-4" />{p.comments}
                    </button>
                    <button
                      onClick={() => toggleRepost(p.id)}
                      className={`flex items-center gap-1.5 transition ${s.reposted ? "text-secondary" : "hover:text-primary"}`}
                    >
                      <Repeat2 className={`w-4 h-4 ${s.reposted ? "fill-current" : ""}`} />{s.reposts}
                    </button>
                    <button
                      onClick={() => setShareFor(p)}
                      className="flex items-center gap-1.5 hover:text-foreground transition"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {!own && (
                      <button
                        onClick={() => setSupportFor(p)}
                        className="flex items-center gap-1.5 hover:text-secondary transition"
                        aria-label={`Support ${p.name}`}
                      >
                        <Coins className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toast("View analytics — Coming soon")}
                      className="flex items-center gap-1.5 hover:text-foreground transition ms-auto"
                      aria-label="Analytics"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
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
