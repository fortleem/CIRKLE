/**
 * CIRKLE Brain AI — Capability Registry Seed
 * ============================================================================
 *
 * Phase 4.5 — Shared Cognitive Foundation
 *
 * Seeds the global Capability Registry with the real capabilities exposed by
 * existing CIRKLE platform modules. This gives the future UOB (Phase 5)
 * something concrete to reason over from day one.
 *
 * Each capability is described independently of its module implementation,
 * per Ch.3 §3.9 (Platform-Centric Intelligence). The AI will reason over
 * "Search Flights", not "the Travel Module".
 *
 * This file is a pure data seed — it registers capabilities into the global
 * registry singleton. It contains NO business logic and does NOT execute
 * anything. It is idempotent (safe to call multiple times).
 * ============================================================================
 */

import { globalCapabilityRegistry, type Capability } from "./capability-registry";

let seeded = false;

/**
 * Seed the global Capability Registry with all known platform capabilities.
 * Idempotent — calling more than once is a no-op.
 */
export function seedCapabilities(): void {
  if (seeded) return;

  const caps: Capability[] = [
    // ── Payments (Pay module) ──────────────────────────────────────────
    cap("pay.transfer-money", "Transfer Money", "Send money to another Cirkle user by username or phone", "payments", "pay", {
      input: { to: { type: "string", required: true, description: "Recipient username/phone" }, amount: { type: "number", required: true }, currency: { type: "string" } },
      output: { transactionId: { type: "string" }, status: { type: "string" } },
    }, ["pay:send"], [], { tags: ["money", "send", "p2p"] }),
    cap("pay.merchant-payment", "Merchant Payment", "Pay a merchant via QR or merchant code", "payments", "pay", {
      input: { merchantCode: { type: "string", required: true }, amount: { type: "number", required: true } },
      output: { transactionId: { type: "string" }, status: { type: "string" } },
    }, ["pay:send"], [], { tags: ["merchant", "qr"] }),
    cap("pay.split-bill", "Split Bill", "Split a payment across multiple contacts", "payments", "pay", {
      input: { total: { type: "number", required: true }, participants: { type: "string[]", required: true } },
      output: { splits: { type: "object[]" } },
    }, ["pay:send"], ["pay.transfer-money"], { tags: ["split", "group"] }),
    cap("pay.qr-payment", "QR Payment", "Pay by scanning a QR code", "payments", "pay", {
      input: { qrPayload: { type: "string", required: true } },
      output: { transactionId: { type: "string" } },
    }, ["pay:send"], [], { tags: ["qr", "scan"] }),
    cap("pay.currency-exchange", "Currency Exchange", "Convert between currencies at live rates", "payments", "pay", {
      input: { from: { type: "string", required: true }, to: { type: "string", required: true }, amount: { type: "number", required: true } },
      output: { converted: { type: "number" }, rate: { type: "number" } },
    }, [], [], { tags: ["fx", "currency"] }),

    // ── Travel (Rihla module) ──────────────────────────────────────────
    cap("travel.search-flights", "Search Flights", "Search available flights between airports", "travel", "rihla", {
      input: { from: { type: "string", required: true }, to: { type: "string", required: true }, date: { type: "string", required: true } },
      output: { flights: { type: "object[]" } },
    }, [], [], { tags: ["flights", "search"] }),
    cap("travel.search-hotels", "Search Hotels", "Search available hotels at a destination", "travel", "rihla", {
      input: { destination: { type: "string", required: true }, checkIn: { type: "string" }, checkOut: { type: "string" } },
      output: { hotels: { type: "object[]" } },
    }, [], [], { tags: ["hotels", "stay"] }),
    cap("travel.generate-itinerary", "Generate Itinerary", "AI-generate a multi-day travel itinerary", "ai", "rihla", {
      input: { destination: { type: "string", required: true }, days: { type: "number" } },
      output: { itinerary: { type: "object" } },
    }, ["ai:generate"], [], { tags: ["ai", "plan", "trip"] }),
    cap("travel.check-visa", "Check Visa", "Check visa requirements between two countries", "government", "rihla", {
      input: { passport: { type: "string", required: true }, destination: { type: "string", required: true } },
      output: { required: { type: "boolean" }, durationDays: { type: "number" } },
    }, [], [], { tags: ["visa", "gov"] }),

    // ── News ───────────────────────────────────────────────────────────
    cap("news.search", "Search News", "Search news articles by query", "news", "news", {
      input: { query: { type: "string", required: true }, country: { type: "string" } },
      output: { articles: { type: "object[]" } },
    }, [], [], { tags: ["news", "search"] }),
    cap("news.headlines", "Get Headlines", "Get top headlines for a country/category", "news", "news", {
      input: { country: { type: "string" }, category: { type: "string" } },
      output: { headlines: { type: "object[]" } },
    }, [], [], { tags: ["news", "headlines"] }),
    cap("news.recommend", "Recommend News", "Brain-powered news recommendation", "ai", "news", {
      input: { userId: { type: "string" } },
      output: { recommendations: { type: "object[]" } },
    }, ["ai:personalization"], [], { tags: ["ai", "recommend"] }),

    // ── Feed ───────────────────────────────────────────────────────────
    cap("feed.generate", "Generate Feed", "Generate the personalized home feed", "ai", "feed", {
      input: { country: { type: "string" }, city: { type: "string" } },
      output: { feed: { type: "object" } },
    }, [], [], { tags: ["feed", "home"] }),
    cap("feed.trending", "Get Trending", "Get trending items in the feed", "social", "feed", {
      input: { country: { type: "string" } },
      output: { trending: { type: "object[]" } },
    }, [], [], { tags: ["trending"] }),

    // ── Midan (social) ─────────────────────────────────────────────────
    cap("midan.create-post", "Create Post", "Publish a post to the Midan feed", "social", "midan", {
      input: { body: { type: "string", required: true }, module: { type: "string" } },
      output: { postId: { type: "string" } },
    }, ["midan:write"], [], { tags: ["post", "social"] }),
    cap("midan.like-post", "Like Post", "Like a post in Midan", "social", "midan", {
      input: { postId: { type: "string", required: true } },
      output: { liked: { type: "boolean" } },
    }, [], [], { tags: ["like"] }),
    cap("midan.comment", "Comment on Post", "Comment on a Midan post (with AI smart-reply)", "social", "midan", {
      input: { postId: { type: "string", required: true }, body: { type: "string", required: true } },
      output: { commentId: { type: "string" } },
    }, ["midan:write"], [], { tags: ["comment"] }),

    // ── Mashahd (video) ────────────────────────────────────────────────
    cap("mashahd.upload-video", "Upload Video", "Upload a video to Mashahd", "entertainment", "mashahd", {
      input: { title: { type: "string", required: true }, mediaId: { type: "string", required: true } },
      output: { videoId: { type: "string" } },
    }, ["mashahd:write"], [], { tags: ["video", "upload"] }),
    cap("mashahd.like-video", "Like Video", "Like a Mashahd video", "entertainment", "mashahd", {
      input: { videoId: { type: "string", required: true } },
      output: { liked: { type: "boolean" } },
    }, [], [], { tags: ["video", "like"] }),
    cap("mashahd.smart-reply", "Smart Reply", "AI-generated reply to a video comment", "ai", "mashahd", {
      input: { comment: { type: "string", required: true } },
      output: { reply: { type: "string" } },
    }, ["ai:generate"], [], { tags: ["ai", "reply"] }),

    // ── Lamahd (photos) ────────────────────────────────────────────────
    cap("lamahd.share-photo", "Share Photo", "Share a photo to the Lamahd gallery", "social", "lamahd", {
      input: { mediaId: { type: "string", required: true }, caption: { type: "string" } },
      output: { photoId: { type: "string" } },
    }, ["lamahd:write"], [], { tags: ["photo"] }),

    // ── Commit ─────────────────────────────────────────────────────────
    cap("commit.analyze-fairness", "Analyze Fairness", "AI-analyze fairness of a commitment/agreement", "business", "commit", {
      input: { agreementText: { type: "string", required: true } },
      output: { fairnessScore: { type: "number" }, analysis: { type: "object" } },
    }, ["ai:analyze"], [], { tags: ["commit", "fairness", "ai"] }),
    cap("commit.mediate-dispute", "Mediate Dispute", "AI-mediate a dispute between parties", "business", "commit", {
      input: { disputeId: { type: "string", required: true } },
      output: { resolution: { type: "object" } },
    }, ["ai:mediate"], [], { tags: ["commit", "dispute"] }),
    cap("commit.create-agreement", "Create Agreement", "Create a new CirkleCommit agreement", "business", "commit", {
      input: { terms: { type: "string", required: true }, parties: { type: "string[]", required: true } },
      output: { agreementId: { type: "string" } },
    }, ["commit:write"], [], { tags: ["commit", "agreement"] }),

    // ── Shield (security) ──────────────────────────────────────────────
    cap("shield.file-report", "File Report", "File an anonymous/protected citizen report", "security", "shield", {
      input: { category: { type: "string", required: true }, title: { type: "string", required: true }, description: { type: "string", required: true } },
      output: { caseNumber: { type: "string" } },
    }, ["shield:write"], [], { tags: ["shield", "report", "security"] }),
    cap("shield.submit-evidence", "Submit Evidence", "Submit hashed evidence for an existing case", "security", "shield", {
      input: { caseNumber: { type: "string", required: true }, evidenceHash: { type: "string", required: true } },
      output: { accepted: { type: "boolean" } },
    }, ["shield:write"], ["shield.file-report"], { tags: ["shield", "evidence"] }),
    cap("shield.panic", "Panic Alert", "Trigger a panic alert (emergency)", "security", "shield", {
      input: { location: { type: "object", required: true } },
      output: { alertId: { type: "string" } },
    }, ["shield:panic"], [], { tags: ["shield", "emergency"], availability: "available" }),

    // ── Profile ────────────────────────────────────────────────────────
    cap("profile.update", "Update Profile", "Update the user's profile", "identity", "profile", {
      input: { displayName: { type: "string" }, bio: { type: "string" } },
      output: { updated: { type: "boolean" } },
    }, ["profile:write"], [], { tags: ["profile"] }),
    cap("profile.view", "View Profile", "View a user's profile", "identity", "profile", {
      input: { username: { type: "string", required: true } },
      output: { profile: { type: "object" } },
    }, [], [], { tags: ["profile"] }),

    // ── Wasl (chat) ────────────────────────────────────────────────────
    cap("wasl.send-message", "Send Message", "Send a chat message in Wasl", "communication", "wasl", {
      input: { conversationId: { type: "string", required: true }, body: { type: "string", required: true } },
      output: { messageId: { type: "string" } },
    }, ["wasl:write"], [], { tags: ["chat", "message"] }),
    cap("wasl.smart-reply", "Smart Reply", "AI-generate a smart reply in chat", "ai", "wasl", {
      input: { message: { type: "string", required: true } },
      output: { replies: { type: "string[]" } },
    }, ["ai:generate"], [], { tags: ["ai", "reply"] }),
    cap("wasl.translate", "Translate", "Translate text between languages", "ai", "wasl", {
      input: { text: { type: "string", required: true }, to: { type: "string", required: true } },
      output: { translated: { type: "string" } },
    }, ["ai:generate"], [], { tags: ["ai", "translate"] }),
    cap("wasl.summarize", "Summarize", "AI-summarize a conversation or document", "ai", "wasl", {
      input: { text: { type: "string", required: true } },
      output: { summary: { type: "string" } },
    }, ["ai:generate"], [], { tags: ["ai", "summarize"] }),

    // ── Maps / Geo ─────────────────────────────────────────────────────
    cap("maps.search-nearby", "Search Nearby", "Search nearby places via GCIE", "maps", "maps", {
      input: { lat: { type: "number", required: true }, lng: { type: "number", required: true }, type: { type: "string" } },
      output: { places: { type: "object[]" } },
    }, [], [], { tags: ["maps", "nearby", "gcie"] }),
    cap("maps.get-weather", "Get Weather", "Get current weather for a location", "utilities", "maps", {
      input: { lat: { type: "number", required: true }, lng: { type: "number", required: true } },
      output: { weather: { type: "object" } },
    }, [], [], { tags: ["weather"] }),

    // ── AI (cross-cutting) ─────────────────────────────────────────────
    cap("ai.recommend", "AI Recommend", "Get IRDE-powered recommendations", "ai", "irde", {
      input: { candidates: { type: "object[]", required: true }, context: { type: "object", required: true } },
      output: { recommendations: { type: "object[]" } },
    }, ["ai:recommend"], [], { tags: ["irde", "recommend", "ai"] }),
    cap("ai.cross-evaluate", "Cross-Evaluate", "Multi-provider consensus answer", "ai", "brain", {
      input: { query: { type: "string", required: true } },
      output: { answer: { type: "string" }, confidence: { type: "number" }, sources: { type: "object[]" } },
    }, ["ai:generate"], [], { tags: ["cross-eval", "consensus", "ai"] }),
  ];

  for (const c of caps) {
    try {
      globalCapabilityRegistry.register(c);
    } catch {
      // Idempotent: ignore duplicates on re-seed.
    }
  }

  // Common aliases so the AI can use natural-language capability names.
  const aliases: Array<[string, string]> = [
    ["send-money", "pay.transfer-money"],
    ["book-flight", "travel.search-flights"],
    ["get-news", "news.search"],
    ["post", "midan.create-post"],
    ["upload", "mashahd.upload-video"],
    ["report", "shield.file-report"],
    ["chat", "wasl.send-message"],
    ["recommend", "ai.recommend"],
  ];
  for (const [alias, id] of aliases) {
    try {
      globalCapabilityRegistry.registerAlias(alias, id);
    } catch {
      /* ignore */
    }
  }

  seeded = true;
}

// ── Helper ───────────────────────────────────────────────────────────────

function cap(
  id: string,
  name: string,
  description: string,
  category: Capability["category"],
  ownerModule: string,
  contract: Capability["contract"],
  permissions: string[],
  dependencies: string[],
  opts: { tags?: string[]; availability?: Capability["availability"]; status?: Capability["status"] },
): Capability {
  return {
    id,
    name,
    description,
    category,
    ownerModule,
    contract,
    permissions,
    dependencies,
    availability: opts.availability ?? "available",
    status: opts.status ?? "active",
    version: "1.0.0",
    tags: opts.tags ?? [],
  };
}

/** Ensure seeding has run. Safe to call from anywhere (idempotent). */
export function ensureCapabilitiesSeeded(): void {
  if (!seeded) seedCapabilities();
}
