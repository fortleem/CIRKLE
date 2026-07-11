/**
 * Circle (دواير) — Module Registry
 *
 * The single source of truth for all pillars of the Circle super-app.
 * Names follow the blueprint's dual-English strategy (Brand Identity vs US English)
 * plus the Arabic script name.
 *
 * Each module has a brand color token (CSS variable) used consistently across
 * the sidebar, top bar accents, badges, and module landing screens.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  MessageCircle,
  Video,
  Camera,
  Megaphone,
  Users,
  BadgeCheck,
  Building2,
  Tv,
  Briefcase,
  Wifi,
  ShieldCheck,
  CreditCard,
  Mail,
  Plane,
  Globe2,
  Languages,
  Grid3x3,
  Settings2,
  Sparkles,
  Lock,
  Landmark,
  HardDriveDownload,
} from "lucide-react";

export type ModuleColor = "teal" | "rose" | "steel" | "gold" | "charcoal";

export type ModuleId =
  | "home"
  | "wasl"
  | "mashahd"
  | "lamahat"
  | "midan"
  | "circle-groups"
  | "official"
  | "workspaces"
  | "creators"
  | "pro"
  | "mesh"
  | "verify"
  | "payments"
  | "mail"
  | "travel"
  | "translate"
  | "apps"
  | "privacy"
  | "governance"
  | "settings"
  | "unique"
  | "backup";

export interface CircleModule {
  id: ModuleId;
  /** Brand identity name (e.g., "Wasl"). */
  brand: string;
  /** US English name (e.g., "Connect"). */
  us: string;
  /** Arabic script name (e.g., "وصل"). */
  arabic: string;
  /** One-line tagline shown in the module header. */
  tagline: string;
  /** Icon component. */
  icon: LucideIcon;
  /** Brand color token. */
  color: ModuleColor;
  /** Navigation group. */
  group: "core" | "social" | "channels" | "identity" | "lifestyle" | "system";
}

export const MODULES: CircleModule[] = [
  {
    id: "home",
    brand: "Home",
    us: "Home",
    arabic: "الرئيسية",
    tagline: "Your daily entry to the Circle.",
    icon: LayoutDashboard,
    color: "gold",
    group: "core",
  },
  {
    id: "wasl",
    brand: "Wasl",
    us: "Connect",
    arabic: "وصل",
    tagline: "End-to-end encrypted messaging. No phone number required.",
    icon: MessageCircle,
    color: "teal",
    group: "core",
  },
  {
    id: "mashahd",
    brand: "Mashahd",
    us: "Watch",
    arabic: "مشاهد",
    tagline: "Peer-to-peer video. Every viewer becomes a seeder.",
    icon: Video,
    color: "teal",
    group: "core",
  },
  {
    id: "lamahat",
    brand: "Lamahat",
    us: "Glimpses",
    arabic: "لمحات",
    tagline: "Photos, Stories, Moments. On-device CLIP visual search.",
    icon: Camera,
    color: "rose",
    group: "core",
  },
  {
    id: "midan",
    brand: "Midan",
    us: "Square",
    arabic: "ميدان",
    tagline: "Microblogging on ActivityPub. Federates with the Fediverse.",
    icon: Megaphone,
    color: "steel",
    group: "social",
  },
  {
    id: "circle-groups",
    brand: "The Circle",
    us: "The Circle",
    arabic: "الدائرة",
    tagline: "Groups, events, polls, wiki, watch parties — one container.",
    icon: Users,
    color: "gold",
    group: "social",
  },
  {
    id: "official",
    brand: "Official Channels",
    us: "Official Channels",
    arabic: "القنوات الرسمية",
    tagline: "Verified broadcasts from governments, media, and NGOs.",
    icon: BadgeCheck,
    color: "gold",
    group: "channels",
  },
  {
    id: "workspaces",
    brand: "Workspaces",
    us: "Workspaces",
    arabic: "مساحات العمل",
    tagline: "Self-hosted Matrix environments for schools and enterprises.",
    icon: Building2,
    color: "steel",
    group: "channels",
  },
  {
    id: "creators",
    brand: "Creator Channels",
    us: "Creator Channels",
    arabic: "قنوات المبدعين",
    tagline: "Self-serve video channels on PeerTube + IPFS. 0% commission.",
    icon: Tv,
    color: "rose",
    group: "channels",
  },
  {
    id: "pro",
    brand: "Professional Network",
    us: "Pro Network",
    arabic: "الشبكة المهنية",
    tagline: "Jobs, CVs, endorsements — free forever, dual identity.",
    icon: Briefcase,
    color: "steel",
    group: "social",
  },
  {
    id: "mesh",
    brand: "Local Mesh",
    us: "Local Mesh",
    arabic: "الشبكة المحلية",
    tagline: "Offline P2P over BLE + WiFi Direct. Works in the metro.",
    icon: Wifi,
    color: "teal",
    group: "system",
  },
  {
    id: "verify",
    brand: "Circle Verify",
    us: "Circle Verify",
    arabic: "توثيق الدائرة",
    tagline: "Privacy-preserving identity. One account per human.",
    icon: ShieldCheck,
    color: "gold",
    group: "identity",
  },
  {
    id: "payments",
    brand: "Circle Payments",
    us: "Circle Pay",
    arabic: "مدفوعات الدائرة",
    tagline: "Fee-free, non-custodial, globally federated.",
    icon: CreditCard,
    color: "gold",
    group: "identity",
  },
  {
    id: "mail",
    brand: "Circle Mail",
    us: "Mail",
    arabic: "بريد",
    tagline: "Free @circle.app email. 5GB, on-device spam AI.",
    icon: Mail,
    color: "teal",
    group: "lifestyle",
  },
  {
    id: "travel",
    brand: "Rihla",
    us: "Travel",
    arabic: "رحلة",
    tagline: "AI itineraries, offline maps, encrypted document vault.",
    icon: Plane,
    color: "rose",
    group: "lifestyle",
  },
  {
    id: "translate",
    brand: "Universal Translation",
    us: "Translate",
    arabic: "الترجمة الشاملة",
    tagline: "200 languages, on-device NLLB-200. No data leaves your phone.",
    icon: Languages,
    color: "steel",
    group: "system",
  },
  {
    id: "apps",
    brand: "Mini Apps",
    us: "App Hub",
    arabic: "التطبيقات المصغرة",
    tagline: "A community-curated directory of zero-cost mini apps.",
    icon: Grid3x3,
    color: "gold",
    group: "lifestyle",
  },
  {
    id: "privacy",
    brand: "Privacy & Identity",
    us: "Privacy",
    arabic: "الخصوصية والهوية",
    tagline: "Ghost Mode, dual identities, consent ledger, risk simulator.",
    icon: Lock,
    color: "teal",
    group: "system",
  },
  {
    id: "governance",
    brand: "Community Governance",
    us: "Governance",
    arabic: "الحوكمة",
    tagline: "DAO-style proposals, transparent ad revenue, open finances.",
    icon: Landmark,
    color: "steel",
    group: "system",
  },
  {
    id: "settings",
    brand: "Settings",
    us: "Settings",
    arabic: "الإعدادات",
    tagline: "Region, language, accessibility, data, backups.",
    icon: Settings2,
    color: "charcoal",
    group: "system",
  },
  {
    id: "unique",
    brand: "Unique Features",
    us: "Unique",
    arabic: "مميزات فريدة",
    tagline: "10 features no other social app has. All on-device, all free.",
    icon: Sparkles,
    color: "gold",
    group: "system",
  },
  {
    id: "backup",
    brand: "Backup & Migration",
    us: "Backup",
    arabic: "النسخ الاحتياطي",
    tagline: "User-controlled, zero-cost, end-to-end encrypted. Four recovery methods.",
    icon: HardDriveDownload,
    color: "teal",
    group: "system",
  },
];

export const MODULE_MAP: Record<ModuleId, CircleModule> = MODULES.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<ModuleId, CircleModule>
);

/** Global "Sparkles" entry for the Self-Learning AI Core — accessed via top bar. */
export const AI_CORE_MODULE = {
  id: "ai-core" as const,
  brand: "Self-Learning Core",
  us: "AI Core",
  arabic: "النواة الذكية",
  tagline: "On-device matrix factorisation. Your interests, your model.",
  icon: Sparkles,
  color: "gold" as ModuleColor,
  group: "system" as const,
};

/** Maps a module color token to concrete HSL CSS variable + Tailwind classes. */
export function moduleColorClasses(color: ModuleColor) {
  switch (color) {
    case "teal":
      return {
        text: "text-teal",
        bg: "bg-teal",
        border: "border-teal",
        ring: "ring-teal",
        soft: "bg-[hsl(var(--teal)/0.12)]",
        hex: "#1A4A5A",
        gradient: "from-[hsl(195_56%_23%)] to-[hsl(211_30%_42%)]",
        glow: "shadow-[0_0_40px_hsl(195_56%_33%/0.35)]",
      };
    case "rose":
      return {
        text: "text-rose",
        bg: "bg-rose",
        border: "border-rose",
        ring: "ring-rose",
        soft: "bg-[hsl(var(--rose)/0.12)]",
        hex: "#C06070",
        gradient: "from-[hsl(351_41%_56%)] to-[hsl(351_41%_46%)]",
        glow: "shadow-[0_0_40px_hsl(351_41%_56%/0.35)]",
      };
    case "steel":
      return {
        text: "text-steel",
        bg: "bg-steel",
        border: "border-steel",
        ring: "ring-steel",
        soft: "bg-[hsl(var(--steel)/0.12)]",
        hex: "#4A6A8A",
        gradient: "from-[hsl(211_30%_42%)] to-[hsl(211_30%_32%)]",
        glow: "shadow-[0_0_40px_hsl(211_30%_42%/0.35)]",
      };
    case "gold":
      return {
        text: "text-gold",
        bg: "bg-gold",
        border: "border-gold",
        ring: "ring-gold",
        soft: "bg-[hsl(var(--gold)/0.14)]",
        hex: "#C2A060",
        gradient: "from-[hsl(39_45%_67%)] to-[hsl(39_45%_47%)]",
        glow: "shadow-[0_0_40px_hsl(39_45%_57%/0.4)]",
      };
    case "charcoal":
    default:
      return {
        text: "text-foreground",
        bg: "bg-foreground",
        border: "border-foreground",
        ring: "ring-foreground",
        soft: "bg-muted",
        hex: "#1A1A14",
        gradient: "from-[hsl(60_8%_18%)] to-[hsl(60_8%_9%)]",
        glow: "shadow-[0_0_40px_hsl(60_8%_9%/0.4)]",
      };
  }
}

/** Localized module name lookup (used in the top bar / sidebar). */
export function moduleName(
  id: ModuleId,
  style: "brand" | "us" | "arabic" = "brand"
): string {
  const m = MODULE_MAP[id];
  if (!m) return id;
  return m[style];
}

/** Regions supported by the Dynamic Regional Engine (DRE). */
export interface Region {
  code: string;
  name: string;
  flag: string;
  dataPlane: "default" | "cn" | "ru" | "eu";
  currency: string;
}

export const REGIONS: Region[] = [
  { code: "EG", name: "Egypt", flag: "🇪🇬", dataPlane: "default", currency: "EGP" },
  { code: "US", name: "United States", flag: "🇺🇸", dataPlane: "default", currency: "USD" },
  { code: "CN", name: "China (中国)", flag: "🇨🇳", dataPlane: "cn", currency: "CNY" },
  { code: "RU", name: "Russia", flag: "🇷🇺", dataPlane: "ru", currency: "RUB" },
  { code: "EU", name: "European Union", flag: "🇪🇺", dataPlane: "eu", currency: "EUR" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dataPlane: "default", currency: "SAR" },
  { code: "AE", name: "UAE", flag: "🇦🇪", dataPlane: "default", currency: "AED" },
  { code: "FR", name: "France", flag: "🇫🇷", dataPlane: "eu", currency: "EUR" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dataPlane: "eu", currency: "EUR" },
  { code: "IN", name: "India", flag: "🇮🇳", dataPlane: "default", currency: "INR" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dataPlane: "default", currency: "BRL" },
  { code: "JP", name: "Japan", flag: "🇯🇵", dataPlane: "default", currency: "JPY" },
];
