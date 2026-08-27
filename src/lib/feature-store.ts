// @ts-nocheck
/**
 * In-memory store helper for new TIER-D-F features.
 *
 * Why in-memory? The Prisma schema is frozen (cannot be modified in this
 * task). Rather than blocking development, we store feature data in
 * module-scoped Maps that persist for the lifetime of the dev server.
 *
 * Each feature gets its own keyed store via `getStore<T>(name)` so different
 * libs don't collide. All write/read operations are synchronous & safe.
 */
import "server-only";
import { randomBytes } from "crypto";

export type ID = string;

export function genId(prefix = ""): ID {
  const r = randomBytes(8).toString("hex");
  const t = Date.now().toString(36);
  return `${prefix}${t}${r}`;
}

const _stores = new Map<string, Map<string, any>>();

export function getStore<T extends { id: string }>(name: string): Map<string, T> {
  if (!_stores.has(name)) {
    _stores.set(name, new Map<string, T>());
  }
  return _stores.get(name) as Map<string, T>;
}

export function put<T extends { id: string }>(name: string, rec: T): T {
  getStore<T>(name).set(rec.id, rec);
  return rec;
}

export function get<T extends { id: string }>(name: string, id: string): T | null {
  return (getStore<T>(name).get(id) as T) ?? null;
}

export function remove(name: string, id: string): boolean {
  return getStore(name).delete(id);
}

export function all<T extends { id: string }>(name: string): T[] {
  return Array.from(getStore<T>(name).values());
}

export function find<T extends { id: string }>(
  name: string,
  predicate: (rec: T) => boolean,
): T[] {
  return all<T>(name).filter(predicate);
}

export function findOne<T extends { id: string }>(
  name: string,
  predicate: (rec: T) => boolean,
): T | null {
  return all<T>(name).find(predicate) ?? null;
}

export function update<T extends { id: string }>(
  name: string,
  id: string,
  patch: Partial<T>,
): T | null {
  const cur = get<T>(name, id);
  if (!cur) return null;
  const next = { ...cur, ...patch, id } as T;
  getStore<T>(name).set(id, next);
  return next;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Parse a "JSON array" string with defensive fallback to []. */
export function parseArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyArray(arr: unknown[]): string {
  return JSON.stringify(arr);
}
