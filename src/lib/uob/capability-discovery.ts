/**
 * CIRKLE Brain AI — UOB Capability Discovery Engine
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain — Pipeline Stages 3-4
 *
 * Capability Discovery + Capability Selection.
 *
 * UOB NEVER hardcodes platform modules. It discovers capabilities
 * dynamically through the Capability Registry (Phase 4.5), reasoning only
 * over registered capabilities.
 *
 * For each sub-goal, the engine:
 *   1. Queries the registry by category (the sub-goal's category hint).
 *   2. Filters to available + active capabilities.
 *   3. Selects the best match (first available, preferring non-beta).
 *   4. Records any sub-goals with NO matching capability (gap detection).
 * ============================================================================
 */

import { globalCapabilityRegistry, type Capability } from "@/lib/cognitive/capability-registry";
import { ensureCapabilitiesSeeded } from "@/lib/cognitive/capability-seed";
import type { SubGoal, SelectedCapability, MissingCapability, CapabilityDiscoveryResult } from "./types";

// ── Capability Discovery Engine ──────────────────────────────────────────

export class CapabilityDiscoveryEngine {
  /**
   * Discover capabilities for each sub-goal by querying the registry.
   * Returns selected capabilities + missing-capability gaps.
   */
  discover(subGoals: SubGoal[]): CapabilityDiscoveryResult {
    ensureCapabilitiesSeeded();

    const candidatesBySubGoal: Record<string, string[]> = {};
    const selected: SelectedCapability[] = [];
    const missing: MissingCapability[] = [];

    for (const sg of subGoals) {
      // Query the registry by category, available-only.
      const candidates = globalCapabilityRegistry.search({
        category: sg.category as never,
        availableOnly: true,
        limit: 10,
      });

      candidatesBySubGoal[sg.id] = candidates.map((c) => c.id);

      if (candidates.length === 0) {
        // Gap detected — no capability in this category.
        if (sg.required) {
          missing.push({
            suggestedId: `${sg.category}.placeholder`,
            subGoalId: sg.id,
            description: sg.statement,
            handlingStrategy: sg.required ? "degraded-plan" : "skipped",
          });
        }
        continue;
      }

      // Select the best candidate: prefer "available" over "beta", then first.
      const best = this.selectBest(candidates);
      selected.push({
        capabilityId: best.id,
        subGoalId: sg.id,
        selectionReason: `Selected "${best.name}" (${best.id}) as the best available capability in category "${sg.category}" for sub-goal "${sg.statement}".`,
        role: "primary",
      });
    }

    return { candidatesBySubGoal, selected, missing };
  }

  /**
   * Select the best capability from a list of candidates.
   * Heuristic: prefer "available" over "beta"; among equals, prefer fewer
   * dependencies (lower friction).
   */
  private selectBest(candidates: Capability[]): Capability {
    const sorted = [...candidates].sort((a, b) => {
      // Prefer "available" over "beta"
      if (a.availability === "available" && b.availability !== "available") return -1;
      if (b.availability === "available" && a.availability !== "available") return 1;
      // Prefer fewer dependencies (simpler = better)
      const depDiff = a.dependencies.length - b.dependencies.length;
      if (depDiff !== 0) return depDiff;
      // Prefer fewer permissions (lower friction)
      const permDiff = a.permissions.length - b.permissions.length;
      if (permDiff !== 0) return permDiff;
      // Alphabetical for determinism
      return a.id.localeCompare(b.id);
    });
    return sorted[0];
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalCapabilityDiscoveryEngine = new CapabilityDiscoveryEngine();
