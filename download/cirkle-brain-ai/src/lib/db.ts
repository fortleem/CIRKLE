import { PrismaClient } from "@prisma/client";
import { ensureDatabaseReady } from "./db-init";

/**
 * Database client — uses /tmp/cirkle.db on Vercel serverless (writable path).
 * Falls back to the local dev path for development.
 */

function getDatabaseUrl(): string {
  // On Vercel, use /tmp (the only writable directory on serverless)
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "file:/tmp/cirkle.db";
  }
  // In development, use the local database
  return process.env.DATABASE_URL || "file:./db/custom.db";
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getDatabaseUrl();
}

// Initialize the database on Vercel
if (process.env.VERCEL) {
  try {
    ensureDatabaseReady();
  } catch {
    // Non-fatal
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
