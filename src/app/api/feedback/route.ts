import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/feedback
 *
 * Stores user feedback submitted from a `<FeedbackButton>` in any overlay
 * header. The body shape is `{ overlay: string, message: string, username?: string }`.
 *
 * Persistence is best-effort: if the database is unavailable we still log
 * the payload so no feedback is silently lost.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const overlay = String(body?.overlay || "").trim().slice(0, 120);
    const message = String(body?.message || "").trim().slice(0, 8000);
    const username = body?.username ? String(body.username).trim().slice(0, 200) : null;

    if (!overlay || !message) {
      return NextResponse.json(
        { ok: false, error: "overlay and message are required." },
        { status: 400 },
      );
    }

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
}
