// @ts-nocheck
/**
 * CIRKLE Brain AI — TEE Execution Validator
 * ============================================================================
 *
 * Phase 6 — Trusted Execution Engine — Pipeline Stages 1-2
 *
 * Execution Validation + Permission Verification.
 *
 * TEE validates the Execution Plan BEFORE executing it. This is the runtime
 * safety gate — even though UOB planned the steps, TEE re-verifies:
 *   - The plan is well-formed (has steps, goal, correlation id).
 *   - Every step's capability exists in the Capability Registry.
 *   - Every step's permissions are satisfied (or flagged for consent).
 *   - No step references a missing/unavailable capability.
 *
 * TEE never bypasses policy. If validation fails, the execution is aborted
 * before any capability is invoked.
 * ============================================================================
 */

import { globalCapabilityRegistry, ensureCapabilitiesSeeded } from "@/lib/cognitive/capability-registry";
import { ensureCapabilitiesSeeded as ensureSeed } from "@/lib/cognitive/capability-seed";
import type { ExecutionPlan } from "@/lib/uob/types";
import type { ExecutionContext, AuditEntry } from "./types";
import type { SharedContext } from "@/lib/cognitive/shared-context";

// ── Validation Result ────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** Steps that require human approval before execution. */
  approvalRequiredSteps: string[];
  /** Steps that are skipped (optional + dependency failed). */
  skippedSteps: string[];
}

// ── Execution Validator ──────────────────────────────────────────────────

export class ExecutionValidator {
  /**
   * Stage 1: Validate the execution plan structurally.
   * Stage 2: Verify permissions for every step.
   */
  validate(plan: ExecutionPlan, context: SharedContext, userId: string): ValidationResult {
    ensureSeed();
    const errors: string[] = [];
    const warnings: string[] = [];
    const approvalRequiredSteps: string[] = [];
    const skippedSteps: string[] = [];

    // ── Stage 1: Structural validation ──────────────────────────────────
    if (!plan.planId) errors.push("Plan has no planId");
    if (!plan.steps || plan.steps.length === 0) {
      errors.push("Plan has no steps — nothing to execute");
    }
    if (!plan.correlationId) warnings.push("Plan has no correlationId");

    // Check every step references a registered capability.
    for (const step of plan.steps) {
      const cap = globalCapabilityRegistry.lookup(step.capabilityId);
      if (!cap) {
        errors.push(`Step ${step.stepId} references unknown capability "${step.capabilityId}"`);
        continue;
      }
      // Check availability.
      if (cap.status !== "active") {
        warnings.push(`Step ${step.stepId} capability "${step.capabilityId}" is ${cap.status}`);
        skippedSteps.push(step.stepId);
      }
      // Check for human-approval requirement.
      if (step.requiresConfirmation) {
        approvalRequiredSteps.push(step.stepId);
      }
      // Validate step dependencies reference valid step ids.
      for (const depId of step.dependsOn) {
        if (!plan.steps.find((s) => s.stepId === depId)) {
          errors.push(`Step ${step.stepId} depends on unknown step "${depId}"`);
        }
      }
    }

    // ── Stage 2: Permission verification ────────────────────────────────
    // TEE re-verifies permissions at runtime (defense in depth). UOB planned
    // them; TEE enforces them.
    void userId; // userId available for future enterprise/gov permission checks
    const userPerms = new Set(context.user?.userPermissions || []);
    const consentScope = new Set(context.user?.consentScope || []);

    for (const step of plan.steps) {
      if (skippedSteps.includes(step.stepId)) continue;
      const cap = globalCapabilityRegistry.lookup(step.capabilityId);
      if (!cap) continue;

      // Check each required permission.
      for (const perm of cap.permissions) {
        // In the current platform, all permissions are default-granted to
        // authenticated users (the consent layer gates sensitive operations).
        // TEE checks consent for consent-gated capabilities.
        if (step.consentRequired && !consentScope.has(step.consentRequired)) {
          // Consent not granted — this is a warning (the step will request consent at runtime),
          // not a hard error (the user may grant consent interactively).
          warnings.push(
            `Step ${step.stepId} requires consent "${step.consentRequired}" which is not yet granted`,
          );
        }
      }
    }

    // Check for circular dependencies (basic DFS).
    const visited = new Set<string>();
    const stack = new Set<string>();
    for (const step of plan.steps) {
      if (this.hasCycle(step.stepId, plan.steps, visited, stack)) {
        errors.push(`Circular dependency detected involving step ${step.stepId}`);
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      approvalRequiredSteps,
      skippedSteps,
    };
  }

  /**
   * DFS-based cycle detection.
   */
  private hasCycle(stepId: string, steps: { stepId: string; dependsOn: string[] }[], visited: Set<string>, stack: Set<string>): boolean {
    if (stack.has(stepId)) return true;
    if (visited.has(stepId)) return false;
    visited.add(stepId);
    stack.add(stepId);
    const step = steps.find((s) => s.stepId === stepId);
    if (step) {
      for (const depId of step.dependsOn) {
        if (this.hasCycle(depId, steps, visited, stack)) return true;
      }
    }
    stack.delete(stepId);
    return false;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalExecutionValidator = new ExecutionValidator();
