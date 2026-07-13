"use client";

import { motion } from "framer-motion";
import {
  Shield, Clock, EyeOff, Heart, Zap, Sparkles, Bell, BellOff,
  Lock, Globe, Users, MessageCircle, Bookmark, Share2, MoreHorizontal,
  TrendingUp, Flame, ArrowUp, ArrowDown, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Competitive Edge Components — Features that give CIRKLE an unfair advantage
 * over Facebook, Instagram, Twitter/X, YouTube, TikTok, and WhatsApp.
 *
 * Based on 2025-2026 user research:
 * - Users hate ads → CIRKLE is ad-free
 * - Users hate addictive algorithms → CIRKLE offers chronological + user-controlled
 * - Users hate privacy invasion → CIRKLE is privacy-first with consent
 * - Users hate toxic content → CIRKLE has AI safety + Citizen Shield
 * - Users hate paywalls → CIRKLE is 100% free
 * - Users want control → CIRKLE gives feed control + privacy dashboard
 */

// ── 1. Feed Control Bar (Chronological vs Algorithmic) ────────────────────
// Addresses: "Addictive algorithm" complaint (EU suing Meta)
// Users want: Chronological feed option

interface FeedControlBarProps {
  mode: "algorithmic" | "chronological" | "favorites";
  onModeChange: (mode: "algorithmic" | "chronological" | "favorites") => void;
}

export function FeedControlBar({ mode, onModeChange }: FeedControlBarProps) {
  const modes = [
    { id: "algorithmic" as const, label: "For You", icon: Sparkles, desc: "AI-curated" },
    { id: "chronological" as const, label: "Latest", icon: Clock, desc: "Chronological" },
    { id: "favorites" as const, label: "Favorites", icon: Heart, desc: "Close friends" },
  ];

  return (
    <div className="sticky top-[60px] z-20 bg-background/90 backdrop-blur-md border-b border-border/30">
      <div className="flex items-center gap-1 px-4 py-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              mode === m.id
                ? "bg-secondary/20 text-secondary border border-secondary/30"
                : "text-muted-foreground hover:bg-muted/40 border border-transparent"
            }`}
          >
            <m.icon className="w-3.5 h-3.5" />
            {m.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3 text-secondary" />
          <span>No ads · No tracking</span>
        </div>
      </div>
    </div>
  );
}

// ── 2. Privacy Badge (Shows privacy level of content) ─────────────────────
// Addresses: "Privacy invasion" complaint (WhatsApp metadata, Facebook data)
// Users want: Visible privacy indicators

interface PrivacyBadgeProps {
  level: "public" | "friends" | "private" | "encrypted";
  size?: "sm" | "md";
}

export function PrivacyBadge({ level, size = "sm" }: PrivacyBadgeProps) {
  const config = {
    public: { icon: Globe, label: "Public", color: "text-muted-foreground" },
    friends: { icon: Users, label: "Friends", color: "text-primary" },
    private: { icon: Lock, label: "Private", color: "text-accent" },
    encrypted: { icon: Shield, label: "E2EE", color: "text-secondary" },
  };
  const { icon: Icon, label, color } = config[level];
  const sz = size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1";

  return (
    <span className={`inline-flex items-center gap-1 ${sz} rounded-full bg-muted/40 ${color} font-medium`}>
      <Icon className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {label}
    </span>
  );
}

// ── 3. No-Ads Banner (Competitive differentiator) ─────────────────────────
// Addresses: "Too many ads" complaint (YouTube, Facebook, Instagram)
// Users want: Ad-free experience

export function NoAdsBanner() {
  return (
    <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-secondary/10 via-transparent to-secondary/10 border-y border-secondary/20">
      <Shield className="w-3.5 h-3.5 text-secondary" />
      <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">
        Ad-free forever · No tracking · No data selling
      </span>
    </div>
  );
}

// ── 4. Engagement Bar (Enhanced with save + AI summary) ───────────────────
// Addresses: "No control" complaint
// Users want: Save posts, AI summaries, share without tracking

interface EnhancedEngagementBarProps {
  likes: number;
  comments: number;
  shares: number;
  liked?: boolean;
  saved?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onAISummary?: () => void;
}

export function EnhancedEngagementBar({
  likes, comments, shares, liked, saved,
  onLike, onComment, onShare, onSave, onAISummary,
}: EnhancedEngagementBarProps) {
  const formatNum = (n: number) => (n > 999 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-t border-border/30">
      <button
        onClick={onLike}
        className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition ${
          liked ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-accent hover:bg-accent/10"
        }`}
      >
        <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
        <span className="font-medium">{formatNum(likes)}</span>
      </button>
      <button
        onClick={onComment}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg px-2.5 py-1.5 transition"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="font-medium">{formatNum(comments)}</span>
      </button>
      <button
        onClick={onShare}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-secondary hover:bg-secondary/10 rounded-lg px-2.5 py-1.5 transition"
      >
        <Share2 className="w-4 h-4" />
        <span className="font-medium">{formatNum(shares)}</span>
      </button>
      <button
        onClick={onSave}
        className={`flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 transition ${
          saved ? "text-secondary bg-secondary/10" : "text-muted-foreground hover:text-secondary hover:bg-muted/40"
        }`}
        title="Save for later"
      >
        <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
      </button>
      {onAISummary && (
        <button
          onClick={onAISummary}
          className="ml-auto flex items-center gap-1 text-[10px] text-secondary hover:bg-secondary/10 rounded-lg px-2 py-1.5 transition font-medium"
          title="AI summary"
        >
          <Sparkles className="w-3 h-3" />
          AI
        </button>
      )}
    </div>
  );
}

// ── 5. Wellness Timer (Anti-addiction feature) ────────────────────────────
// Addresses: "Addictive design" complaint (EU suing Meta)
// Users want: Screen time awareness without forced limits

export function WellnessTimer() {
  const [showTip, setShowTip] = useState(false);
  const [minutes] = useState(() => {
    try {
      const start = sessionStorage.getItem("cirkle_session_start");
      if (!start) {
        sessionStorage.setItem("cirkle_session_start", Date.now().toString());
        return 0;
      }
      return Math.floor((Date.now() - parseInt(start)) / 60000);
    } catch {
      return 0;
    }
  });

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowTip(!showTip);
          if (minutes > 30 && !showTip) {
            toast("You've been here a while 💚", {
              description: "Take a break — your data stays private even when you're away.",
              duration: 4000,
            });
          }
        }}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition glass rounded-full px-2.5 py-1"
      >
        <Clock className="w-3 h-3" />
        {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
      </button>
      {showTip && (
        <div className="absolute top-full right-0 mt-1 glass-strong rounded-xl p-3 shadow-float w-48 z-30 border border-border/40">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Session time: <span className="text-foreground font-medium">{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</span>
          </p>
          <p className="text-[10px] text-secondary mt-1.5">
            ✓ No addictive algorithms<br />
            ✓ You control your feed<br />
            ✓ Your data stays on device
          </p>
        </div>
      )}
    </div>
  );
}

// ── 6. Verified Human Badge (Anti-bot, anti-AI-spam) ──────────────────────
// Addresses: "Bot/troll" complaint (Twitter/X)
// Users want: Know they're talking to real humans

export function VerifiedHumanBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <span className="inline-flex items-center gap-0.5 text-secondary" title="Verified Human via Circle Verify">
      <CheckCircle2 className={sz} />
      {size === "md" && <span className="text-[10px] font-medium">Human</span>}
    </span>
  );
}

// ── 7. Trending Pill (Enhanced with category + count) ──────────────────────
// Better than Twitter's trending — shows why it's trending

interface TrendingPillProps {
  rank: number;
  topic: string;
  count: string;
  category?: string;
  onClick?: () => void;
}

export function TrendingPill({ rank, topic, count, category, onClick }: TrendingPillProps) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 glass rounded-2xl px-3 py-2 flex flex-col gap-0.5 hover:scale-[1.03] hover:border-secondary/40 border border-transparent transition text-start min-w-[120px]"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-muted-foreground font-medium">#{rank}</span>
        {category && <span className="text-[8px] text-secondary uppercase tracking-wider">{category}</span>}
        <Flame className="w-2.5 h-2.5 text-accent ml-auto" />
      </div>
      <span className="text-xs font-semibold truncate">{topic}</span>
      <span className="text-[9px] text-muted-foreground">{count} posts</span>
    </button>
  );
}

// ── 8. Quick Composer (Minimal, always accessible) ─────────────────────────
// Better than Facebook's composer — simpler, with privacy control built-in

interface QuickComposerProps {
  userName: string;
  userInitial: string;
  onPost?: () => void;
  onPhoto?: () => void;
  onVideo?: () => void;
  onAI?: () => void;
  placeholder?: string;
}

export function QuickComposer({
  userName, userInitial, onPost, onPhoto, onVideo, onAI, placeholder,
}: QuickComposerProps) {
  return (
    <div className="glass-strong rounded-2xl p-4 border border-border/40 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/40 to-accent/20 border border-secondary/30 flex items-center justify-center text-sm font-medium text-secondary shrink-0">
          {userInitial}
        </div>
        <button
          onClick={onPost}
          className="flex-1 text-start text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-full px-4 py-2.5 transition border border-border/40"
        >
          {placeholder || `What's on your mind, ${userName}?`}
        </button>
      </div>
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/30">
        <button onClick={onPost} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/70 hover:bg-muted/40 rounded-lg py-2 transition">
          <Zap className="w-4 h-4 text-secondary" /> Post
        </button>
        <button onClick={onPhoto} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/70 hover:bg-muted/40 rounded-lg py-2 transition">
          <EyeOff className="w-4 h-4 text-accent" /> Photo
        </button>
        <button onClick={onVideo} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/70 hover:bg-muted/40 rounded-lg py-2 transition">
          <Sparkles className="w-4 h-4 text-primary" /> Video
        </button>
        <button onClick={onAI} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/70 hover:bg-muted/40 rounded-lg py-2 transition">
          <Sparkles className="w-4 h-4 text-secondary" /> AI
        </button>
      </div>
    </div>
  );
}

// ── 9. Empty State (Engaging, not boring) ─────────────────────────────────
// Better than competitors' empty states — gives clear next actions

interface EmptyStateProps {
  icon: typeof Heart;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export function EngagingEmptyState({ icon: Icon, title, description, primaryAction, secondaryAction }: EmptyStateProps) {
  return (
    <div className="glass-strong rounded-2xl p-8 text-center border border-border/40">
      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-secondary/30 to-accent/15 border border-secondary/30 flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-secondary" />
      </div>
      <h3 className="font-display text-lg mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">{description}</p>
      <div className="flex items-center justify-center gap-2">
        {primaryAction && (
          <button onClick={primaryAction.onClick} className="px-4 py-2 rounded-full bg-gradient-gold text-charcoal text-xs font-medium hover:scale-[1.03] transition">
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button onClick={secondaryAction.onClick} className="px-4 py-2 rounded-full glass text-xs font-medium hover:bg-muted/40 transition">
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
