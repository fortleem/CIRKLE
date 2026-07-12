"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/app-store";
import { useAuth } from "@/lib/auth-store";
import { dict } from "@/lib/i18n";
import { COUNTRIES, getCountry } from "@/lib/countries";
import { MeshBadge } from "@/components/shell/mesh-badge";
import {
  Sparkles, MapPin, TrendingUp, Briefcase, Zap, Plus, Mic,
  ScanLine, Mail, BadgeCheck, Radio, Grid3x3, ChevronRight,
  ShieldCheck, Activity, ChevronDown, RefreshCw, AlertTriangle, Loader2,
  Hourglass, Shield, Receipt, Ghost, Aperture, Languages, BookHeart, Users, LocateFixed,
  Layers, Ship, Brain, Globe, Trophy, Cpu, Heart, HeartPulse, Clapperboard, ExternalLink, Clock,
  FileCheck,
  Bookmark, BookmarkCheck, Share2, Search, Wifi, WifiOff, X, Link as LinkIcon, Send, MessageCircle,
  Dna, Coins,
  Phone, Bot,
  BarChart3, MessageSquare, Ticket as TicketIcon, Video,
  Megaphone, GraduationCap, BookOpen,
  type LucideIcon,
} from "lucide-react";
import { Skeleton, SkeletonFeed, SkeletonNews } from "@/components/ui/skeleton";
import { MeshPresence } from "@/components/overlays/mesh-presence";
import { SocialFeed } from "@/components/social-feed";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNewsSocket, type NewsArticle as NewsArticleWS } from "@/hooks/use-news-socket";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface FeedData {
  country: string;
  city: string;
  featured: { id: string; kind: string; title: string; subtitle: string; color: string }[];
  nearby: { id: string; title: string; meta: string; tag: string }[];
  trending: { id: string; tag: string; count: string }[];
  forYou: { id: string; user: string; handle: string; time: string; body: string; likes: number; comments: number; reposts: number; verified?: boolean; image?: boolean }[];
  officialUpdates: {
    id: string;
    name: string;
    arabicName?: string;
    handle: string;
    category: "government" | "media" | "business" | "emergency";
    latestUpdate?: string;
    last?: string; // legacy alias
    subs: string;
    verified?: boolean;
    official?: boolean; // legacy alias
    type?: string; // legacy alias
    isEmergency?: boolean;
  }[];
  weather: { city: string; tempC: number; condition: string; icon: string };
  spaces: { id: string; title: string; host: string; listeners: number; live: true }[];
  generatedAt: string;
}

const COLOR_MAP: Record<string, string> = {
  rose: "from-accent/30 to-accent/5 border-accent/30",
  gold: "from-secondary/30 to-secondary/5 border-secondary/40",
  teal: "from-primary/30 to-primary/5 border-primary/30",
  steel: "from-steel/30 to-steel/5 border-steel/30",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

interface Exclusive {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  tint: string;
  evt: string;
}

const EXCLUSIVES: Exclusive[] = [
  {
    id: "personal-ai",
    emoji: "🧬",
    name: "Personal AI OS",
    desc: "Your DNA, Mood, and Topic DNA in one. The AI that learns you, on-device.",
    icon: Dna,
    tint: "from-secondary/30 to-primary/10",
    evt: "circle:personal-ai",
  },
  {
    id: "time-capsule",
    emoji: "⏰",
    name: "Time Capsule",
    desc: "Schedule a message to unlock on a future date — letters to your future self.",
    icon: Hourglass,
    tint: "from-secondary/30 to-accent/10",
    evt: "circle:time-capsule",
  },
  {
    id: "mood-feed",
    emoji: "🎭",
    name: "Mood Feed",
    desc: "Tell Cirkle your mood and the AI reshapes your entire feed in seconds.",
    icon: Sparkles,
    tint: "from-primary/30 to-secondary/10",
    evt: "circle:mood-feed",
  },
  {
    id: "privacy-shield",
    emoji: "🛡️",
    name: "Privacy Shield",
    desc: "One tap to blur every sensitive thing on screen — perfect for sharing your phone.",
    icon: Shield,
    tint: "from-steel/30 to-primary/10",
    evt: "circle:privacy-shield",
  },
  {
    id: "receipt-split",
    emoji: "🧾",
    name: "Receipt Split",
    desc: "Point the camera at a bill — AI extracts items and splits them with friends.",
    icon: Receipt,
    tint: "from-accent/30 to-secondary/10",
    evt: "circle:receipt-split",
  },
  {
    id: "circle-aura",
    emoji: "✨",
    name: "Cirkle Aura",
    desc: "A live animated aura that reflects your real-time activity across every pillar.",
    icon: Sparkles,
    tint: "from-secondary/30 to-primary/10",
    evt: "circle:circle-aura",
  },
  {
    id: "whisper-mode",
    emoji: "👻",
    name: "Whisper Mode",
    desc: "Self-destructing voice notes with AI transcription + translation.",
    icon: Ghost,
    tint: "from-primary/30 to-secondary/10",
    evt: "circle:whisper-mode",
  },
  {
    id: "circle-lens",
    emoji: "📷",
    name: "Cirkle Lens",
    desc: "Cultural AR filters for photos & video — processed on-device.",
    icon: Aperture,
    tint: "from-accent/30 to-secondary/10",
    evt: "circle:circle-lens",
  },
  {
    id: "live-translate",
    emoji: "🌐",
    name: "Live Translate",
    desc: "Real-time subtitles during Wasl video calls — translated on-device.",
    icon: Languages,
    tint: "from-steel/30 to-primary/10",
    evt: "circle:live-translate",
  },
  {
    id: "group-memory",
    emoji: "📖",
    name: "Group Memory",
    desc: "AI scrapbook of your Circle's best moments — generated on-device.",
    icon: BookHeart,
    tint: "from-secondary/30 to-accent/10",
    evt: "circle:group-memory",
  },
  {
    id: "vibe-match",
    emoji: "🛰️",
    name: "Vibe Match",
    desc: "Meet nearby people who share your vibe — privacy-preserving.",
    icon: Users,
    tint: "from-primary/30 to-secondary/10",
    evt: "circle:vibe-match",
  },
  {
    id: "ai-recap",
    emoji: "🪄",
    name: "AI Recap",
    desc: "Your day in 5 bullets — generated on-device, shared to Midan.",
    icon: Sparkles,
    tint: "from-secondary/30 to-accent/10",
    evt: "circle:ai-recap",
  },
  {
    id: "universal-story",
    emoji: "🧩",
    name: "Universal Story",
    desc: "Post once — AI optimizes for 4 pillars with live previews.",
    icon: Layers,
    tint: "from-primary/30 to-secondary/10",
    evt: "circle:universal-story",
  },
  {
    id: "vessel-tracker",
    emoji: "🚢",
    name: "Vessel Tracker",
    desc: "Live AIS map of nearby vessels — port finder, search, filters.",
    icon: Ship,
    tint: "from-steel/30 to-primary/10",
    evt: "circle:vessel-tracker",
  },
  {
    id: "smart-inbox",
    emoji: "🧠",
    name: "Smart Inbox",
    desc: "5 collapsible categories · AI 3-sentence summary · auto-replies.",
    icon: Brain,
    tint: "from-accent/30 to-secondary/10",
    evt: "circle:smart-inbox",
  },
  {
    id: "citizen-shield",
    emoji: "🛡️",
    name: "Citizen Shield",
    desc: "Report government issues · AI-verified evidence · auto-routing",
    icon: ShieldCheck,
    tint: "from-primary/30 to-secondary/10",
    evt: "circle:citizen-shield",
  },
  {
    id: "cirkle-commit",
    emoji: "🤝",
    name: "CirkleCommit",
    desc: "AI-verified agreements with escrow. Price, work, service contracts.",
    icon: ShieldCheck,
    tint: "from-secondary/30 to-accent/15",
    evt: "circle:commit",
  },
  {
    id: "cirkle-oracle",
    emoji: "🔮",
    name: "CirkleOracle",
    desc: "AI predicts: prices, travel, social, government, visa. Be ahead.",
    icon: TrendingUp,
    tint: "from-accent/25 to-secondary/10",
    evt: "circle:oracle",
  },
  {
    id: "cirkle-sentinel",
    emoji: "🛡️",
    name: "CirkleSentinel",
    desc: "AI safety guardian. Scam detection, phishing blocker, fraud alert.",
    icon: Shield,
    tint: "from-steel/30 to-accent/10",
    evt: "circle:sentinel",
  },
  {
    id: "cirkle-spark",
    emoji: "💡",
    name: "CirkleSpark",
    desc: "AI idea incubator. Pitch → evaluate → co-founders → action plan.",
    icon: Sparkles,
    tint: "from-secondary/25 to-accent/15",
    evt: "circle:spark",
  },
  {
    id: "cirkle-create",
    emoji: "🎨",
    name: "CirkleCreate",
    desc: "AI creative studio. Image, video, writing, music generation.",
    icon: Sparkles,
    tint: "from-accent/30 to-secondary/10",
    evt: "circle:create",
  },
  {
    id: "cirkle-learn",
    emoji: "📚",
    name: "CirkleLearn",
    desc: "AI personal tutor. Languages, coding, exam prep, cultural.",
    icon: Brain,
    tint: "from-primary/25 to-secondary/10",
    evt: "circle:learn",
  },
  {
    id: "cirkle-grow",
    emoji: "🌱",
    name: "CirkleGrow",
    desc: "AI life coach. Goals, habits, streaks, weekly AI review.",
    icon: Sparkles,
    tint: "from-secondary/25 to-primary/10",
    evt: "circle:grow",
  },
  {
    id: "cirkle-care",
    emoji: "❤️",
    name: "CirkleCare",
    desc: "AI health companion. 100% on-device. Symptoms, mood, meds.",
    icon: HeartPulse,
    tint: "from-accent/25 to-steel/10",
    evt: "circle:care",
  },
  {
    id: "cirkle-identity",
    emoji: "🪪",
    name: "Cirkle ID",
    desc: "Zero-knowledge identity attestations. Prove your age, nationality, profession without revealing data.",
    icon: ShieldCheck,
    tint: "from-secondary/30 to-primary/15",
    evt: "circle:identity",
  },
  {
    id: "shield-dashboard",
    emoji: "🏛️",
    name: "Shield Dashboard",
    desc: "Civic infrastructure. Publish Civic Waves, track impact, journalist safety mode.",
    icon: ShieldCheck,
    tint: "from-primary/30 to-accent/15",
    evt: "circle:shield-dashboard",
  },
  {
    id: "visa-explorer",
    emoji: "🛂",
    name: "Visa Explorer",
    desc: "Browse visa-free destinations for your passport. 15+ passports supported.",
    icon: FileCheck,
    tint: "from-primary/25 to-secondary/15",
    evt: "circle:visa-explorer",
  },
  {
    id: "mesh-dashboard",
    emoji: "📡",
    name: "Mesh Network",
    desc: "Offline messages + payments + file transfer. Cirkle works without internet.",
    icon: Radio,
    tint: "from-primary/25 to-steel/15",
    evt: "circle:mesh-dashboard",
  },
  {
    id: "oracle-markets",
    emoji: "📊",
    name: "Oracle Markets",
    desc: "Prediction markets on news, sports, crypto, visa. AI-powered probabilities.",
    icon: Activity,
    tint: "from-accent/25 to-secondary/15",
    evt: "circle:oracle-markets",
  },
  {
    id: "data-residency",
    emoji: "🌍",
    name: "Data Residency",
    desc: "Your data stays in your region. PDPL/GDPR/PIPL/FZ-242 compliant.",
    icon: Globe,
    tint: "from-primary/25 to-secondary/15",
    evt: "circle:data-residency",
  },
  {
    id: "creator-studio",
    emoji: "💰",
    name: "Creator Studio",
    desc: "Monetize your content. Micropayments, subscriptions, Mint verified badge.",
    icon: Coins,
    tint: "from-secondary/30 to-accent/15",
    evt: "circle:creator-studio",
  },
  {
    id: "call-screen",
    emoji: "📞",
    name: "Cirkle Call",
    desc: "Voice + video calls with live on-device translation.",
    icon: Phone,
    tint: "from-emerald-500/25 to-primary/15",
    evt: "circle:start-call",
  },
  {
    id: "bot-developer",
    emoji: "🤖",
    name: "Bot Developer",
    desc: "Build bots and mini-apps for Cirkle. API keys, webhooks, SDK.",
    icon: Bot,
    tint: "from-steel/30 to-secondary/15",
    evt: "circle:bot-developer",
  },
  {
    id: "poll-creator",
    emoji: "📊",
    name: "Polls & Quizzes",
    desc: "Create polls for your posts and Circles. Live results, 1h-7d durations.",
    icon: BarChart3,
    tint: "from-secondary/30 to-primary/15",
    evt: "circle:poll-creator",
  },
  {
    id: "bullet-comments",
    emoji: "💬",
    name: "Bullet Comments",
    desc: "Bilibili-style scrolling comments on videos. Real-time overlay.",
    icon: MessageSquare,
    tint: "from-accent/30 to-primary/15",
    evt: "circle:bullet-comments",
  },
  {
    id: "family-vault",
    emoji: "👨‍👩‍👧",
    name: "Family Vault",
    desc: "Encrypted family album. Cloud-free, passphrase-protected.",
    icon: ShieldCheck,
    tint: "from-emerald-500/25 to-primary/15",
    evt: "circle:family-vault",
  },
  {
    id: "ticket-mint",
    emoji: "🎫",
    name: "Ticket Mint",
    desc: "Decentralised event tickets. Ed25519-signed, QR-verifiable, no fees.",
    icon: TicketIcon,
    tint: "from-accent/25 to-secondary/15",
    evt: "circle:ticket-mint",
  },
  {
    id: "phone-migrate",
    emoji: "🔄",
    name: "Phone Migration",
    desc: "Encrypted backup + QR migration. Move your Cirkle to a new phone.",
    icon: RefreshCw,
    tint: "from-primary/25 to-secondary/15",
    evt: "circle:phone-migrate",
  },
  {
    id: "brain-orchestrator",
    emoji: "🧠",
    name: "Brain Orchestrator",
    desc: "AI connecting all features. Cross-pillar workflows + smart suggestions.",
    icon: Brain,
    tint: "from-secondary/30 to-accent/20",
    evt: "circle:orchestrator",
  },
  {
    id: "memory-dashboard",
    emoji: "🧠",
    name: "Memory Brain",
    desc: "Your permanent cognitive memory. 13 categories, encrypted, user-controlled.",
    icon: Brain,
    tint: "from-primary/25 to-secondary/15",
    evt: "circle:memory",
  },
  {
    id: "pro-network",
    emoji: "💼",
    name: "Professional Network",
    desc: "Jobs, profiles, endorsements, salary insights. Free forever.",
    icon: Briefcase,
    tint: "from-steel/25 to-primary/15",
    evt: "circle:pro-network",
  },
  {
    id: "cirkle-maps",
    emoji: "🗺️",
    name: "Cirkle Maps",
    desc: "Free OSM maps, routing, geocoding. Privacy-first, no tracking.",
    icon: MapPin,
    tint: "from-primary/25 to-steel/15",
    evt: "circle:cirkle-maps",
  },
  {
    id: "circle-mail",
    emoji: "📧",
    name: "Cirkle Mail",
    desc: "Free @cirkle.app email. AI triage, on-device privacy.",
    icon: Mail,
    tint: "from-accent/20 to-primary/15",
    evt: "circle:circle-mail",
  },
  {
    id: "ad-studio",
    emoji: "📺",
    name: "Ad Studio",
    desc: "Non-targeted local ads. Advertiser portal, CPM campaigns, invoice billing.",
    icon: Radio,
    tint: "from-secondary/25 to-accent/15",
    evt: "circle:ad-studio",
  },
  {
    id: "cirkle-gradebook",
    emoji: "🎓",
    name: "Cirkle Gradebook",
    desc: "Assignments, grades, attendance. Free for schools, K-12, universities.",
    icon: BookHeart,
    tint: "from-primary/20 to-secondary/15",
    evt: "circle:cirkle-gradebook",
  },
  {
    id: "knowledge-wiki",
    emoji: "📚",
    name: "Knowledge Wiki",
    desc: "Collaborative Markdown wikis for your Circles. Version history included.",
    icon: Layers,
    tint: "from-steel/20 to-primary/15",
    evt: "circle:knowledge-wiki",
  },
];

// ── Priority Shares — latest from Lamahat, Mashahd, Midan ──────────────────
function PriorityShares() {
  const [shares, setShares] = useState<{ id: string; module: "lamahat" | "mashahd" | "midan"; title: string; author: string; time: string; emoji: string; gradient: string }[]>([]);
  const [loadingShares, setLoadingShares] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [lamRes, mashRes, midRes] = await Promise.all([
          fetch("/api/posts?module=lamahat&limit=2", { cache: "no-store" }).then(r => r.json()).catch(() => []),
          fetch("/api/posts?module=mashahd&limit=2", { cache: "no-store" }).then(r => r.json()).catch(() => []),
          fetch("/api/posts?module=midan&limit=2", { cache: "no-store" }).then(r => r.json()).catch(() => []),
        ]);
        const lamArr = Array.isArray(lamRes) ? lamRes : (lamRes?.posts || []);
        const mashArr = Array.isArray(mashRes) ? mashRes : (mashRes?.posts || []);
        const midArr = Array.isArray(midRes) ? midRes : (midRes?.posts || []);
        const items: { id: string; module: "lamahat" | "mashahd" | "midan"; title: string; author: string; time: string; emoji: string; gradient: string }[] = [
          ...lamArr.slice(0, 2).map((p: any, i: number) => ({ id: p.id || `lam-${i}`, module: "lamahat" as const, title: (p.body || p.title || "Photo").slice(0, 60), author: p.authorName || p.authorHandle || "User", time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now", emoji: "📸", gradient: "from-accent/30 to-primary/15" })),
          ...mashArr.slice(0, 2).map((p: any, i: number) => ({ id: p.id || `mash-${i}`, module: "mashahd" as const, title: (p.body || p.title || "Video").slice(0, 60), author: p.authorName || p.authorHandle || "Creator", time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now", emoji: "🎬", gradient: "from-primary/30 to-secondary/15" })),
          ...midArr.slice(0, 2).map((p: any, i: number) => ({ id: p.id || `mid-${i}`, module: "midan" as const, title: (p.body || p.title || "Post").slice(0, 60), author: p.authorName || p.authorHandle || "User", time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now", emoji: "💬", gradient: "from-secondary/30 to-accent/15" })),
        ];
        setShares(items);
      } catch { setShares([]); }
      finally { setLoadingShares(false); }
    })();
  }, []);

  if (loadingShares) {
    return (
      <section className="px-6">
        <SectionHeader icon={Activity} title="Priority Shares" inline brain />
        <div className="flex gap-3 overflow-hidden px-1 pb-2">
          {[0,1,2].map(i => <div key={i} className="shrink-0 w-[200px] h-[100px] skeleton-shimmer rounded-2xl" />)}
        </div>
      </section>
    );
  }

  if (shares.length === 0) return null;

  return (
    <section className="px-6">
      <SectionHeader icon={Activity} title="Priority Shares" inline brain />
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-1 pb-2">
        {shares.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: s.module === "lamahat" ? "lamahat" : s.module === "mashahd" ? "mashahd" : "midan" } }))}
            className={`shrink-0 w-[200px] h-[100px] rounded-2xl bg-gradient-to-br ${s.gradient} glass border border-border/40 p-3 flex flex-col justify-between text-start hover:scale-[1.02] transition`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{s.emoji}</span>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.module}</span>
            </div>
            <div>
              <p className="text-xs font-medium line-clamp-2 leading-snug">{s.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.author} · {s.time}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

export function HomeScreen() {
  const { locale, country, setCountry, city, setCity } = useApp();
  const { user } = useAuth();
  const firstName = user?.displayName?.trim().split(/\s+/)[0] || user?.username || "friend";
  const t = dict[locale].home;
  const cInfo = getCountry(country);
  const effectiveCity = city || cInfo.capital;

  // Push notifications for emergency alerts
  const { showNotification } = usePushNotifications();

  const [feed, setFeed] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAllSections, setShowAllSections] = useState(false);
  const [showAllExclusives, setShowAllExclusives] = useState(false);

  // Personal AI consent + context (for Brain AI personalization)
  const [personalAIConsent, setPersonalAIConsent] = useState(false);
  const [personalizationContext, setPersonalizationContext] = useState<string>("");

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed?country=${country}&city=${encodeURIComponent(effectiveCity)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("feed failed");
      const data = (await res.json()) as FeedData;
      setFeed(data);
    } catch (e) {
      setError("Couldn't reach the live feed. Pull to retry.");
      // Empty fallback — no mock data. The user sees the empty sections
      // below rather than fabricated content.
      setFeed({
        country, city: effectiveCity,
        featured: [],
        nearby: [],
        trending: [],
        forYou: [],
        officialUpdates: [],
        weather: { city: effectiveCity, tempC: 0, condition: "—", icon: "⛅" },
        spaces: [],
        generatedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [country, effectiveCity, cInfo]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Fetch Personal AI consent + personalization context for Brain AI
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getPersonalAIConsent, personalAI } = await import("@/lib/personal-ai");
        const consent = await getPersonalAIConsent();
        if (cancelled) return;
        setPersonalAIConsent(consent);
        if (consent) {
          const ctx = await personalAI.getPersonalizationContext();
          if (!cancelled) setPersonalizationContext(ctx);
        }
      } catch {
        // Personal AI not available — defaults remain false/empty.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cirkle Brain AI — auto-refresh the Featured section every 3 minutes
  // so the feed stays current with real-time web trends without requiring
  // a manual refresh or page reload.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFeed();
    }, 3 * 60 * 1000); // 3 minutes
    return () => clearInterval(interval);
  }, [fetchFeed]);

  // Cirkle Brain AI — auto-refresh news every 2 minutes from country's most visited sites
  // (moved below — needs activeNewsCat + fetchNewsCat which are declared later)

  const featured = feed?.featured || [];
  const nearby = feed?.nearby || [];
  const trending = feed?.trending || [];
  const forYou = feed?.forYou || [];
  const official = feed?.officialUpdates || [];
  const spaces = feed?.spaces || [];
  const weather = feed?.weather;

  // ── Categorized News (real web-sourced) ───────────────────────
  interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    source: string;
    sourceUrl: string;
    category: string;
    publishedAt: string;
    imageUrl?: string;
  }

  const NEWS_CATEGORIES = [
    { id: "breaking", label: "Breaking", icon: Zap },
    { id: "local", label: "Local", icon: MapPin },
    { id: "international", label: "World", icon: Globe },
    { id: "sports", label: "Sports", icon: Trophy },
    { id: "economy", label: "Economy", icon: TrendingUp },
    { id: "technology", label: "Tech", icon: Cpu },
    { id: "health", label: "Health", icon: HeartPulse },
    { id: "entertainment", label: "Entertainment", icon: Clapperboard },
  ] as const;

  type NewsCat = (typeof NEWS_CATEGORIES)[number]["id"] | "for-you" | "saved";

  const [activeNewsCat, setActiveNewsCat] = useState<NewsCat>("for-you");
  const [newsByCat, setNewsByCat] = useState<Record<string, NewsArticle[]>>({});
  const [newsLoading, setNewsLoading] = useState(false);
  const [servingFromCache, setServingFromCache] = useState(false);

  // Clear stale news cache on mount (ensures fresh news on every app open)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("cirkle-news-cache-"));
      keys.forEach(k => {
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || "{}");
          // Remove any cache entry older than 10 minutes
          if (Date.now() - (parsed.timestamp || 0) > 10 * 60 * 1000) {
            localStorage.removeItem(k);
          }
        } catch { localStorage.removeItem(k); }
      });
    } catch { /* ignore */ }
  }, []);

  // Multi-language toggle (EN / AR) — persisted in localStorage.
  const [newsLang, setNewsLang] = useState<"en" | "ar">(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("cirkle-news-lang");
    return saved === "ar" ? "ar" : "en";
  });

  // Bookmarks — full NewsArticle objects persisted in localStorage.
  const [bookmarks, setBookmarks] = useState<NewsArticle[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("cirkle-news-bookmarks");
      return raw ? (JSON.parse(raw) as NewsArticle[]) : [];
    } catch {
      return [];
    }
  });

  // Reading history (article titles) — capped at 50, persisted in localStorage.
  const [readingHistory, setReadingHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("cirkle-reading-history");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  // News search query — empty string = show category view.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NewsArticle[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist language / bookmarks / reading history to localStorage on change.
  useEffect(() => {
    try { window.localStorage.setItem("cirkle-news-lang", newsLang); } catch { /* ignore */ }
  }, [newsLang]);
  useEffect(() => {
    try { window.localStorage.setItem("cirkle-news-bookmarks", JSON.stringify(bookmarks)); } catch { /* ignore */ }
  }, [bookmarks]);
  useEffect(() => {
    try { window.localStorage.setItem("cirkle-reading-history", JSON.stringify(readingHistory)); } catch { /* ignore */ }
  }, [readingHistory]);

  // ── Real-time WebSocket news updates ──────────────────────────
  const { isConnected: newsLive, breaking: liveBreaking } = useNewsSocket({
    country,
    language: newsLang,
    enabled: true,
    maxBreaking: 12,
    onEmergency: useCallback((payload) => {
      toast.error(`⚠️ ${payload.article.title}`, {
        description: payload.article.summary || payload.article.source,
        duration: 8000,
      });
      // Also show a push notification for emergencies
      showNotification({
        title: `⚠️ ${payload.article.title}`,
        body: payload.article.summary || payload.article.source,
        url: payload.article.sourceUrl,
        isEmergency: true,
      });
    }, []),
  });

  // Merge live breaking items into the breaking category view. New items
  // slide in via framer-motion's AnimatePresence (rendered below).
  useEffect(() => {
    if (liveBreaking.length === 0) return;
    setNewsByCat((prev) => {
      const existing = prev["breaking"] || [];
      const seen = new Set(existing.map((a) => a.sourceUrl));
      const fresh = liveBreaking.filter((a) => !seen.has(a.sourceUrl));
      if (fresh.length === 0) return prev;
      return { ...prev, breaking: [...fresh, ...existing].slice(0, 12) };
    });
  }, [liveBreaking]);

  // ── Offline cache helpers ─────────────────────────────────────
  const NEWS_CACHE_PREFIX = "cirkle-news-cache-";
  const NEWS_CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes (was 1 hour — caused stale news)

  const readNewsCache = useCallback((cat: string): NewsArticle[] | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(`${NEWS_CACHE_PREFIX}${cat}-${newsLang}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { articles: NewsArticle[]; timestamp: number; expiry: number };
      if (Date.now() - parsed.timestamp > (parsed.expiry || NEWS_CACHE_EXPIRY_MS)) {
        window.localStorage.removeItem(`${NEWS_CACHE_PREFIX}${cat}-${newsLang}`);
        return null;
      }
      return parsed.articles || [];
    } catch {
      return null;
    }
  }, [newsLang]);

  const writeNewsCache = useCallback((cat: string, articles: NewsArticle[]) => {
    if (typeof window === "undefined") return;
    try {
      const entry = { articles, timestamp: Date.now(), expiry: NEWS_CACHE_EXPIRY_MS };
      window.localStorage.setItem(`${NEWS_CACHE_PREFIX}${cat}-${newsLang}`, JSON.stringify(entry));
    } catch { /* ignore quota errors */ }
  }, [newsLang]);

  // ── Fetch one news category (with cache + offline fallback) ────
  const fetchNewsCat = useCallback(async (cat: NewsCat) => {
    if (cat === "saved") {
      // Saved tab — no fetch, just render the bookmarks array.
      setNewsByCat((prev) => ({ ...prev, saved: bookmarks }));
      setServingFromCache(false);
      return;
    }
    if (cat === "for-you") {
      // Personalized recommendations — handled by a separate effect below.
      return;
    }

    // Show cached articles immediately while we fetch fresh ones.
    const cached = readNewsCache(cat);
    if (cached && cached.length > 0) {
      setNewsByCat((prev) => ({ ...prev, [cat]: cached }));
      setServingFromCache(true);
    } else {
      setServingFromCache(false);
    }

    setNewsLoading(true);
    try {
      const res = await fetch(
        `/api/news/categories?country=${country}&city=${encodeURIComponent(city || "")}&category=${cat}&perCategory=4&language=${newsLang}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const items: NewsArticle[] = Array.isArray(data) ? data : (data[cat] || data.items || []);
        if (items.length > 0) {
          setNewsByCat((prev) => ({ ...prev, [cat]: items }));
          writeNewsCache(cat, items);
          setServingFromCache(false);
        }
      } else if (cached && cached.length > 0) {
        // Fetch failed — keep showing cached articles.
        setServingFromCache(true);
      }
    } catch {
      // Network error — keep showing cached articles if we have them.
      if (cached && cached.length > 0) {
        setServingFromCache(true);
      }
    }
    setNewsLoading(false);
  }, [country, city, newsLang, readNewsCache, writeNewsCache, bookmarks]);

  // ── Fetch personalized "For You" recommendations ──────────────
  const fetchForYou = useCallback(async () => {
    setNewsLoading(true);
    // Try cached For You first.
    const cached = readNewsCache("for-you");
    if (cached && cached.length > 0) {
      setNewsByCat((prev) => ({ ...prev, "for-you": cached }));
      setServingFromCache(true);
    }
    try {
      const historyParam = encodeURIComponent(readingHistory.slice(0, 30).join(","));
      const res = await fetch(
        `/api/news/recommend?country=${country}&language=${newsLang}&limit=8${historyParam ? `&history=${historyParam}` : ""}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const items: NewsArticle[] = Array.isArray(data) ? data : (data.items || []);
        if (items.length > 0) {
          setNewsByCat((prev) => ({ ...prev, "for-you": items }));
          writeNewsCache("for-you", items);
          setServingFromCache(false);
        }
      } else if (cached && cached.length > 0) {
        setServingFromCache(true);
      }
    } catch {
      if (cached && cached.length > 0) setServingFromCache(true);
    }
    setNewsLoading(false);
  }, [country, newsLang, readingHistory, readNewsCache, writeNewsCache]);

  // ── Bookmark handlers ─────────────────────────────────────────
  const isBookmarked = useCallback(
    (article: NewsArticle) => bookmarks.some((b) => b.sourceUrl === article.sourceUrl),
    [bookmarks]
  );
  const toggleBookmark = useCallback((article: NewsArticle, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setBookmarks((prev) => {
      const existing = prev.find((b) => b.sourceUrl === article.sourceUrl);
      if (existing) {
        toast.success(`Removed from Saved`);
        return prev.filter((b) => b.sourceUrl !== article.sourceUrl);
      }
      toast.success(`Saved to your library`);
      return [{ ...article }, ...prev];
    });
    // If we're on the Saved tab, refresh its view.
    setActiveNewsCat((cur) => {
      if (cur === "saved") {
        // Defer to next tick so we read the latest bookmarks state.
        setTimeout(() => {
          setNewsByCat((prev) => ({ ...prev, saved: [] })); // forces re-render via effect
        }, 0);
      }
      return cur;
    });
  }, []);

  // Refresh "saved" tab when bookmarks change.
  useEffect(() => {
    if (activeNewsCat === "saved") {
      setNewsByCat((prev) => ({ ...prev, saved: bookmarks }));
      setServingFromCache(false);
    }
  }, [bookmarks, activeNewsCat]);

  // ── Reading history handler ───────────────────────────────────
  const recordRead = useCallback((article: NewsArticle) => {
    setReadingHistory((prev) => {
      const next = [article.title, ...prev.filter((t) => t !== article.title)].slice(0, 50);
      return next;
    });
  }, []);

  // ── Social sharing handlers ───────────────────────────────────
  const shareToWasl = useCallback((article: NewsArticle) => {
    window.dispatchEvent(new CustomEvent("share-to-wasl", {
      detail: { title: article.title, url: article.sourceUrl, source: article.source },
    }));
    toast.success(`Shared “${article.title.slice(0, 40)}${article.title.length > 40 ? "…" : ""}” to Wasl`);
  }, []);
  const shareToMidan = useCallback((article: NewsArticle) => {
    window.dispatchEvent(new CustomEvent("share-to-midan", {
      detail: { title: article.title, url: article.sourceUrl, source: article.source },
    }));
    toast.success(`Shared “${article.title.slice(0, 40)}${article.title.length > 40 ? "…" : ""}” to Midan`);
  }, []);
  const copyLink = useCallback(async (article: NewsArticle) => {
    try {
      await navigator.clipboard.writeText(article.sourceUrl);
      toast.success("Link copied to clipboard");
    } catch {
      // Fallback for browsers without clipboard API access.
      toast.error("Couldn't copy link — try long-pressing the URL.");
    }
  }, []);

  // ── Cross-category search (debounced) ─────────────────────────
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/news/search?q=${encodeURIComponent(q)}&country=${country}&language=${newsLang}&limit=10`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const items: NewsArticle[] = Array.isArray(data) ? data : (data.items || []);
          setSearchResults(items);
        } else {
          setSearchResults([]);
        }
      } catch {
        // Fall back to local filtering only.
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, country, newsLang]);

  // ── Trigger fetches when category or language changes ─────────
  useEffect(() => {
    if (searchQuery.trim()) return; // searching — don't fetch category
    if (activeNewsCat === "for-you") {
      fetchForYou();
    } else if (activeNewsCat === "saved") {
      setNewsByCat((prev) => ({ ...prev, saved: bookmarks }));
    } else {
      fetchNewsCat(activeNewsCat);
    }
  }, [activeNewsCat, fetchNewsCat, fetchForYou, searchQuery, bookmarks, newsLang]);

  // Cirkle Brain AI — auto-refresh news every 2 minutes from country's most visited sites
  // (e.g., masrawy.com, alahram.org for Egypt; nytimes.com, cnn.com for US; worldwide)
  useEffect(() => {
    const newsInterval = setInterval(() => {
      try {
        Object.keys(localStorage).filter(k => k.startsWith("cirkle-news-cache-")).forEach(k => {
          const parsed = JSON.parse(localStorage.getItem(k) || "{}");
          if (Date.now() - (parsed.timestamp || 0) > 2 * 60 * 1000) localStorage.removeItem(k);
        });
      } catch { /* ignore */ }
      setNewsByCat({});
      fetchNewsCat(activeNewsCat);
    }, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(newsInterval);
  }, [activeNewsCat, fetchNewsCat]);

  // ── Derived list to render (handles search + category + saved + for-you) ──
  const isSearching = searchQuery.trim().length > 0;
  const currentList: NewsArticle[] = useMemo(() => {
    if (isSearching && searchResults) {
      // When searching, merge server results with locally-filtered current
      // category items so users see immediate matches too.
      const q = searchQuery.trim().toLowerCase();
      const localMatches = (newsByCat[activeNewsCat] || []).filter((a) =>
        a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q)
      );
      const merged = [...searchResults];
      const seen = new Set(merged.map((a) => a.sourceUrl));
      for (const m of localMatches) {
        if (!seen.has(m.sourceUrl)) {
          merged.push(m);
          seen.add(m.sourceUrl);
        }
      }
      return merged;
    }
    if (activeNewsCat === "saved") return bookmarks;
    return newsByCat[activeNewsCat] || [];
  }, [isSearching, searchResults, searchQuery, newsByCat, activeNewsCat, bookmarks]);

  // Render-time local filter for non-search view (typing in search while a
  // category is active filters the current category too).
  const visibleList: NewsArticle[] = useMemo(() => {
    if (isSearching) return currentList;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter((a) =>
      a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q)
    );
  }, [currentList, isSearching, searchQuery]);

  return (
    <div className="space-y-8 pb-32 xl:grid xl:grid-cols-[420px_1fr] xl:gap-6 xl:space-y-0">
      {/* Main feed column — XL: wide (now on RIGHT), default: full width */}
      <div className="space-y-8 xl:pb-32 xl:order-2 order-1">
      {/* Greeting + mesh + region selector — Super-upgraded with profile avatar */}
      <section className="px-6 pt-2 flex items-start justify-between gap-3">
        {/* Profile avatar + greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "profile" } }))}
            className="relative shrink-0 group"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary/40 to-accent/20 border-2 border-secondary/40 flex items-center justify-center text-lg font-display text-secondary group-hover:scale-105 transition">
              {firstName[0]}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
          </button>
          <div className="min-w-0">
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl sm:text-3xl leading-tight">
              {greeting()}, <span className="gradient-text-gold">{firstName}</span>
            </motion.h1>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1 hover:text-foreground transition"
            >
              <MapPin className="w-3 h-3" />
              {cInfo.flag} {effectiveCity}
              {weather && <span className="text-secondary">· {weather.tempC}°C {weather.icon}</span>}
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
        {/* Quick stats badge */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:ai"))}
            className="w-10 h-10 rounded-full glass-strong border border-secondary/30 flex items-center justify-center hover:scale-105 transition shadow-soft"
            title="Ask Cirkle Brain AI"
          >
            <Sparkles className="w-4 h-4 text-secondary" />
          </button>
        </div>

          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 glass rounded-2xl p-3 shadow-float w-[300px] max-w-[90vw] z-30 relative"
            >
              <button onClick={async () => { try { const { detectLocation } = await import("@/lib/countries"); const { country: code, city: cityName } = await detectLocation(); setCountry(code); setCity(cityName); const info = getCountry(code); toast.success(`Location detected: ${info.flag} ${cityName}, ${info.name}`); setPickerOpen(false); } catch { toast.error("Couldn\'t detect location"); } }} className="w-full mb-2 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30 px-3 py-2 flex items-center gap-2 hover:from-primary/30 transition"><LocateFixed className="w-4 h-4 text-secondary shrink-0" /><span className="text-xs font-medium flex-1 text-start">Detect my location</span></button>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Country</div>
              <select
                value={country}
                onChange={(e) => { setCountry(e.target.value); toast.success(`Region: ${getCountry(e.target.value).name}`); }}
                className="w-full text-xs bg-muted rounded-lg px-2 py-1.5 mb-2 outline-none"
              >
                {COUNTRIES.map((cc) => (
                  <option key={cc.code} value={cc.code}>{cc.flag} {cc.name}</option>
                ))}
              </select>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">City</div>
              <select
                value={effectiveCity}
                onChange={(e) => { setCity(e.target.value); toast.success(`City: ${e.target.value}`); setPickerOpen(false); }}
                className="w-full text-xs bg-muted rounded-lg px-2 py-1.5 outline-none"
              >
                {cInfo.majorCities.map((cc) => (
                  <option key={cc} value={cc}>{cc}</option>
                ))}
              </select>
            </motion.div>
          )}
        <div className="flex flex-col items-end gap-2">
          <MeshBadge label={t.mesh} />
          {/* Cirkle Brain AI status indicator */}
          <div className="flex items-center gap-1.5 text-[10px] text-secondary bg-secondary/10 px-2 py-1 rounded-full" title="Cirkle Brain AI is curating your home">
            <Sparkles className="w-3 h-3" />
            <span>Brain AI active</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <button
            onClick={fetchFeed}
            disabled={loading}
            className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-muted/60 transition disabled:opacity-50"
            aria-label="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <section className="px-6">
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3 flex items-center gap-2 text-xs text-accent">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={fetchFeed} className="px-2 py-1 rounded-lg bg-accent text-accent-foreground text-[10px] font-medium">
              Retry
            </button>
          </div>
        </section>
      )}

      {/* R4: Trending Now live bar — scrolling trending topics */}
      {trending.length > 0 && (
        <section className="px-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide glass rounded-full px-3 py-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent shrink-0">🔥 Trending</span>
            {trending.slice(0, 6).map((t, i) => (
              <button
                key={t.id}
                onClick={() => toast(`Searching: ${t.tag}`)}
                className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap transition shrink-0"
              >
                {t.tag} <span className="text-[9px] text-secondary">{t.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* R2: Stories bar — ephemeral content from friends (above Priority Shares) */}
      <section className="px-6">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {[
            { name: "Your story", initial: firstName[0], color: "from-secondary/30 to-accent/15", add: true },
            { name: "", initial: "+", color: "from-primary/30 to-secondary/10", add: true },
            
            
            
            
            
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => s.add ? window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "media" } })) : toast(`${s.name}'s story`)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${s.color} glass border-2 ${s.add ? "border-dashed border-secondary" : "border-secondary/40"} flex items-center justify-center relative`}>
                {s.add && <Plus className="w-5 h-5 text-secondary absolute" />}
                {!s.add && <span className="font-display text-lg text-foreground/80">{s.initial}</span>}
                {!s.add && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />}
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-[56px]">{s.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Priority shares — latest from Lamahat, Mashahd, Midan (FIRST — real friend content before AI) */}
      <PriorityShares />

      {/* R1: AI Daily Brief — 3-line living briefing (replaces static hero) */}
      <section className="px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong rounded-2xl p-4 shadow-float border border-secondary/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-charcoal" />
            </div>
            <span className="text-xs font-medium text-secondary">AI Daily Brief</span>
            <span className="text-[9px] text-muted-foreground ml-auto">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="space-y-2 text-sm">
            {/* Line 1: Weather + mood */}
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">{weather?.icon || "☀️"}</span>
              <p className="text-foreground/90">
                {weather ? `${weather.tempC}°C ${weather.condition}` : "Weather loading"} in {effectiveCity} —
                <span className="text-muted-foreground"> You seem focused today 🎯</span>
              </p>
            </div>
            {/* Line 2: Top news headline */}
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">📰</span>
              <p className="text-foreground/90">
                {official[0] ? `${official[0].name}: ${official[0].latestUpdate?.slice(0, 80) || "Latest updates available"}` : "News loading from your country's top sources"}
              </p>
            </div>
            {/* Line 3: Action suggestion */}
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <p className="text-foreground/90">
                {featured[0] ? featured[0].title : "Ask Cirkle Brain anything — tap below"}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("circle:ai"))}
                  className="ml-1 text-secondary hover:underline text-xs font-medium"
                >
                  Ask AI →
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section quick-jump navigator */}
      <section className="px-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {[
            { label: "Featured", icon: Sparkles, id: "sec-featured" },
            { label: "News", icon: Radio, id: "sec-news" },
            { label: "For You", icon: Heart, id: "sec-foryou" },
            { label: "Spaces", icon: Users, id: "sec-spaces" },
            { label: "Trending", icon: TrendingUp, id: "sec-trending" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium glass text-muted-foreground hover:text-foreground hover:bg-muted/40 transition whitespace-nowrap shrink-0"
            >
              <s.icon className="w-3 h-3" />
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* AI Ask bar */}
      <section className="px-6">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("circle:ai"))}
          className="glass rounded-full px-4 py-3 w-full flex items-center gap-3 shadow-soft hover:bg-muted/50 transition text-start"
        >
          <Sparkles className="w-4 h-4 text-secondary" />
          <span className="flex-1 text-sm text-muted-foreground">{t.ask}</span>
          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </span>
        </button>
      </section>

      {/* Featured carousel */}
      <section id="featured">
        <SectionHeader icon={Zap} title={t.featured} brain />
        {loading ? (
          <SkeletonFeed />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-2 snap-x snap-mandatory">
            {featured.map((f, i) => (
              <motion.article
                key={f.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={`snap-start shrink-0 w-[78%] sm:w-[60%] md:w-[40%] aspect-[4/5] rounded-2xl border bg-gradient-to-br ${COLOR_MAP[f.color] || COLOR_MAP.gold} p-5 relative overflow-hidden glass`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/10 opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/30 to-transparent" />
                <div className="relative h-full flex flex-col justify-between" style={{ color: "hsl(var(--cream))" }}>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] uppercase tracking-widest opacity-80">{f.kind}</span>
                    {/* R8: "Why am I seeing this?" tooltip */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("Why am I seeing this?", {
                          description: `Based on your interest in ${f.kind} + trending in ${city || cInfo.capital} + Cirkle Brain AI curation`,
                          duration: 4000,
                        });
                      }}
                      className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[10px]"
                      aria-label="Why am I seeing this?"
                    >
                      ℹ️
                    </button>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl leading-tight">{f.title}</h3>
                    <p className="text-sm opacity-80 mt-2">{f.subtitle}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      {/* R6: For You — AI-personalized feed from Midan (Facebook News Feed equivalent) */}
      <section id="sec-foryou" className="px-6">
        <SectionHeader icon={Heart} title="For You" inline brain />

        {/* ── Super Upgrade: "What's on your mind?" composer (Facebook-style) ── */}
        <div className="glass-strong rounded-2xl p-4 mt-3 border border-border/40 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/40 to-accent/20 border border-secondary/30 flex items-center justify-center text-sm font-medium text-secondary shrink-0">
              {firstName[0]}
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "post" } }))}
              className="flex-1 text-start text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-full px-4 py-2.5 transition border border-border/40"
            >
              What's on your mind, {firstName}?
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/30">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "post" } }))}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/70 hover:bg-muted/40 rounded-lg py-2 transition"
            >
              <Plus className="w-4 h-4 text-secondary" /> Post
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "post", media: "image" } }))}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/70 hover:bg-muted/40 rounded-lg py-2 transition"
            >
              <Aperture className="w-4 h-4 text-accent" /> Photo
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "post", media: "video" } }))}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/70 hover:bg-muted/40 rounded-lg py-2 transition"
            >
              <Clapperboard className="w-4 h-4 text-primary" /> Video
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("circle:ai"))}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-foreground/70 hover:bg-muted/40 rounded-lg py-2 transition"
            >
              <Sparkles className="w-4 h-4 text-secondary" /> AI
            </button>
          </div>
        </div>

        {/* ── Super Upgrade: Trending Now (Twitter-style) ── */}
        {trending.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-secondary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trending in {city || cInfo.capital}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {trending.slice(0, 8).map((t, i) => (
                <button
                  key={i}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("circle:ai", { detail: { query: `Tell me about ${t.tag}` } }));
                  }}
                  className="shrink-0 glass rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:scale-[1.03] hover:border-secondary/40 border border-transparent transition"
                >
                  <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                  <span className="text-xs font-medium">{t.tag}</span>
                  <span className="text-[10px] text-secondary">{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {forYou.length > 0 ? (
          <div className="space-y-4 mt-4">
            {forYou.slice(0, 8).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-strong rounded-2xl border border-border/40 overflow-hidden shadow-soft hover:shadow-float transition-shadow"
              >
                {/* Post header — avatar + name + time + more */}
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/40 to-accent/20 border-2 border-secondary/30 flex items-center justify-center text-sm font-medium text-secondary">
                      {p.user?.charAt(0) || "U"}
                    </div>
                    {p.verified && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-secondary flex items-center justify-center border-2 border-background">
                        <BadgeCheck className="w-2.5 h-2.5 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{p.user}</span>
                      {p.verified && <span className="text-[9px] text-secondary font-medium">Verified</span>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{p.handle} · {p.time}</span>
                  </div>
                  <button className="w-8 h-8 rounded-full hover:bg-muted/40 flex items-center justify-center text-muted-foreground transition shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                  </button>
                </div>
                {/* Post body */}
                <p className="text-sm text-foreground/90 leading-relaxed px-4 pb-3 line-clamp-4">{p.body}</p>
                {/* Post image placeholder (gradient cover) */}
                {p.image && (
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/10 opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Aperture className="w-12 h-12 text-secondary/30" />
                    </div>
                  </div>
                )}
                {/* Engagement bar — Facebook-style */}
                <div className="flex items-center gap-1 px-4 py-2 border-t border-border/30">
                  <button onClick={() => toast.success("Liked ❤")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg px-2.5 py-1.5 transition">
                    <Heart className="w-4 h-4" /> <span className="font-medium">{p.likes > 999 ? `${(p.likes/1000).toFixed(1)}k` : p.likes}</span>
                  </button>
                  <button onClick={() => toast("Comments")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg px-2.5 py-1.5 transition">
                    <MessageCircle className="w-4 h-4" /> <span className="font-medium">{p.comments}</span>
                  </button>
                  <button onClick={() => toast("Shared")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-secondary hover:bg-secondary/10 rounded-lg px-2.5 py-1.5 transition">
                    <Share2 className="w-4 h-4" /> <span className="font-medium">{p.reposts}</span>
                  </button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "midan" } }))} className="ml-auto text-[10px] text-secondary hover:underline font-medium">
                    View in Midan →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-strong rounded-2xl p-8 text-center border border-border/40 mt-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-secondary/30 to-accent/15 border border-secondary/30 flex items-center justify-center mb-3">
              <Heart className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="font-display text-lg mb-1">Your feed is warming up</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
              Follow people, join Circles, and post to see personalized content here. Cirkle Brain AI is learning your interests.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "post" } }))} className="px-4 py-2 rounded-full bg-gradient-gold text-charcoal text-xs font-medium hover:scale-[1.03] transition">
                Create your first post
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "midan" } }))} className="px-4 py-2 rounded-full glass text-xs font-medium hover:bg-muted/40 transition">
                Explore Midan →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Quick actions — compact horizontal pills */}
      <section className="px-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { icon: ScanLine, label: "Scan & Pay", evt: "scan" as const },
            { icon: Activity, label: "City Pulse", evt: "pulse" as const },
            { icon: Plus, label: "Post", evt: "composer" as const, detail: { kind: "post" } },
            { icon: Sparkles, label: "Ask AI", evt: "ai" as const },
            { icon: Radio, label: "News", evt: "scroll-news" as const },
            { icon: Zap, label: "Featured", evt: "scroll-featured" as const },
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => {
                if (q.evt === "scan") {
                  window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "pay" } }));
                  toast("Scan & Pay ready");
                } else if (q.evt === "pulse") {
                  window.dispatchEvent(new CustomEvent("circle:pulse"));
                } else if (q.evt === "composer") {
                  window.dispatchEvent(new CustomEvent("circle:composer", { detail: q.detail }));
                } else if (q.evt === "ai") {
                  window.dispatchEvent(new CustomEvent("circle:ai"));
                } else if (q.evt === "scroll-news") {
                  document.getElementById("news")?.scrollIntoView({ behavior: "smooth" });
                } else if (q.evt === "scroll-featured") {
                  document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="glass rounded-full px-4 py-2.5 flex items-center gap-2 hover:scale-[1.03] transition shadow-soft whitespace-nowrap shrink-0"
            >
              <q.icon className="w-4 h-4 text-secondary" />
              <span className="text-xs text-foreground/80">{q.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* R2: Jump-to quick bar — sticky category chips for instant scroll */}
      <div className="sticky top-[68px] z-30 -mx-4 px-4 py-2 bg-background/80 backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { label: "🤖 AI", target: "cirkle-exclusives" },
            { label: "📊 Feed", target: "featured" },
            { label: "📰 News", target: "news" },
            { label: "💬 Chat", target: "cirkle-exclusives" },
            { label: "📺 Video", target: "cirkle-exclusives" },
            { label: "💰 Pay", target: "cirkle-exclusives" },
            { label: "✈️ Travel", target: "cirkle-exclusives" },
            { label: "🛡️ Safety", target: "cirkle-exclusives" },
            { label: "🧭 All", target: "all-features" },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => {
                const el = document.getElementById(chip.target);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/40 whitespace-nowrap transition"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Citizen Shield — big glass hero card (most-used feature) */}
      <section className="px-6">
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => window.dispatchEvent(new CustomEvent("circle:citizen-shield"))}
          className="relative w-full text-start rounded-3xl glass-strong border border-primary/30 p-5 flex items-center gap-4 hover:scale-[1.01] transition overflow-hidden group shadow-float"
        >
          {/* Gradient glow background */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-primary/30 to-secondary/10 blur-3xl opacity-70 group-hover:opacity-100 transition" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-accent/20 blur-3xl opacity-50" />

          {/* Shield icon */}
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/40 to-secondary/20 border border-primary/40 flex items-center justify-center shrink-0 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-secondary" />
          </div>

          {/* Content */}
          <div className="relative flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛡️</span>
              <h3 className="font-display text-xl leading-tight">Citizen Shield</h3>
              <span className="ms-auto text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/20 text-secondary border border-primary/30 whitespace-nowrap">
                Most Used
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Report government issues · AI-verified evidence · auto-routing to authorities
            </p>
            <div className="flex items-center gap-4 mt-2.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Video className="w-3 h-3 text-secondary" /> Video evidence</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3 text-secondary" /> Witness network</span>
              <span className="flex items-center gap-1"><Brain className="w-3 h-3 text-secondary" /> AI case builder</span>
              <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-secondary" /> Reputation scores</span>
            </div>
            <div className="mt-2.5 text-[11px] text-secondary flex items-center gap-1 font-medium">
              Open Citizen Shield <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.button>
      </section>

      {/* Cirkle Exclusives — compact (6 by default, expandable) */}
      <section id="cirkle-exclusives" className="px-6">
        <SectionHeader icon={Sparkles} title="Cirkle Exclusives" inline brain />
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXCLUSIVES.slice(0, showAllExclusives ? EXCLUSIVES.length : 6).map((ex, i) => (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => window.dispatchEvent(new CustomEvent(ex.evt))}
              className="relative text-start rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3 hover:scale-[1.02] transition overflow-hidden group"
            >
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${ex.tint} blur-3xl opacity-60 group-hover:opacity-100 transition`} />
              <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${ex.tint} border border-border/40 flex items-center justify-center shrink-0`}>
                <ex.icon className="w-5 h-5 text-secondary" />
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{ex.emoji}</span>
                  <div className="font-display text-base leading-tight">{ex.name}</div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{ex.desc}</div>
                <div className="mt-2 text-[10px] text-secondary flex items-center gap-1">
                  Try it <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </motion.button>
          ))}
          {/* All-features tile — opens the OverlayBrowser (every Cirkle overlay) */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: EXCLUSIVES.length * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => window.dispatchEvent(new CustomEvent("circle:overlay-browser"))}
            className="relative text-start rounded-2xl border border-secondary/50 bg-card p-4 flex items-start gap-3 hover:scale-[1.02] transition overflow-hidden group"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-secondary/40 to-primary/15 blur-3xl opacity-70 group-hover:opacity-100 transition" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-secondary/40 to-primary/15 border border-secondary/40 flex items-center justify-center shrink-0">
              <Grid3x3 className="w-5 h-5 text-secondary" />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🧭</span>
                <div className="font-display text-base leading-tight">All Features</div>
                <span className="ms-auto text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30">
                  65
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                Browse all 65 Cirkle overlays in one place.
              </div>
              <div className="mt-2 text-[10px] text-secondary flex items-center gap-1">
                Try it <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </motion.button>
        </div>
        {EXCLUSIVES.length > 6 && (
          <button
            onClick={() => setShowAllExclusives(!showAllExclusives)}
            className="mt-3 w-full py-2.5 rounded-2xl glass text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/40 transition"
          >
            {showAllExclusives ? `Show less` : `Show all ${EXCLUSIVES.length} features`}
            <ChevronDown className={`w-4 h-4 transition ${showAllExclusives ? "rotate-180" : ""}`} />
          </button>
        )}
      </section>

      {/* R2: Progressive disclosure — Show more sections on mobile */}
      <div className={`${showAllSections ? "block" : "hidden"} space-y-8`}>
        {/* Sections after the first 5 go here on mobile — on desktop XL they're always visible via grid */}
      </div>

      {/* Show more / less toggle — mobile only (hidden on XL where grid shows everything) */}
      <section className="px-6 xl:hidden">
        <button
          onClick={() => setShowAllSections(!showAllSections)}
          className="w-full py-3 rounded-2xl glass text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/40 transition"
        >
          {showAllSections ? (
            <>Show less <ChevronDown className="w-4 h-4 rotate-180" /></>
          ) : (
            <>Show more features <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      </section>

      </div>{/* End main feed column (now on right) */}

      {/* Sidebar column — Today's Cirkle + News + Official Channels + Live Spaces (now on LEFT) */}
      <div className="space-y-8 xl:pb-32 xl:order-1 order-2">

      {/* R10: Today's Cirkle — AI-generated 5-bullet summary of everything today */}
      <section className="px-6">
        <SectionHeader icon={Sparkles} title="Today's Cirkle" inline brain />
        <div className="glass-strong rounded-2xl p-4 mt-3 border border-secondary/20">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2"><span>📰</span><p className="text-foreground/90 text-xs">{official[0]?.latestUpdate?.slice(0, 80) || `${cInfo.flag} ${effectiveCity} — monitoring local news`}</p></div>
            <div className="flex items-start gap-2"><span>💬</span><p className="text-foreground/90 text-xs">{forYou[0]?.body?.slice(0, 80) || "No new messages from your circle"}</p></div>
            <div className="flex items-start gap-2"><span>⚡</span><p className="text-foreground/90 text-xs">{featured[0]?.title?.slice(0, 80) || "AI is curating your featured content"}</p></div>
            <div className="flex items-start gap-2"><span>🌤️</span><p className="text-foreground/90 text-xs">{weather ? `${weather.tempC}°C ${weather.condition} ${weather.icon} in ${effectiveCity}` : "Weather loading"}</p></div>
            <div className="flex items-start gap-2"><span>🧠</span><p className="text-foreground/90 text-xs">Brain AI is active — {trending.length} trending topics · {official.length} official sources</p></div>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent("circle:ai-recap"))} className="mt-3 w-full py-2 rounded-xl bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition">
            Get full AI Recap →
          </button>
        </div>
      </section>

      {/* ── Categorized News (live web-sourced) ─────────────────── */}
      <section id="news" className="px-6">
        <div className="flex items-center justify-between">
          <SectionHeader icon={Radio} title="News" inline brain />
          <div className="flex items-center gap-2">
            {/* Offline badge — shown when serving cached articles */}
            {servingFromCache && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/60 border border-border/60">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
            {/* Live pulsing indicator — driven by the WebSocket connection */}
            <span className={`text-[10px] flex items-center gap-1 ${newsLive ? "text-emerald-500" : "text-muted-foreground"}`}>
              <span className={`relative flex h-2 w-2 ${newsLive ? "" : "opacity-50"}`}>
                {newsLive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${newsLive ? "bg-emerald-500" : "bg-muted-foreground/60"}`} />
              </span>
              {newsLive ? (
                <span className="flex items-center gap-0.5"><Wifi className="w-3 h-3" /> Live</span>
              ) : (
                <span className="flex items-center gap-0.5"><WifiOff className="w-3 h-3" /> Connecting…</span>
              )}
              <span className="text-muted-foreground">· Web-sourced</span>
            </span>
            {/* Last refreshed indicator */}
            <span className="text-[10px] text-muted-foreground" title="When news was last refreshed">
              {newsLoading ? "Refreshing…" : `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </span>
            {/* Manual refresh button */}
            <button
              onClick={() => {
                // Clear all news cache + refetch
                Object.keys(localStorage).filter(k => k.startsWith("cirkle-news-cache-")).forEach(k => localStorage.removeItem(k));
                setNewsByCat({});
                setActiveNewsCat("for-you");
                toast.success("News refreshed", { description: "Fetching latest articles…" });
              }}
              className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground transition"
              aria-label="Refresh news"
              title="Refresh news now"
            >
              <RefreshCw className={`w-3 h-3 ${newsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {/* Multi-language toggle (EN / AR) */}
            <button
              onClick={() => setNewsLang((v) => (v === "en" ? "ar" : "en"))}
              className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded-full border transition ${
                newsLang === "ar"
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
              aria-label={`Switch news language to ${newsLang === "en" ? "Arabic" : "English"}`}
              title={`Switch news language to ${newsLang === "en" ? "Arabic" : "English"}`}
            >
              <Languages className="w-3 h-3" />
              {newsLang === "en" ? "EN" : "AR"}
            </button>
          </div>
        </div>

        {/* Search input — filters current category, plus cross-category search */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={newsLang === "ar" ? "ابحث في الأخبار…" : "Search news…"}
            className="w-full glass rounded-full pl-9 pr-9 py-2 text-xs outline-none focus:ring-1 focus:ring-secondary/40 transition"
            dir={newsLang === "ar" ? "rtl" : "ltr"}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Search results header OR For You / Saved subtitle */}
        {isSearching ? (
          <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              {searchLoading ? (
                <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Searching…</span>
              ) : (
                <>Search results for: <span className="text-foreground font-medium">“{searchQuery.trim()}”</span></>
              )}
            </span>
            <button
              onClick={() => setSearchQuery("")}
              className="text-secondary hover:underline"
            >
              Clear
            </button>
          </div>
        ) : activeNewsCat === "for-you" ? (
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-secondary" />
            <span>Personalized for you</span>
            {readingHistory.length > 0 && (
              <span className="text-[10px] text-muted-foreground/70">· based on {readingHistory.length} read{readingHistory.length === 1 ? "" : "s"}</span>
            )}
          </div>
        ) : activeNewsCat === "saved" ? (
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Bookmark className="w-3 h-3 text-secondary" />
            <span>{bookmarks.length} saved article{bookmarks.length === 1 ? "" : "s"}</span>
          </div>
        ) : null}

        {/* Category tabs — includes For You (first) and Saved (last) */}
        {!isSearching && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
            <button
              onClick={() => setActiveNewsCat("for-you")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeNewsCat === "for-you"
                  ? "bg-gradient-hero text-cream shadow-sm"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              For You
            </button>
            {NEWS_CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = activeNewsCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveNewsCat(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? "bg-gradient-hero text-cream shadow-sm"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {c.label}
                </button>
              );
            })}
            <button
              onClick={() => setActiveNewsCat("saved")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeNewsCat === "saved"
                  ? "bg-gradient-hero text-cream shadow-sm"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bookmark className="w-3 h-3" />
              Saved
              {bookmarks.length > 0 && (
                <span className="text-[9px] bg-secondary/20 text-secondary px-1 rounded-full">
                  {bookmarks.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* News articles — Facebook-like clean cards */}
        <div className="mt-4 space-y-4">
          {newsLoading && visibleList.length === 0 ? (
            <SkeletonNews />
          ) : visibleList.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-sm text-muted-foreground text-center">
              {isSearching
                ? `No results for "${searchQuery.trim()}". Try a different keyword.`
                : activeNewsCat === "saved"
                  ? "No saved articles yet. Tap the bookmark icon on any article to save it for later."
                  : activeNewsCat === "for-you"
                    ? "Read a few articles and we'll personalize this feed for you."
                    : `No ${activeNewsCat} news available right now. Try another category.`}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visibleList.slice(0, 6).map((article, idx) => {
                const isBreaking = article.category === "breaking" || (activeNewsCat === "breaking" && idx === 0);
                const isLivePushed = liveBreaking.some((a) => a.sourceUrl === article.sourceUrl);
                const timeStr = article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  : "";
                const saved = isBookmarked(article);
                const catIcon = NEWS_CATEGORIES.find((c) => c.id === article.category)?.icon || Radio;
                const CatIcon = catIcon;
                return (
                  <motion.article
                    key={article.id || article.sourceUrl}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 280, damping: 28 }}
                    className={`rounded-2xl overflow-hidden border transition-colors ${
                      isBreaking
                        ? "border-accent/40 bg-accent/[0.03]"
                        : "border-border/60 bg-card hover:bg-muted/20"
                    }`}
                  >
                    {/* Source header — Facebook style */}
                    <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isBreaking ? "bg-accent/15 text-accent" : "bg-gradient-hero text-primary-foreground"
                      }`}>
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold truncate">{article.source}</span>
                          <BadgeCheck className="w-3.5 h-3.5 text-secondary shrink-0" />
                          {isBreaking && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-bold uppercase tracking-wide">
                              Breaking
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />
                          {timeStr}
                          {isLivePushed && (
                            <span className="text-emerald-500 flex items-center gap-0.5 ms-1">
                              <Wifi className="w-2.5 h-2.5" /> Live
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Bookmark */}
                      <button
                        onClick={(e) => toggleBookmark(article, e)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${
                          saved
                            ? "bg-secondary/15 text-secondary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                        aria-label={saved ? "Remove bookmark" : "Save article"}
                      >
                        {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Article content — clickable to source */}
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => recordRead(article)}
                      className="block px-4"
                    >
                      <h3 className="text-[15px] font-semibold leading-snug line-clamp-2 mb-1.5 hover:text-secondary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-3 mb-2">
                        {article.summary}
                      </p>
                      <span className="text-[11px] text-secondary flex items-center gap-1 mb-3 hover:underline">
                        Read at {article.source} <ExternalLink className="w-3 h-3" />
                      </span>
                    </a>

                    {/* Action bar — Facebook style */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40">
                      <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordRead(article)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-secondary transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Read more
                      </a>
                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
                              aria-label="Share article"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              Share
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => shareToWasl(article)} className="gap-2 cursor-pointer">
                              <Send className="w-3.5 h-3.5 text-secondary" />
                              <span>Share to Wasl</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => shareToMidan(article)} className="gap-2 cursor-pointer">
                              <Users className="w-3.5 h-3.5 text-secondary" />
                              <span>Share to Midan</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyLink(article)} className="gap-2 cursor-pointer">
                              <LinkIcon className="w-3.5 h-3.5 text-secondary" />
                              <span>Copy link</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* Official Channels (collapsed — quick subscribe) */}
      <section className="px-6">
        <div className="flex items-center justify-between">
          <SectionHeader icon={BadgeCheck} title="Official Channels" inline brain />
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:hub"))}
            className="text-xs text-secondary flex items-center gap-1 hover:gap-2 transition-all shrink-0"
          >
            All channels <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {(official.length > 0 ? official : []).slice(0, 6).map((o) => {
            const emergency = Boolean(o.isEmergency || o.category === "emergency");
            return (
              <button
                key={o.id}
                onClick={() => toast.success(`Subscribed to ${o.name}`)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl min-w-[72px] shrink-0 transition-all hover:scale-105 ${
                  emergency ? "glass border border-accent/40" : "glass"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-display ${
                  emergency ? "bg-accent/20 text-accent" : "bg-gradient-hero text-cream"
                }`}>
                  {emergency ? <AlertTriangle className="w-4 h-4" /> : o.name[0]}
                </div>
                <span className="text-[10px] text-center line-clamp-1 w-full">{o.name}</span>
                {emergency && <span className="text-[8px] text-accent font-bold">EMERGENCY</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* For You AI */}
      <section className="px-6">
        <SectionHeader icon={Sparkles} title={t.forYou} inline brain />
        {loading ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[0, 1].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {forYou.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-4 relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />
                <span className="text-[10px] uppercase tracking-widest text-secondary">AI Recommendation</span>
                <h4 className="font-display text-lg mt-1 leading-tight">{p.body.split("—")[0].split(":")[0]}</h4>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.body}</p>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                  <span>{p.user}</span>
                  {p.verified && <BadgeCheck className="w-3 h-3 text-secondary" />}
                  <span>· {p.likes} likes</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Mini apps — Open platform for any mini app to integrate freely */}
      <section>
        <div className="flex items-center justify-between px-5 mb-3">
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-secondary" />
            <h2 className="font-display text-xl">{t.miniApps}</h2>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:hub"))}
            className="text-xs text-secondary flex items-center gap-1 hover:gap-2 transition-all"
          >
            Explore all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="px-5">
          <div className="glass rounded-2xl p-6">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4">
              {/* Built-in mini apps */}
              {[
                { emoji: "🧠", name: "Brain AI", evt: "circle:ai-assistant" },
                { emoji: "✈️", name: "Flights", evt: "circle:visa-explorer" },
                { emoji: "📊", name: "Markets", evt: "circle:oracle-markets" },
                { emoji: "🛡️", name: "Shield", evt: "circle:citizen-shield" },
                { emoji: "📜", name: "Commit", evt: "circle:commit" },
                { emoji: "🌐", name: "Browser", evt: "circle:overlay-browser" },
              ].map((app) => (
                <button
                  key={app.name}
                  onClick={() => window.dispatchEvent(new CustomEvent(app.evt))}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/40 transition"
                >
                  <div className="w-12 h-12 rounded-xl glass border border-border/40 flex items-center justify-center text-xl">
                    {app.emoji}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{app.name}</span>
                </button>
              ))}
            </div>
            {/* Open platform banner */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("circle:bot-developer"))}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-secondary/10 to-primary/5 border border-secondary/20 hover:from-secondary/20 hover:to-primary/10 transition"
            >
              <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Plus className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-xs font-medium">Open Mini App Platform</div>
                <div className="text-[10px] text-muted-foreground">Any developer can build & integrate mini apps freely</div>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      </section>

      {/* Live Spaces */}
      <section className="px-6">
        <SectionHeader icon={Radio} title={t.spaces} inline brain />
        <div className="mt-3 space-y-2">
          {spaces.map((s) => (
            <div key={s.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-mesh flex items-center justify-center">
                <Radio className="w-4 h-4 text-primary-foreground" />
                <span className="absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">LIVE</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{s.title}</div>
                <div className="text-[11px] text-muted-foreground">{s.host} · {s.listeners.toLocaleString()} listening</div>
              </div>
              <button
                onClick={() => toast.success(`Joining “${s.title}”…`)}
                className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
              >
                Join
              </button>
            </div>
          ))}
        </div>
      </section>

      <MeshPresence />

      {/* Nearby */}
      <section>
        <SectionHeader icon={MapPin} title={t.nearby} brain />
        {loading ? (
          <div className="flex gap-3 overflow-hidden px-5 pb-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="shrink-0 w-56 h-40 rounded-2xl" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">
            {nearby.map((n, i) => (
              <div key={n.id} className="shrink-0 w-56 rounded-2xl bg-gradient-card border border-border p-4 shadow-soft">
                <div className="aspect-video rounded-xl mb-3 relative overflow-hidden">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10" />
                  <div className="absolute top-2 right-2 glass text-[10px] px-2 py-0.5 rounded-full">{n.tag}</div>
                </div>
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.meta}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trending */}
      <section className="px-6">
        <SectionHeader icon={TrendingUp} title={t.trending} inline brain />
        {loading ? (
          <div className="mt-3 glass rounded-2xl overflow-hidden">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-none" />)}
          </div>
        ) : (
          <div className="mt-3 glass rounded-2xl divide-y divide-border/60 overflow-hidden">
            {trending.map((tr, i) => (
              <button
                key={tr.id}
                onClick={() => toast(`Searching “${tr.tag}”…`)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition text-start"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                  <span className="font-medium">{tr.tag}</span>
                </div>
                <span className="text-xs text-muted-foreground">{tr.count} posts</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Social Feed (Facebook-style with Brain AI orchestration) ── */}
      <section className="py-4">
        <div className="flex items-center justify-between px-5 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            <h2 className="font-display text-xl">Shared by Cirkle</h2>
          </div>
          <span className="text-[10px] text-muted-foreground">Brain AI orchestrated</span>
        </div>
        <SocialFeed
          personalizationContext={personalAIConsent ? personalizationContext : undefined}
          personalAIConsent={personalAIConsent}
        />
      </section>

      {/* Workspace */}
      <section className="px-6">
        <SectionHeader icon={Briefcase} title={t.workspace} inline />
        <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center text-primary-foreground font-display">D</div>
            <div className="flex-1">
              <div className="font-medium">Design Workspace</div>
              <div className="text-xs text-muted-foreground">3 updates · 12 unread messages</div>
            </div>
            <div className="flex -space-x-2">
              {["bg-secondary", "bg-accent", "bg-primary"].map((cl, i) => (
                <div key={i} className={`w-7 h-7 rounded-full ${cl} border-2 border-background`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cirkle ID + Mail strip */}
      <section className="px-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-transparent p-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-secondary">
            <BadgeCheck className="w-3 h-3" /> {t.id}
          </div>
          <div className="font-display text-xl mt-1">yousef@cirkle</div>
          <div className="text-xs text-muted-foreground mt-1">{t.idSub}</div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("circle:hub"))}
            className="mt-3 text-xs flex items-center gap-1 text-secondary hover:gap-2 transition-all"
          >
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center text-brand-charcoal">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">{t.mail}</div>
                <div className="text-xs text-muted-foreground">{t.mailSub}</div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent">FREE @cirkle</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              { from: "Aramco HR", subj: "Welcome aboard — onboarding pack" },
              { from: "Booking", subj: "Your Istanbul stay is confirmed" },
            ].map((m, i) => (
              <button
                key={i}
                onClick={() => toast(`Open mail: ${m.subj}`)}
                className="w-full text-xs flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition text-start"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                <span className="font-medium shrink-0">{m.from}</span>
                <span className="text-muted-foreground truncate">— {m.subj}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Covenant footer */}
      <section className="px-6">
        <div className="rounded-2xl border border-border/60 p-4 flex items-start gap-3 bg-gradient-card">
          <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">The Cirkle Covenant.</span> Every feature is free, forever. Your data lives on your device. No tracking, no surveillance ads, no subscriptions.
          </div>
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center text-xs text-muted-foreground gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Curating your live feed…
        </div>
      )}

      </div>{/* End sidebar column (now on left) */}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, inline, brain }: { icon: LucideIcon; title: string; inline?: boolean; brain?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-5 ${inline ? "" : "mb-3"}`}>
      <Icon className="w-4 h-4 text-secondary" />
      <h2 className="font-display text-xl">{title}</h2>
      {brain && (
        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary flex items-center gap-1" title="Powered by Cirkle Brain AI">
          <Sparkles className="w-2.5 h-2.5" /> AI
        </span>
      )}
    </div>
  );
}
