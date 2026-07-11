/**
 * CIRKLE Brain AI — Platform Capability Pack Framework (PCPF)
 * ============================================================================
 *
 * The main orchestrator. PCPF provides a scalable extension mechanism for
 * platform capabilities while preserving the single AI architecture.
 *
 * PCPF is NOT an AI phase. It is a framework that:
 *   1. Validates capability packs.
 *   2. Manages pack lifecycle (install, upgrade, deprecate, rollback, remove).
 *   3. Loads packs into the Capability Registry + TEE Executor Registry.
 *   4. Provides discovery + observability.
 *
 * Constitutional alignment:
 *   - One AI model (packs don't add AI).
 *   - One reasoning pipeline (CRIE — packs don't reason).
 *   - One orchestration engine (UOB — packs don't plan).
 *   - One execution engine (TEE — packs don't execute autonomously).
 *   - One learning engine (LIEE — packs don't learn).
 *   - Capability Packs are declarative extensions, not independent AI agents.
 * ============================================================================
 */

import type { CapabilityPack, InstallationResult, PCPFStatus } from "./types";
import { PCPF_SCHEMA_VERSION } from "./types";
import { globalLifecycleManager } from "./lifecycle-manager";
import { globalPackRegistry } from "./pack-registry";
import { globalPackLoader } from "./pack-loader";
import { globalPackValidator } from "./pack-validator";

// ── PCPF Framework ───────────────────────────────────────────────────────

export class PCPFFramework {
  /**
   * Install a capability pack.
   * Validates → registers in Pack Registry → loads capabilities into Capability Registry + TEE.
   */
  async install(pack: CapabilityPack): Promise<InstallationResult> {
    // 1. Validate the pack.
    const installedIds = globalPackRegistry.getInstalledPackIds();
    const validation = globalPackValidator.validate(pack, installedIds);
    if (!validation.valid) {
      return {
        success: false,
        packId: pack.manifest.packId,
        version: pack.manifest.version,
        lifecycleState: "failed",
        registeredCapabilities: [],
        registeredAdapters: [],
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    // 2. Lifecycle manager: register + activate.
    const installResult = await globalLifecycleManager.install(pack);
    if (!installResult.success) {
      return installResult;
    }

    // 3. Pack loader: register capabilities into Capability Registry + TEE.
    const loadResult = await globalPackLoader.load(pack);

    return {
      ...installResult,
      registeredCapabilities: loadResult.registeredCapabilities,
      registeredAdapters: loadResult.registeredAdapters,
      errors: [...installResult.errors, ...loadResult.errors],
      warnings: [...installResult.warnings],
    };
  }

  /**
   * Upgrade a pack to a new version.
   */
  async upgrade(pack: CapabilityPack): Promise<InstallationResult> {
    const result = await globalLifecycleManager.upgrade(pack);
    if (result.success) {
      const loadResult = await globalPackLoader.load(pack);
      result.registeredCapabilities = loadResult.registeredCapabilities;
      result.registeredAdapters = loadResult.registeredAdapters;
      result.errors = [...result.errors, ...loadResult.errors];
    }
    return result;
  }

  /**
   * Deprecate a pack.
   */
  deprecate(packId: string): boolean {
    return globalLifecycleManager.deprecate(packId);
  }

  /**
   * Disable a pack.
   */
  disable(packId: string): boolean {
    return globalLifecycleManager.disable(packId);
  }

  /**
   * Enable a disabled pack.
   */
  enable(packId: string): boolean {
    return globalLifecycleManager.enable(packId);
  }

  /**
   * Rollback a pack to its previous version.
   */
  async rollback(packId: string): Promise<InstallationResult> {
    const previous = globalLifecycleManager.rollback(packId);
    if (!previous) {
      return {
        success: false,
        packId,
        version: "",
        lifecycleState: "active",
        registeredCapabilities: [],
        registeredAdapters: [],
        errors: ["No previous version available for rollback"],
        warnings: [],
      };
    }
    const loadResult = await globalPackLoader.load(previous);
    return {
      success: true,
      packId,
      version: previous.manifest.version,
      lifecycleState: "rolled-back",
      registeredCapabilities: loadResult.registeredCapabilities,
      registeredAdapters: loadResult.registeredAdapters,
      errors: loadResult.errors,
      warnings: [],
    };
  }

  /**
   * Remove a pack entirely.
   */
  async remove(packId: string): Promise<boolean> {
    const pack = globalPackRegistry.get(packId);
    if (!pack) return false;
    await globalPackLoader.unload(pack);
    return globalLifecycleManager.remove(packId);
  }

  /**
   * Check compatibility without installing.
   */
  checkCompatibility(pack: CapabilityPack): { compatible: boolean; issues: string[] } {
    return globalLifecycleManager.checkCompatibility(pack);
  }

  /**
   * Get a pack by id.
   */
  getPack(packId: string): CapabilityPack | null {
    return globalPackRegistry.get(packId);
  }

  /**
   * List all installed packs.
   */
  listPacks(): CapabilityPack[] {
    return globalPackRegistry.list();
  }

  /**
   * Framework status + observability.
   */
  status(): PCPFStatus {
    const packs = globalPackRegistry.list();
    const stats = globalPackRegistry.getStats();
    return {
      frameworkVersion: String(PCPF_SCHEMA_VERSION),
      installedPacks: stats.total,
      activePacks: stats.active,
      totalCapabilities: packs.reduce((sum, p) => sum + p.capabilities.length, 0),
      packs: packs.map((p) => ({
        packId: p.manifest.packId,
        name: p.manifest.name,
        version: p.manifest.version,
        category: p.manifest.category,
        lifecycleState: p.manifest.lifecycleState,
        capabilityCount: p.capabilities.length,
      })),
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalPCPFFramework = new PCPFFramework();
