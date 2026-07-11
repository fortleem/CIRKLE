/**
 * CIRKLE Brain AI — CIE Versioning Framework
 * ============================================================================
 * Tracks capability versions, compatibility, deprecation, successors,
 * regional availability, activation state, rollout stage.
 * Supports controlled evolution without breaking existing workflows.
 * ============================================================================
 */

import type { CapabilityVersionInfo, RolloutStage } from "./types";

export class VersioningFramework {
  private versions = new Map<string, CapabilityVersionInfo>();

  register(info: CapabilityVersionInfo): void {
    this.versions.set(info.capabilityId, info);
  }

  get(capabilityId: string): CapabilityVersionInfo | null {
    return this.versions.get(capabilityId) || null;
  }

  getCurrentVersion(capabilityId: string): string | null {
    return this.versions.get(capabilityId)?.currentVersion || null;
  }

  isDeprecated(capabilityId: string): boolean {
    return this.versions.get(capabilityId)?.deprecated || false;
  }

  getSuccessor(capabilityId: string): string | null {
    return this.versions.get(capabilityId)?.successorCapabilityId || null;
  }

  getRolloutStage(capabilityId: string): RolloutStage | null {
    return this.versions.get(capabilityId)?.rolloutStage || null;
  }

  isAvailableInRegion(capabilityId: string, countryCode: string): boolean {
    const info = this.versions.get(capabilityId);
    if (!info) return false;
    return info.regionalAvailability[countryCode] !== false;
  }

  isCompatible(capabilityId: string, version: string): boolean {
    const info = this.versions.get(capabilityId);
    if (!info) return false;
    return this.compareVersions(version, info.minCompatibleVersion) >= 0;
  }

  list(): CapabilityVersionInfo[] {
    return Array.from(this.versions.values());
  }

  listDeprecated(): CapabilityVersionInfo[] {
    return this.list().filter((v) => v.deprecated);
  }

  listByRolloutStage(stage: RolloutStage): CapabilityVersionInfo[] {
    return this.list().filter((v) => v.rolloutStage === stage);
  }

  getStats(): { total: number; deprecated: number; byRolloutStage: Record<string, number> } {
    const byRolloutStage: Record<string, number> = {};
    let deprecated = 0;
    for (const v of this.versions.values()) {
      byRolloutStage[v.rolloutStage] = (byRolloutStage[v.rolloutStage] || 0) + 1;
      if (v.deprecated) deprecated++;
    }
    return { total: this.versions.size, deprecated, byRolloutStage };
  }

  private compareVersions(a: string, b: string): number {
    const [aM, am, ap] = a.split(".").map(Number);
    const [bM, bm, bp] = b.split(".").map(Number);
    if (aM !== bM) return aM - bM;
    if (am !== bm) return am - bm;
    return ap - bp;
  }
}

export const globalVersioningFramework = new VersioningFramework();
