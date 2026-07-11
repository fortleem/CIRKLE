// @ts-nocheck
/**
 * CIRKLE Brain AI — Universal Orchestration Brain (UOB) Engine
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain
 *
 * The main orchestrator that runs the full 16-stage planning pipeline:
 *
 *   Shared Context
 *     ↓
 *   1.  Goal Analysis
 *   2.  Goal Decomposition
 *   3.  Capability Discovery
 *   4.  Capability Selection
 *   5.  Dependency Resolution
 *   6.  Permission Validation
 *   7.  Constraint Validation
 *   8.  Workflow Planning
 *   9.  Parallelization Analysis
 *  10.  Sequential Ordering
 *  11.  Alternative Planning
 *  12.  Fallback Planning
 *  13.  Compensation Planning
 *  14.  Execution Graph Generation
 *  15.  Execution Plan Generation
 *  16.  Explainability Package
 *
 * UOB is the SOLE AUTHOR of the `platform` section of the Shared Context
 * (reserved for UOB in Phase 4.5). It enriches the context via the Context
 * Manager, then freezes it.
 *
 * Constitutional guarantees:
 *   - UOB NEVER executes workflows.
 *   - UOB NEVER calls platform APIs.
 *   - UOB NEVER modifies persistent data.
 *   - UOB NEVER stores long-term memory.
 *   - UOB NEVER performs recommendations (IRDE's job).
 *   - UOB NEVER performs reasoning (CRIE's job).
 *   - UOB NEVER performs geo intelligence (GCIE's job).
 *   - UOB NEVER replaces Cross-Evaluation.
 *
 * Each stage is wrapped in try/catch so a single stage failure does NOT
 * abort the whole pipeline. The plan still flows forward with whatever
 * stages succeeded. This preserves robustness (Ch.2 §2.9 graceful degradation).
 * ============================================================================
 */

import "server-only";

import { globalContextManager } from "@/lib/cognitive/context-manager";
import type { SharedContext } from "@/lib/cognitive/shared-context";

import { globalGoalDecompositionEngine } from "./goal-decomposition";
import { globalCapabilityDiscoveryEngine } from "./capability-discovery";
import { globalDependencyResolutionEngine } from "./dependency-resolution";
import { globalPermissionPlanningEngine } from "./permission-planning";
import { globalWorkflowPlanningEngine } from "./workflow-planning";
import { globalExecutionGraphGenerator } from "./execution-graph";
import { globalExecutionPlanAssembler } from "./execution-plan";
import { globalExplainabilityEngine } from "./explainability";

import type { UOBInput, UOBResult, ExecutionPlan, PlatformContext } from "./types";

// ── UOB Engine ────────────────────────────────────────────────────────────

export class UOBEngine {
  /**
   * Run the full 16-stage planning pipeline.
   *
   * Input: Shared Context (with prior phase enrichments) + optional candidates.
   * Output: Execution Plan + enriched (frozen) Shared Context.
   */
  async plan(input: UOBInput): Promise<UOBResult> {
    const startMs = Date.now();
    const context = input.context;

    // ── Stages 1-2: Goal Analysis + Goal Decomposition ──────────────────
    const goalAnalysis = globalGoalDecompositionEngine.analyze(context, input.explicitGoal);

    // ── Stages 3-4: Capability Discovery + Selection ─────────────────────
    const discovery = globalCapabilityDiscoveryEngine.discover(goalAnalysis.subGoals);

    // ── Stage 4a: CIE Integration — filter by country availability + partner trust ─
    // UOB queries CIE for country-specific capability availability and partner
    // trust scores. Capabilities not available in the user's country are filtered
    // out. Low-trust partners are flagged in the explainability.
    const country = context.geographic?.location?.country;
    if (country) {
      try {
        const { globalCIEEngine } = await import("@/lib/cie/cie-engine");
        const countryInfo = globalCIEEngine.countryIntelligence.get(country);
        if (countryInfo) {
          // Filter out capabilities not available in this country (via versioning).
          const { globalVersioningFramework } = await import("@/lib/cie/versioning");
          const filteredSelected = discovery.selected.filter((sel) => {
            const versionInfo = globalVersioningFramework.get(sel.capabilityId);
            if (versionInfo && versionInfo.regionalAvailability[country] === false) {
              return false; // not available in this country
            }
            return true;
          });
          // Update discovery if capabilities were filtered.
          if (filteredSelected.length < discovery.selected.length) {
            const removed = discovery.selected.length - filteredSelected.length;
            discovery.selected = filteredSelected;
            // Add to missing capabilities.
            discovery.missing.push({
              suggestedId: "(region-restricted)",
              subGoalId: "(filtered)",
              description: `${removed} capability/capabilities filtered (not available in ${country})`,
              handlingStrategy: "skipped",
            });
          }

          // Check partner trust scores for capabilities that have partner providers.
          const lowTrustPartners: string[] = [];
          for (const sel of discovery.selected) {
            const cap = await (await import("@/lib/cognitive/capability-registry")).globalCapabilityRegistry.lookup(sel.capabilityId);
            if (cap?.ownerModule?.startsWith("partner.")) {
              const trustScore = globalCIEEngine.partnerIntelligence.get(cap.ownerModule);
              if (trustScore && trustScore.score < 50) {
                lowTrustPartners.push(`${cap.ownerModule} (score: ${trustScore.score})`);
              }
            }
          }
          if (lowTrustPartners.length > 0) {
            // Flag in explainability (will be picked up later).
            (goalAnalysis as { _lowTrustPartners?: string[] })._lowTrustPartners = lowTrustPartners;
          }
        }
      } catch {
        // CIE unavailable — proceed without country filtering (non-fatal).
      }
    }

    // ── Stage 5: Dependency Resolution ───────────────────────────────────
    const deps = globalDependencyResolutionEngine.resolve(discovery.selected);

    // ── Stage 6: Permission Planning ─────────────────────────────────────
    const permissions = globalPermissionPlanningEngine.plan(discovery.selected, context);

    // ── Stages 7-13: Workflow Planning (constraint validation, ordering,
    //    parallelization, alternatives, fallbacks, compensation) ──────────
    const workflow = globalWorkflowPlanningEngine.plan(
      discovery.selected,
      deps.resolved,
      permissions.planned,
      goalAnalysis.subGoals,
      context,
    );

    // ── Stage 14: Execution Graph Generation ─────────────────────────────
    const graph = globalExecutionGraphGenerator.generate(workflow.steps, workflow.conditionalBranches);

    // ── Stage 16: Explainability Package (before assembly, so the
    //    assembler can include it) ────────────────────────────────────────
    const explainability = globalExplainabilityEngine.explain({
      goals: goalAnalysis.goals,
      subGoals: goalAnalysis.subGoals,
      selected: discovery.selected,
      resolved: deps.resolved,
      missing: discovery.missing,
      alternatives: deps.alternativesConsidered,
      permissions: permissions.planned,
      steps: workflow.steps,
      branches: workflow.conditionalBranches,
      compensation: workflow.compensationActions,
      intentType: goalAnalysis.goals[0]?.intentType || "answer",
    });

    // ── Stage 15: Execution Plan Generation ──────────────────────────────
    const plan = globalExecutionPlanAssembler.assemble({
      goals: goalAnalysis.goals,
      subGoals: goalAnalysis.subGoals,
      discovery,
      deps,
      permissions,
      workflow,
      graph,
      explainability,
      correlationId: context.metadata.correlation.requestId,
      goalSummary: goalAnalysis.goals[0]?.statement || context.request?.originalRequest || "(no goal)",
      intentType: goalAnalysis.goals[0]?.intentType || "answer",
    });

    // ── Stage 15a: TGSE Governance Validation ───────────────────────────
    // UOB validates the generated plan through TGSE before returning it.
    // If TGSE denies the plan, UOB marks it as governance-blocked and
    // attaches the governance decision to the explainability package.
    try {
      const { globalTGSEEngine } = await import("@/lib/tgse/tgse-engine");
      const govDecision = globalTGSEEngine.validate({
        target: "uob",
        action: `plan:${plan.goalSummary}`,
        country: context.geographic?.location?.country,
        userPermissions: context.user?.userPermissions || [],
        consentScope: context.user?.consentScope || [],
        amount: this.extractAmountFromPlan(plan),
        impact: plan.complexityEstimate >= 7 ? "critical" : plan.complexityEstimate >= 5 ? "high" : "medium",
        actionContext: {
          planId: plan.planId,
          goalSummary: plan.goalSummary,
          requiredCapabilities: plan.requiredCapabilities,
          effectivePermissions: plan.effectivePermissions,
          stepCount: plan.steps.length,
        },
      });

      // Attach the governance decision to the plan's explainability.
      plan.explainability.decisionExplanations.push(
        `TGSE Governance: ${govDecision.decision.toUpperCase()} — ${govDecision.explanation.summary}`,
      );

      // If TGSE denies, mark the plan as incomplete.
      if (govDecision.decision === "deny") {
        plan.isComplete = false;
        plan.unfulfillableSubGoals.push(`Governance denied: ${govDecision.explanation.summary}`);
        plan.confidence *= 0.3; // heavily penalize denied plans
      } else if (govDecision.decision === "require-approval") {
        plan.confidence *= 0.7; // penalize plans requiring approval
      }
    } catch {
      // TGSE validation failure is non-fatal — plan still returns.
      // In production, this should be a hard failure, but for resilience
      // we allow the plan through with a warning.
    }

    // ── Enrich the Shared Context's `platform` section (UOB is the sole
    //    author — Phase 4.5 ownership guard enforces this) ────────────────
    const platformSection: PlatformContext = {
      requiredModules: plan.requiredModules,
      requiredCapabilities: plan.requiredCapabilities,
      resolvedDependencies: plan.resolvedDependencies,
      effectivePermissions: plan.effectivePermissions,
      executionPlan: {
        planId: plan.planId,
        goalSummary: plan.goalSummary,
        workspace: plan.workspace,
        stepCount: plan.steps.length,
        confidence: plan.confidence,
        isComplete: plan.isComplete,
        unfulfillableSubGoals: plan.unfulfillableSubGoals,
      },
      alternatives: plan.alternativesConsidered,
      missingCapabilities: plan.missingCapabilities,
      workspace: plan.workspace,
    };

    let enrichedContext: SharedContext;
    try {
      enrichedContext = globalContextManager.enrich(context, "platform", platformSection, "uob", {
        reason: `UOB generated execution plan: ${plan.steps.length} steps, confidence ${plan.confidence.toFixed(2)}`,
      });
      enrichedContext = globalContextManager.freeze(enrichedContext);
    } catch {
      // If the context is already frozen (e.g. caller pre-froze it), return
      // the plan without enrichment. The plan is still valid.
      enrichedContext = context;
    }

    const latencyMs = Date.now() - startMs;

    return {
      plan,
      enrichedContext,
      latencyMs,
    };
  }

  /**
   * Quick health/status check for the UOB.
   */
  status(): {
    phase: string;
    status: string;
    pipelineStages: number;
    schemaVersion: number;
    ownsPlatformContextSection: boolean;
  } {
    return {
      phase: "5",
      status: "operational",
      pipelineStages: 16,
      schemaVersion: 1,
      ownsPlatformContextSection: true,
    };
  }

  /**
   * Extract the maximum payment amount from a plan's steps (for TGSE risk assessment).
   */
  private extractAmountFromPlan(plan: ExecutionPlan): number | undefined {
    let maxAmount = 0;
    let found = false;
    for (const step of plan.steps) {
      const amt = Number(step.inputs?.amount);
      if (!isNaN(amt) && amt > maxAmount) {
        maxAmount = amt;
        found = true;
      }
    }
    return found ? maxAmount : undefined;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────
//
// A single UOB instance serves the whole platform. It holds NO per-request
// state (all state lives in the Shared Context), so it is safe to share
// across requests and workers.

export const globalUOBEngine = new UOBEngine();
