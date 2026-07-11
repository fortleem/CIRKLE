/**
 * CIRKLE Brain AI — TGSE Risk Assessment Engine
 * ============================================================================
 * Assesses 7 risk types: financial, operational, privacy, regulatory, fraud,
 * reputation, AI misuse.
 * ============================================================================
 */

import type { RiskAssessment, RiskType, RiskLevel, GovernanceTarget } from "./types";

const RISK_RANK: Record<RiskLevel, number> = { negligible: 0, low: 1, medium: 2, high: 3, critical: 4 };

export class RiskAssessmentEngine {
  assess(
    target: GovernanceTarget,
    ctx: {
      amount?: number;
      country?: string;
      consentGranted?: boolean;
      confidence?: number;
      capabilityId?: string;
      userPermissions?: string[];
      requestedPermissions?: string[];
      impact?: string;
      historicalFailureRate?: number;
    },
  ): RiskAssessment {
    const risks: { type: RiskType; level: RiskLevel; description: string; mitigation?: string }[] = [];

    // Financial risk.
    if (ctx.amount !== undefined) {
      if (ctx.amount > 100000) {
        risks.push({ type: "financial", level: "critical", description: `Very large payment: ${ctx.amount}`, mitigation: "Require human approval + fraud check" });
      } else if (ctx.amount > 10000) {
        risks.push({ type: "financial", level: "high", description: `Large payment: ${ctx.amount}`, mitigation: "Require approval" });
      } else if (ctx.amount > 1000) {
        risks.push({ type: "financial", level: "medium", description: `Medium payment: ${ctx.amount}` });
      }
    }

    // Privacy risk.
    if (ctx.consentGranted === false) {
      risks.push({ type: "privacy", level: "high", description: "Action processes personal data without consent", mitigation: "Require consent before proceeding" });
    }

    // Regulatory risk.
    if (ctx.country && ["IR", "KP", "SY"].includes(ctx.country)) {
      risks.push({ type: "regulatory", level: "critical", description: `Action in sanctioned country: ${ctx.country}`, mitigation: "Block action" });
    }

    // Fraud indicators.
    if (ctx.amount && ctx.amount > 50000 && !ctx.userPermissions?.includes("verified")) {
      risks.push({ type: "fraud", level: "high", description: "Large payment by unverified user", mitigation: "Require identity verification" });
    }

    // AI misuse risk.
    if (ctx.confidence !== undefined && ctx.confidence < 0.3) {
      risks.push({ type: "ai-misuse", level: "high", description: `Low-confidence AI output (${ctx.confidence.toFixed(2)})`, mitigation: "Gate output, require review" });
    }

    // Operational risk.
    if (ctx.historicalFailureRate && ctx.historicalFailureRate > 0.2) {
      risks.push({ type: "operational", level: "medium", description: `High historical failure rate: ${(ctx.historicalFailureRate * 100).toFixed(0)}%`, mitigation: "Consider alternative capability" });
    }

    // Reputation risk (high-impact actions).
    if (ctx.impact === "critical") {
      risks.push({ type: "reputation", level: "high", description: "Critical-impact action may affect reputation", mitigation: "Executive review" });
    }

    // Overall level = max of all risks.
    const overallLevel: RiskLevel = risks.length === 0
      ? "negligible"
      : risks.reduce((max, r) => (RISK_RANK[r.level] > RISK_RANK[max] ? r.level : max), "negligible" as RiskLevel);

    const safeToProceed = RISK_RANK[overallLevel] < RISK_RANK["high"];
    const mitigations = risks.map((r) => r.mitigation).filter(Boolean) as string[];

    return {
      assessmentId: `risk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      target,
      overallLevel,
      risks,
      safeToProceed,
      mitigations,
      timestamp: new Date().toISOString(),
    };
  }
}

export const globalRiskAssessmentEngine = new RiskAssessmentEngine();
