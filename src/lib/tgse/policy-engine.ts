/**
 * CIRKLE Brain AI — TGSE Policy Engine
 * ============================================================================
 * Declarative, version-controlled, data-driven policy evaluation.
 * Supports 8 policy domains: user, organization, enterprise, regional,
 * country, industry, regulatory, internal.
 * ============================================================================
 */

import type { Policy, PolicyDomain, PolicyEnforcement, GovernanceTarget } from "./types";

export interface PolicyEvaluationResult {
  policiesEvaluated: string[];
  enforcement: PolicyEnforcement;
  violations: string[];
  passed: boolean;
}

export class PolicyEngine {
  private policies = new Map<string, Policy>();

  register(policy: Policy): void {
    this.policies.set(policy.policyId, policy);
  }

  get(policyId: string): Policy | null {
    return this.policies.get(policyId) || null;
  }

  list(): Policy[] {
    return Array.from(this.policies.values()).filter((p) => p.active);
  }

  listByDomain(domain: PolicyDomain): Policy[] {
    return this.list().filter((p) => p.domain === domain);
  }

  listByTarget(target: GovernanceTarget): Policy[] {
    return this.list().filter((p) => p.target === target);
  }

  listByCountry(countryCode: string): Policy[] {
    return this.list().filter((p) => p.applicableCountries.includes("*") || p.applicableCountries.includes(countryCode));
  }

  /**
   * Evaluate all applicable policies for a target action + context.
   */
  evaluate(
    target: GovernanceTarget,
    ctx: {
      country?: string;
      userPermissions: string[];
      consentScope: string[];
      amount?: number;
      trustScore?: number;
      riskLevel?: string;
      invocationCount?: number;
    },
  ): PolicyEvaluationResult {
    const applicable = this.listByTarget(target).filter((p) => {
      if (ctx.country && !p.applicableCountries.includes("*") && !p.applicableCountries.includes(ctx.country)) return false;
      return true;
    });

    const evaluated: string[] = [];
    const violations: string[] = [];
    let maxEnforcement: PolicyEnforcement = "log";

    const enforcementRank: Record<PolicyEnforcement, number> = { log: 0, warn: 1, "require-approval": 2, block: 3 };

    for (const policy of applicable) {
      evaluated.push(policy.policyId);
      const result = this.evaluatePolicy(policy, ctx);
      if (!result.passed) {
        violations.push(`${policy.policyId}: ${result.reason}`);
        if (enforcementRank[policy.enforcement] > enforcementRank[maxEnforcement]) {
          maxEnforcement = policy.enforcement;
        }
      }
    }

    return {
      policiesEvaluated: evaluated,
      enforcement: maxEnforcement,
      violations,
      passed: violations.length === 0,
    };
  }

  private evaluatePolicy(policy: Policy, ctx: {
    userPermissions: string[];
    consentScope: string[];
    amount?: number;
    trustScore?: number;
    riskLevel?: string;
    invocationCount?: number;
  }): { passed: boolean; reason: string } {
    const rule = policy.rule;
    switch (rule.type) {
      case "permission-required": {
        const perm = String(rule.params.permission || "");
        if (!ctx.userPermissions.includes(perm) && perm) {
          return { passed: false, reason: `User lacks permission "${perm}"` };
        }
        return { passed: true, reason: "" };
      }
      case "consent-required": {
        const purpose = String(rule.params.consentPurpose || "");
        if (purpose && !ctx.consentScope.includes(purpose)) {
          return { passed: false, reason: `Consent "${purpose}" not granted` };
        }
        return { passed: true, reason: "" };
      }
      case "threshold": {
        const max = Number(rule.params.max ?? Infinity);
        const min = Number(rule.params.min ?? -Infinity);
        const value = Number(ctx.amount ?? rule.params.value ?? 0);
        if (value > max) return { passed: false, reason: `Value ${value} exceeds max ${max}` };
        if (value < min) return { passed: false, reason: `Value ${value} below min ${min}` };
        return { passed: true, reason: "" };
      }
      case "country-allowed": {
        const allowed = (rule.params.allowedCountries as string[]) || [];
        const country = String(rule.params.country || ctx.userPermissions[0] || "");
        if (allowed.length > 0 && !allowed.includes(country)) {
          return { passed: false, reason: `Action not allowed in ${country}` };
        }
        return { passed: true, reason: "" };
      }
      case "rate-limit": {
        const max = Number(rule.params.maxInvocations || Infinity);
        const current = ctx.invocationCount || 0;
        if (current >= max) return { passed: false, reason: `Rate limit exceeded: ${current}/${max}` };
        return { passed: true, reason: "" };
      }
      case "risk-threshold": {
        const maxLevel = String(rule.params.maxLevel || "critical");
        const levels = ["negligible", "low", "medium", "high", "critical"];
        const currentIdx = levels.indexOf(ctx.riskLevel || "negligible");
        const maxIdx = levels.indexOf(maxLevel);
        if (currentIdx > maxIdx) return { passed: false, reason: `Risk ${ctx.riskLevel} exceeds threshold ${maxLevel}` };
        return { passed: true, reason: "" };
      }
      case "trust-threshold": {
        const minScore = Number(rule.params.minScore || 0);
        if ((ctx.trustScore || 0) < minScore) {
          return { passed: false, reason: `Trust score ${ctx.trustScore} below threshold ${minScore}` };
        }
        return { passed: true, reason: "" };
      }
      default:
        return { passed: true, reason: "" };
    }
  }

  update(policyId: string, patch: Partial<Policy>): boolean {
    const p = this.policies.get(policyId);
    if (!p) return false;
    this.policies.set(policyId, { ...p, ...patch, updatedAt: new Date().toISOString() });
    return true;
  }

  deactivate(policyId: string): boolean {
    return this.update(policyId, { active: false });
  }

  getStats(): { total: number; active: number; byDomain: Record<string, number> } {
    const byDomain: Record<string, number> = {};
    let active = 0;
    for (const p of this.policies.values()) {
      byDomain[p.domain] = (byDomain[p.domain] || 0) + 1;
      if (p.active) active++;
    }
    return { total: this.policies.size, active, byDomain };
  }
}

export const globalPolicyEngine = new PolicyEngine();
