/**
 * CIRKLE Brain AI — PCPF Lifecycle Manager
 * ============================================================================
 *
 * Manages the lifecycle of capability packs:
 *   - Installation (validate → register → activate)
 *   - Upgrade (validate new version → rollback-safe swap)
 *   - Deprecation (mark deprecated, still functional)
 *   - Rollback (restore previous version)
 *   - Removal (unregister + cleanup)
 *   - Compatibility checks (min platform version, dependency validation)
 *   - Dependency validation (required deps installed + version compatible)
 * ============================================================================
 */

import type { CapabilityPack, InstallationResult, PackLifecycleState } from "./types";
import { globalPackValidator } from "./pack-validator";
import { globalPackRegistry } from "./pack-registry";

// ── Lifecycle Manager ────────────────────────────────────────────────────

export class LifecycleManager {
  private platformVersion = "1.0.0";

  /**
   * Install a capability pack.
   * Validates → registers → activates.
   */
  async install(pack: CapabilityPack): Promise<InstallationResult> {
    const packId = pack.manifest.packId;
    const version = pack.manifest.version;
    const installedIds = globalPackRegistry.getInstalledPackIds();

    // Set lifecycle state to "installing".
    pack.manifest.lifecycleState = "installing";

    // Validate.
    const validation = globalPackValidator.validate(pack, installedIds, this.platformVersion);
    if (!validation.valid) {
      pack.manifest.lifecycleState = "failed";
      return {
        success: false,
        packId,
        version,
        lifecycleState: "failed",
        registeredCapabilities: [],
        registeredAdapters: [],
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    // Register.
    pack.manifest.lifecycleState = "active";
    pack.installedAt = new Date().toISOString();
    pack.updatedAt = new Date().toISOString();
    globalPackRegistry.register(pack);

    return {
      success: true,
      packId,
      version,
      lifecycleState: "active",
      registeredCapabilities: pack.capabilities.map((c) => c.capabilityId),
      registeredAdapters: pack.adapters.map((a) => a.capabilityId),
      errors: [],
      warnings: validation.warnings,
    };
  }

  /**
   * Upgrade a pack to a new version.
   * The old version is saved for rollback.
   */
  async upgrade(pack: CapabilityPack): Promise<InstallationResult> {
    const packId = pack.manifest.packId;
    const existing = globalPackRegistry.get(packId);
    if (!existing) {
      return this.install(pack); // not installed → fresh install
    }

    // Set upgrading state.
    globalPackRegistry.setLifecycleState(packId, "upgrading");

    // Validate the new version.
    const validation = globalPackValidator.validate(pack, globalPackRegistry.getInstalledPackIds(), this.platformVersion);
    if (!validation.valid) {
      globalPackRegistry.setLifecycleState(packId, "active"); // restore old state
      return {
        success: false,
        packId,
        version: pack.manifest.version,
        lifecycleState: "active",
        registeredCapabilities: [],
        registeredAdapters: [],
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    // Register the new version (PackRegistry saves the old version for rollback).
    pack.manifest.lifecycleState = "active";
    pack.installedAt = new Date().toISOString();
    pack.updatedAt = new Date().toISOString();
    globalPackRegistry.register(pack);

    return {
      success: true,
      packId,
      version: pack.manifest.version,
      lifecycleState: "active",
      registeredCapabilities: pack.capabilities.map((c) => c.capabilityId),
      registeredAdapters: pack.adapters.map((a) => a.capabilityId),
      errors: [],
      warnings: validation.warnings,
    };
  }

  /**
   * Deprecate a pack (mark deprecated, still functional).
   */
  deprecate(packId: string): boolean {
    return globalPackRegistry.setLifecycleState(packId, "deprecated");
  }

  /**
   * Disable a pack (temporarily).
   */
  disable(packId: string): boolean {
    return globalPackRegistry.setLifecycleState(packId, "disabled");
  }

  /**
   * Enable a disabled pack.
   */
  enable(packId: string): boolean {
    return globalPackRegistry.setLifecycleState(packId, "active");
  }

  /**
   * Rollback a pack to its previous version.
   */
  rollback(packId: string): CapabilityPack | null {
    return globalPackRegistry.rollback(packId);
  }

  /**
   * Remove a pack entirely.
   */
  remove(packId: string): boolean {
    const removed = globalPackRegistry.unregister(packId);
    return removed !== null;
  }

  /**
   * Check compatibility (without installing).
   */
  checkCompatibility(pack: CapabilityPack): { compatible: boolean; issues: string[] } {
    const validation = globalPackValidator.validate(pack, globalPackRegistry.getInstalledPackIds(), this.platformVersion);
    return {
      compatible: validation.valid,
      issues: [...validation.errors, ...validation.dependencyIssues, ...validation.compatibilityIssues],
    };
  }

  /**
   * Get the lifecycle state of a pack.
   */
  getState(packId: string): PackLifecycleState | null {
    return globalPackRegistry.getLifecycleState(packId);
  }

  /**
   * Set the platform version (for compatibility checks).
   */
  setPlatformVersion(version: string): void {
    this.platformVersion = version;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalLifecycleManager = new LifecycleManager();
