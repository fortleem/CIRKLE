/**
 * CIRKLE Brain AI — TGSE AI Safety Framework
 * ============================================================================
 * Comprehensive AI safety controls:
 *   - Prompt injection detection
 *   - Unsafe instruction detection
 *   - Malicious workflow detection
 *   - Data leakage prevention
 *   - Capability misuse detection
 *   - Privilege escalation prevention
 *   - Hallucination confidence gating
 *   - High-impact decision controls
 * ============================================================================
 */

import type { SafetyCheckResult, SafetyCheckType } from "./types";

export class AISafetyFramework {
  /**
   * Run all applicable safety checks on an AI input/output.
   */
  check(input: {
    text?: string;
    workflow?: { steps: { capabilityId: string; inputs: Record<string, unknown> }[] };
    confidence?: number;
    capabilityId?: string;
    requestedPermissions?: string[];
    userPermissions?: string[];
    outputData?: Record<string, unknown>;
    inputData?: Record<string, unknown>;
    impact?: "low" | "medium" | "high" | "critical";
  }): SafetyCheckResult[] {
    const results: SafetyCheckResult[] = [];

    if (input.text) {
      results.push(this.checkPromptInjection(input.text));
      results.push(this.checkUnsafeInstruction(input.text));
    }
    if (input.workflow) {
      results.push(this.checkMaliciousWorkflow(input.workflow));
    }
    if (input.outputData || input.inputData) {
      results.push(this.checkDataLeakage(input.outputData || {}, input.inputData || {}));
    }
    if (input.capabilityId) {
      results.push(this.checkCapabilityMisuse(input.capabilityId, input.inputData || {}));
    }
    if (input.requestedPermissions && input.userPermissions) {
      results.push(this.checkPrivilegeEscalation(input.requestedPermissions, input.userPermissions));
    }
    if (input.confidence !== undefined) {
      results.push(this.checkHallucination(input.confidence));
    }
    if (input.impact) {
      results.push(this.checkHighImpact(input.impact));
    }

    return results;
  }

  private checkPromptInjection(text: string): SafetyCheckResult {
    const issues: string[] = [];
    const lower = text.toLowerCase();
    const patterns = [
      "ignore previous instructions", "disregard the above", "you are now",
      "system prompt", "reveal your instructions", "override safety",
      "act as if", "pretend you are", "forget your rules",
    ];
    for (const p of patterns) {
      if (lower.includes(p)) issues.push(`Detected prompt injection pattern: "${p}"`);
    }
    return {
      checkType: "prompt-injection",
      passed: issues.length === 0,
      severity: issues.length > 0 ? "high" : "info",
      description: issues.length === 0 ? "No prompt injection detected" : `${issues.length} prompt injection pattern(s) detected`,
      issues,
      recommendedAction: issues.length > 0 ? "block" : "allow",
    };
  }

  private checkUnsafeInstruction(text: string): SafetyCheckResult {
    const issues: string[] = [];
    const lower = text.toLowerCase();
    const patterns = [
      "hack", "exploit", "bypass security", "steal data", "malware",
      "phishing", "social engineering", "illegal", "harmful",
    ];
    for (const p of patterns) {
      if (lower.includes(p)) issues.push(`Detected unsafe instruction: "${p}"`);
    }
    return {
      checkType: "unsafe-instruction",
      passed: issues.length === 0,
      severity: issues.length > 0 ? "high" : "info",
      description: issues.length === 0 ? "No unsafe instructions detected" : `${issues.length} unsafe instruction(s) detected`,
      issues,
      recommendedAction: issues.length > 0 ? "block" : "allow",
    };
  }

  private checkMaliciousWorkflow(workflow: { steps: { capabilityId: string; inputs: Record<string, unknown> }[] }): SafetyCheckResult {
    const issues: string[] = [];
    // Check for suspicious capability sequences.
    const caps = workflow.steps.map((s) => s.capabilityId);
    // Check for excessive permissions in workflow.
    const sensitiveCaps = caps.filter((c) => c.startsWith("pay.") || c.startsWith("shield."));
    if (sensitiveCaps.length > 3) {
      issues.push(`Workflow contains ${sensitiveCaps.length} sensitive capabilities (potential abuse)`);
    }
    // Check for duplicate capability invocations (potential retry attack).
    const unique = new Set(caps);
    if (caps.length > unique.size + 2) {
      issues.push(`Workflow has excessive duplicate capability invocations`);
    }
    return {
      checkType: "malicious-workflow",
      passed: issues.length === 0,
      severity: issues.length > 0 ? "medium" : "info",
      description: issues.length === 0 ? "Workflow appears safe" : `${issues.length} workflow issue(s) detected`,
      issues,
      recommendedAction: issues.length > 0 ? "require-approval" : "allow",
    };
  }

  private checkDataLeakage(outputData: Record<string, unknown>, inputData: Record<string, unknown>): SafetyCheckResult {
    const issues: string[] = [];
    // Check if output contains sensitive fields from input that shouldn't be exposed.
    const sensitiveFields = ["password", "secret", "apiKey", "token", "ssn", "nationalId"];
    for (const field of sensitiveFields) {
      if (field in outputData) {
        issues.push(`Output contains sensitive field: "${field}"`);
      }
      if (field in inputData && JSON.stringify(outputData).includes(String(inputData[field]))) {
        issues.push(`Output leaks input sensitive field: "${field}"`);
      }
    }
    return {
      checkType: "data-leakage",
      passed: issues.length === 0,
      severity: issues.length > 0 ? "critical" : "info",
      description: issues.length === 0 ? "No data leakage detected" : `${issues.length} data leakage issue(s) detected`,
      issues,
      recommendedAction: issues.length > 0 ? "block" : "allow",
    };
  }

  private checkCapabilityMisuse(capabilityId: string, inputs: Record<string, unknown>): SafetyCheckResult {
    const issues: string[] = [];
    // Check for misuse patterns per capability.
    if (capabilityId.startsWith("pay.") && inputs.amount) {
      const amount = Number(inputs.amount);
      if (amount > 100000) issues.push(`Large payment amount: ${amount} (potential fraud)`);
    }
    if (capabilityId.startsWith("shield.") && capabilityId.includes("panic")) {
      // Panic alerts should not be triggered in workflows without explicit confirmation.
      if (!inputs.confirmed) issues.push("Panic alert triggered without confirmation");
    }
    return {
      checkType: "capability-misuse",
      passed: issues.length === 0,
      severity: issues.length > 0 ? "high" : "info",
      description: issues.length === 0 ? "No capability misuse detected" : `${issues.length} misuse indicator(s) detected`,
      issues,
      recommendedAction: issues.length > 0 ? "require-approval" : "allow",
    };
  }

  private checkPrivilegeEscalation(requestedPermissions: string[], userPermissions: string[]): SafetyCheckResult {
    const issues: string[] = [];
    for (const perm of requestedPermissions) {
      if (!userPermissions.includes(perm)) {
        issues.push(`Requested permission "${perm}" not held by user (privilege escalation attempt)`);
      }
    }
    return {
      checkType: "privilege-escalation",
      passed: issues.length === 0,
      severity: issues.length > 0 ? "critical" : "info",
      description: issues.length === 0 ? "No privilege escalation detected" : `${issues.length} escalation attempt(s) detected`,
      issues,
      recommendedAction: issues.length > 0 ? "block" : "allow",
    };
  }

  private checkHallucination(confidence: number): SafetyCheckResult {
    const issues: string[] = [];
    if (confidence < 0.3) {
      issues.push(`Very low confidence (${confidence.toFixed(2)}) — likely hallucination`);
    } else if (confidence < 0.5) {
      issues.push(`Low confidence (${confidence.toFixed(2)}) — uncertain output`);
    }
    return {
      checkType: "hallucination-gating",
      passed: confidence >= 0.3,
      severity: confidence < 0.3 ? "high" : confidence < 0.5 ? "medium" : "info",
      description: `Confidence: ${confidence.toFixed(2)}`,
      issues,
      recommendedAction: confidence < 0.3 ? "block" : confidence < 0.5 ? "require-approval" : "allow",
    };
  }

  private checkHighImpact(impact: "low" | "medium" | "high" | "critical"): SafetyCheckResult {
    const issues: string[] = [];
    if (impact === "critical") {
      issues.push("Critical-impact action requires human approval");
    } else if (impact === "high") {
      issues.push("High-impact action requires review");
    }
    return {
      checkType: "high-impact-decision",
      passed: impact === "low" || impact === "medium",
      severity: impact === "critical" ? "critical" : impact === "high" ? "high" : "info",
      description: `Impact level: ${impact}`,
      issues,
      recommendedAction: impact === "critical" || impact === "high" ? "require-approval" : "allow",
    };
  }

  getCheckTypes(): SafetyCheckType[] {
    return ["prompt-injection", "unsafe-instruction", "malicious-workflow", "data-leakage", "capability-misuse", "privilege-escalation", "hallucination-gating", "high-impact-decision"];
  }
}

export const globalAISafetyFramework = new AISafetyFramework();
