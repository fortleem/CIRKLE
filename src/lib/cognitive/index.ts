/**
 * CIRKLE Brain AI — Shared Cognitive Foundation (public API)
 * ============================================================================
 *
 * Phase 4.5 barrel. Re-exports the Context Manager, Capability Registry,
 * Shared Context schema, and the optional Cognitive Pipeline.
 *
 * Import convention:
 *   import { globalContextManager, globalCapabilityRegistry, runCognitivePipeline }
 *     from "@/lib/cognitive";
 * ============================================================================
 */

export {
  type SharedContext,
  type ContextSectionKey,
  type ContextSectionOwner,
  type RequestContext,
  type SessionContext,
  type GeographicContext,
  type UserContext,
  type ReasoningContext,
  type ValidationContext,
  type RecommendationContext,
  type PlatformContext,
  type ExecutionContext,
  type LearningContext,
  type ContextMetadata,
  type ProvenanceEntry,
  type CorrelationIds,
  type ContextValidationResult,
  SECTION_OWNERSHIP,
  SHARED_CONTEXT_SCHEMA_VERSION,
  validateContext,
} from "./shared-context";

export { ContextManager, globalContextManager } from "./context-manager";

export {
  CapabilityRegistry,
  globalCapabilityRegistry,
  validateCapability,
  type Capability,
  type CapabilityCategory,
  type CapabilityContract,
  type CapabilitySearchQuery,
  type CapabilityRegistryStats,
  type CapabilityValidationResult,
  type CapabilityAvailability,
  type CapabilityStatus,
} from "./capability-registry";

export { seedCapabilities, ensureCapabilitiesSeeded } from "./capability-seed";

export {
  runCognitivePipeline,
  type CognitivePipelineInput,
  type CognitivePipelineResult,
  type ContextTrace,
  type ContextDebug,
} from "./cognitive-pipeline";
