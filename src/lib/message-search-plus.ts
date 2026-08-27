// @ts-nocheck
/**
 * Message Search — PLUS (F4+).
 *
 * Polish layer on top of `message-search.ts`.
 * Adds: advanced query operators (from:, in:, has:, before:, after:, type:),
 * search history (saved per user), saved searches (re-run with one tap),
 * and full-text ranking with relevance scoring.
 *
 * Storage: in-memory feature-store (Prisma schema frozen for this task).
 */
import "server-only";
import { get, put, find, findOne, all, remove, nowISO } from "@/lib/feature-store";
import { searchMessages as baseSearch, type MessageSearchResult } from "@/lib/message-search";

export interface ParsedQuery {
  text: string;
  sender?: string;
  conversationId?: string;
  has?: "image" | "video" | "audio" | "document" | "link" | "poll" | "file";
  before?: string;
  after?: string;
  type?: string;
}

export interface RankedResult extends MessageSearchResult {
  score: number;
}

export interface SearchHistoryEntry {
  id: string;
  userId: string;
  rawQuery: string;
  parsed: ParsedQuery;
  resultCount: number;
  executedAt: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  rawQuery: string;
  parsed: ParsedQuery;
  createdAt: string;
}

const HISTORY = "messageSearchHistory";
const SAVED = "messageSearchSaved";

function normalizeUser(u: string): string {
  return (u || "").trim().toLowerCase().replace(/^@/, "");
}

/** Parse a query string with operators like `from:alice has:image before:2025-01-01`. */
export function parseQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = { text: "" };
  if (!raw) return result;
  const tokens = raw.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const textParts: string[] = [];
  for (const tok of tokens) {
    const cleaned = tok.replace(/^"|"$/g, "");
    const colonIdx = cleaned.indexOf(":");
    if (colonIdx > 0) {
      const key = cleaned.slice(0, colonIdx).toLowerCase();
      const val = cleaned.slice(colonIdx + 1);
      switch (key) {
        case "from":
        case "sender":
          result.sender = val.replace(/^@/, "");
          break;
        case "in":
        case "conversation":
          result.conversationId = val;
          break;
        case "has":
          result.has = val as ParsedQuery["has"];
          break;
        case "before":
          result.before = val;
          break;
        case "after":
          result.after = val;
          break;
        case "type":
          result.type = val;
          break;
        default:
          // Unknown operator — treat as text
          textParts.push(cleaned);
      }
    } else {
      textParts.push(cleaned);
    }
  }
  result.text = textParts.join(" ").trim();
  return result;
}

function rankResult(result: MessageSearchResult, parsed: ParsedQuery): number {
  let score = 0;
  if (parsed.text && result.body) {
    const lcBody = result.body.toLowerCase();
    const lcQ = parsed.text.toLowerCase();
    // Exact phrase match = highest
    if (lcBody.includes(lcQ)) score += 50;
    // Word matches
    const words = lcQ.split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (lcBody.includes(w)) score += 10;
    }
  }
  // Recency boost
  const ageDays = (Date.now() - new Date(result.createdAt).getTime()) / 86400_000;
  if (ageDays < 7) score += 5;
  else if (ageDays < 30) score += 2;
  return score;
}

export async function searchWithRanking(input: {
  userId: string;
  rawQuery: string;
  conversationId?: string;
  limit?: number;
}): Promise<{ results: RankedResult[]; parsed: ParsedQuery; total: number }> {
  const uid = normalizeUser(input.userId);
  if (!uid) return { results: [], parsed: parseQuery(input.rawQuery), total: 0 };
  const parsed = parseQuery(input.rawQuery);
  const out = await baseSearch({
    userId: uid,
    query: parsed.text || undefined,
    sender: parsed.sender,
    conversationId: parsed.conversationId ?? input.conversationId,
    fromDate: parsed.after,
    toDate: parsed.before,
    fileType: parsed.has === "image" || parsed.has === "video" || parsed.has === "audio" || parsed.has === "document"
      ? parsed.has
      : parsed.type,
    limit: input.limit ?? 50,
  });
  const ranked = out.results.map((r) => ({ ...r, score: rankResult(r, parsed) }));
  ranked.sort((a, b) => b.score - a.score || (a.createdAt < b.createdAt ? 1 : -1));
  // Save to history
  recordHistory(uid, input.rawQuery, parsed, ranked.length).catch(() => null);
  return { results: ranked, parsed, total: out.total };
}

async function recordHistory(
  userId: string,
  rawQuery: string,
  parsed: ParsedQuery,
  resultCount: number,
): Promise<void> {
  if (!rawQuery.trim()) return;
  // Cap history at 50 entries per user
  const userHistory = find<SearchHistoryEntry>(HISTORY, (h) => h.userId === userId)
    .sort((a, b) => (a.executedAt < b.executedAt ? 1 : -1));
  if (userHistory.length >= 50) {
    // Remove oldest
    for (let i = 49; i < userHistory.length; i++) {
      remove(HISTORY, userHistory[i].id);
    }
  }
  const entry: SearchHistoryEntry = {
    id: `hist_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId,
    rawQuery,
    parsed,
    resultCount,
    executedAt: nowISO(),
  };
  put(HISTORY, entry);
}

export async function getSearchHistory(userId: string, limit = 20): Promise<SearchHistoryEntry[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  return find<SearchHistoryEntry>(HISTORY, (h) => h.userId === uid)
    .sort((a, b) => (a.executedAt < b.executedAt ? 1 : -1))
    .slice(0, limit);
}

export async function clearSearchHistory(userId: string): Promise<number> {
  const uid = normalizeUser(userId);
  if (!uid) return 0;
  const items = find<SearchHistoryEntry>(HISTORY, (h) => h.userId === uid);
  for (const i of items) remove(HISTORY, i.id);
  return items.length;
}

export async function saveSearch(userId: string, name: string, rawQuery: string): Promise<SavedSearch> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  if (!name.trim()) throw new Error("name is required");
  // Idempotent on (userId, name)
  const existing = findOne<SavedSearch>(SAVED, (s) => s.userId === uid && s.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return update<SavedSearch>(SAVED, existing.id, { rawQuery, parsed: parseQuery(rawQuery) }) as SavedSearch;
  }
  const saved: SavedSearch = {
    id: `saved_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    name: name.trim(),
    rawQuery,
    parsed: parseQuery(rawQuery),
    createdAt: nowISO(),
  };
  put(SAVED, saved);
  return saved;
}

export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  return find<SavedSearch>(SAVED, (s) => s.userId === uid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteSavedSearch(searchId: string): Promise<boolean> {
  return remove(SAVED, searchId);
}

/** Suggest queries based on the user's history + saved searches. */
export async function suggestQueries(userId: string, prefix: string): Promise<string[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  const prefixLower = (prefix || "").toLowerCase();
  const history = await getSearchHistory(uid, 50);
  const saved = await listSavedSearches(uid);
  const candidates = new Set<string>();
  for (const h of history) {
    if (!prefixLower || h.rawQuery.toLowerCase().includes(prefixLower)) {
      candidates.add(h.rawQuery);
    }
  }
  for (const s of saved) {
    if (!prefixLower || s.rawQuery.toLowerCase().includes(prefixLower)) {
      candidates.add(s.rawQuery);
    }
  }
  return Array.from(candidates).slice(0, 8);
}

/** Stats: most-searched terms, total searches. */
export interface SearchStats {
  totalSearches: number;
  topQueries: { query: string; count: number }[];
  savedSearchCount: number;
}

export async function getSearchStats(userId: string): Promise<SearchStats> {
  const uid = normalizeUser(userId);
  if (!uid) return { totalSearches: 0, topQueries: [], savedSearchCount: 0 };
  const history = find<SearchHistoryEntry>(HISTORY, (h) => h.userId === uid);
  const saved = find<SavedSearch>(SAVED, (s) => s.userId === uid);
  const queryCounts = new Map<string, number>();
  for (const h of history) {
    const key = h.rawQuery.trim();
    if (!key) continue;
    queryCounts.set(key, (queryCounts.get(key) ?? 0) + 1);
  }
  const topQueries = Array.from(queryCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    totalSearches: history.length,
    topQueries,
    savedSearchCount: saved.length,
  };
}
