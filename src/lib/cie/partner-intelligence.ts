/**
 * CIRKLE Brain AI — CIE Partner Intelligence
 * ============================================================================
 * Partner ecosystem model across: financial, travel, commerce, healthcare,
 * education, enterprise, communications, AI, government, logistics, media,
 * security. Represents partner capabilities, regions, interfaces, policies,
 * and lifecycle status.
 * ============================================================================
 */

import type { PartnerIntelligence, PartnerCategory } from "./types";

export class PartnerIntelligenceModel {
  private partners = new Map<string, PartnerIntelligence>();

  register(partner: PartnerIntelligence): void {
    this.partners.set(partner.partnerId, partner);
  }

  get(partnerId: string): PartnerIntelligence | null {
    return this.partners.get(partnerId) || null;
  }

  list(): PartnerIntelligence[] {
    return Array.from(this.partners.values());
  }

  listByCategory(category: PartnerCategory): PartnerIntelligence[] {
    return this.list().filter((p) => p.category === category);
  }

  listByCountry(countryCode: string): PartnerIntelligence[] {
    return this.list().filter((p) => p.operatingCountries.includes(countryCode));
  }

  listActive(): PartnerIntelligence[] {
    return this.list().filter((p) => p.status === "active");
  }

  operatesIn(partnerId: string, countryCode: string): boolean {
    const p = this.get(partnerId);
    return p ? p.operatingCountries.includes(countryCode) : false;
  }

  getCapabilities(partnerId: string): string[] {
    return this.get(partnerId)?.capabilities || [];
  }

  getStats(): { total: number; active: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    let active = 0;
    for (const p of this.partners.values()) {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      if (p.status === "active") active++;
    }
    return { total: this.partners.size, active, byCategory };
  }
}

export const globalPartnerIntelligence = new PartnerIntelligenceModel();
