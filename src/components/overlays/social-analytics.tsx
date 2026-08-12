"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X, RefreshCw, Loader2, TrendingUp, TrendingDown, Heart, MessageCircle,
  UserPlus, FileText, Clock, Sparkles, BarChart3, Globe, Users, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { MODULE_META, type ModuleId } from "@/lib/cross-module-share";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Mock analytics data ────────────────────────────────────────────────────
// In production this would come from /api/analytics/social — for now we use
// deterministic mock data so the dashboard renders instantly.

interface WeekStats {
  posts: number;
  likes: number;
  comments: number;
  newFollowers: number;
  // deltas vs last week (as percentages, can be negative)
  postsDelta: number;
  likesDelta: number;
  commentsDelta: number;
  newFollowersDelta: number;
}

interface ModuleStat {
  module: ModuleId;
  posts: number;
  engagement: number; // likes + comments + shares
  pct: number; // share of total engagement
}

interface AudienceCountry {
  country: string;
  flag: string;
  pct: number;
}

interface AudienceAge {
  range: string;
  pct: number;
}

interface GrowthPoint {
  day: string;
  followers: number;
}

interface TopPost {
  module: ModuleId;
  preview: string;
  likes: number;
  comments: number;
  views: number;
  timestamp: string;
}

interface AnalyticsData {
  weekStats: WeekStats;
  bestPostingTime: string;
  topPost: TopPost;
  moduleBreakdown: ModuleStat[];
  audienceCountries: AudienceCountry[];
  audienceAges: AudienceAge[];
  growth: GrowthPoint[];
  aiInsight: string;
}

const MOCK: AnalyticsData = {
  weekStats: {
    posts: 12,
    likes: 248,
    comments: 47,
    newFollowers: 18,
    postsDelta: 20,
    likesDelta: 35,
    commentsDelta: -8,
    newFollowersDelta: 12,
  },
  bestPostingTime: "Tuesday & Thursday, 7–9 PM",
  topPost: {
    module: "midan",
    preview: "Spent the morning at the new specialty coffee spot downtown. The light through the window was unreal — and the flat white was 10/10.",
    likes: 87,
    comments: 14,
    views: 412,
    timestamp: "3 days ago",
  },
  moduleBreakdown: [
    { module: "midan", posts: 7, engagement: 198, pct: 58 },
    { module: "lamahat", posts: 3, engagement: 74, pct: 22 },
    { module: "mashahd", posts: 1, engagement: 42, pct: 12 },
    { module: "wasl", posts: 1, engagement: 28, pct: 8 },
  ],
  audienceCountries: [
    { country: "Egypt", flag: "🇪🇬", pct: 42 },
    { country: "Saudi Arabia", flag: "🇸🇦", pct: 23 },
    { country: "UAE", flag: "🇦🇪", pct: 14 },
    { country: "Jordan", flag: "🇯🇴", pct: 9 },
    { country: "Other", flag: "🌍", pct: 12 },
  ],
  audienceAges: [
    { range: "18–24", pct: 28 },
    { range: "25–34", pct: 41 },
    { range: "35–44", pct: 19 },
    { range: "45+", pct: 12 },
  ],
  growth: [
    { day: "Mon", followers: 412 },
    { day: "Tue", followers: 418 },
    { day: "Wed", followers: 421 },
    { day: "Thu", followers: 427 },
    { day: "Fri", followers: 432 },
    { day: "Sat", followers: 437 },
    { day: "Sun", followers: 442 },
  ],
  aiInsight: "Your posts in Midan get 2× more engagement than Lamahat. Try cross-posting more — the Smart Compose hub can publish to both in one tap.",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
      up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
    )}>
      <Icon className="w-3 h-3" />
      {up ? "+" : ""}{value}%
    </span>
  );
}

function StatCard({
  icon: Icon, label, value, delta, tint,
}: {
  icon: LucideIcon; label: string; value: number; delta: number; tint: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/40 bg-gradient-to-br p-4", tint)}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-white/10 dark:bg-black/20 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <Delta value={delta} />
      </div>
      <div className="text-2xl font-bold tabular-nums text-foreground">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export function SocialAnalytics({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "you";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    // Simulate API latency so the loading state is visible. Both setData
    // calls are inside the async setTimeout callback so we don't trigger
    // synchronous setState-in-effect cascading renders.
    const t = setTimeout(() => setData(MOCK), 600);
    return () => clearTimeout(t);
  }, [open, refreshTick]);

  // Derived loading state — true whenever the overlay is open but we haven't
  // received data yet (initial mount, after a refresh, or after a clear).
  const loading = open && !data;

  const refresh = () => {
    setData(null);
    setRefreshTick((t) => t + 1);
  };

  // Growth chart — normalize bars to the max value
  const maxFollowers = data ? Math.max(...data.growth.map((g) => g.followers)) : 1;
  const minFollowers = data ? Math.min(...data.growth.map((g) => g.followers)) : 0;
  const range = Math.max(1, maxFollowers - minFollowers);

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-4xl" ariaLabel="Social Analytics">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Your Analytics</h2>
              <p className="text-xs text-muted-foreground">Personal engagement dashboard · @{username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading} aria-label="Refresh">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading || !data ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Crunching your numbers…</p>
            </div>
          ) : (
            <>
              {/* This week stats */}
              <section>
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">This week</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={FileText} label="Posts" value={data.weekStats.posts} delta={data.weekStats.postsDelta} tint="from-primary/15 to-transparent" />
                  <StatCard icon={Heart} label="Likes received" value={data.weekStats.likes} delta={data.weekStats.likesDelta} tint="from-accent/15 to-transparent" />
                  <StatCard icon={MessageCircle} label="Comments" value={data.weekStats.comments} delta={data.weekStats.commentsDelta} tint="from-secondary/15 to-transparent" />
                  <StatCard icon={UserPlus} label="New followers" value={data.weekStats.newFollowers} delta={data.weekStats.newFollowersDelta} tint="from-steel/15 to-transparent" />
                </div>
              </section>

              {/* Best posting time + Top post */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Best posting time</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{data.bestPostingTime}</p>
                  <p className="text-xs text-muted-foreground mt-1">Based on your historical engagement</p>
                </div>

                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-secondary" />
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Top post this week</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{MODULE_META[data.topPost.module].emoji}</span>
                    <span className="text-sm font-medium text-foreground">{MODULE_META[data.topPost.module].label}</span>
                    <span className="text-[11px] text-muted-foreground">· {data.topPost.timestamp}</span>
                  </div>
                  <p className="text-xs text-foreground/80 line-clamp-2 mb-2">{data.topPost.preview}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {data.topPost.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {data.topPost.comments}</span>
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {data.topPost.views}</span>
                  </div>
                </div>
              </section>

              {/* Growth chart (CSS bars) */}
              <section className="rounded-xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Follower growth (7 days)</span>
                  </div>
                  <span className="text-xs font-medium text-foreground tabular-nums">
                    +{(data.growth[data.growth.length - 1]!.followers - data.growth[0]!.followers).toLocaleString()} followers
                  </span>
                </div>
                <div className="flex items-end gap-1.5 h-32">
                  {data.growth.map((g, i) => {
                    const heightPct = ((g.followers - minFollowers) / range) * 100;
                    const minH = 8; // min bar height so even the lowest day is visible
                    return (
                      <motion.div
                        key={g.day}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(minH, heightPct)}%` }}
                        transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 20 }}
                        className="flex-1 flex flex-col items-center justify-end gap-1"
                      >
                        <span className="text-[10px] text-muted-foreground tabular-nums">{g.followers}</span>
                        <div className="w-full rounded-t-md bg-gradient-to-t from-secondary/40 to-secondary/80 min-h-[6px]" style={{ height: `${Math.max(minH, heightPct)}%` }} />
                        <span className="text-[10px] text-muted-foreground">{g.day}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* Module breakdown */}
              <section className="rounded-xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-secondary" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Module breakdown</span>
                </div>
                <div className="space-y-2.5">
                  {data.moduleBreakdown.map((m) => (
                    <div key={m.module} className="flex items-center gap-3">
                      <span className="text-base w-6">{MODULE_META[m.module].emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{MODULE_META[m.module].label}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{m.posts} posts · {m.engagement} engagements</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${m.pct}%` }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="h-full bg-secondary/70"
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-foreground tabular-nums w-10 text-right">{m.pct}%</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Audience insights */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-secondary" />
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Top countries</span>
                  </div>
                  <div className="space-y-2">
                    {data.audienceCountries.map((c) => (
                      <div key={c.country} className="flex items-center gap-2">
                        <span className="text-base w-6">{c.flag}</span>
                        <span className="text-sm text-foreground flex-1">{c.country}</span>
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="h-full bg-secondary/70" />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-secondary" />
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Age ranges</span>
                  </div>
                  <div className="space-y-2">
                    {data.audienceAges.map((a) => (
                      <div key={a.range} className="flex items-center gap-2">
                        <span className="text-sm text-foreground flex-1">{a.range}</span>
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${a.pct}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="h-full bg-secondary/70" />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{a.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* AI Insight card */}
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-transparent p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">AI Insight</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary font-medium">PRO TIP</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{data.aiInsight}</p>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("circle:smart-compose"))}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:underline"
                    >
                      Open Smart Compose <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.section>
            </>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}
