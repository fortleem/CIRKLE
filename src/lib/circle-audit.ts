// @ts-nocheck
import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Circle audit log helper (Blueprint §10.5.8).
 *
 * Records a single audit entry for a circle mutation. Best-effort: a
 * failure to record an audit entry MUST NOT bubble up to the caller —
 * audit is a transparency feature, never a blocker for the user-facing
 * action.
 */
export interface RecordAuditOpts {
  circleId: string;
  action: string;
  actor: string;
  target?: string | null;
  summary: string;
}

export async function recordCircleAudit(opts: RecordAuditOpts): Promise<void> {
  try {
    await db.circleAuditLog.create({
      data: {
        circleId: opts.circleId,
        action: opts.action,
        actor: opts.actor,
        target: opts.target ?? null,
        summary: opts.summary.slice(0, 600),
      },
    });
  } catch (err) {
    logger.warn("[circle-audit] failed to record entry", {
      circleId: opts.circleId,
      action: opts.action,
      error: (err as Error).message,
    });
  }
}
