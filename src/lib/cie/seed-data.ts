/**
 * CIRKLE Brain AI — CIE Seed Data
 * ============================================================================
 * Seeds CIE with real CIRKLE-relevant data:
 *   - 6 countries (EG, SA, AE, US, GB, FR)
 *   - 8 government services (Egypt NIDA, Saudi Absher, UAE ICP, etc.)
 *   - 12 partners (Visa, Mastercard, Booking.com, Uber, etc.)
 *   - 6 enterprise integrations (SAP, Salesforce, Workday, etc.)
 *   - 12 ontology nodes (6 domains → categories)
 *   - Knowledge graph edges linking capabilities to countries/partners
 *   - Version info for 8 capabilities
 * ============================================================================
 */

import type { CountryIntelligence, GovernmentIntelligence, PartnerIntelligence, EnterpriseIntelligence, OntologyNode, CapabilityVersionInfo } from "./types";

// ── Countries ────────────────────────────────────────────────────────────

export const seedCountries: CountryIntelligence[] = [
  {
    countryCode: "EG", name: "Egypt", languages: ["ar", "en"], currencies: ["EGP"],
    timeZones: ["Africa/Cairo"],
    governmentAgencies: ["NIDA", "MOF", "ETA", "MOP"],
    identityProviders: ["NIDA"],
    paymentRails: ["ach", "rtgs", "mobile-money", "card"],
    taxSystem: "egyptian-tax-authority",
    digitalSignatureFramework: "qualified-electronic-signature",
    regulatoryConstraints: { "CBE": ["digital-payment-regulations", "data-localization"], "NTRA": ["telecom-regulations"] },
    complianceRules: ["cbe-digital-payment-regulations", "egyptian-data-protection-law"],
    availableCapabilityPacks: ["cirkle.travel", "cirkle.payments", "cirkle.gov"],
    regionalFeatureAvailability: { "payments": true, "travel": true, "government": true, "ai": true },
    localizationRequirements: ["arabic-first", "rtl-support"],
    status: "active",
  },
  {
    countryCode: "SA", name: "Saudi Arabia", languages: ["ar", "en"], currencies: ["SAR"],
    timeZones: ["Asia/Riyadh"],
    governmentAgencies: ["Absher", "ZATCA", "SAMA", "NCA"],
    identityProviders: ["Absher", "Nafath"],
    paymentRails: ["mada", "sarie", "card", "apple-pay"],
    taxSystem: "saudi-zatca",
    digitalSignatureFramework: "qualified-electronic-signature",
    regulatoryConstraints: { "SAMA": ["payment-regulations"], "ZATCA": ["e-invoicing", "vat-rules"], "NCA": ["cybersecurity-regulations"] },
    complianceRules: ["saudi-data-protection-law", "zatca-e-invoicing", "sama-payment-rules"],
    availableCapabilityPacks: ["cirkle.travel", "cirkle.payments", "cirkle.gov"],
    regionalFeatureAvailability: { "payments": true, "travel": true, "government": true, "ai": true },
    localizationRequirements: ["arabic-first", "rtl-support"],
    status: "active",
  },
  {
    countryCode: "AE", name: "United Arab Emirates", languages: ["ar", "en"], currencies: ["AED"],
    timeZones: ["Asia/Dubai"],
    governmentAgencies: ["ICP", "MOF", "FAB"],
    identityProviders: ["UAE Pass"],
    paymentRails: ["card", "rtgs", "apple-pay", "samsung-pay"],
    taxSystem: "uae-federal-tax-authority",
    digitalSignatureFramework: "qualified-electronic-signature",
    regulatoryConstraints: { "FTA": ["vat-regulations"], "UAE Data Office": ["data-protection"] },
    complianceRules: ["uae-data-protection-law", "uae-vat-rules"],
    availableCapabilityPacks: ["cirkle.travel", "cirkle.payments", "cirkle.gov"],
    regionalFeatureAvailability: { "payments": true, "travel": true, "government": true, "ai": true },
    localizationRequirements: ["arabic-english-bilingual"],
    status: "active",
  },
  {
    countryCode: "US", name: "United States", languages: ["en"], currencies: ["USD"],
    timeZones: ["America/New_York", "America/Chicago", "America/Los_Angeles"],
    governmentAgencies: ["IRS", "SSA", "DOS"],
    identityProviders: ["SSA"],
    paymentRails: ["ach", "wire", "card", "apple-pay", "google-pay"],
    taxSystem: "us-irs",
    digitalSignatureFramework: "esign-act",
    regulatoryConstraints: { "FINRA": ["financial-regulations"], "FTC": ["consumer-protection"] },
    complianceRules: ["ccpa", "pci-dss", "gramm-leach-bliley"],
    availableCapabilityPacks: ["cirkle.travel", "cirkle.payments"],
    regionalFeatureAvailability: { "payments": true, "travel": true, "government": false, "ai": true },
    localizationRequirements: ["english-first"],
    status: "active",
  },
  {
    countryCode: "GB", name: "United Kingdom", languages: ["en"], currencies: ["GBP"],
    timeZones: ["Europe/London"],
    governmentAgencies: ["HMRC", "HMPO", "NHS"],
    identityProviders: ["GOV.UK Verify"],
    paymentRails: ["faster-payments", "bacs", "chaps", "card"],
    taxSystem: "uk-hmrc",
    digitalSignatureFramework: "electronic-signature",
    regulatoryConstraints: { "FCA": ["financial-regulations"], "ICO": ["data-protection"] },
    complianceRules: ["uk-gdpr", "fca-regulations"],
    availableCapabilityPacks: ["cirkle.travel", "cirkle.payments"],
    regionalFeatureAvailability: { "payments": true, "travel": true, "government": false, "ai": true },
    localizationRequirements: ["english-first"],
    status: "active",
  },
  {
    countryCode: "FR", name: "France", languages: ["fr"], currencies: ["EUR"],
    timeZones: ["Europe/Paris"],
    governmentAgencies: ["DGFiP", "ANTS", "CNAM"],
    identityProviders: ["FranceConnect"],
    paymentRails: ["sepa", "card", "apple-pay"],
    taxSystem: "french-dgfip",
    digitalSignatureFramework: "qualified-electronic-signature",
    regulatoryConstraints: { "CNIL": ["data-protection"], "ACPR": ["financial-regulations"] },
    complianceRules: ["gdpr", "french-data-protection-act"],
    availableCapabilityPacks: ["cirkle.travel", "cirkle.payments"],
    regionalFeatureAvailability: { "payments": true, "travel": true, "government": false, "ai": true },
    localizationRequirements: ["french-first"],
    status: "active",
  },
];

// ── Government Services ──────────────────────────────────────────────────

export const seedGovernmentServices: GovernmentIntelligence[] = [
  {
    serviceId: "gov.eg.nida", name: "Egypt National ID (NIDA)", type: "national-identity",
    countryCode: "EG", agency: "NIDA", description: "Egyptian national identity verification",
    apiType: "rest", authMethod: "api-key", requiredCredentials: ["nida-api-key"],
    status: "active", complexity: "medium", relatedCapabilities: ["cirkle.gov.document-verification"],
  },
  {
    serviceId: "gov.eg.tax", name: "Egypt Tax Filing (ETA)", type: "tax-services",
    countryCode: "EG", agency: "ETA", description: "Egyptian Tax Authority e-filing",
    apiType: "rest", authMethod: "oauth2", requiredCredentials: ["eta-client-id", "eta-client-secret"],
    status: "active", complexity: "high", relatedCapabilities: ["cirkle.gov.tax-filing"],
  },
  {
    serviceId: "gov.sa.absher", name: "Saudi Absher", type: "national-identity",
    countryCode: "SA", agency: "Absher", description: "Saudi national identity + government services portal",
    apiType: "rest", authMethod: "oauth2", requiredCredentials: ["absher-client-id"],
    status: "active", complexity: "high", relatedCapabilities: ["cirkle.gov.document-verification"],
  },
  {
    serviceId: "gov.sa.zatca", name: "Saudi ZATCA E-Invoicing", type: "tax-services",
    countryCode: "SA", agency: "ZATCA", description: "Saudi Zakat, Tax and Customs Authority e-invoicing",
    apiType: "rest", authMethod: "oauth2", requiredCredentials: ["zatca-api-key", "zatca-certificate"],
    status: "active", complexity: "high", relatedCapabilities: ["cirkle.gov.tax-filing"],
  },
  {
    serviceId: "gov.ae.icp", name: "UAE ICP Identity", type: "national-identity",
    countryCode: "AE", agency: "ICP", description: "UAE Federal Authority for Identity and Citizenship",
    apiType: "rest", authMethod: "oauth2", requiredCredentials: ["icp-client-id"],
    status: "active", complexity: "high", relatedCapabilities: ["cirkle.gov.document-verification"],
  },
  {
    serviceId: "gov.ae.fts", name: "UAE Federal Tax Service", type: "tax-services",
    countryCode: "AE", agency: "FTA", description: "UAE Federal Tax Authority e-filing",
    apiType: "rest", authMethod: "oauth2", requiredCredentials: ["fta-credentials"],
    status: "active", complexity: "medium", relatedCapabilities: ["cirkle.gov.tax-filing"],
  },
  {
    serviceId: "gov.us.irs", name: "US IRS Tax Filing", type: "tax-services",
    countryCode: "US", agency: "IRS", description: "US Internal Revenue Service e-filing",
    apiType: "rest", authMethod: "oauth2", requiredCredentials: ["irs-client-id"],
    status: "beta", complexity: "high", relatedCapabilities: [],
  },
  {
    serviceId: "gov.eg.customs", name: "Egypt Customs", type: "customs",
    countryCode: "EG", agency: "MOF", description: "Egyptian Customs Authority",
    apiType: "rest", authMethod: "api-key", requiredCredentials: ["customs-api-key"],
    status: "beta", complexity: "high", relatedCapabilities: [],
  },
];

// ── Partners ─────────────────────────────────────────────────────────────

export const seedPartners: PartnerIntelligence[] = [
  { partnerId: "partner.visa", name: "Visa", category: "financial", operatingCountries: ["*"], capabilities: ["card-payment", "3d-secure"], interfaceType: "api", authMethod: "api-key", status: "active", slaUptime: 99.99, averageLatencyMs: 200, regions: ["global"], policies: ["pci-dss"] },
  { partnerId: "partner.mastercard", name: "Mastercard", category: "financial", operatingCountries: ["*"], capabilities: ["card-payment", "3d-secure"], interfaceType: "api", authMethod: "api-key", status: "active", slaUptime: 99.99, averageLatencyMs: 200, regions: ["global"], policies: ["pci-dss"] },
  { partnerId: "partner.stripe", name: "Stripe", category: "financial", operatingCountries: ["US", "GB", "FR", "AE"], capabilities: ["payment-processing", "subscriptions", "connect"], interfaceType: "api", authMethod: "api-key", status: "active", slaUptime: 99.99, averageLatencyMs: 300, regions: ["global"], policies: ["pci-dss", "psd2"] },
  { partnerId: "partner.fawry", name: "Fawry", category: "financial", operatingCountries: ["EG"], capabilities: ["payment-processing", "bill-payment", "mobile-wallet"], interfaceType: "api", authMethod: "api-key", status: "active", slaUptime: 99.9, averageLatencyMs: 500, regions: ["egypt"], policies: ["cbe-regulations"] },
  { partnerId: "partner.booking", name: "Booking.com", category: "travel", operatingCountries: ["*"], capabilities: ["hotel-search", "hotel-booking"], interfaceType: "api", authMethod: "api-key", status: "active", slaUptime: 99.9, averageLatencyMs: 400, regions: ["global"], policies: [] },
  { partnerId: "partner.amadeus", name: "Amadeus", category: "travel", operatingCountries: ["*"], capabilities: ["flight-search", "flight-booking", "hotel-search"], interfaceType: "api", authMethod: "oauth2", status: "active", slaUptime: 99.9, averageLatencyMs: 800, regions: ["global"], policies: [] },
  { partnerId: "partner.uber", name: "Uber", category: "travel", operatingCountries: ["US", "GB", "FR", "AE", "SA"], capabilities: ["ride-hailing", "delivery"], interfaceType: "api", authMethod: "oauth2", status: "active", slaUptime: 99.9, averageLatencyMs: 300, regions: ["global"], policies: [] },
  { partnerId: "partner.instacart", name: "Instacart", category: "commerce", operatingCountries: ["US", "GB"], capabilities: ["grocery-delivery"], interfaceType: "api", authMethod: "oauth2", status: "active", slaUptime: 99.5, averageLatencyMs: 600, regions: ["north-america"], policies: [] },
  { partnerId: "partner.watsonx", name: "IBM Watsonx", category: "ai", operatingCountries: ["*"], capabilities: ["translation", "ocr", "speech-to-text", "text-to-speech", "vision"], interfaceType: "api", authMethod: "api-key", status: "active", slaUptime: 99.9, averageLatencyMs: 500, regions: ["global"], policies: [] },
  { partnerId: "partner.openai", name: "OpenAI", category: "ai", operatingCountries: ["*"], capabilities: ["text-generation", "vision", "speech", "embeddings"], interfaceType: "api", authMethod: "api-key", status: "active", slaUptime: 99.9, averageLatencyMs: 1000, regions: ["global"], policies: [] },
  { partnerId: "partner.twilio", name: "Twilio", category: "communications", operatingCountries: ["*"], capabilities: ["sms", "voice", "video", "messaging"], interfaceType: "api", authMethod: "api-key", status: "active", slaUptime: 99.95, averageLatencyMs: 200, regions: ["global"], policies: [] },
  { partnerId: "partner.sendgrid", name: "SendGrid", category: "communications", operatingCountries: ["*"], capabilities: ["email"], interfaceType: "api", authMethod: "api-key", status: "active", slaUptime: 99.9, averageLatencyMs: 300, regions: ["global"], policies: [] },
];

// ── Enterprise Integrations ──────────────────────────────────────────────

export const seedEnterpriseIntegrations: EnterpriseIntelligence[] = [
  { integrationId: "enterprise.sap-erp", name: "SAP ERP", type: "erp", vendor: "SAP", description: "SAP Enterprise Resource Planning", availableCountries: ["*"], interfaceType: "connector", requiredPermissions: ["enterprise:erp"], status: "active", relatedCapabilities: [], scale: "enterprise" },
  { integrationId: "enterprise.salesforce-crm", name: "Salesforce CRM", type: "crm", vendor: "Salesforce", description: "Salesforce Customer Relationship Management", availableCountries: ["*"], interfaceType: "api", requiredPermissions: ["enterprise:crm"], status: "active", relatedCapabilities: [], scale: "enterprise" },
  { integrationId: "enterprise.workday-hr", name: "Workday HR", type: "hr", vendor: "Workday", description: "Workday Human Resources", availableCountries: ["*"], interfaceType: "api", requiredPermissions: ["enterprise:hr"], status: "active", relatedCapabilities: [], scale: "enterprise" },
  { integrationId: "enterprise.quickbooks", name: "QuickBooks", type: "accounting", vendor: "Intuit", description: "QuickBooks Accounting", availableCountries: ["US", "GB", "AE"], interfaceType: "api", requiredPermissions: ["enterprise:accounting"], status: "active", relatedCapabilities: [], scale: "medium" },
  { integrationId: "enterprise.okta", name: "Okta", type: "identity", vendor: "Okta", description: "Okta Identity Management", availableCountries: ["*"], interfaceType: "api", requiredPermissions: ["enterprise:identity"], status: "active", relatedCapabilities: [], scale: "enterprise" },
  { integrationId: "enterprise.slack", name: "Slack", type: "collaboration", vendor: "Salesforce", description: "Slack Collaboration Platform", availableCountries: ["*"], interfaceType: "api", requiredPermissions: ["enterprise:collaboration"], status: "active", relatedCapabilities: [], scale: "enterprise" },
];

// ── Ontology nodes ───────────────────────────────────────────────────────

export const seedOntologyNodes: OntologyNode[] = [
  // Domains
  { nodeId: "domain.financial", level: "domain", label: "Financial", parentId: null, childIds: [], description: "Financial services domain" },
  { nodeId: "domain.travel", level: "domain", label: "Travel", parentId: null, childIds: [], description: "Travel services domain" },
  { nodeId: "domain.commerce", level: "domain", label: "Commerce", parentId: null, childIds: [], description: "Commerce domain" },
  { nodeId: "domain.social", level: "domain", label: "Social", parentId: null, childIds: [], description: "Social domain" },
  { nodeId: "domain.government", level: "domain", label: "Government", parentId: null, childIds: [], description: "Government services domain" },
  { nodeId: "domain.ai", level: "domain", label: "AI", parentId: null, childIds: [], description: "AI services domain" },
  // Categories under financial
  { nodeId: "category.payments", level: "category", label: "Payments", parentId: "domain.financial", childIds: [], description: "Payment capabilities" },
  { nodeId: "category.banking", level: "category", label: "Banking", parentId: "domain.financial", childIds: [], description: "Banking capabilities" },
  // Categories under travel
  { nodeId: "category.flights", level: "category", label: "Flights", parentId: "domain.travel", childIds: [], description: "Flight capabilities" },
  { nodeId: "category.hotels", level: "category", label: "Hotels", parentId: "domain.travel", childIds: [], description: "Hotel capabilities" },
  // Categories under social
  { nodeId: "category.messaging", level: "category", label: "Messaging", parentId: "domain.social", childIds: [], description: "Messaging capabilities" },
  { nodeId: "category.media", level: "category", label: "Media", parentId: "domain.social", childIds: [], description: "Media sharing capabilities" },
];

// ── Version info for capabilities ────────────────────────────────────────

export const seedVersionInfo: CapabilityVersionInfo[] = [
  { capabilityId: "pay.transfer-money", currentVersion: "1.0.0", versionHistory: [{ version: "1.0.0", releaseDate: "2026-01-01", changes: "Initial release" }], minCompatibleVersion: "1.0.0", deprecated: false, rolloutStage: "general-availability", regionalAvailability: { EG: true, SA: true, AE: true, US: true, GB: true, FR: true } },
  { capabilityId: "pay.merchant-payment", currentVersion: "1.0.0", versionHistory: [{ version: "1.0.0", releaseDate: "2026-01-01", changes: "Initial release" }], minCompatibleVersion: "1.0.0", deprecated: false, rolloutStage: "general-availability", regionalAvailability: { EG: true, SA: true, AE: true, US: true, GB: true, FR: true } },
  { capabilityId: "travel.search-flights", currentVersion: "1.0.0", versionHistory: [{ version: "1.0.0", releaseDate: "2026-01-01", changes: "Initial release" }], minCompatibleVersion: "1.0.0", deprecated: false, rolloutStage: "general-availability", regionalAvailability: { EG: true, SA: true, AE: true, US: true, GB: true, FR: true } },
  { capabilityId: "travel.check-visa", currentVersion: "1.0.0", versionHistory: [{ version: "1.0.0", releaseDate: "2026-01-01", changes: "Initial release" }], minCompatibleVersion: "1.0.0", deprecated: false, rolloutStage: "general-availability", regionalAvailability: { EG: true, SA: true, AE: true, US: true, GB: true, FR: true } },
  { capabilityId: "cirkle.travel.book-flight", currentVersion: "1.0.0", versionHistory: [{ version: "1.0.0", releaseDate: "2026-07-01", changes: "Initial release via PCPF" }], minCompatibleVersion: "1.0.0", deprecated: false, rolloutStage: "general-availability", regionalAvailability: { EG: true, SA: true, AE: true, US: true, GB: true, FR: true } },
  { capabilityId: "cirkle.gov.document-verification", currentVersion: "1.0.0", versionHistory: [{ version: "1.0.0", releaseDate: "2026-07-01", changes: "Initial release via PCPF" }], minCompatibleVersion: "1.0.0", deprecated: false, rolloutStage: "beta", regionalAvailability: { EG: true, SA: true, AE: true, US: false, GB: false, FR: false } },
  { capabilityId: "cirkle.gov.tax-filing", currentVersion: "1.0.0", versionHistory: [{ version: "1.0.0", releaseDate: "2026-07-01", changes: "Initial release via PCPF" }], minCompatibleVersion: "1.0.0", deprecated: false, rolloutStage: "beta", regionalAvailability: { EG: true, SA: true, AE: false, US: false, GB: false, FR: false } },
  { capabilityId: "cirkle.payments.recurring-payment", currentVersion: "1.0.0", versionHistory: [{ version: "1.0.0", releaseDate: "2026-07-01", changes: "Initial release via PCPF" }], minCompatibleVersion: "1.0.0", deprecated: false, rolloutStage: "general-availability", regionalAvailability: { EG: true, SA: true, AE: true, US: true, GB: true, FR: true } },
];
