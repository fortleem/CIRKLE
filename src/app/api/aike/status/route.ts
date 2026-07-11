// @ts-nocheck
import { NextResponse } from "next/server";
import {
  globalLearningOrchestrator,
  globalKnowledgeGraph,
  globalEventLearningEngine,
  globalWorldStateEngine,
  globalKnowledgeGapDetector,
  globalResearchScheduler,
  globalPredictionEngine,
  globalTrainingPipeline,
  globalModelEvaluator,
} from "@/lib/autonomous-intelligence";

export async function GET() {
  try {
    const orchestratorStatus = globalLearningOrchestrator.getStatus();
    const eventStats = globalEventLearningEngine.getEventStats();
    const worldState = globalWorldStateEngine.getAll("global");
    const gaps = globalKnowledgeGapDetector.getOpenGaps();
    const research = globalResearchScheduler.getPendingTasks();
    const training = globalTrainingPipeline.getLastRun();
    const models = globalModelEvaluator.getStats();
    const predictionStats = globalPredictionEngine.getAccuracyStats();

    return NextResponse.json({
      status: "operational",
      phase: "7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)",
      orchestrator: orchestratorStatus,
      eventLearning: eventStats,
      worldStateEntries: worldState.length,
      openGaps: gaps.length,
      pendingResearch: research.length,
      predictionAccuracy: predictionStats,
      lastTrainingRun: training,
      modelEvaluation: models,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
