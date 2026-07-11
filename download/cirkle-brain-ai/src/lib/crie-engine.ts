/**
 * Cirkle Brain AI — Context & Reasoning Intelligence Engine (CRIE)
 *
 * The executive reasoning core of Cirkle Brain AI.
 *
 * Architecture:
 * - GCIE understands the WORLD (places, events, traffic, weather)
 * - PMB understands the USER (preferences, memories, habits, goals)
 * - CRIE combines their outputs and determines the best response
 *
 * CRIE owns:
 * - Intent understanding (what is the user actually trying to accomplish?)
 * - Context fusion (merge conversation + memories + world context)
 * - Multi-step reasoning (deductive, inductive, causal, temporal, spatial)
 * - Decision making (what to do next, which modules to consult)
 * - Prioritization (immediate vs long-term goals)
 * - Conflict resolution (preferred restaurant closed → suggest alternative)
 * - Clarification decisions (only ask when essential info is missing)
 * - Confidence estimation (how sure is the AI?)
 * - Explanation generation (why this recommendation?)
 * - Orchestration (request data from GCIE/PMB/other modules)
 *
 * CRIE does NOT own:
 * - Geo search, maps, nearby discovery (→ GCIE)
 * - Personal memory storage (→ PMB)
 * - Business rankings (→ Recommendation module using CRIE's context)
 *
 * Privacy:
 * - Respects all permission boundaries
 * - Never accesses data without authorization
 * - Uses minimum information necessary
 * - Never creates permanent memories directly (PMB decides)
 * - Never exposes internal reasoning traces to users
 */

// ── Intent Understanding ─────────────────────────────────────────────────
export type IntentType =
  | "find"           // find a place, restaurant, event
  | "book"           // book a flight, hotel, restaurant
  | "plan"           // plan a trip, event, schedule
  | "recommend"      // recommend something based on preferences
  | "remind"         // set a reminder
  | "answer"         // answer a question
  | "navigate"       // get directions
  | "compare"        // compare options
  | "track"          // track a goal, expense, habit
  | "create"         // create content, agreement, event
  | "communicate"    // send message, share, post
  | "learn"          // learn something, get tutorial
  | "analyze"        // analyze spending, patterns, data
  | "automate"       // set up automation
  | "clarify";       // user is asking for clarification

export type UrgencyLevel = "immediate" | "today" | "this_week" | "flexible";

export interface Intent {
  primary: IntentType;
  secondary?: IntentType;
  rawQuery: string;
  subject: string;              // what the user is asking about
  constraints: string[];        // detected constraints (budget, time, distance)
  urgency: UrgencyLevel;
  expectedOutput: "answer" | "list" | "recommendation" | "action" | "explanation";
  requiredModules: ("gcie" | "pmb" | "brain" | "calendar" | "weather")[];
  confidence: number;           // 0-1 how confident CRIE is about the intent
  hiddenConstraints: string[];  // inferred constraints (e.g., "user is at work → limited time")
}

// ── Unified Context Object ───────────────────────────────────────────────
export interface UnifiedContext {
  // Conversation context
  currentQuery: string;
  conversationHistory: { role: "user" | "ai"; content: string }[];

  // Personal context (from PMB)
  userPreferences: string;      // PMB personalization context
  userGoals: string[];
  userRoutine: string;
  userBudget?: string;
  userTransportPreference?: string;

  // World context (from GCIE)
  location?: { lat: number; lng: number; city: string; country: string; neighborhood?: string };
  weather?: { tempC: number; condition: string; icon: string };
  nearbyPlaces?: { type: string; name: string; distance: number }[];
  events?: { title: string; date: string; venue: string }[];

  // Temporal context
  currentTime: string;
  dayOfWeek: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  isWeekend: boolean;

  // Device context
  deviceType?: "mobile" | "desktop" | "tablet";

  // Reasoning state
  reasoningGraph?: ReasoningNode[];
}

// ── Reasoning Graph ──────────────────────────────────────────────────────
export interface ReasoningNode {
  id: string;
  type: "fact" | "inference" | "goal" | "constraint" | "action" | "question";
  content: string;
  confidence: number;
  sources: string[];            // which modules provided this
  children?: string[];
}

// ── Decision ─────────────────────────────────────────────────────────────
export type DecisionType =
  | "answer_directly"           // CRIE has enough info to answer
  | "consult_module"            // need to query GCIE/PMB/etc.
  | "request_clarification"     // essential info missing
  | "generate_recommendation"   // prepare recommendation context
  | "suggest_automation"        // suggest an automation
  | "multi_step_plan"           // create a multi-step plan
  | "no_action";                // nothing to do

export interface Decision {
  type: DecisionType;
  reasoning: string;            // internal reasoning (not shown to user)
  explanation: string;          // user-facing explanation
  confidence: number;           // 0-1
  missingInfo?: string[];       // what's missing (for clarification)
  modulesConsulted: string[];
  actions?: { module: string; request: string; result?: string }[];
  response?: string;            // the final response to the user
  memoryCandidate?: { type: string; title: string; summary: string; source: string }; // suggested for PMB
}

// ── CRIE Engine ──────────────────────────────────────────────────────────
export class ContextReasoningEngine {
  /**
   * Cognitive Workflow:
   * 1. Parse the request
   * 2. Determine intent
   * 3. Retrieve relevant memories from PMB
   * 4. Retrieve relevant world context from GCIE
   * 5. Merge all context
   * 6. Identify constraints and opportunities
   * 7. Evaluate candidate solutions
   * 8. Select the best option
   * 9. Generate an explanation
   * 10. Produce the response
   * 11. Identify memory candidate (PMB decides whether to store)
   */
  async reason(opts: {
    query: string;
    userId: string;
    country: string;
    city?: string;
    conversationHistory?: { role: "user" | "ai"; content: string }[];
  }): Promise<Decision> {
    const { query, userId, country, city, conversationHistory = [] } = opts;

    // Step 1-2: Parse + Determine intent
    const intent = this.understandIntent(query, conversationHistory);

    // Step 3-4: Retrieve context from PMB + GCIE
    const context = await this.fuseContext({
      query, userId, country, city, conversationHistory, intent,
    });

    // Step 5-6: Identify constraints + opportunities
    const constraints = this.identifyConstraints(intent, context);
    const opportunities = this.identifyOpportunities(intent, context);

    // Step 7: Evaluate candidate solutions
    const candidates = this.evaluateSolutions(intent, context, constraints, opportunities);

    // Step 8: Select best option
    const selected = this.selectBest(candidates, intent, context);

    // Step 9: Generate explanation
    const explanation = this.generateExplanation(selected, intent, context, constraints);

    // Step 10: Produce response
    const response = this.produceResponse(selected, intent, context, explanation);

    // Step 11: Identify memory candidate
    const memoryCandidate = this.identifyMemoryCandidate(intent, context, selected);

    // Confidence estimation
    const confidence = this.estimateConfidence(intent, context, selected);

    return {
      type: selected.type,
      reasoning: selected.reasoning,
      explanation,
      confidence,
      missingInfo: selected.missingInfo,
      modulesConsulted: selected.modulesConsulted,
      actions: selected.actions,
      response,
      memoryCandidate,
    };
  }

  // ── Intent Understanding ──────────────────────────────────────────────
  understandIntent(query: string, history: { role: string; content: string }[]): Intent {
    const lower = query.toLowerCase();
    const intentMap: Record<string, IntentType> = {
      "find": "find", "where": "find", "search": "find", "near": "find", "nearby": "find",
      "book": "book", "reserve": "book", "schedule": "book",
      "plan": "plan", "organize": "plan", "trip": "plan", "itinerary": "plan",
      "recommend": "recommend", "suggest": "recommend", "best": "recommend", "should i": "recommend",
      "remind": "remind", "don't forget": "remind", "remember to": "remind",
      "what": "answer", "how": "answer", "why": "answer", "when": "answer", "who": "answer",
      "directions": "navigate", "route": "navigate", "get to": "navigate",
      "compare": "compare", "vs": "compare", "versus": "compare", "or": "compare",
      "track": "track", "monitor": "track", "budget": "track",
      "create": "create", "make": "create", "write": "create", "draft": "create",
      "send": "communicate", "share": "communicate", "post": "communicate", "message": "communicate",
      "teach": "learn", "explain": "learn", "tutorial": "learn", "how to": "learn",
      "analyze": "analyze", "review": "analyze", "summary": "analyze",
      "automate": "automate", "workflow": "automate",
    };

    let primary: IntentType = "answer";
    let secondary: IntentType | undefined;
    let confidence = 0.5;

    for (const [keyword, type] of Object.entries(intentMap)) {
      if (lower.includes(keyword)) {
        if (primary === "answer") {
          primary = type;
          confidence = 0.7;
        } else if (!secondary) {
          secondary = type;
        }
      }
    }

    // Boost confidence based on context
    if (history.length > 0) confidence += 0.1;
    if (lower.length > 20) confidence += 0.1;
    confidence = Math.min(confidence, 0.95);

    // Determine urgency
    let urgency: UrgencyLevel = "flexible";
    if (lower.includes("now") || lower.includes("urgent") || lower.includes("immediately")) urgency = "immediate";
    else if (lower.includes("today") || lower.includes("tonight")) urgency = "today";
    else if (lower.includes("this week") || lower.includes("tomorrow")) urgency = "this_week";

    // Determine expected output
    let expectedOutput: Intent["expectedOutput"] = "answer";
    if (primary === "find" || primary === "compare") expectedOutput = "list";
    if (primary === "recommend") expectedOutput = "recommendation";
    if (primary === "book" || primary === "create" || primary === "communicate") expectedOutput = "action";
    if (primary === "learn" || primary === "analyze") expectedOutput = "explanation";

    // Determine required modules
    const requiredModules: Intent["requiredModules"] = ["brain"];
    if (primary === "find" || primary === "navigate") requiredModules.push("gcie");
    if (primary === "recommend" || primary === "plan") requiredModules.push("pmb", "gcie");
    if (lower.includes("weather") || lower.includes("rain") || lower.includes("sunny")) requiredModules.push("weather");

    // Identify constraints
    const constraints: string[] = [];
    if (lower.includes("cheap") || lower.includes("budget")) constraints.push("budget_conscious");
    if (lower.includes("near") || lower.includes("close")) constraints.push("nearby_only");
    if (lower.includes("fast") || lower.includes("quick")) constraints.push("time_limited");
    if (lower.includes("walk")) constraints.push("walking_distance");
    if (lower.includes("halal") || lower.includes("vegetarian") || lower.includes("vegan")) constraints.push("dietary_restriction");

    // Hidden constraints (inferred from time/context)
    const hiddenConstraints: string[] = [];
    const hour = new Date().getHours();
    if (hour >= 11 && hour <= 14) hiddenConstraints.push("lunch_time");
    if (hour >= 18 && hour <= 22) hiddenConstraints.push("dinner_time");
    if (hour >= 6 && hour <= 10) hiddenConstraints.push("morning_routine");
    const isWeekend = [0, 6].includes(new Date().getDay());
    if (isWeekend) hiddenConstraints.push("weekend_behavior");

    return {
      primary, secondary, rawQuery: query,
      subject: query.slice(0, 100),
      constraints, urgency, expectedOutput, requiredModules,
      confidence, hiddenConstraints,
    };
  }

  // ── Context Fusion ────────────────────────────────────────────────────
  async fuseContext(opts: {
    query: string;
    userId: string;
    country: string;
    city?: string;
    conversationHistory: { role: "user" | "ai"; content: string }[];
    intent: Intent;
  }): Promise<UnifiedContext> {
    const { query, userId, country, city, conversationHistory, intent } = opts;
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = [0, 6].includes(now.getDay());

    const context: UnifiedContext = {
      currentQuery: query,
      conversationHistory,
      userPreferences: "",
      userGoals: [],
      userRoutine: "",
      currentTime: now.toISOString(),
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
      timeOfDay: hour < 6 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night",
      isWeekend,
    };

    // Retrieve from PMB (if needed)
    if (intent.requiredModules.includes("pmb")) {
      try {
        const { globalPMB } = await import("@/lib/personal-memory-brain");
        context.userPreferences = globalPMB.getPersonalizationContext(userId);

        // Retrieve relevant memories
        const memories = globalPMB.retrieve({
          userUuid: userId,
          intent: intent.subject,
          limit: 5,
        });
        if (memories.length > 0) {
          const goals = globalPMB.getAll(userId, "goal");
          context.userGoals = goals.map(g => g.summary);
          const routine = globalPMB.getAll(userId, "routine");
          if (routine.length > 0) context.userRoutine = routine[0].summary;
        }
      } catch { /* PMB optional */ }
    }

    // Retrieve from GCIE (if needed)
    if (intent.requiredModules.includes("gcie")) {
      try {
        const { globalProviderRegistry } = await import("@/lib/location-intelligence");
        const events = await globalProviderRegistry.searchAllEvents({
          city: city || "", country, limit: 3,
        });
        if (events.length > 0) {
          context.events = events.map(e => ({
            title: e.title, date: e.startDate, venue: e.venue,
          }));
        }
      } catch { /* GCIE optional */ }
    }

    // Retrieve weather (if needed)
    if (intent.requiredModules.includes("weather")) {
      try {
        const { getWeather } = await import("@/lib/ai");
        const weather = await getWeather(city || "Cairo").catch(() => null);
        if (weather) {
          context.weather = { tempC: weather.tempC, condition: weather.condition, icon: weather.icon };
        }
      } catch { /* weather optional */ }
    }

    return context;
  }

  // ── Constraint Identification ─────────────────────────────────────────
  identifyConstraints(intent: Intent, context: UnifiedContext): string[] {
    const constraints = [...intent.constraints, ...intent.hiddenConstraints];

    // Add context-based constraints
    if (context.timeOfDay === "night") constraints.push("late_night_limited_options");
    if (context.isWeekend) constraints.push("weekend_schedule");
    if (context.weather && context.weather.condition.includes("Rain")) constraints.push("indoor_preferred");
    if (context.weather && context.weather.tempC > 35) constraints.push("ac_preferred");

    return [...new Set(constraints)]; // deduplicate
  }

  // ── Opportunity Identification ────────────────────────────────────────
  identifyOpportunities(intent: Intent, context: UnifiedContext): string[] {
    const opportunities: string[] = [];

    if (context.events && context.events.length > 0) {
      opportunities.push("events_happening_nearby");
    }
    if (context.isWeekend) {
      opportunities.push("leisure_time_available");
    }
    if (context.timeOfDay === "morning") {
      opportunities.push("breakfast_brunch_options");
    }
    if (context.weather && context.weather.condition.includes("Clear")) {
      opportunities.push("outdoor_activities_favorable");
    }

    return opportunities;
  }

  // ── Solution Evaluation ───────────────────────────────────────────────
  evaluateSolutions(
    intent: Intent,
    context: UnifiedContext,
    constraints: string[],
    opportunities: string[],
  ): Decision[] {
    const candidates: Decision[] = [];

    // Can we answer directly?
    if (intent.confidence > 0.8 && intent.requiredModules.length === 1) {
      candidates.push({
        type: "answer_directly",
        reasoning: "High confidence, no external modules needed",
        explanation: "",
        confidence: intent.confidence,
        modulesConsulted: ["brain"],
      });
    }

    // Do we need to consult modules?
    if (intent.requiredModules.includes("gcie") || intent.requiredModules.includes("pmb")) {
      candidates.push({
        type: "consult_module",
        reasoning: `Need data from: ${intent.requiredModules.join(", ")}`,
        explanation: "",
        confidence: 0.7,
        modulesConsulted: intent.requiredModules,
        actions: intent.requiredModules.map(m => ({
          module: m,
          request: `${m}.search(${intent.subject})`,
        })),
      });
    }

    // Should we generate a recommendation?
    if (intent.primary === "recommend" || intent.primary === "find") {
      candidates.push({
        type: "generate_recommendation",
        reasoning: "User wants a recommendation — prepare context with preferences + constraints",
        explanation: "",
        confidence: 0.75,
        modulesConsulted: ["pmb", "gcie", "brain"],
        actions: [
          { module: "pmb", request: "get_preferences" },
          { module: "gcie", request: `search(${intent.subject})` },
          { module: "brain", request: "rank_and_explain" },
        ],
      });
    }

    // Is essential info missing?
    if (intent.confidence < 0.5) {
      candidates.push({
        type: "request_clarification",
        reasoning: "Low confidence — essential information missing",
        explanation: "",
        confidence: 0.3,
        modulesConsulted: [],
        missingInfo: ["What specifically are you looking for?"],
      });
    }

    // Is this a multi-step plan?
    if (intent.primary === "plan" || intent.primary === "book") {
      candidates.push({
        type: "multi_step_plan",
        reasoning: "Complex request requires multi-step planning",
        explanation: "",
        confidence: 0.65,
        modulesConsulted: ["pmb", "gcie", "brain"],
        actions: [
          { module: "pmb", request: "get_goals_and_preferences" },
          { module: "gcie", request: "search_options" },
          { module: "brain", request: "create_plan" },
        ],
      });
    }

    return candidates;
  }

  // ── Select Best Solution ──────────────────────────────────────────────
  selectBest(candidates: Decision[], intent: Intent, context: UnifiedContext): Decision {
    if (candidates.length === 0) {
      return {
        type: "no_action",
        reasoning: "No viable candidates",
        explanation: "I'm not sure what you need. Could you rephrase?",
        confidence: 0.2,
        modulesConsulted: [],
      };
    }

    // Prefer: answer_directly > consult_module > generate_recommendation > multi_step_plan > request_clarification
    const priority: Record<DecisionType, number> = {
      answer_directly: 5, consult_module: 4, generate_recommendation: 4,
      multi_step_plan: 3, suggest_automation: 2, request_clarification: 1, no_action: 0,
    };

    return candidates.sort((a, b) =>
      (priority[b.type] * b.confidence) - (priority[a.type] * a.confidence)
    )[0];
  }

  // ── Explanation Generation ────────────────────────────────────────────
  generateExplanation(decision: Decision, intent: Intent, context: UnifiedContext, constraints: string[]): string {
    const reasons: string[] = [];

    if (context.userPreferences) {
      const prefMatch = context.userPreferences.slice(0, 100);
      reasons.push(`based on your preferences (${prefMatch})`);
    }
    if (context.weather) {
      reasons.push(`considering the weather (${context.weather.tempC}°C, ${context.weather.condition})`);
    }
    if (context.timeOfDay === "morning") reasons.push("for your morning routine");
    if (context.timeOfDay === "evening") reasons.push("for your evening plans");
    if (context.isWeekend) reasons.push("for your weekend");
    if (constraints.includes("budget_conscious")) reasons.push("within your budget");
    if (constraints.includes("nearby_only")) reasons.push("close to your location");
    if (constraints.includes("walking_distance")) reasons.push("within walking distance");
    if (context.events && context.events.length > 0) reasons.push(`${context.events.length} events happening nearby`);
    if (intent.confidence > 0.8) reasons.push("high confidence in this recommendation");

    if (reasons.length === 0) return "Based on your current context and available information.";
    return `This recommendation is ${reasons.join(", ")}.`;
  }

  // ── Response Production ───────────────────────────────────────────────
  produceResponse(decision: Decision, intent: Intent, context: UnifiedContext, explanation: string): string {
    switch (decision.type) {
      case "answer_directly":
        return `Based on what I know: ${intent.subject}. ${explanation}`;
      case "consult_module":
        return `Let me find that for you. ${explanation}`;
      case "generate_recommendation":
        return `Here's my recommendation. ${explanation}`;
      case "request_clarification":
        return `I want to help, but I need a bit more info: ${decision.missingInfo?.join("; ") || "Could you be more specific?"}`;
      case "multi_step_plan":
        return `Let me plan this out for you. ${explanation}`;
      case "suggest_automation":
        return `I can automate this for you. ${explanation}`;
      default:
        return `I'm here to help. ${explanation}`;
    }
  }

  // ── Memory Candidate Detection ───────────────────────────────────────
  identifyMemoryCandidate(intent: Intent, context: UnifiedContext, decision: Decision): Decision["memoryCandidate"] {
    // Only suggest memories for explicit user statements (not questions)
    if (intent.primary === "answer" || intent.primary === "clarify") return undefined;

    // Check if the user stated a preference
    const lower = intent.rawQuery.toLowerCase();
    if (lower.includes("i like") || lower.includes("i love") || lower.includes("i prefer") || lower.includes("my favorite")) {
      return {
        type: "preference",
        title: intent.subject.slice(0, 60),
        summary: intent.rawQuery.slice(0, 200),
        source: "conversation",
      };
    }

    // Check if the user stated a goal
    if (lower.includes("i want to") || lower.includes("i need to") || lower.includes("my goal is")) {
      return {
        type: "goal",
        title: intent.subject.slice(0, 60),
        summary: intent.rawQuery.slice(0, 200),
        source: "conversation",
      };
    }

    return undefined;
  }

  // ── Confidence Estimation ────────────────────────────────────────────
  estimateConfidence(intent: Intent, context: UnifiedContext, decision: Decision): number {
    let confidence = intent.confidence * 0.4;  // intent confidence

    // Data completeness
    if (context.userPreferences) confidence += 0.15;
    if (context.weather) confidence += 0.1;
    if (context.events && context.events.length > 0) confidence += 0.1;
    if (context.conversationHistory.length > 0) confidence += 0.1;

    // Decision confidence
    confidence += decision.confidence * 0.15;

    return Math.min(confidence, 0.99);
  }

  // ── Conflict Resolution ───────────────────────────────────────────────
  resolveConflict(scenario: string, context: UnifiedContext): { resolution: string; alternative: string; explanation: string } {
    const resolutions: Record<string, { resolution: string; alternative: string; explanation: string }> = {
      "restaurant_closed": {
        resolution: "Preferred restaurant is closed",
        alternative: "Suggesting the next best open restaurant that matches your cuisine preference",
        explanation: "Your favorite restaurant is currently closed. I found a similar option that's open now and matches your taste preferences.",
      },
      "heavy_traffic": {
        resolution: "Traffic is unusually heavy on the preferred route",
        alternative: "Suggesting an alternative route or later departure time",
        explanation: "Traffic is heavier than usual. Consider leaving 15 minutes later or taking an alternative route.",
      },
      "weather_disruption": {
        resolution: "Weather may disrupt outdoor plans",
        alternative: "Suggesting indoor alternatives",
        explanation: "The weather forecast suggests rain. I recommend indoor alternatives for your plans.",
      },
      "budget_constraint": {
        resolution: "Option exceeds usual budget",
        alternative: "Suggesting budget-friendly alternatives",
        explanation: "This option is above your usual spending range. Here are some alternatives that fit your budget better.",
      },
      "calendar_conflict": {
        resolution: "Calendar conflict detected",
        alternative: "Suggesting the next available time slot",
        explanation: "You have another appointment at that time. Here's the next available slot that works with your schedule.",
      },
    };

    return resolutions[scenario] || {
      resolution: "Conflict detected",
      alternative: "Suggesting the best available option",
      explanation: "There's a constraint that affects your request. I've found the best alternative given the situation.",
    };
  }

  // ── Clarification Intelligence ────────────────────────────────────────
  shouldClarify(intent: Intent, context: UnifiedContext): { shouldAsk: boolean; question?: string } {
    // Only ask if essential info is truly missing
    if (intent.confidence >= 0.7) return { shouldAsk: false };

    // If we have enough context from PMB, don't ask
    if (context.userPreferences && context.userPreferences.length > 50) return { shouldAsk: false };

    // If it's a simple question, don't ask
    if (intent.primary === "answer") return { shouldAsk: false };

    // Ask only for what's essential
    if (intent.primary === "find" && intent.subject.length < 10) {
      return { shouldAsk: true, question: "What specifically are you looking for?" };
    }
    if (intent.primary === "book" && !context.userPreferences) {
      return { shouldAsk: true, question: "What are your preferences for this booking?" };
    }

    return { shouldAsk: false };
  }
}

// ── Global CRIE Instance ──────────────────────────────────────────────────
export const globalCRIE = new ContextReasoningEngine();
