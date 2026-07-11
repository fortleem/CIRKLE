// @ts-nocheck
/**
 * CIRKLE Brain AI — Multi-Tenant Enterprise Isolation (Upgrade 11)
 * ============================================================================
 * Provides tenant context that flows through the Shared Context.
 * Per-tenant: capability packs, policies, audit trails, LIEE learning.
 * ============================================================================
 */

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  plan: "free" | "pro" | "enterprise";
  role: "admin" | "member" | "viewer";
  settings?: Record<string, unknown>;
}

// ── Tenant Context Store (request-scoped) ────────────────────────────────

let currentTenant: TenantContext | null = null;

export function setTenantContext(tenant: TenantContext | null): void {
  currentTenant = tenant;
}

export function getTenantContext(): TenantContext | null {
  return currentTenant;
}

export function isEnterpriseTenant(): boolean {
  return currentTenant?.plan === "enterprise";
}

export function isTenantAdmin(): boolean {
  return currentTenant?.role === "admin";
}

// ── Tenant-scoped storage keys ───────────────────────────────────────────

export function tenantScopedKey(key: string): string {
  return currentTenant ? `tenant:${currentTenant.tenantId}:${key}` : key;
}

// ── Tenant-scoped feedback (for LIEE) ────────────────────────────────────

export function tenantScopedFeedback(userId: string): string {
  return currentTenant ? `${currentTenant.tenantId}:${userId}` : userId;
}

// ── Tenant-scoped audit (for TGSE) ───────────────────────────────────────

export function tenantScopedAudit(auditId: string): string {
  return currentTenant ? `${currentTenant.tenantId}:${auditId}` : auditId;
}

// ── Tenant capability pack filtering ─────────────────────────────────────

export function isPackAvailableForTenant(packId: string, tenantPacks?: string[]): boolean {
  if (!currentTenant) return true; // No tenant = all packs available
  if (currentTenant.plan === "enterprise") return true; // Enterprise = all packs
  if (tenantPacks && tenantPacks.includes(packId)) return true;
  // Free/Pro plans: only default packs.
  const defaultPacks = ["cirkle.travel", "cirkle.payments"];
  return defaultPacks.includes(packId);
}

// ── Tenant policy overlay ────────────────────────────────────────────────

export function getTenantPolicyOverlay(): Record<string, unknown> | null {
  if (!currentTenant) return null;
  return currentTenant.settings?.policies ?? null;
}
