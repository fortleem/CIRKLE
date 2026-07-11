/**
 * CIRKLE Brain AI — Account Health Guardian (AHG) Diagnostic Engine
 * ============================================================================
 *
 * Detects account problems and diagnoses root causes using the existing
 * 9-phase architecture. The diagnostic engine does NOT execute fixes — it
 * identifies what's wrong and why, then proposes fixes for user consent.
 *
 * Diagnostic pipeline:
 *   1. Classify the problem type (from description + error context)
 *   2. Gather context (GCIE environment, PMB user history, CIE capability availability)
 *   3. Reason about root cause (CRIE-style heuristic reasoning)
 *   4. Check capability availability (CIE: can we fix this?)
 *   5. Check permissions + consent (what does the user need?)
 *   6. Propose fixes (ranked by IRDE-style scoring)
 * ============================================================================
 */

import type { AccountProblem, DiagnosticInput, DiagnosticResult, RootCause, ProposedFix, ProblemType, ProblemSeverity } from "./types";

// ── Problem classification patterns ──────────────────────────────────────

interface ProblemPattern {
  type: ProblemType;
  keywords: string[];
  severity: ProblemSeverity;
  description: string;
}

const PROBLEM_PATTERNS: ProblemPattern[] = [
  { type: "payment-failed", keywords: ["payment", "failed", "declined", "transaction", "card rejected"], severity: "high", description: "Payment failed or was declined" },
  { type: "account-locked", keywords: ["locked", "blocked", "restricted", "suspended", "banned"], severity: "critical", description: "Account is locked or restricted" },
  { type: "identity-verification-needed", keywords: ["verify", "verification", "kyc", "identity", "nida", "absher", "passport"], severity: "high", description: "Identity verification required" },
  { type: "feature-unavailable", keywords: ["not available", "unavailable", "not supported", "region", "country"], severity: "medium", description: "Feature not available in user's region" },
  { type: "permission-missing", keywords: ["permission", "denied", "unauthorized", "not allowed", "forbidden"], severity: "medium", description: "Missing required permission" },
  { type: "consent-missing", keywords: ["consent", "opt-in", "authorize", "allow", "privacy"], severity: "medium", description: "Required consent not granted" },
  { type: "workflow-broken", keywords: ["workflow", "failed", "error", "couldn't complete", "something went wrong"], severity: "medium", description: "Workflow execution failed" },
  { type: "capability-unavailable", keywords: ["down", "maintenance", "offline", "not responding", "timeout"], severity: "high", description: "Capability is unavailable" },
  { type: "configuration-error", keywords: ["settings", "configuration", "misconfigured", "wrong", "invalid"], severity: "low", description: "Configuration error" },
  { type: "session-expired", keywords: ["session", "expired", "logged out", "timeout", "re-login"], severity: "low", description: "Session expired" },
  { type: "rate-limited", keywords: ["rate limit", "too many", "throttle", "slow down"], severity: "low", description: "Rate limit exceeded" },
];

// ── Diagnostic Engine ────────────────────────────────────────────────────

export class DiagnosticEngine {
  /**
   * Diagnose an account problem.
   */
  async diagnose(input: DiagnosticInput): Promise<DiagnosticResult> {
    const problemId = `prob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    // ── Step 1: Classify the problem ────────────────────────────────────
    const problemType = input.problemTypeHint || this.classifyProblem(input.problemDescription, input.errorContext);
    const severity = this.getSeverity(problemType);

    const problem: AccountProblem = {
      problemId,
      type: problemType,
      severity,
      status: "detected",
      userId: input.userId,
      detectedAt: now,
      description: input.problemDescription,
      metadata: { errorContext: input.errorContext || {} },
    };

    // ── Step 2: Diagnose root cause ─────────────────────────────────────
    const rootCause = this.diagnoseRootCause(problemType, input);
    problem.rootCause = rootCause;
    problem.status = "diagnosed";

    // ── Step 3: Propose fixes ───────────────────────────────────────────
    const fixes = this.proposeFixes(problemType, rootCause, input);
    problem.proposedFixes = fixes;
    if (fixes.length > 0) problem.status = "fix-proposed";

    // ── Step 4: Generate next steps ─────────────────────────────────────
    const nextSteps = this.generateNextSteps(problemType, rootCause, fixes);

    return {
      problem,
      diagnosed: rootCause.confidence > 0.3,
      fixes,
      nextSteps,
    };
  }

  /**
   * Classify the problem type from the description + error context.
   */
  private classifyProblem(description: string, errorContext?: Record<string, unknown>): ProblemType {
    const lower = description.toLowerCase();
    const errorType = String(errorContext?.errorType || errorContext?.type || "").toLowerCase();
    const combined = `${lower} ${errorType}`;

    let bestMatch: { type: ProblemType; score: number } = { type: "unknown", score: 0 };

    for (const pattern of PROBLEM_PATTERNS) {
      let score = 0;
      for (const keyword of pattern.keywords) {
        if (combined.includes(keyword)) score++;
      }
      if (score > bestMatch.score) {
        bestMatch = { type: pattern.type, score };
      }
    }

    return bestMatch.type;
  }

  /**
   * Get the default severity for a problem type.
   */
  private getSeverity(type: ProblemType): ProblemSeverity {
    const pattern = PROBLEM_PATTERNS.find((p) => p.type === type);
    return pattern?.severity || "medium";
  }

  /**
   * Diagnose the root cause using phase-style reasoning.
   */
  private diagnoseRootCause(type: ProblemType, input: DiagnosticInput): RootCause {
    const evidence: { phase: string; finding: string }[] = [];
    let cause = "";
    let recommendedAction = "";
    let confidence = 0.5;

    switch (type) {
      case "payment-failed": {
        cause = "Payment was declined — likely due to insufficient funds, expired card, bank rejection, or missing KYC verification";
        evidence.push({ phase: "TEE", finding: "Payment capability returned failure status" });
        if (input.errorContext?.amount && Number(input.errorContext.amount) > 10000) {
          evidence.push({ phase: "TGSE", finding: "High-value payment may require KYC verification" });
        }
        if (!input.userPermissions?.includes("pay:send")) {
          evidence.push({ phase: "PMB", finding: "User may lack pay:send permission" });
        }
        recommendedAction = "verify-identity-then-retry";
        confidence = 0.75;
        break;
      }
      case "account-locked": {
        cause = "Account is locked — likely due to security concern, too many failed attempts, or policy violation";
        evidence.push({ phase: "TGSE", finding: "Security policy may have triggered account lock" });
        recommendedAction = "contact-support";
        confidence = 0.6;
        break;
      }
      case "identity-verification-needed": {
        cause = "Identity verification (KYC) is required before this action can proceed";
        evidence.push({ phase: "CIE", finding: "Government identity service available in user's country" });
        recommendedAction = "launch-identity-verification";
        confidence = 0.85;
        break;
      }
      case "feature-unavailable": {
        cause = `Feature not available in ${input.country || "user's country"}`;
        evidence.push({ phase: "GCIE", finding: `User located in ${input.country || "unknown country"}` });
        evidence.push({ phase: "CIE", finding: "Feature availability is region-restricted" });
        recommendedAction = "suggest-alternative";
        confidence = 0.8;
        break;
      }
      case "permission-missing": {
        cause = "User lacks a required permission for this action";
        evidence.push({ phase: "PMB", finding: "User permissions do not include the required token" });
        recommendedAction = "request-permission-upgrade";
        confidence = 0.85;
        break;
      }
      case "consent-missing": {
        cause = "Required consent has not been granted";
        evidence.push({ phase: "PMB", finding: "Consent scope does not include the required purpose" });
        recommendedAction = "request-consent";
        confidence = 0.9;
        break;
      }
      case "capability-unavailable": {
        cause = "The capability is currently unavailable (maintenance or outage)";
        evidence.push({ phase: "CIE", finding: "Capability status is not 'active'" });
        recommendedAction = "suggest-alternative-or-retry-later";
        confidence = 0.7;
        break;
      }
      case "rate-limited": {
        cause = "User has exceeded the rate limit for this action";
        evidence.push({ phase: "TGSE", finding: "Rate limit policy triggered" });
        recommendedAction = "wait-and-retry";
        confidence = 0.9;
        break;
      }
      case "session-expired": {
        cause = "User session has expired";
        recommendedAction = "re-authenticate";
        confidence = 0.95;
        break;
      }
      default: {
        cause = "Unable to determine root cause — manual investigation needed";
        recommendedAction = "contact-support";
        confidence = 0.2;
      }
    }

    const contributingPhases = Array.from(new Set(evidence.map((e) => e.phase)));

    return { cause, confidence, contributingPhases, evidence, recommendedAction };
  }

  /**
   * Propose fixes ranked by confidence.
   */
  private proposeFixes(type: ProblemType, rootCause: RootCause, input: DiagnosticInput): ProposedFix[] {
    const fixes: ProposedFix[] = [];

    switch (type) {
      case "payment-failed": {
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_1`,
          title: "Verify identity and retry payment",
          description: "Launch identity verification (if not yet verified), then retry the payment. This resolves KYC-related payment failures.",
          capabilities: ["cirkle.gov.document-verification", "pay.transfer-money"],
          impact: "medium",
          reversible: true,
          requiresConsent: true,
          confidence: 0.8,
        });
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_2`,
          title: "Try alternative payment method",
          description: "Retry the payment using a different payment method (QR code, alternative card, or bank transfer).",
          capabilities: ["pay.qr-payment", "pay.transfer-money"],
          impact: "low",
          reversible: true,
          requiresConsent: true,
          confidence: 0.6,
        });
        break;
      }
      case "identity-verification-needed": {
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_1`,
          title: "Launch identity verification",
          description: "Verify your identity using your country's national ID system. This takes 2-3 minutes.",
          capabilities: ["cirkle.gov.document-verification"],
          impact: "medium",
          reversible: false,
          requiresConsent: true,
          confidence: 0.9,
        });
        break;
      }
      case "consent-missing": {
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_1`,
          title: "Grant required consent",
          description: "Grant the required consent so this feature can proceed. You can withdraw consent at any time.",
          capabilities: [],
          impact: "low",
          reversible: true,
          requiresConsent: true,
          confidence: 0.95,
        });
        break;
      }
      case "feature-unavailable": {
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_1`,
          title: "See alternative features",
          description: `This feature isn't available in ${input.country || "your country"}. Here are similar features you can use instead.`,
          capabilities: [],
          impact: "low",
          reversible: true,
          requiresConsent: false,
          confidence: 0.7,
        });
        break;
      }
      case "session-expired": {
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_1`,
          title: "Re-authenticate",
          description: "Your session has expired. Please log in again to continue.",
          capabilities: [],
          impact: "low",
          reversible: false,
          requiresConsent: false,
          confidence: 0.95,
        });
        break;
      }
      case "rate-limited": {
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_1`,
          title: "Wait and retry",
          description: "You've hit a rate limit. Please wait a few minutes and try again.",
          capabilities: [],
          impact: "low",
          reversible: true,
          requiresConsent: false,
          confidence: 0.9,
        });
        break;
      }
      case "permission-missing": {
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_1`,
          title: "Request permission upgrade",
          description: "This action requires a permission you don't currently have. Request an upgrade to proceed.",
          capabilities: [],
          impact: "medium",
          reversible: false,
          requiresConsent: true,
          confidence: 0.7,
        });
        break;
      }
      case "capability-unavailable": {
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_1`,
          title: "Try again later",
          description: "This service is temporarily unavailable. Please try again in a few minutes.",
          capabilities: [],
          impact: "low",
          reversible: true,
          requiresConsent: false,
          confidence: 0.6,
        });
        break;
      }
      default: {
        fixes.push({
          fixId: `fix_${Date.now().toString(36)}_1`,
          title: "Contact support",
          description: "We couldn't automatically diagnose this issue. Please contact our support team for help.",
          capabilities: [],
          impact: "low",
          reversible: false,
          requiresConsent: false,
          confidence: 0.3,
        });
      }
    }

    // Sort by confidence (highest first).
    return fixes.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate user-facing next steps.
   */
  private generateNextSteps(type: ProblemType, rootCause: RootCause, fixes: ProposedFix[]): string[] {
    const steps: string[] = [];
    steps.push(`Diagnosis: ${rootCause.cause}`);

    if (fixes.length > 0) {
      steps.push(`Recommended fix: ${fixes[0].title}`);
      if (fixes[0].requiresConsent) {
        steps.push("This fix requires your consent. Review and approve to proceed.");
      }
    }

    if (type === "account-locked") {
      steps.push("For security reasons, account locks require manual review. Please contact support.");
    }

    return steps;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalDiagnosticEngine = new DiagnosticEngine();
