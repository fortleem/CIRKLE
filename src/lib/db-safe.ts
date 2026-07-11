// @ts-nocheck
/**
 * Database-safe wrapper — returns null instead of throwing when DB is unavailable.
 * Used by API routes that need to degrade gracefully on serverless (Vercel)
 * where SQLite tables may not exist.
 */

export async function safeDbQuery<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const msg = String(err);
    if (msg.includes("does not exist") || msg.includes("Environment variable not found") || msg.includes("PrismaClient")) {
      console.log("[db-safe] Database not available, returning null");
      return null;
    }
    throw err;
  }
}

export function isDbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
