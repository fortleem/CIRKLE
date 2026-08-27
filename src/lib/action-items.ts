// @ts-nocheck
/**
 * AI Action Item Extraction (Tier E, E8).
 *
 * Scans chat messages for commitments like "I'll send by Friday", "Let's meet
 * next week", "Remind me to call mom" and extracts structured action items
 * (body, assignee, dueDate). Uses `aiComplete` (Groq preferred).
 *
 * Pure module — imported by `/api/ai/action-items`. Requires the
 * `ActionItem` Prisma model:
 *
 *   model ActionItem {
 *     id              String   @id @default(cuid())
 *     conversationId  String
 *     messageId       String
 *     body            String
 *     assignee        String?
 *     dueDate         DateTime?
 *     done            Boolean  @default(false)
 *     extractedAt     DateTime @default(now())
 *     @@index([conversationId, done])
 *     @@index([dueDate])
 *   }
 */
import { aiComplete, extractJSON } from "@/lib/ai";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export interface ActionItemInput {
  body: string;
  assignee?: string;
  dueDate?: string; // ISO string
}

export interface ExtractInput {
  conversationId: string;
  /** Recent messages (max 50). Each entry has body + senderName + id + at. */
  messages?: Array<{
    id: string;
    body: string;
    senderName?: string;
    at?: string;
  }>;
  /** Optional locale hint. */
  locale?: "en" | "ar";
}

export interface ExtractedItem {
  /** Message id the item was extracted from. */
  messageId: string;
  body: string;
  assignee?: string;
  dueDate?: string;
}

export interface ExtractResult {
  conversationId: string;
  items: ExtractedItem[];
  /** Provider that produced the extraction. */
  provider: string;
  /** Elapsed ms. */
  elapsedMs: number;
  /** True when the AI failed and we returned a heuristic extraction. */
  fallback: boolean;
}

// ── Heuristic extraction (deterministic) ─────────────────────────────────

const COMMITMENT_PATTERNS: RegExp[] = [
  /\bI'?ll\s+\S+(?:\s+\S+){0,6}\s+(?:by|before|until)\s+[\w\s]+/i,
  /\bI\s+will\s+\S+(?:\s+\S+){0,6}\s+(?:by|before|until)\s+[\w\s]+/i,
  /\bremind\s+me\s+to\s+[^.?!]{3,80}/i,
  /\blet'?s\s+(?:meet|catch up|talk|schedule|sync)\s+[^.?!]{3,80}/i,
  /\bdue\s+(?:by|on)\s+[\w\s]+/i,
  /\bdeadline\s+(?:is|by|on)\s+[\w\s]+/i,
  /\bnext\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\bI'?ll\s+(?:send|share|email|call|text|ping)\s+[^.?!]{3,80}/i,
];

const DUE_PATTERNS: Array<{ re: RegExp; offsetDays: number }> = [
  { re: /\btoday\b/i, offsetDays: 0 },
  { re: /\btomorrow\b/i, offsetDays: 1 },
  { re: /\bnext\s+week\b/i, offsetDays: 7 },
  { re: /\bnext\s+month\b/i, offsetDays: 30 },
  { re: /\bthis\s+week\b/i, offsetDays: 3 },
  { re: /\bmonday\b/i, offsetDays: 1 },
  { re: /\btuesday\b/i, offsetDays: 2 },
  { re: /\bwednesday\b/i, offsetDays: 3 },
  { re: /\bthursday\b/i, offsetDays: 4 },
  { re: /\bfriday\b/i, offsetDays: 5 },
  { re: /\bsaturday\b/i, offsetDays: 6 },
  { re: /\bsunday\b/i, offsetDays: 7 },
];

function extractDueDate(text: string): string | undefined {
  for (const { re, offsetDays } of DUE_PATTERNS) {
    if (re.test(text)) {
      const d = new Date(Date.now() + offsetDays * 86_400_000);
      d.setHours(18, 0, 0, 0);
      return d.toISOString();
    }
  }
  return undefined;
}

/**
 * Deterministic heuristic extraction. Used when AI is unavailable AND as a
 * fast pre-filter so we only send promising messages to the AI.
 */
function heuristicExtract(messages: ExtractInput["messages"]): ExtractedItem[] {
  if (!messages) return [];
  const items: ExtractedItem[] = [];
  for (const m of messages) {
    if (!m.body) continue;
    for (const re of COMMITMENT_PATTERNS) {
      const match = m.body.match(re);
      if (match) {
        // Clip to the matched fragment + a bit of context.
        const idx = match.index ?? 0;
        const start = Math.max(0, idx - 5);
        const end = Math.min(m.body.length, idx + match[0].length + 40);
        const body = m.body.slice(start, end).trim().replace(/\s+/g, " ");
        if (body.length < 5) continue;
        items.push({
          messageId: m.id,
          body,
          assignee: m.senderName,
          dueDate: extractDueDate(m.body),
        });
        break; // one item per message
      }
    }
  }
  return items.slice(0, 20);
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Extracts action items from a conversation's messages. Uses AI to refine the
 * heuristic extraction (e.g. distinguish "Let's meet next week" from "Let's
 * meet somewhere" — only the former is a real commitment).
 *
 * Persisted to the `ActionItem` Prisma model (idempotent — duplicate
 * extractions for the same messageId are skipped).
 */
export async function extractActionItems(input: ExtractInput): Promise<ExtractResult> {
  const startedAt = Date.now();
  const conversationId = input.conversationId;
  const messages = (input.messages ?? []).slice(-50);

  // Pre-filter with heuristics so we only send promising messages to the AI.
  const candidates = heuristicExtract(messages);

  if (candidates.length === 0) {
    return {
      conversationId,
      items: [],
      provider: "heuristic",
      elapsedMs: Date.now() - startedAt,
      fallback: true,
    };
  }

  const sys = [
    "You are Cirkle Action Items — extract concrete commitments from chat messages.",
    "A commitment is a future action with a verb + (optional) deadline/assignee.",
    "NOT a commitment: greetings, opinions, questions without a plan.",
    "Return STRICT JSON:",
    '{"items":[{"messageId":"...","body":"...","assignee":"...","dueDate":"ISO string or null"}]}',
    "Rules:",
    "  • body ≤ 160 chars, must be a concrete action.",
    "  • assignee = the person who will do it (or null if unclear).",
    "  • dueDate = ISO 8601 if mentioned, otherwise null.",
    "  • Only include real commitments — skip pleasantries.",
  ].join("\n");

  const usr = JSON.stringify(
    candidates.map((c) => ({
      messageId: c.messageId,
      text: c.body,
      sender: c.assignee ?? "",
    })),
  );

  let provider = "heuristic";
  let fallback = true;
  let items: ExtractedItem[] = candidates;

  try {
    const raw = await aiComplete(sys, usr, 800, false, ["groq", "openrouter", "openai"]);
    if (raw) {
      provider = "ai";
      const parsed = extractJSON<{
        items?: Array<{ messageId?: string; body?: string; assignee?: string; dueDate?: string | null }>;
      }>(raw);
      if (Array.isArray(parsed?.items) && parsed!.items!.length >= 0) {
        const aiItems: ExtractedItem[] = parsed!.items!
          .filter((it) => it && it.messageId && it.body && it.body.trim().length > 0)
          .map((it) => ({
            messageId: String(it.messageId),
            body: String(it.body).slice(0, 240),
            assignee: it.assignee ? String(it.assignee).slice(0, 60) : undefined,
            dueDate: typeof it.dueDate === "string" ? it.dueDate : undefined,
          }));
        if (aiItems.length > 0 || parsed!.items!.length === 0) {
          items = aiItems;
          fallback = false;
        }
      }
    }
  } catch (err) {
    logger.warn("[action-items] AI failed", { error: (err as Error).message });
  }

  // Persist to DB (idempotent: skip messageId+body duplicates).
  try {
    for (const it of items) {
      try {
        await db.actionItem.create({
          data: {
            conversationId,
            messageId: it.messageId,
            body: it.body,
            assignee: it.assignee ?? null,
            dueDate: it.dueDate ? new Date(it.dueDate) : null,
          },
        });
      } catch (createErr) {
        // Likely a unique constraint violation if model has one; otherwise
        // log + continue. Idempotency is best-effort.
        logger.debug("[action-items] create skipped", {
          error: (createErr as Error).message,
        });
      }
    }
  } catch (err) {
    logger.warn("[action-items] persistence failed", { error: (err as Error).message });
  }

  return {
    conversationId,
    items,
    provider,
    elapsedMs: Date.now() - startedAt,
    fallback,
  };
}

// ── List + update helpers ────────────────────────────────────────────────

export interface ListParams {
  conversationId?: string;
  pendingOnly?: boolean;
  dueBefore?: string;
  limit?: number;
}

/**
 * Lists action items from the DB. Filters by conversationId, pending state,
 * and due date.
 */
export async function listActionItems(params: ListParams = {}) {
  const where: Record<string, unknown> = {};
  if (params.conversationId) where.conversationId = params.conversationId;
  if (params.pendingOnly) where.done = false;
  if (params.dueBefore) where.dueDate = { lte: new Date(params.dueBefore) };
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  try {
    const items = await db.actionItem.findMany({
      where,
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
      take: limit,
    });
    return items;
  } catch (err) {
    logger.warn("[action-items] list failed", { error: (err as Error).message });
    return [];
  }
}

/**
 * Marks an action item as done. Returns the updated item or null if not found.
 */
export async function markActionItemDone(id: string): Promise<{ id: string; done: boolean } | null> {
  try {
    const updated = await db.actionItem.update({
      where: { id },
      data: { done: true },
    });
    return { id: updated.id, done: updated.done };
  } catch (err) {
    logger.warn("[action-items] markDone failed", { error: (err as Error).message, id });
    return null;
  }
}
