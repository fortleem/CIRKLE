/**
 * CIRKLE Brain AI — CIE Government Intelligence
 * ============================================================================
 * Government capabilities model: national identity, business registration,
 * tax services, customs, immigration, licensing, social services, digital
 * signature, public payments, open government APIs.
 * Models capabilities + interfaces, not implementation details.
 * ============================================================================
 */

import type { GovernmentIntelligence, GovernmentServiceType } from "./types";

export class GovernmentIntelligenceModel {
  private services = new Map<string, GovernmentIntelligence>();

  register(service: GovernmentIntelligence): void {
    this.services.set(service.serviceId, service);
  }

  get(serviceId: string): GovernmentIntelligence | null {
    return this.services.get(serviceId) || null;
  }

  list(): GovernmentIntelligence[] {
    return Array.from(this.services.values());
  }

  listByCountry(countryCode: string): GovernmentIntelligence[] {
    return this.list().filter((s) => s.countryCode === countryCode);
  }

  listByType(type: GovernmentServiceType): GovernmentIntelligence[] {
    return this.list().filter((s) => s.type === type);
  }

  listActive(): GovernmentIntelligence[] {
    return this.list().filter((s) => s.status === "active");
  }

  getRelatedCapabilities(serviceId: string): string[] {
    return this.get(serviceId)?.relatedCapabilities || [];
  }

  getStats(): { total: number; active: number; byType: Record<string, number>; byCountry: Record<string, number> } {
    const byType: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    let active = 0;
    for (const s of this.services.values()) {
      byType[s.type] = (byType[s.type] || 0) + 1;
      byCountry[s.countryCode] = (byCountry[s.countryCode] || 0) + 1;
      if (s.status === "active") active++;
    }
    return { total: this.services.size, active, byType, byCountry };
  }
}

export const globalGovernmentIntelligence = new GovernmentIntelligenceModel();
