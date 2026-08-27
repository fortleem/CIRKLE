/**
 * Chat Summarization — AI-powered topic-based chat summaries for Wasl.
 * ============================================================================
 * Groups messages by detected topic and summarizes each group.
 * Scope: "today" (messages from the last 24h) or "all" (entire conversation).
 *
 * Uses the shared aiComplete chain (Groq → OpenAI → HuggingFace).
 */

import "server-only";
import { db } from "@/lib/db";
import { aiComplete } from "@/lib/ai";
import { logger } from "@/lib/logger";

export interface ChatMessage {
  id: string;
  body: string | null;
  senderLabel: string;
  createdAt: Date;
}

export interface TopicSummary {
  topic: string;
  summary: string;
  keyPoints: string[];
  messageCount: number;
  rangeStart: Date;
  rangeEnd: Date;
}

export interface SummarizeResult {
  conversationId: string;
  scope: "today" | "all";
  totalMessages: number;
  topics: TopicSummary[];
  generatedAt: string;
  provider?: string;
}

/**
 * Fetch messages for a conversation, optionally filtered to today only.
 */
async function fetchMessages(
  conversationId: string,
  scope: "today" | "all",
): Promise<ChatMessage[]> {
  const where: any = { conversationId };
  if (scope === "today") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    where.createdAt = { gte: startOfDay };
  }

  const messages = await db.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      senderLabel: true,
      createdAt: true,
    },
    take: 500, // cap to avoid token overflow
  });

  return messages.map(m => ({
    id: m.id,
    body: m.body,
    senderLabel: m.senderLabel,
    createdAt: m.createdAt,
  }));
}

/**
 * Group messages into topics using AI, then summarize each topic.
 */
export async function summarizeChat(
  conversationId: string,
  scope: "today" | "all",
): Promise<SummarizeResult> {
  const messages = await fetchMessages(conversationId, scope);

  if (messages.length === 0) {
    return {
      conversationId,
      scope,
      totalMessages: 0,
      topics: [],
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Build the conversation transcript for the AI ────────────────────────
  const transcript = messages
    .map(m => {
      const time = new Date(m.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${time}] ${m.senderLabel}: ${m.body || "(encrypted/attachment)"}`;
    })
    .join("\n");

  // ── AI prompt: detect topics + summarize each ───────────────────────────
  const prompt = `You are analyzing a chat conversation. Your task is to:

1. Identify the main TOPICS discussed in this conversation (e.g. "Project deadline", "Pricing discussion", "Weekend plans"). Group messages that belong to the same topic.
2. For each topic, write a concise summary (2-4 sentences).
3. List 2-4 key points for each topic.
4. Return the result as a JSON array with this exact shape:
   [
     {
       "topic": "Topic name",
       "summary": "Concise summary of what was discussed.",
       "keyPoints": ["Point 1", "Point 2", "Point 3"],
       "messageIndices": [0, 1, 5]  // indices into the message array
     }
   ]

Rules:
- Return 1-5 topics (only if there's enough content; return [] if the conversation is trivial).
- Be factual and neutral. Do not add information not present in the messages.
- If messages are in Arabic, write the summary in Arabic. If mixed, write in the dominant language.
- Return ONLY the JSON array, no markdown, no explanation.

Conversation (${messages.length} messages, scope: ${scope}):
${transcript}`;

  let topics: TopicSummary[] = [];
  let provider: string | undefined;

  try {
    const result = await aiComplete({
      prompt,
      systemPrompt:
        "You are a chat summarization AI. You analyze conversations, detect topics, and produce structured JSON summaries. Always respond with valid JSON only.",
      maxTokens: 1500,
      temperature: 0.2,
    });

    provider = result.provider;

    // Parse the JSON response.
    let jsonText = result.text.trim();
    // Strip markdown code fences if present.
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed)) {
      topics = parsed.map((t: any) => {
        const indices: number[] = Array.isArray(t.messageIndices) ? t.messageIndices : [];
        const topicMessages = indices.map(i => messages[i]).filter(Boolean);
        const rangeStart = topicMessages.length > 0
          ? topicMessages[0].createdAt
          : messages[0]?.createdAt || new Date();
        const rangeEnd = topicMessages.length > 0
          ? topicMessages[topicMessages.length - 1].createdAt
          : messages[messages.length - 1]?.createdAt || new Date();
        return {
          topic: String(t.topic || "Untitled topic").slice(0, 100),
          summary: String(t.summary || "").slice(0, 1000),
          keyPoints: Array.isArray(t.keyPoints)
            ? t.keyPoints.map((p: any) => String(p).slice(0, 200)).slice(0, 8)
            : [],
          messageCount: topicMessages.length || indices.length,
          rangeStart,
          rangeEnd,
        };
      });
    }
  } catch (err) {
    logger.warn("[chat-summarization] AI failed, returning single-topic fallback:", err);
    // Fallback: single topic covering all messages.
    topics = [
      {
        topic: scope === "today" ? "Today's conversation" : "Full conversation",
        summary: `This conversation contains ${messages.length} messages. AI summarization failed, showing a basic summary instead.`,
        keyPoints: [],
        messageCount: messages.length,
        rangeStart: messages[0].createdAt,
        rangeEnd: messages[messages.length - 1].createdAt,
      },
    ];
  }

  // ── Persist summaries to the DB ─────────────────────────────────────────
  try {
    for (const topic of topics) {
      await db.chatTopicSummary.create({
        data: {
          conversationId,
          topic: topic.topic,
          scope,
          summary: topic.summary,
          keyPoints: JSON.stringify(topic.keyPoints),
          messageCount: topic.messageCount,
          rangeStart: topic.rangeStart,
          rangeEnd: topic.rangeEnd,
          provider: provider || null,
        },
      });
    }
  } catch (err) {
    logger.warn("[chat-summarization] Failed to persist summaries:", err);
  }

  return {
    conversationId,
    scope,
    totalMessages: messages.length,
    topics,
    generatedAt: new Date().toISOString(),
    provider,
  };
}
