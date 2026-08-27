// @ts-nocheck
/**
 * AI Kill Switch — PART LXXXI
 *
 * Blueprint rule:
 *   • Granular disable/enable of AI capabilities WITHOUT taking down the
 *     entire platform.
 *   • Scope can be: model | feature | integration | workflow.
 *   • Every disable/enable action is fully audited (who, what, when, why).
 *   • `disableAll()` is the emergency break-glass — also audited.
 *
 * The kill switch is the human-controlled circuit breaker that lets
 * operations staff contain any AI capability that begins to misbehave.
 */

import { createHash } from "crypto";
import { safeDbQuery } from "@/lib/db-safe";

// ── Types ─────────────────────────────────────────────────────────────────

export type KillSwitchScope = "model" | "feature" | "integration" | "workflow";
export type KillSwitchStatus = "active" | "disabled" | "killed";

export interface KillSwitchState {
  featureId: string; // unique key, e.g. "ai:summarize", "model:glm-4"
  modelName?: string; // if scope=model
  featureName: string; // human label
  scope: KillSwitchScope;
  status: KillSwitchStatus;
  disabledBy?: string;
  disabledAt?: string;
  reason?: string;
  enabledBy?: string;
  enabledAt?: string;
  auditTrail: KillSwitchAuditEntry[];
}

export interface KillSwitchAuditEntry {
  timestamp: string;
  action: "disable" | "enable" | "kill";
  scope: KillSwitchScope;
  actor: string;
  reason: string;
  previousStatus: KillSwitchStatus;
  newStatus: KillSwitchStatus;
}

// ── In-memory registry ────────────────────────────────────────────────────

const registry = new Map<string, KillSwitchState>();

// Seed canonical AI capabilities so the dashboard shows the full surface.
const SEED_CAPABILITIES: Array<Omit<KillSwitchState, "auditTrail">> = [
  {
    featureId: "model:glm-4-general",
    modelName: "GLM-4 General",
    featureName: "GLM-4 — General Assistant",
    scope: "model",
    status: "active",
  },
  {
    featureId: "model:glm-4-vision",
    modelName: "GLM-4 Vision",
    featureName: "GLM-4 Vision (image understanding)",
    scope: "model",
    status: "active",
  },
  {
    featureId: "model:whisper-ar",
    modelName: "Whisper-AR",
    featureName: "Whisper — Arabic transcription",
    scope: "model",
    status: "active",
  },
  {
    featureId: "model:nllb-translate",
    modelName: "NLLB-200",
    featureName: "NLLB — Translation (200 languages)",
    scope: "model",
    status: "active",
  },
  {
    featureId: "feature:ai-summarize",
    featureName: "AI Summarization (Wasl / Mail)",
    scope: "feature",
    status: "active",
  },
  {
    featureId: "feature:ai-memoir",
    featureName: "AI Memoir (personal memory)",
    scope: "feature",
    status: "active",
  },
  {
    featureId: "feature:ai-recap",
    featureName: "AI Daily Recap",
    scope: "feature",
    status: "active",
  },
  {
    featureId: "feature:ai-tone-adjust",
    featureName: "AI Tone Adjuster",
    scope: "feature",
    status: "active",
  },
  {
    featureId: "feature:ai-evidence-transcribe",
    featureName: "AI Evidence Transcription (§82)",
    scope: "feature",
    status: "active",
  },
  {
    featureId: "feature:ai-evidence-redact",
    featureName: "AI Evidence Redaction (§62)",
    scope: "feature",
    status: "active",
  },
  {
    featureId: "feature:ai-document-authenticity",
    featureName: "AI Document Authenticity Analysis (§83)",
    scope: "feature",
    status: "active",
  },
  {
    featureId: "feature:ai-investigation-plan",
    featureName: "AI Automatic Investigation Plan (§88)",
    scope: "feature",
    status: "active",
  },
  {
    featureId: "integration:aca-evidence",
    featureName: "ACA Evidence Integration",
    scope: "integration",
    status: "active",
  },
  {
    featureId: "integration:government-clean-room",
    featureName: "Government Data Clean Room (§64)",
    scope: "integration",
    status: "active",
  },
  {
    featureId: "workflow:investigation-closure",
    featureName: "Investigation Closure Workflow",
    scope: "workflow",
    status: "active",
  },
];

function seedIfEmpty() {
  if (registry.size > 0) return;
  for (const cap of SEED_CAPABILITIES) {
    registry.set(cap.featureId, { ...cap, auditTrail: [] });
  }
}

function hash(input: string): string {
  return "sha256:" + createHash("sha256").update(input, "utf8").digest("hex");
}

function audit(
  state: KillSwitchState,
  action: "disable" | "enable" | "kill",
  actor: string,
  reason: string,
  previousStatus: KillSwitchStatus,
  newStatus: KillSwitchStatus,
): void {
  const entry: KillSwitchAuditEntry = {
    timestamp: new Date().toISOString(),
    action,
    scope: state.scope,
    actor,
    reason,
    previousStatus,
    newStatus,
  };
  state.auditTrail.push(entry);

  // Best-effort persistence to AuditRecord.
  void safeDbQuery(async () => {
    const { db } = await import("@/lib/db");
    const prev = await db.auditRecord.findFirst({
      where: { target: "ai-kill-switch" },
      orderBy: { timestamp: "desc" },
    });
    const previousHash = prev?.hash ?? "genesis";
    const entryHash = hash(state.featureId + action + entry.timestamp + previousHash);
    await db.auditRecord.create({
      data: {
        auditId: `kill-switch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        eventType: `ai:kill-switch:${action}`,
        target: "ai-kill-switch",
        decision: action === "enable" ? "approve" : "deny",
        description: `${action} ${state.featureId} (${state.scope}) — by ${actor}`,
        data: entry as any,
        hash: entryHash,
        previousHash,
      },
    });
  });
}

function findState(featureId: string): KillSwitchState {
  seedIfEmpty();
  const state = registry.get(featureId);
  if (!state) {
    throw new Error(`AI capability not registered: ${featureId}`);
  }
  return state;
}

// ── Public API ────────────────────────────────────────────────────────────

export function disableModel(
  modelName: string,
  by: string,
  reason: string,
): KillSwitchState {
  const state = findState(`model:${modelName}`);
  const previous = state.status;
  state.status = "disabled";
  state.disabledBy = by;
  state.disabledAt = new Date().toISOString();
  state.reason = reason;
  audit(state, "disable", by, reason, previous, "disabled");
  return state;
}

export function disableFeature(
  featureId: string,
  by: string,
  reason: string,
): KillSwitchState {
  const state = findState(featureId);
  const previous = state.status;
  state.status = "disabled";
  state.disabledBy = by;
  state.disabledAt = new Date().toISOString();
  state.reason = reason;
  audit(state, "disable", by, reason, previous, "disabled");
  return state;
}

export function disableIntegration(
  integrationId: string,
  by: string,
  reason: string,
): KillSwitchState {
  const state = findState(integrationId);
  if (state.scope !== "integration") {
    throw new Error(`${integrationId} is not an integration (scope=${state.scope})`);
  }
  const previous = state.status;
  state.status = "disabled";
  state.disabledBy = by;
  state.disabledAt = new Date().toISOString();
  state.reason = reason;
  audit(state, "disable", by, reason, previous, "disabled");
  return state;
}

export function disableWorkflow(
  workflowId: string,
  by: string,
  reason: string,
): KillSwitchState {
  const state = findState(workflowId);
  if (state.scope !== "workflow") {
    throw new Error(`${workflowId} is not a workflow (scope=${state.scope})`);
  }
  const previous = state.status;
  state.status = "disabled";
  state.disabledBy = by;
  state.disabledAt = new Date().toISOString();
  state.reason = reason;
  audit(state, "disable", by, reason, previous, "disabled");
  return state;
}

export function enableModel(
  modelName: string,
  by: string,
  authorization: string,
): KillSwitchState {
  const state = findState(`model:${modelName}`);
  if (state.status === "active") return state;
  const previous = state.status;
  state.status = "active";
  state.enabledBy = by;
  state.enabledAt = new Date().toISOString();
  state.disabledBy = undefined;
  state.disabledAt = undefined;
  audit(state, "enable", by, `Re-enabled — authorization: ${authorization}`, previous, "active");
  return state;
}

export function enableFeature(
  featureId: string,
  by: string,
  authorization: string,
): KillSwitchState {
  const state = findState(featureId);
  if (state.status === "active") return state;
  const previous = state.status;
  state.status = "active";
  state.enabledBy = by;
  state.enabledAt = new Date().toISOString();
  state.disabledBy = undefined;
  state.disabledAt = undefined;
  audit(state, "enable", by, `Re-enabled — authorization: ${authorization}`, previous, "active");
  return state;
}

/**
 * Emergency break-glass: disable EVERYTHING immediately. Used when a systemic
 * AI failure is detected. Requires a reason + actor; cannot be silent.
 */
export function disableAll(
  by: string,
  reason: string,
): { disabled: number; states: KillSwitchState[] } {
  seedIfEmpty();
  const states: KillSwitchState[] = [];
  for (const state of registry.values()) {
    if (state.status === "active") {
      const previous = state.status;
      state.status = "killed";
      state.disabledBy = by;
      state.disabledAt = new Date().toISOString();
      state.reason = `EMERGENCY: ${reason}`;
      audit(state, "kill", by, `EMERGENCY: ${reason}`, previous, "killed");
    }
    states.push(state);
  }
  return { disabled: states.filter((s) => s.status !== "active").length, states };
}

export function getStatus(
  featureIdOrModel: string,
): { active: boolean; status: KillSwitchStatus; state?: KillSwitchState } {
  seedIfEmpty();
  const direct = registry.get(featureIdOrModel);
  if (direct) return { active: direct.status === "active", status: direct.status, state: direct };
  const asModel = registry.get(`model:${featureIdOrModel}`);
  if (asModel) return { active: asModel.status === "active", status: asModel.status, state: asModel };
  return { active: false, status: "killed" };
}

export function listAllStates(): KillSwitchState[] {
  seedIfEmpty();
  return Array.from(registry.values());
}

export function registerCapability(
  featureId: string,
  featureName: string,
  scope: KillSwitchScope,
): KillSwitchState {
  seedIfEmpty();
  const existing = registry.get(featureId);
  if (existing) return existing;
  const state: KillSwitchState = {
    featureId,
    featureName,
    scope,
    status: "active",
    auditTrail: [],
  };
  registry.set(featureId, state);
  return state;
}
