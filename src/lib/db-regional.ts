/**
 * Multi-region Prisma client manager.
 *
 * In production each `Region` has its own database (Riyadh, Cairo, Alibaba CN,
 * Yandex Cloud, …) and Cirkle routes every read/write to the user's home
 * region. This module owns the per-region `PrismaClient` cache so we don't
 * re-open connections on every request.
 *
 * In dev (single SQLite) every region's `dbUrl` is empty, so all clients fall
 * back to `process.env.DATABASE_URL` — the default Prisma client. The
 * `GLOBAL_REGION` key is reused for that fallback.
 */

import { PrismaClient } from "@prisma/client";
import {
  REGIONS,
  getRegionForCountry,
  GLOBAL_REGION,
  type Region,
} from "./regions";

// Cache Prisma clients per region (avoid re-creating connections).
const clients = new Map<string, PrismaClient>();

/**
 * Returns the `PrismaClient` for the region that owns `countryCode`.
 *
 * - Looks up the region for the ISO-2 country code.
 * - If the region has a configured `dbUrl`, instantiates (and caches) a
 *   `PrismaClient` pointed at it.
 * - If no `dbUrl` is configured (dev / single-region), falls back to the
 *   shared default client (`process.env.DATABASE_URL`).
 */
export function getRegionalDb(countryCode: string): PrismaClient {
  const region = getRegionForCountry(countryCode);
  return getOrCreateClient(region);
}

/**
 * Returns the `PrismaClient` for a specific region code (e.g. "KSA", "CN").
 * Falls back to the default DB when the region is unknown or unconfigured.
 */
export function getDbForRegion(regionCode: string): PrismaClient {
  const region =
    regionCode === "GLOBAL"
      ? GLOBAL_REGION
      : REGIONS.find((r) => r.code === regionCode) ?? GLOBAL_REGION;
  return getOrCreateClient(region);
}

function getOrCreateClient(region: Region): PrismaClient {
  const cached = clients.get(region.code);
  if (cached) return cached;

  // When the region has no dedicated URL we intentionally reuse the GLOBAL
  // client so dev mode shares a single connection pool.
  if (!region.dbUrl && region.code !== "GLOBAL") {
    const globalClient = getOrCreateClient(GLOBAL_REGION);
    clients.set(region.code, globalClient);
    return globalClient;
  }

  const url = region.dbUrl || process.env.DATABASE_URL;
  const client = new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: ["error", "warn"],
  });
  clients.set(region.code, client);
  return client;
}

/**
 * For routes that have a user's country, use this to get the right DB.
 *
 * In production: look up the user's country from a global index table, then
 * resolve the region. For now (dev / single-region) we use the default DB.
 */
export async function getUserDb(username: string): Promise<PrismaClient> {
  const { getRegionForUser } = await import("./regions");
  const region = await getRegionForUser(username);
  // If the user resolved to GLOBAL (dev fallback, unknown user, etc.) we
  // return the shared global client — same as the legacy `db` export.
  return getOrCreateClient(region);
}

/**
 * The shared default client — identical to `@/lib/db`'s `db`. Exposed for
 * callers that don't have a country context yet (bootstrapping, migrations,
 * the global index lookup itself).
 */
export function getGlobalDb(): PrismaClient {
  return getOrCreateClient(GLOBAL_REGION);
}

/**
 * Tear down every cached client. Used in tests and graceful shutdown.
 */
export async function disconnectAllRegionalClients(): Promise<void> {
  const seen = new Set<PrismaClient>();
  for (const c of clients.values()) {
    if (!seen.has(c)) {
      seen.add(c);
      try {
        await c.$disconnect();
      } catch {
        /* no-op */
      }
    }
  }
  clients.clear();
}
