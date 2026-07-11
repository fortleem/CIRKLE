/**
 * CIRKLE Brain AI — PCPF Pack Registry
 * ============================================================================
 *
 * Manages installed capability packs. This is the PCPF-level registry (distinct
 * from the Phase 4.5 Capability Registry). It tracks packs + their lifecycle
 * states; the Capability Registry tracks individual capabilities.
 *
 * When a pack is installed, its capabilities are registered into the
 * Capability Registry (via the Pack Loader). When a pack is removed, its
 * capabilities are unregistered.
 * ============================================================================
 */

import type { CapabilityPack, PackLifecycleState, PackMetrics } from "./types";

// ── Pack Registry Entry ──────────────────────────────────────────────────

interface PackRegistryEntry {
  pack: CapabilityPack;
  installedAt: string;
  previousVersion?: string; // for rollbacks
  metrics: PackMetrics;
}

// ── Pack Registry ────────────────────────────────────────────────────────

export class PackRegistry {
  private packs = new Map<string, PackRegistryEntry>();
  private versionHistory = new Map<string, CapabilityPack[]>(); // packId → previous versions

  /**
   * Register an installed pack.
   */
  register(pack: CapabilityPack): void {
    const packId = pack.manifest.packId;
    const existing = this.packs.get(packId);

    // Save previous version for rollback.
    if (existing) {
      const history = this.versionHistory.get(packId) || [];
      history.push(existing.pack);
      this.versionHistory.set(packId, history);
    }

    this.packs.set(packId, {
      pack,
      installedAt: new Date().toISOString(),
      previousVersion: existing?.pack.manifest.version,
      metrics: {
        packId,
        invocationCount: 0,
        successCount: 0,
        failureCount: 0,
        averageLatencyMs: 0,
        policyDenials: 0,
        dependencyIssues: 0,
      },
    });
  }

  /**
   * Unregister a pack (remove it).
   */
  unregister(packId: string): CapabilityPack | null {
    const entry = this.packs.get(packId);
    if (!entry) return null;
    this.packs.delete(packId);
    return entry.pack;
  }

  /**
   * Get a pack by id.
   */
  get(packId: string): CapabilityPack | null {
    return this.packs.get(packId)?.pack || null;
  }

  /**
   * Get a pack's lifecycle state.
   */
  getLifecycleState(packId: string): PackLifecycleState | null {
    return this.packs.get(packId)?.pack.manifest.lifecycleState || null;
  }

  /**
   * Update a pack's lifecycle state.
   */
  setLifecycleState(packId: string, state: PackLifecycleState): boolean {
    const entry = this.packs.get(packId);
    if (!entry) return false;
    entry.pack.manifest.lifecycleState = state;
    entry.pack.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * List all installed packs.
   */
  list(): CapabilityPack[] {
    return Array.from(this.packs.values()).map((e) => e.pack);
  }

  /**
   * List packs by lifecycle state.
   */
  listByState(state: PackLifecycleState): CapabilityPack[] {
    return this.list().filter((p) => p.manifest.lifecycleState === state);
  }

  /**
   * List packs by category.
   */
  listByCategory(category: string): CapabilityPack[] {
    return this.list().filter((p) => p.manifest.category === category);
  }

  /**
   * Get all installed pack ids (for dependency checking).
   */
  getInstalledPackIds(): string[] {
    return Array.from(this.packs.keys());
  }

  /**
   * Get the previous version of a pack (for rollback).
   */
  getPreviousVersion(packId: string): CapabilityPack | null {
    const history = this.versionHistory.get(packId);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  /**
   * Rollback to the previous version (removes current + restores previous).
   */
  rollback(packId: string): CapabilityPack | null {
    const previous = this.getPreviousVersion(packId);
    if (!previous) return null;
    // Remove current version.
    this.unregister(packId);
    // Restore previous version with rolled-back state.
    previous.manifest.lifecycleState = "rolled-back";
    this.packs.set(packId, {
      pack: previous,
      installedAt: new Date().toISOString(),
      metrics: {
        packId,
        invocationCount: 0,
        successCount: 0,
        failureCount: 0,
        averageLatencyMs: 0,
        policyDenials: 0,
        dependencyIssues: 0,
      },
    });
    // Remove from history (we just restored it).
    const history = this.versionHistory.get(packId);
    if (history) history.pop();
    return previous;
  }

  /**
   * Record a metric event for a pack.
   */
  recordMetric(packId: string, event: "invoked" | "succeeded" | "failed" | "policy-denied" | "dependency-issue", latencyMs?: number): void {
    const entry = this.packs.get(packId);
    if (!entry) return;
    const m = entry.metrics;
    switch (event) {
      case "invoked":
        m.invocationCount++;
        m.lastInvoked = new Date().toISOString();
        break;
      case "succeeded":
        m.successCount++;
        break;
      case "failed":
        m.failureCount++;
        break;
      case "policy-denied":
        m.policyDenials++;
        break;
      case "dependency-issue":
        m.dependencyIssues++;
        break;
    }
    if (latencyMs !== undefined && m.invocationCount > 0) {
      m.averageLatencyMs = (m.averageLatencyMs * (m.invocationCount - 1) + latencyMs) / m.invocationCount;
    }
  }

  /**
   * Get metrics for a pack.
   */
  getMetrics(packId: string): PackMetrics | null {
    return this.packs.get(packId)?.metrics || null;
  }

  /**
   * Get registry statistics.
   */
  getStats(): { total: number; active: number; byCategory: Record<string, number>; byState: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    const byState: Record<string, number> = {};
    let active = 0;
    for (const entry of this.packs.values()) {
      const cat = entry.pack.manifest.category;
      const state = entry.pack.manifest.lifecycleState;
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      byState[state] = (byState[state] || 0) + 1;
      if (state === "active") active++;
    }
    return { total: this.packs.size, active, byCategory, byState };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalPackRegistry = new PackRegistry();
