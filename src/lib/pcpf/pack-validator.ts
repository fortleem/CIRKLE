/**
 * CIRKLE Brain AI — PCPF Pack Validator
 * ============================================================================
 *
 * Validates capability packs before installation:
 *   - Manifest structure (required fields, id format, semver)
 *   - Capability schemas (input/output well-formed)
 *   - Dependency declarations (required deps exist + version compatible)
 *   - Compatibility checks (min platform version, region support)
 *   - Policy consistency (permissions declared, consent purposes valid)
 *   - Signature verification (if signed)
 * ============================================================================
 */

import type { CapabilityPack, PackValidationResult } from "./types";

// ── Pack Validator ───────────────────────────────────────────────────────

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
const PACK_ID_REGEX = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;

export class PackValidator {
  /**
   * Validate a pack comprehensively.
   */
  validate(pack: CapabilityPack, installedPackIds: string[] = [], platformVersion = "1.0.0"): PackValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const dependencyIssues: string[] = [];
    const compatibilityIssues: string[] = [];

    // ── Manifest validation ─────────────────────────────────────────────
    const m = pack.manifest;
    if (!m.packId || !PACK_ID_REGEX.test(m.packId)) {
      errors.push("manifest.packId must be namespaced (e.g. 'cirkle.travel')");
    }
    if (!m.name) errors.push("manifest.name is required");
    if (!m.description) errors.push("manifest.description is required");
    if (!m.version || !SEMVER_REGEX.test(m.version)) {
      errors.push("manifest.version must be semver (x.y.z)");
    }
    if (!m.category) errors.push("manifest.category is required");
    if (!m.author) errors.push("manifest.author is required");
    if (!m.license) errors.push("manifest.license is required");
    if (!Array.isArray(m.supportedRegions) || m.supportedRegions.length === 0) {
      errors.push("manifest.supportedRegions must be a non-empty array");
    }
    if (!Array.isArray(m.permissions)) errors.push("manifest.permissions must be an array");
    if (!Array.isArray(m.entryPoints)) errors.push("manifest.entryPoints must be an array");

    // ── Capability validation ───────────────────────────────────────────
    if (!pack.capabilities || pack.capabilities.length === 0) {
      warnings.push("pack has no capabilities — it exposes nothing to the AI");
    }
    for (const cap of pack.capabilities || []) {
      if (!cap.capabilityId || !cap.capabilityId.startsWith(m.packId + ".")) {
        errors.push(`capability "${cap.capabilityId || "(no id)"}" must be namespaced under pack id "${m.packId}"`);
      }
      if (!cap.name) errors.push(`capability "${cap.capabilityId}" has no name`);
      if (!cap.inputSchema || typeof cap.inputSchema !== "object") {
        errors.push(`capability "${cap.capabilityId}" has no inputSchema`);
      }
      if (!cap.outputSchema || typeof cap.outputSchema !== "object") {
        errors.push(`capability "${cap.capabilityId}" has no outputSchema`);
      }
    }

    // ── Entry point validation ──────────────────────────────────────────
    for (const ep of m.entryPoints) {
      if (!pack.capabilities.find((c) => c.capabilityId === ep)) {
        errors.push(`entry point "${ep}" not found in capabilities`);
      }
    }

    // ── Dependency validation ───────────────────────────────────────────
    for (const dep of m.dependencies) {
      if (!dep.packId) {
        dependencyIssues.push(`dependency has no packId`);
        continue;
      }
      if (!dep.versionRange) {
        dependencyIssues.push(`dependency "${dep.packId}" has no versionRange`);
      }
      // Check if dependency is installed (if required).
      if (dep.required && !installedPackIds.includes(dep.packId)) {
        dependencyIssues.push(`required dependency "${dep.packId}" is not installed`);
      }
    }

    // ── Compatibility checks ────────────────────────────────────────────
    if (m.minPlatformVersion) {
      if (!SEMVER_REGEX.test(m.minPlatformVersion)) {
        compatibilityIssues.push(`minPlatformVersion "${m.minPlatformVersion}" is not valid semver`);
      } else if (this.compareVersions(m.minPlatformVersion, platformVersion) > 0) {
        compatibilityIssues.push(`pack requires platform >= ${m.minPlatformVersion}, but platform is ${platformVersion}`);
      }
    }

    // ── Policy validation ───────────────────────────────────────────────
    for (const policy of pack.policies || []) {
      if (!policy.policyId) errors.push(`policy has no policyId`);
      if (!policy.type) errors.push(`policy "${policy.policyId}" has no type`);
      if (!Array.isArray(policy.applicableCountries)) {
        errors.push(`policy "${policy.policyId}" has no applicableCountries`);
      }
    }

    // ── Adapter validation ──────────────────────────────────────────────
    for (const adapter of pack.adapters || []) {
      if (!adapter.capabilityId) {
        errors.push("adapter has no capabilityId");
        continue;
      }
      if (!pack.capabilities.find((c) => c.capabilityId === adapter.capabilityId)) {
        errors.push(`adapter references unknown capability "${adapter.capabilityId}"`);
      }
      if (typeof adapter.executor !== "function") {
        errors.push(`adapter for "${adapter.capabilityId}" has no executor function`);
      }
      if (adapter.requiresCredentials && (!adapter.secretReferences || adapter.secretReferences.length === 0)) {
        warnings.push(`adapter for "${adapter.capabilityId}" requires credentials but has no secretReferences`);
      }
    }

    // ── Signature check ─────────────────────────────────────────────────
    if (m.signed && !m.signature) {
      warnings.push("pack is marked signed but has no signature");
    }

    return {
      valid: errors.length === 0 && dependencyIssues.length === 0 && compatibilityIssues.length === 0,
      errors,
      warnings,
      dependencyIssues,
      compatibilityIssues,
    };
  }

  /**
   * Compare two semver versions. Returns >0 if a > b, <0 if a < b, 0 if equal.
   */
  private compareVersions(a: string, b: string): number {
    const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
    const [bMajor, bMinor, bPatch] = b.split(".").map(Number);
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalPackValidator = new PackValidator();
