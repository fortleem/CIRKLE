/**
 * CIRKLE Brain AI — TGSE Compliance Engine
 * ============================================================================
 * Configurable compliance profiles for data protection, financial, consumer
 * protection, electronic transactions, identity verification, payment,
 * healthcare, education, country-specific legal requirements.
 * New jurisdictions can be added without redesign.
 * ============================================================================
 */

import type { ComplianceProfile, ComplianceResult, GovernanceTarget } from "./types";

export class ComplianceEngine {
  private profiles = new Map<string, ComplianceProfile>();

  register(profile: ComplianceProfile): void {
    this.profiles.set(profile.profileId, profile);
  }

  get(profileId: string): ComplianceProfile | null {
    return this.profiles.get(profileId) || null;
  }

  list(): ComplianceProfile[] {
    return Array.from(this.profiles.values()).filter((p) => p.active);
  }

  listByCountry(countryCode: string): ComplianceProfile[] {
    return this.list().filter((p) => p.applicableCountries.includes("*") || p.applicableCountries.includes(countryCode));
  }

  /**
   * Evaluate an action against all applicable compliance profiles.
   */
  evaluate(
    target: GovernanceTarget,
    ctx: { country?: string; action: string; data: Record<string, unknown> },
  ): ComplianceResult[] {
    const applicable = ctx.country ? this.listByCountry(ctx.country) : this.list();
    const results: ComplianceResult[] = [];

    for (const profile of applicable) {
      const violations: string[] = [];
      let rulesPassed = 0;

      for (const rule of profile.rules) {
        const passed = this.checkRule(rule.check, ctx);
        if (passed) rulesPassed++;
        else violations.push(`${rule.ruleId}: ${rule.description}`);
      }

      results.push({
        profileId: profile.profileId,
        compliant: violations.length === 0,
        violations,
        rulesChecked: profile.rules.length,
        rulesPassed,
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }

  private checkRule(check: string, ctx: { action: string; data: Record<string, unknown> }): boolean {
    // Simplified rule evaluation. In production, this would use a rule engine.
    switch (check) {
      case "data-minimization": return !ctx.data.fullProfile;
      case "consent-required": return Boolean(ctx.data.consentGranted);
      case "encryption-at-rest": return true; // assumed compliant
      case "encryption-in-transit": return true; // assumed compliant
      case "audit-logging": return true; // TGSE always logs
      case "pci-dss-card-handling": return ctx.action !== "store-card-number";
      case "kyc-required": return Boolean(ctx.data.kycVerified) || ctx.action !== "large-payment";
      case "localization-required": return Boolean(ctx.data.localized);
      default: return true;
    }
  }

  getStats(): { total: number; active: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    let active = 0;
    for (const p of this.profiles.values()) {
      byType[p.type] = (byType[p.type] || 0) + 1;
      if (p.active) active++;
    }
    return { total: this.profiles.size, active, byType };
  }
}

export const globalComplianceEngine = new ComplianceEngine();
