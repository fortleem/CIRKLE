/**
 * CIRKLE Brain AI — UOB Goal Decomposition Engine
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain — Pipeline Stages 1-2
 *
 * Goal Analysis + Goal Decomposition.
 *
 * UOB does NOT re-derive intent (that's CRIE's job). It consumes CRIE's
 * intent + reasoning from the Shared Context and decomposes the user's
 * goal into sub-goals that map to capability categories.
 *
 * Supports:
 *   - Single-goal planning
 *   - Multi-goal planning (when CRIE detects primary + secondary intents,
 *     or the user's request contains "and")
 *   - Hierarchical goals (a goal with sub-goals)
 *   - Dependent goals (one goal depends on another's output)
 *   - Optional goals (enhancements that don't block the plan)
 *   - Goal prioritization (priority field)
 * ============================================================================
 */

import type { SharedContext } from "@/lib/cognitive/shared-context";
import type { Goal, SubGoal, GoalAnalysisResult } from "./types";

// ── Intent → sub-goal templates ──────────────────────────────────────────
//
// These templates map CRIE intent types to the capability categories that
// typically address them. They are NOT hardcoded modules — they are category
// hints that the Capability Discovery engine uses to query the registry.

interface SubGoalTemplate {
  statement: string;
  category: string;
  required: boolean;
}

const INTENT_TEMPLATES: Record<string, SubGoalTemplate[]> = {
  plan: [
    { statement: "Check prerequisites (visa, documents)", category: "government", required: true },
    { statement: "Search transport options", category: "travel", required: true },
    { statement: "Search accommodation options", category: "travel", required: false },
    { statement: "Get environmental context (weather)", category: "utilities", required: false },
    { statement: "Generate detailed plan/itinerary", category: "ai", required: true },
    { statement: "Set up financial preparations (currency exchange)", category: "payments", required: false },
    { statement: "Research destination", category: "news", required: false },
  ],
  book: [
    { statement: "Verify prerequisites", category: "government", required: true },
    { statement: "Search available options", category: "travel", required: true },
    { statement: "Process booking", category: "travel", required: true },
    { statement: "Send confirmation notification", category: "communication", required: false },
  ],
  recommend: [
    { statement: "Discover candidates", category: "maps", required: true },
    { statement: "Get environmental context", category: "utilities", required: false },
    { statement: "Generate AI-powered recommendations", category: "ai", required: true },
  ],
  find: [
    { statement: "Search nearby entities", category: "maps", required: true },
    { statement: "Get environmental context", category: "utilities", required: false },
    { statement: "Generate recommendations", category: "ai", required: false },
  ],
  compare: [
    { statement: "Gather options to compare", category: "maps", required: true },
    { statement: "Analyze options", category: "ai", required: true },
  ],
  communicate: [
    { statement: "Compose message", category: "communication", required: true },
    { statement: "Send message", category: "communication", required: true },
    { statement: "Generate smart reply suggestions", category: "ai", required: false },
  ],
  create: [
    { statement: "Create content/agreement", category: "social", required: true },
    { statement: "Analyze fairness/quality (if agreement)", category: "business", required: false },
    { statement: "Notify stakeholders", category: "communication", required: false },
  ],
  analyze: [
    { statement: "Gather data to analyze", category: "news", required: true },
    { statement: "Run AI analysis", category: "ai", required: true },
    { statement: "Summarize findings", category: "communication", required: false },
  ],
  track: [
    { statement: "Retrieve current state", category: "payments", required: true },
    { statement: "Generate tracking summary", category: "ai", required: false },
  ],
  navigate: [
    { statement: "Search destination", category: "maps", required: true },
    { statement: "Get route context", category: "utilities", required: false },
  ],
  answer: [
    { statement: "Look up information", category: "news", required: true },
    { statement: "Cross-evaluate with AI", category: "ai", required: false },
  ],
  learn: [
    { statement: "Find learning resources", category: "news", required: true },
    { statement: "Get AI explanation", category: "ai", required: true },
    { statement: "Summarize for comprehension", category: "communication", required: false },
  ],
  remind: [
    { statement: "Create reminder", category: "communication", required: true },
  ],
  automate: [
    { statement: "Plan workflow", category: "ai", required: true },
    { statement: "Execute workflow steps", category: "ai", required: true },
  ],
  clarify: [
    { statement: "Request clarification from user", category: "communication", required: true },
  ],
};

// ── Multi-goal detection ─────────────────────────────────────────────────

/**
 * Detect multiple goals in a single request. CRIE provides primary + secondary
 * intents; we also check for explicit "and" conjunctions in the request.
 */
function detectMultiGoal(context: SharedContext): boolean {
  const reasoning = context.reasoning;
  if (!reasoning) return false;
  // CRIE's clarifications field carries secondary intents when present.
  // But a secondary intent that's the SAME type as the primary is just
  // reinforcement, not a second goal. Only a DIFFERENT type signals multi-goal.
  if (reasoning.clarifications && reasoning.clarifications.length > 0) {
    const secondary = reasoning.clarifications[0];
    if (secondary !== reasoning.intentType && secondary !== reasoning.intent) {
      return true;
    }
  }
  // Check for "and" in the original request (rough heuristic).
  const request = context.request?.originalRequest || "";
  return /\band\b/i.test(request) && request.split(/\band\b/i).length > 2;
}

// ── Goal Decomposition Engine ────────────────────────────────────────────

export class GoalDecompositionEngine {
  /**
   * Analyze the Shared Context and decompose the user's goal into goals
   * and sub-goals.
   *
   * UOB does NOT re-derive intent. It reads CRIE's `reasoning.intent`
   * and `reasoning.intentType` from the Shared Context.
   */
  analyze(context: SharedContext, explicitGoal?: string): GoalAnalysisResult {
    const reasoning = context.reasoning;
    const intentType = reasoning?.intentType || reasoning?.intent || "answer";
    const requestText = explicitGoal || context.request?.originalRequest || "";
    const isMultiGoal = detectMultiGoal(context);

    // ── Build the primary goal ──────────────────────────────────────────
    const goals: Goal[] = [];
    const subGoals: SubGoal[] = [];

    const primaryGoal: Goal = {
      id: "goal-1",
      statement: explicitGoal || requestText.slice(0, 200) || reasoning?.intent || "(unnamed goal)",
      intentType: String(intentType),
      priority: 1,
      isOptional: false,
      dependsOn: [],
      sourceRequest: requestText,
    };
    goals.push(primaryGoal);

    // ── Decompose into sub-goals using intent template ─────────────────
    const templates = INTENT_TEMPLATES[intentType] || INTENT_TEMPLATES.answer;
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      subGoals.push({
        id: `sg-${i + 1}`,
        parentId: primaryGoal.id,
        statement: t.statement,
        category: t.category,
        required: t.required,
        constraints: reasoning?.constraints || [],
      });
    }

    // ── Multi-goal: add a secondary goal if detected ───────────────────
    if (isMultiGoal && reasoning?.clarifications && reasoning.clarifications.length > 0) {
      const secondaryIntent = reasoning.clarifications[0];
      const secondaryGoal: Goal = {
        id: "goal-2",
        statement: `Secondary goal: ${secondaryIntent}`,
        intentType: secondaryIntent,
        priority: 2,
        isOptional: false,
        dependsOn: [], // independent by default
        sourceRequest: requestText,
      };
      goals.push(secondaryGoal);

      const secondaryTemplates = INTENT_TEMPLATES[secondaryIntent] || INTENT_TEMPLATES.answer;
      for (let i = 0; i < secondaryTemplates.length; i++) {
        const t = secondaryTemplates[i];
        subGoals.push({
          id: `sg-${templates.length + i + 1}`,
          parentId: secondaryGoal.id,
          statement: t.statement,
          category: t.category,
          required: t.required,
          constraints: reasoning?.constraints || [],
        });
      }
    }

    return { goals, subGoals, isMultiGoal };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalGoalDecompositionEngine = new GoalDecompositionEngine();
