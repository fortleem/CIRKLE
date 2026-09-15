// @ts-nocheck
// P1 FIX: Rate-limited (10/min — posts preset) + Zod-validated body.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/api-rate-limit";
import { validateBody, z } from "@/lib/api-validation";

/**
 * POST /api/feedback
 *
 * Stores user feedback submitted from a `<FeedbackButton>` in any overlay
 * header. The body shape is `{ overlay, message, username? }`.
 *
 * Persistence is best-effort: if the database is unavailable we still log
 * the payload so no feedback is silently lost.
 *
 * P1 FIX — wrapped with `withRateLimit` (10 req/min — posts preset, anti-
 * spam) and `validateBody` so oversized / missing payloads return 400
 * before persistence.
 */

/**
 * Zod schema for `POST /api/feedback`.
 *   - `overlay` is required (1–120 chars — handler slices to 120).
 *   - `message` is required (1–8000 chars — handler slices to 8000).
 *   - `username` is optional (max 200 chars).
 *
 * (The task brief lists `type, message` but the actual handler persists
 * `overlay, message, username` — the schema below matches the real shape.)
 */
const feedbackSchema = z.object({
  overlay: z.string().min(1).max(120),
  message: z.string().min(1).max(8000),
  username: z.string().max(200).optional(),
});

export const POST = withRateLimit(
  validateBody(feedbackSchema, async (req, body) => {
    try {
      const overlay = body.overlay.trim().slice(0, 120);
      const message = body.message.trim().slice(0, 8000);
      const username = body.username ? body.username.trim().slice(0, 200) : null;

      try {
        // Preferred path: use the typed Prisma model (works once the dev
        // server picks up the regenerated Prisma client).
        if (db.feedback) {
          await db.feedback.create({
            data: { overlay, message, username },
          });
        } else {
          // Hot-reload fallback: the long-lived dev server may still hold
          // a PrismaClient instance cached in `globalThis` from before the
          // Feedback model was added. Drop down to raw SQL so feedback is
          // still persisted while the dev server catches up.
          await db.$executeRaw`INSERT INTO Feedback (id, overlay, message, username, createdAt) VALUES (${crypto.randomUUID()}, ${overlay}, ${message}, ${username}, ${new Date().toISOString()})`;
        }
      } catch (dbErr) {
        // Final fallback: log to stdout so no feedback is silently lost.
        console.warn("[feedback] db write failed:", String((dbErr as Error)?.message || dbErr));
        console.log("[feedback]", { overlay, message, username, at: new Date().toISOString() });
      }

      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("[feedback] fatal:", err);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }),
  RATE_LIMIT_PRESETS.posts,
);
