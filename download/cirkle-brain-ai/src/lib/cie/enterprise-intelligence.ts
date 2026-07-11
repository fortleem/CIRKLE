/**
 * CIRKLE Brain AI — CIE Enterprise Intelligence
 * ============================================================================
 * Enterprise integration model: ERP, CRM, supply chain, manufacturing,
 * procurement, accounting, HR, payroll, identity, document management,
 * collaboration, project management, analytics, reporting.
 * ============================================================================
 */

import type { EnterpriseIntelligence, EnterpriseIntegrationType } from "./types";

export class EnterpriseIntelligenceModel {
  private integrations = new Map<string, EnterpriseIntelligence>();

  register(integration: EnterpriseIntelligence): void {
    this.integrations.set(integration.integrationId, integration);
  }

  get(integrationId: string): EnterpriseIntelligence | null {
    return this.integrations.get(integrationId) || null;
  }

  list(): EnterpriseIntelligence[] {
    return Array.from(this.integrations.values());
  }

  listByType(type: EnterpriseIntegrationType): EnterpriseIntelligence[] {
    return this.list().filter((i) => i.type === type);
  }

  listByCountry(countryCode: string): EnterpriseIntelligence[] {
    return this.list().filter((i) => i.availableCountries.includes(countryCode));
  }

  listActive(): EnterpriseIntelligence[] {
    return this.list().filter((i) => i.status === "active");
  }

  getRelatedCapabilities(integrationId: string): string[] {
    return this.get(integrationId)?.relatedCapabilities || [];
  }

  getStats(): { total: number; active: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    let active = 0;
    for (const i of this.integrations.values()) {
      byType[i.type] = (byType[i.type] || 0) + 1;
      if (i.status === "active") active++;
    }
    return { total: this.integrations.size, active, byType };
  }
}

export const globalEnterpriseIntelligence = new EnterpriseIntelligenceModel();
