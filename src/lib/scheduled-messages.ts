// @ts-nocheck
/**
 * scheduled-messages.ts — B6 Scheduled Messages.
 *
 * Server-only library for scheduling a message to be sent at a future
 * time. Backs:
 *   • POST   /api/messages/scheduled   (scheduleMessage)
 *   • GET    /api/messages/scheduled   (getScheduledMessages)
 *   • DELETE /api/messages/scheduled   (cancelScheduled)
 *
 * Storage: Prisma `ScheduledMessage` (SQLite). Status lifecycle:
 *   pending  → sent       (when the scheduler picks it up at scheduledFor)
 *   pending  → cancelled  (when the user cancels before send)
 *
 * The scheduler itself is a separate concern — this lib only manages the
 * data model. A background worker (cron / interval) will poll pending rows
 * whose scheduledFor <= now and dispatch them.
 *
 * `getOptimalTimes()` returns AI-suggested optimal send times for the next
 * 7 days, based on simple heuristics (conversation activity peaks). In
 * production this would call Cirkle Brain AI.
 */
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const SCHEDULE_STATUSES = ["pending", "sent", "cancelled"] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const MAX_BODY_LENGTH = 4096;
/** Earliest a message can be scheduled: 1 minute from now. */
export const MIN_LEAD_MS = 60 * 1000;
/** Latest a message can be scheduled: 1 year from now. */
export const MAX_LEAD_MS = 365 * 24 * 60 * 60 * 1000;

export interface ScheduledMessageDTO {
  id: string;
  conversationId: string;
  body: string;
  scheduledFor: string;
  status: ScheduleStatus;
  createdAt: string;
}

export interface OptimalTime {
  iso: string;
  label: string;
  reason: string;
  score: number; // 0..1 — higher is better
}

function rowToDTO(row: {
  id: string;
  conversationId: string;
  body: string;
  scheduledFor: Date;
  status: string;
  createdAt: Date;
}): ScheduledMessageDTO {
  return {
    id: row.id,
    conversationId: row.conversationId,
    body: row.body,
    scheduledFor: row.scheduledFor.toISOString(),
    status: (SCHEDULE_STATUSES as readonly string[]).includes(row.status)
      ? (row.status as ScheduleStatus)
      : "pending",
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Validate that `scheduledFor` is within the allowed window relative to now.
 */
function validateScheduledFor(scheduledFor: Date, now: Date = new Date()): void {
  const leadMs = scheduledFor.getTime() - now.getTime();
  if (leadMs < MIN_LEAD_MS) {
    throw new Error("Scheduled time must be at least 1 minute in the future.");
  }
  if (leadMs > MAX_LEAD_MS) {
    throw new Error("Scheduled time cannot be more than 1 year in the future.");
  }
}

/**
 * Schedule a message. Creates a row with status="pending".
 */
export async function scheduleMessage(input: {
  conversationId: string;
  body: string;
  scheduledFor: Date | string;
  senderId?: string | null;
  senderName?: string | null;
}): Promise<ScheduledMessageDTO> {
  if (!input.conversationId) throw new Error("conversationId is required.");
  const body = (input.body ?? "").trim();
  if (!body) throw new Error("body cannot be empty.");
  if (body.length > MAX_BODY_LENGTH) {
    throw new Error(`body exceeds ${MAX_BODY_LENGTH} characters.`);
  }
  const when =
    input.scheduledFor instanceof Date
      ? input.scheduledFor
      : new Date(input.scheduledFor);
  if (Number.isNaN(when.getTime())) {
    throw new Error("scheduledFor is not a valid date.");
  }
  validateScheduledFor(when);

  const row = await db.scheduledMessage.create({
    data: {
      conversationId: input.conversationId,
      body,
      scheduledFor: when,
      status: "pending",
    },
  });
  logger.info("[scheduled-messages] scheduled", {
    id: row.id,
    conversationId: input.conversationId,
    scheduledFor: when.toISOString(),
  });
  return rowToDTO(row);
}

/**
 * List scheduled messages. Pass a filter to narrow by conversationId and/or
 * status. Always returns oldest-first within pending (so the scheduler can
 * process them in order).
 */
export async function getScheduledMessages(filter?: {
  conversationId?: string;
  status?: ScheduleStatus;
  limit?: number;
}): Promise<ScheduledMessageDTO[]> {
  const where: { conversationId?: string; status?: string } = {};
  if (filter?.conversationId) where.conversationId = filter.conversationId;
  if (filter?.status) where.status = filter.status;
  const limit = Math.min(Math.max(filter?.limit ?? 100, 1), 500);

  const rows = await db.scheduledMessage.findMany({
    where,
    orderBy: { scheduledFor: "asc" },
    take: limit,
  });
  return rows.map(rowToDTO);
}

/**
 * Cancel a scheduled message. Only pending rows can be cancelled; cancelling
 * a sent or already-cancelled row is a no-op (returns { cancelled: false }).
 */
export async function cancelScheduled(id: string): Promise<{ cancelled: boolean }> {
  if (!id) throw new Error("id is required.");
  const row = await db.scheduledMessage.findUnique({ where: { id } });
  if (!row) throw new Error("Scheduled message not found.");
  if (row.status !== "pending") return { cancelled: false };

  await db.scheduledMessage.update({
    where: { id },
    data: { status: "cancelled" },
  });
  logger.info("[scheduled-messages] cancelled", { id });
  return { cancelled: true };
}

/**
 * Mark a scheduled message as sent (called by the scheduler worker once
 * the message has been delivered). Not exposed via API — internal only.
 */
export async function markSent(id: string): Promise<{ ok: true }> {
  if (!id) throw new Error("id is required.");
  await db.scheduledMessage.update({
    where: { id },
    data: { status: "sent" },
  });
  logger.info("[scheduled-messages] sent", { id });
  return { ok: true };
}

/**
 * AI-suggested optimal send times for the next 7 days.
 *
 * Heuristic (no external AI call needed):
 *  - 8:30am  — early-morning catch-up window
 *  - 12:30pm — lunch break
 *  - 6:00pm  — end-of-work-day wind-down
 *  - 9:30pm  — evening peak engagement
 *
 * Weekend mornings are pushed later (10:30am) since people sleep in.
 * Each suggestion is scored 0..1 (peak evening = 0.95, early morning =
 * 0.55). Returns 8 suggestions spanning the next 7 days.
 */
export async function getOptimalTimes(
  _conversationId?: string,
  now: Date = new Date(),
): Promise<OptimalTime[]> {
  const out: OptimalTime[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setSeconds(0, 0);
    const isWeekend = d.getDay() === 5 || d.getDay() === 6; // Fri/Sat (regional weekend)
    const dayLabel = dayNames[d.getDay()];

    const slots: { h: number; m: number; label: string; reason: string; score: number }[] = isWeekend
      ? [
          { h: 10, m: 30, label: "Late morning", reason: "Weekend catch-up window", score: 0.6 },
          { h: 14, m: 0, label: "Afternoon", reason: "Post-lunch lull, low friction", score: 0.75 },
          { h: 21, m: 30, label: "Evening peak", reason: "Highest weekend engagement", score: 0.95 },
        ]
      : [
          { h: 8, m: 30, label: "Early morning", reason: "Workday commute catch-up", score: 0.55 },
          { h: 12, m: 30, label: "Lunch break", reason: "Midday pause, high open rate", score: 0.78 },
          { h: 18, m: 0, label: "After work", reason: "End-of-day wind-down", score: 0.82 },
          { h: 21, m: 30, label: "Evening peak", reason: "Highest weekday engagement", score: 0.95 },
        ];

    for (const s of slots) {
      const t = new Date(d);
      t.setHours(s.h, s.m, 0, 0);
      // Skip past slots today.
      if (t.getTime() <= now.getTime() + MIN_LEAD_MS) continue;
      const timeLabel = t.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      out.push({
        iso: t.toISOString(),
        label: `${dayLabel} ${timeLabel} · ${s.label}`,
        reason: s.reason,
        score: s.score,
      });
    }
  }

  // Cap at 8 highest-scoring suggestions, sorted chronologically.
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
}
