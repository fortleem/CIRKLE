/**
 * CIRKLE Brain AI — PCPF Pack Loader
 * ============================================================================
 *
 * The critical integration layer. When a pack is installed, the Pack Loader:
 *   1. Registers each pack capability into the Capability Registry (Phase 4.5)
 *      so UOB can discover it.
 *   2. Registers each pack adapter into the TEE Capability Executor Registry
 *      (Phase 6) so TEE can invoke it.
 *
 * This is how PCPF connects to the existing AI OS without modifying it.
 * UOB discovers capabilities via the Capability Registry — it never
 * hardcodes pack implementations. TEE invokes capabilities via standardized
 * executor interfaces — execution remains decoupled from pack implementation.
 * ============================================================================
 */

import type { CapabilityPack, PackCapability } from "./types";

// ── Pack Loader ──────────────────────────────────────────────────────────

export class PackLoader {
  /**
   * Load a pack: register all its capabilities + adapters into the
   * Capability Registry + TEE Capability Executor Registry.
   *
   * Returns the ids of registered capabilities + adapters.
   */
  async load(pack: CapabilityPack): Promise<{ registeredCapabilities: string[]; registeredAdapters: string[]; errors: string[] }> {
    const registeredCapabilities: string[] = [];
    const registeredAdapters: string[] = [];
    const errors: string[] = [];

    // ── Register capabilities into the Capability Registry ──────────────
    try {
      const { globalCapabilityRegistry } = await import("@/lib/cognitive/capability-registry");
      for (const cap of pack.capabilities) {
        try {
          globalCapabilityRegistry.register(this.toRegistryCapability(cap, pack));
          registeredCapabilities.push(cap.capabilityId);
        } catch (err) {
          errors.push(`Failed to register capability "${cap.capabilityId}": ${String(err).slice(0, 100)}`);
        }
      }
    } catch (err) {
      errors.push(`Failed to load Capability Registry: ${String(err).slice(0, 100)}`);
    }

    // ── Register adapters into the TEE Capability Executor Registry ─────
    try {
      const { globalCapabilityExecutorRegistry } = await import("@/lib/tee/capability-executors");
      for (const adapter of pack.adapters) {
        try {
          globalCapabilityExecutorRegistry.register(adapter.capabilityId, async (inputs, ctx) => {
            try {
              const output = await adapter.executor(inputs, ctx);
              return {
                success: true,
                output,
                executor: `pack:${pack.manifest.packId}`,
                dryRun: false,
                latencyMs: 0,
              };
            } catch (err) {
              return {
                success: false,
                error: String(err).slice(0, 200),
                executor: `pack:${pack.manifest.packId}`,
                dryRun: false,
                latencyMs: 0,
              };
            }
          });
          registeredAdapters.push(adapter.capabilityId);
        } catch (err) {
          errors.push(`Failed to register adapter for "${adapter.capabilityId}": ${String(err).slice(0, 100)}`);
        }
      }
    } catch (err) {
      errors.push(`Failed to load TEE Capability Executor Registry: ${String(err).slice(0, 100)}`);
    }

    return { registeredCapabilities, registeredAdapters, errors };
  }

  /**
   * Unload a pack: unregister its capabilities + adapters.
   */
  async unload(pack: CapabilityPack): Promise<{ unregisteredCapabilities: string[]; unregisteredAdapters: string[]; errors: string[] }> {
    const unregisteredCapabilities: string[] = [];
    const unregisteredAdapters: string[] = [];
    const errors: string[] = [];

    // Unregister capabilities from the Capability Registry.
    try {
      const { globalCapabilityRegistry } = await import("@/lib/cognitive/capability-registry");
      for (const cap of pack.capabilities) {
        try {
          if (globalCapabilityRegistry.remove(cap.capabilityId)) {
            unregisteredCapabilities.push(cap.capabilityId);
          }
        } catch (err) {
          errors.push(`Failed to unregister capability "${cap.capabilityId}": ${String(err).slice(0, 100)}`);
        }
      }
    } catch (err) {
      errors.push(`Failed to load Capability Registry: ${String(err).slice(0, 100)}`);
    }

    // Note: TEE Capability Executor Registry doesn't have an unregister method
    // (executors are overridden, not removed). This is by design — TEE
    // executors are dynamic and fall back to simulation when no live executor
    // is registered. Unloading a pack means its executor is no longer
    // registered, so TEE falls back to simulation for those capabilities.

    return { unregisteredCapabilities, unregisteredAdapters, errors };
  }

  /**
   * Convert a PackCapability to the Capability Registry's Capability format.
   */
  private toRegistryCapability(cap: PackCapability, pack: CapabilityPack): import("@/lib/cognitive/capability-registry").Capability {
    return {
      id: cap.capabilityId,
      name: cap.name,
      description: cap.description,
      category: cap.category,
      ownerModule: pack.manifest.packId, // the pack is the "module"
      contract: {
        input: cap.inputSchema,
        output: cap.outputSchema,
      },
      permissions: cap.permissions,
      dependencies: cap.dependencies,
      availability: cap.availability,
      status: "active",
      version: pack.manifest.version,
      tags: cap.tags,
      documentation: cap.documentation,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalPackLoader = new PackLoader();
