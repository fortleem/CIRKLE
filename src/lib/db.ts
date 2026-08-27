import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

/**
 * Database client — Turso (libsql) for production, local SQLite for dev.
 *
 * Configuration:
 *   Local dev:
 *     DATABASE_URL=file:./db/custom.db
 *
 *   Production (Turso):
 *     TURSO_DATABASE_URL=libsql://cirkle-fortleem.aws-us-east-1.turso.io
 *     TURSO_AUTH_TOKEN=<token>
 *
 * The Prisma driver adapter translates Prisma queries to libsql protocol,
 * enabling Turso's edge-replicated SQLite database.
 */

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const isProd = process.env.NODE_ENV === "production";

  // In production (Vercel), use the Turso libsql adapter.
  // In development, use local SQLite directly (the Turso adapter has a known
  // URL_INVALID issue when DATABASE_URL is also set for local dev).
  if (isProd && tursoUrl && tursoUrl.startsWith("libsql://")) {
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log: ["error"] } as any);
  }

  // Local SQLite (dev) — also used as fallback in prod if Turso not configured
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./db/custom.db";
  }
  return new PrismaClient({ log: ["error"] });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
