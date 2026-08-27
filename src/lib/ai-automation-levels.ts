// @ts-nocheck
/**
 * AI Automation Levels — PART LXXXII
 *
 * Blueprint rule:
 *   • Every AI capability has an explicit automation level 0-4.
 *   • Levels cap how far an AI may proceed without human sign-off.
 *   • AI CANNOT independently:
 *       - declare guilt
 *       - impose discipline
 *       - issue authoritative findings
 *       - unmask protected identities
 *       - destroy evidence
 *       - close sensitive investigations
 *
 * These actions are PROHIBITED regardless of automation level — the level
 * only governs how much the AI can do on its own within the ALLOWED set.
 */

import { createHash } from "crypto";
import { safeDbQuery } from "@/lib/db-safe";

// ── Types ─────────────────────────────────────────────────────────────────

export enum AutomationLevel {
  LEVEL_0_INFO_ONLY = 0, // AI only provides information; no action
  LEVEL_1_RECOMMENDATION = 1, // AI recommends; human acts
  LEVEL_2_HUMAN_APPROVAL = 2, // AI prepares the action; human approves before execution
  LEVEL_3_LOW_RISK_AUTO = 3, // AI auto-executes low-risk, pre-scoped actions
  LEVEL_4_PROHIBITED = 4, // The action itself is prohibited for AI; only humans may perform
}

export interface AutomationConfig {
  featureId: string;
  featureName: string;
  institution: string;
  level: AutomationLevel;
  setBy?: string;
  setAt?: string;
  reason?: string;
  auditTrail: AutomationAuditEntry[];
}

export interface AutomationAuditEntry {
  timestamp: string;
  previousLevel: AutomationLevel;
  newLevel: AutomationLevel;
  setBy: string;
  reason: string;
}

// Actions AI may NEVER perform — these are PROHIBITED regardless of level.
export const PROHIBITED_AI_ACTIONS: ReadonlySet<string> = new Set([
  "declare_guilt",
  "impose_discipline",
  "issue_authoritative_finding",
  "unmask_protected_identity",
  "destroy_evidence",
  "close_sensitive_investigation",
]);

// ── In-memory config ──────────────────────────────────────────────────────

const configs = new Map<string, AutomationConfig>();

const SEED_CONFIGS: Array<Omit<AutomationConfig, "auditTrail">> = [
  {
    featureId: "ai:summarize",
    featureName: "AI Summarization",
    institution: "global",
    level: AutomationLevel.LEVEL_3_LOW_RISK_AUTO,
  },
  {
    featureId: "ai:translate",
    featureName: "AI Translation",
    institution: "global",
    level: AutomationLevel.LEVEL_3_LOW_RISK_AUTO,
  },
  {
    featureId: "ai:transcribe",
    featureName: "AI Transcription",
    institution: "global",
    level: AutomationLevel.LEVEL_2_HUMAN_APPROVAL,
  },
  {
    featureId: "ai:redact",
    featureName: "AI Evidence Redaction",
    institution: "aca",
    level: AutomationLevel.LEVEL_2_HUMAN_APPROVAL,
  },
  {
    featureId: "ai:investigation-plan",
    featureName: "AI Investigation Plan",
    institution: "aca",
    level: AutomationLevel.LEVEL_1_RECOMMENDATION,
  },
  {
    featureId: "ai:next-best-action",
    featureName: "AI Next Best Action",
    institution: "aca",
    level: AutomationLevel.LEVEL_1_RECOMMENDATION,
  },
  {
    featureId: "ai:evidence-quality-matrix",
    featureName: "AI Evidence Quality Matrix",
    institution: "aca",
    level: AutomationLevel.LEVEL_1_RECOMMENDATION,
  },
  {
    featureId: "ai:finding-to-rule",
    featureName: "AI Finding-to-Rule Mapping",
    institution: "aca",
    level: AutomationLevel.LEVEL_0_INFO_ONLY,
  },
  {
    featureId: "ai:declare-guilt",
    featureName: "AI Declare Guilt (PROHIBITED)",
    institution: "aca",
    level: AutomationLevel.LEVEL_4_PROHIBITED,
  },
  {
    featureId: "ai:close-investigation",
    featureName: "AI Close Sensitive Investigation (PROHIBITED)",
    institution: "aca",
    level: AutomationLevel.LEVEL_4_PROHIBITED,
  },
  {
    featureId: "ai:unmask-identity",
    featureName: "AI Unmask Protected Identity (PROHIBITED)",
    institution: "aca",
    level: AutomationLevel.LEVEL_4_PROHIBITED,
  },
  {
    featureId: "ai:destroy-evidence",
    featureName: "AI Destroy Evidence (PROHIBITED)",
    institution: "aca",
    level: AutomationLevel.LEVEL_4_PROHIBITED,
  },
];

function seedIfEmpty() {
  if (configs.size > 0) return;
  for (const c of SEED_CONFIGS) {
    configs.set(c.featureId, { ...c, auditTrail: [] });
  }
}

function hash(input: string): string {
  return "sha256:" + createHash("sha256").update(input, "utf8").digest("hex");
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Get the automation level for a feature / institution combination.
 * Falls back to the global config, then to LEVEL_2 (human approval) by
 * default — fail SAFE, not fast.
 */
export function getAutomationLevel(
  featureId: string,
  institution = "global",
): AutomationLevel {
  seedIfEmpty();
  const direct = configs.get(`${featureId}@${institution}`);
  if (direct) return direct.level;
  const globalCfg = configs.get(featureId);
  if (globalCfg) return globalCfg.level;
  return AutomationLevel.LEVEL_2_HUMAN_APPROVAL;
}

export function getAutomationConfig(
  featureId: string,
  institution = "global",
): AutomationConfig | undefined {
  seedIfEmpty();
  return configs.get(`${featureId}@${institution}`) ?? configs.get(featureId);
}

/**
 * Check if the AI may auto-execute the given action at the current automation
 * level. PROHIBITED actions are NEVER auto-executable.
 */
export function canAutoExecute(
  featureId: string,
  action: string,
  institution = "global",
): { canExecute: boolean; reason: string; level: AutomationLevel } {
  if (PROHIBITED_AI_ACTIONS.has(action)) {
    return {
      canExecute: false,
      reason: `Action "${action}" is PROHIBITED for AI under any automation level (§LXXXII). Only humans may perform this action.`,
      level: AutomationLevel.LEVEL_4_PROHIBITED,
    };
  }
  const level = getAutomationLevel(featureId, institution);
  switch (level) {
    case AutomationLevel.LEVEL_0_INFO_ONLY:
      return {
        canExecute: false,
        reason: "Level 0 (info-only): AI may only provide information. No action.",
        level,
      };
    case AutomationLevel.LEVEL_1_RECOMMENDATION:
      return {
        canExecute: false,
        reason: "Level 1 (recommendation): AI recommends, human acts.",
        level,
      };
    case AutomationLevel.LEVEL_2_HUMAN_APPROVAL:
      return {
        canExecute: false,
        reason: "Level 2 (human approval): AI prepares the action; human must approve before execution.",
        level,
      };
    case AutomationLevel.LEVEL_3_LOW_RISK_AUTO:
      return {
        canExecute: true,
        reason: "Level 3 (low-risk auto): AI may auto-execute pre-scoped low-risk actions.",
        level,
      };
    case AutomationLevel.LEVEL_4_PROHIBITED:
      return {
        canExecute: false,
        reason: "Level 4 (prohibited): This action is prohibited for AI.",
        level,
      };
    default:
      return { canExecute: false, reason: "Unknown level.", level };
  }
}

/**
 * Check if human approval is required before the AI may execute the action.
 */
export function requireHumanApproval(
  featureId: string,
  action: string,
  institution = "global",
): { required: boolean; reason: string; level: AutomationLevel } {
  if (PROHIBITED_AI_ACTIONS.has(action)) {
    return {
      required: true,
      reason: `Action "${action}" is PROHIBITED for AI — humans must perform it directly (no AI preparation).`,
      level: AutomationLevel.LEVEL_4_PROHIBITED,
    };
  }
  const level = getAutomationLevel(featureId, institution);
  const required =
    level === AutomationLevel.LEVEL_0_INFO_ONLY ||
    level === AutomationLevel.LEVEL_1_RECOMMENDATION ||
    level === AutomationLevel.LEVEL_2_HUMAN_APPROVAL ||
    level === AutomationLevel.LEVEL_4_PROHIBITED;
  return {
    required,
    reason: required
      ? `Level ${level} requires human approval/sign-off.`
      : `Level ${level} permits AI auto-execution of pre-scoped low-risk actions.`,
    level,
  };
}

/**
 * Set the automation level for a feature / institution. Requires
 * authorization (admin only).
 */
export function setAutomationLevel(
  featureId: string,
  level: AutomationLevel,
  setBy: string,
  reason: string,
  institution = "global",
): AutomationConfig {
  seedIfEmpty();
  const key = institution === "global" ? featureId : `${featureId}@${institution}`;
  const existing = configs.get(key);
  const previousLevel = existing?.level ?? AutomationLevel.LEVEL_2_HUMAN_APPROVAL;
  const baseName = existing?.featureName ?? featureId;
  const cfg: AutomationConfig = {
    featureId: key,
    featureName: baseName,
    institution,
    level,
    setBy,
    setAt: new Date().toISOString(),
    reason,
    auditTrail: [
      ...(existing?.auditTrail ?? []),
      {
        timestamp: new Date().toISOString(),
        previousLevel,
        newLevel: level,
        setBy,
        reason,
      },
    ],
  };
  configs.set(key, cfg);

  void safeDbQuery(async () => {
    const { db } = await import("@/lib/db");
    const prev = await db.auditRecord.findFirst({
      where: { target: "ai-automation" },
      orderBy: { timestamp: "desc" },
    });
    const previousHash = prev?.hash ?? "genesis";
    const entryHash = hash(key + level + cfg.setAt + previousHash);
    await db.auditRecord.create({
      data: {
        auditId: `automation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        eventType: `ai:automation:set-level:${AutomationLevel[level]}`,
        target: "ai-automation",
        decision: level === AutomationLevel.LEVEL_4_PROHIBITED ? "deny" : "approve",
        description: `Automation level for ${key} set to L${level} by ${setBy}`,
        data: cfg as any,
        hash: entryHash,
        previousHash,
      },
    });
  });

  return cfg;
}

export function listAllConfigs(): AutomationConfig[] {
  seedIfEmpty();
  return Array.from(configs.values());
}

export function describeLevel(level: AutomationLevel): {
  label: string;
  description: string;
} {
  switch (level) {
    case AutomationLevel.LEVEL_0_INFO_ONLY:
      return {
        label: "L0 — Info Only",
        description: "AI provides information; no action taken.",
      };
    case AutomationLevel.LEVEL_1_RECOMMENDATION:
      return {
        label: "L1 — Recommendation",
        description: "AI recommends an action; human decides and acts.",
      };
    case AutomationLevel.LEVEL_2_HUMAN_APPROVAL:
      return {
        label: "L2 — Human Approval",
        description: "AI prepares the action; human approves before execution.",
      };
    case AutomationLevel.LEVEL_3_LOW_RISK_AUTO:
      return {
        label: "L3 — Low-Risk Auto",
        description: "AI auto-executes pre-scoped low-risk actions.",
      };
    case AutomationLevel.LEVEL_4_PROHIBITED:
      return {
        label: "L4 — Prohibited",
        description: "Action is prohibited for AI; only humans may perform.",
      };
    default:
      return { label: `L${level}`, description: "Unknown level." };
  }
}
