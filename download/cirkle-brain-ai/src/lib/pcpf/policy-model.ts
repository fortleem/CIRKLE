/**
 * CIRKLE Brain AI — PCPF Policy Model
 * ============================================================================
 *
 * Declarative policy definitions for capability packs. Policies are exposed
 * to UOB (for planning) and TEE (for enforcement).
 *
 * Policy types:
 *   - user-permission: user must hold a permission token
 *   - enterprise-permission: enterprise admin must grant
 *   - organization-permission: org-level permission
 *   - country-constraint: country-specific rule
 *   - consent-requirement: consent purpose required
 *   - regulatory-prerequisite: regulatory compliance
 *   - rate-limit: invocation rate limit
 *   - time-window: time-based restriction
 * ============================================================================
 */

import type { PolicyDefinition, PolicyType } from "./types";

// ── Policy Model ─────────────────────────────────────────────────────────

export class PolicyModel {
  /**
   * Evaluate a policy against a given context (user, country, consent).
   * Returns whether the policy is satisfied, denied, or warned.
   */
  evaluate(
    policy: PolicyDefinition,
    ctx: {
      userPermissions: string[];
      country: string;
      consentScope: string[];
      enterprisePermissions?: string[];
      organizationPermissions?: string[];
      invocationCount?: number;
      currentTime?: string;
    },
  ): { result: "satisfied" | "denied" | "warn"; reason: string } {
    // Check country applicability.
    if (!policy.applicableCountries.includes("*") && !policy.applicableCountries.includes(ctx.country)) {
      return { result: "satisfied", reason: `Policy not applicable in ${ctx.country}` };
    }

    switch (policy.type) {
      case "user-permission": {
        const requiredPerm = String(policy.rules.permission || "");
        if (!ctx.userPermissions.includes(requiredPerm)) {
          return {
            result: policy.enforcement === "block" ? "denied" : "warn",
            reason: `User lacks permission "${requiredPerm}"`,
          };
        }
        return { result: "satisfied", reason: `Permission "${requiredPerm}" granted` };
      }

      case "enterprise-permission": {
        const requiredPerm = String(policy.rules.permission || "");
        if (!ctx.enterprisePermissions?.includes(requiredPerm)) {
          return {
            result: policy.enforcement === "block" ? "denied" : "warn",
            reason: `Enterprise permission "${requiredPerm}" not granted`,
          };
        }
        return { result: "satisfied", reason: `Enterprise permission "${requiredPerm}" granted` };
      }

      case "organization-permission": {
        const requiredPerm = String(policy.rules.permission || "");
        if (!ctx.organizationPermissions?.includes(requiredPerm)) {
          return {
            result: policy.enforcement === "block" ? "denied" : "warn",
            reason: `Organization permission "${requiredPerm}" not granted`,
          };
        }
        return { result: "satisfied", reason: `Organization permission "${requiredPerm}" granted` };
      }

      case "country-constraint": {
        const allowedCountries = (policy.rules.allowedCountries as string[]) || [];
        if (allowedCountries.length > 0 && !allowedCountries.includes(ctx.country)) {
          return {
            result: policy.enforcement === "block" ? "denied" : "warn",
            reason: `Capability not available in ${ctx.country}`,
          };
        }
        return { result: "satisfied", reason: `Country ${ctx.country} allowed` };
      }

      case "consent-requirement": {
        const purpose = String(policy.rules.consentPurpose || "");
        if (!ctx.consentScope.includes(purpose)) {
          return {
            result: policy.enforcement === "block" ? "denied" : "warn",
            reason: `Consent "${purpose}" not granted`,
          };
        }
        return { result: "satisfied", reason: `Consent "${purpose}" granted` };
      }

      case "regulatory-prerequisite": {
        // Regulatory prerequisites are always evaluated at execution time
        // by the TEE, which has access to the full compliance context.
        const met = Boolean(policy.rules.prerequisiteMet);
        return {
          result: met ? "satisfied" : policy.enforcement === "block" ? "denied" : "warn",
          reason: met ? "Regulatory prerequisite met" : "Regulatory prerequisite not met",
        };
      }

      case "rate-limit": {
        const maxInvocations = Number(policy.rules.maxInvocations || 0);
        const windowSeconds = Number(policy.rules.windowSeconds || 60);
        const current = ctx.invocationCount || 0;
        if (current >= maxInvocations) {
          return {
            result: "denied",
            reason: `Rate limit exceeded: ${current}/${maxInvocations} in ${windowSeconds}s`,
          };
        }
        return { result: "satisfied", reason: `Rate limit OK: ${current}/${maxInvocations}` };
      }

      case "time-window": {
        const allowedHours = (policy.rules.allowedHours as number[]) || [];
        const hour = ctx.currentTime ? new Date(ctx.currentTime).getHours() : new Date().getHours();
        if (allowedHours.length > 0 && !allowedHours.includes(hour)) {
          return {
            result: policy.enforcement === "block" ? "denied" : "warn",
            reason: `Time window restriction: hour ${hour} not allowed`,
          };
        }
        return { result: "satisfied", reason: `Time window OK: hour ${hour}` };
      }

      default:
        return { result: "warn", reason: `Unknown policy type: ${policy.type}` };
    }
  }

  /**
   * Evaluate all policies for a capability.
   */
  evaluateForCapability(
    policies: PolicyDefinition[],
    capabilityId: string,
    ctx: {
      userPermissions: string[];
      country: string;
      consentScope: string[];
      enterprisePermissions?: string[];
      organizationPermissions?: string[];
      invocationCount?: number;
      currentTime?: string;
    },
  ): { result: "satisfied" | "denied" | "warn"; deniedPolicies: string[]; warnings: string[] } {
    const deniedPolicies: string[] = [];
    const warnings: string[] = [];
    let hasDenial = false;
    let hasWarn = false;

    for (const policy of policies) {
      if (policy.capabilityId && policy.capabilityId !== capabilityId) continue;
      const evalResult = this.evaluate(policy, ctx);
      if (evalResult.result === "denied") {
        hasDenial = true;
        deniedPolicies.push(`${policy.policyId}: ${evalResult.reason}`);
      } else if (evalResult.result === "warn") {
        hasWarn = true;
        warnings.push(`${policy.policyId}: ${evalResult.reason}`);
      }
    }

    return {
      result: hasDenial ? "denied" : hasWarn ? "warn" : "satisfied",
      deniedPolicies,
      warnings,
    };
  }

  /**
   * Create a standard user-permission policy.
   */
  createUserPermissionPolicy(capabilityId: string, permission: string, countries: string[] = ["*"]): PolicyDefinition {
    return {
      policyId: `policy_${capabilityId}_user_${permission.replace(/[^a-z0-9]/gi, "_")}`,
      type: "user-permission" as PolicyType,
      description: `Requires user permission "${permission}" for capability "${capabilityId}"`,
      capabilityId,
      rules: { permission },
      applicableCountries: countries,
      enforcement: "block",
    };
  }

  /**
   * Create a consent-requirement policy.
   */
  createConsentPolicy(capabilityId: string, consentPurpose: string, countries: string[] = ["*"]): PolicyDefinition {
    return {
      policyId: `policy_${capabilityId}_consent_${consentPurpose}`,
      type: "consent-requirement" as PolicyType,
      description: `Requires consent "${consentPurpose}" for capability "${capabilityId}"`,
      capabilityId,
      rules: { consentPurpose },
      applicableCountries: countries,
      enforcement: "block",
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalPolicyModel = new PolicyModel();
