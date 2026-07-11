/**
 * CIRKLE Brain AI — Autonomous Intelligence & Knowledge Engine (AIKE) — Public API
 * ============================================================================
 *
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * AIKE sits between LIEE (Phase 7) and CIE (Phase 8). It transforms the Brain
 * from a reactive assistant into a continuously self-learning digital ecosystem.
 *
 * What AIKE does (autonomously, 24/7):
 *   - Learns from every platform event (Travel.Booked, Payment.Completed, etc.)
 *   - Learns user journeys (not just clicks — full sequences)
 *   - Maintains a global knowledge graph (nodes + relationships)
 *   - Maintains a continuously-updated world state (weather, traffic, currency...)
 *   - Detects knowledge gaps and schedules research to fill them
 *   - Validates knowledge from multiple trusted sources
 *   - Refreshes stale knowledge automatically (TTL-based)
 *   - Predicts future user needs (next destination, next payment, etc.)
 *   - Reasons across modules (flight booked → predict hotels, weather, transport...)
 *   - Trains 15 domain-specific models (travel, payments, messaging, feed, etc.)
 *   - Evaluates AI provider performance and auto-routes to the best one
 *   - Discovers new capabilities (APIs, models, integrations) automatically
 *   - Runs a nightly training pipeline (no manual intervention)
 *   - Compresses old knowledge to save space
 *
 * Privacy guarantees:
 *   - Respects TGSE governance
 *   - Respects PMB personal memory boundaries
 *   - Respects user consent (no learning outside consent scope)
 *   - No centralized personal profiles without consent
 *   - No sharing personal data
 *
 * Performance guarantees:
 *   - Asynchronous (never blocks UI or Brain reasoning)
 *   - Uses queues, workers, batching, caching
 *   - Incremental updates (no full retraining)
 *
 * Import convention:
 *   import { globalAIKEEngine, globalLearningOrchestrator } from "@/lib/autonomous-intelligence";
 * ============================================================================
 */

// ── Schema Version ────────────────────────────────────────────────────────
export { AIKE_SCHEMA_VERSION } from "./types";

// ── Main Orchestrator (the AIKE entry point) ──────────────────────────────
export { LearningOrchestrator, globalLearningOrchestrator } from "./learning-orchestrator";

// ── Knowledge Layer ───────────────────────────────────────────────────────
export { KnowledgeGraph, globalKnowledgeGraph } from "./knowledge-graph";
export { KnowledgeAcquirer, globalKnowledgeAcquirer } from "./knowledge-acquisition";
export { KnowledgeGapDetector, globalKnowledgeGapDetector } from "./knowledge-gap-detector";
export { KnowledgeValidator, globalKnowledgeValidator } from "./knowledge-validator";
export { KnowledgeFreshnessManager, globalKnowledgeFreshnessManager } from "./knowledge-freshness";
export { TrustRanker, globalTrustRanker } from "./trust-ranking";

// ── Learning Engines ──────────────────────────────────────────────────────
export { EventLearningEngine, globalEventLearningEngine } from "./event-learning-engine";
export { ExperienceReplay, globalExperienceReplay } from "./experience-replay";
export { CrossModuleIntelligence, globalCrossModuleIntelligence } from "./cross-module-intelligence";
export { PredictionEngine, globalPredictionEngine } from "./prediction-engine";
export { SemanticMemoryBuilder, globalSemanticMemoryBuilder } from "./semantic-memory-builder";
export { DomainLearningEngine, globalDomainLearningEngine, type DomainTrainer } from "./domain-learning-engine";

// ── World + Research ──────────────────────────────────────────────────────
export { WorldStateEngine, globalWorldStateEngine } from "./world-state-engine";
export { ResearchScheduler, globalResearchScheduler } from "./research-scheduler";
export { CapabilityLearningEngine, globalCapabilityLearningEngine } from "./capability-learning";
export { ProviderLearningEngine, globalProviderLearningEngine } from "./provider-learning";

// ── Orchestration ─────────────────────────────────────────────────────────
// Note: LearningOrchestrator is already exported above as the main AIKE entry point.
export { TrainingPipeline, globalTrainingPipeline } from "./training-pipeline";
export { ModelEvaluator, globalModelEvaluator } from "./model-evaluator";
export { KnowledgeCompressor, globalKnowledgeCompressor } from "./knowledge-compression";

// ── Domain Trainers (15) ──────────────────────────────────────────────────
import { TravelTrainer, travelTrainer } from "./trainers/travel";
import { PaymentsTrainer, paymentsTrainer } from "./trainers/payments";
import { MessagingTrainer, messagingTrainer } from "./trainers/messaging";
import { FeedTrainer, feedTrainer } from "./trainers/feed";
import { MapsTrainer, mapsTrainer } from "./trainers/maps";
import { ShoppingTrainer, shoppingTrainer } from "./trainers/shopping";
import { GovernmentTrainer, governmentTrainer } from "./trainers/government";
import { HealthTrainer, healthTrainer } from "./trainers/health";
import { JobsTrainer, jobsTrainer } from "./trainers/jobs";
import { CreatorTrainer, creatorTrainer } from "./trainers/creator";
import { CircleTrainer, circleTrainer } from "./trainers/circle";
import { MailTrainer, mailTrainer } from "./trainers/mail";
import { IdentityTrainer, identityTrainer } from "./trainers/identity";
import { EducationTrainer, educationTrainer } from "./trainers/education";
import { MediaTrainer, mediaTrainer } from "./trainers/media";

// Re-export for external consumers
export { TravelTrainer, travelTrainer } from "./trainers/travel";
export { PaymentsTrainer, paymentsTrainer } from "./trainers/payments";
export { MessagingTrainer, messagingTrainer } from "./trainers/messaging";
export { FeedTrainer, feedTrainer } from "./trainers/feed";
export { MapsTrainer, mapsTrainer } from "./trainers/maps";
export { ShoppingTrainer, shoppingTrainer } from "./trainers/shopping";
export { GovernmentTrainer, governmentTrainer } from "./trainers/government";
export { HealthTrainer, healthTrainer } from "./trainers/health";
export { JobsTrainer, jobsTrainer } from "./trainers/jobs";
export { CreatorTrainer, creatorTrainer } from "./trainers/creator";
export { CircleTrainer, circleTrainer } from "./trainers/circle";
export { MailTrainer, mailTrainer } from "./trainers/mail";
export { IdentityTrainer, identityTrainer } from "./trainers/identity";
export { EducationTrainer, educationTrainer } from "./trainers/education";
export { MediaTrainer, mediaTrainer } from "./trainers/media";

// ── All trainers as a registry ────────────────────────────────────────────
export const ALL_TRAINERS = {
  travel: travelTrainer,
  payments: paymentsTrainer,
  messaging: messagingTrainer,
  feed: feedTrainer,
  maps: mapsTrainer,
  shopping: shoppingTrainer,
  government: governmentTrainer,
  health: healthTrainer,
  jobs: jobsTrainer,
  creator: creatorTrainer,
  circle: circleTrainer,
  mail: mailTrainer,
  identity: identityTrainer,
  education: educationTrainer,
  media: mediaTrainer,
} as const;

// ── Type Re-exports ───────────────────────────────────────────────────────
export type {
  PlatformEvent,
  PlatformEventCategory,
  JourneyStep,
  UserJourney,
  KnowledgeNode,
  KnowledgeNodeType,
  KnowledgeEdge,
  KnowledgeEdgeType,
  KnowledgeFact,
  KnowledgeSource,
  KnowledgeSourceRef,
  KnowledgeGap,
  ResearchPriority,
  ResearchTask,
  WorldStateMetric,
  WorldStateEntry,
  PredictionType,
  Prediction,
  DomainTrainerType,
  DomainKnowledge,
  DomainPattern,
  DomainModel,
  DomainRanking,
  CrossModuleInference,
  InferredNeed,
  AIProviderName,
  ProviderMetrics,
  DiscoveredCapability,
  TrainingRunResult,
  LearningTaskType,
  LearningTask,
  ModelEvaluation,
  CompressionResult,
  SemanticMemory,
  LearningConsent,
  AIKEInput,
  AIKEResult,
  AutonomousIntelligenceContextSection,
} from "./types";
