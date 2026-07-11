// @ts-nocheck
/**
 * CIRKLE Brain AI — UOB Permission Planning Engine
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain — Pipeline Stage 6
 *
 * Permission Planning. UOB PLANS permissions — it does NOT execute
 * permission checks. The future Trusted Execution Engine (Phase 6) will
 * enforce them at runtime.
 *
 * 5-layer model (per Phase 5 Design Spec §7.1):
 *   1. Capability Permissions (from registry)
 *   2. Module Permissions (derived, future)
 *   3. User Permissions (from PMB userContext.userPermissions)
 *   4. Consent (from Consent Management Service)
 *   5. Enterprise/Government Permissions (future)
 *
 * For each capability, the engine:
 *   - Computes the effective permission set (own + transitive deps).
 *   - Checks against user permissions (from Shared Context user section).
 *   - Checks consent (read-only — UOB does not call the consent service).
 *   - Determines if user confirmation is required.
 *   - Records the planned permission status.
 * ============================================================================
 */

import { globalCapabilityRegistry } from "@/lib/cognitive/capability-registry";
import { ensureCapabilitiesSeeded } from "@/lib/cognitive/capability-seed";
import type { SharedContext } from "@/lib/cognitive/shared-context";
import { SENSITIVE_PERMISSIONS, CONFIRMATION_REQUIRED_CAPABILITIES, NO_CONFIRMATION_CAPABILITIES } from "./heuristics";
import type { SelectedCapability, PlannedPermission, PermissionPlanningResult, PermissionStatus } from "./types";

// ── Consent purpose map (which permission maps to which consent purpose) ──

const PERMISSION_TO_CONSENT: Record<string, string> = {
  "ai:personalization": "ai_personalization",
  "ai:generate": "ai_personalization", // AI generation uses personalization consent
  "ai:analyze": "ai_personalization",
  "ai:mediate": "ai_personalization",
  "ai:recommend": "ai_personalization",
};

// ── Permission Planning Engine ────────────────────────────────────────────

export class PermissionPlanningEngine {
  /**
   * Plan permissions for all selected capabilities.
   *
   * Reads user permissions + consent scope from the Shared Context's user
   * section (populated by PMB). UOB does NOT call the consent service.
   */
  plan(selected: SelectedCapability[], context: SharedContext): PermissionPlanningResult {
    ensureCapabilitiesSeeded();

    const planned: PlannedPermission[] = [];
    const effectivePermissions = new Set<string>();
    const consentRequired = new Set<string>();
    const confirmationRequiredSteps: string[] = [];

    const userPerms = new Set(context.user?.userPermissions || []);
    const consentScope = new Set(context.user?.consentScope || []);

    for (const sel of selected) {
      const cap = globalCapabilityRegistry.lookup(sel.capabilityId);
      if (!cap) continue;

      // Compute effective permissions: own + transitive deps.
      const allPerms = new Set<string>(cap.permissions);
      try {
        const deps = globalCapabilityRegistry.resolveDependencies(cap.capabilityId || sel.capabilityId);
        for (const dep of deps) {
          for (const p of dep.permissions) allPerms.add(p);
        }
      } catch {
        /* transitive deps failed — own perms only */
      }

      for (const perm of allPerms) {
        effectivePermissions.add(perm);

        // Check user permissions.
        const userHasPerm = userPerms.has(perm) || this.isDefaultGranted(perm);

        // Check consent.
        const consentPurpose = PERMISSION_TO_CONSENT[perm];
        const consentGranted = consentPurpose ? consentScope.has(consentPurpose) : true;

        let status: PermissionStatus;
        let requiresConfirmation = false;
        let reason: string;

        if (!userHasPerm) {
          status = "missing";
          reason = `User lacks permission "${perm}" required by "${sel.capabilityId}".`;
        } else if (consentPurpose && !consentGranted) {
          status = "consent-required";
          consentRequired.add(consentPurpose);
          reason = `Capability "${sel.capabilityId}" requires consent "${consentPurpose}" which is not granted.`;
          requiresConfirmation = true; // consent prompt is a form of confirmation
        } else if (consentPurpose && consentGranted) {
          status = "satisfied";
          reason = `Permission "${perm}" satisfied; consent "${consentPurpose}" granted.`;
        } else {
          status = "satisfied";
          reason = `Permission "${perm}" satisfied.`;
        }

        // Confirmation requirements.
        if (SENSITIVE_PERMISSIONS.has(perm)) {
          requiresConfirmation = true;
        }
        if (CONFIRMATION_REQUIRED_CAPABILITIES.has(sel.capabilityId)) {
          requiresConfirmation = true;
        }
        if (NO_CONFIRMATION_CAPABILITIES.has(sel.capabilityId)) {
          requiresConfirmation = false;
        }

        if (requiresConfirmation) {
          confirmationRequiredSteps.push(sel.capabilityId);
        }

        planned.push({
          capabilityId: sel.capabilityId,
          permission: perm,
          status,
          consentPurpose,
          requiresConfirmation,
          reason,
        });
      }

      // If the capability has NO permissions, record a "satisfied" entry for traceability.
      if (allPerms.size === 0) {
        planned.push({
          capabilityId: sel.capabilityId,
          permission: "(none)",
          status: "satisfied",
          requiresConfirmation: CONFIRMATION_REQUIRED_CAPABILITIES.has(sel.capabilityId),
          reason: `Capability "${sel.capabilityId}" requires no permissions.`,
        });
        if (CONFIRMATION_REQUIRED_CAPABILITIES.has(sel.capabilityId)) {
          confirmationRequiredSteps.push(sel.capabilityId);
        }
      }
    }

    return {
      planned,
      effectivePermissions: Array.from(effectivePermissions),
      consentRequired: Array.from(consentRequired),
      confirmationRequiredSteps: Array.from(new Set(confirmationRequiredSteps)),
    };
  }

  /**
   * Some permissions are granted by default to all authenticated users.
   * This is a heuristic; in production this would be a policy engine lookup.
   */
  private isDefaultGranted(permission: string): boolean {
    // Read-only / low-risk permissions are default-granted.
    const defaultGranted = new Set<string>([
      // All current CIRKLE permissions are default-granted to authenticated users.
      // The consent layer (not the permission layer) gates sensitive operations.
      "pay:send",
      "midan:write",
      "mashahd:write",
      "lamahd:write",
      "commit:write",
      "shield:write",
      "shield:panic",
      "profile:write",
      "wasl:write",
      "ai:generate",
      "ai:analyze",
      "ai:mediate",
      "ai:recommend",
      "ai:personalization",
    ]);
    return defaultGranted.has(permission);
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalPermissionPlanningEngine = new PermissionPlanningEngine();
