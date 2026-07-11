/**
 * CIRKLE Brain AI — Platform Capability Pack Framework (PCPF) Types
 * ============================================================================
 *
 * PCPF enables the CIRKLE Super App to grow through modular capability packs
 * that integrate with the existing 7-phase AI Operating System.
 *
 * CRITICAL: Capability Packs are DECLARATIVE EXTENSIONS, not independent AI
 * agents. They never replace or duplicate the responsibilities of GCIE, PMB,
 * CRIE, IRDE, UOB, TEE, or LIEE. They expose capabilities that the Core AI
 * can discover, plan, orchestrate, execute, and learn from.
 *
 * Integration model:
 *   - Pack capabilities → registered into the Capability Registry (Phase 4.5)
 *   - Pack executors → registered into the TEE Capability Executor Registry (Phase 6)
 *   - UOB discovers capabilities via the Capability Registry (never hardcodes packs)
 *   - TEE invokes capabilities via standardized executor interfaces
 *   - LIEE learns from capability usage without changing pack implementations
 * ============================================================================
 */

// ── Pack Lifecycle ───────────────────────────────────────────────────────

export type PackLifecycleState =
  | "draft" // being authored
  | "validated" // passed validation, not yet installed
  | "installing" // installation in progress
  | "active" // installed and operational
  | "disabled" // temporarily disabled
  | "deprecated" // marked for removal, still functional
  | "upgrading" // upgrade in progress
  | "rolled-back" // a previous version was restored
  | "failed" // installation or operation failed
  | "removed"; // uninstalled

export type PackCategory =
  | "travel"
  | "business"
  | "payments"
  | "commerce"
  | "social"
  | "government"
  | "healthcare"
  | "education"
  | "entertainment"
  | "enterprise"
  | "utilities"
  | "security"
  | "communication"
  | "identity"
  | "ai"
  | (string & {}); // extensible

// ── Pack Manifest ────────────────────────────────────────────────────────

/**
 * The pack manifest — the declarative description of a capability pack.
 * This is the standard structure every pack must provide.
 */
export interface PackManifest {
  /** Globally unique pack id (e.g. "cirkle.travel"). */
  packId: string;
  /** Human-readable name. */
  name: string;
  /** Short description. */
  description: string;
  /** Semantic version (semver). */
  version: string;
  /** Pack category. */
  category: PackCategory;
  /** Author/vendor. */
  author: string;
  /** License. */
  license: string;
  /** Homepage URL. */
  homepage?: string;
  /** Supported regions (ISO country codes, or "*" for global). */
  supportedRegions: string[];
  /** Pack-level dependencies (other pack ids + versions). */
  dependencies: PackDependency[];
  /** Required permissions. */
  permissions: string[];
  /** Consent purposes required. */
  consentPurposes: string[];
  /** Lifecycle state (managed by the lifecycle manager). */
  lifecycleState: PackLifecycleState;
  /** Minimum platform version required. */
  minPlatformVersion?: string;
  /** Whether this pack is signed (supply-chain validation). */
  signed: boolean;
  /** Signature (if signed). */
  signature?: string;
  /** Entry points (capability ids exposed by this pack). */
  entryPoints: string[];
}

// ── Pack Dependency ──────────────────────────────────────────────────────

export interface PackDependency {
  /** The pack id this depends on. */
  packId: string;
  /** Version range (semver range, e.g. "^1.0.0"). */
  versionRange: string;
  /** Whether this dependency is required (vs. optional). */
  required: boolean;
}

// ── Pack Capability Definition ───────────────────────────────────────────

/**
 * A capability exposed by a pack. This maps to the Capability Registry's
 * Capability interface (Phase 4.5), extended with pack-specific metadata.
 */
export interface PackCapability {
  /** Unique capability id (namespaced: packId.capabilityName). */
  capabilityId: string;
  /** Human-readable name. */
  name: string;
  /** Description. */
  description: string;
  /** Category (inherited from pack or overridden). */
  category: PackCategory;
  /** Input schema (field → type + required + description). */
  inputSchema: Record<string, { type: string; required?: boolean; description?: string }>;
  /** Output schema. */
  outputSchema: Record<string, { type: string; description?: string }>;
  /** Required permissions. */
  permissions: string[];
  /** Capability-level dependencies (other capability ids). */
  dependencies: string[];
  /** Availability state. */
  availability: "available" | "beta" | "deprecated" | "internal";
  /** Tags for discovery. */
  tags: string[];
  /** Country-specific availability (optional; if absent, inherits pack's supportedRegions). */
  availableInCountries?: string[];
  /** Whether this capability requires user confirmation before execution. */
  requiresConfirmation: boolean;
  /** Documentation URL or inline doc. */
  documentation?: string;
}

// ── Workflow Template ────────────────────────────────────────────────────

/**
 * A reusable workflow template that UOB may use as a planning shortcut.
 * Templates are declarative — they describe capability sequences, not
 * executable logic.
 */
export interface WorkflowTemplate {
  templateId: string;
  name: string;
  description: string;
  /** Ordered capability sequence. */
  steps: WorkflowTemplateStep[];
  /** When this template applies (intent type + workspace). */
  applicableIntent: string;
  applicableWorkspace: string;
  /** Required permissions for the whole workflow. */
  requiredPermissions: string[];
}

export interface WorkflowTemplateStep {
  capabilityId: string;
  /** Inputs to pass (may reference context fields). */
  inputs: Record<string, string>; // inputName → contextPath (e.g. "user.identity.username")
  /** Whether this step is optional. */
  optional: boolean;
}

// ── Policy Definition ────────────────────────────────────────────────────

export type PolicyType =
  | "user-permission" // user must hold a permission token
  | "enterprise-permission" // enterprise admin must grant
  | "organization-permission" // org-level permission
  | "country-constraint" // country-specific rule
  | "consent-requirement" // consent purpose required
  | "regulatory-prerequisite" // regulatory compliance
  | "rate-limit" // invocation rate limit
  | "time-window"; // time-based restriction

export interface PolicyDefinition {
  policyId: string;
  type: PolicyType;
  description: string;
  /** The capability this policy applies to. */
  capabilityId?: string;
  /** Policy-specific rules. */
  rules: Record<string, unknown>;
  /** Countries where this policy applies (or "*" for all). */
  applicableCountries: string[];
  /** Whether this policy blocks execution or just warns. */
  enforcement: "block" | "warn";
}

// ── Localization Resource ────────────────────────────────────────────────

export interface LocalizationResource {
  /** ISO language code (e.g. "en", "ar"). */
  language: string;
  /** ISO country code (e.g. "EG", "SA"). */
  country?: string;
  /** Translation key → value. */
  strings: Record<string, string>;
  /** Country-specific workflow overrides (template ids). */
  workflowOverrides?: string[];
  /** Country-specific compliance rules. */
  complianceRules?: string[];
}

// ── Integration Adapter ──────────────────────────────────────────────────

/**
 * An integration adapter connects a pack capability to an external service.
 * Adapters are registered into the TEE Capability Executor Registry.
 */
export interface IntegrationAdapter {
  /** The capability this adapter handles. */
  capabilityId: string;
  /** Adapter type (internal, external-api, government, payment-provider, plugin). */
  type: "internal" | "external-api" | "government" | "payment-provider" | "plugin";
  /** The executor function (registered into TEE). */
  executor: (inputs: Record<string, unknown>, ctx: unknown) => Promise<unknown>;
  /** Whether this adapter requires secure credential handling. */
  requiresCredentials: boolean;
  /** Secret references (never inline secrets). */
  secretReferences?: string[];
}

// ── Pack Metrics (Observability) ─────────────────────────────────────────

export interface PackMetrics {
  packId: string;
  invocationCount: number;
  successCount: number;
  failureCount: number;
  averageLatencyMs: number;
  policyDenials: number;
  dependencyIssues: number;
  lastInvoked?: string;
}

// ── Full Capability Pack ─────────────────────────────────────────────────

/**
 * A complete capability pack — manifest + capabilities + templates + policies
 * + localization + adapters.
 */
export interface CapabilityPack {
  manifest: PackManifest;
  capabilities: PackCapability[];
  workflowTemplates: WorkflowTemplate[];
  policies: PolicyDefinition[];
  localization: LocalizationResource[];
  adapters: IntegrationAdapter[];
  /** Installation timestamp. */
  installedAt?: string;
  /** Last-updated timestamp. */
  updatedAt?: string;
}

// ── Validation Result ────────────────────────────────────────────────────

export interface PackValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** Dependency check results. */
  dependencyIssues: string[];
  /** Compatibility check results. */
  compatibilityIssues: string[];
}

// ── Installation Result ──────────────────────────────────────────────────

export interface InstallationResult {
  success: boolean;
  packId: string;
  version: string;
  lifecycleState: PackLifecycleState;
  registeredCapabilities: string[];
  registeredAdapters: string[];
  errors: string[];
  warnings: string[];
}

// ── PCPF Framework input/output ──────────────────────────────────────────

export interface PCPFStatus {
  frameworkVersion: string;
  installedPacks: number;
  activePacks: number;
  totalCapabilities: number;
  packs: { packId: string; name: string; version: string; category: string; lifecycleState: PackLifecycleState; capabilityCount: number }[];
}

// ── Schema version ───────────────────────────────────────────────────────

export const PCPF_SCHEMA_VERSION = 1;
