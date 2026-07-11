/**
 * CIRKLE Brain AI — Capability Intelligence Engine (CIE) — Public API
 * ============================================================================
 * Import convention:
 *   import { globalCIEEngine, type CountryIntelligence } from "@/lib/cie";
 * ============================================================================
 */

export { CIEEngine, globalCIEEngine, seedCIE, ensureCIESeeded } from "./cie-engine";

export { CountryIntelligenceModel, globalCountryIntelligence } from "./country-intelligence";
export { GovernmentIntelligenceModel, globalGovernmentIntelligence } from "./government-intelligence";
export { PartnerIntelligenceModel, globalPartnerIntelligence } from "./partner-intelligence";
export { EnterpriseIntelligenceModel, globalEnterpriseIntelligence } from "./enterprise-intelligence";
export { CapabilityOntologyModel, globalCapabilityOntology } from "./capability-ontology";
export { KnowledgeGraphModel, globalKnowledgeGraph } from "./knowledge-graph";
export { DiscoveryService, globalDiscoveryService } from "./discovery-service";
export { VersioningFramework, globalVersioningFramework } from "./versioning";

export {
  CIE_SCHEMA_VERSION,
  type CountryIntelligence,
  type GovernmentIntelligence,
  type GovernmentServiceType,
  type PartnerIntelligence,
  type PartnerCategory,
  type EnterpriseIntelligence,
  type EnterpriseIntegrationType,
  type OntologyNode,
  type OntologyLevel,
  type CapabilityOntology,
  type KnowledgeGraphNode,
  type KnowledgeGraphEdge,
  type KnowledgeGraphEdgeType,
  type KnowledgeGraphNodeType,
  type KnowledgeGraph,
  type RolloutStage,
  type CapabilityVersionInfo,
  type DiscoveryQuery,
  type DiscoveryResult,
  type CIEStatus,
  type CIEContextSection,
} from "./types";
