/**
 * Platform Feature Toggles — admin-controlled feature on/off switches.
 * ============================================================================
 * This is the ADMIN-CONTROLLED feature toggle system (separate from the
 * region-based feature-manager.ts which handles compliance).
 *
 * Default state: ALL features OFF except the 8 core features:
 *   wasl, lamahat, mashahd, midan, posting, citizen_shield, emergency, commit
 *
 * The admin can toggle any feature on from the Admin Panel → Feature Toggles.
 * State is persisted in the `PlatformFeatureToggle` table and shared across
 * all users (global toggles, not per-user).
 *
 * The client fetches the enabled set via GET /api/platform-features and
 * caches it in localStorage with a 5-minute TTL.
 */

export type PlatformFeatureCategory = "tab" | "overlay" | "capability";

export interface PlatformFeatureDef {
  id: string;
  label: string;
  description: string;
  category: PlatformFeatureCategory;
  /** Whether this feature is enabled by default (only the 8 core features). */
  defaultEnabled: boolean;
}

/**
 * The master list of platform features that can be toggled by the admin.
 * Tabs = the 8 dock tabs. Overlays = the major feature overlays.
 * Capabilities = cross-cutting capabilities (posting, AI, etc.).
 */
export const PLATFORM_FEATURES: PlatformFeatureDef[] = [
  // ── Tabs (8) ──────────────────────────────────────────────────────────
  {
    id: "tab.home",
    label: "Home Dashboard",
    description: "The main home feed with news, posts, and quick actions.",
    category: "tab",
    defaultEnabled: false,
  },
  {
    id: "tab.wasl",
    label: "Wasl (Chat)",
    description: "End-to-end encrypted messaging, calls, and institution chats.",
    category: "tab",
    defaultEnabled: true, // CORE — always on
  },
  {
    id: "tab.midan",
    label: "Midan (Square)",
    description: "Microblogging, threads, and public posts with fact-checking.",
    category: "tab",
    defaultEnabled: true, // CORE — always on
  },
  {
    id: "tab.lamahat",
    label: "Lamahat (Photos)",
    description: "Photo sharing, albums, and collections.",
    category: "tab",
    defaultEnabled: true, // CORE — always on
  },
  {
    id: "tab.mashahd",
    label: "Mashahd (Video)",
    description: "Video sharing, live streams, and playlists.",
    category: "tab",
    defaultEnabled: true, // CORE — always on
  },
  {
    id: "tab.pay",
    label: "Circle Pay",
    description: "Zero-fee payments, receipts, and transfers.",
    category: "tab",
    defaultEnabled: false,
  },
  {
    id: "tab.rihla",
    label: "Rihla (Travel)",
    description: "Trip planning, flights, hotels, and visas.",
    category: "tab",
    defaultEnabled: false,
  },
  {
    id: "tab.profile",
    label: "Profile & Settings",
    description: "User profile, achievements, and account settings.",
    category: "tab",
    defaultEnabled: true, // always on — needed for admin access
  },

  // ── Core Capabilities ────────────────────────────────────────────────
  {
    id: "capability.posting",
    label: "Posting & Composer",
    description: "Create posts, photos, videos, and polls across modules.",
    category: "capability",
    defaultEnabled: true, // CORE — always on
  },
  {
    id: "capability.ai",
    label: "Brain AI",
    description: "AI-powered features: search, summarize, translate, recommend.",
    category: "capability",
    defaultEnabled: false,
  },
  {
    id: "capability.payments",
    label: "Payments & Transactions",
    description: "Send/receive money, transaction history, receipts.",
    category: "capability",
    defaultEnabled: false,
  },
  {
    id: "capability.travel",
    label: "Travel & Booking",
    description: "Flights, hotels, visas, itineraries.",
    category: "capability",
    defaultEnabled: false,
  },
  {
    id: "capability.identity_oidc",
    label: "Circle ID (OIDC)",
    description: "OpenID Connect provider for third-party authentication.",
    category: "capability",
    defaultEnabled: false,
  },
  {
    id: "capability.e2ee",
    label: "End-to-End Encryption",
    description: "E2EE messaging with P-256 ECDH + AES-256-GCM.",
    category: "capability",
    defaultEnabled: true, // CORE — always on (Wasl depends on it)
  },
  {
    id: "capability.federation",
    label: "ActivityPub Federation",
    description: "Federate with Mastodon and other ActivityPub servers.",
    category: "capability",
    defaultEnabled: false,
  },
  {
    id: "capability.mesh",
    label: "Offline Mesh Network",
    description: "Offline messaging + payments via local mesh.",
    category: "capability",
    defaultEnabled: false,
  },
  {
    id: "capability.ipfs",
    label: "IPFS Storage",
    description: "Decentralized file storage via IPFS.",
    category: "capability",
    defaultEnabled: false,
  },

  // ── Feature Overlays ─────────────────────────────────────────────────
  {
    id: "overlay.citizen_shield",
    label: "Citizen Shield",
    description: "Government accountability, issue reporting, AI case builder.",
    category: "overlay",
    defaultEnabled: true, // CORE — always on
  },
  {
    id: "overlay.emergency",
    label: "Emergency SOS",
    description: "One-tap emergency alert to contacts + authorities.",
    category: "overlay",
    defaultEnabled: true, // CORE — always on
  },
  {
    id: "overlay.commit",
    label: "Cirkle Commit",
    description: "Binding agreements with AI fairness audit, escrow, NFT minting.",
    category: "overlay",
    defaultEnabled: true, // CORE — always on
  },
  {
    id: "overlay.time_capsule",
    label: "Time Capsule",
    description: "Schedule messages to unlock on a future date.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.mood_feed",
    label: "Mood Feed",
    description: "AI reshapes your feed based on your mood.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.privacy_shield",
    label: "Privacy Shield",
    description: "One-tap blur for sensitive on-screen content.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.receipt_split",
    label: "Receipt Split",
    description: "AI-powered bill scanning and splitting.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.circle_aura",
    label: "Cirkle Aura",
    description: "Live animated aura reflecting real-time activity.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.smart_compose",
    label: "Smart Compose",
    description: "AI content coach + cross-module posting.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.social_analytics",
    label: "Social Analytics",
    description: "Personal engagement dashboard with AI insights.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.connection_graph",
    label: "Connection Graph",
    description: "Interactive SVG network of your connections.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.content_calendar",
    label: "Content Calendar",
    description: "Schedule posts with AI best-time hints.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.content_discovery",
    label: "AI Content Discovery",
    description: "AI-curated content discovery with 'Surprise me'.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.mood_engine",
    label: "Mood Engine",
    description: "Passive mood detection + adaptive feed.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.social_challenges",
    label: "Social Challenges",
    description: "Weekly community challenges with badges.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.smart_notifications",
    label: "Smart Notifications",
    description: "AI-grouped notifications by intent.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.rituals",
    label: "Social Rituals",
    description: "Daily prompts with streak tracking.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.personal_ai",
    label: "Personal AI OS",
    description: "DNA + Mood + Topic DNA on-device.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.bot_developer",
    label: "Bot Developer",
    description: "Build and deploy Cirkle bots.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.creator_studio",
    label: "Creator Studio",
    description: "Creator analytics, monetization, and tools.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.ad_studio",
    label: "Ad Studio",
    description: "Create and manage ad campaigns.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.oracle_markets",
    label: "Oracle Markets",
    description: "Prediction markets with LMSR.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.transparency_dashboard",
    label: "Transparency Dashboard",
    description: "Algorithmic transparency controls.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.performance_dashboard",
    label: "Performance Dashboard",
    description: "Platform performance metrics.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.data_residency",
    label: "Data Residency",
    description: "Control where your data is stored.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.mesh_dashboard",
    label: "Mesh Dashboard",
    description: "Offline mesh network status.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.shield_dashboard",
    label: "Shield Dashboard",
    description: "Citizen Shield case management.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.memory_dashboard",
    label: "Memory Dashboard",
    description: "Personal memory brain controls.",
    category: "overlay",
    defaultEnabled: false,
  },
  {
    id: "overlay.brain_orchestrator",
    label: "Brain Orchestrator",
    description: "9+1 phase cognitive architecture control.",
    category: "overlay",
    defaultEnabled: false,
  },
];

/** The 8 core feature IDs that are enabled by default. */
export const CORE_FEATURE_IDS = PLATFORM_FEATURES.filter(f => f.defaultEnabled).map(f => f.id);

/** Map of feature id → definition for O(1) lookup. */
export const PLATFORM_FEATURE_MAP: Record<string, PlatformFeatureDef> = Object.fromEntries(
  PLATFORM_FEATURES.map(f => [f.id, f]),
);

/**
 * Given a set of enabled feature IDs (from the DB), return the full
 * FeatureFlag list with current enabled state. Features not in the DB
 * default to their `defaultEnabled` value.
 */
export function resolveFeatureStates(
  dbToggles: Array<{ id: string; enabled: boolean }>,
): Array<PlatformFeatureDef & { enabled: boolean }> {
  const dbMap = new Map(dbToggles.map(t => [t.id, t.enabled]));
  return PLATFORM_FEATURES.map(def => ({
    ...def,
    enabled: dbMap.has(def.id) ? dbMap.get(def.id)! : def.defaultEnabled,
  }));
}

/**
 * Check whether a feature id is known to the platform toggle system.
 * (Used to distinguish toggleable features from always-on internal ones.)
 */
export function isPlatformFeature(id: string): boolean {
  return id in PLATFORM_FEATURE_MAP;
}
