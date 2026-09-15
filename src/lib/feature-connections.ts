// @ts-nocheck
/**
 * Cross-Feature Connection Map
 * ============================================================================
 * Defines the high-value connections between features that should be wired
 * together. Each connection represents a workflow that adds value when two
 * features interact.
 *
 * Used by:
 *   - Home screen (to show "Connected Features" suggestions)
 *   - Feature Browser (to show "Works with" badges on domain cards)
 *   - Command Palette (to show connected actions)
 *   - AI assistants (to understand which features can be composed)
 */

export interface FeatureConnection {
  id: string;
  fromDomain: string;
  toDomain: string;
  title: string;
  description: string;
  /** The event to dispatch to trigger this connection */
  triggerEvent: string;
  /** Optional: the event detail to pass */
  triggerDetail?: Record<string, any>;
  /** Icon for the connection */
  emoji: string;
  /** Whether this connection is already wired in the codebase */
  status: "wired" | "not-wired" | "partial";
  /** Value score 1-10 */
  value: number;
}

/**
 * High-value cross-feature connections.
 * Sorted by value (highest first).
 */
export const FEATURE_CONNECTIONS: FeatureConnection[] = [
  // ── Messaging × Payments ──────────────────────────────────────────────
  {
    id: "conn-wasl-pay",
    fromDomain: "messaging",
    toDomain: "payments",
    title: "Send Money in Chat",
    description: "Send money directly in a Wasl conversation — splits, requests, and payments without leaving the chat.",
    triggerEvent: "circle:pay-in-chat",
    emoji: "💸",
    status: "not-wired",
    value: 10,
  },
  // ── Messaging × Social Feed ──────────────────────────────────────────
  {
    id: "conn-wasl-midan",
    fromDomain: "messaging",
    toDomain: "social_feed",
    title: "Share Message to Midan",
    description: "Long-press a message → share to Midan as a public post with attribution.",
    triggerEvent: "share-to-midan",
    emoji: "📢",
    status: "partial",
    value: 9,
  },
  // ── Social Feed × Messaging ──────────────────────────────────────────
  {
    id: "conn-midan-wasl",
    fromDomain: "social_feed",
    toDomain: "messaging",
    title: "Share Post to Chat",
    description: "Share a Midan post directly to a Wasl conversation.",
    triggerEvent: "share-to-wasl",
    emoji: "💬",
    status: "partial",
    value: 9,
  },
  // ── Travel × Messaging ───────────────────────────────────────────────
  {
    id: "conn-rihla-wasl",
    fromDomain: "travel",
    toDomain: "messaging",
    title: "Share Trip to Chat",
    description: "Share a travel itinerary to a Wasl conversation so a group can collaborate on the trip.",
    triggerEvent: "share-to-wasl",
    emoji: "✈️",
    status: "wired",
    value: 8,
  },
  // ── Travel × Payments ───────────────────────────────────────────────
  {
    id: "conn-rihla-pay",
    fromDomain: "travel",
    toDomain: "payments",
    title: "Pay for Booking",
    description: "Pay for flights, hotels, and travel services directly from Rihla using Circle Pay.",
    triggerEvent: "circle:pay",
    emoji: "🎫",
    status: "not-wired",
    value: 9,
  },
  // ── AI × Home ────────────────────────────────────────────────────────
  {
    id: "conn-ai-home",
    fromDomain: "ai_assistants",
    toDomain: "social_feed",
    title: "AI Catch-Up",
    description: "When you return, AI summarizes what you missed across all modules.",
    triggerEvent: "circle:ai-catch-up",
    emoji: "🌅",
    status: "wired",
    value: 8,
  },
  // ── Messaging × Commit ──────────────────────────────────────────────
  {
    id: "conn-wasl-commit",
    fromDomain: "messaging",
    toDomain: "payments",
    title: "Commit in Chat",
    description: "Turn a chat agreement into a binding CirkleCommit with AI auto-detection + email confirmation.",
    triggerEvent: "circle:cirkle-commit",
    emoji: "🤝",
    status: "wired",
    value: 10,
  },
  // ── Civic × Evidence ─────────────────────────────────────────────────
  {
    id: "conn-shield-evidence",
    fromDomain: "civic",
    toDomain: "privacy_security",
    title: "Report → Evidence Vault",
    description: "Citizen Shield reports automatically create evidence items in the sealed Evidence Vault.",
    triggerEvent: "circle:citizen-shield",
    emoji: "🔒",
    status: "not-wired",
    value: 8,
  },
  // ── Circles × Messaging ──────────────────────────────────────────────
  {
    id: "conn-circles-wasl",
    fromDomain: "circles",
    toDomain: "messaging",
    title: "Circle → Group Chat",
    description: "Create a Wasl group chat directly from a Circle — members auto-invited.",
    triggerEvent: "circle:circle-detail",
    emoji: "⭕",
    status: "not-wired",
    value: 9,
  },
  // ── Payments × Social Feed ───────────────────────────────────────────
  {
    id: "conn-pay-midan",
    fromDomain: "payments",
    toDomain: "social_feed",
    title: "Tip Creators",
    description: "Support creators directly from their Midan posts via Circle Pay.",
    triggerEvent: "circle:creator-support",
    emoji: "💖",
    status: "wired",
    value: 8,
  },
  // ── Commit × Email ───────────────────────────────────────────────────
  {
    id: "conn-commit-email",
    fromDomain: "payments",
    toDomain: "tools",
    title: "Commit → Email Confirmation",
    description: "Send a formal AI-generated commit confirmation email to all parties.",
    triggerEvent: "circle:cirkle-commit",
    emoji: "📧",
    status: "partial",
    value: 7,
  },
  // ── AI × Messaging ───────────────────────────────────────────────────
  {
    id: "conn-ai-wasl",
    fromDomain: "ai_assistants",
    toDomain: "messaging",
    title: "AI in Chat",
    description: "Smart reply, tone adjustment, conversation starters, AI summary — all in Wasl.",
    triggerEvent: "circle:smart-reply",
    emoji: "🧠",
    status: "wired",
    value: 9,
  },
  // ── AI × Travel ──────────────────────────────────────────────────────
  {
    id: "conn-ai-rihla",
    fromDomain: "ai_assistants",
    toDomain: "travel",
    title: "AI Travel Planner",
    description: "AI generates personalized itineraries, cultural tips, and travel recommendations.",
    triggerEvent: "circle:ai",
    emoji: "🗺️",
    status: "wired",
    value: 8,
  },
  // ── Social Feed × AI ─────────────────────────────────────────────────
  {
    id: "conn-social-ai",
    fromDomain: "social_feed",
    toDomain: "ai_assistants",
    title: "AI Content Coach",
    description: "AI analyzes your posts, suggests improvements, optimal posting times, and hashtags.",
    triggerEvent: "circle:smart-compose",
    emoji: "✍️",
    status: "wired",
    value: 8,
  },
  // ── Identity × Civic ─────────────────────────────────────────────────
  {
    id: "conn-identity-shield",
    fromDomain: "identity",
    toDomain: "civic",
    title: "Verified Citizen Reports",
    description: "Cirkle ID verification adds trust weight to Citizen Shield reports.",
    triggerEvent: "circle:cirkle-identity",
    emoji: "🪪",
    status: "not-wired",
    value: 7,
  },
  // ── Privacy × Messaging ─────────────────────────────────────────────
  {
    id: "conn-privacy-wasl",
    fromDomain: "privacy_security",
    toDomain: "messaging",
    title: "Disappearing + Ghost Mode",
    description: "Privacy Shield + Ghost Mode + Disappearing Messages = complete chat privacy.",
    triggerEvent: "circle:privacy-shield",
    emoji: "👻",
    status: "wired",
    value: 7,
  },
  // ── Communications × Social Feed ─────────────────────────────────────
  {
    id: "conn-comms-social",
    fromDomain: "communications",
    toDomain: "social_feed",
    title: "Co-Watch Videos",
    description: "Watch Mashahd videos together in a Wasl call with synced playback.",
    triggerEvent: "circle:co-watch",
    emoji: "🎬",
    status: "wired",
    value: 7,
  },
  // ── Travel × Identity ───────────────────────────────────────────────
  {
    id: "conn-travel-identity",
    fromDomain: "travel",
    toDomain: "identity",
    title: "Travel Documents Vault",
    description: "Store passport, visa, and tickets in the encrypted on-device vault linked to your Cirkle ID.",
    triggerEvent: "circle:visa-explorer",
    emoji: "🛂",
    status: "wired",
    value: 8,
  },
  // ── Professional × Messaging ─────────────────────────────────────────
  {
    id: "conn-pro-wasl",
    fromDomain: "professional",
    toDomain: "messaging",
    title: "Professional DMs",
    description: "Pro Network profiles link directly to Wasl conversations for professional communication.",
    triggerEvent: "circle:pro-network",
    emoji: "💼",
    status: "not-wired",
    value: 7,
  },
  // ── Payments × Commit × Email ───────────────────────────────────────
  {
    id: "conn-pay-commit-email",
    fromDomain: "payments",
    toDomain: "tools",
    title: "Escrow → Commit → Email",
    description: "Full chain: payment in escrow → AI commit detection → formal email confirmation to all parties.",
    triggerEvent: "circle:cirkle-commit",
    emoji: "🔗",
    status: "partial",
    value: 10,
  },
];

/**
 * Get all connections for a given domain.
 */
export function getConnectionsForDomain(domainId: string): FeatureConnection[] {
  return FEATURE_CONNECTIONS.filter(
    c => c.fromDomain === domainId || c.toDomain === domainId
  ).sort((a, b) => b.value - a.value);
}

/**
 * Get connections between two specific domains.
 */
export function getConnectionsBetween(from: string, to: string): FeatureConnection[] {
  return FEATURE_CONNECTIONS.filter(
    c => (c.fromDomain === from && c.toDomain === to) ||
         (c.fromDomain === to && c.toDomain === from)
  ).sort((a, b) => b.value - a.value);
}

/**
 * Get the top N most valuable connections across all domains.
 */
export function getTopConnections(limit: number = 10): FeatureConnection[] {
  return [...FEATURE_CONNECTIONS]
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Get connections that are NOT yet wired (implementation gaps).
 */
export function getUnwiredConnections(): FeatureConnection[] {
  return FEATURE_CONNECTIONS.filter(c => c.status === "not-wired");
}

export const CONNECTION_COUNT = FEATURE_CONNECTIONS.length;
