// @ts-nocheck
/**
 * Group Description + Rules (F6).
 *
 * Each circle (group chat) has a `CircleInfo` row with a description and
 * a list of rules. Members can read; admins can edit.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, update, parseArray, stringifyArray, nowISO } from "@/lib/feature-store";

export interface CircleInfo {
  circleId: string;
  description: string;
  rules: string; // JSON array
  updatedAt: string;
}

const STORE = "circleInfo";

export async function getGroupInfo(circleId: string): Promise<CircleInfo> {
  const id = (circleId || "").trim();
  if (!id) throw new Error("circleId is required");
  const existing = get<CircleInfo>(STORE, id);
  if (existing) return existing;
  const rec: CircleInfo = {
    circleId: id,
    description: "",
    rules: stringifyArray([]),
    updatedAt: nowISO(),
  };
  put(STORE, rec);
  return rec;
}

export async function setGroupDescription(
  circleId: string,
  description: string,
): Promise<CircleInfo> {
  const id = (circleId || "").trim();
  if (!id) throw new Error("circleId is required");
  const desc = (description || "").trim().slice(0, 500);
  const existing = get<CircleInfo>(STORE, id);
  if (existing) {
    return update<CircleInfo>(STORE, id, { description: desc, updatedAt: nowISO() })!;
  }
  const rec: CircleInfo = {
    circleId: id,
    description: desc,
    rules: stringifyArray([]),
    updatedAt: nowISO(),
  };
  put(STORE, rec);
  return rec;
}

export async function setGroupRules(
  circleId: string,
  rules: string[],
): Promise<CircleInfo> {
  const id = (circleId || "").trim();
  if (!id) throw new Error("circleId is required");
  if (rules.length > 20) throw new Error("a circle can have at most 20 rules");
  const clean = rules.map((r) => r.trim().slice(0, 200)).filter(Boolean);
  const existing = get<CircleInfo>(STORE, id);
  if (existing) {
    return update<CircleInfo>(STORE, id, { rules: stringifyArray(clean), updatedAt: nowISO() })!;
  }
  const rec: CircleInfo = {
    circleId: id,
    description: "",
    rules: stringifyArray(clean),
    updatedAt: nowISO(),
  };
  put(STORE, rec);
  return rec;
}

export async function addRule(circleId: string, rule: string): Promise<CircleInfo> {
  const info = await getGroupInfo(circleId);
  const rules = parseArray<string>(info.rules);
  const clean = rule.trim().slice(0, 200);
  if (!clean) throw new Error("rule cannot be empty");
  if (rules.length >= 20) throw new Error("a circle can have at most 20 rules");
  rules.push(clean);
  return update<CircleInfo>(STORE, info.circleId, { rules: stringifyArray(rules), updatedAt: nowISO() })!;
}

export async function removeRule(circleId: string, index: number): Promise<CircleInfo> {
  const info = await getGroupInfo(circleId);
  const rules = parseArray<string>(info.rules);
  if (index < 0 || index >= rules.length) throw new Error("rule index out of range");
  rules.splice(index, 1);
  return update<CircleInfo>(STORE, info.circleId, { rules: stringifyArray(rules), updatedAt: nowISO() })!;
}

export function parseRules(info: CircleInfo): string[] {
  return parseArray<string>(info.rules);
}
