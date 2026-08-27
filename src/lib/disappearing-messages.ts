// @ts-nocheck
/**
 * disappearing-messages.ts — B5 Disappearing Messages.
 *
 * Server-only library for setting / reading the per-conversation
 * disappearing-message timer. The timer applies to all NEW messages in the
 * conversation; existing messages keep their original lifetime.
 *
 * Backs:
 *   • POST /api/conversations/[id]/disappearing   (setDisappearingTimer)
 *   • GET  /api/conversations/[id]/disappearing   (getDisappearingSetting)
 *
 * Storage: Prisma `DisappearingSetting` (SQLite). @@unique(conversationId)
 * guarantees one timer per conversation.
 *
 * Timer options:
 *   - "off"        Messages never disappear.
 *   - "24h"        Messages disappear 24h after they were sent.
 *   - "7d"         Messages disappear 7 days after they were sent.
 *   - "90d"        Messages disappear 90 days after they were sent.
 *   - "view-once"  Messages disappear after the recipient reads them once.
 */
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const DURATION_OPTIONS = ["off", "24h", "7d", "90d", "view-once"] as const;
export type DisappearingDuration = (typeof DURATION_OPTIONS)[number];

export function isValidDuration(d: string): d is DisappearingDuration {
  return (DURATION_OPTIONS as readonly string[]).includes(d);
}

/** Convert a duration string to milliseconds (for TTL comparisons). */
export function durationMs(d: DisappearingDuration): number | null {
  switch (d) {
    case "off":
      return null;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "90d":
      return 90 * 24 * 60 * 60 * 1000;
    case "view-once":
      return 0; // Disappears immediately after first read.
    default:
      return null;
  }
}

export interface DisappearingSettingDTO {
  id: string;
  conversationId: string;
  duration: DisappearingDuration;
  setBy: string;
  setAt: string;
}

function rowToDTO(row: {
  id: string;
  conversationId: string;
  duration: string;
  setBy: string;
  setAt: Date;
}): DisappearingSettingDTO {
  return {
    id: row.id,
    conversationId: row.conversationId,
    duration: (isValidDuration(row.duration) ? row.duration : "off") as DisappearingDuration,
    setBy: row.setBy,
    setAt: row.setAt.toISOString(),
  };
}

/**
 * Set (or update) the disappearing-message timer for a conversation.
 * Idempotent — calling with the same duration twice just refreshes setAt.
 */
export async function setDisappearingTimer(
  conversationId: string,
  duration: DisappearingDuration,
  setBy: string,
): Promise<DisappearingSettingDTO> {
  if (!conversationId) throw new Error("conversationId is required.");
  if (!setBy) throw new Error("setBy is required.");
  if (!isValidDuration(duration)) {
    throw new Error(`Invalid duration. Allowed: ${DURATION_OPTIONS.join(", ")}`);
  }

  const existing = await db.disappearingSetting.findUnique({
    where: { conversationId },
  });

  if (existing) {
    const updated = await db.disappearingSetting.update({
      where: { id: existing.id },
      data: { duration, setBy, setAt: new Date() },
    });
    logger.info("[disappearing] updated", { conversationId, duration, setBy });
    return rowToDTO(updated);
  }

  const row = await db.disappearingSetting.create({
    data: { conversationId, duration, setBy },
  });
  logger.info("[disappearing] created", { conversationId, duration, setBy });
  return rowToDTO(row);
}

/**
 * Get the current disappearing-message setting for a conversation.
 * Returns a synthetic "off" DTO if no setting exists yet.
 */
export async function getDisappearingSetting(
  conversationId: string,
): Promise<DisappearingSettingDTO> {
  if (!conversationId) throw new Error("conversationId is required.");
  const row = await db.disappearingSetting.findUnique({
    where: { conversationId },
  });
  if (!row) {
    return {
      id: "none",
      conversationId,
      duration: "off",
      setBy: "",
      setAt: new Date().toISOString(),
    };
  }
  return rowToDTO(row);
}

/**
 * Given a message's createdAt, decide whether it has expired under the
 * conversation's current disappearing setting. Returns false for "off" and
 * for messages younger than the TTL. Returns true for "view-once" only if
 * `read` is true (the recipient has opened it).
 */
export async function isMessageExpired(
  conversationId: string,
  createdAt: Date,
  read = false,
  now: Date = new Date(),
): Promise<boolean> {
  const setting = await getDisappearingSetting(conversationId);
  if (setting.duration === "off") return false;
  if (setting.duration === "view-once") return read;
  const ms = durationMs(setting.duration);
  if (ms === null) return false;
  return now.getTime() - createdAt.getTime() >= ms;
}
