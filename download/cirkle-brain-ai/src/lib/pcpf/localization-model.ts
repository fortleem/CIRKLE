/**
 * CIRKLE Brain AI — PCPF Localization Model
 * ============================================================================
 *
 * Country-specific extensions without changing the core AI. Packs provide:
 *   - Local workflows (country-specific workflow template overrides)
 *   - Government integrations (country-specific adapters)
 *   - Payment methods (country-specific payment capabilities)
 *   - Language resources (translations)
 *   - Compliance rules (country-specific regulatory requirements)
 * ============================================================================
 */

import type { LocalizationResource } from "./types";

// ── Localization Model ───────────────────────────────────────────────────

export class LocalizationModel {
  /**
   * Find the best-matching localization for a given language + country.
   * Priority: exact language+country match > language-only match > default.
   */
  resolve(localizations: LocalizationResource[], language: string, country?: string): LocalizationResource | null {
    // 1. Exact language + country match.
    if (country) {
      const exact = localizations.find((l) => l.language === language && l.country === country);
      if (exact) return exact;
    }

    // 2. Language-only match.
    const langOnly = localizations.find((l) => l.language === language && !l.country);
    if (langOnly) return langOnly;

    // 3. Default to English (no country).
    const en = localizations.find((l) => l.language === "en" && !l.country);
    if (en) return en;

    // 4. First available.
    return localizations[0] || null;
  }

  /**
   * Translate a key for a given language + country.
   */
  translate(localizations: LocalizationResource[], key: string, language: string, country?: string): string {
    const loc = this.resolve(localizations, language, country);
    if (!loc) return key;
    return loc.strings[key] || key;
  }

  /**
   * Get country-specific workflow overrides.
   */
  getWorkflowOverrides(localizations: LocalizationResource[], country: string): string[] {
    const loc = localizations.find((l) => l.country === country);
    return loc?.workflowOverrides || [];
  }

  /**
   * Get country-specific compliance rules.
   */
  getComplianceRules(localizations: LocalizationResource[], country: string): string[] {
    const loc = localizations.find((l) => l.country === country);
    return loc?.complianceRules || [];
  }

  /**
   * Check if a pack supports a given country.
   */
  supportsCountry(supportedRegions: string[], country: string): boolean {
    return supportedRegions.includes("*") || supportedRegions.includes(country);
  }

  /**
   * Get all languages supported by the pack.
   */
  getSupportedLanguages(localizations: LocalizationResource[]): string[] {
    const languages = new Set<string>();
    for (const loc of localizations) {
      languages.add(loc.language);
    }
    return Array.from(languages);
  }

  /**
   * Get all countries with specific localization.
   */
  getSupportedCountries(localizations: LocalizationResource[]): string[] {
    const countries = new Set<string>();
    for (const loc of localizations) {
      if (loc.country) countries.add(loc.country);
    }
    return Array.from(countries);
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalLocalizationModel = new LocalizationModel();
