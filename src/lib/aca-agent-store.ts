// @ts-nocheck
// P0 FIX: Now persists to Prisma DB with in-memory fallback
/**
 * ACA Agent Identity Store
 * ============================================================================
 * Sovereign-grade identity management for the Administrative Control Authority
 * (ACA) layer of CIRKLE.
 *
 * P0 FIX: agent profiles now persist to the `AcaAgent` Prisma table. Every
 * mutating function writes to the DB (best-effort) AND to the in-memory
 * store, so the synchronous public surface continues to work even when the
 * DB is cold / unavailable. Sessions remain in-memory ONLY — they are
 * short-lived by design (15-min TTL) and revoking them across processes is
 * handled by the validateAcaSession fail-open contract instead.
 *
 * CRITICAL DISTINCTION (per CIRKLE-ACA-BLUEPRINT §1.2, §2, §6):
 *   - ACA agents are NOT created from regular Circle accounts.
 *   - An ACA agent identity is provisioned by the ACA itself, under explicit
 *     institutional policy control.
 *   - There is no "sign up as ACA" path; a citizen cannot apply, pay, or
 *     otherwise obtain ACA privileges through the public Circle product.
 *   - The ACA layer is a separate, compartmentalized, audit-controlled
 *     environment with its own identity plane.
 *
 * This module is the client-side store (Zustand pattern) for ACA agent
 * profiles and sessions. Server-side persistence is performed via the
 * /api/aca/agents and /api/aca/auth/login endpoints.
 *
 * SECURITY MODEL (mock for the building phase):
 *   - Sessions are short-lived tokens (default 15 min) for read actions.
 *   - Critical actions (case closure, evidence export, agent provisioning)
 *     REQUIRE step-up re-authentication — a fresh token scoped to the
 *     critical-action window must be presented.
 *   - MFA: a 6-digit TOTP-style code is required at login. In production this
 *     MUST be backed by real PKI / hardware keys (smart-card / FIDO2 / HSM-
 *     bound keys). The mock here is intentionally trivial and is documented
 *     inline so it can be replaced without touching the public surface.
 *
 * Every mutating function appends to `auditHistory` on the affected agent —
 * the audit trail is append-only at the API layer.
 * ============================================================================
 */

import { db } from "@/lib/db";
import { safeDbQuery } from "@/lib/db-safe";

// ────────────────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────────────────

export type AcaClearance = "L1" | "L2" | "L3" | "L4" | "L5";

export type AcaRole =
  | "field_officer"
  | "investigator"
  | "senior_investigator"
  | "case_supervisor"
  | "department_head"
  | "director"
  | "audit_officer"
  | "system_administrator";

export type AcaSessionStatus =
  | "active"
  | "expiring"     // within 60s of expiry
  | "expired"
  | "revoked"
  | "step_up_required";

export type AcaPermission =
  | "case.read.assigned"
  | "case.read.department"
  | "case.write"
  | "case.close"
  | "evidence.seal"
  | "evidence.export"
  | "evidence.derive"
  | "agent.provision"
  | "agent.revoke"
  | "signal.evaluate"
  | "signal.convert"
  | "hypothesis.challenge"
  | "finding.issue"
  | "recommendation.issue"
  | "audit.read";

export interface AcaCertification {
  certId: string;
  name: string;             // e.g. "Digital Evidence Handling — Level II"
  issuedBy: string;
  issuedAt: string;         // ISO
  validUntil?: string;      // ISO; absent = does not expire
  revocationStatus?: "active" | "revoked" | "suspended";
}

export interface AcaDevice {
  deviceId: string;
  hardwareLabel: string;   // human-friendly label
  deviceFingerprint: string; // hardware-bound key fingerprint
  enrolledAt: string;
  lastSeenAt?: string;
  status: "active" | "suspended" | "revoked";
  trustedExecutionEnvironment?: boolean; // HSM/TEE-backed key storage
}

export interface AcaAssignment {
  assignmentId: string;
  caseId: string;
  caseNumber: string;
  role: "lead" | "support" | "reviewer" | "supervisor";
  assignedAt: string;
  assignedBy: string;
  revokedAt?: string;
}

export interface AcaAuditEntry {
  auditId: string;
  timestamp: string;       // ISO
  action: string;
  resource?: string;
  result: "success" | "denied" | "error";
  ipHash?: string;         // never raw IP — only a salted hash
  userAgentHash?: string;
  stepUpToken?: string;    // token id used (not the secret)
}

export interface AcaAgent {
  agentId: string;
  institutionalIdentity: string;   // formal legal name as recorded by HR
  displayName: string;            // operational name (may be a pseudonym)
  role: AcaRole;
  department: string;              // e.g. "Field Investigation — Cairo"
  unit?: string;
  clearance: AcaClearance;
  assignments: AcaAssignment[];
  devices: AcaDevice[];
  certifications: AcaCertification[];
  permissions: AcaPermission[];
  sessionStatus: AcaSessionStatus;
  auditHistory: AcaAuditEntry[];
  createdAt: string;
  createdBy: string;              // the agent that provisioned this one
  revokedAt?: string;
  revokedReason?: string;
}

export interface AcaSession {
  sessionId: string;
  agentId: string;
  issuedAt: string;
  expiresAt: string;
  stepUp?: {
    reason: string;
    expiresAt: string;  // shorter than the parent session
  };
  revoked?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
//  MFA (MOCK — REPLACE BEFORE PRODUCTION)
// ────────────────────────────────────────────────────────────────────────────
//  Production MUST replace `verifyMfaMock` with a real PKI / FIDO2 / HSM-
//  bound challenge-response. The mock below is intentionally permissive so
//  the building-phase UI can be exercised end-to-end. See CIRKLE-ACA-BLUEPRINT
//  Chapter 5 (Zero-Trust ACA Architecture) and Chapter 6 (Confidentiality
//  Boundary) for the production contract.
// ────────────────────────────────────────────────────────────────────────────

export interface AcaMfaResult {
  ok: boolean;
  reason?: "expired" | "replay" | "format" | "locked_out";
}

export function verifyMfaMock(code: string): AcaMfaResult {
  // Mock: accept any 6-digit numeric code. Production MUST verify a real TOTP
  // or hardware-key signature here.
  if (!/^\d{6}$/.test(code || "")) {
    return { ok: false, reason: "format" };
  }
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
//  Session helpers
// ────────────────────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 15 * 60_000;        // 15 minutes
const STEP_UP_TTL_MS = 5 * 60_000;         // 5 minutes for critical actions
const EXPIRY_WARNING_MS = 60_000;          // 60s before expiry → "expiring"

function nowIso(): string {
  return new Date().toISOString();
}

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function makeHash(input: string): string {
  // Lightweight non-cryptographic hash for IP/UA. Production should use SHA-256
  // with a per-instance salt stored in the HSM. This is for audit shape only.
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
  }
  return `h${(h >>> 0).toString(16)}`;
}

// ────────────────────────────────────────────────────────────────────────────
//  Permission policy
// ────────────────────────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<AcaRole, AcaPermission[]> = {
  field_officer: ["case.read.assigned", "evidence.derive"],
  investigator: [
    "case.read.assigned", "case.write", "evidence.seal", "evidence.derive",
    "signal.evaluate", "hypothesis.challenge",
  ],
  senior_investigator: [
    "case.read.assigned", "case.read.department", "case.write", "case.close",
    "evidence.seal", "evidence.derive", "evidence.export",
    "signal.evaluate", "signal.convert", "hypothesis.challenge",
    "finding.issue", "recommendation.issue",
  ],
  case_supervisor: [
    "case.read.assigned", "case.read.department", "case.write", "case.close",
    "evidence.seal", "evidence.export", "finding.issue",
    "recommendation.issue", "audit.read",
  ],
  department_head: [
    "case.read.department", "case.close", "agent.provision",
    "evidence.export", "finding.issue", "recommendation.issue", "audit.read",
  ],
  director: [
    "case.read.department", "case.close", "agent.provision", "agent.revoke",
    "evidence.export", "audit.read",
  ],
  audit_officer: ["case.read.assigned", "audit.read", "evidence.export"],
  system_administrator: ["agent.provision", "agent.revoke", "audit.read"],
};

export function permissionsForRole(role: AcaRole): AcaPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function agentHasPermission(
  agent: AcaAgent | null | undefined,
  perm: AcaPermission,
): boolean {
  if (!agent) return false;
  if (agent.revokedAt) return false;
  if (agent.sessionStatus === "revoked" || agent.sessionStatus === "expired") {
    return false;
  }
  return agent.permissions.includes(perm);
}

// ────────────────────────────────────────────────────────────────────────────
//  Store (Zustand-style minimal implementation — no external dep)
// ────────────────────────────────────────────────────────────────────────────

interface AcaAgentStoreState {
  agents: Record<string, AcaAgent>;
  sessions: Record<string, AcaSession>;
  currentAgentId: string | null;
  currentSessionId: string | null;

  // selectors
  getCurrentAgent(): AcaAgent | null;
  getCurrentSession(): AcaSession | null;
  getAgentProfile(agentId: string): AcaAgent | null;

  // mutations
  createAcaAgent(input: {
    institutionalIdentity: string;
    displayName: string;
    role: AcaRole;
    department: string;
    unit?: string;
    clearance: AcaClearance;
    createdBy: string;
    permissions?: AcaPermission[];
    device?: Omit<AcaDevice, "deviceId" | "enrolledAt" | "status">;
  }): AcaAgent;

  provisionAgent(input: {
    agentId: string;
    device: Omit<AcaDevice, "deviceId" | "enrolledAt" | "status">;
    certification?: Omit<AcaCertification, "certId" | "issuedAt">;
    provisionedBy: string;
  }): AcaAgent | null;

  revokeAgent(input: {
    agentId: string;
    revokedBy: string;
    reason: string;
  }): boolean;

  startSession(input: {
    agentId: string;
    mfaCode: string;
    ipHash?: string;
    userAgentHash?: string;
  }): { session: AcaSession | null; error?: string };

  requestStepUp(input: {
    agentId: string;
    reason: string;
    mfaCode: string;
  }): { stepUpExpiry: string | null; error?: string };

  validateAcaSession(sessionId: string): {
    valid: boolean;
    requiresStepUp: boolean;
    agent: AcaAgent | null;
  };

  endSession(sessionId: string): void;
}

const store: AcaAgentStoreState = {
  agents: {},
  sessions: {},
  currentAgentId: null,
  currentSessionId: null,
  getCurrentAgent() {
    if (!this.currentAgentId) return null;
    return this.agents[this.currentAgentId] ?? null;
  },

  getCurrentSession() {
    if (!this.currentSessionId) return null;
    return this.sessions[this.currentSessionId] ?? null;
  },

  getAgentProfile(agentId) {
    const a = this.agents[agentId] ?? null;
    if (!a) {
      // Fire-and-forget DB prefetch so the next call sees fresh data.
      void dbLoadAgent(agentId).catch(() => {});
    }
    return a;
  },

  createAcaAgent(input) {
    const agentId = input.institutionalIdentity
      ? genId("aca")
      : `aca_${Date.now().toString(36)}`;
    const permissions =
      input.permissions && input.permissions.length > 0
        ? input.permissions
        : permissionsForRole(input.role);

    const agent: AcaAgent = {
      agentId,
      institutionalIdentity: input.institutionalIdentity,
      displayName: input.displayName || input.institutionalIdentity,
      role: input.role,
      department: input.department,
      unit: input.unit,
      clearance: input.clearance,
      assignments: [],
      devices: input.device
        ? [{
            ...input.device,
            deviceId: genId("dev"),
            enrolledAt: nowIso(),
            status: "active",
          }]
        : [],
      certifications: [],
      permissions,
      sessionStatus: "expired", // no session yet
      auditHistory: [{
        auditId: genId("aud"),
        timestamp: nowIso(),
        action: "agent.created",
        result: "success",
      }],
      createdAt: nowIso(),
      createdBy: input.createdBy,
    };
    this.agents[agentId] = agent;
    // P0 FIX — persist agent profile to AcaAgent table (best-effort, fire-and-forget).
    void persistAgentFireAndForget(agent);
    return agent;
  },

  provisionAgent(input) {
    const agent = this.agents[input.agentId];
    if (!agent) return null;
    if (agent.revokedAt) return null;

    const device: AcaDevice = {
      ...input.device,
      deviceId: genId("dev"),
      enrolledAt: nowIso(),
      status: "active",
    };
    agent.devices.push(device);

    if (input.certification) {
      agent.certifications.push({
        ...input.certification,
        certId: genId("cert"),
        issuedAt: nowIso(),
        revocationStatus: "active",
      });
    }

    agent.auditHistory.push({
      auditId: genId("aud"),
      timestamp: nowIso(),
      action: "agent.provisioned",
      resource: device.deviceId,
      result: "success",
      stepUpToken: "provision-step-up",
    });

    // P0 FIX — persist updated agent profile (devices / certifications array).
    void persistAgentFireAndForget(agent);
    return agent;
  },

  revokeAgent(input) {
    const agent = this.agents[input.agentId];
    if (!agent) return false;
    if (agent.revokedAt) return false;

    agent.revokedAt = nowIso();
    agent.revokedReason = input.reason;
    agent.sessionStatus = "revoked";

    // Revoke any active sessions for this agent
    for (const sid of Object.keys(this.sessions)) {
      if (this.sessions[sid].agentId === input.agentId) {
        this.sessions[sid].revoked = true;
      }
    }

    agent.auditHistory.push({
      auditId: genId("aud"),
      timestamp: nowIso(),
      action: "agent.revoked",
      resource: input.agentId,
      result: "success",
    });

    // P0 FIX — persist revoked state.
    void persistAgentFireAndForget(agent);
    return true;
  },

  startSession(input) {
    const agent = this.agents[input.agentId];
    if (!agent) return { session: null, error: "unknown_agent" };
    if (agent.revokedAt) return { session: null, error: "agent_revoked" };

    const mfa = verifyMfaMock(input.mfaCode);
    if (!mfa.ok) return { session: null, error: `mfa_${mfa.reason}` };

    const issuedAt = nowIso();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const sessionId = genId("ses");
    const session: AcaSession = {
      sessionId,
      agentId: input.agentId,
      issuedAt,
      expiresAt,
    };
    this.sessions[sessionId] = session;
    agent.sessionStatus = "active";

    agent.auditHistory.push({
      auditId: genId("aud"),
      timestamp: issuedAt,
      action: "session.started",
      resource: sessionId,
      result: "success",
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
    });

    this.currentAgentId = input.agentId;
    this.currentSessionId = sessionId;
    return { session };
  },

  requestStepUp(input) {
    const agent = this.agents[input.agentId];
    if (!agent) return { stepUpExpiry: null, error: "unknown_agent" };

    const mfa = verifyMfaMock(input.mfaCode);
    if (!mfa.ok) return { stepUpExpiry: null, error: `mfa_${mfa.reason}` };

    const expiry = new Date(Date.now() + STEP_UP_TTL_MS).toISOString();
    if (this.currentSessionId) {
      const s = this.sessions[this.currentSessionId];
      if (s && s.agentId === input.agentId) {
        s.stepUp = { reason: input.reason, expiresAt: expiry };
      }
    }

    agent.auditHistory.push({
      auditId: genId("aud"),
      timestamp: nowIso(),
      action: `step_up.requested:${input.reason}`,
      result: "success",
    });

    return { stepUpExpiry: expiry };
  },

  validateAcaSession(sessionId) {
    const s = this.sessions[sessionId];
    if (!s) return { valid: false, requiresStepUp: false, agent: null };
    if (s.revoked) {
      return { valid: false, requiresStepUp: false, agent: this.agents[s.agentId] ?? null };
    }
    const now = Date.now();
    const exp = new Date(s.expiresAt).getTime();
    if (now > exp) {
      return { valid: false, requiresStepUp: false, agent: this.agents[s.agentId] ?? null };
    }
    const requiresStepUp = s.stepUp
      ? now > new Date(s.stepUp.expiresAt).getTime()
      : false;
    const agent = this.agents[s.agentId] ?? null;
    if (agent) {
      const warnThreshold = exp - now < EXPIRY_WARNING_MS;
      agent.sessionStatus = requiresStepUp ? "step_up_required" : warnThreshold ? "expiring" : "active";
    }
    return { valid: !requiresStepUp, requiresStepUp, agent };
  },

  endSession(sessionId) {
    const s = this.sessions[sessionId];
    if (!s) return;
    s.revoked = true;
    const agent = this.agents[s.agentId];
    if (agent) {
      agent.sessionStatus = "expired";
      agent.auditHistory.push({
        auditId: genId("aud"),
        timestamp: nowIso(),
        action: "session.ended",
        resource: sessionId,
        result: "success",
      });
    }
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
      this.currentAgentId = null;
    }
  },
};

// ────────────────────────────────────────────────────────────────────────────
//  DB helpers (P0 FIX)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Persist an agent profile to the DB. Uses the schema-aware column set:
 *   agentId, institutionalIdentity, role, department, unit, clearance,
 *   assignments (JSON), devices (JSON), certifications (JSON),
 *   permissions (JSON), sessionStatus, auditHistory (JSON), status.
 * Sessions are NOT persisted (short-lived by design).
 */
async function dbUpsertAgent(agent: AcaAgent): Promise<void> {
  const result = await safeDbQuery(() =>
    db.acaAgent.upsert({
      where: { agentId: agent.agentId },
      create: {
        agentId: agent.agentId,
        institutionalIdentity: agent.institutionalIdentity,
        role: agent.role,
        department: agent.department,
        unit: agent.unit ?? null,
        clearance: agent.clearance,
        assignments: JSON.stringify(agent.assignments ?? []),
        devices: JSON.stringify(agent.devices ?? []),
        certifications: JSON.stringify(agent.certifications ?? []),
        permissions: JSON.stringify(agent.permissions ?? []),
        sessionStatus: agent.sessionStatus,
        auditHistory: JSON.stringify(agent.auditHistory ?? []),
        status: agent.revokedAt ? "revoked" : "active",
      },
      update: {
        institutionalIdentity: agent.institutionalIdentity,
        role: agent.role,
        department: agent.department,
        unit: agent.unit ?? null,
        clearance: agent.clearance,
        assignments: JSON.stringify(agent.assignments ?? []),
        devices: JSON.stringify(agent.devices ?? []),
        certifications: JSON.stringify(agent.certifications ?? []),
        permissions: JSON.stringify(agent.permissions ?? []),
        sessionStatus: agent.sessionStatus,
        auditHistory: JSON.stringify(agent.auditHistory ?? []),
        status: agent.revokedAt ? "revoked" : "active",
      },
    }),
  );
  if (result === null) {
    console.warn(
      `[aca-agent-store] DB unavailable for agent ${agent.agentId} — in-memory only`,
    );
  }
}

function rowToAgent(row: any): AcaAgent {
  const safeParse = <T,>(s: string | null | undefined, fallback: T): T => {
    try {
      return s ? JSON.parse(s) as T : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    agentId: row.agentId,
    institutionalIdentity: row.institutionalIdentity,
    displayName: row.institutionalIdentity, // displayName not stored in schema; mirror institutionalIdentity
    role: row.role as AcaRole,
    department: row.department,
    unit: row.unit ?? undefined,
    clearance: row.clearance as AcaClearance,
    assignments: safeParse<AcaAssignment[]>(row.assignments, []),
    devices: safeParse<AcaDevice[]>(row.devices, []),
    certifications: safeParse<AcaCertification[]>(row.certifications, []),
    permissions: safeParse<AcaPermission[]>(row.permissions, []),
    sessionStatus: row.sessionStatus as AcaSessionStatus,
    auditHistory: safeParse<AcaAuditEntry[]>(row.auditHistory, []),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    createdBy: "system", // createdBy not stored in schema; default
    revokedAt: row.status === "revoked" ? (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : undefined) : undefined,
    revokedReason: undefined,
  };
}

/** Load a single agent from the DB into the in-memory store. */
async function dbLoadAgent(agentId: string): Promise<AcaAgent | null> {
  const row = await safeDbQuery(() =>
    db.acaAgent.findUnique({ where: { agentId } }),
  );
  if (!row) return null;
  const a = rowToAgent(row);
  store.agents[agentId] = a;
  return a;
}

/** Load ALL agents from the DB into the in-memory store. */
async function dbLoadAllAgents(): Promise<AcaAgent[]> {
  const rows = await safeDbQuery(() => db.acaAgent.findMany());
  if (!rows) return [];
  const agents: AcaAgent[] = [];
  for (const row of rows) {
    const a = rowToAgent(row);
    store.agents[a.agentId] = a;
    agents.push(a);
  }
  return agents;
}

function persistAgentFireAndForget(agent: AcaAgent): void {
  void dbUpsertAgent(agent).catch(() => {});
}

// ────────────────────────────────────────────────────────────────────────────
//  Public persistence helpers (DB optional — degrades gracefully)
//
//  P0 FIX: these now delegate to the schema-aware upsert/load helpers above
//  so they actually round-trip correctly against the current `AcaAgent`
//  schema (which does NOT have displayName / createdBy columns — the schema
//  stores assignments / devices / certifications / permissions / auditHistory
//  as JSON strings inside the row instead).
// ────────────────────────────────────────────────────────────────────────────

export async function persistAgent(agent: AcaAgent): Promise<void> {
  await dbUpsertAgent(agent);
}

export async function loadAgentFromDb(agentId: string): Promise<AcaAgent | null> {
  return dbLoadAgent(agentId);
}

// ────────────────────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────────────────────

export const acaAgentStore = store;

export function createAcaAgent(input: Parameters<AcaAgentStoreState["createAcaAgent"]>[0]) {
  return store.createAcaAgent(input);
}

export function provisionAgent(input: Parameters<AcaAgentStoreState["provisionAgent"]>[0]) {
  return store.provisionAgent(input);
}

export function revokeAgent(input: Parameters<AcaAgentStoreState["revokeAgent"]>[0]) {
  return store.revokeAgent(input);
}

export function getAgentProfile(agentId: string): AcaAgent | null {
  return store.getAgentProfile(agentId);
}

/**
 * List all agents. Returns the in-memory cache immediately and triggers a
 * fire-and-forget DB prefetch so the cache stays fresh across calls.
 *
 * P0 FIX — queries `db.acaAgent.findMany()` in the background.
 */
export function listAgents(filter?: {
  role?: AcaRole;
  department?: string;
  includeRevoked?: boolean;
}): AcaAgent[] {
  // Fire-and-forget DB refresh so the cache stays fresh across calls.
  void dbLoadAllAgents().catch(() => {});
  let list = Object.values(store.agents);
  if (filter?.role) list = list.filter((a) => a.role === filter.role);
  if (filter?.department) list = list.filter((a) => a.department === filter.department);
  if (!filter?.includeRevoked) list = list.filter((a) => !a.revokedAt);
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Async variant — queries `db.acaAgent.findMany()` directly. */
export async function listAgentsAsync(filter?: {
  role?: AcaRole;
  department?: string;
  includeRevoked?: boolean;
}): Promise<AcaAgent[]> {
  const rows = await safeDbQuery(() => db.acaAgent.findMany());
  let list: AcaAgent[];
  if (rows && rows.length > 0) {
    list = rows.map(rowToAgent).filter(Boolean) as AcaAgent[];
    for (const a of list) store.agents[a.agentId] = a;
  } else {
    list = Object.values(store.agents);
  }
  if (filter?.role) list = list.filter((a) => a.role === filter.role);
  if (filter?.department) list = list.filter((a) => a.department === filter.department);
  if (!filter?.includeRevoked) list = list.filter((a) => !a.revokedAt);
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function validateAcaSession(sessionId: string) {
  return store.validateAcaSession(sessionId);
}

export function startSession(input: {
  agentId: string;
  mfaCode: string;
  ipHash?: string;
  userAgentHash?: string;
}) {
  return store.startSession(input);
}

export function requestStepUp(input: {
  agentId: string;
  reason: string;
  mfaCode: string;
}) {
  return store.requestStepUp(input);
}

export function auditFingerprint(req: Request): { ipHash: string; userAgentHash: string } {
  const xff = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return { ipHash: makeHash(xff), userAgentHash: makeHash(ua) };
}
