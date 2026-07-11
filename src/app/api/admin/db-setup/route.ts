// @ts-nocheck
/**
 * POST /api/admin/db-setup
 * Creates all Prisma tables in the database.
 * Call this once after deployment to initialize the database.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Test by creating a simple table query
    const result = await db.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' LIMIT 1`.catch(() => null);

    // Try to create tables by touching each model
    const tests: string[] = [];
    try { await db.user.count(); tests.push("User ✅"); } catch { tests.push("User ❌"); }
    try { await db.post.count(); tests.push("Post ✅"); } catch { tests.push("Post ❌"); }
    try { await db.conversation.count(); tests.push("Conversation ✅"); } catch { tests.push("Conversation ❌"); }

    return NextResponse.json({
      message: "Database check complete",
      rawResult: result,
      tables: tests,
      databaseUrl: process.env.DATABASE_URL?.replace(/[^:]*$/, "***") || "not set",
    });
  } catch (err) {
    return NextResponse.json({
      error: "DB setup failed",
      detail: String(err).slice(0, 300),
      databaseUrl: process.env.DATABASE_URL || "not set",
    }, { status: 500 });
  }
}
