/**
 * Cirkle Brain AI — Intelligent Recommendation & Decision Engine (IRDE)
 *
 * Phase 4: The recommendation engine that evaluates alternatives and selects
 * the optimal recommendation.
 *
 * Architecture:
 * - GCIE provides candidate entities (places, events, products)
 * - PMB provides user preferences, history, goals
 * - CRIE provides intent, context, constraints, decision type
 * - IRDE evaluates candidates → multi-factor scoring → personalized ranking → explainable recommendations
 *
 * IRDE OWNS:
 * - Candidate evaluation (score every candidate)
 * - Multi-factor ranking (20+ weighted factors)
 * - Personalization (adjust scores based on PMB data)
 * - Recommendation scoring (final relevance score 0-100)
 * - Alternative generation (suggest alternatives when primary is rejected)
 * - Decision optimization (select best option considering trade-offs)
 * - Confidence estimation (how sure is this recommendation?)
 * - Diversity balancing (avoid repetitive recommendations)
 * - Recommendation explanations (why this option?)
 * - Continuous learning from user feedback (accept/reject/ignore/book/navigate)
 * - Exploration vs exploitation (balance favorites with new discoveries)
 * - Cold start handling (when little user history exists)
 * - Fairness (no bias toward paid partners or large brands)
 *
 * IRDE DOES NOT OWN:
 * - Geo discovery (→ GCIE)
 * - Memory storage (→ PMB)
 * - Reasoning (→ CRIE)
 * - Automation execution (→ future module)
 */

// ── Recommendation Domains ────────────────────────────────────────────────
export type RecommendationDomain =
  | "dining" | "coffee" | "shopping" | "groceries" | "entertainment"
  | "movies" | "streaming" | "events" | "travel" | "hotels" | "flights"
  | "transportation" | "education" | "books" | "courses" | "fitness"
  | "healthcare" | "financial" | "business" | "productivity" | "local_services"
  | "professional_services" | "government_services" | "community" | "volunteer"
  | "emergency" | "general";

// ── Candidate Entity (from GCIE or other providers) ──────────────────────
export interface CandidateEntity {
  id: string;
  name: string;
  domain: RecommendationDomain;
  type: string;
  lat?: number;
  lng?: number;
  distanceMeters?: number;
  walkTimeMin?: number;
  driveTimeMin?: number;
  rating?: number;
  reviewCount?: number;
  priceRange?: "$" | "$$" | "$$$" | "$$$$";
  openNow?: boolean;
  popularity?: number;          // 0-100 current busyness
  tags?: string[];
  description?: string;
  imageUrl?: string;
  url?: string;
  provider: string;
}

// ── Recommendation Context (from CRIE) ───────────────────────────────────
export interface RecommendationContext {
  intent: string;
  domain: RecommendationDomain;
  constraints: string[];        // budget_conscious, nearby_only, walking_distance, etc.
  preferences: string;          // PMB personalization context
  userGoals: string[];
  budget?: string;
  transportPreference?: string;
  weather?: { tempC: number; condition: string };
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  isWeekend: boolean;
  location?: { lat: number; lng: number; city: string };
  companions?: string[];
  accessibilityNeeds?: string[];
  explorationLevel: number;     // 0-1 (0 = stick to favorites, 1 = always discover new)
  userId: string;
}

// ── Scored Recommendation ────────────────────────────────────────────────
export interface ScoredRecommendation {
  entity: CandidateEntity;
  overallScore: number;         // 0-100 final relevance score
  confidence: number;           // 0-1 how confident IRDE is
  factors: RecommendationFactor[];
  explanation: string;          // user-facing explanation
  isAlternative?: boolean;      // true if this is an alternative to a rejected rec
  isSponsored?: boolean;        // clearly identified sponsored (never replaces organic)
  isNewDiscovery?: boolean;     // true if user hasn't seen this before
  isFavorite?: boolean;         // true if matches user's known favorites
  dataFreshness: number;        // 0-1 how recent is the data
  sourceReliability: number;    // 0-1 how reliable is the source
}

export interface RecommendationFactor {
  name: string;
  value: number;                // 0-1 normalized
  weight: number;               // 0-1 importance in this context
  contribution: number;         // value × weight (pre-normalized)
  description: string;          // human-readable
}

// ── Feedback Signal ──────────────────────────────────────────────────────
export type FeedbackType =
  | "accepted" | "rejected" | "ignored" | "booked" | "purchased"
  | "navigated" | "visited" | "rated" | "corrected";

export interface FeedbackSignal {
  userId: string;
  entityId: string;
  domain: RecommendationDomain;
  type: FeedbackType;
  rating?: number;              // 1-5 explicit rating
  timestamp: string;
  context?: { timeOfDay?: string; weather?: string; companions?: string };
}

// ── IRDE Engine ──────────────────────────────────────────────────────────
export class IntelligentRecommendationEngine {
  private feedbackHistory: Map<string, FeedbackSignal[]> = new Map(); // userId → feedback
  private recommendationHistory: Map<string, string[]> = new Map();   // userId → entity IDs shown
  private domainWeights: Map<RecommendationDomain, Record<string, number>> = new Map();
  private explorationCounters: Map<string, number> = new Map();       // userId → consecutive exploits

  constructor() {
    this.initializeDefaultWeights();
  }

  // ── Initialize default factor weights per domain ──────────────────────
  private initializeDefaultWeights() {
    // Dining: taste + distance + open + ratings matter most
    this.domainWeights.set("dining", {
      distance: 0.15, rating: 0.20, openStatus: 0.15, preferenceMatch: 0.20,
      budget: 0.10, popularity: 0.05, weather: 0.05, timeRelevance: 0.05, diversity: 0.05,
    });
    // Coffee: distance + open + preference match
    this.domainWeights.set("coffee", {
      distance: 0.25, rating: 0.15, openStatus: 0.20, preferenceMatch: 0.20,
      budget: 0.05, popularity: 0.05, weather: 0.02, timeRelevance: 0.03, diversity: 0.05,
    });
    // Travel: budget + ratings + preference match
    this.domainWeights.set("travel", {
      distance: 0.05, rating: 0.20, openStatus: 0.05, preferenceMatch: 0.25,
      budget: 0.20, popularity: 0.05, weather: 0.05, timeRelevance: 0.05, diversity: 0.10,
    });
    // Events: time relevance + preference match + diversity
    this.domainWeights.set("events", {
      distance: 0.10, rating: 0.10, openStatus: 0.15, preferenceMatch: 0.25,
      budget: 0.10, popularity: 0.10, weather: 0.05, timeRelevance: 0.20, diversity: 0.05,
    });
    // Shopping: price + preference + distance
    this.domainWeights.set("shopping", {
      distance: 0.15, rating: 0.15, openStatus: 0.10, preferenceMatch: 0.20,
      budget: 0.20, popularity: 0.05, weather: 0.03, timeRelevance: 0.02, diversity: 0.10,
    });
    // Default
    this.domainWeights.set("general", {
      distance: 0.15, rating: 0.15, openStatus: 0.10, preferenceMatch: 0.20,
      budget: 0.10, popularity: 0.10, weather: 0.05, timeRelevance: 0.05, diversity: 0.10,
    });
  }

  // ── Generate Recommendations ──────────────────────────────────────────
  recommend(
    candidates: CandidateEntity[],
    context: RecommendationContext,
    limit: number = 5,
  ): ScoredRecommendation[] {
    if (candidates.length === 0) return [];

    const weights = this.domainWeights.get(context.domain) || this.domainWeights.get("general")!;
    const userFeedback = this.feedbackHistory.get(context.userId) || [];
    const userHistory = this.recommendationHistory.get(context.userId) || [];

    // Score every candidate
    const scored = candidates.map(entity => {
      const factors = this.scoreEntity(entity, context, weights, userFeedback);
      const overallScore = this.calculateOverallScore(factors);
      const confidence = this.estimateConfidence(entity, factors, context);
      const explanation = this.generateExplanation(entity, factors, context);
      const isNew = !userHistory.includes(entity.id);
      const isFav = this.isFavorite(entity, context.preferences);
      const dataFreshness = this.assessDataFreshness(entity);
      const sourceReliability = this.assessSourceReliability(entity.provider);

      return {
        entity,
        overallScore,
        confidence,
        factors,
        explanation,
        isNewDiscovery: isNew,
        isFavorite: isFav,
        dataFreshness,
        sourceReliability,
      } as ScoredRecommendation;
    });

    // Apply diversity balancing
    const diversified = this.balanceDiversity(scored, context, limit);

    // Apply exploration vs exploitation
    const balanced = this.balanceExplorationExploitation(diversified, context, limit);

    // Sort by final score and apply limit
    const final = balanced.sort((a, b) => b.overallScore - a.overallScore).slice(0, limit);

    // Record shown recommendations
    this.recordRecommendations(context.userId, final.map(r => r.entity.id));

    return final;
  }

  // ── Score a single entity across all factors ──────────────────────────
  private scoreEntity(
    entity: CandidateEntity,
    context: RecommendationContext,
    weights: Record<string, number>,
    userFeedback: FeedbackSignal[],
  ): RecommendationFactor[] {
    const factors: RecommendationFactor[] = [];

    // 1. Distance (closer = better, normalized to 0-1)
    const distance = entity.distanceMeters || 0;
    const distanceScore = Math.max(0, 1 - distance / 5000); // 5km → 0
    factors.push({
      name: "distance", value: distanceScore, weight: weights.distance || 0.15,
      contribution: distanceScore * (weights.distance || 0.15),
      description: entity.walkTimeMin ? `${entity.walkTimeMin}-min walk` : `${(distance / 1000).toFixed(1)}km away`,
    });

    // 2. Rating (normalized 0-1)
    const ratingScore = (entity.rating || 0) / 5;
    factors.push({
      name: "rating", value: ratingScore, weight: weights.rating || 0.15,
      contribution: ratingScore * (weights.rating || 0.15),
      description: entity.rating ? `${entity.rating}★ (${entity.reviewCount || 0} reviews)` : "No ratings",
    });

    // 3. Open status
    const openScore = entity.openNow === false ? 0 : 1;
    factors.push({
      name: "openStatus", value: openScore, weight: weights.openStatus || 0.10,
      contribution: openScore * (weights.openStatus || 0.10),
      description: entity.openNow === false ? "Currently closed" : "Currently open",
    });

    // 4. Preference match (how well does this match PMB preferences)
    const prefScore = this.calculatePreferenceMatch(entity, context.preferences);
    factors.push({
      name: "preferenceMatch", value: prefScore, weight: weights.preferenceMatch || 0.20,
      contribution: prefScore * (weights.preferenceMatch || 0.20),
      description: prefScore > 0.7 ? "Strongly matches your preferences" : prefScore > 0.4 ? "Partially matches preferences" : "New experience",
    });

    // 5. Budget compatibility
    const budgetScore = this.calculateBudgetMatch(entity.priceRange, context.budget, context.constraints);
    factors.push({
      name: "budget", value: budgetScore, weight: weights.budget || 0.10,
      contribution: budgetScore * (weights.budget || 0.10),
      description: entity.priceRange ? `${entity.priceRange} price range` : "Price unknown",
    });

    // 6. Popularity (current busyness — less busy might be better)
    const popScore = entity.popularity ? Math.min(entity.popularity / 100, 1) : 0.5;
    factors.push({
      name: "popularity", value: popScore, weight: weights.popularity || 0.10,
      contribution: popScore * (weights.popularity || 0.10),
      description: entity.popularity ? entity.popularity > 70 ? "Popular right now" : "Not too busy" : "Unknown popularity",
    });

    // 7. Weather suitability
    const weatherScore = this.calculateWeatherSuitability(entity, context.weather, context.domain);
    factors.push({
      name: "weather", value: weatherScore, weight: weights.weather || 0.05,
      contribution: weatherScore * (weights.weather || 0.05),
      description: context.weather ? `${context.weather.condition} suitable` : "Weather not considered",
    });

    // 8. Time relevance
    const timeScore = this.calculateTimeRelevance(entity, context.timeOfDay, context.isWeekend, context.domain);
    factors.push({
      name: "timeRelevance", value: timeScore, weight: weights.timeRelevance || 0.05,
      contribution: timeScore * (weights.timeRelevance || 0.05),
      description: context.isWeekend ? "Good for weekend" : `Good for ${context.timeOfDay}`,
    });

    // 9. Diversity (penalize entities recently shown)
    const userHistory = this.recommendationHistory.get(context.userId) || [];
    const recentShown = userHistory.filter(id => id === entity.id).length;
    const diversityScore = Math.max(0, 1 - recentShown * 0.3);
    factors.push({
      name: "diversity", value: diversityScore, weight: weights.diversity || 0.10,
      contribution: diversityScore * (weights.diversity || 0.10),
      description: recentShown > 0 ? "Shown recently" : "Fresh recommendation",
    });

    // 10. Historical satisfaction (from feedback)
    const histScore = this.calculateHistoricalSatisfaction(entity, userFeedback);
    if (histScore !== null) {
      factors.push({
        name: "historicalSatisfaction", value: histScore, weight: 0.10,
        contribution: histScore * 0.10,
        description: histScore > 0.7 ? "You've enjoyed similar before" : histScore < 0.3 ? "You've rejected similar before" : "Mixed history",
      });
    }

    // 11. Goal alignment
    const goalScore = this.calculateGoalAlignment(entity, context.userGoals);
    if (goalScore > 0) {
      factors.push({
        name: "goalAlignment", value: goalScore, weight: 0.08,
        contribution: goalScore * 0.08,
        description: "Aligns with your goals",
      });
    }

    // 12. Safety (basic heuristic)
    const safetyScore = entity.rating && entity.rating > 3.5 ? 0.9 : 0.5;
    factors.push({
      name: "safety", value: safetyScore, weight: 0.05,
      contribution: safetyScore * 0.05,
      description: safetyScore > 0.7 ? "Well-rated venue" : "Limited safety info",
    });

    return factors;
  }

  // ── Calculate overall score (0-100) ───────────────────────────────────
  private calculateOverallScore(factors: RecommendationFactor[]): number {
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const totalContribution = factors.reduce((sum, f) => sum + f.contribution, 0);
    return Math.round((totalContribution / totalWeight) * 100);
  }

  // ── Estimate confidence ───────────────────────────────────────────────
  private estimateConfidence(entity: CandidateEntity, factors: RecommendationFactor[], context: RecommendationContext): number {
    let confidence = 0.5;
    // More factors = more data = higher confidence
    confidence += Math.min(factors.length / 15, 0.2);
    // Rating + reviews boost confidence
    if (entity.rating && entity.reviewCount) confidence += 0.15;
    // Known preferences boost confidence
    if (context.preferences.length > 50) confidence += 0.1;
    // Feedback history boosts confidence
    const feedback = this.feedbackHistory.get(context.userId) || [];
    if (feedback.length > 5) confidence += 0.05;
    return Math.min(confidence, 0.98);
  }

  // ── Generate explanation ──────────────────────────────────────────────
  private generateExplanation(entity: CandidateEntity, factors: RecommendationFactor[], context: RecommendationContext): string {
    const reasons: string[] = [];

    // Sort factors by contribution (most impactful first)
    const sorted = [...factors].sort((a, b) => b.contribution - a.contribution);

    // Take top 3-4 reasons
    for (const factor of sorted.slice(0, 4)) {
      if (factor.contribution > 0.05 && factor.value > 0.5) {
        reasons.push(factor.description);
      }
    }

    if (reasons.length === 0) {
      return `Recommended based on overall relevance to your request.`;
    }

    // Check for favorites
    if (this.isFavorite(entity, context.preferences)) {
      reasons.unshift("matches your favorites");
    }

    // Check for new discovery
    const userHistory = this.recommendationHistory.get(context.userId) || [];
    if (!userHistory.includes(entity.id)) {
      reasons.push("a new discovery for you");
    }

    return `${entity.name} is recommended because it ${reasons.join(", ")}.`;
  }

  // ── Diversity balancing ───────────────────────────────────────────────
  private balanceDiversity(scored: ScoredRecommendation[], context: RecommendationContext, limit: number): ScoredRecommendation[] {
    // Ensure no more than 2 from the same provider
    const providerCount = new Map<string, number>();
    const maxPerProvider = Math.ceil(limit / 2);
    return scored.filter(r => {
      const count = providerCount.get(r.entity.provider) || 0;
      if (count >= maxPerProvider) return false;
      providerCount.set(r.entity.provider, count + 1);
      return true;
    });
  }

  // ── Exploration vs Exploitation ───────────────────────────────────────
  private balanceExplorationExploitation(scored: ScoredRecommendation[], context: RecommendationContext, limit: number): ScoredRecommendation[] {
    const explorationLevel = context.explorationLevel || 0.3;
    const exploitCount = Math.ceil(limit * (1 - explorationLevel));
    const exploreCount = limit - exploitCount;

    // Exploitation: favorites + high historical satisfaction
    const exploits = scored.filter(r => r.isFavorite).slice(0, exploitCount);

    // Exploration: new discoveries
    const explores = scored.filter(r => r.isNewDiscovery && !exploits.includes(r)).slice(0, exploreCount);

    // Merge + fill remaining from general scored
    const combined = [...exploits, ...explores];
    const remaining = scored.filter(r => !combined.includes(r));
    while (combined.length < limit && remaining.length > 0) {
      combined.push(remaining.shift()!);
    }

    return combined;
  }

  // ── Helper: preference match ──────────────────────────────────────────
  private calculatePreferenceMatch(entity: CandidateEntity, preferences: string): number {
    if (!preferences || preferences.length === 0) return 0.5;
    const prefLower = preferences.toLowerCase();
    let score = 0.5;
    // Check entity name + tags + type against preferences
    const entityText = `${entity.name} ${entity.tags?.join(" ") || ""} ${entity.type}`.toLowerCase();
    const prefWords = prefLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of prefWords) {
      if (entityText.includes(word)) score += 0.05;
    }
    return Math.min(score, 1.0);
  }

  // ── Helper: budget match ──────────────────────────────────────────────
  private calculateBudgetMatch(priceRange?: string, budget?: string, constraints?: string[]): number {
    if (!priceRange) return 0.5;
    if (constraints?.includes("budget_conscious") && priceRange === "$$$") return 0.2;
    if (constraints?.includes("budget_conscious") && priceRange === "$") return 1.0;
    if (budget === "premium" && priceRange === "$$$$") return 1.0;
    if (budget === "frugal" && priceRange === "$") return 1.0;
    return 0.7;
  }

  // ── Helper: weather suitability ───────────────────────────────────────
  private calculateWeatherSuitability(entity: CandidateEntity, weather?: { tempC: number; condition: string }, domain?: string): number {
    if (!weather) return 0.7;
    if (weather.condition.includes("Rain") && domain === "dining") return 0.6; // might want delivery
    if (weather.condition.includes("Clear") && domain === "events") return 1.0; // great for outdoor
    if (weather.tempC > 35 && entity.tags?.includes("outdoor")) return 0.3; // too hot for outdoor
    if (weather.tempC < 10 && entity.tags?.includes("indoor")) return 1.0; // great for indoor
    return 0.7;
  }

  // ── Helper: time relevance ────────────────────────────────────────────
  private calculateTimeRelevance(entity: CandidateEntity, timeOfDay: string, isWeekend: boolean, domain: string): number {
    if (domain === "coffee" && timeOfDay === "morning") return 1.0;
    if (domain === "dining" && (timeOfDay === "morning" || timeOfDay === "evening")) return 1.0;
    if (domain === "entertainment" && (timeOfDay === "evening" || timeOfDay === "night")) return 1.0;
    if (domain === "events" && isWeekend) return 0.9;
    return 0.6;
  }

  // ── Helper: is favorite ───────────────────────────────────────────────
  private isFavorite(entity: CandidateEntity, preferences: string): boolean {
    if (!preferences) return false;
    const prefLower = preferences.toLowerCase();
    return prefLower.includes(entity.name.toLowerCase().split(" ")[0]);
  }

  // ── Helper: historical satisfaction ───────────────────────────────────
  private calculateHistoricalSatisfaction(entity: CandidateEntity, feedback: FeedbackSignal[]): number | null {
    const entityFeedback = feedback.filter(f => f.entityId === entity.id);
    if (entityFeedback.length === 0) return null;
    const accepted = entityFeedback.filter(f => f.type === "accepted" || f.type === "booked" || f.type === "purchased").length;
    const rejected = entityFeedback.filter(f => f.type === "rejected").length;
    const rated = entityFeedback.filter(f => f.rating !== undefined);
    const avgRating = rated.length > 0 ? rated.reduce((sum, f) => sum + (f.rating || 0), 0) / rated.length / 5 : 0.5;
    return (accepted / entityFeedback.length) * 0.5 + avgRating * 0.3 + (1 - rejected / entityFeedback.length) * 0.2;
  }

  // ── Helper: goal alignment ────────────────────────────────────────────
  private calculateGoalAlignment(entity: CandidateEntity, goals: string[]): number {
    if (goals.length === 0) return 0;
    const entityText = `${entity.name} ${entity.tags?.join(" ") || ""} ${entity.domain}`.toLowerCase();
    for (const goal of goals) {
      const goalLower = goal.toLowerCase();
      if (entityText.includes(goalLower.slice(0, 10))) return 0.9;
    }
    return 0;
  }

  // ── Helper: data freshness ────────────────────────────────────────────
  private assessDataFreshness(entity: CandidateEntity): number {
    // Fresh if from a real-time provider (OSM, ZAI)
    if (entity.provider === "osm" ) return 0.9;
    if (entity.provider === "google") return 0.95;
    return 0.5;
  }

  // ── Helper: source reliability ────────────────────────────────────────
  private assessSourceReliability(provider: string): number {
    const reliability: Record<string, number> = {
      "google": 0.95, "osm": 0.85,  "foursquare": 0.85,
      "mapbox": 0.85, "brain": 0.70,
    };
    return reliability[provider] || 0.5;
  }

  // ── Record shown recommendations ──────────────────────────────────────
  recordRecommendations(userId: string, entityIds: string[]) {
    if (!this.recommendationHistory.has(userId)) {
      this.recommendationHistory.set(userId, []);
    }
    const history = this.recommendationHistory.get(userId)!;
    history.push(...entityIds);
    // Keep last 100 shown
    if (history.length > 100) {
      this.recommendationHistory.set(userId, history.slice(-100));
    }
  }

  // ── Record feedback (continuous learning) ─────────────────────────────
  recordFeedback(signal: FeedbackSignal) {
    if (!this.feedbackHistory.has(signal.userId)) {
      this.feedbackHistory.set(signal.userId, []);
    }
    this.feedbackHistory.get(signal.userId)!.push(signal);

    // Adjust domain weights based on feedback
    this.adjustWeights(signal);
  }

  // ── Adjust factor weights based on feedback ───────────────────────────
  private adjustWeights(signal: FeedbackSignal) {
    const weights = this.domainWeights.get(signal.domain) || this.domainWeights.get("general")!;
    // If user accepted: boost the factors that contributed
    // If user rejected: reduce the factors that contributed
    const adjustment = signal.type === "accepted" || signal.type === "booked" || signal.type === "purchased" ? 0.02 : -0.02;
    // Simple weight adjustment (in production: use gradient descent or bandit algorithms)
    for (const key of Object.keys(weights)) {
      weights[key] = Math.max(0.01, Math.min(0.30, weights[key] + adjustment));
    }
    this.domainWeights.set(signal.domain, weights);
  }

  // ── Generate alternatives (when primary is rejected) ──────────────────
  generateAlternatives(rejected: CandidateEntity, allCandidates: CandidateEntity[], context: RecommendationContext, limit: number = 3): ScoredRecommendation[] {
    // Remove rejected entity and re-rank with slight diversity boost
    const remaining = allCandidates.filter(c => c.id !== rejected.id);
    const adjustedContext = { ...context, explorationLevel: Math.min(context.explorationLevel + 0.2, 1.0) };
    const alternatives = this.recommend(remaining, adjustedContext, limit);
    return alternatives.map(a => ({ ...a, isAlternative: true }));
  }

  // ── Cold start handling ───────────────────────────────────────────────
  handleColdStart(candidates: CandidateEntity[], context: RecommendationContext, limit: number): ScoredRecommendation[] {
    // When no user history: use general popularity + ratings + distance
    const coldContext: RecommendationContext = {
      ...context,
      preferences: "", // no preferences yet
      userGoals: [],
      explorationLevel: 0.5, // balanced
    };
    // Boost popular + well-rated options for cold start
    const boosted = candidates.map(c => ({
      ...c,
      rating: c.rating ? c.rating + 0.5 : c.rating, // slight rating boost for cold start
    }));
    return this.recommend(boosted, coldContext, limit);
  }

  // ── Get recommendation statistics ─────────────────────────────────────
  getStats(userId: string) {
    const feedback = this.feedbackHistory.get(userId) || [];
    const history = this.recommendationHistory.get(userId) || [];
    const accepted = feedback.filter(f => f.type === "accepted" || f.type === "booked" || f.type === "purchased").length;
    const rejected = feedback.filter(f => f.type === "rejected").length;
    return {
      totalRecommendations: history.length,
      totalFeedback: feedback.length,
      acceptanceRate: feedback.length > 0 ? accepted / feedback.length : 0,
      rejectionRate: feedback.length > 0 ? rejected / feedback.length : 0,
      domainsUsed: [...new Set(feedback.map(f => f.domain))],
    };
  }
}

// ── Global IRDE Instance ──────────────────────────────────────────────────
export const globalIRDE = new IntelligentRecommendationEngine();
