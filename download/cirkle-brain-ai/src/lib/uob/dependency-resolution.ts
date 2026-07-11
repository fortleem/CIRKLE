/**
 * CIRKLE Brain AI — UOB Dependency Resolution Engine
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain — Pipeline Stage 5
 *
 * Automatically resolves:
 *   - Required capabilities (direct dependencies)
 *   - Optional capabilities (enhancements)
 *   - Capability prerequisites (transitive closure)
 *   - Service dependencies (registry-level)
 *   - Circular dependencies (cycle detection via the registry)
 *   - Missing capabilities (not registered)
 *   - Unavailable capabilities (disabled/maintenance)
 *   - Alternative capabilities (substitutes)
 *
 * Uses the Capability Registry's resolveDependencies (Phase 4.5) for the
 * transitive closure + cycle detection. UOB adds the alternative/fallback
 * substitution layer on top.
 * ============================================================================
 */

import { globalCapabilityRegistry, type Capability } from "@/lib/cognitive/capability-registry";
import { ensureCapabilitiesSeeded } from "@/lib/cognitive/capability-seed";
import { ALTERNATIVE_RULES } from "./heuristics";
import type { SelectedCapability, ResolvedDependency, DependencyStatus, AlternativeConsidered, DependencyResolutionResult } from "./types";

// ── Dependency Resolution Engine ──────────────────────────────────────────

export class DependencyResolutionEngine {
  /**
   * Resolve all dependencies for the selected capabilities.
   *
   * For each selected capability:
   *   1. Check availability (status + availability).
   *   2. Resolve transitive dependencies via the registry.
   *   3. If a dependency is missing/unavailable, check ALTERNATIVE_RULES.
   *   4. Record the resolution status + any substitutions.
   */
  resolve(selected: SelectedCapability[]): DependencyResolutionResult {
    ensureCapabilitiesSeeded();

    const resolved: ResolvedDependency[] = [];
    const alternativesConsidered: AlternativeConsidered[] = [];
    const unresolvable: string[] = [];

    for (const sel of selected) {
      const cap = globalCapabilityRegistry.lookup(sel.capabilityId);
      if (!cap) {
        // Capability itself is missing.
        resolved.push({
          dependentCapabilityId: sel.capabilityId,
          dependencyCapabilityId: "(self)",
          status: "missing",
          reason: `Capability "${sel.capabilityId}" is not registered in the Capability Registry.`,
        });
        if (sel.role === "primary") unresolvable.push(sel.capabilityId);
        continue;
      }

      // Check availability of the capability itself.
      if (cap.status !== "active" || cap.availability !== "available") {
        // Try to find an alternative.
        const alt = this.findAlternative(cap.id);
        if (alt) {
          alternativesConsidered.push({
            forCapabilityId: cap.id,
            alternativeCapabilityId: alt.id,
            chosen: true,
            reason: `Primary "${cap.id}" is ${cap.status}/${cap.availability}; substituted with alternative "${alt.id}".`,
          });
          resolved.push({
            dependentCapabilityId: sel.capabilityId,
            dependencyCapabilityId: alt.id,
            status: "alternative-found",
            substitutedCapabilityId: alt.id,
            reason: `Substituted unavailable "${cap.id}" with alternative "${alt.id}".`,
          });
        } else {
          resolved.push({
            dependentCapabilityId: sel.capabilityId,
            dependencyCapabilityId: "(self)",
            status: "unavailable",
            reason: `Capability "${cap.id}" is ${cap.status}/${cap.availability} and no alternative exists.`,
          });
          if (sel.role === "primary") unresolvable.push(sel.capabilityId);
        }
        continue;
      }

      // Resolve transitive dependencies via the registry.
      try {
        const transitiveDeps = globalCapabilityRegistry.resolveDependencies(cap.id);
        for (const dep of transitiveDeps) {
          const depStatus = this.checkAvailability(dep.id);
          resolved.push({
            dependentCapabilityId: cap.id,
            dependencyCapabilityId: dep.id,
            status: depStatus.status,
            substitutedCapabilityId: depStatus.substituted,
            reason: depStatus.reason,
          });
          if (depStatus.status === "unresolvable" && sel.role === "primary") {
            unresolvable.push(cap.id);
          }
        }
      } catch {
        // resolveDependencies throws on missing deps or cycles.
        resolved.push({
          dependentCapabilityId: cap.id,
          dependencyCapabilityId: "(transitive)",
          status: "unresolvable",
          reason: `Transitive dependency resolution failed for "${cap.id}" (missing dep or cycle).`,
        });
        if (sel.role === "primary") unresolvable.push(cap.id);
      }
    }

    return { resolved, alternativesConsidered, unresolvable };
  }

  /**
   * Check the availability of a single capability, with alternative lookup.
   */
  private checkAvailability(capId: string): {
    status: DependencyStatus;
    substituted?: string;
    reason: string;
  } {
    const cap = globalCapabilityRegistry.lookup(capId);
    if (!cap) {
      return { status: "missing", reason: `Capability "${capId}" is not registered.` };
    }
    if (cap.status !== "active" || cap.availability !== "available") {
      const alt = this.findAlternative(capId);
      if (alt) {
        return {
          status: "alternative-found",
          substituted: alt.id,
          reason: `"${capId}" unavailable; substituted with "${alt.id}".`,
        };
      }
      const fallback = this.findFallback(capId);
      if (fallback) {
        return {
          status: "fallback-found",
          substituted: fallback.id,
          reason: `"${capId}" unavailable; using degraded fallback "${fallback.id}".`,
        };
      }
      return { status: "unresolvable", reason: `"${capId}" unavailable with no alternative or fallback.` };
    }
    return { status: "resolved", reason: `Capability "${capId}" is available.` };
  }

  /**
   * Find an alternative for an unavailable capability.
   */
  private findAlternative(capId: string): Capability | null {
    const rule = ALTERNATIVE_RULES.find((r) => r.primary === capId && r.kind === "alternative");
    if (!rule) return null;
    const alt = globalCapabilityRegistry.lookup(rule.alternative);
    if (!alt || alt.status !== "active" || alt.availability !== "available") return null;
    return alt;
  }

  /**
   * Find a degraded fallback for an unavailable capability.
   */
  private findFallback(capId: string): Capability | null {
    const rule = ALTERNATIVE_RULES.find((r) => r.primary === capId && r.kind === "fallback");
    if (!rule) return null;
    const fb = globalCapabilityRegistry.lookup(rule.alternative);
    if (!fb || fb.status !== "active" || fb.availability !== "available") return null;
    return fb;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalDependencyResolutionEngine = new DependencyResolutionEngine();
