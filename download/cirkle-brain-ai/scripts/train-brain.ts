/**
 * CIRKLE Brain AI — Training Script
 * ============================================================================
 *
 * Feeds feedback data into LIEE (Phase 7), detects patterns, generates
 * proposals, and optionally auto-approves high-confidence proposals.
 *
 * Usage:
 *   bun run scripts/train-brain.ts
 *
 * To use your own training data, replace the sample data below or load
 * from a JSON file:
 *   import trainingData from "./my-training-data.json";
 *
 * Feedback signal shape (see src/lib/liee/types.ts for full type):
 *   {
 *     pipeline: "explicit" | "implicit" | "behavioral" | "operational" | "execution" | "satisfaction",
 *     userId: string,
 *     signal: { ... },            // rating, action, dwellTimeMs, etc.
 *     timestamp: ISO string,
 *   }
 * ============================================================================
 */

import {
  globalFeedbackCollector,
  globalPatternDetector,
  globalProposalEngine,
  globalLIEEEngine,
} from "../src/lib/liee";

// ── Sample training data ────────────────────────────────────────────────────
// Replace this with your real user feedback data.
const SAMPLE_TRAINING_DATA: Array<{
  pipeline: "explicit" | "implicit" | "behavioral" | "execution";
  userId: string;
  signal: Record<string, unknown>;
  timestamp: string;
}> = [
  // Explicit feedback (user ratings)
  { pipeline: "explicit", userId: "user-1", signal: { rating: 5, context: "travel recommendation", action: "accepted" }, timestamp: new Date().toISOString() },
  { pipeline: "explicit", userId: "user-1", signal: { rating: 4, context: "restaurant suggestion", action: "accepted" }, timestamp: new Date().toISOString() },
  { pipeline: "explicit", userId: "user-2", signal: { rating: 2, context: "news recommendation", action: "rejected" }, timestamp: new Date().toISOString() },

  // Implicit feedback (accept/reject/ignore)
  { pipeline: "implicit", userId: "user-1", signal: { action: "accepted", context: "flight search" }, timestamp: new Date().toISOString() },
  { pipeline: "implicit", userId: "user-2", signal: { action: "rejected", context: "hotel suggestion" }, timestamp: new Date().toISOString() },
  { pipeline: "implicit", userId: "user-3", signal: { action: "ignored", context: "smart reply" }, timestamp: new Date().toISOString() },

  // Behavioral feedback (engagement)
  { pipeline: "behavioral", userId: "user-1", signal: { dwellTimeMs: 45000, clicks: 3, context: "news article" }, timestamp: new Date().toISOString() },
  { pipeline: "behavioral", userId: "user-2", signal: { dwellTimeMs: 5000, clicks: 0, context: "feed post" }, timestamp: new Date().toISOString() },

  // Execution feedback (TEE outcomes)
  { pipeline: "execution", userId: "user-1", signal: { executionId: "exec-001", state: "completed", stepsSucceeded: 5, stepsFailed: 0, durationMs: 3200 }, timestamp: new Date().toISOString() },
  { pipeline: "execution", userId: "user-2", signal: { executionId: "exec-002", state: "failed", stepsSucceeded: 2, stepsFailed: 3, durationMs: 5400 }, timestamp: new Date().toISOString() },
];

// ── Main training routine ───────────────────────────────────────────────────

async function trainBrain(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║          CIRKLE Brain AI — Training Pipeline                   ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`Loading ${SAMPLE_TRAINING_DATA.length} feedback samples...`);

  // ── Stage 1: Feed all feedback into LIEE ────────────────────────────────
  let fed = 0;
  for (const sample of SAMPLE_TRAINING_DATA) {
    try {
      await globalFeedbackCollector.ingest({
        pipeline: sample.pipeline,
        userId: sample.userId,
        signal: sample.signal as any,
        timestamp: sample.timestamp,
        context: { source: "training-script" },
      });
      fed++;
    } catch (err) {
      console.warn(`  ⚠ Failed to ingest sample for ${sample.userId}:`, String((err as Error)?.message || err).slice(0, 100));
    }
  }
  console.log(`✓ Fed ${fed}/${SAMPLE_TRAINING_DATA.length} feedback signals into LIEE`);

  // ── Stage 2: Detect patterns ────────────────────────────────────────────
  console.log();
  console.log("Detecting patterns...");
  try {
    const lieeResult = await globalLIEEEngine.learn({
      sharedContext: { request: { userId: "training", sessionId: "train-session" } },
      feedback: { pipeline: "explicit", userId: "training", signal: { rating: 5 }, timestamp: new Date().toISOString() } as any,
      detectPatterns: true,
      generateProposals: true,
      learningEnabled: true,
    });

    const patterns = lieeResult.patternsDetected || [];
    console.log(`✓ Detected ${patterns.length} pattern(s):`);
    patterns.forEach((p: any) => {
      console.log(`   - [${p.type || "unknown"}] ${p.description || JSON.stringify(p).slice(0, 80)} (confidence: ${p.confidence ?? "n/a"})`);
    });

    // ── Stage 3: Generate proposals ──────────────────────────────────────
    const proposals = lieeResult.proposalsGenerated || [];
    console.log();
    console.log(`✓ Generated ${proposals.length} proposal(s):`);
    proposals.forEach((p: any) => {
      console.log(`   - [${p.target || "unknown"}] ${p.title || p.description || "untitled"} (confidence: ${p.confidence ?? "n/a"})`);
    });

    // ── Stage 4: Show pending proposals (awaiting governance review) ─────
    const pending = globalProposalEngine.getProposalsByStatus("proposed");
    console.log();
    console.log(`📋 ${pending.length} proposal(s) awaiting governance review.`);
    console.log("   To approve: POST /api/liee/proposals/{id}/approve");
    console.log("   To reject:  POST /api/liee/proposals/{id}/reject");
    console.log("   To deploy:  POST /api/liee/proposals/{id}/deploy  (after approval)");
  } catch (err) {
    console.warn("⚠ Pattern detection/proposal generation failed:", String((err as Error)?.message || err).slice(0, 160));
  }

  // ── Stage 5: LIEE status ────────────────────────────────────────────────
  console.log();
  console.log("=== LIEE Status ===");
  const status = globalLIEEEngine.status();
  console.log(JSON.stringify(status, null, 2));

  console.log();
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  Training complete. The Brain has learned from your data.      ║");
  console.log("║  Review pending proposals in the governance dashboard.         ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
}

trainBrain().catch((err) => {
  console.error("Training failed:", err);
  process.exit(1);
});
