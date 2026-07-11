/**
 * CIRKLE Brain AI — Autonomous Intelligence & Knowledge Engine (AIKE) Types
 * ============================================================================
 *
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Sits between LIEE (Phase 7) and CIE (Phase 8). Transforms the Brain from
 * a reactive assistant into a continuously self-learning digital ecosystem.
 *
 * Constitutional role:
 *   - AIKE OWNS autonomous knowledge acquisition, world-state monitoring,
 *     event-driven learning, journey pattern recognition, cross-module
 *     prediction, research scheduling, knowledge validation/freshness,
 *     domain-specific training, and the nightly training pipeline.
 *   - AIKE NEVER replaces LIEE (feedback/proposals), CIE (ecosystem knowledge),
 *     TGSE (governance), or PMB (personal memory).
 *   - AIKE RESPECTS consent boundaries — no learning outside user consent.
 *   - AIKE is ASYNCHRONOUS — never blocks UI, Brain reasoning, or execution.
 *   - AIKE uses QUEUES, WORKERS, BATCHING, CACHING, and INCREMENTAL updates.
 *   - No full retraining. No manual datasets. Learning is continuous.
 *
 * AIKE consumes platform events + LIEE patterns + CIE knowledge + external
 * trusted sources. It produces a continuously-updated knowledge graph,
 * world-state model, predictions, and domain-specific learned models.
 * ============================================================================
 */

// ── Schema Version ────────────────────────────────────────────────────────

export const AIKE_SCHEMA_VERSION = 1;

// ── Platform Events (Event Learning Engine) ──────────────────────────────

export type PlatformEventCategory =
  | "travel"        // Travel.Booked, Travel.Cancelled, Travel.Reviewed
  | "restaurant"    // Restaurant.Booked, Restaurant.Reviewed
  | "payment"       // Payment.Completed, Payment.Failed
  | "messaging"     // Message.Sent, Message.Read
  | "feed"          // Post.Created, Post.Shared
  | "video"         // Video.Watched, Video.Completed, Video.Skipped
  | "news"          // News.Read
  | "event"         // Event.Joined
  | "circle"        // Circle.Created
  | "job"           // Job.Applied, Job.Accepted
  | "creator"       // Creator.Subscribed
  | "government"    // Government.Alert.Read
  | "maps"          // Map.Navigation
  | "business"      // Business.Opened, Business.Called, Business.Reviewed
  | "search"        // Search.Executed, Search.Clicked
  | "recommendation" // Recommendation.Accepted, Recommendation.Ignored
  | "identity"      // Identity.Verified, Identity.Attested
  | "education"     // Edu.AssignmentSubmitted, Edu.GradePublished
  | "mail"          // Mail.Sent, Mail.Read
  | "media"         // Media.Uploaded, Media.Shared;

export interface PlatformEvent {
  /** Unique event id. */
  eventId: string;
  /** Event category. */
  category: PlatformEventCategory;
  /** Event type (e.g., "Travel.Booked", "Payment.Completed"). */
  type: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** User who triggered the event (if consented). */
  userId?: string;
  /** Entity ids involved in the event. */
  entityIds?: string[];
  /** Event payload (category-specific). */
  payload: Record<string, unknown>;
  /** Whether the user consented to learning from this event. */
  consentGranted: boolean;
  /** Session id for journey tracking. */
  sessionId?: string;
}

// ── User Journeys (Experience Replay) ────────────────────────────────────

export interface JourneyStep {
  /** Step index in the journey. */
  step: number;
  /** The platform event at this step. */
  event: PlatformEvent;
  /** Duration between this step and the previous (ms). */
  gapMs?: number;
}

export interface UserJourney {
  /** Unique journey id. */
  journeyId: string;
  /** User who took this journey. */
  userId?: string;
  /** Journey steps in chronological order. */
  steps: JourneyStep[];
  /** Journey outcome (success/failure/abandoned). */
  outcome: "success" | "failure" | "abandoned" | "in_progress";
  /** Total journey duration (ms). */
  totalDurationMs: number;
  /** Journey start timestamp. */
  startedAt: string;
  /** Journey end timestamp. */
  endedAt?: string;
  /** Journey category (e.g., "travel_booking", "restaurant_discovery"). */
  category: string;
  /** Confidence score 0-1 (how successful this journey was). */
  confidence: number;
}

// ── Knowledge Graph ──────────────────────────────────────────────────────

export type KnowledgeNodeType =
  | "user" | "place" | "business" | "product" | "hotel" | "flight"
  | "road" | "hospital" | "school" | "job" | "post" | "creator"
  | "video" | "payment" | "event" | "country" | "city" | "company"
  | "government_service" | "restaurant" | "cafe" | "mall"
  | "article" | "topic" | "category" | "tag";

export type KnowledgeEdgeType =
  | "visited" | "liked" | "purchased" | "works_at" | "located_in"
  | "travels_to" | "follows" | "created" | "joined" | "reviewed"
  | "belongs_to" | "similar_to" | "frequently_used_with"
  | "booked" | "searched" | "shared" | "watched" | "commented"
  | "rated" | "navigated_to" | "paid_for" | "subscribed_to"
  | "verified_by" | "endorsed_by" | "related_to" | "part_of";

export interface KnowledgeNode {
  /** Unique node id. */
  nodeId: string;
  /** Node type. */
  type: KnowledgeNodeType;
  /** Display name. */
  name: string;
  /** Normalized properties (type-specific). */
  properties: Record<string, unknown>;
  /** Trust score 0-100 (how much we trust this node's data). */
  trustScore: number;
  /** Confidence 0-1 (how confident we are this node exists/is accurate). */
  confidence: number;
  /** ISO timestamp when node was first discovered. */
  discoveredAt: string;
  /** ISO timestamp when node was last updated. */
  updatedAt: string;
  /** Source ids that contributed to this node. */
  sourceIds: string[];
  /** Tags for fast filtering. */
  tags: string[];
}

export interface KnowledgeEdge {
  /** Unique edge id. */
  edgeId: string;
  /** Source node id. */
  fromNodeId: string;
  /** Target node id. */
  toNodeId: string;
  /** Edge type. */
  type: KnowledgeEdgeType;
  /** Edge weight 0-1 (strength of relationship). */
  weight: number;
  /** Edge properties. */
  properties: Record<string, unknown>;
  /** When this edge was first observed. */
  firstObservedAt: string;
  /** When this edge was last confirmed. */
  lastObservedAt: string;
  /** How many times this edge has been observed. */
  observationCount: number;
}

// ── Knowledge Acquisition ────────────────────────────────────────────────

export type KnowledgeSource =
  | "government_api" | "official_website" | "openstreetmap" | "wikipedia"
  | "weather_api" | "tourism_board" | "banking_api" | "public_api"
  | "transport_api" | "health_api" | "education_api" | "commerce_api"
  | "maps_api" | "official_news" | "business_directory" | "partner_api"
  | "user_generated" | "ai_inferred" | "platform_event";

export interface KnowledgeFact {
  /** Unique fact id. */
  factId: string;
  /** The fact statement (e.g., "Restaurant X is open until 11pm"). */
  statement: string;
  /** The domain this fact belongs to (travel, dining, etc.). */
  domain: string;
  /** The fact value (structured). */
  value: Record<string, unknown>;
  /** Sources that contributed to this fact. */
  sources: KnowledgeSourceRef[];
  /** Overall confidence 0-1. */
  confidence: number;
  /** Trust score 0-100. */
  trustScore: number;
  /** Verification count. */
  verificationCount: number;
  /** Contradictions found. */
  contradictions: string[];
  /** When this fact was last checked. */
  lastCheckedAt: string;
  /** When this fact expires (TTL). */
  expiresAt: string;
  /** Whether this fact is currently valid. */
  status: "validated" | "unvalidated" | "contradicted" | "expired" | "deprecated";
}

export interface KnowledgeSourceRef {
  /** Source type. */
  source: KnowledgeSource;
  /** Source URL or identifier. */
  sourceUrl: string;
  /** Source authority score 0-100. */
  authorityScore: number;
  /** When this source was last accessed. */
  accessedAt: string;
}

// ── Knowledge Gaps ───────────────────────────────────────────────────────

export interface KnowledgeGap {
  /** Unique gap id. */
  gapId: string;
  /** The domain where the gap exists. */
  domain: string;
  /** What knowledge is missing. */
  description: string;
  /** The query that triggered the gap. */
  triggerQuery?: string;
  /** How many times this gap has been encountered. */
  encounterCount: number;
  /** First encounter timestamp. */
  firstEncounteredAt: string;
  /** Last encounter timestamp. */
  lastEncounteredAt: string;
  /** Priority 0-1 (higher = more urgent). */
  priority: number;
  /** Whether a research task has been scheduled. */
  researchScheduled: boolean;
  /** Status. */
  status: "open" | "researching" | "resolved" | "unresolvable";
}

// ── Research Tasks ───────────────────────────────────────────────────────

export type ResearchPriority =
  | "critical"    // government changes, emergency alerts
  | "high"        // travel updates, financial updates
  | "medium"      // local business changes, event updates
  | "low"         // general knowledge refresh
  | "background"; // routine refresh

export interface ResearchTask {
  /** Unique task id. */
  taskId: string;
  /** The knowledge gap this task addresses (if any). */
  gapId?: string;
  /** What to research. */
  query: string;
  /** The domain. */
  domain: string;
  /** Priority. */
  priority: ResearchPriority;
  /** Sources to query. */
  targetSources: KnowledgeSource[];
  /** Status. */
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  /** Scheduled execution time. */
  scheduledFor: string;
  /** Started at. */
  startedAt?: string;
  /** Completed at. */
  completedAt?: string;
  /** Results (facts discovered). */
  results?: KnowledgeFact[];
  /** Error message (if failed). */
  error?: string;
  /** Retry count. */
  retryCount: number;
}

// ── World State ──────────────────────────────────────────────────────────

export type WorldStateMetric =
  | "weather" | "traffic" | "currency" | "fuel_prices" | "inflation"
  | "public_holidays" | "government_notices" | "emergency_alerts"
  | "sports" | "breaking_news" | "airports" | "flights" | "hotels"
  | "exchange_rates" | "economic_indicators" | "tourism" | "business_openings"
  | "road_closures" | "public_events";

export interface WorldStateEntry {
  /** Unique entry id. */
  entryId: string;
  /** The metric type. */
  metric: WorldStateMetric;
  /** Geographic scope (country code, city, or "global"). */
  scope: string;
  /** The metric value. */
  value: Record<string, unknown>;
  /** Source. */
  source: KnowledgeSource;
  /** When this entry was last refreshed. */
  refreshedAt: string;
  /** When this entry expires. */
  expiresAt: string;
  /** Refresh interval (ms). */
  refreshIntervalMs: number;
  /** Whether this entry is currently active. */
  active: boolean;
}

// ── Predictions ──────────────────────────────────────────────────────────

export type PredictionType =
  | "next_destination" | "next_restaurant" | "next_payment" | "next_contact"
  | "next_search" | "next_event" | "next_transport" | "next_reminder"
  | "next_purchase" | "next_travel" | "next_action" | "next_module";

export interface Prediction {
  /** Unique prediction id. */
  predictionId: string;
  /** The user this prediction is for. */
  userId?: string;
  /** Prediction type. */
  type: PredictionType;
  /** Predicted value/entity. */
  predicted: Record<string, unknown>;
  /** Confidence 0-1. */
  confidence: number;
  /** Time horizon (when this prediction is relevant). */
  timeHorizon: string;
  /** Reasoning (why this prediction was made). */
  reasoning: string;
  /** Evidence (node ids, event ids, patterns supporting this prediction). */
  evidence: string[];
  /** When this prediction was made. */
  createdAt: string;
  /** Whether this prediction was fulfilled (and when). */
  fulfilledAt?: string;
  /** Whether the prediction was correct (if fulfilled). */
  correct?: boolean;
}

// ── Domain Trainers ──────────────────────────────────────────────────────

export type DomainTrainerType =
  | "travel" | "payments" | "messaging" | "feed" | "maps" | "shopping"
  | "government" | "health" | "jobs" | "creator" | "circle" | "mail"
  | "identity" | "education" | "media";

export interface DomainKnowledge {
  /** The domain. */
  domain: DomainTrainerType;
  /** Domain-specific knowledge facts. */
  facts: KnowledgeFact[];
  /** Learned patterns. */
  patterns: DomainPattern[];
  /** Recommendation model (weights, features). */
  recommendationModel: DomainModel;
  /** Prediction model. */
  predictionModel: DomainModel;
  /** Ranking config. */
  ranking: DomainRanking;
  /** Overall confidence in this domain's knowledge. */
  confidence: number;
  /** When this domain was last trained. */
  lastTrainedAt: string;
  /** Freshness score 0-1 (how up-to-date the knowledge is). */
  freshness: number;
}

export interface DomainPattern {
  /** Pattern id. */
  patternId: string;
  /** Pattern description. */
  description: string;
  /** Pattern trigger (when this pattern applies). */
  trigger: Record<string, unknown>;
  /** Pattern action (what to do). */
  action: Record<string, unknown>;
  /** Confidence 0-1. */
  confidence: number;
  /** How many times this pattern was observed. */
  observationCount: number;
  /** When this pattern was last observed. */
  lastObservedAt: string;
}

export interface DomainModel {
  /** Model type (e.g., "weighted_features", "matrix_factorization", "ranknet"). */
  type: string;
  /** Model weights/parameters. */
  weights: Record<string, number>;
  /** Features used. */
  features: string[];
  /** Model accuracy 0-1 (if measured). */
  accuracy?: number;
  /** When the model was last updated. */
  updatedAt: string;
}

export interface DomainRanking {
  /** Ranking factors. */
  factors: Record<string, number>;
  /** Diversity penalty. */
  diversityPenalty: number;
  /** Freshness boost. */
  freshnessBoost: number;
  /** Personalization weight. */
  personalizationWeight: number;
}

// ── Cross-Module Intelligence ─────────────────────────────────────────────

export interface CrossModuleInference {
  /** Inference id. */
  inferenceId: string;
  /** The trigger event that caused this inference. */
  triggerEventId: string;
  /** The module that triggered the inference. */
  sourceModule: string;
  /** Inferred needs (what the user likely needs next). */
  inferredNeeds: InferredNeed[];
  /** When this inference was made. */
  createdAt: string;
  /** Whether the inference was acted upon. */
  actedUpon: boolean;
}

export interface InferredNeed {
  /** The module that can fulfill this need. */
  module: string;
  /** What the user needs. */
  need: string;
  /** Confidence 0-1. */
  confidence: number;
  /** Suggested action. */
  suggestedAction: Record<string, unknown>;
}

// ── Provider Learning ────────────────────────────────────────────────────

export type AIProviderName = "groq" | "openrouter" | "gemini" | "openai" | "huggingface";

export interface ProviderMetrics {
  /** Provider name. */
  provider: AIProviderName;
  /** Accuracy score 0-1 (based on user feedback on provider responses). */
  accuracy: number;
  /** Average latency (ms). */
  avgLatencyMs: number;
  /** Cost per 1k tokens. */
  costPer1k: number;
  /** Arabic quality score 0-1. */
  arabicQuality: number;
  /** Reasoning score 0-1. */
  reasoningScore: number;
  /** Code generation score 0-1. */
  codeScore: number;
  /** Vision score 0-1. */
  visionScore: number;
  /** Reliability score 0-1 (uptime + success rate). */
  reliability: number;
  /** Availability score 0-1. */
  availability: number;
  /** Total calls measured. */
  totalCalls: number;
  /** Last updated. */
  updatedAt: string;
}

// ── Capability Learning ──────────────────────────────────────────────────

export interface DiscoveredCapability {
  /** Discovery id. */
  discoveryId: string;
  /** Capability name/id. */
  capabilityId: string;
  /** Type (api, model, plugin, government_integration, payment_provider, etc.). */
  type: "api" | "model" | "plugin" | "government_integration" | "payment_provider" | "mapping_provider" | "travel_provider";
  /** Description. */
  description: string;
  /** Provider/source. */
  provider: string;
  /** Coverage (countries/regions). */
  coverage: string[];
  /** Integration difficulty 0-1 (0 = easy, 1 = hard). */
  integrationDifficulty: number;
  /** Estimated value 0-1 (how useful this capability would be). */
  estimatedValue: number;
  /** Trust score 0-100. */
  trustScore: number;
  /** Status. */
  status: "discovered" | "evaluating" | "approved" | "rejected" | "integrated";
  /** When this capability was discovered. */
  discoveredAt: string;
}

// ── Training Pipeline ────────────────────────────────────────────────────

export interface TrainingRunResult {
  /** Run id. */
  runId: string;
  /** When the run started. */
  startedAt: string;
  /** When the run completed. */
  completedAt: string;
  /** Duration (ms). */
  durationMs: number;
  /** Events processed. */
  eventsProcessed: number;
  /** Journeys recognized. */
  journeysRecognized: number;
  /** Knowledge facts updated. */
  factsUpdated: number;
  /** Knowledge gaps detected. */
  gapsDetected: number;
  /** Research tasks created. */
  researchTasksCreated: number;
  /** Predictions generated. */
  predictionsGenerated: number;
  /** Models evaluated. */
  modelsEvaluated: number;
  /** Improvements published. */
  improvementsPublished: number;
  /** Errors encountered. */
  errors: string[];
  /** Run status. */
  status: "success" | "partial" | "failed";
}

// ── Learning Orchestrator ────────────────────────────────────────────────

export type LearningTaskType =
  | "event_processing" | "journey_analysis" | "knowledge_acquisition"
  | "gap_detection" | "research" | "validation" | "freshness_check"
  | "world_state_refresh" | "prediction_generation" | "domain_training"
  | "model_evaluation" | "provider_evaluation" | "capability_discovery"
  | "graph_update" | "semantic_memory_build" | "knowledge_compression";

export interface LearningTask {
  /** Task id. */
  taskId: string;
  /** Task type. */
  type: LearningTaskType;
  /** Priority 0-1. */
  priority: number;
  /** Scheduled execution time. */
  scheduledFor: string;
  /** Status. */
  status: "queued" | "in_progress" | "completed" | "failed";
  /** Task payload. */
  payload: Record<string, unknown>;
  /** Result (when completed). */
  result?: Record<string, unknown>;
  /** Error (if failed). */
  error?: string;
  /** Started at. */
  startedAt?: string;
  /** Completed at. */
  completedAt?: string;
}

// ── Model Evaluation ─────────────────────────────────────────────────────

export interface ModelEvaluation {
  /** Evaluation id. */
  evaluationId: string;
  /** Model being evaluated (e.g., "irde_recommendation", "prediction_engine"). */
  modelName: string;
  /** Accuracy 0-1. */
  accuracy: number;
  /** Precision 0-1. */
  precision: number;
  /** Recall 0-1. */
  recall: number;
  /** F1 score 0-1. */
  f1Score: number;
  /** Latency (ms). */
  latencyMs: number;
  /** Sample size. */
  sampleSize: number;
  /** When this evaluation was conducted. */
  evaluatedAt: string;
  /** Recommendation (deploy/rollback/monitor). */
  recommendation: "deploy" | "rollback" | "monitor" | "retrain";
}

// ── Knowledge Compression ────────────────────────────────────────────────

export interface CompressionResult {
  /** Compression run id. */
  runId: string;
  /** Nodes before compression. */
  nodesBefore: number;
  /** Nodes after compression. */
  nodesAfter: number;
  /** Edges before compression. */
  edgesBefore: number;
  /** Edges after compression. */
  edgesAfter: number;
  /** Facts archived. */
  factsArchived: number;
  /** Facts merged. */
  factsMerged: number;
  /** Space saved (bytes, estimated). */
  spaceSavedBytes: number;
  /** When compression ran. */
  ranAt: string;
}

// ── Semantic Memory ──────────────────────────────────────────────────────

export interface SemanticMemory {
  /** Memory id. */
  memoryId: string;
  /** The concept/entity this memory is about. */
  concept: string;
  /** Semantic embedding (simplified — would be a vector in production). */
  embedding: number[];
  /** Associated node ids in the knowledge graph. */
  nodeIds: string[];
  /** Related concepts. */
  relatedConcepts: string[];
  /** Abstraction level 0-5 (0 = concrete, 5 = highly abstract). */
  abstractionLevel: number;
  /** When this memory was formed. */
  formedAt: string;
  /** Last accessed. */
  lastAccessedAt: string;
  /** Access count. */
  accessCount: number;
}

// ── Consent/Privacy ──────────────────────────────────────────────────────

export interface LearningConsent {
  /** User id. */
  userId: string;
  /** Whether event learning is allowed. */
  eventLearning: boolean;
  /** Whether journey tracking is allowed. */
  journeyTracking: boolean;
  /** Whether cross-module inference is allowed. */
  crossModuleInference: boolean;
  /** Whether prediction generation is allowed. */
  predictionGeneration: boolean;
  /** Whether federated learning is allowed. */
  federatedLearning: boolean;
  /** Whether on-device learning is allowed. */
  onDeviceLearning: boolean;
  /** Consent timestamp. */
  grantedAt: string;
}

// ── AIKE Input/Output (main entry) ───────────────────────────────────────

export interface AIKEInput {
  /** A platform event to learn from (optional). */
  event?: PlatformEvent;
  /** Whether to run gap detection. */
  detectGaps?: boolean;
  /** Whether to update the knowledge graph. */
  updateGraph?: boolean;
  /** Whether to generate predictions. */
  generatePredictions?: boolean;
  /** Whether to run cross-module inference. */
  inferCrossModule?: boolean;
  /** User consent scope. */
  consentScope?: string[];
  /** User id (if applicable). */
  userId?: string;
}

export interface AIKEResult {
  /** Events processed. */
  eventsProcessed: number;
  /** Journeys recognized. */
  journeysRecognized: number;
  /** Knowledge facts updated. */
  factsUpdated: number;
  /** Knowledge gaps detected. */
  gapsDetected: number;
  /** Research tasks created. */
  researchTasksCreated: number;
  /** Predictions generated. */
  predictionsGenerated: number;
  /** Cross-module inferences made. */
  crossModuleInferences: number;
  /** Graph nodes updated. */
  graphNodesUpdated: number;
  /** Duration (ms). */
  durationMs: number;
  /** Errors (non-fatal). */
  errors: string[];
}

// ── Autonomous Intelligence Context Section (for Shared Context) ─────────

export interface AutonomousIntelligenceContextSection {
  /** Total events learned from. */
  totalEventsLearned: number;
  /** Total journeys recognized. */
  totalJourneysRecognized: number;
  /** Knowledge graph size (nodes). */
  graphNodes: number;
  /** Knowledge graph size (edges). */
  graphEdges: number;
  /** World state entries (active). */
  worldStateEntries: number;
  /** Open knowledge gaps. */
  openGaps: number;
  /** Pending research tasks. */
  pendingResearch: number;
  /** Active predictions. */
  activePredictions: number;
  /** Last training run. */
  lastTrainingRun?: string;
  /** Last training result. */
  lastTrainingResult?: TrainingRunResult;
}

// ── Re-exports for convenience ───────────────────────────────────────────

export type { SharedContext } from "@/lib/cognitive/shared-context";
