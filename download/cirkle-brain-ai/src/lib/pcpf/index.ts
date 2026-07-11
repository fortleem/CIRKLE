/**
 * CIRKLE Brain AI — Platform Capability Pack Framework (PCPF) — Public API
 * ============================================================================
 *
 * Import convention:
 *   import { globalPCPFFramework, type CapabilityPack } from "@/lib/pcpf";
 * ============================================================================
 */

export { PCPFFramework, globalPCPFFramework } from "./pcpf-framework";
export { PackValidator, globalPackValidator } from "./pack-validator";
export { PolicyModel, globalPolicyModel } from "./policy-model";
export { LocalizationModel, globalLocalizationModel } from "./localization-model";
export { PackRegistry, globalPackRegistry } from "./pack-registry";
export { LifecycleManager, globalLifecycleManager } from "./lifecycle-manager";
export { PackLoader, globalPackLoader } from "./pack-loader";

export { travelPack, paymentsPack, governmentPack, samplePacks } from "./sample-packs";

export {
  PCPF_SCHEMA_VERSION,
  type PackManifest,
  type PackDependency,
  type PackCapability,
  type WorkflowTemplate,
  type WorkflowTemplateStep,
  type PolicyDefinition,
  type PolicyType,
  type LocalizationResource,
  type IntegrationAdapter,
  type PackMetrics,
  type CapabilityPack,
  type PackLifecycleState,
  type PackCategory,
  type PackValidationResult,
  type InstallationResult,
  type PCPFStatus,
} from "./types";
