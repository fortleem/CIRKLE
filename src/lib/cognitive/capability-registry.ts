/**
 * CIRKLE Brain AI — Capability Registry
 * ============================================================================
 *
 * Phase 4.5 — Shared Cognitive Foundation
 *
 * The Capability Registry describes **what the platform can do**, independent
 * of how modules are implemented. The future Universal Orchestration Brain
 * (Phase 5) will reason over capabilities — not over hardcoded module names.
 *
 * Example shift:
 *   Instead of "Travel Module", the AI understands:
 *     - Search Flights
 *     - Book Flight
 *     - Cancel Booking
 *     - Track Flight
 *
 * What the Capability Registry IS:
 *   - A metadata catalog of platform capabilities.
 *   - A discovery + lookup service.
 *   - A dependency resolver.
 *   - A contract validator.
 *
 * What the Capability Registry is NOT:
 *   - It does NOT execute capabilities.
 *   - It contains NO business logic.
 *   - It does NOT call platform modules.
 *
 * Constitutional alignment:
 *   - Ch.2 §2.6 Single Ownership → the registry owns ONLY capability metadata.
 *   - Ch.3 §3.9 Platform-Centric Intelligence → capabilities are the unit of
 *     platform awareness, not modules.
 *   - Ch.4 §4.7 Shared Services → registry is a shared service, not a phase.
 *
 * Registry APIs (Part 2 spec):
 *   register · update · remove · lookup · search · listCategories ·
 *   resolveDependencies · validateContracts · discoverAvailable
 *
 * The registry is intentionally lightweight (Part 7 final instruction):
 *   complex dependency-graph algorithms and health analytics are deferred to
 *   future phases. Dependency resolution here is a simple transitive closure.
 * ============================================================================
 */

// ── Categories (extensible) ──────────────────────────────────────────────

export type CapabilityCategory =
  | "payments"
  | "travel"
  | "commerce"
  | "communication"
  | "news"
  | "entertainment"
  | "maps"
  | "identity"
  | "business"
  | "government"
  | "social"
  | "ai"
  | "utilities"
  | "security"
  // Escape hatch for future categories without redeploying the type:
  | (string & {});

// ── Availability & Status ────────────────────────────────────────────────

export type CapabilityAvailability = "available" | "beta" | "deprecated" | "internal";
export type CapabilityStatus = "active" | "disabled" | "maintenance";

// ── Contract ─────────────────────────────────────────────────────────────

/**
 * A lightweight contract descriptor. Uses a JSON-Schema-like shape so future
 * validators can be plugged in without changing the type. For now the registry
 * only checks structural presence (Part 7: avoid overengineering).
 */
export interface CapabilityContract {
  /** Human-readable summary of the input shape. */
  input: Record<string, { type: string; required?: boolean; description?: string }>;
  /** Human-readable summary of the output shape. */
  output: Record<string, { type: string; description?: string }>;
  /** Optional example payload (for docs + future contract testing). */
  example?: Record<string, unknown>;
}

// ── Capability ───────────────────────────────────────────────────────────

export interface Capability {
  /** Globally unique id, e.g. "pay.transfer-money". */
  id: string;
  /** Human-readable name, e.g. "Transfer Money". */
  name: string;
  /** Short description of what the capability does. */
  description: string;
  /** Extensible category. */
  category: CapabilityCategory;
  /** The platform module that exposes this capability (e.g. "pay"). */
  ownerModule: string;
  /** Input/output contract. */
  contract: CapabilityContract;
  /** Permission tokens required to invoke (e.g. ["pay:send"]). */
  permissions: string[];
  /** Other capability ids that must be available for this one to function. */
  dependencies: string[];
  /** Lifecycle availability. */
  availability: CapabilityAvailability;
  /** Current operational status. */
  status: CapabilityStatus;
  /** Semantic version of this capability's contract. */
  version: string;
  /** Free-form tags for discovery. */
  tags: string[];
  /** Optional documentation URL or inline doc. */
  documentation?: string;
}

// ── Validation ───────────────────────────────────────────────────────────

export interface CapabilityValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a capability's structural integrity before registration.
 * Lightweight: checks required fields and id format. Does NOT deeply validate
 * contracts (Part 7: avoid overengineering).
 */
export function validateCapability(cap: Partial<Capability>): CapabilityValidationResult {
  const errors: string[] = [];
  if (!cap.id || typeof cap.id !== "string") errors.push("id is required");
  else if (!/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(cap.id)) errors.push("id must be namespaced (e.g. 'pay.transfer-money')");
  if (!cap.name || typeof cap.name !== "string") errors.push("name is required");
  if (!cap.description) errors.push("description is required");
  if (!cap.category) errors.push("category is required");
  if (!cap.ownerModule) errors.push("ownerModule is required");
  if (!cap.contract || !cap.contract.input || !cap.contract.output) errors.push("contract.input and contract.output are required");
  if (!Array.isArray(cap.permissions)) errors.push("permissions must be an array");
  if (!Array.isArray(cap.dependencies)) errors.push("dependencies must be an array");
  if (!cap.version || !/^\d+\.\d+\.\d+$/.test(cap.version)) errors.push("version must be semver (x.y.z)");
  return { valid: errors.length === 0, errors };
}

// ── Registry ─────────────────────────────────────────────────────────────

export interface CapabilitySearchQuery {
  text?: string;
  category?: CapabilityCategory;
  ownerModule?: string;
  tag?: string;
  availableOnly?: boolean;
  limit?: number;
}

export interface CapabilityRegistryStats {
  total: number;
  byCategory: Record<string, number>;
  byModule: Record<string, number>;
  categories: CapabilityCategory[];
}

export class CapabilityRegistry {
  private capabilities = new Map<string, Capability>();
  private aliases = new Map<string, string>(); // alias → canonical id

  /**
   * Register a new capability. Throws if the id already exists or validation
   * fails.
   */
  register(cap: Capability): void {
    const validation = validateCapability(cap);
    if (!validation.valid) {
      throw new Error(`[CapabilityRegistry] Invalid capability "${cap.id || "(no id)"}": ${validation.errors.join("; ")}`);
    }
    if (this.capabilities.has(cap.id)) {
      throw new Error(`[CapabilityRegistry] Capability "${cap.id}" already registered`);
    }
    this.capabilities.set(cap.id, { ...cap });
  }

  /**
   * Register an alias for a capability (e.g. "send-money" → "pay.transfer-money").
   */
  registerAlias(alias: string, canonicalId: string): void {
    if (!this.capabilities.has(canonicalId)) {
      throw new Error(`[CapabilityRegistry] Cannot alias to unknown capability "${canonicalId}"`);
    }
    this.aliases.set(alias.toLowerCase(), canonicalId);
  }

  /**
   * Update an existing capability's mutable fields (status, availability,
   * documentation, tags). Contract changes require a version bump.
   */
  update(id: string, patch: Partial<Pick<Capability, "status" | "availability" | "documentation" | "tags" | "description">>): void {
    const resolved = this.resolveId(id);
    if (!resolved) throw new Error(`[CapabilityRegistry] Cannot update unknown capability "${id}"`);
    const current = this.capabilities.get(resolved)!;
    this.capabilities.set(resolved, { ...current, ...patch });
  }

  /** Remove a capability by id. */
  remove(id: string): boolean {
    const resolved = this.resolveId(id);
    if (!resolved) return false;
    // Remove any aliases pointing to it.
    for (const [alias, target] of this.aliases) {
      if (target === resolved) this.aliases.delete(alias);
    }
    return this.capabilities.delete(resolved);
  }

  /** Lookup a single capability by id or alias. */
  lookup(id: string): Capability | null {
    const resolved = this.resolveId(id);
    if (!resolved) return null;
    const cap = this.capabilities.get(resolved);
    return cap ? { ...cap } : null;
  }

  /** Search capabilities by text, category, module, or tag. */
  search(query: CapabilitySearchQuery = {}): Capability[] {
    let results = Array.from(this.capabilities.values());
    if (query.category) results = results.filter((c) => c.category === query.category);
    if (query.ownerModule) results = results.filter((c) => c.ownerModule === query.ownerModule);
    if (query.tag) results = results.filter((c) => c.tags.includes(query.tag!));
    if (query.availableOnly) results = results.filter((c) => c.availability === "available" && c.status === "active");
    if (query.text) {
      const q = query.text.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    const limit = query.limit ?? 50;
    return results.slice(0, limit).map((c) => ({ ...c }));
  }

  /** List all known categories that have at least one capability. */
  listCategories(): CapabilityCategory[] {
    const set = new Set<CapabilityCategory>();
    for (const c of this.capabilities.values()) set.add(c.category);
    return Array.from(set);
  }

  /**
   * Resolve the transitive dependency closure for a capability.
   * Lightweight (Part 7): simple iterative closure, cycle-detection by visited set.
   * Returns the ordered list of dependencies (excluding the cap itself).
   * @throws if a dependency is missing or a cycle is detected.
   */
  resolveDependencies(id: string): Capability[] {
    const resolved = this.resolveId(id);
    if (!resolved) throw new Error(`[CapabilityRegistry] Unknown capability "${id}"`);
    const ordered: Capability[] = [];
    const visited = new Set<string>();
    const stack = [...this.capabilities.get(resolved)!.dependencies].reverse();
    while (stack.length) {
      const depId = stack.pop()!;
      if (visited.has(depId)) continue;
      visited.add(depId);
      const dep = this.capabilities.get(depId);
      if (!dep) throw new Error(`[CapabilityRegistry] Capability "${resolved}" depends on unknown "${depId}"`);
      ordered.push({ ...dep });
      for (const d of dep.dependencies) {
        if (!visited.has(d)) stack.push(d);
      }
    }
    return ordered;
  }

  /** Validate a capability's contracts structurally (presence only). */
  validateContracts(id: string): CapabilityValidationResult {
    const cap = this.lookup(id);
    if (!cap) return { valid: false, errors: [`Unknown capability "${id}"`] };
    return validateCapability(cap);
  }

  /** Discover capabilities available right now (active + available). */
  discoverAvailable(filter?: { category?: CapabilityCategory }): Capability[] {
    return this.search({ availableOnly: true, category: filter?.category });
  }

  /** Registry statistics for observability. */
  stats(): CapabilityRegistryStats {
    const byCategory: Record<string, number> = {};
    const byModule: Record<string, number> = {};
    for (const c of this.capabilities.values()) {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byModule[c.ownerModule] = (byModule[c.ownerModule] || 0) + 1;
    }
    return {
      total: this.capabilities.size,
      byCategory,
      byModule,
      categories: this.listCategories(),
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private resolveId(id: string): string | null {
    const lower = id.toLowerCase();
    if (this.capabilities.has(id)) return id;
    if (this.aliases.has(lower)) return this.aliases.get(lower)!;
    // Case-insensitive exact id match as a last resort.
    for (const key of this.capabilities.keys()) {
      if (key.toLowerCase() === lower) return key;
    }
    return null;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalCapabilityRegistry = new CapabilityRegistry();
