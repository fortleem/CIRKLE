/**
 * CIRKLE Brain AI — TGSE Seed Data
 * ============================================================================
 * Seeds TGSE with default policies, compliance profiles, and trust scores.
 * ============================================================================
 */

import type { Policy, ComplianceProfile, TrustScore } from "./types";

const now = new Date().toISOString();

// ── Default Policies ─────────────────────────────────────────────────────

export const seedPolicies: Policy[] = [
  // ── Financial policies (TEE) ────────────────────────────────────────
  {
    policyId: "policy.high-value-payment-approval",
    domain: "internal", name: "High-Value Payment Approval",
    description: "Payments above $10,000 require human approval",
    version: "1.0.0", rule: { type: "threshold", params: { max: 10000 } },
    enforcement: "require-approval", applicableCountries: ["*"], target: "tee",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
  {
    policyId: "policy.payment-permission",
    domain: "user", name: "Payment Permission Required",
    description: "Users must have pay:send permission for payments",
    version: "1.0.0", rule: { type: "permission-required", params: { permission: "pay:send" } },
    enforcement: "block", applicableCountries: ["*"], target: "tee",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
  // ── Privacy policies (all phases) ───────────────────────────────────
  {
    policyId: "policy.consent-required-ai",
    domain: "regulatory", name: "AI Consent Required",
    description: "AI personalization requires consent",
    version: "1.0.0", rule: { type: "consent-required", params: { consentPurpose: "ai_personalization" } },
    enforcement: "block", applicableCountries: ["*"], target: "crie",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
  {
    policyId: "policy.gdpr-data-minimization",
    domain: "regulatory", name: "GDPR Data Minimization",
    description: "Only process necessary personal data",
    version: "1.0.0", rule: { type: "custom", params: { check: "data-minimization" } },
    enforcement: "block", applicableCountries: ["EU", "GB"], target: "tee",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
  // ── Government policies ─────────────────────────────────────────────
  {
    policyId: "policy.government-submission-approval",
    domain: "country", name: "Government Submission Approval",
    description: "Government submissions require approval",
    version: "1.0.0", rule: { type: "custom", params: { trigger: "government-submission" } },
    enforcement: "require-approval", applicableCountries: ["EG", "SA", "AE"], target: "tee",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
  // ── Trust threshold policies ────────────────────────────────────────
  {
    policyId: "policy.partner-trust-threshold",
    domain: "enterprise", name: "Partner Trust Threshold",
    description: "Partners must have trust score >= 50",
    version: "1.0.0", rule: { type: "trust-threshold", params: { minScore: 50 } },
    enforcement: "warn", applicableCountries: ["*"], target: "uob",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
  // ── Risk threshold policies ─────────────────────────────────────────
  {
    policyId: "policy.risk-threshold-execution",
    domain: "internal", name: "Execution Risk Threshold",
    description: "Actions with critical risk are blocked",
    version: "1.0.0", rule: { type: "risk-threshold", params: { maxLevel: "high" } },
    enforcement: "block", applicableCountries: ["*"], target: "tee",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
  // ── AI safety policies ──────────────────────────────────────────────
  {
    policyId: "policy.hallucination-gating",
    domain: "internal", name: "Hallucination Gating",
    description: "AI outputs with confidence < 0.3 are blocked",
    version: "1.0.0", rule: { type: "threshold", params: { min: 0.3 } },
    enforcement: "block", applicableCountries: ["*"], target: "crie",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
  // ── Learning governance policies ────────────────────────────────────
  {
    policyId: "policy.learning-approval",
    domain: "enterprise", name: "Learning Proposal Approval",
    description: "High-impact learning proposals require approval",
    version: "1.0.0", rule: { type: "custom", params: { impact: "high" } },
    enforcement: "require-approval", applicableCountries: ["*"], target: "liee",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
  // ── Rate limiting ───────────────────────────────────────────────────
  {
    policyId: "policy.payment-rate-limit",
    domain: "internal", name: "Payment Rate Limit",
    description: "Max 50 payments per day",
    version: "1.0.0", rule: { type: "rate-limit", params: { maxInvocations: 50 } },
    enforcement: "block", applicableCountries: ["*"], target: "tee",
    active: true, createdAt: now, updatedAt: now, signed: true,
  },
];

// ── Compliance Profiles ──────────────────────────────────────────────────

export const seedComplianceProfiles: ComplianceProfile[] = [
  {
    profileId: "gdpr", name: "GDPR (General Data Protection Regulation)",
    description: "EU data protection regulation",
    type: "data-protection", applicableCountries: ["*"], version: "1.0.0", active: true,
    rules: [
      { ruleId: "gdpr-minimization", description: "Data minimization", check: "data-minimization" },
      { ruleId: "gdpr-consent", description: "Consent required", check: "consent-required" },
      { ruleId: "gdpr-encryption", description: "Encryption at rest", check: "encryption-at-rest" },
      { ruleId: "gdpr-audit", description: "Audit logging", check: "audit-logging" },
    ],
  },
  {
    profileId: "pci-dss", name: "PCI-DSS (Payment Card Industry)",
    description: "Payment card security standard",
    type: "payment", applicableCountries: ["*"], version: "1.0.0", active: true,
    rules: [
      { ruleId: "pci-card-handling", description: "No card number storage", check: "pci-dss-card-handling" },
      { ruleId: "pci-encryption", description: "Encryption in transit", check: "encryption-in-transit" },
      { ruleId: "pci-audit", description: "Audit logging", check: "audit-logging" },
    ],
  },
  {
    profileId: "cbe-digital-payments", name: "CBE Digital Payment Regulations",
    description: "Central Bank of Egypt digital payment rules",
    type: "financial", applicableCountries: ["EG"], version: "1.0.0", active: true,
    rules: [
      { ruleId: "cbe-kyc", description: "KYC required for large payments", check: "kyc-required" },
      { ruleId: "cbe-audit", description: "Audit logging", check: "audit-logging" },
    ],
  },
  {
    profileId: "zatca-e-invoicing", name: "ZATCA E-Invoicing",
    description: "Saudi ZATCA e-invoicing compliance",
    type: "financial", applicableCountries: ["SA"], version: "1.0.0", active: true,
    rules: [
      { ruleId: "zatca-audit", description: "Audit logging", check: "audit-logging" },
      { ruleId: "zatca-localization", description: "Localization required", check: "localization-required" },
    ],
  },
];

// ── Trust Scores ─────────────────────────────────────────────────────────

export const seedTrustScores: TrustScore[] = [
  { entityId: "partner.visa", entityType: "partner", score: 95, factors: [{ factor: "uptime", weight: 2, value: 99 }, { factor: "certification", weight: 3, value: 100 }, { factor: "history", weight: 1, value: 90 }], lastUpdated: now, certified: true, certificationExpiry: "2027-01-01", notes: "PCI-DSS certified" },
  { entityId: "partner.mastercard", entityType: "partner", score: 95, factors: [{ factor: "uptime", weight: 2, value: 99 }, { factor: "certification", weight: 3, value: 100 }, { factor: "history", weight: 1, value: 90 }], lastUpdated: now, certified: true, certificationExpiry: "2027-01-01" },
  { entityId: "partner.stripe", entityType: "partner", score: 90, factors: [{ factor: "uptime", weight: 2, value: 99 }, { factor: "certification", weight: 3, value: 95 }, { factor: "history", weight: 1, value: 80 }], lastUpdated: now, certified: true, certificationExpiry: "2027-06-01" },
  { entityId: "partner.fawry", entityType: "partner", score: 75, factors: [{ factor: "uptime", weight: 2, value: 90 }, { factor: "certification", weight: 3, value: 70 }, { factor: "history", weight: 1, value: 75 }], lastUpdated: now, certified: true, certificationExpiry: "2026-12-01" },
  { entityId: "partner.openai", entityType: "provider", score: 85, factors: [{ factor: "uptime", weight: 2, value: 95 }, { factor: "quality", weight: 3, value: 85 }, { factor: "history", weight: 1, value: 70 }], lastUpdated: now, certified: false },
  { entityId: "gov.eg.nida", entityType: "government-service", score: 80, factors: [{ factor: "uptime", weight: 2, value: 85 }, { factor: "official", weight: 3, value: 100 }, { factor: "history", weight: 1, value: 60 }], lastUpdated: now, certified: true },
  { entityId: "gov.sa.absher", entityType: "government-service", score: 85, factors: [{ factor: "uptime", weight: 2, value: 90 }, { factor: "official", weight: 3, value: 100 }, { factor: "history", weight: 1, value: 70 }], lastUpdated: now, certified: true },
  { entityId: "cirkle.travel", entityType: "capability-pack", score: 80, factors: [{ factor: "tests", weight: 2, value: 85 }, { factor: "reviews", weight: 1, value: 75 }], lastUpdated: now, certified: true },
  { entityId: "cirkle.payments", entityType: "capability-pack", score: 85, factors: [{ factor: "tests", weight: 2, value: 90 }, { factor: "reviews", weight: 1, value: 80 }], lastUpdated: now, certified: true },
  { entityId: "cirkle.gov", entityType: "capability-pack", score: 70, factors: [{ factor: "tests", weight: 2, value: 75 }, { factor: "reviews", weight: 1, value: 65 }], lastUpdated: now, certified: false },
];
