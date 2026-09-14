/**
 * Database initializer — ensures tables exist on Vercel serverless.
 * On Vercel, the filesystem is ephemeral, so we:
 * 1. Copy the committed SQLite DB from the build to /tmp (writable on serverless)
 * 2. If /tmp DB doesn't have tables, create them via Prisma
 */

import { existsSync, copyFileSync, mkdirSync } from "fs";
import path from "path";

let initialized = false;

export function ensureDatabaseReady(): void {
  if (initialized) return;

  const tmpDbPath = "/tmp/cirkle.db";
  const sourceDbPath = path.join(process.cwd(), "db", "custom.db");

  try {
    // On Vercel serverless, /tmp is writable
    if (!existsSync(tmpDbPath)) {
      // Try to copy the committed DB
      if (existsSync(sourceDbPath)) {
        mkdirSync("/tmp", { recursive: true });
        copyFileSync(sourceDbPath, tmpDbPath);
        console.log("[db-init] Copied committed DB to /tmp/cirkle.db");
      }
    }
    initialized = true;
  } catch (err) {
    console.log("[db-init] Could not init database:", String(err).slice(0, 100));
    // Non-fatal — DB queries will fail gracefully via safeDbQuery
  }
}

// Auto-initialize on module load
if (process.env.VERCEL || process.env.NODE_ENV === "production") {
  ensureDatabaseReady();
}
