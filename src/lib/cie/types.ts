/**
 * CIRKLE Brain AI — Capability Intelligence Engine (CIE) Types
 * ============================================================================
 *
 * Phase 8 — Capability Intelligence Engine
 *
 * CIE is the AI's internal cognitive model of the entire CIRKLE ecosystem.
 * Unlike GCIE (which understands the external world), CIE understands the
 * INTERNAL world of CIRKLE: platform capabilities, modules, workspaces,
 * APIs, connectors, partners, government integrations, country capabilities,
 * enterprise integrations, and capability relationships.
 *
 * Constitutional role:
 *   - CIE OWNS platform knowledge, capability knowledge, module knowledge,
 *     country/government/partner/enterprise intelligence, capability taxonomy,
 *     knowledge graph, discovery metadata, capability ontology + evolution.
 *   - CIE NEVER owns user memory (PMB), reasoning (CRIE), recommendation
 *     ranking (IRDE), workflow execution (TEE), goal decomposition (UOB),
 *     orchestration planning (UOB), or runtime execution (TEE).
 *   - CIE supplies structured platform intelligence TO UOB, TEE, LIEE, and
 *     future platform services. It does not reason, recommend, or execute.
 *
 * Architecture separation (per final recommendation):
 *   - Capability Registry (Phase 4.5): runtime registration, availability,
 *     endpoint resolution, version management, runtime discovery.
 *   - CIE (Phase 8): cognitive knowledge layer — understands capabilities,
 *     models relationships, represents countries/partners/regulations/
 *     workflows/dependencies, supplies semantic knowledge to the AI.
 * ============================================================================
 */

// ── Country Intelligence ─────────────────────────────────────────────────

export interface CountryIntelligence {
  /** ISO 3166-1 alpha-2 country code (e.g. "EG", "SA", "AE", "US"). */
  countryCode: string;
  /** Human-readable country name. */
  name: string;
  /** Supported languages (ISO 639-1, e.g. ["ar", "en"]). */
  languages: string[];
  /** Currencies (ISO 4217, e.g. ["EGP"]). */
  currencies: string[];
  /** Time zones (IANA, e.g. ["Africa/Cairo"]). */
  timeZones: string[];
  /** Government agencies operating in this country. */
  governmentAgencies: string[];
  /** Identity providers (national ID systems). */
  identityProviders: string[];
  /** Payment rails available (e.g. ["ach", "rtgs", "mobile-money"]). */
  paymentRails: string[];
  /** Tax system identifier. */
  taxSystem: string;
  /** Digital signature framework (e.g. "qualified-electronic-signature"). */
  digitalSignatureFramework?: string;
  /** Regulatory constraints (regulatory body → rules). */
  regulatoryConstraints: Record<string, string[]>;
  /** Local compliance rules. */
  complianceRules: string[];
  /** Available capability packs in this country. */
  availableCapabilityPacks: string[];
  /** Regional feature availability (feature → available). */
  regionalFeatureAvailability: Record<string, boolean>;
  /** Localization requirements. */
  localizationRequirements: string[];
  /** Country status. */
  status: "active" | "beta" | "planned" | "deprecated";
}

// ── Government Intelligence ──────────────────────────────────────────────

export type GovernmentServiceType =
  | "national-identity"
  | "business-registration"
  | "tax-services"
  | "customs"
  | "immigration"
  | "licensing"
  | "social-services"
  | "digital-signature"
  | "public-payments"
  | "open-government-api"
  | "healthcare"
  | "education"
  | "property"
  | "vehicle-registration";

export interface GovernmentIntelligence {
  /** Unique service id (e.g. "gov.eg.nida"). */
  serviceId: string;
  /** Service name. */
  name: string;
  /** Service type. */
  type: GovernmentServiceType;
  /** Country code. */
  countryCode: string;
  /** Government agency that operates this service. */
  agency: string;
  /** Description. */
  description: string;
  /** API endpoint type (rest, soap, graphql, manual). */
  apiType: "rest" | "soap" | "graphql" | "manual";
  /** Authentication method. */
  authMethod: string;
  /** Required credentials/permissions. */
  requiredCredentials: string[];
  /** Service availability status. */
  status: "active" | "beta" | "planned" | "deprecated";
  /** Integration complexity (low, medium, high). */
  complexity: "low" | "medium" | "high";
  /** Related capabilities (capability ids). */
  relatedCapabilities: string[];
}

// ── Partner Intelligence ─────────────────────────────────────────────────

export type PartnerCategory =
  | "financial" // banks, payment processors, card networks, fintech
  | "travel" // airlines, hotels, rail, mobility, car rental, parking
  | "commerce" // retail, groceries, restaurants, marketplaces, logistics
  | "healthcare" // hospitals, clinics, labs, insurance
  | "education" // universities, schools, online learning
  | "enterprise" // ERP, CRM, HR, accounting, procurement
  | "communications" // messaging, telecom, email, voice, video
  | "ai" // translation, OCR, speech, vision, search, foundation models
  | "government" // government partners
  | "logistics" // shipping, delivery
  | "media" // content, streaming
  | "security" // cybersecurity, identity verification
  | (string & {}); // extensible

export interface PartnerIntelligence {
  /** Unique partner id (e.g. "partner.visa"). */
  partnerId: string;
  /** Partner name. */
  name: string;
  /** Category. */
  category: PartnerCategory;
  /** Countries where this partner operates. */
  operatingCountries: string[];
  /** Partner capabilities (what they offer). */
  capabilities: string[];
  /** Integration interface type. */
  interfaceType: "api" | "sdk" | "webhook" | "file-transfer" | "manual";
  /** API documentation URL. */
  documentationUrl?: string;
  /** Authentication method. */
  authMethod?: string;
  /** Partner lifecycle status. */
  status: "active" | "beta" | "planned" | "deprecated";
  /** Service level agreement (uptime guarantee). */
  slaUptime?: number;
  /** Average response latency in ms. */
  averageLatencyMs?: number;
  /** Regions served. */
  regions: string[];
  /** Partner policies (data sharing, compliance). */
  policies: string[];
}

// ── Enterprise Intelligence ──────────────────────────────────────────────

export type EnterpriseIntegrationType =
  | "erp"
  | "crm"
  | "supply-chain"
  | "manufacturing"
  | "procurement"
  | "accounting"
  | "hr"
  | "payroll"
  | "identity"
  | "document-management"
  | "collaboration"
  | "project-management"
  | "analytics"
  | "reporting";

export interface EnterpriseIntelligence {
  /** Unique integration id (e.g. "enterprise.sap-erp"). */
  integrationId: string;
  /** Integration name. */
  name: string;
  /** Integration type. */
  type: EnterpriseIntegrationType;
  /** Vendor. */
  vendor: string;
  /** Description. */
  description: string;
  /** Countries where this integration is available. */
  availableCountries: string[];
  /** Integration interface type. */
  interfaceType: "api" | "sdk" | "webhook" | "file-transfer" | "connector";
  /** Required permissions. */
  requiredPermissions: string[];
  /** Integration status. */
  status: "active" | "beta" | "planned" | "deprecated";
  /** Related capabilities. */
  relatedCapabilities: string[];
  /** Enterprise scale (small, medium, large, enterprise). */
  scale: "small" | "medium" | "large" | "enterprise";
}

// ── Capability Ontology (hierarchical taxonomy) ──────────────────────────

export type OntologyLevel =
  | "domain" // top level (e.g. "financial", "travel")
  | "category" // (e.g. "payments", "flights")
  | "subcategory" // (e.g. "transfers", "booking")
  | "capability" // (e.g. "pay.transfer-money")
  | "action" // (e.g. "execute", "query", "subscribe")
  | "variant"; // (e.g. "international", "domestic")

export interface OntologyNode {
  /** Node id. */
  nodeId: string;
  /** Level in the taxonomy. */
  level: OntologyLevel;
  /** Human-readable label. */
  label: string;
  /** Parent node id (null for root). */
  parentId: string | null;
  /** Child node ids. */
  childIds: string[];
  /** Capability id (if this node represents a capability). */
  capabilityId?: string;
  /** Description. */
  description?: string;
}

export interface CapabilityOntology {
  /** All ontology nodes by id. */
  nodes: Map<string, OntologyNode>;
  /** Root node ids (domain level). */
  rootIds: string[];
}

// ── Knowledge Graph ──────────────────────────────────────────────────────

export type KnowledgeGraphNodeType =
  | "capability"
  | "module"
  | "partner"
  | "country"
  | "government-service"
  | "api"
  | "policy"
  | "workflow"
  | "enterprise-integration"
  | "pack";

export interface KnowledgeGraphNode {
  /** Unique node id. */
  nodeId: string;
  /** Node type. */
  type: KnowledgeGraphNodeType;
  /** Human-readable label. */
  label: string;
  /** Reference to the underlying entity (id). */
  entityId: string;
  /** Metadata for graph queries. */
  metadata: Record<string, unknown>;
}

export type KnowledgeGraphEdgeType =
  | "depends-on" // capability → capability dependency
  | "provided-by" // capability → module/partner
  | "available-in" // capability → country
  | "regulated-by" // capability → policy/government-service
  | "composed-of" // workflow → capability
  | "replaces" // capability → capability (successor)
  | "compatible-with" // capability → capability (version compat)
  | "integrates-with" // module/partner → module/partner
  | "subset-of" // capability → domain/category (taxonomy)
  | "alternative-to"; // capability → capability

export interface KnowledgeGraphEdge {
  /** Source node id. */
  fromNodeId: string;
  /** Target node id. */
  toNodeId: string;
  /** Edge type. */
  type: KnowledgeGraphEdgeType;
  /** Edge metadata. */
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph {
  nodes: Map<string, KnowledgeGraphNode>;
  edges: KnowledgeGraphEdge[];
  /** Adjacency map for traversal: nodeId → outgoing edges. */
  adjacency: Map<string, KnowledgeGraphEdge[]>;
}

// ── Versioning & Lifecycle ───────────────────────────────────────────────

export type RolloutStage =
  | "internal" // internal testing
  | "canary" // canary release
  | "beta" // public beta
  | "gradual" // gradual rollout
  | "general-availability" // full release
  | "deprecated" // marked for removal
  | "sunset"; // no longer available

export interface CapabilityVersionInfo {
  /** Capability id. */
  capabilityId: string;
  /** Current version (semver). */
  currentVersion: string;
  /** Version history. */
  versionHistory: { version: string; releaseDate: string; changes: string }[];
  /** Compatibility range (min version that's compatible). */
  minCompatibleVersion: string;
  /** Deprecation status. */
  deprecated: boolean;
  /** Deprecation date (if deprecated). */
  deprecatedAt?: string;
  /** Sunset date (if scheduled). */
  sunsetAt?: string;
  /** Successor capability id (if replaced). */
  successorCapabilityId?: string;
  /** Rollout stage. */
  rolloutStage: RolloutStage;
  /** Regional availability (country → available). */
  regionalAvailability: Record<string, boolean>;
}

// ── Discovery ────────────────────────────────────────────────────────────

export interface DiscoveryQuery {
  /** Text search. */
  text?: string;
  /** Filter by node type. */
  type?: KnowledgeGraphNodeType;
  /** Filter by category. */
  category?: string;
  /** Filter by country. */
  country?: string;
  /** Filter by partner. */
  partner?: string;
  /** Filter by status. */
  status?: string;
  /** Max results. */
  limit?: number;
}

export interface DiscoveryResult {
  /** Matching capabilities. */
  capabilities: { capabilityId: string; name: string; description: string; category: string; status: string }[];
  /** Matching partners. */
  partners: { partnerId: string; name: string; category: string }[];
  /** Matching government services. */
  governmentServices: { serviceId: string; name: string; type: string; countryCode: string }[];
  /** Matching enterprise integrations. */
  enterpriseIntegrations: { integrationId: string; name: string; type: string }[];
  /** Graph nodes that matched. */
  graphNodes: { nodeId: string; type: KnowledgeGraphNodeType; label: string; entityId: string }[];
  /** Total matches. */
  total: number;
}

// ── CIE Engine ───────────────────────────────────────────────────────────

export interface CIEStatus {
  phase: string;
  name: string;
  status: string;
  countries: number;
  governmentServices: number;
  partners: number;
  enterpriseIntegrations: number;
  graphNodes: number;
  graphEdges: number;
  ontologyNodes: number;
  capabilitiesTracked: number;
}

export interface CIEContextSection {
  countriesKnown: number;
  partnersKnown: number;
  governmentServicesKnown: number;
  enterpriseIntegrationsKnown: number;
  graphStats: { nodes: number; edges: number };
  ontologyStats: { nodes: number; domains: number };
  topDomains: string[];
}

// ── Schema version ───────────────────────────────────────────────────────

export const CIE_SCHEMA_VERSION = 1;
