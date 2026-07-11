/**
 * CIRKLE Brain AI — Account Health Guardian (AHG) Engine
 * ============================================================================
 * Main orchestrator. Combines the diagnostic engine + fix engine into a
 * unified entry point for account problem resolution.
 * ============================================================================
 */

import type { DiagnosticInput, DiagnosticResult, AHGStatus } from "./types";
import { AHG_SCHEMA_VERSION } from "./types";
import { globalDiagnosticEngine } from "./diagnostic-engine";
import { globalFixEngine, type FixExecutionResult } from "./fix-engine";

export class AHGEngine {
  /**
   * Diagnose an account problem.
   */
  async diagnose(input: DiagnosticInput): Promise<DiagnosticResult> {
    const result = await globalDiagnosticEngine.diagnose(input);
    // Store the problem for later fix execution.
    globalFixEngine.storeProblem(result.problem);

    // Send push notification for high/critical severity (Upgrade 12).
    if (result.problem.severity === "high" || result.problem.severity === "critical") {
      void this.notifyUser(input.userId, result.problem).catch(() => {});
    }

    return result;
  }

  /**
   * Execute a fix with user consent.
   */
  async executeFix(params: {
    problemId: string;
    fixId: string;
    consented: boolean;
    userNotes?: string;
    userId: string;
    country?: string;
    userPermissions?: string[];
    consentScope?: string[];
  }): Promise<FixExecutionResult> {
    return globalFixEngine.executeFix(params);
  }

  /**
   * Send a push notification to the user about a detected problem (Upgrade 12).
   */
  private async notifyUser(userId: string, problem: { type: string; description: string; severity: string }): Promise<void> {
    try {
      const { globalPushService } = await import("@/lib/push-notifications");
      await globalPushService.notifyAccountProblem(userId, problem);
    } catch {
      // Push notification is best-effort.
    }
  }

  /**
   * AHG status + observability.
   */
  status(): AHGStatus {
    const stats = globalFixEngine.getStats();
    return {
      name: "Account Health Guardian",
      status: "operational",
      problemsDetected: stats.total,
      problemsResolved: stats.resolved,
      autoFixRate: stats.autoFixRate,
      averageResolutionTimeMs: 0,
    };
  }
}

export const globalAHGEngine = new AHGEngine();
export { AHG_SCHEMA_VERSION };
