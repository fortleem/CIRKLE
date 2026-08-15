"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Sparkles, Flame, TrendingUp, Compass, Gem, Clock, Shuffle,
  Heart, MessageCircle, Share2, Bookmark, UserPlus, Check,
  ChevronLeft, ChevronRight, Loader2, MapPin, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { CircleAvatar } from "@/components/brand/circle-avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Types ──────────────────────────────────────────────────────────────────

type DiscoveryModule = "midan" | "lamahat" | "mashahd" | "wasl";

interface DiscoveryCard {
  id: string;
  module: DiscoveryModule;
  /** Title / preview text. */
  title: string;
  /** Optional subtitle (e.g. caption, snippet). */
  subtitle?: string;
  /** Author display name. */
  author: string;
  authorUsername: string;
  authorInitials: string;
  authorTint: "teal" | "gold" | "rose" | "steel" | "charcoal";
  /** Engagement counts. */
  likes: number;
  comments: number;
  views: number;
  /** Time-ago label. */
  when: string;
  /** For "Hidden gems" — quality score 0..100. */
  qualityScore?: number;
  /** For "Nostalgia" — the original post date. */
  originalDate?: string;
  /** For "Trending in your city" — the city. */
  city?: string;
  /** For "Because you engaged with X" — the seed topic. */
  seedTopic?: string;
}

interface Section {
  id: string;
  title: string;
  caption: string;
  icon: LucideIcon;
  tint: string;
  cards: DiscoveryCard[];
}

// ── Module metadata ────────────────────────────────────────────────────────

const MODULE_META: Record<DiscoveryModule, { label: string; emoji: string; tint: string }> = {
  midan:   { label: "Midan",   emoji: "📢", tint: "from-primary/15 to-transparent" },
  lamahat: { label: "Lamahat", emoji: "📸", tint: "from-rose-400/15 to-transparent" },
  mashahd: { label: "Mashahd", emoji: "🎬", tint: "from-teal-500/15 to-transparent" },
  wasl:    { label: "Wasl",    emoji: "💬", tint: "from-amber-400/15 to-transparent" },
};

// ── Mock discovery data ────────────────────────────────────────────────────

const TRENDING: DiscoveryCard[] = [
  { id: "t1", module: "midan",   title: "The new metro line opened today — here's a 60-sec walkthrough", author: "Omar Khalil", authorUsername: "omar.k", authorInitials: "OK", authorTint: "teal",   likes: 412, comments: 87,  views: 8200,  when: "2h", city: "Cairo" },
  { id: "t2", module: "mashahd", title: "30-sec sunset timelapse from the Citadel",                       author: "Mariam Sami", authorUsername: "mariam.s", authorInitials: "MS", authorTint: "steel",  likes: 980, comments: 142, views: 18400, when: "5h", city: "Cairo" },
  { id: "t3", module: "lamahat", title: "The light in Old Cairo right now is unreal",                      author: "Nour Hany",  authorUsername: "nour.h",  authorInitials: "NH", authorTint: "rose",   likes: 521, comments: 38,  views: 6700,  when: "1h", city: "Cairo" },
  { id: "t4", module: "midan",   title: "Best kettle-cooked koshary in the city — fight me",              author: "Karim Nabil",authorUsername: "karim.n", authorInitials: "KN", authorTint: "gold",   likes: 364, comments: 220, views: 5100,  when: "8h", city: "Cairo" },
  { id: "t5", module: "mashahd", title: "Drive through downtown at 3am — quiet streets, golden lamps",     author: "Yasmin Adel",authorUsername: "yasmin.a",authorInitials: "YA", authorTint: "gold",   likes: 720, comments: 96,  views: 12200, when: "3h", city: "Cairo" },
];

const BECAUSE_YOU_ENGAGED: DiscoveryCard[] = [
  { id: "b1", module: "midan",   title: "3 specialty coffee roasters in Cairo ranked by their house espresso", subtitle: "You engaged with @layla.h's coffee post last week", author: "Tarek Fouad", authorUsername: "tarek.f", authorInitials: "TF", authorTint: "teal",   likes: 198, comments: 24, views: 2100, when: "1d", seedTopic: "coffee" },
  { id: "b2", module: "lamahat", title: "A study in window-light — 6 frames from a single morning",          subtitle: "Similar to your saved Lamahat photos",              author: "Salma Wagdy",authorUsername: "salma.w", authorInitials: "SW", authorTint: "rose",   likes: 312, comments: 41, views: 3800, when: "2d", seedTopic: "photography" },
  { id: "b3", module: "mashahd", title: "How I edit my travel vlogs in 60 minutes — full walkthrough",       subtitle: "Because you watched Mariam's city tour",            author: "Aya Reda",   authorUsername: "aya.r",   authorInitials: "AR", authorTint: "gold",   likes: 540, comments: 88, views: 9800, when: "3d", seedTopic: "video editing" },
  { id: "b4", module: "midan",   title: "Why regional cinema is having a moment — a long read",              subtitle: "You commented on Karim's hot-take",                 author: "Faris Adel", authorUsername: "faris.a", authorInitials: "FA", authorTint: "steel",  likes: 167, comments: 52, views: 2400, when: "4d", seedTopic: "cinema" },
];

const NEW_CREATORS: DiscoveryCard[] = [
  { id: "n1", module: "lamahat", title: "Just joined — sharing my street photography from Alexandria", author: "Salma Wagdy", authorUsername: "salma.w", authorInitials: "SW", authorTint: "rose",   likes: 87,  comments: 12, views: 920,   when: "6h" },
  { id: "n2", module: "mashahd", title: "First video — a 60-second tour of my neighborhood market",    author: "Faris Adel",  authorUsername: "faris.a", authorInitials: "FA", authorTint: "steel",  likes: 142, comments: 19, views: 1400,  when: "12h" },
  { id: "n3", module: "midan",   title: "Hello Cirkle — I'll be writing about local food scenes",      author: "Aya Reda",    authorUsername: "aya.r",   authorInitials: "AR", authorTint: "gold",   likes: 64,  comments: 8,  views: 510,   when: "1d" },
  { id: "n4", module: "lamahat", title: "New here — testing the waters with a sunrise series",        author: "Hassan Maged",authorUsername: "hassan.m",authorInitials: "HM", authorTint: "teal",   likes: 38,  comments: 5,  views: 280,   when: "2d" },
];

const HIDDEN_GEMS: DiscoveryCard[] = [
  { id: "h1", module: "midan",   title: "A 200-word story about my grandmother's kitchen",                    author: "Aya Reda",    authorUsername: "aya.r",   authorInitials: "AR", authorTint: "gold",   likes: 24,  comments: 18, views: 142,   when: "2d",  qualityScore: 94 },
  { id: "h2", module: "lamahat", title: "Macro shot of a bee on jasmine — first try, no editing",             author: "Hassan Maged",authorUsername: "hassan.m",authorInitials: "HM", authorTint: "teal",   likes: 31,  comments: 14, views: 210,   when: "3d",  qualityScore: 91 },
  { id: "h3", module: "mashahd", title: "Field recording: call to prayer echoing across the old city",        author: "Salma Wagdy", authorUsername: "salma.w", authorInitials: "SW", authorTint: "rose",   likes: 19,  comments: 22, views: 95,    when: "5d",  qualityScore: 96 },
  { id: "h4", module: "midan",   title: "I tracked my screen time for 30 days — here's what changed",         author: "Faris Adel",  authorUsername: "faris.a", authorInitials: "FA", authorTint: "steel",  likes: 42,  comments: 31, views: 380,   when: "1w",  qualityScore: 89 },
];

const NOSTALGIA: DiscoveryCard[] = [
  { id: "x1", module: "lamahat", title: "Coffee on the balcony — this exact day, last year",   author: "You",         authorUsername: "you",     authorInitials: "ME", authorTint: "charcoal",likes: 88,  comments: 12, views: 410,  when: "1y ago", originalDate: "1 year ago today" },
  { id: "x2", module: "midan",   title: "First week at the new job — I was nervous!",          author: "You",         authorUsername: "you",     authorInitials: "ME", authorTint: "charcoal",likes: 142, comments: 24, views: 680,  when: "1y ago", originalDate: "1 year ago today" },
  { id: "x3", module: "mashahd", title: "That sunset walk along the corniche",                  author: "You",         authorUsername: "you",     authorInitials: "ME", authorTint: "charcoal",likes: 211, comments: 38, views: 1240, when: "1y ago", originalDate: "1 year ago today" },
];

const SECTIONS: Section[] = [
  { id: "trending",   title: "Trending in your city",      caption: "Hot posts + videos + photos from Cairo right now",       icon: Flame,       tint: "from-amber-500/10 to-transparent", cards: TRENDING },
  { id: "because",    title: "Because you engaged with…",  caption: "Similar content based on your recent activity",          icon: TrendingUp,  tint: "from-teal-500/10 to-transparent",  cards: BECAUSE_YOU_ENGAGED },
  { id: "creators",   title: "New creators to discover",   caption: "Fresh voices matched to your interests",                 icon: Compass,     tint: "from-rose-400/10 to-transparent",  cards: NEW_CREATORS },
  { id: "gems",       title: "Hidden gems",                caption: "High-quality posts with low views — AI-surfaced",        icon: Gem,         tint: "from-purple-500/10 to-transparent",cards: HIDDEN_GEMS },
  { id: "nostalgia",  title: "Nostalgia",                  caption: "Your posts from one year ago today",                     icon: Clock,       tint: "from-steel/10 to-transparent",     cards: NOSTALGIA },
];

// ── For-You mix (blends all modules) ──────────────────────────────────────

const FOR_YOU: DiscoveryCard[] = [
  TRENDING[1]!,
  HIDDEN_GEMS[0]!,
  BECAUSE_YOU_ENGAGED[2]!,
  NEW_CREATORS[0]!,
  TRENDING[2]!,
  NOSTALGIA[2]!,
  HIDDEN_GEMS[2]!,
  BECAUSE_YOU_ENGAGED[0]!,
];

// ── Component ──────────────────────────────────────────────────────────────

export function ContentDiscovery({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "you";

  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<"foryou" | "sections">("foryou");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [surpriseCard, setSurpriseCard] = useState<DiscoveryCard | null>(null);

  // Simulate latency so the loading state is visible. The setState call is
  // inside the async setTimeout so we don't trigger synchronous
  // setState-in-effect cascading renders.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setHydrated(true), 450);
    return () => clearTimeout(t);
  }, [open]);

  // Reset state when overlay closes — deferred to a microtask so we don't
  // trip the synchronous-setState-in-effect lint rule.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setSurpriseCard(null);
      setTab("foryou");
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  // Derived loading state — true whenever the overlay is open but we haven't
  // hydrated yet (initial mount).
  const loading = open && !hydrated;

  const allCards = useMemo(() => {
    const all = [...FOR_YOU, ...TRENDING, ...BECAUSE_YOU_ENGAGED, ...NEW_CREATORS, ...HIDDEN_GEMS, ...NOSTALGIA];
    // de-dupe by id
    const seen = new Set<string>();
    return all.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }, []);

  const surprise = () => {
    const pool = allCards.filter((c) => c.authorUsername !== "you");
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    setSurpriseCard(pick);
    toast.success("Surprise pick!", { description: pick.title.slice(0, 80) });
  };

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success("Removed from saved");
      } else {
        next.add(id);
        toast.success("Saved to collection");
      }
      return next;
    });
  };

  const toggleFollow = (username: string) => {
    setFollowedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
        toast.success(`Unfollowed @${username}`);
      } else {
        next.add(username);
        toast.success(`Following @${username}`);
      }
      return next;
    });
  };

  const share = (card: DiscoveryCard) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: card.title, text: `${card.title} — by @${card.authorUsername} on Cirkle` }).catch(() => {});
    } else {
      toast.success("Link copied", { description: `${card.title.slice(0, 60)}…` });
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-5xl" ariaLabel="Content Discovery">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Discover</h2>
              <p className="text-xs text-muted-foreground">AI-curated across all modules · @{username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={surprise}>
              <Shuffle className="w-3.5 h-3.5 mr-1.5" /> Surprise me
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-border/40">
          <button
            type="button"
            onClick={() => setTab("foryou")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
              tab === "foryou" ? "border-secondary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={tab === "foryou"}
          >
            For You mix
          </button>
          <button
            type="button"
            onClick={() => setTab("sections")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
              tab === "sections" ? "border-secondary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={tab === "sections"}
          >
            Browse sections
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Curating your discovery feed…</p>
            </div>
          ) : surpriseCard ? (
            <SurpriseCard
              card={surpriseCard}
              saved={savedIds.has(surpriseCard.id)}
              followed={followedUsers.has(surpriseCard.authorUsername)}
              onToggleSave={() => toggleSave(surpriseCard.id)}
              onToggleFollow={() => toggleFollow(surpriseCard.authorUsername)}
              onShare={() => share(surpriseCard)}
              onDismiss={() => setSurpriseCard(null)}
            />
          ) : tab === "foryou" ? (
            <CarouselSection
              id="foryou"
              title="For You mix"
              caption="AI-blended selection across Midan, Lamahat, Mashahd, and Wasl"
              icon={Sparkles}
              tint="from-secondary/10 to-transparent"
              cards={FOR_YOU}
              savedIds={savedIds}
              followedUsers={followedUsers}
              onToggleSave={toggleSave}
              onToggleFollow={toggleFollow}
              onShare={share}
            />
          ) : (
            SECTIONS.map((section) => (
              <CarouselSection
                key={section.id}
                id={section.id}
                title={section.title}
                caption={section.caption}
                icon={section.icon}
                tint={section.tint}
                cards={section.cards}
                savedIds={savedIds}
                followedUsers={followedUsers}
                onToggleSave={toggleSave}
                onToggleFollow={toggleFollow}
                onShare={share}
              />
            ))
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

// ── Carousel section ───────────────────────────────────────────────────────

interface CarouselProps {
  id: string;
  title: string;
  caption: string;
  icon: LucideIcon;
  tint: string;
  cards: DiscoveryCard[];
  savedIds: Set<string>;
  followedUsers: Set<string>;
  onToggleSave: (id: string) => void;
  onToggleFollow: (username: string) => void;
  onShare: (card: DiscoveryCard) => void;
}

function CarouselSection({
  id, title, caption, icon: Icon, tint, cards,
  savedIds, followedUsers, onToggleSave, onToggleFollow, onShare,
}: CarouselProps) {
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // Arrow visibility is updated on scroll via `updateArrows`. The initial
  // state (canLeft=false, canRight=true) is correct for fresh carousels
  // whose content overflows; since `cards` is static at module level we
  // don't need a separate mount-time effect.

  const scrollBy = (dir: 1 | -1) => {
    const el = document.getElementById(`carousel-${id}`);
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 360), behavior: "smooth" });
  };

  return (
    <section className={cn("rounded-xl border border-border/40 bg-gradient-to-br p-4", tint)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          <Icon className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-[11px] text-muted-foreground line-clamp-1">{caption}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canLeft} onClick={() => scrollBy(-1)} aria-label="Scroll left">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canRight} onClick={() => scrollBy(1)} aria-label="Scroll right">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div
        id={`carousel-${id}`}
        onScroll={updateArrows}
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x"
        style={{ scrollbarWidth: "thin" }}
      >
        {cards.map((card) => (
          <DiscoveryCardView
            key={card.id}
            card={card}
            saved={savedIds.has(card.id)}
            followed={followedUsers.has(card.authorUsername)}
            onToggleSave={() => onToggleSave(card.id)}
            onToggleFollow={() => onToggleFollow(card.authorUsername)}
            onShare={() => onShare(card)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

interface CardProps {
  card: DiscoveryCard;
  saved: boolean;
  followed: boolean;
  onToggleSave: () => void;
  onToggleFollow: () => void;
  onShare: () => void;
}

function DiscoveryCardView({ card, saved, followed, onToggleSave, onToggleFollow, onShare }: CardProps) {
  const meta = MODULE_META[card.module];
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="snap-start shrink-0 w-[260px] sm:w-[280px] rounded-xl border border-border/40 bg-card overflow-hidden flex flex-col"
    >
      {/* Top: module strip + thumbnail placeholder */}
      <div className={cn("h-20 bg-gradient-to-br relative flex items-center justify-center", meta.tint)}>
        <span className="text-3xl">{meta.emoji}</span>
        <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full bg-background/80 backdrop-blur text-foreground/80 border border-border/40">
          {meta.label}
        </span>
        {typeof card.qualityScore === "number" && (
          <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-medium">
            Quality {card.qualityScore}
          </span>
        )}
        {card.originalDate && (
          <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-steel/20 text-foreground/80 border border-steel/30 font-medium">
            {card.originalDate}
          </span>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-2">
          <CircleAvatar initials={card.authorInitials} color={card.authorTint} size="xs" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-foreground truncate">{card.author}</div>
            <div className="text-[10px] text-muted-foreground truncate">@{card.authorUsername}</div>
          </div>
          {card.authorUsername !== "you" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={onToggleFollow}
              aria-pressed={followed}
              aria-label={followed ? `Unfollow ${card.author}` : `Follow ${card.author}`}
            >
              {followed ? <Check className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
            </Button>
          )}
        </div>

        {/* Title */}
        <p className="text-xs text-foreground line-clamp-3 leading-snug flex-1">{card.title}</p>

        {card.subtitle && (
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{card.subtitle}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
          {card.city && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" /> {card.city}
            </span>
          )}
          <span>· {card.when}</span>
          <span className="ml-auto inline-flex items-center gap-0.5">
            <Heart className="w-2.5 h-2.5" /> {formatCount(card.likes)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <MessageCircle className="w-2.5 h-2.5" /> {formatCount(card.comments)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] flex-1" onClick={onToggleSave} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save to collection"}>
            <Bookmark className={cn("w-3 h-3", saved && "fill-current text-secondary")} />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onShare} aria-label="Share">
            <Share2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

// ── Surprise card spotlight ────────────────────────────────────────────────

function SurpriseCard({ card, saved, followed, onToggleSave, onToggleFollow, onShare, onDismiss }: CardProps & { onDismiss: () => void }) {
  const meta = MODULE_META[card.module];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto"
    >
      <div className="flex items-center gap-2 mb-3 text-sm text-secondary">
        <Shuffle className="w-4 h-4" />
        <span className="font-medium">AI surprise pick</span>
      </div>
      <DiscoveryCardView
        card={{ ...card, id: `surprise-${card.id}` }}
        saved={saved}
        followed={followed}
        onToggleSave={onToggleSave}
        onToggleFollow={onToggleFollow}
        onShare={onShare}
      />
      <div className={cn("mt-3 rounded-xl border border-border/40 bg-gradient-to-br p-3 text-xs text-foreground/80", meta.tint)}>
        Why this? The AI picks a high-quality post you haven't seen yet — biased toward content similar to what you usually engage with. Tap another "Surprise me" for a fresh roll.
      </div>
      <div className="flex items-center justify-center gap-2 mt-3">
        <Button variant="ghost" onClick={onDismiss}>Back to discovery</Button>
      </div>
    </motion.div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
