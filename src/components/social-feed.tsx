"use client";

/**
 * CIRKLE Brain AI — Facebook-style Social Feed
 * ============================================================================
 *
 * A social feed with CIRKLE's own identity:
 *   - Left side: "Shares" panel (top sharers + trending tags)
 *   - Main feed: infinite scroll of user-shared posts
 *   - Brain AI orchestrates ranking + personalization
 *   - Each post shows: author, content, likes, comments, shares
 *   - Scroll down → more shared content loads automatically
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, Eye, Sparkles, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SocialPost {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorHandle: string;
  authorVerified: boolean;
  body: string;
  arabicBody: string | null;
  module: string;
  location: string | null;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  tags: string | null;
  mediaKind: string | null;
  mediaCount: number | null;
  mediaCover: string | null;
  createdAt: string;
}

interface SidebarData {
  topSharers: { name: string; initials: string; color: string; handle: string; verified: boolean; postCount: number }[];
  trendingTags: { tag: string; count: number }[];
}

interface FeedResponse {
  posts: SocialPost[];
  hasMore: boolean;
  nextCursor: string | null;
  sidebar: SidebarData;
  brainAI: { orchestrated: boolean; provider: string };
}

const MODULE_LABELS: Record<string, string> = {
  midan: "Midan", lamahat: "Lamahat", mashahd: "Mashahd", circle: "Circle",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export function SocialFeed({ personalizationContext, personalAIConsent }: {
  personalizationContext?: string;
  personalAIConsent?: boolean;
}) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [sidebar, setSidebar] = useState<SidebarData>({ topSharers: [], trendingTags: [] });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [brainActive, setBrainActive] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Load initial feed ──────────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (personalAIConsent && personalizationContext) {
        params.set("personalAIConsent", "true");
        params.set("personalizationContext", personalizationContext);
      }
      const res = await fetch(`/api/social-feed?${params}`);
      if (!res.ok) throw new Error("feed failed");
      const data: FeedResponse = await res.json();
      setPosts(data.posts);
      setSidebar(data.sidebar);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
      setBrainActive(data.brainAI.orchestrated);
    } catch {
      // Fallback: empty feed.
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [personalizationContext, personalAIConsent]);

  useEffect(() => { void loadFeed(); }, [loadFeed]);

  // ── Load more (infinite scroll) ────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "10", cursor });
      if (personalAIConsent && personalizationContext) {
        params.set("personalAIConsent", "true");
        params.set("personalizationContext", personalizationContext);
      }
      const res = await fetch(`/api/social-feed?${params}`);
      if (!res.ok) return;
      const data: FeedResponse = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch {
      // Non-fatal.
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, cursor, personalizationContext, personalAIConsent]);

  // ── Intersection observer for infinite scroll ──────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void loadMore(); },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex gap-4 px-4 max-w-5xl mx-auto">
      {/* ── Left sidebar: Shares (Facebook-style) ─────────────────── */}
      <aside className="hidden lg:block w-64 shrink-0 space-y-4 sticky top-20 self-start">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-secondary" />
            <h3 className="font-display text-sm font-semibold">Top Sharers</h3>
          </div>
          <div className="space-y-2">
            {sidebar.topSharers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No shares yet.</p>
            ) : (
              sidebar.topSharers.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: `var(--${s.color || "primary"})` }}
                  >
                    {s.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {s.name}
                      {s.verified && <span className="text-secondary ml-1">✓</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{s.postCount} shares</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-secondary" />
            <h3 className="font-display text-sm font-semibold">Trending</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sidebar.trendingTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No trends yet.</p>
            ) : (
              sidebar.trendingTags.map((t, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20"
                >
                  #{t.tag} · {t.count}
                </span>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ── Main feed: shared posts (infinite scroll) ─────────────── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Brain AI banner */}
        <div className="flex items-center gap-2 px-4 py-2 glass rounded-xl">
          <Sparkles className={`w-3.5 h-3.5 ${brainActive ? "text-secondary" : "text-muted-foreground"}`} />
          <span className="text-[11px] text-muted-foreground">
            {brainActive ? "Brain AI is personalizing your feed" : "Shared by Cirkle users"}
          </span>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="w-full h-48 rounded-2xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No shares yet. Be the first to share something on Cirkle!
            </p>
          </div>
        ) : (
          <>
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.3 }}
                className="glass rounded-2xl overflow-hidden"
              >
                {/* Post header */}
                <div className="p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: `var(--${post.authorColor || "primary"})` }}
                  >
                    {post.authorInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm truncate">{post.authorName}</span>
                      {post.authorVerified && <span className="text-secondary text-xs">✓</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      @{post.authorHandle} · {timeAgo(post.createdAt)} · {MODULE_LABELS[post.module] || post.module}
                      {post.location && ` · ${post.location}`}
                    </div>
                  </div>
                </div>

                {/* Post body */}
                <div className="px-4 pb-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>
                </div>

                {/* Media placeholder */}
                {post.mediaKind && (
                  <div className="w-full aspect-video bg-gradient-to-br from-primary/10 to-secondary/5 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      {post.mediaKind} · {post.mediaCount || 1} item(s)
                    </span>
                  </div>
                )}

                {/* Post stats */}
                <div className="px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground border-t border-border/30">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" /> {post.comments}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" /> {post.shares}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Eye className="w-3.5 h-3.5" /> {post.views}
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="py-4 flex justify-center">
                {loadingMore ? (
                  <Skeleton className="w-full h-32 rounded-2xl" />
                ) : (
                  <span className="text-xs text-muted-foreground">Loading more shares...</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
