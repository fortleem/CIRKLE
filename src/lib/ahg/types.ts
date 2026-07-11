/**
 * CIRKLE Brain AI — Account Health Guardian (AHG) Types
 * ============================================================================
 *
 * The Account Health Guardian enables CIRKLE Brain AI to automatically
 * diagnose account problems and propose fixes — instead of users sending
 * for help, the Brain detects, diagnoses, proposes, and (with consent)
 * executes fixes.
 *
 * AHG leverages the existing 9-phase architecture:
 *   - GCIE: environmental context (what's happening around the user)
 *   - PMB: user context (history, verified status, preferences)
 *   - CRIE: reasoning about the problem (root cause analysis)
 *   - CIE: capability availability (what can fix this?)
 *   - IRDE: ranking possible fixes
 *   - UOB: planning the fix execution
 *   - TGSE: validating the fix is safe + policy-compliant
 *   - TEE: executing the fix (with user consent)
 *   - LIEE: learning from the fix outcome
 *
 * AHG does NOT duplicate any phase's responsibilities. It orchestrates
 * them for the specific use case of account problem resolution.
 * ============================================================================
 */

export type ProblemType =
  | "payment-failed" // payment was declined or failed
  | "account-locked" // account is locked or restricted
  | "identity-verification-needed" // KYC/identity verification required
  | "feature-unavailable" // feature not available in user's region
  | "permission-missing" // user lacks a required permission
  | "consent-missing" // user hasn't granted required consent
  | "workflow-broken" // a workflow the user tried failed
  | "capability-unavailable" // a capability is down or unavailable
  | "configuration-error" // misconfiguration in user settings
  | "session-expired" // session timed out
  | "rate-limited" // user hit a rate limit
  | "unknown"; // undiagnosed problem

export type ProblemSeverity = "low" | "medium" | "high" | "critical";

export type ProblemStatus = "detected" | "diagnosed" | "fix-proposed" | "fix-consented" | "fix-executing" | "resolved" | "unresolvable" | "user-declined";

export interface AccountProblem {
  /** Unique problem id. */
  problemId: string;
  /** Problem type. */
  type: ProblemType;
  /** Severity. */
  severity: ProblemSeverity;
  /** Current status. */
  status: ProblemStatus;
  /** User experiencing the problem. */
  userId: string;
  /** When the problem was detected. */
  detectedAt: string;
  /** Human-readable description. */
  description: string;
  /** Root cause diagnosis. */
  rootCause?: RootCause;
  /** Proposed fixes. */
  proposedFixes?: ProposedFix[];
  /** Consent state. */
  consent?: FixConsent;
  /** Execution result. */
  executionResult?: { executionId: string; state: string; summary: string };
  /** Resolution timestamp. */
  resolvedAt?: string;
  /** Diagnostic metadata. */
  metadata: Record<string, unknown>;
}

export interface RootCause {
  /** The diagnosed root cause. */
  cause: string;
  /** Confidence in the diagnosis (0-1). */
  confidence: number;
  /** Which phases contributed to the diagnosis. */
  contributingPhases: string[];
  /** Evidence supporting the diagnosis. */
  evidence: { phase: string; finding: string }[];
  /** Recommended action category. */
  recommendedAction: string;
}

export interface ProposedFix {
  /** Unique fix id. */
  fixId: string;
  /** Human-readable title. */
  title: string;
  /** Description of what the fix does. */
  description: string;
  /** The UOB execution plan for this fix (if applicable). */
  planId?: string;
  /** Capabilities the fix uses. */
  capabilities: string[];
  /** Estimated impact. */
  impact: "low" | "medium" | "high";
  /** Whether the fix is reversible. */
  reversible: boolean;
  /** Whether the fix requires user consent. */
  requiresConsent: boolean;
  /** TGSE governance decision for this fix. */
  governanceStatus?: "approved" | "denied" | "requires-approval";
  /** Fix confidence score (0-1). */
  confidence: number;
}

export interface FixConsent {
  /** Whether the user consented to the fix. */
  consented: boolean;
  /** Which fix was consented to. */
  fixId: string;
  /** When consent was given. */
  consentedAt: string;
  /** User notes. */
  notes?: string;
}

export interface DiagnosticInput {
  userId: string;
  /** The problem the user is experiencing (free text or structured). */
  problemDescription: string;
  /** Optional: explicit problem type hint. */
  problemTypeHint?: ProblemType;
  /** User's country. */
  country?: string;
  /** User's city. */
  city?: string;
  /** User permissions. */
  userPermissions?: string[];
  /** Consent scope. */
  consentScope?: string[];
  /** Recent error context (e.g., error message, failed capability). */
  errorContext?: Record<string, unknown>;
}

export interface DiagnosticResult {
  problem: AccountProblem;
  /** Whether the problem was successfully diagnosed. */
  diagnosed: boolean;
  /** The proposed fixes (if any). */
  fixes: ProposedFix[];
  /** Next steps for the user. */
  nextSteps: string[];
}

export interface AHGStatus {
  name: string;
  status: string;
  problemsDetected: number;
  problemsResolved: number;
  autoFixRate: number;
  averageResolutionTimeMs: number;
}

export const AHG_SCHEMA_VERSION = 1;
