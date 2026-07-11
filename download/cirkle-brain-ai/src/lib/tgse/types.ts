/**
 * CIRKLE Brain AI — Trust, Governance & Safety Engine (TGSE) Types
 * ============================================================================
 *
 * Phase 9 — Trust, Governance & Safety Engine
 *
 * TGSE is the constitutional guardian of CIRKLE Brain AI. It ensures every
 * AI-generated decision, recommendation, orchestration plan, execution
 * request, learning update, and capability invocation is trustworthy,
 * policy-compliant, privacy-preserving, secure, explainable, and safe.
 *
 * TGSE does NOT perform reasoning (CRIE's job).
 * TGSE does NOT recommend (IRDE's job).
 * TGSE does NOT orchestrate (UOB's job).
 * TGSE does NOT execute (TEE's job).
 * TGSE VALIDATES, GOVERNS, AUTHORIZES, MONITORS, and AUDITS.
 *
 * TGSE owns: AI governance, policy management, decision governance, policy
 * evaluation, permission validation, trust scoring, safety validation,
 * compliance verification, privacy enforcement, security authorization,
 * risk management, human oversight, explainability, audit.
 * ============================================================================
 */

// ── Governance Decision ──────────────────────────────────────────────────

export type GovernanceDecisionType =
  | "approve" // action approved
  | "deny" // action denied
  | "require-approval" // needs human approval before proceeding
  | "warn" // approved with warnings
  | "defer"; // cannot decide — needs more info

export type GovernanceTarget =
  | "crie" // reasoning validation
  | "irde" // recommendation validation
  | "uob" // plan validation
  | "tee" // execution validation
  | "liee" // learning validation
  | "cie" // capability trust validation
  | "capability-invocation" // runtime capability invocation
  | "policy-change"; // policy change validation

export interface GovernanceDecision {
  /** Unique decision id. */
  decisionId: string;
  /** The target phase/action being governed. */
  target: GovernanceTarget;
  /** The decision: approve, deny, require-approval, warn, defer. */
  decision: GovernanceDecisionType;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Which policies were evaluated. */
  policiesEvaluated: string[];
  /** Which permissions were required + their status. */
  permissionsChecked: { permission: string; satisfied: boolean }[];
  /** Risks identified. */
  risksIdentified: { type: RiskType; level: RiskLevel; description: string }[];
  /** Whether human approval is required. */
  requiresHumanApproval: boolean;
  /** Approval request id (if required). */
  approvalRequestId?: string;
  /** Structured explanation. */
  explanation: GovernanceExplanation;
  /** Confidence in the decision (0-1). */
  confidence: number;
  /** The original action context (for audit). */
  actionContext: Record<string, unknown>;
}

// ── Governance Explanation ───────────────────────────────────────────────

export interface GovernanceExplanation {
  /** Why the decision was made. */
  summary: string;
  /** Which policies drove the decision. */
  policyReasons: string[];
  /** Which permissions drove the decision. */
  permissionReasons: string[];
  /** Which risks drove the decision. */
  riskReasons: string[];
  /** Which approvals are required (if any). */
  approvalReasons: string[];
}

// ── Policy ───────────────────────────────────────────────────────────────

export type PolicyDomain =
  | "user" // user-level policies
  | "organization" // org-level policies
  | "enterprise" // enterprise policies
  | "regional" // regional policies
  | "country" // country-specific policies
  | "industry" // industry policies (finance, healthcare, etc.)
  | "regulatory" // regulatory compliance (GDPR, PCI-DSS, etc.)
  | "internal"; // internal CIRKLE policies

export type PolicyEnforcement =
  | "block" // hard block — action denied
  | "require-approval" // requires human approval
  | "warn" // warn but allow
  | "log"; // log only, no enforcement

export interface Policy {
  /** Unique policy id. */
  policyId: string;
  /** Policy domain. */
  domain: PolicyDomain;
  /** Human-readable name. */
  name: string;
  /** Description. */
  description: string;
  /** Version (semver). */
  version: string;
  /** The rule (declarative, data-driven). */
  rule: PolicyRule;
  /** Enforcement level. */
  enforcement: PolicyEnforcement;
  /** Countries where this policy applies (or "*" for all). */
  applicableCountries: string[];
  /** The target phase this policy governs. */
  target: GovernanceTarget;
  /** Whether this policy is active. */
  active: boolean;
  /** When this policy was created. */
  createdAt: string;
  /** When this policy was last updated. */
  updatedAt: string;
  /** Whether this policy is signed (cryptographic integrity). */
  signed: boolean;
}

export interface PolicyRule {
  /** The rule type. */
  type:
    | "permission-required" // user must have a permission
    | "consent-required" // consent must be granted
    | "threshold" // a value must be within a threshold
    | "country-allowed" // action allowed only in specific countries
    | "country-blocked" // action blocked in specific countries
    | "rate-limit" // invocation rate limit
    | "time-window" // time-based restriction
    | "risk-threshold" // risk must be below threshold
    | "trust-threshold" // trust score must be above threshold
    | "custom"; // custom rule (evaluated by a registered evaluator)
  /** Rule parameters. */
  params: Record<string, unknown>;
}

// ── Trust Score ──────────────────────────────────────────────────────────

export type TrustEntityType =
  | "partner"
  | "government-service"
  | "external-api"
  | "capability-pack"
  | "provider"
  | "enterprise-connector";

export interface TrustScore {
  /** The entity being scored. */
  entityId: string;
  /** Entity type. */
  entityType: TrustEntityType;
  /** Trust score (0-100, higher = more trusted). */
  score: number;
  /** Factors contributing to the score. */
  factors: { factor: string; weight: number; value: number }[];
  /** When the score was last updated. */
  lastUpdated: string;
  /** Whether the entity is certified. */
  certified: boolean;
  /** Certification expiry (if certified). */
  certificationExpiry?: string;
  /** Notes. */
  notes?: string;
}

// ── Risk Assessment ──────────────────────────────────────────────────────

export type RiskType =
  | "financial" // financial risk (large payments, fraud)
  | "operational" // operational risk (system failures, downtime)
  | "privacy" // privacy risk (data exposure, consent gaps)
  | "regulatory" // regulatory risk (compliance violations)
  | "fraud" // fraud indicators
  | "reputation" // reputation risk
  | "ai-misuse"; // AI misuse indicators

export type RiskLevel = "negligible" | "low" | "medium" | "high" | "critical";

export interface RiskAssessment {
  /** Unique assessment id. */
  assessmentId: string;
  /** The action being assessed. */
  target: GovernanceTarget;
  /** Overall risk level (max of all identified risks). */
  overallLevel: RiskLevel;
  /** Individual risks identified. */
  risks: { type: RiskType; level: RiskLevel; description: string; mitigation?: string }[];
  /** Whether the action is safe to proceed. */
  safeToProceed: boolean;
  /** Recommended mitigations. */
  mitigations: string[];
  /** Timestamp. */
  timestamp: string;
}

// ── Compliance ───────────────────────────────────────────────────────────

export interface ComplianceProfile {
  /** Profile id (e.g. "gdpr", "pci-dss", "cbe-digital-payments"). */
  profileId: string;
  /** Human-readable name. */
  name: string;
  /** Description. */
  description: string;
  /** Compliance type. */
  type:
    | "data-protection"
    | "financial"
    | "consumer-protection"
    | "electronic-transactions"
    | "identity-verification"
    | "payment"
    | "healthcare"
    | "education"
    | "country-specific";
  /** Countries where this profile applies. */
  applicableCountries: string[];
  /** Compliance rules. */
  rules: { ruleId: string; description: string; check: string }[];
  /** Version. */
  version: string;
  /** Active. */
  active: boolean;
}

export interface ComplianceResult {
  /** The profile evaluated. */
  profileId: string;
  /** Whether the action complies. */
  compliant: boolean;
  /** Violations found. */
  violations: string[];
  /** Rules checked. */
  rulesChecked: number;
  /** Rules passed. */
  rulesPassed: number;
  /** Timestamp. */
  timestamp: string;
}

// ── AI Safety ────────────────────────────────────────────────────────────

export type SafetyCheckType =
  | "prompt-injection" // prompt injection detection
  | "unsafe-instruction" // unsafe instruction detection
  | "malicious-workflow" // malicious workflow detection
  | "data-leakage" // data leakage prevention
  | "capability-misuse" // capability misuse detection
  | "privilege-escalation" // privilege escalation prevention
  | "hallucination-gating" // hallucination confidence gating
  | "high-impact-decision"; // high-impact decision controls

export interface SafetyCheckResult {
  /** The check type. */
  checkType: SafetyCheckType;
  /** Whether the check passed (safe). */
  passed: boolean;
  /** Severity if failed. */
  severity: "info" | "low" | "medium" | "high" | "critical";
  /** Description. */
  description: string;
  /** Detected issues. */
  issues: string[];
  /** Recommended action. */
  recommendedAction: "allow" | "block" | "require-approval" | "sanitize";
}

// ── Human Approval ───────────────────────────────────────────────────────

export type ApprovalStatus =
  | "pending" // awaiting approval
  | "approved" // approved
  | "rejected" // rejected
  | "expired" // expired without action
  | "escalated"; // escalated to higher authority

export type ApprovalTrigger =
  | "high-value-payment" // payment above threshold
  | "government-submission" // government document submission
  | "legal-document-signing" // legal document signing
  | "enterprise-approval" // enterprise workflow approval
  | "sensitive-data-access" // sensitive personal data access
  | "high-risk-ai-action" // high-risk AI action
  | "policy-required"; // policy requires approval

export interface ApprovalRequest {
  /** Unique request id. */
  requestId: string;
  /** What triggered the approval. */
  trigger: ApprovalTrigger;
  /** The action requiring approval. */
  target: GovernanceTarget;
  /** The action context. */
  actionContext: Record<string, unknown>;
  /** Required approver role. */
  requiredApproverRole: string;
  /** Current status. */
  status: ApprovalStatus;
  /** Who approved/rejected (if any). */
  approver?: string;
  /** Approval/rejection timestamp. */
  decidedAt?: string;
  /** Approval/rejection notes. */
  notes?: string;
  /** When the request was created. */
  createdAt: string;
  /** Expiry time (if not decided by then, status → expired). */
  expiresAt?: string;
  /** Escalation chain (roles to escalate to if not decided). */
  escalationChain: string[];
}

// ── Audit ────────────────────────────────────────────────────────────────

export type AuditEventType =
  | "governance-decision"
  | "policy-evaluated"
  | "permission-checked"
  | "trust-score-updated"
  | "risk-assessed"
  | "compliance-checked"
  | "safety-check"
  | "approval-requested"
  | "approval-decided"
  | "policy-changed"
  | "constitutional-rule-violation";

export interface AuditRecord {
  /** Unique audit record id (immutable). */
  auditId: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Event type. */
  eventType: AuditEventType;
  /** The target phase/action. */
  target: GovernanceTarget;
  /** The governance decision (if applicable). */
  decision?: GovernanceDecisionType;
  /** Description. */
  description: string;
  /** Structured data (for traceability). */
  data: Record<string, unknown>;
  /** Cryptographic hash (tamper detection). */
  hash: string;
  /** Previous record hash (chain). */
  previousHash?: string;
}

// ── TGSE Status ──────────────────────────────────────────────────────────

export interface TGSEStatus {
  phase: string;
  name: string;
  status: string;
  policiesActive: number;
  complianceProfiles: number;
  trustEntities: number;
  auditRecords: number;
  pendingApprovals: number;
  governanceDecisions: number;
}

// ── Schema version ───────────────────────────────────────────────────────

export const TGSE_SCHEMA_VERSION = 1;
