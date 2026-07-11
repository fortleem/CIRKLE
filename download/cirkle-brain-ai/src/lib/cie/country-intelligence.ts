/**
 * CIRKLE Brain AI — CIE Country Intelligence
 * ============================================================================
 * Data-driven country model. Country behavior is configurable, not hardcoded.
 * Each country has: languages, currencies, time zones, government agencies,
 * identity providers, payment rails, tax systems, regulatory constraints,
 * compliance rules, available capability packs, regional feature availability.
 * ============================================================================
 */

import type { CountryIntelligence } from "./types";

export class CountryIntelligenceModel {
  private countries = new Map<string, CountryIntelligence>();

  register(country: CountryIntelligence): void {
    this.countries.set(country.countryCode, country);
  }

  get(countryCode: string): CountryIntelligence | null {
    return this.countries.get(countryCode) || null;
  }

  list(): CountryIntelligence[] {
    return Array.from(this.countries.values());
  }

  listActive(): CountryIntelligence[] {
    return this.list().filter((c) => c.status === "active");
  }

  supportsLanguage(countryCode: string, language: string): boolean {
    const c = this.get(countryCode);
    return c ? c.languages.includes(language) : false;
  }

  supportsCurrency(countryCode: string, currency: string): boolean {
    const c = this.get(countryCode);
    return c ? c.currencies.includes(currency) : false;
  }

  supportsPaymentRail(countryCode: string, rail: string): boolean {
    const c = this.get(countryCode);
    return c ? c.paymentRails.includes(rail) : false;
  }

  getComplianceRules(countryCode: string): string[] {
    return this.get(countryCode)?.complianceRules || [];
  }

  getRegulatoryConstraints(countryCode: string): Record<string, string[]> {
    return this.get(countryCode)?.regulatoryConstraints || {};
  }

  isFeatureAvailable(countryCode: string, feature: string): boolean {
    const c = this.get(countryCode);
    return c ? c.regionalFeatureAvailability[feature] === true : false;
  }

  getAvailablePacks(countryCode: string): string[] {
    return this.get(countryCode)?.availableCapabilityPacks || [];
  }

  getStats(): { total: number; active: number; byStatus: Record<string, number> } {
    const byStatus: Record<string, number> = {};
    let active = 0;
    for (const c of this.countries.values()) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (c.status === "active") active++;
    }
    return { total: this.countries.size, active, byStatus };
  }
}

export const globalCountryIntelligence = new CountryIntelligenceModel();
