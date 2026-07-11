/**
 * CIRKLE Brain AI — UOB Planning Heuristics
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain
 *
 * Deterministic planning heuristics. These are NOT machine learning — they
 * are auditable, explainable rules. (Learning is Phase 7's responsibility;
 * UOB's heuristics may become learned policies in the future.)
 *
 * Every heuristic maps to a real CIRKLE capability relationship. No generic
 * orchestration concepts.
 * ============================================================================
 */

// ── Ordering heuristics (which capability comes before which) ────────────

export interface OrderingRule {
  /** The capability that should come FIRST. */
  before: string;
  /** The capability that should come AFTER. */
  after: string;
  /** Why this ordering. */
  reason: string;
}

/**
 * Capability ordering rules. These encode real CIRKLE workflow semantics:
 *   - visa must be checked before booking flights (a denied visa invalidates the trip)
 *   - weather must be fetched before generating an itinerary (weather affects activities)
 *   - fairness must be analyzed before finalizing an agreement
 *   - evidence must be submitted after filing a report (needs the case number)
 *   - notification must follow the action it notifies about
 */
export const ORDERING_RULES: OrderingRule[] = [
  {
    before: "travel.check-visa",
    after: "travel.search-flights",
    reason: "Visa eligibility must be confirmed before booking flights; a denied visa invalidates the trip.",
  },
  {
    before: "travel.check-visa",
    after: "travel.search-hotels",
    reason: "Visa eligibility should be confirmed before booking hotels.",
  },
  {
    before: "maps.get-weather",
    after: "travel.generate-itinerary",
    reason: "Weather affects outdoor activities and packing; itinerary should account for it.",
  },
  {
    before: "travel.search-flights",
    after: "travel.generate-itinerary",
    reason: "Flight times constrain the itinerary schedule.",
  },
  {
    before: "travel.search-hotels",
    after: "travel.generate-itinerary",
    reason: "Hotel location affects daily itinerary planning.",
  },
  {
    before: "commit.create-agreement",
    after: "commit.analyze-fairness",
    reason: "Fairness analysis must precede finalizing an agreement so issues can be addressed.",
  },
  {
    before: "shield.file-report",
    after: "shield.submit-evidence",
    reason: "Evidence submission requires the case number from the filed report.",
  },
  {
    before: "pay.split-bill",
    after: "pay.transfer-money",
    reason: "Bill split calculation must precede the individual transfers.",
  },
  {
    before: "pay.transfer-money",
    after: "wasl.send-message",
    reason: "Notification should follow the payment it references (when message is payment-related).",
  },
  {
    before: "commit.create-agreement",
    after: "wasl.send-message",
    reason: "Notification to review an agreement must follow agreement creation.",
  },
];

// ── Alternative capability map (fallbacks for unavailable capabilities) ──

export interface AlternativeRule {
  /** The primary capability. */
  primary: string;
  /** The alternative capability. */
  alternative: string;
  /** Whether this is a true alternative (same function) or a degraded fallback. */
  kind: "alternative" | "fallback";
  /** Why this alternative. */
  reason: string;
}

/**
 * Alternative/fallback capability map. When a primary capability is
 * unavailable, UOB substitutes the alternative.
 */
export const ALTERNATIVE_RULES: AlternativeRule[] = [
  {
    primary: "pay.transfer-money",
    alternative: "pay.qr-payment",
    kind: "alternative",
    reason: "QR payment is an alternative transfer method when direct transfer is unavailable.",
  },
  {
    primary: "pay.merchant-payment",
    alternative: "pay.qr-payment",
    kind: "alternative",
    reason: "QR payment can substitute for merchant payment when the merchant code system is down.",
  },
  {
    primary: "ai.cross-evaluate",
    alternative: "news.search",
    kind: "fallback",
    reason: "When AI providers are down, news search provides a degraded information fallback.",
  },
  {
    primary: "ai.recommend",
    alternative: "feed.trending",
    kind: "fallback",
    reason: "When AI recommendation is unavailable, trending feed provides a degraded discovery fallback.",
  },
  {
    primary: "mashahd.smart-reply",
    alternative: "wasl.smart-reply",
    kind: "alternative",
    reason: "Wasl smart-reply can generate replies when the Mashahd-specific smart-reply is down.",
  },
];

// ── Confirmation requirements (which capabilities need user confirmation) ─

/**
 * Capabilities that ALWAYS require user confirmation before execution.
 * These are side-effectful, sensitive operations.
 */
export const CONFIRMATION_REQUIRED_CAPABILITIES = new Set<string>([
  "pay.transfer-money",
  "pay.merchant-payment",
  "pay.split-bill",
  "pay.qr-payment",
  "pay.currency-exchange",
  "commit.create-agreement",
  "shield.panic",
  "shield.file-report",
  "midan.create-post",
  "mashahd.upload-video",
  "lamahd.share-photo",
  "wasl.send-message",
]);

/**
 * Capabilities that NEVER require confirmation (read-only).
 */
export const NO_CONFIRMATION_CAPABILITIES = new Set<string>([
  "travel.search-flights",
  "travel.search-hotels",
  "travel.check-visa",
  "travel.generate-itinerary",
  "news.search",
  "news.headlines",
  "news.recommend",
  "feed.generate",
  "feed.trending",
  "midan.like-post",
  "mashahd.like-video",
  "commit.analyze-fairness",
  "commit.mediate-dispute",
  "profile.view",
  "profile.update",
  "wasl.smart-reply",
  "wasl.translate",
  "wasl.summarize",
  "maps.search-nearby",
  "maps.get-weather",
  "ai.recommend",
  "ai.cross-evaluate",
]);

// ── Compensation map (what to do if a step fails) ────────────────────────

export interface CompensationRule {
  /** The capability that may fail. */
  forCapability: string;
  /** The compensation capability to invoke on failure. */
  compensationCapability: string;
  /** Why this compensation. */
  reason: string;
}

/**
 * Compensation planning. When a step fails and cannot be retried, UOB
 * plans a compensation action to restore consistency.
 */
export const COMPENSATION_RULES: CompensationRule[] = [
  {
    forCapability: "pay.transfer-money",
    compensationCapability: "commit.create-agreement",
    reason: "If a payment fails, create a formal agreement to record the debt for later settlement.",
  },
  {
    forCapability: "pay.split-bill",
    compensationCapability: "wasl.send-message",
    reason: "If split-bill fails, notify participants that manual settlement is needed.",
  },
  {
    forCapability: "commit.create-agreement",
    compensationCapability: "wasl.send-message",
    reason: "If agreement creation fails, notify parties that the agreement could not be created.",
  },
  {
    forCapability: "mashahd.upload-video",
    compensationCapability: "lamahd.share-photo",
    reason: "If video upload fails, suggest sharing a photo as a fallback.",
  },
];

// ── Workspace derivation (from intent + capabilities) ────────────────────

/**
 * Derive the workspace from CRIE intent type. This is a heuristic mapping;
 * workspaces are cognitive groupings, not data structures.
 */
export function deriveWorkspace(intentType: string, capabilities: string[]): string {
  // Check capabilities first (more specific).
  const capSet = new Set(capabilities);
  if (capSet.has("travel.search-flights") || capSet.has("travel.search-hotels") || capSet.has("travel.generate-itinerary")) {
    return "travel";
  }
  if (capSet.has("pay.transfer-money") || capSet.has("pay.split-bill") || capSet.has("pay.qr-payment")) {
    return "payments";
  }
  if (capSet.has("shield.file-report") || capSet.has("shield.panic")) {
    return "safety";
  }
  if (capSet.has("commit.create-agreement") || capSet.has("commit.analyze-fairness")) {
    return "business";
  }
  if (capSet.has("midan.create-post") || capSet.has("lamahd.share-photo") || capSet.has("mashahd.upload-video")) {
    return "social";
  }
  if (capSet.has("wasl.send-message") || capSet.has("wasl.translate")) {
    return "communications";
  }
  if (capSet.has("news.search") || capSet.has("feed.generate")) {
    return "information";
  }
  if (capSet.has("profile.update") || capSet.has("profile.view")) {
    return "identity";
  }

  // Fall back to intent type.
  const intentMap: Record<string, string> = {
    plan: "travel",
    book: "travel",
    recommend: "information",
    find: "information",
    compare: "information",
    communicate: "communications",
    create: "social",
    analyze: "business",
    track: "payments",
    navigate: "travel",
    answer: "information",
    learn: "information",
    remind: "productivity",
    automate: "productivity",
    clarify: "information",
  };
  return intentMap[intentType] || "general";
}

// ── Retry strategy (max retries per capability) ──────────────────────────

/**
 * Default retry counts. Sensitive operations (payments, reports) get 1 retry;
 * read-only operations get 2 (idempotent).
 */
export function defaultMaxRetries(capabilityId: string): number {
  if (capabilityId.startsWith("pay.")) return 1;
  if (capabilityId.startsWith("shield.")) return 1;
  if (capabilityId.startsWith("commit.")) return 1;
  return 2; // read-only / idempotent
}

// ── Sensitive permission tokens (always require confirmation) ────────────

export const SENSITIVE_PERMISSIONS = new Set<string>([
  "pay:send",
  "shield:panic",
  "shield:write",
  "commit:write",
]);

// ── Complexity estimation ────────────────────────────────────────────────

/**
 * Estimate plan complexity (1-10) based on step count, parallel groups,
 * conditional branches, and compensation actions.
 */
export function estimateComplexity(
  stepCount: number,
  parallelGroupCount: number,
  branchCount: number,
  compensationCount: number,
): number {
  let score = 1;
  score += Math.min(stepCount / 3, 3); // up to +3 for steps
  score += Math.min(parallelGroupCount, 2); // up to +2 for parallelism
  score += Math.min(branchCount, 2); // up to +2 for branches
  score += Math.min(compensationCount, 2); // up to +2 for compensation
  return Math.min(Math.round(score), 10);
}
